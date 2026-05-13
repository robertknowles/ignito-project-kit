#!/usr/bin/env npx tsx
/**
 * A/B Comparison Runner
 *
 * Runs the same test cases with two different configurations and prints
 * a side-by-side comparison. Useful for comparing prompt versions, models,
 * or temperature settings.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npx tsx evals/ab-compare.ts
 *   ANTHROPIC_API_KEY=sk-... npx tsx evals/ab-compare.ts --filter Demo1,Demo2-update
 *   ANTHROPIC_API_KEY=sk-... npx tsx evals/ab-compare.ts --grade
 *
 * Configure variants by editing VARIANT_A and VARIANT_B below.
 */

import Anthropic from '@anthropic-ai/sdk';
import { ALL_TEST_CASES } from './test-cases.ts';
import type { TestCase, TestResult } from './types.ts';
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
import { gradeResponse } from './model-grader.ts';

// ─── Variant Configuration ─────────────────────────────────────────
// Edit these to compare different configurations.

interface Variant {
  name: string;
  model: string;
  temperature: number;
  maxTokensClassify: number;
  maxTokensRespond: number;
}

const VARIANT_A: Variant = {
  name: 'Current (Sonnet 4.6, temp=0)',
  model: 'claude-sonnet-4-6',
  temperature: 0,
  maxTokensClassify: 256,
  maxTokensRespond: 4096,
};

const VARIANT_B: Variant = {
  name: 'Haiku 4.5 (temp=0)',
  model: 'claude-haiku-4-5-20251001',
  temperature: 0,
  maxTokensClassify: 256,
  maxTokensRespond: 4096,
};

// ─── Shared helpers (extracted from run-evals.ts) ───────────────────

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

function evaluateAssertion(response: unknown, assertion: any): any {
  const actual = getNestedValue(response, assertion.path);
  let passed = false;
  switch (assertion.op) {
    case 'equals': passed = actual === assertion.expected; break;
    case 'includes':
      passed = typeof actual === 'string'
        ? actual.toLowerCase().includes(String(assertion.expected).toLowerCase())
        : Array.isArray(actual) && actual.includes(assertion.expected);
      break;
    case 'not_includes':
      passed = typeof actual === 'string'
        ? !actual.toLowerCase().includes(String(assertion.expected).toLowerCase())
        : !Array.isArray(actual) || !actual.includes(assertion.expected);
      break;
    case 'exists': passed = actual !== undefined && actual !== null; break;
    case 'not_exists': passed = actual === undefined || actual === null; break;
    case 'length': passed = Array.isArray(actual) && actual.length === assertion.expected; break;
    case 'length_gte': passed = Array.isArray(actual) && actual.length >= assertion.expected; break;
    case 'length_lte': passed = Array.isArray(actual) && actual.length <= assertion.expected; break;
    case 'one_of': passed = Array.isArray(assertion.expected) && assertion.expected.includes(actual); break;
    case 'greater_than': passed = typeof actual === 'number' && actual > assertion.expected; break;
    case 'less_than': passed = typeof actual === 'number' && actual < assertion.expected; break;
    case 'range':
      passed = typeof actual === 'number' && assertion.range && actual >= assertion.range[0] && actual <= assertion.range[1];
      break;
  }
  return { assertion, passed, actual };
}

// ─── Test runner (parameterised by variant) ─────────────────────────

