#!/usr/bin/env npx tsx
/**
 * PropPath AI Eval Runner
 *
 * Runs test cases against the Anthropic API directly (no Supabase deploy needed).
 * Uses the same system prompt and schema as the edge function so results
 * match production behaviour.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npx tsx evals/run-evals.ts
 *   ANTHROPIC_API_KEY=sk-... npx tsx evals/run-evals.ts --filter A2,B1,Demo2
 *   ANTHROPIC_API_KEY=sk-... npx tsx evals/run-evals.ts --tier C
 */

import Anthropic from '@anthropic-ai/sdk';
import { ALL_TEST_CASES } from './test-cases.ts';
import type {
  TestCase,
  Assertion,
  AssertionResult,
  TestResult,
  EvalReport,
} from './types.ts';
import { gradeResponse } from './model-grader.ts';

// ─── Import pipeline components ─────────────────────────────────
// Uses the same classify → extract+respond pipeline as the edge function.
import {
  getClassifierPrompt,
  getPromptForIntent,
  CLASSIFY_TOOL,
  CLASSIFY_TOOL_CHOICE,
  RESPONSE_TOOL,
  RESPONSE_TOOL_CHOICE,
  type ClassifiedIntent,
} from '../supabase/functions/nl-parse/pipeline.ts';
import { computeFeasibility, injectFeasibilityDescriptor } from '../supabase/functions/nl-parse/feasibility.ts';

// ─── Config ──────────────────────────────────────────────────────

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS_CLASSIFY = 256;
const MAX_TOKENS_RESPOND = 4096;
const TEMPERATURE = 0;
const CONCURRENCY = 3; // Run up to 3 tests in parallel

// ─── Assertion evaluator ─────────────────────────────────────────

function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current) && /^\d+$/.test(part)) {
      current = current[parseInt(part, 10)];
    } else if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

