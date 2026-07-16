#!/usr/bin/env npx vite-node
/**
 * Scenario Accuracy Suite runner (measurement only — no app code changes).
 *
 * Runs the 20 scenarios in scenario-suite.ts through the REAL engine
 * (src/engine/scenarioRunner → timelineEngine + projectionEngine) and grades
 * each against buyers'-agent expectations. Where a scenario probes whether a
 * brief statement is even representable by the AI pipeline, the nl-parse
 * RESPONSE_TOOL schema is checked statically.
 *
 * MODE: engine-only. The AI (nl-parse) leg needs ANTHROPIC_API_KEY, which is
 * not available in this environment — fixtures therefore grade the plan the
 * AI produced AT THE TIME (as persisted in the saved scenario), and variants
 * grade the engine on a simulated faithful extraction of the brief.
 *
 *   npx vite-node accuracy-testing/run-scenario-suite.ts
 *   npx vite-node accuracy-testing/run-scenario-suite.ts -- --only FIX-ELLA-314
 *
 * (vite-node, not tsx — timelineEngine reads import.meta.env.DEV.)
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import {
  runScenario,
  type ScenarioInput,
  type ScenarioEnv,
  type ScenarioRunResult,
} from '../src/engine/scenarioRunner';
import {
  BASE_YEAR,
  PERIODS_PER_YEAR,
  GROWTH_RATE_TIERS,
} from '../src/constants/financialParams';
import { CELL_IDS, getCategoryLabel, getCellDisplayLabel } from '../src/utils/propertyCells';
import { calcGrossYield } from '../src/utils/sharedFinancialCalcs';
import propertyDefaults from '../src/data/property-defaults.json';
import { CREATE_PLAN_TOOL } from '../supabase/functions/nl-parse/tools';
import type { PropertyInstanceDetails } from '../src/types/propertyInstance';
import type { PropertyType } from '../src/contexts/PropertySelectionContext';
import type { PropertyAssumption } from '../src/contexts/DataAssumptionsContext';
import {
  SUITE,
  type SuiteScenario,
  type Expectations,
  type FailureCause,
} from './scenario-suite';

const HERE = dirname(fileURLToPath(import.meta.url));

// ─── Headless env — identical assembly to run-gameplans-comparison.ts ────────

interface Template extends PropertyInstanceDetails {
  propertyType: string;
  cellId: string;
}

const templates: Template[] = CELL_IDS.map((cellId) => ({
  ...(propertyDefaults as Record<string, PropertyInstanceDetails>)[cellId],
  propertyType: getCellDisplayLabel(cellId),
  cellId,
}));

const propertyTypes: PropertyType[] = templates.map((t) => {
  const yieldPercent = calcGrossYield(t.rentPerWeek, t.purchasePrice);
  const rates = GROWTH_RATE_TIERS[t.growthAssumption || 'Medium'] || GROWTH_RATE_TIERS.Medium;
  return {
    id: t.cellId,
    title: getCategoryLabel(t.cellId),
    priceRange: `$${t.purchasePrice.toLocaleString()}`,
    yield: `${yieldPercent.toFixed(1)}%`,
    cashFlow: `$${Math.round((t.purchasePrice * yieldPercent) / 100 / 12)}`,
    riskLevel: 'Medium' as const,
    cost: t.purchasePrice,
    depositRequired: Math.round((t.purchasePrice * (100 - t.lvr)) / 100),
    yieldPercent,
    growthPercent: rates.year1,
    state: t.state || 'NSW',
    loanType: t.loanProduct || 'IO',
    isCustom: false,
  };
});

const getPropertyData = (
  propertyType: string,
  growthAssumptionOverride?: string,
): PropertyAssumption | undefined => {
  const template = templates.find(
    (t) => t.cellId === propertyType || t.propertyType === propertyType,
  );
  if (!template) return undefined;
  const tier = (growthAssumptionOverride || template.growthAssumption || 'Medium') as string;
  const rates = GROWTH_RATE_TIERS[tier] || GROWTH_RATE_TIERS.Medium;
  return {
    type: template.propertyType,
    averageCost: template.purchasePrice.toString(),
    yield: calcGrossYield(template.rentPerWeek, template.purchasePrice).toFixed(1),
    growthYear1: rates.year1.toString(),
    growthYears2to3: rates.years2to3.toString(),
    growthYear4: rates.year4.toString(),
    growthYear5plus: rates.year5plus.toString(),
    deposit: (100 - template.lvr).toString(),
    loanType: template.loanProduct,
    ...template,
  } as PropertyAssumption;
};

const env: ScenarioEnv = { propertyTypes, getPropertyData };

// ─── Input assembly ──────────────────────────────────────────────────────────

function fixtureInput(file: string): { input: ScenarioInput; raw: any } {
  const raw = JSON.parse(readFileSync(join(HERE, 'fixtures', file), 'utf-8'));
  const sd = raw.scenario_data;
  const input: ScenarioInput = {
    propertySelections: sd.propertySelections ?? {},
    propertyOrder: sd.propertyOrder ?? [],
    investmentProfile: sd.investmentProfile ?? {},
    propertyInstances: sd.propertyInstances ?? {},
    existingProperties: sd.existingProperties ?? [],
    eventBlocks: sd.eventBlocks ?? [],
  };
  return { input, raw };
}

function variantInput(s: SuiteScenario): ScenarioInput {
  const v = s.variant!;
  const selections: Record<string, number> = {};
  const order: string[] = [];
  const instances: Record<string, PropertyInstanceDetails> = {};
  for (const p of v.properties) {
    const n = selections[p.cellId] ?? 0;
    const id = `${p.cellId}_instance_${n}`;
    selections[p.cellId] = n + 1;
    order.push(id);
    const base = (propertyDefaults as Record<string, PropertyInstanceDetails>)[p.cellId];
    const merged: PropertyInstanceDetails = {
      ...base,
      ...p.overrides,
    } as PropertyInstanceDetails;
    if (p.targetPeriod !== undefined) {
      merged.isManuallyPlaced = true;
      merged.manualPlacementPeriod = p.targetPeriod;
    }
    if (p.overrides.purchasePrice && p.overrides.valuationAtPurchase === undefined) {
      merged.valuationAtPurchase = p.overrides.purchasePrice;
    }
    instances[id] = merged;
  }
  return {
    propertySelections: selections,
    propertyOrder: order,
    investmentProfile: v.profile,
    propertyInstances: instances,
    existingProperties: v.existingProperties ?? [],
    eventBlocks: [],
  };
}

// ─── Grading ─────────────────────────────────────────────────────────────────

interface CheckResult {
  name: string;
  pass: boolean;
  detail: string;
  cause: FailureCause;
}

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('en-AU');

const cellOf = (instanceId: string) => instanceId.replace(/_instance_\d+$/, '');
const isCommercialCell = (cellId: string) => cellId.startsWith('commercial');
const isGrowthCell = (cellId: string) => cellId.endsWith('-growth');
const isCashflowCell = (cellId: string) => cellId.endsWith('-cashflow') && !cellId.startsWith('commercial');

// Schema checks resolve against the PRODUCTION create_plan tool (tools.ts),
// not the deprecated Tier-1 RESPONSE_TOOL — matching run-scenario-suite-ai.ts.
// (Switched 16 Jul 2026: RESPONSE_TOOL is only imported by the deprecated
// pipeline.ts; grading against it reported the new schema fields as missing.)
function resolveSchemaPath(path: string): unknown {
  let cur: any = (CREATE_PLAN_TOOL as any).input_schema.properties;
  for (const part of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[part];
  }
  return cur;
}

function grade(
  s: SuiteScenario,
  input: ScenarioInput,
  result: ScenarioRunResult | null,
  runError: string | null,
): CheckResult[] {
  const e: Expectations = s.expectations;
  const checks: CheckResult[] = [];
  const push = (name: string, pass: boolean, detail: string, cause: FailureCause) =>
    checks.push({ name, pass, detail, cause });

  const order = input.propertyOrder ?? [];
  const instances = input.propertyInstances ?? {};
  const planned = order.map((id) => ({ id, cell: cellOf(id), inst: instances[id] }));
  const profile = { ...(input.investmentProfile ?? {}) } as Record<string, unknown>;

  if (runError) {
    push('engine-run', false, `engine threw: ${runError}`, 'engine-placement');
  }

  // Placement info from the engine
  const placedYears = new Map<string, number>();
  let unplaced: string[] = [];
  if (result) {
    for (const tp of result.timelineProperties) {
      if (tp.period !== Infinity && Number.isFinite(tp.affordableYear)) {
        placedYears.set(tp.instanceId, Math.floor(tp.affordableYear));
      }
    }
    unplaced = result.timelineProperties
      .filter((tp) => tp.period === Infinity || tp.status !== 'feasible')
      .map((tp) => `${tp.instanceId}(${tp.status})`);
  }

  // ── Plan structure ──────────────────────────────────────────────
  if (e.propertyCount) {
    const [lo, hi] = e.propertyCount;
    const n = planned.length;
    push(
      'property-count',
      n >= lo && n <= hi,
      `expected ${lo === hi ? lo : `${lo}-${hi}`} planned properties, saved plan has ${n}`,
      s.source === 'fixture' ? 'persistence' : 'plan-selection',
    );
  }

  if (e.existingCount !== undefined) {
    const n = (input.existingProperties ?? []).length;
    push(
      'existing-count',
      n === e.existingCount,
      `expected ${e.existingCount} existing properties per brief, saved state has ${n}` +
        (n !== e.existingCount && profile.portfolioValue
          ? ` (portfolioValue ${fmt(profile.portfolioValue as number)})`
          : ''),
      'extraction',
    );
  }

  if (e.priceBand) {
    const [lo, hi] = e.priceBand;
    const out = planned.filter(
      (p) => p.inst && (p.inst.purchasePrice < lo || p.inst.purchasePrice > hi),
    );
    push(
      'price-band',
      out.length === 0,
      out.length === 0
        ? `all ${planned.length} prices within ${fmt(lo)}-${fmt(hi)}`
        : `outside ${fmt(lo)}-${fmt(hi)}: ${out.map((p) => `${p.cell} ${fmt(p.inst.purchasePrice)}`).join(', ')}`,
      'plan-selection',
    );
  }

  if (e.avgPriceMin && planned.length > 0) {
    const avg = planned.reduce((s2, p) => s2 + (p.inst?.purchasePrice ?? 0), 0) / planned.length;
    push(
      'avg-price',
      avg >= e.avgPriceMin,
      `average price ${fmt(avg)} vs blue-chip floor ${fmt(e.avgPriceMin)}`,
      'plan-selection',
    );
  }

  if (e.yieldBand) {
    const [lo, hi] = e.yieldBand;
    const out = planned
      .filter((p) => p.inst)
      .map((p) => ({ ...p, y: (p.inst.rentPerWeek * 52 * 100) / p.inst.purchasePrice }))
      .filter((p) => p.y < lo || p.y > hi);
    push(
      'yield-band',
      out.length === 0,
      out.length === 0
        ? `all yields within ${lo}-${hi}%`
        : `outliers: ${out.map((p) => `${p.cell} ${fmt(p.inst.purchasePrice)} @ ${p.y.toFixed(1)}%`).join(', ')}`,
      'plan-selection',
    );
  }

  for (const pp of e.perProperty ?? []) {
    const p = planned[pp.index];
    if (!p || !p.inst) {
      push(`property[${pp.index}]`, false, `no planned property at index ${pp.index}`, 'persistence');
      continue;
    }
    if (pp.price) {
      const ok = p.inst.purchasePrice >= pp.price[0] && p.inst.purchasePrice <= pp.price[1];
      push(
        `property[${pp.index}]-price`,
        ok,
        `${p.cell} ${fmt(p.inst.purchasePrice)} vs stated ${fmt(pp.price[0])}-${fmt(pp.price[1])}`,
        'plan-selection',
      );
    }
    if (pp.yieldPct) {
      const y = (p.inst.rentPerWeek * 52 * 100) / p.inst.purchasePrice;
      const ok = y >= pp.yieldPct[0] && y <= pp.yieldPct[1];
      push(
        `property[${pp.index}]-yield`,
        ok,
        `${p.cell} yield ${y.toFixed(1)}% vs stated ${pp.yieldPct[0]}-${pp.yieldPct[1]}%`,
        'plan-selection',
      );
    }
    if (pp.entity) {
      const ent = p.inst.entity ?? 'individual';
      push(
        `property[${pp.index}]-entity`,
        ent === pp.entity,
        `${p.cell} entity "${ent}" vs stated "${pp.entity}"`,
        'extraction',
      );
    }
    if (pp.placedBy && result) {
      const y = placedYears.get(p.id);
      const ok = y !== undefined && y <= pp.placedBy;
      push(
        `property[${pp.index}]-placed-by`,
        ok,
        y === undefined
          ? `${p.cell} never places (deposit/serviceability gate)`
          : `${p.cell} places ${y} vs expected by ${pp.placedBy}`,
        'engine-placement',
      );
    }
  }

  if (e.minTrustCount !== undefined) {
    const n = planned.filter((p) => p.inst?.entity === 'trust').length;
    push(
      'trust-usage',
      n >= e.minTrustCount,
      `capacity is tight — expected ≥${e.minTrustCount} trust-held propert${e.minTrustCount === 1 ? 'y' : 'ies'}, plan has ${n}`,
      'plan-selection',
    );
  }

  if (e.lastPropertyCommercial) {
    const last = planned[planned.length - 1];
    const ok = !!last && isCommercialCell(last.cell);
    push(
      'commercial-finisher',
      ok,
      last
        ? `last property is ${last.cell}${ok ? ' — labelled commercial' : ' — NOT labelled commercial'}`
        : 'plan has no properties',
      'plan-selection',
    );
  }

  if (e.containsCommercial) {
    const ok = planned.some((p) => isCommercialCell(p.cell));
    push(
      'commercial-labelled',
      ok,
      ok ? 'plan contains an explicitly-labelled commercial cell' : 'no commercial-labelled property in plan',
      'plan-selection',
    );
  }

  if (e.transitionExpected && result) {
    // growth purchases must all be PLACED before the first cashflow/commercial purchase
    const growthYears = planned
      .filter((p) => isGrowthCell(p.cell))
      .map((p) => placedYears.get(p.id))
      .filter((y): y is number => y !== undefined);
    const lateYears = planned
      .filter((p) => isCashflowCell(p.cell) || isCommercialCell(p.cell))
      .map((p) => placedYears.get(p.id))
      .filter((y): y is number => y !== undefined);
    const hasBoth = growthYears.length > 0 && lateYears.length > 0;
    const ok = hasBoth && Math.max(...growthYears) <= Math.min(...lateYears);
    push(
      'transition-visible',
      ok,
      hasBoth
        ? `growth phase places ${Math.min(...growthYears)}-${Math.max(...growthYears)}, yield phase ${Math.min(...lateYears)}-${Math.max(...lateYears)}${ok ? ' — visible transition' : ' — phases overlap/reversed'}`
        : `plan does not contain both phases placed (growth placed: ${growthYears.length}, yield placed: ${lateYears.length})`,
      'engine-placement',
    );
  }

  if (e.timelineYears !== undefined) {
    const ok = profile.timelineYears === e.timelineYears;
    push(
      'timeline-persisted',
      ok,
      `user stated ${e.timelineYears}-year timeframe; profile.timelineYears = ${profile.timelineYears}`,
      'extraction',
    );
  }

  for (const pf of e.profileFields ?? []) {
    const actual = profile[pf.field as string];
    push(
      `profile-${String(pf.field)}`,
      actual === pf.expected,
      `profile.${String(pf.field)} = ${JSON.stringify(actual)} vs stated ${JSON.stringify(pf.expected)}`,
      'extraction',
    );
  }

  // ── Engine outcomes ─────────────────────────────────────────────
  if (e.allPlaced && result) {
    push(
      'all-placed',
      unplaced.length === 0,
      unplaced.length === 0
        ? `all ${result.timelineProperties.length} properties place (feasible)`
        : `unplaced/infeasible: ${unplaced.join(', ')}`,
      'engine-placement',
    );
  }

  if (e.pacing?.minAvgGapYears && result) {
    const years = [...placedYears.values()].sort((a, b) => a - b);
    if (years.length >= 2) {
      const gaps = years.slice(1).map((y, i) => y - years[i]);
      const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      const ok = avg >= e.pacing.minAvgGapYears;
      push(
        'pacing',
        ok,
        `purchases in ${years.join(', ')} — avg gap ${avg.toFixed(2)}y vs conservative-correct ≥${e.pacing.minAvgGapYears}y`,
        'engine-placement',
      );
    }
  }

  if (e.monthlyCashflowFloorY1 !== undefined && result) {
    const y1 = result.projection.cashflowData[0];
    const monthly = y1 ? y1.cashflow / 12 : NaN;
    const ok = Number.isFinite(monthly) && monthly >= e.monthlyCashflowFloorY1;
    push(
      'p1-monthly-floor',
      ok,
      `year-1 net cashflow ${fmt(monthly)}/mo vs client cap ${fmt(e.monthlyCashflowFloorY1)}/mo`,
      'engine-goal',
    );
  }

  if (e.cashflowGoal && result) {
    const hit = result.projection.cashflowData.find((d) => d.cashflow >= e.cashflowGoal!.amount);
    const ok = !!hit && parseInt(hit.year, 10) <= e.cashflowGoal.byYear;
    push(
      'cashflow-goal',
      ok,
      hit
        ? `${fmt(e.cashflowGoal.amount)}/yr net cashflow reached ${hit.year} vs stated by ${e.cashflowGoal.byYear}`
        : `${fmt(e.cashflowGoal.amount)}/yr never reached within the modelled horizon (max ${fmt(Math.max(...result.projection.cashflowData.map((d) => d.cashflow), 0))}/yr) — shortfall`,
      'engine-goal',
    );
  }

  if (e.equityGoal && result) {
    const hit = result.projection.portfolioGrowthData.find((d) => d.equity >= e.equityGoal!.amount);
    const ok = !!hit && parseInt(hit.year, 10) <= e.equityGoal.byYear;
    push(
      'equity-goal',
      ok,
      hit
        ? `${fmt(e.equityGoal.amount)} equity reached ${hit.year} vs stated by ${e.equityGoal.byYear}`
        : `${fmt(e.equityGoal.amount)} equity never reached within the modelled horizon — shortfall`,
      'engine-goal',
    );
  }

  // ── Static schema checks (extraction capability) ───────────────
  for (const sc of e.schemaChecks ?? []) {
    const exists = resolveSchemaPath(sc.path) !== undefined;
    push(
      `schema:${sc.path}`,
      exists === sc.shouldExist,
      `${sc.description} [schema field ${exists ? 'EXISTS' : 'MISSING'}]`,
      'schema-gap',
    );
  }

  // ── Manual findings (chat-evidenced) ───────────────────────────
  for (const mf of e.manualFindings ?? []) {
    push(mf.name, mf.pass, mf.detail, mf.cause);
  }

  return checks;
}

// ─── Run ─────────────────────────────────────────────────────────────────────

type Verdict = 'PASS' | 'FAIL' | 'EXPECTED-FAIL';

interface ScenarioResult {
  id: string;
  source: string;
  archetype: string;
  brief: string;
  verdict: Verdict;
  checks: CheckResult[];
  failReasons: string[];
  placement: { instanceId: string; year: number | null; status: string; cost: number; entity: string }[];
  goalYears: { equityGoalYear: number | null; incomeGoalYear: number | null };
  notes?: string[];
}

const args = process.argv.slice(2);
const onlyIdx = args.indexOf('--only');
const only = onlyIdx !== -1 ? args[onlyIdx + 1]?.split(',') : null;

const results: ScenarioResult[] = [];

console.log('Scenario Accuracy Suite — engine-only mode (no ANTHROPIC_API_KEY available)');
console.log(`BASE_YEAR=${BASE_YEAR}  PERIODS_PER_YEAR=${PERIODS_PER_YEAR}  scenarios=${SUITE.length}\n`);

for (const s of SUITE) {
  if (only && !only.includes(s.id)) continue;

  let input: ScenarioInput;
  try {
    input = s.source === 'fixture' ? fixtureInput(s.fixtureFile!).input : variantInput(s);
  } catch (err) {
    console.log(`✗ ${s.id}: could not build input — ${err}`);
    continue;
  }

  let result: ScenarioRunResult | null = null;
  let runError: string | null = null;
  try {
    result = runScenario(input, env);
  } catch (err) {
    runError = err instanceof Error ? err.message : String(err);
  }

  const checks = grade(s, input, result, runError);
  const fails = checks.filter((c) => !c.pass);
  const expectedSet = new Set(s.expectations.expectedFailChecks ?? []);
  const verdict: Verdict =
    fails.length === 0
      ? 'PASS'
      : fails.every((c) => expectedSet.has(c.name))
        ? 'EXPECTED-FAIL'
        : 'FAIL';

  const placement = (result?.timelineProperties ?? []).map((tp) => ({
    instanceId: tp.instanceId,
    year: tp.period === Infinity ? null : Math.floor(tp.affordableYear),
    status: tp.status,
    cost: tp.cost,
    entity: (input.propertyInstances?.[tp.instanceId]?.entity as string) ?? 'individual',
  }));

  results.push({
    id: s.id,
    source: s.source,
    archetype: s.archetype,
    brief: s.brief,
    verdict,
    checks,
    failReasons: fails.map((c) => `[${c.cause}] ${c.name}: ${c.detail}`),
    placement,
    goalYears: {
      equityGoalYear: result?.equityGoalYear ?? null,
      incomeGoalYear: result?.incomeGoalYear ?? null,
    },
    notes: s.notes,
  });

  const icon = verdict === 'PASS' ? '✅' : verdict === 'EXPECTED-FAIL' ? '🟡' : '❌';
  console.log(`${icon} ${s.id} — ${verdict}  (${s.archetype})`);
  for (const c of checks) {
    console.log(`     ${c.pass ? '✓' : '✗'} ${c.name}: ${c.detail}`);
  }
  if (s.notes) for (const n of s.notes) console.log(`     ⓘ ${n}`);
  console.log('');
}

// ─── Summary ────────────────────────────────────────────────────────────────

const pass = results.filter((r) => r.verdict === 'PASS').length;
const fail = results.filter((r) => r.verdict === 'FAIL').length;
const expected = results.filter((r) => r.verdict === 'EXPECTED-FAIL').length;

console.log('═'.repeat(90));
console.log(`TOTAL: ${results.length}   PASS: ${pass}   FAIL: ${fail}   EXPECTED-FAIL: ${expected}`);
console.log('═'.repeat(90));

const byCause = new Map<string, string[]>();
for (const r of results) {
  for (const c of r.checks.filter((c2) => !c2.pass)) {
    const list = byCause.get(c.cause) ?? [];
    list.push(`${r.id} · ${c.name}: ${c.detail}`);
    byCause.set(c.cause, list);
  }
}
console.log('\nFailing checks by root cause:');
for (const [cause, items] of [...byCause.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n  ${cause} (${items.length})`);
  for (const i of items) console.log(`    - ${i}`);
}

// Markdown results table (pasted into scenario-suite-report.md)
console.log('\n\n── Markdown table ──\n');
console.log('| # | Scenario | Source | Archetype | Verdict | Failing checks |');
console.log('|---|----------|--------|-----------|---------|----------------|');
results.forEach((r, i) => {
  const failsTxt =
    r.failReasons.length === 0
      ? '—'
      : r.checks
          .filter((c) => !c.pass)
          .map((c) => `${c.name} (${c.cause})`)
          .join('; ');
  console.log(`| ${i + 1} | ${r.id} | ${r.source} | ${r.archetype.replace(/\|/g, '/')} | ${r.verdict} | ${failsTxt} |`);
});

const outPath = join(HERE, 'scenario-suite-results.json');
writeFileSync(outPath, JSON.stringify({ mode: 'engine-only', timestamp: new Date().toISOString(), pass, fail, expectedFail: expected, results }, null, 2));
console.log(`\nFull results written to ${outPath}`);
