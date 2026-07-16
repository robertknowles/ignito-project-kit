#!/usr/bin/env npx vite-node
/**
 * Gameplans Cashflow Comparison Harness (measurement only — no app code changes)
 *
 * Runs the REAL engine (src/engine/scenarioRunner → timelineEngine + projectionEngine)
 * headlessly on scenarios reconstructed from the Gameplans baseline docs:
 *   - /Users/robknowles/Projects/GAMEPLANS-BASELINE-REFERENCE.md
 *   - "Gameplans  - Cashflow Scenario.txt" / "Gameplans  - Growth Scenario.txt" transcripts
 *
 * Prints a year-by-year cashflow table per scenario: gross rent, vacancy, each
 * opex line (management, insurance, council, strata, maintenance), loan
 * interest/principal, land tax, NG/after-tax benefit, net cashflow, and the
 * cashflow-positive crossover year. Every detail row is reconciled against the
 * engine's own portfolio cashflowData (✓/✗ column) so the itemisation can't
 * drift from the real math.
 *
 * RUN WITH VITE-NODE (not tsx): timelineEngine reads `import.meta.env.DEV`,
 * which only exists under Vite module semantics. Plain `npx tsx` throws
 * "Cannot read properties of undefined (reading 'DEV')".
 *
 *   npx vite-node accuracy-testing/run-gameplans-comparison.ts
 *   npx vite-node accuracy-testing/run-gameplans-comparison.ts -- --case GP-CF-P1
 *   npx vite-node accuracy-testing/run-gameplans-comparison.ts -- --years 12
 *
 * Interest rates: the engine resolves a planned property's base rate as
 * per-instance interestRate → profile.interestRate → DEFAULT_INTEREST_RATE
 * (finding #1 in the report, since fixed), so Gameplans' 5.5% is modelled
 * directly via the instance/profile rate — no rate-change event needed.
 */

import {
  runScenario,
  type ScenarioInput,
  type ScenarioEnv,
  type ScenarioRunResult,
} from '../src/engine/scenarioRunner';
import { calculateDetailedCashflow } from '../src/utils/detailedCashflowCalculator';
import { calculateNegativeGearingBenefit } from '../src/utils/negativeGearingCalculator';
import { getPropertyEffectiveRate } from '../src/utils/eventProcessing';
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
import type { PropertyType } from '../src/contexts/PropertySelectionContext';
import type { PropertyAssumption } from '../src/contexts/DataAssumptionsContext';
import type { InvestmentProfileData } from '../src/contexts/InvestmentProfileContext';

// ─────────────────────────────────────────────────────────────────────────────
// Headless environment — mirrors the PURE template→propertyTypes/getPropertyData
// derivations in PropertySelectionContext / DataAssumptionsContext (default,
// un-customised state — i.e. a fresh account). This is input assembly, which
// scenarioRunner's contract says the caller owns; all MATH runs in the real engine.
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Scenario builders
// ─────────────────────────────────────────────────────────────────────────────

/** Build a property instance from a cell's defaults + overrides, manually
 *  placed at a given period (period 1 = BASE_YEAR H1) so placement gating
 *  differences can't contaminate the cashflow comparison. */
function makeInstance(
  cellId: string,
  period: number,
  overrides: Partial<PropertyInstanceDetails>,
): PropertyInstanceDetails {
  const base = (propertyDefaults as Record<string, PropertyInstanceDetails>)[cellId];
  const merged: PropertyInstanceDetails = {
    ...base,
    ...overrides,
    isManuallyPlaced: true,
    manualPlacementPeriod: period,
  } as PropertyInstanceDetails;
  if (overrides.purchasePrice && overrides.valuationAtPurchase === undefined) {
    merged.valuationAtPurchase = overrides.purchasePrice;
  }
  return merged;
}

interface PropertySpec {
  cellId: string;
  purchaseYear: number; // calendar year; converted to period
  overrides: Partial<PropertyInstanceDetails>;
}