function evaluateAssertion(response: unknown, assertion: Assertion): AssertionResult {
  const actual = getNestedValue(response, assertion.path);

  let passed = false;
  let message = '';

  switch (assertion.op) {
    case 'equals':
      passed = actual === assertion.expected;
      message = passed
        ? `${assertion.path} = ${JSON.stringify(actual)}`
        : `${assertion.path}: expected ${JSON.stringify(assertion.expected)}, got ${JSON.stringify(actual)}`;
      break;

    case 'includes':
      if (typeof actual === 'string') {
        passed = actual.toLowerCase().includes(String(assertion.expected).toLowerCase());
      } else if (Array.isArray(actual)) {
        passed = actual.includes(assertion.expected);
      } else {
        passed = false;
      }
      message = passed
        ? `${assertion.path} includes ${JSON.stringify(assertion.expected)}`
        : `${assertion.path}: expected to include ${JSON.stringify(assertion.expected)}, got ${JSON.stringify(actual)}`;
      break;

    case 'not_includes':
      if (typeof actual === 'string') {
        passed = !actual.toLowerCase().includes(String(assertion.expected).toLowerCase());
      } else if (Array.isArray(actual)) {
        passed = !actual.includes(assertion.expected);
      } else {
        passed = true;
      }
      message = passed
        ? `${assertion.path} does not include ${JSON.stringify(assertion.expected)}`
        : `${assertion.path}: should NOT include ${JSON.stringify(assertion.expected)}, but it does`;
      break;

    case 'greater_than':
      passed = typeof actual === 'number' && actual > (assertion.expected as number);
      message = passed
        ? `${assertion.path} = ${actual} > ${assertion.expected}`
        : `${assertion.path}: expected > ${assertion.expected}, got ${JSON.stringify(actual)}`;
      break;

    case 'less_than':
      passed = typeof actual === 'number' && actual < (assertion.expected as number);
      message = passed
        ? `${assertion.path} = ${actual} < ${assertion.expected}`
        : `${assertion.path}: expected < ${assertion.expected}, got ${JSON.stringify(actual)}`;
      break;

    case 'range':
      if (assertion.range && typeof actual === 'number') {
        passed = actual >= assertion.range[0] && actual <= assertion.range[1];
      }
      message = passed
        ? `${assertion.path} = ${actual} in [${assertion.range}]`
        : `${assertion.path}: expected in [${assertion.range}], got ${JSON.stringify(actual)}`;
      break;

    case 'exists':
      passed = actual !== undefined && actual !== null;
      message = passed
        ? `${assertion.path} exists`
        : `${assertion.path}: expected to exist, got ${JSON.stringify(actual)}`;
      break;

    case 'not_exists':
      passed = actual === undefined || actual === null;
      message = passed
        ? `${assertion.path} does not exist`
        : `${assertion.path}: expected not to exist, got ${JSON.stringify(actual)}`;
      break;

    case 'length':
      passed = Array.isArray(actual) && actual.length === (assertion.expected as number);
      message = passed
        ? `${assertion.path}.length = ${(actual as unknown[])?.length}`
        : `${assertion.path}: expected length ${assertion.expected}, got ${Array.isArray(actual) ? actual.length : 'not an array'}`;
      break;

    case 'length_gte':
      passed = Array.isArray(actual) && actual.length >= (assertion.expected as number);
      message = passed
        ? `${assertion.path}.length = ${(actual as unknown[])?.length} >= ${assertion.expected}`
        : `${assertion.path}: expected length >= ${assertion.expected}, got ${Array.isArray(actual) ? actual.length : 'not an array'}`;
      break;

    case 'length_lte':
      passed = Array.isArray(actual) && actual.length <= (assertion.expected as number);
      message = passed
        ? `${assertion.path}.length = ${(actual as unknown[])?.length} <= ${assertion.expected}`
        : `${assertion.path}: expected length <= ${assertion.expected}, got ${Array.isArray(actual) ? actual.length : 'not an array'}`;
      break;

    case 'one_of':
      passed = Array.isArray(assertion.expected) && assertion.expected.includes(actual);
      message = passed
        ? `${assertion.path} = ${JSON.stringify(actual)} (one of ${JSON.stringify(assertion.expected)})`
        : `${assertion.path}: expected one of ${JSON.stringify(assertion.expected)}, got ${JSON.stringify(actual)}`;
      break;

    default:
      message = `Unknown assertion op: ${assertion.op}`;
  }

  return { assertion, passed, actual, message };
}

// ─── Test runner ─────────────────────────────────────────────────

