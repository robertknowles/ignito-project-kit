#!/usr/bin/env npx vite-node
/**
 * B3 verification — "don't touch the existing equity" must be honoured.
 *
 * Runs the SAME client through the real chat pipeline legs headlessly
 * (forceRefinanceOn → nlDataMapper → scenarioRunner → timeline/projection
 * engines), twice:
 *
 *   Variant A — brief says "happy to use the equity"
 *               (useExistingEquity unstated/true; allowEquityRelease forced on)
 *   Variant B — brief says "do NOT touch the existing equity"
 *               (AI extracts investmentProfile.useExistingEquity: false and
 *                allowEquityRelease: false on the existing property)
 *
 * PASS criteria (founder ruling 17 Jul 2026, re-audit gap B3):
 *   1. B releases $0 equity from the existing property (A releases > $0).
 *   2. B's purchases land later (or fewer place) than A's.
 *
 *   npx vite-node accuracy-testing/verify-equity-refusal.ts
 */

import type { NLParseResponse } from '../src/types/nlParse';
import {
  forceRefinanceOn,
  mapToInvestmentProfile,
  mapToPropertySelections,
  mapToExistingProperties,
} from '../src/utils/nlDataMapper';
import { runScenario, type ScenarioEnv, type ScenarioInput } from '../src/engine/scenarioRunner';
import { calculateAvailableFunds, type EngineDeps } from '../src/engine/affordabilityEngine';
import { getPropertyInstanceDefaults } from '../src/utils/propertyInstanceDefaults';
import { GROWTH_RATE_TIERS, annualRateToPeriodRate } from '../src/constants/financialParams';
import { CELL_IDS, getCategoryLabel, getCellDisplayLabel } from '../src/utils/propertyCells';
import { calcGrossYield } from '../src/utils/sharedFinancialCalcs';
import propertyDefaults from '../src/data/property-defaults.json';
import type { PropertyInstanceDetails } from '../src/types/propertyInstance';
import type { PropertyType } from '../src/contexts/PropertySelectionContext';
import type { PropertyAssumption } from '../src/contexts/DataAssumptionsContext';

// ── Headless env — identical assembly to run-scenario-suite.ts ──────────────

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

// ── The shared client + the two extraction variants ─────────────────────────
// Existing IP: $900k value, $400k loan → usable equity ≈ 900k×0.8 − 400k = $320k.
// Thin cash ($60k) so the three $620k purchases NEED that equity to land early.

function makeResponse(refuseEquity: boolean): NLParseResponse {
  const props = Array.from({ length: 3 }, () => ({
    type: 'regional-house-growth',
    purchasePrice: 620_000,
    state: 'QLD',
    growthAssumption: 'High' as const,
    loanProduct: 'IO' as const,
    lvr: 80,
    rentPerWeek: 475,
  }));
  return {
    type: 'initial_plan',
    message: '',
    assumptions: [],
    clientProfile: {
      members: [{ name: 'Sam', annualIncome: 180_000 }],
      monthlySavings: 2_500,
      currentDeposit: 60_000,
      borrowingCapacity: 2_000_000,
      existingPortfolio: [
        {
          address: '12 Existing St',
          state: 'NSW',
          boughtYear: 2018,
          purchasePrice: 650_000,
          currentValue: 900_000,
          loan: 400_000,
          rentPerWeek: 550,
          // Variant B: AI extracts the per-property refusal too (per prompt bullet)
          ...(refuseEquity ? { allowEquityRelease: false } : {}),
        },
      ],
    },
    investmentProfile: {
      depositPool: 60_000,
      annualSavings: 30_000,
      baseSalary: 180_000,
      timelineYears: 20,
      timelineYearsExplicit: false,
      equityGoal: 1_000_000,
      cashflowGoal: 50_000,
      ...(refuseEquity ? { useExistingEquity: false } : {}),
    },
    properties: props,
    strategyPreset: 'eg-low',
  } as NLParseResponse;
}

// ── Mirror ChatPanel.handlePlanGenerated + confirmPlan (headless) ────────────