interface CaseSpec {
  id: string;
  title: string;
  notes: string[];
  properties: PropertySpec[];
  profile: Partial<InvestmentProfileData>;
  /** Interest rate (%) for ALL planned-property cashflow — set as the profile
   *  (assumptions-level) rate; per-instance rates take precedence over it. */
  interestRatePct?: number;
  /** Gameplans' published figures for the comparison footer, if any. */
  gameplans?: { label: string; value: string }[];
  tableYears?: number;
}

const yearToPeriod = (year: number) => (year - BASE_YEAR) * PERIODS_PER_YEAR + 1;

// Generous funding profile so manual placements are never starved — this
// harness measures CASHFLOW, not deposit/BC gating.
const FUNDING = {
  depositPool: 600000,
  annualSavings: 42000, // Gameplans base case: $3.5k/mo
  baseSalary: 250000,
  borrowingCapacity: 4000000,
  useExistingEquity: true,
  timelineYears: 30,
};

// Gameplans-dial profile pieces (from GAMEPLANS-BASELINE-REFERENCE.md §5 + transcripts)
const GP_DIALS: Partial<InvestmentProfileData> = {
  vacancyRate: 0.08, // occupancy 92%
  rentEscalationRate: 0.05, // Rental Increase PA 5%
  inflationRate: 0.025, // Inflation 2.5%
  wageGrowthRate: 0.025,
};