async function runTestCase(
  client: Anthropic,
  testCase: TestCase,
  enableGrading = false,
): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    if (testCase.conversationHistory) {
      for (const msg of testCase.conversationHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    messages.push({ role: 'user', content: testCase.message });

    // ── Step 1: Classify ──────────────────────────────────────────
    const hasPlan = !!testCase.currentPlan;
    const classifierPrompt = getClassifierPrompt(hasPlan);

    const classifyResponse = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS_CLASSIFY,
      temperature: TEMPERATURE,
      system: [{ type: 'text', text: classifierPrompt }],
      messages,
      tools: [CLASSIFY_TOOL as any],
      tool_choice: CLASSIFY_TOOL_CHOICE as any,
    });

    const classifyBlock = classifyResponse.content.find((b) => b.type === 'tool_use');
    if (!classifyBlock || classifyBlock.type !== 'tool_use') {
      return {
        testCase,
        passed: false,
        assertions: [],
        passedCount: 0,
        failedCount: testCase.assertions.length,
        responseTimeMs: Date.now() - startTime,
        error: 'No tool_use block from classifier',
      };
    }

    const classified = classifyBlock.input as { intent: ClassifiedIntent; reasoning: string };

    // ── Step 2: Extract + Respond ─────────────────────────────────
    const focusedPrompt = getPromptForIntent(
      classified.intent,
      testCase.currentPlan ?? null,
      testCase.strategyPreset,
    );

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS_RESPOND,
      temperature: TEMPERATURE,
      system: [{ type: 'text', text: focusedPrompt }],
      messages,
      tools: [RESPONSE_TOOL as any],
      tool_choice: RESPONSE_TOOL_CHOICE as any,
    });

    const toolBlock = response.content.find((b) => b.type === 'tool_use');
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      return {
        testCase,
        passed: false,
        assertions: [],
        passedCount: 0,
        failedCount: testCase.assertions.length,
        responseTimeMs: Date.now() - startTime,
        error: 'No tool_use block in response',
      };
    }

    const parsed = toolBlock.input as Record<string, any>;

    if (parsed.type === 'initial_plan' && parsed.properties?.length > 0) {
      const feasibility = computeFeasibility({
        properties: parsed.properties,
        equityGoal: parsed.investmentProfile?.equityGoal ?? 0,
        timelineYears: parsed.investmentProfile?.timelineYears ?? 20,
      });
      if (feasibility && parsed.message) {
        parsed.message = injectFeasibilityDescriptor(parsed.message, feasibility);
      }
    }

    const assertionResults = testCase.assertions.map((a) =>
      evaluateAssertion(parsed, a),
    );
    const passedCount = assertionResults.filter((r) => r.passed).length;
    const failedCount = assertionResults.filter((r) => !r.passed).length;

    let modelGrade;
    if (enableGrading && parsed.message) {
      modelGrade = (await gradeResponse(client, testCase.message, parsed)) ?? undefined;
    }

    return {
      testCase,
      passed: failedCount === 0,
      assertions: assertionResults,
      passedCount,
      failedCount,
      responseTimeMs: Date.now() - startTime,
      rawResponse: parsed,
      classifiedIntent: classified.intent,
      modelGrade,
    };
  } catch (err) {
    return {
      testCase,
      passed: false,
      assertions: [],
      passedCount: 0,
      failedCount: testCase.assertions.length,
      responseTimeMs: Date.now() - startTime,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── Parallel runner with concurrency limit ──────────────────────

async function runWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

// ─── Report printer ──────────────────────────────────────────────

function printReport(report: EvalReport) {
  console.log('\n' + '='.repeat(70));
  console.log('  PROPPATH AI EVAL REPORT');
  console.log('  ' + report.timestamp);
  console.log('='.repeat(70));

  // Summary
  const passIcon = report.passRate === 100 ? '✅' : report.passRate >= 80 ? '⚠️' : '❌';
  console.log(`\n${passIcon} Tests: ${report.passedTests}/${report.totalTests} passed (${report.passRate.toFixed(0)}%)`);
  console.log(`   Assertions: ${report.passedAssertions}/${report.totalAssertions} passed (${report.assertionPassRate.toFixed(0)}%)`);
  console.log(`   Avg response time: ${report.averageResponseTimeMs.toFixed(0)}ms`);

  // Failed tests detail
  const failed = report.results.filter((r) => !r.passed);
  if (failed.length > 0) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log('  FAILURES');
    console.log('─'.repeat(70));

    for (const result of failed) {
      console.log(`\n  ❌ ${result.testCase.id}: ${result.testCase.name}`);
      if (result.error) {
        console.log(`     ERROR: ${result.error}`);
        continue;
      }
      const failedAssertions = result.assertions.filter((a) => !a.passed);
      for (const a of failedAssertions) {
        console.log(`     FAIL: ${a.assertion.description}`);
        console.log(`           ${a.message}`);
      }
    }
  }

  // Passed tests (compact)
  const passed = report.results.filter((r) => r.passed);
  if (passed.length > 0) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log('  PASSED');
    console.log('─'.repeat(70));
    for (const result of passed) {
      const intentTag = result.classifiedIntent ? ` [${result.classifiedIntent}]` : '';
      const gradeTag = result.modelGrade ? ` grade:${result.modelGrade.overall}/5` : '';
      console.log(`  ✅ ${result.testCase.id}: ${result.testCase.name}${intentTag}${gradeTag} (${result.responseTimeMs}ms)`);
    }
  }

  // Model grading summary
  const graded = report.results.filter((r) => r.modelGrade);
  if (graded.length > 0) {
    const avgOverall = graded.reduce((s, r) => s + r.modelGrade!.overall, 0) / graded.length;
    const avgCoherence = graded.reduce((s, r) => s + r.modelGrade!.coherence, 0) / graded.length;
    const avgRelevance = graded.reduce((s, r) => s + r.modelGrade!.relevance, 0) / graded.length;
    const avgTone = graded.reduce((s, r) => s + r.modelGrade!.tone, 0) / graded.length;
    console.log(`\n${'─'.repeat(70)}`);
    console.log('  MODEL GRADES');
    console.log('─'.repeat(70));
    console.log(`  Overall: ${avgOverall.toFixed(1)}/5  Coherence: ${avgCoherence.toFixed(1)}/5  Relevance: ${avgRelevance.toFixed(1)}/5  Tone: ${avgTone.toFixed(1)}/5`);
    const low = graded.filter((r) => r.modelGrade!.overall <= 2);
    if (low.length > 0) {
      console.log(`\n  Low-scoring responses:`);
      for (const r of low) {
        console.log(`    ${r.testCase.id}: ${r.modelGrade!.overall}/5 — ${r.modelGrade!.reasoning}`);
      }
    }
  }

  console.log('\n' + '='.repeat(70) + '\n');
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable not set.');
    console.error('Usage: ANTHROPIC_API_KEY=sk-... npx tsx evals/run-evals.ts');
    process.exit(1);
  }

  // Parse CLI args
  const args = process.argv.slice(2);
  let testCases = ALL_TEST_CASES;

  const filterIdx = args.indexOf('--filter');
  if (filterIdx !== -1 && args[filterIdx + 1]) {
    const ids = args[filterIdx + 1].split(',').map((s) => s.trim());
    testCases = testCases.filter((tc) => ids.includes(tc.id));
  }

  const tierIdx = args.indexOf('--tier');
  if (tierIdx !== -1 && args[tierIdx + 1]) {
    const tier = args[tierIdx + 1].toUpperCase();
    testCases = testCases.filter((tc) => tc.tier.toUpperCase() === tier);
  }

  const enableGrading = args.includes('--grade');

  if (testCases.length === 0) {
    console.error('No test cases matched the filter.');
    process.exit(1);
  }

  console.log(`\nRunning ${testCases.length} test cases (concurrency: ${CONCURRENCY})${enableGrading ? ' + model grading' : ''}...\n`);

  const client = new Anthropic({ apiKey });

  const results = await runWithConcurrency(
    testCases,
    async (tc) => {
      process.stdout.write(`  Running ${tc.id}...`);
      const result = await runTestCase(client, tc, enableGrading);
      const icon = result.passed ? '✅' : '❌';
      const gradeTag = result.modelGrade ? ` [${result.modelGrade.overall}/5]` : '';
      process.stdout.write(` ${icon}${gradeTag} (${result.responseTimeMs}ms)\n`);
      return result;
    },
    CONCURRENCY,
  );

  const passedTests = results.filter((r) => r.passed).length;
  const totalAssertions = results.reduce((sum, r) => sum + r.assertions.length, 0);
  const passedAssertions = results.reduce((sum, r) => sum + r.passedCount, 0);
  const avgTime = results.reduce((sum, r) => sum + r.responseTimeMs, 0) / results.length;

  const report: EvalReport = {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passedTests,
    failedTests: results.length - passedTests,
    passRate: (passedTests / results.length) * 100,
    totalAssertions,
    passedAssertions,
    failedAssertions: totalAssertions - passedAssertions,
    assertionPassRate: totalAssertions > 0 ? (passedAssertions / totalAssertions) * 100 : 0,
    averageResponseTimeMs: avgTime,
    results,
  };

  printReport(report);

  // Write JSON report for programmatic use
  const reportPath = `evals/report-${Date.now()}.json`;
  const { writeFileSync } = await import('fs');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Full report saved to ${reportPath}`);

  // Exit with failure code if any tests failed
  process.exit(report.failedTests > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
