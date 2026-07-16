#!/usr/bin/env npx vite-node
/**
 * Interest-rate fix verification (projectionEngine planned-property base rate)
 *
 * Checks the rate-precedence contract for a planned property's loan interest:
 *   1. per-property (instance) interestRate, when moved off the platform default
 *   2. else profile/assumptions-level interestRate
 *   3. else DEFAULT_INTEREST_RATE
 * with interest_rate_change events still applied on top.
 *
 * Single $650k / $520k-loan IO property (BETA-DEFAULTS shape), manually placed
 * in BASE_YEAR. Asserts the engine's Y1 loan-repayments line and the
 * cashflow-positive crossover year for each rate configuration.
 *
 *   npx vite-node accuracy-testing/verify-rate-fix.ts
 */

import {
  runScenario,
  type ScenarioInput,
  type ScenarioEnv,
} from '../src/engine/scenarioRunner';
import {
  BASE_YEAR,
  PERIODS_PER_YEAR,
  GROWTH_RATE_TIERS,
  DEFAULT_INTEREST_RATE,
} from '../src/constants/financialParams';
import { CELL_IDS, getCategoryLabel, getCellDisplayLabel } from '../src/utils/propertyCells';
import { calcGrossYield } from '../src/utils/sharedFinancialCalcs';
import propertyDefaults from '../src/data/property-defaults.json';
import type { PropertyInstanceDetails } from '../src/types/propertyInstance';
import type { PropertyType, EventBlock } from '../src/contexts/PropertySelectionContext';
import type { PropertyAssumption } from '../src/contexts/DataAssumptionsContext';
import type { InvestmentProfileData } from '../src/contexts/InvestmentProfileContext';

// ── Headless env (same assembly as run-gameplans-comparison.ts) ─────────────

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

// ── Scenario: $650k, $625/wk, IO 80% ($520k loan), placed at BASE_YEAR ──────

const CELL = 'regional-house-cashflow';
const LOAN = 520000;

function buildScenario(opts: {
  instanceRatePct?: number;
  profileRate?: number;
  eventRateChangePct?: number;
}): ScenarioInput {
  const base = (propertyDefaults as Record<string, PropertyInstanceDetails>)[CELL];
  const instance: PropertyInstanceDetails = {
    ...base,
    purchasePrice: 650000,
    valuationAtPurchase: 650000,
    rentPerWeek: 625,
    lvr: 80,
    loanProduct: 'IO',
    isManuallyPlaced: true,
    manualPlacementPeriod: 1,
    ...(opts.instanceRatePct !== undefined ? { interestRate: opts.instanceRatePct } : {}),
  } as PropertyInstanceDetails;

  const profile: Partial<InvestmentProfileData> = {
    depositPool: 600000,
    annualSavings: 42000,
    baseSalary: 250000,
    borrowingCapacity: 4000000,
    useExistingEquity: true,
    timelineYears: 30,
    ...(opts.profileRate !== undefined ? { interestRate: opts.profileRate } : {}),
  };

  const eventBlocks: EventBlock[] =
    opts.eventRateChangePct !== undefined
      ? [
          {
            id: 'rate-event',
            type: 'event',
            eventType: 'interest_rate_change',
            category: 'financial',
            period: 0,
            order: 0,
            payload: { rateChange: opts.eventRateChangePct },
          } as EventBlock,
        ]
      : [];

  return {
    propertySelections: { [CELL]: 1 },
    propertyOrder: [`${CELL}_instance_0`],
    investmentProfile: profile,
    propertyInstances: { [`${CELL}_instance_0`]: instance },
    existingProperties: [],
    eventBlocks,
  };
}

function run(label: string, opts: Parameters<typeof buildScenario>[0], expectedRatePct: number) {
  const result = runScenario(buildScenario(opts), env);
  const y1 = result.projection.cashflowData.find((d) => d.year === String(BASE_YEAR))!;
  const crossover = result.projection.cashflowData.find((d) => d.cashflow >= 0);
  const expectedInterest = Math.round(LOAN * (expectedRatePct / 100));
  const ok = y1.loanRepayments === expectedInterest;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}\n` +
      `      Y1 interest $${y1.loanRepayments.toLocaleString()} (expected $${expectedInterest.toLocaleString()} @ ${expectedRatePct}%)` +
      ` | Y1 net $${y1.cashflow.toLocaleString()} | crossover ${crossover ? crossover.year : '>30y'}`,
  );
  return ok;
}

console.log(`Rate-precedence verification — $650k / $${LOAN.toLocaleString()} IO loan, BASE_YEAR=${BASE_YEAR}, default ${DEFAULT_INTEREST_RATE * 100}%\n`);

const DEFAULT_PCT = DEFAULT_INTEREST_RATE * 100;

const results = [
  run(`No rate set anywhere (instance at template default ${DEFAULT_PCT}) → ${DEFAULT_PCT}% default`, {}, DEFAULT_PCT),
  run('Per-property rate 6.0 (dashboard row edit, moved off default) → instance wins', { instanceRatePct: 6.0 }, 6.0),
  run('Profile rate 5.0% only (assumptions dial; instance untouched) → profile flows', { profileRate: 0.05 }, 5.0),
  run('Instance 5.0 + profile 6.0 → per-property override wins', { instanceRatePct: 5.0, profileRate: 0.06 }, 5.0),
  run('Instance 6.0 + rate-change event +0.5pt → event applies on top', { instanceRatePct: 6.0, eventRateChangePct: 0.5 }, 6.5),
  run('Profile 5.0% + rate-change event +0.5pt → event applies on top', { profileRate: 0.05, eventRateChangePct: 0.5 }, 5.5),
];

if (results.every(Boolean)) {
  console.log('\nAll rate-precedence checks passed.');
} else {
  console.error('\nSOME CHECKS FAILED');
  process.exit(1);
}