const CASES: CaseSpec[] = [
  {
    id: 'GP-CF-P1',
    title:
      'Gameplans Cashflow archetype, property 1 — $550k resi, 5% yield, IO 80% LVR, 5.5% interest, 92% occupancy, GP dials, OUR default opex',
    notes: [
      'Gameplans transcript (Cashflow Scenario): Y1 rental income ~$27k(gross $27.5k), mortgage ~$24.2k, running costs ~$5.5k, net ≈ -$2k; "essentially going neutral over the next couple of years".',
      'Growth tier Medium (6/5.5/5/5 ≈ 5.4% avg) is our closest to GP 5% flat — growth does not affect the cashflow lines.',
      'Opex left at OUR regional-house-cashflow cell defaults (mgmt 8% of net rent, insurance $1,500, council/water $2,000, strata $0, maintenance $2,200) to expose the opex-level divergence.',
    ],
    properties: [
      {
        cellId: 'regional-house-cashflow',
        purchaseYear: BASE_YEAR,
        overrides: {
          purchasePrice: 550000,
          rentPerWeek: Math.round((550000 * 0.05) / 52), // $529/wk ≈ 5.0% gross
          lvr: 80,
          loanProduct: 'IO',
          interestRate: 5.5,
        },
      },
    ],
    profile: { ...FUNDING, ...GP_DIALS },
    interestRatePct: 5.5,
    gameplans: [
      { label: 'Y1 gross rent', value: '$27,500 ("rental income of 27")' },
      { label: 'Y1 mortgage (IO 5.5% on $440k)', value: '$24,200' },
      { label: 'Y1 running costs', value: '~$5,500' },
      { label: 'Y1 net cashflow', value: '≈ -$2,000' },
      { label: 'Crossover', value: '"neutral over the next couple of years" (~2-3 yrs)' },
    ],
    tableYears: 12,
  },
  {
    id: 'GP-CF-P1-GPOPEX',
    title:
      'Same property, Gameplans running costs forced ($5.5k/yr via holdingCostOverride) — isolates the non-opex divergence (vacancy treatment)',
    notes: [
      'holdingCostOverride scales our five opex components proportionally to a $5,500 total, i.e. Gameplans "typical holding costs" on a $550k property (~1.0% of value).',
    ],
    properties: [
      {
        cellId: 'regional-house-cashflow',
        purchaseYear: BASE_YEAR,
        overrides: {
          purchasePrice: 550000,
          rentPerWeek: Math.round((550000 * 0.05) / 52),
          lvr: 80,
          loanProduct: 'IO',
          interestRate: 5.5,
          holdingCostOverride: 5500,
        },
      },
    ],
    profile: { ...FUNDING, ...GP_DIALS },
    interestRatePct: 5.5,
    gameplans: [
      { label: 'Y1 net cashflow', value: '≈ -$2,000' },
      { label: 'Crossover', value: '~2-3 yrs' },
    ],
    tableYears: 8,
  },
  {
    id: 'GP-GROWTH-P1',
    title:
      'Gameplans Growth archetype, property 1 — $700k resi, 3.2% yield, IO 90% LVR + LMI, 5.5% interest, 92% occupancy',
    notes: [
      'Gameplans transcript (Growth Scenario): Y1 passive income ≈ -$20k, "neutral about 2026" (purchase in 2022 → crossover year 4).',
      'Our High growth tier (12.5/10/7.5/6) is the nearest to GP 7% flat — again irrelevant to cashflow lines.',
      'LMI not capitalised (GP deducted it from savings); loan = 90% × $700k = $630k, matching GP "630k worth of debt".',
    ],
    properties: [
      {
        cellId: 'metro-house-growth',
        purchaseYear: BASE_YEAR,
        overrides: {
          purchasePrice: 700000,
          rentPerWeek: Math.round((700000 * 0.032) / 52), // $431/wk ≈ 3.2%
          lvr: 90,
          lmiWaiver: false,
          lmiCapitalized: false,
          loanProduct: 'IO',
          interestRate: 5.5,
          growthAssumption: 'High',
        },
      },
    ],
    profile: { ...FUNDING, ...GP_DIALS },
    interestRatePct: 5.5,
    gameplans: [
      { label: 'Y1 net cashflow', value: '≈ -$20,000' },
      { label: 'Crossover', value: 'year 4 ("neutral about 2026", bought 2022)' },
    ],
    tableYears: 12,
  },
  {
    id: 'GP-BRIEF-350K',
    title:
      'Gameplans Brief-tab canonical unit — $350k QLD, $140/wk rent, IO 5.77% on $280k, itemised GP holding costs incl. land tax $1,500 + strata $5,400',
    notes: [
      'All holding costs set to the Brief-tab itemisation: council+water $2,100, strata $5,400, insurance $700, maintenance $550, mgmt $163/yr (2.24% of rent), land tax $1,500.',
      'Gameplans Brief shows annual cashflow -$19,289 = gross rent $7,280 - holding $10,413 - repayments $16,156 with NO vacancy applied. Run at 0% instance vacancy to test exact replication; the vacancy-variant rows show what our 4%/8% defaults would do.',
      'The $140/wk rent (2.08% yield) is as-published in the baseline doc — a demo-data quirk, kept verbatim.',
    ],
    properties: [
      {
        cellId: 'metro-unit-growth',
        purchaseYear: BASE_YEAR,
        overrides: {
          purchasePrice: 350000,
          rentPerWeek: 140,
          lvr: 80,
          loanProduct: 'IO',
          interestRate: 5.77,
          state: 'QLD',
          vacancyRate: 0, // per-instance % form — GP Brief applies no vacancy
          propertyManagementPercent: (163 / 7280) * 100, // $163/yr on $7,280 rent
          buildingInsuranceAnnual: 700,
          councilRatesWater: 1225 + 875, // council rates + water rates
          strata: 5400,
          maintenanceAllowanceAnnual: 550,
          landTaxOverride: 1500,
        },
      },
    ],
    profile: { ...FUNDING, ...GP_DIALS },
    interestRatePct: 5.77,
    gameplans: [
      { label: 'Y1 annual cashflow', value: '-$19,289 (monthly -$1,607)' },
      { label: 'Y1 repayments', value: '$16,156' },
      { label: 'Y1 holding costs', value: '$10,413 (incl. land tax $1,500)' },
      { label: 'Y1 rent', value: '$7,280 gross — no vacancy deduction' },
    ],
    tableYears: 3,
  },
  {
    id: 'BETA-DEFAULTS',
    title:
      'Beta-tester claim test — single typical property, ALL PropPath defaults (5.5% default interest, gross-rent cashflow line, 3% expense inflation, rescaled ~1% opex), 5% yield / 5% rent growth / IO 80%',
    notes: [
      '"Properties take ~10 years to go cashflow-positive when BAs expect ~7 (at 5% rent growth)".',
      '$650k purchase, $625/wk rent (5.0% gross). Opex: mgmt 8%, insurance $1,100, council $1,600, strata $0, maintenance $600 (regional-house-cashflow cell defaults).',
    ],
    properties: [
      {
        cellId: 'regional-house-cashflow',
        purchaseYear: BASE_YEAR,
        overrides: {
          purchasePrice: 650000,
          rentPerWeek: Math.round((650000 * 0.05) / 52), // $625/wk
          lvr: 80,
          loanProduct: 'IO',
        },
      },
    ],
    profile: { ...FUNDING },
    tableYears: 14,
  },
  {
    id: 'GP-CF-PORTFOLIO',
    title:
      'Gameplans Cashflow archetype, full 3-purchase portfolio — $550k(Y0) + $600k(Y2) + $720k(Y4), all 5% yield IO 80%, 5.5% interest, GP dials',
    notes: [
      'Purchase years mapped 2022/2024/2026 → BASE_YEAR+0/+2/+4. GP future values used as purchase prices (their modal shows the future value as the buy price).',
      'GP checkpoints: year after P2 dip ≈ -$6k → -$3k → positive; year after P3 ≈ -$2k then +$6-7k; final-year (30y) rental income ~$100k, repayments ~$85k, running ~$20k, "essentially neutral"; passive income ~$100k+ over 30 years.',
    ],
    properties: [
      {
        cellId: 'regional-house-cashflow',
        purchaseYear: BASE_YEAR,
        overrides: {
          purchasePrice: 550000,
          rentPerWeek: Math.round((550000 * 0.05) / 52),
          lvr: 80,
          loanProduct: 'IO',
          interestRate: 5.5,
        },
      },
      {
        cellId: 'regional-house-growth',
        purchaseYear: BASE_YEAR + 2,
        overrides: {
          purchasePrice: 600000,
          rentPerWeek: Math.round((600000 * 0.05) / 52),
          lvr: 80,
          loanProduct: 'IO',
          interestRate: 5.5,
        },
      },
      {
        cellId: 'metro-house-cashflow',
        purchaseYear: BASE_YEAR + 4,
        overrides: {
          purchasePrice: 720000,
          rentPerWeek: Math.round((720000 * 0.05) / 52),
          lvr: 80,
          loanProduct: 'IO',
          interestRate: 5.5,
        },
      },
    ],
    profile: { ...FUNDING, ...GP_DIALS, depositPool: 900000 },
    interestRatePct: 5.5,
    gameplans: [
      { label: 'Y after P3 net', value: '≈ -$2k, then +$6-7k' },
      { label: 'Final year (30y) rent / repayments / running', value: '~$100k / ~$85k / ~$20k' },
    ],
    tableYears: 30,
  },
];