function runVariant(label: string, refuseEquity: boolean) {
  let response = makeResponse(refuseEquity);
  response = forceRefinanceOn(response); // ChatPanel.handlePlanGenerated

  const profileUpdates = mapToInvestmentProfile(response); // confirmPlan
  const { selections, propertyOrder, instances } = mapToPropertySelections(
    response,
    undefined,
    profileUpdates,
  );
  const existingProps = mapToExistingProperties(response) ?? [];
  const totalDebt = existingProps.reduce((s, p) => s + (p.loan || 0), 0);
  const totalValue = existingProps.reduce((s, p) => s + (p.currentValue || 0), 0);
  const existingAnnualRent = existingProps.reduce((s, p) => s + (p.rentPerWeek || 0) * 52, 0);

  const input: ScenarioInput = {
    propertySelections: selections,
    propertyOrder,
    investmentProfile: {
      ...profileUpdates,
      currentDebt: totalDebt,
      portfolioValue: totalValue,
      existingAnnualRent,
    },
    propertyInstances: instances,
    existingProperties: existingProps,
    eventBlocks: [],
  };

  const result = runScenario(input, env);

  // Equity actually available from the EXISTING property at period 1
  // (before any new purchase exists) — the direct "was equity released" probe.
  const deps: EngineDeps = {
    getInstance: (id: string) => instances[id] ?? null,
    getPropertyData: (title: string, growthAssumption?: string) => {
      const defaults = getPropertyInstanceDefaults(title);
      const assumption = growthAssumption ?? defaults.growthAssumption ?? 'Medium';
      const rates = GROWTH_RATE_TIERS[assumption] ?? GROWTH_RATE_TIERS.Medium;
      const yieldByTier: Record<string, string> = { High: '3.5', Medium: '4.5', Low: '5.5' };
      return {
        growthYear1: rates.year1.toString(),
        growthYears2to3: rates.years2to3.toString(),
        growthYear4: rates.year4.toString(),
        growthYear5plus: rates.year5plus.toString(),
        yield: yieldByTier[assumption] ?? yieldByTier.Medium,
      } as PropertyAssumption;
    },
    calculatePropertyGrowth: (cost: number, periodsOwned: number, propertyData: PropertyAssumption) => {
      let v = cost;
      const r1 = annualRateToPeriodRate(parseFloat(propertyData.growthYear1) / 100);
      const r23 = annualRateToPeriodRate(parseFloat(propertyData.growthYears2to3) / 100);
      const r4 = annualRateToPeriodRate(parseFloat(propertyData.growthYear4) / 100);
      const r5 = annualRateToPeriodRate(parseFloat(propertyData.growthYear5plus) / 100);
      for (let p = 1; p <= periodsOwned; p++) {
        const rate = p <= 2 ? r1 : p <= 6 ? r23 : p <= 8 ? r4 : r5;
        v *= 1 + Math.max(-0.1, rate);
      }
      return v;
    },
  };
  const funds = calculateAvailableFunds(1, [], result.profile, existingProps, deps);

  const placements = result.timelineProperties.map((tp) => ({
    id: tp.instanceId,
    year: tp.period === Infinity ? null : Math.floor(tp.affordableYear),
    status: tp.status,
  }));
  const placedFeasible = placements.filter((p) => p.year !== null && p.status === 'feasible');

  console.log(`\n── Variant ${label} — ${refuseEquity ? '"do NOT touch the existing equity"' : '"happy to use the equity"'} ──`);
  console.log(`  profile.useExistingEquity            = ${result.profile.useExistingEquity}`);
  console.log(`  existing.allowEquityRelease          = ${existingProps[0]?.allowEquityRelease}`);
  console.log(`  equity available from existing (p1)  = $${Math.round(funds.equityRelease).toLocaleString()}`);
  console.log(`  placements:`);
  for (const p of placements) {
    console.log(`    ${p.id}: ${p.year ?? 'NEVER'} (${p.status})`);
  }
  return { placements, placedFeasible, equityAtP1: funds.equityRelease, profile: result.profile };
}

const A = runVariant('A', false);
const B = runVariant('B', true);

// ── Verdict ──────────────────────────────────────────────────────────────────

console.log('\n══ VERDICT ══');
const checks: Array<[string, boolean, string]> = [];

checks.push([
  'B releases NO existing equity',
  B.equityAtP1 === 0,
  `B equity at period 1 = $${Math.round(B.equityAtP1).toLocaleString()} (A = $${Math.round(A.equityAtP1).toLocaleString()})`,
]);
checks.push([
  'A DOES release existing equity',
  A.equityAtP1 > 0,
  `A equity at period 1 = $${Math.round(A.equityAtP1).toLocaleString()}`,
]);

const aYears = A.placedFeasible.map((p) => p.year as number).sort((x, y) => x - y);
const bYears = B.placedFeasible.map((p) => p.year as number).sort((x, y) => x - y);
const fewer = B.placedFeasible.length < A.placedFeasible.length;
const later =
  B.placedFeasible.length === A.placedFeasible.length &&
  bYears.some((y, i) => y > aYears[i]) &&
  bYears.every((y, i) => y >= aYears[i]);
checks.push([
  'B purchases are later or fewer than A',
  fewer || later,
  `A places ${A.placedFeasible.length} in [${aYears.join(', ')}]; B places ${B.placedFeasible.length} in [${bYears.join(', ')}]`,
]);

let allPass = true;
for (const [name, pass, detail] of checks) {
  console.log(` ${pass ? '✅' : '❌'} ${name} — ${detail}`);
  if (!pass) allPass = false;
}
console.log(allPass ? '\nB3 ruling HONOURED — stated equity refusal wins.' : '\nB3 ruling VIOLATED.');
process.exit(allPass ? 0 : 1);