async function runTestWithVariant(
  client: Anthropic,
  testCase: TestCase,
  variant: Variant,
  enableGrading: boolean,
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

    const hasPlan = !!testCase.currentPlan;
    const classifierPrompt = getClassifierPrompt(hasPlan);

    const classifyResponse = await client.messages.create({
      model: variant.model,
      max_tokens: variant.maxTokensClassify,
      temperature: variant.temperature,
      system: [{ type: 'text', text: classifierPrompt }],
      messages,
      tools: [CLASSIFY_TOOL as any],
      tool_choice: CLASSIFY_TOOL_CHOICE as any,
    });

    const classifyBlock = classifyResponse.content.find((b) => b.type === 'tool_use');
    if (!classifyBlock || classifyBlock.type !== 'tool_use') {
      return { testCase, passed: false, assertions: [], passedCount: 0, failedCount: testCase.assertions.length, responseTimeMs: Date.now() - startTime, error: 'No classify tool_use' };
    }

    const classified = classifyBlock.input as { intent: ClassifiedIntent; reasoning: string };
    const focusedPrompt = getPromptForIntent(classified.intent, testCase.currentPlan ?? null, testCase.strategyPreset);

    const response = await client.messages.create({
      model: variant.model,
      max_tokens: variant.maxTokensRespond,
      temperature: variant.temperature,
      system: [{ type: 'text', text: focusedPrompt }],
      messages,
      tools: [RESPONSE_TOOL as any],
      tool_choice: RESPONSE_TOOL_CHOICE as any,
    });

    const toolBlock = response.content.find((b) => b.type === 'tool_use');
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      return { testCase, passed: false, assertions: [], passedCount: 0, failedCount: testCase.assertions.length, responseTimeMs: Date.now() - startTime, error: 'No response tool_use' };
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

    const assertionResults = testCase.assertions.map((a) => evaluateAssertion(parsed, a));
    const passedCount = assertionResults.filter((r: any) => r.passed).length;
    const failedCount = assertionResults.filter((r: any) => !r.passed).length;

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

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable not set.');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  let testCases = ALL_TEST_CASES;
  const enableGrading = args.includes('--grade');

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

  if (testCases.length === 0) {
    console.error('No test cases matched the filter.');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  console.log('\n' + '='.repeat(70));
  console.log('  A/B COMPARISON');
  console.log(`  A: ${VARIANT_A.name}`);
  console.log(`  B: ${VARIANT_B.name}`);
  console.log(`  Tests: ${testCases.length}${enableGrading ? ' + model grading' : ''}`);
  console.log('='.repeat(70) + '\n');

  const resultsA: TestResult[] = [];
  const resultsB: TestResult[] = [];

  for (const tc of testCases) {
    process.stdout.write(`  ${tc.id}: `);

    const [resultA, resultB] = await Promise.all([
      runTestWithVariant(client, tc, VARIANT_A, enableGrading),
      runTestWithVariant(client, tc, VARIANT_B, enableGrading),
    ]);

    resultsA.push(resultA);
    resultsB.push(resultB);

    const iconA = resultA.passed ? '✅' : '❌';
    const iconB = resultB.passed ? '✅' : '❌';
    const gradeA = resultA.modelGrade ? ` ${resultA.modelGrade.overall}/5` : '';
    const gradeB = resultB.modelGrade ? ` ${resultB.modelGrade.overall}/5` : '';
    console.log(`A=${iconA}${gradeA} (${resultA.responseTimeMs}ms)  B=${iconB}${gradeB} (${resultB.responseTimeMs}ms)`);
  }

  // Summary
  const passA = resultsA.filter((r) => r.passed).length;
  const passB = resultsB.filter((r) => r.passed).length;
  const assertA = resultsA.reduce((s, r) => s + r.passedCount, 0);
  const assertB = resultsB.reduce((s, r) => s + r.passedCount, 0);
  const totalAssert = resultsA.reduce((s, r) => s + r.assertions.length, 0);
  const avgTimeA = resultsA.reduce((s, r) => s + r.responseTimeMs, 0) / resultsA.length;
  const avgTimeB = resultsB.reduce((s, r) => s + r.responseTimeMs, 0) / resultsB.length;

  console.log('\n' + '='.repeat(70));
  console.log('  COMPARISON SUMMARY');
  console.log('='.repeat(70));
  console.log(`\n  ${'Metric'.padEnd(30)} ${'A'.padStart(10)} ${'B'.padStart(10)} ${'Winner'.padStart(10)}`);
  console.log(`  ${'─'.repeat(60)}`);
  console.log(`  ${'Tests passed'.padEnd(30)} ${`${passA}/${testCases.length}`.padStart(10)} ${`${passB}/${testCases.length}`.padStart(10)} ${(passA >= passB ? (passA > passB ? 'A' : 'tie') : 'B').padStart(10)}`);
  console.log(`  ${'Assertions passed'.padEnd(30)} ${`${assertA}/${totalAssert}`.padStart(10)} ${`${assertB}/${totalAssert}`.padStart(10)} ${(assertA >= assertB ? (assertA > assertB ? 'A' : 'tie') : 'B').padStart(10)}`);
  console.log(`  ${'Avg response time'.padEnd(30)} ${`${avgTimeA.toFixed(0)}ms`.padStart(10)} ${`${avgTimeB.toFixed(0)}ms`.padStart(10)} ${(avgTimeA <= avgTimeB ? (avgTimeA < avgTimeB ? 'A' : 'tie') : 'B').padStart(10)}`);

  const gradedA = resultsA.filter((r) => r.modelGrade);
  const gradedB = resultsB.filter((r) => r.modelGrade);
  if (gradedA.length > 0 && gradedB.length > 0) {
    const avgGradeA = gradedA.reduce((s, r) => s + r.modelGrade!.overall, 0) / gradedA.length;
    const avgGradeB = gradedB.reduce((s, r) => s + r.modelGrade!.overall, 0) / gradedB.length;
    console.log(`  ${'Avg model grade'.padEnd(30)} ${`${avgGradeA.toFixed(1)}/5`.padStart(10)} ${`${avgGradeB.toFixed(1)}/5`.padStart(10)} ${(avgGradeA >= avgGradeB ? (avgGradeA > avgGradeB ? 'A' : 'tie') : 'B').padStart(10)}`);
  }

  // Tests where results differ
  const diffs = testCases.filter((_, i) => resultsA[i].passed !== resultsB[i].passed);
  if (diffs.length > 0) {
    console.log(`\n  Divergent results:`);
    for (const tc of diffs) {
      const i = testCases.indexOf(tc);
      const iconA = resultsA[i].passed ? '✅' : '❌';
      const iconB = resultsB[i].passed ? '✅' : '❌';
      console.log(`    ${tc.id}: A=${iconA} B=${iconB}`);
    }
  }

  console.log('\n' + '='.repeat(70) + '\n');

  // Write comparison report
  const reportPath = `evals/ab-report-${Date.now()}.json`;
  const { writeFileSync } = await import('fs');
  writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    variantA: VARIANT_A,
    variantB: VARIANT_B,
    resultsA,
    resultsB,
  }, null, 2));
  console.log(`Full report saved to ${reportPath}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