// ── Sensitivity grid for the BETA claim ──────────────────────────────────────

interface SensitivitySpec {
  id: string;
  label: string;
  profile?: Partial<InvestmentProfileData>;
  overrides?: Partial<PropertyInstanceDetails>;
  interestRatePct?: number;
}

const BETA_BASE: PropertySpec = CASES.find((c) => c.id === 'BETA-DEFAULTS')!.properties[0];

const SENSITIVITIES: SensitivitySpec[] = [
  { id: 'base', label: 'Base: all PropPath defaults (interest 5.5%, gross-rent cashflow, inflation 3%, mgmt 8%, ~1% opex)' },
  { id: 'rate-5.5', label: 'Interest dial at 5.5% (= new default; must be a no-op vs base)', interestRatePct: 5.5 },
  { id: 'rate-6.0', label: 'Interest 5.5% → 6.0% (Gameplans dial default)', interestRatePct: 6.0 },
  { id: 'vac-8', label: 'Vacancy dial 4% → 8% (must be a no-op on the cashflow line)', profile: { vacancyRate: 0.08 } },
  { id: 'vac-0', label: 'Vacancy dial 4% → 0% (must be a no-op on the cashflow line)', profile: { vacancyRate: 0.0 } },
  { id: 'infl-2.5', label: 'Expense inflation 3% → 2.5% (Gameplans)', profile: { inflationRate: 0.025 } },
  { id: 'mgmt-5.5', label: 'Management 8% → 5.5% of rent', overrides: { propertyManagementPercent: 5.5 } },
  { id: 'opex-gp', label: 'Opex forced to 1.0% of value ($6.5k, Gameplans-level running costs)', overrides: { holdingCostOverride: 6500 } },
  { id: 'rentesc-4', label: 'Rent escalation 5% → 4%', profile: { rentEscalationRate: 0.04 } },
  { id: 'newbuild', label: 'New build (NG benefit retained → after-tax line)', overrides: { isNewBuild: true } },
  { id: 'yield-4.5', label: 'Yield 5.0% → 4.5% ($562/wk)', overrides: { rentPerWeek: Math.round((650000 * 0.045) / 52) } },
  { id: 'yield-5.5', label: 'Yield 5.0% → 5.5% ($687/wk)', overrides: { rentPerWeek: Math.round((650000 * 0.055) / 52) } },
  {
    id: 'gp-all',
    label: 'ALL Gameplans-aligned: interest 5.5% + gross rent + GP opex ($6.5k) + 2.5% inflation',
    interestRatePct: 5.5,
    profile: { vacancyRate: 0.0, inflationRate: 0.025 },
    overrides: { holdingCostOverride: 6500 },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Run + detail-table printer
// ─────────────────────────────────────────────────────────────────────────────

function buildScenario(spec: CaseSpec): ScenarioInput {
  const selections: Record<string, number> = {};
  const order: string[] = [];
  const instances: Record<string, PropertyInstanceDetails> = {};
  spec.properties.forEach((p) => {
    const n = selections[p.cellId] ?? 0;
    const instanceId = `${p.cellId}_instance_${n}`;
    selections[p.cellId] = n + 1;
    order.push(instanceId);
    instances[instanceId] = makeInstance(p.cellId, yearToPeriod(p.purchaseYear), p.overrides);
  });
  return {
    propertySelections: selections,
    propertyOrder: order,
    investmentProfile:
      spec.interestRatePct !== undefined
        ? { ...spec.profile, interestRate: spec.interestRatePct / 100 }
        : spec.profile,
    propertyInstances: instances,
    existingProperties: [],
    eventBlocks: [],
  };
}

interface YearDetail {
  year: number;
  grossRent: number;
  vacancy: number;
  netRent: number;
  mgmt: number;
  insurance: number;
  council: number;
  strata: number;
  maintenance: number;
  landTax: number;
  principal: number;
  interest: number;
  ng: number;
  net: number;
  cumulative: number;
  engineNet: number | null; // projection.cashflowData same-year figure
  reconciles: boolean;
}

/**
 * Re-derive the engine's per-line items for each year, using the SAME modules
 * and factor formulas as projectionEngine's planned-property block
 * (calculateDetailedCashflow + rent-escalation/inflation factors +
 * getPropertyEffectiveRate + calculateNegativeGearingBenefit), then reconcile
 * the summed net against the engine's own cashflowData.
 */
function deriveYearDetails(
  spec: CaseSpec,
  scenario: ScenarioInput,
  result: ScenarioRunResult,
  years: number,
): YearDetail[] {
  const profile = result.profile;
  const eventBlocks = scenario.eventBlocks ?? [];
  const details: YearDetail[] = [];
  let cumulative = 0;

  const placed = result.timelineProperties.filter((p) => p.period !== Infinity);

  for (let yearIndex = 0; yearIndex < years; yearIndex++) {
    const year = BASE_YEAR + yearIndex;
    const periodsElapsed = yearIndex * PERIODS_PER_YEAR;
    const row: YearDetail = {
      year, grossRent: 0, vacancy: 0, netRent: 0, mgmt: 0, insurance: 0,
      council: 0, strata: 0, maintenance: 0, landTax: 0, principal: 0,
      interest: 0, ng: 0, net: 0, cumulative: 0, engineNet: null, reconciles: false,
    };

    placed.forEach((tp) => {
      const purchaseYear = Math.floor(tp.affordableYear);
      if (purchaseYear > year) return;
      const inst = result.instances[tp.instanceId];
      if (!inst) return;
      const yearsOwned = year - purchaseYear;
      const rentEsc = Math.pow(1 + (profile.rentEscalationRate ?? 0.05), yearsOwned);
      const infl = Math.pow(1 + (profile.inflationRate ?? 0.03), yearsOwned);

      const breakdown = calculateDetailedCashflow(inst, tp.loanAmount, profile.vacancyRate);
      // Mirrors projectionEngine's ResolvedProperty rate resolution: an
      // instance rate left at the platform default defers to the profile rate.
      const baseRate = inst.interestRate && inst.interestRate / 100 !== DEFAULT_INTEREST_RATE
        ? inst.interestRate / 100
        : (profile.interestRate ?? DEFAULT_INTEREST_RATE);
      const effRate = getPropertyEffectiveRate(periodsElapsed, eventBlocks, tp.instanceId, baseRate);
      const interest = tp.loanAmount * effRate;

      const grossRent = breakdown.grossAnnualIncome * rentEsc;
      // Vacancy is a memo column only: the client-facing cashflow line uses
      // GROSS rent (Gameplans-aligned); vacancy still shades serviceability.
      const vacancy = breakdown.vacancyAmount * rentEsc;
      const netRent = grossRent - vacancy;
      const mgmt = breakdown.propertyManagementFee * rentEsc;
      const insurance = breakdown.buildingInsurance * infl;
      const council = breakdown.councilRatesWater * infl;
      const strata = breakdown.strata * infl;
      const maintenance = breakdown.maintenance * infl;
      const landTax = (breakdown.landTax ?? 0) * infl;
      const principal = breakdown.principalPayments * infl; // engine inflates non-deductibles
      const nonDeductible = breakdown.totalNonDeductibleExpenses * infl;
      const opex = mgmt + insurance + council + strata + maintenance;

      const ng = calculateNegativeGearingBenefit({
        propertyCost: tp.cost,
        annualRentNet: grossRent,
        deductibleExpenses: opex + interest + landTax,
        isNewBuild: !!inst.isNewBuild,
        buyYear: purchaseYear,
        marginalRate: profile.marginalTaxRate ?? 0.45,
      }).ngBenefit;

      row.grossRent += grossRent;
      row.vacancy += vacancy;
      row.netRent += netRent;
      row.mgmt += mgmt;
      row.insurance += insurance;
      row.council += council;
      row.strata += strata;
      row.maintenance += maintenance;
      row.landTax += landTax;
      row.principal += principal;
      row.interest += interest;
      row.ng += ng;
      row.net += grossRent - (opex + nonDeductible) - interest + ng;
    });

    cumulative += row.net;
    row.cumulative = cumulative;
    const engineRow = result.projection.cashflowData.find((d) => d.year === String(year));
    row.engineNet = engineRow ? engineRow.cashflow : null;
    row.reconciles = engineRow ? Math.abs(engineRow.cashflow - row.net) <= 2 : false;
    details.push(row);
  }
  return details;
}

const f = (n: number) =>
  (n < 0 ? '-' : '') + Math.abs(Math.round(n)).toLocaleString('en-AU');

function crossoverYear(details: YearDetail[]): { year: number | null; index: number | null } {
  for (const [i, d] of details.entries()) {
    if (d.net >= 0) return { year: d.year, index: i };
  }
  return { year: null, index: null };
}

function printCase(spec: CaseSpec, years: number) {
  console.log('\n' + '═'.repeat(100));
  console.log(`CASE ${spec.id}`);
  console.log(spec.title);
  console.log('═'.repeat(100));
  spec.notes.forEach((n) => console.log(`  • ${n}`));

  const scenario = buildScenario(spec);
  const result = runScenario(scenario, env);

  result.timelineProperties.forEach((tp) => {
    console.log(
      `  placed: ${tp.title} — buy ${Math.floor(tp.affordableYear)} | price $${f(tp.cost)} | loan $${f(
        tp.loanAmount,
      )} | status ${tp.status}`,
    );
  });

  const tableYears = spec.tableYears ?? years;
  const details = deriveYearDetails(spec, scenario, result, tableYears);

  const header = [
    'Year', 'GrossRent', 'Vac(memo)', 'Mgmt', 'Insur', 'Council', 'Strata',
    'Maint', 'LandTax', 'Princ', 'Interest', 'NG', 'Net', 'Cumul', 'Engine', 'OK',
  ];
  const widths = [5, 10, 9, 7, 7, 8, 7, 7, 8, 7, 9, 7, 9, 10, 9, 3];
  const pad = (s: string, w: number) => s.padStart(w);
  console.log('\n  ' + header.map((h, i) => pad(h, widths[i])).join(' '));
  details.forEach((d) => {
    console.log(
      '  ' +
        [
          String(d.year), f(d.grossRent), f(d.vacancy), f(d.mgmt), f(d.insurance),
          f(d.council), f(d.strata), f(d.maintenance), f(d.landTax), f(d.principal),
          f(d.interest), f(d.ng), f(d.net), f(d.cumulative),
          d.engineNet === null ? '—' : f(d.engineNet), d.reconciles ? '✓' : '✗',
        ].map((s, i) => pad(s, widths[i])).join(' '),
    );
  });

  const cross = crossoverYear(deriveYearDetails(spec, scenario, result, 40));
  console.log(
    `\n  CASHFLOW-POSITIVE CROSSOVER: ${
      cross.year === null ? 'never (within 40 years)' : `${cross.year} (year ${cross.index! + 1} of ownership)`
    }`,
  );
  if (spec.gameplans) {
    console.log('  GAMEPLANS PUBLISHED FIGURES:');
    spec.gameplans.forEach((g) => console.log(`    ${g.label}: ${g.value}`));
  }
  const bad = details.filter((d) => d.engineNet !== null && !d.reconciles);
  if (bad.length > 0) {
    console.log(`  ⚠ RECONCILIATION FAILURES vs engine cashflowData: ${bad.map((d) => d.year).join(', ')}`);
  }
}

function runSensitivities() {
  console.log('\n' + '═'.repeat(100));
  console.log('SENSITIVITY — "10 vs 7 years to cashflow-positive" ($650k, 5% yield, IO 80%, PropPath defaults)');
  console.log('═'.repeat(100));
  console.log('  One dial changed at a time; crossover = first calendar year with net cashflow ≥ 0 (engine after-tax line).\n');

  const rows: { label: string; year: string; ownershipYear: string; y1: string }[] = [];
  SENSITIVITIES.forEach((s) => {
    const spec: CaseSpec = {
      id: `BETA-${s.id}`,
      title: s.label,
      notes: [],
      properties: [
        {
          ...BETA_BASE,
          overrides: { ...BETA_BASE.overrides, ...(s.overrides ?? {}) },
        },
      ],
      profile: { ...FUNDING, ...(s.profile ?? {}) },
      interestRatePct: s.interestRatePct,
    };
    const scenario = buildScenario(spec);
    const result = runScenario(scenario, env);
    const details = deriveYearDetails(spec, scenario, result, 40);
    const cross = crossoverYear(details);
    rows.push({
      label: s.label,
      year: cross.year === null ? '>40y' : String(cross.year),
      ownershipYear: cross.index === null ? '—' : String(cross.index + 1),
      y1: f(details[0].net),
    });
  });

  const w = Math.max(...rows.map((r) => r.label.length)) + 2;
  console.log('  ' + 'Variant'.padEnd(w) + 'Y1 net'.padStart(10) + 'Crossover'.padStart(12) + 'Own-year'.padStart(10));
  rows.forEach((r) =>
    console.log('  ' + r.label.padEnd(w) + r.y1.padStart(10) + r.year.padStart(12) + r.ownershipYear.padStart(10)),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const caseFilterIdx = args.indexOf('--case');
const caseFilter = caseFilterIdx !== -1 ? args[caseFilterIdx + 1]?.split(',') : null;
const yearsIdx = args.indexOf('--years');
const years = yearsIdx !== -1 ? parseInt(args[yearsIdx + 1], 10) : 15;

console.log('Gameplans × PropPath engine cashflow comparison');
console.log(`BASE_YEAR=${BASE_YEAR}  DEFAULT_INTEREST_RATE=${(DEFAULT_INTEREST_RATE * 100).toFixed(2)}%  (engine modules imported from src/, math untouched)`);

for (const spec of CASES) {
  if (caseFilter && !caseFilter.includes(spec.id)) continue;
  printCase(spec, years);
}
if (!caseFilter || caseFilter.includes('SENSITIVITY')) {
  runSensitivities();
}
