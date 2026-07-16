#!/usr/bin/env npx vite-node
/**
 * Anu "Fresh Start — Property Roadmap" × PropPath engine comparison (Task 6)
 * Measurement only — no app code changes. Engine bugs/gaps are DOCUMENTED.
 *
 * Source of truth: accuracy-testing/external-sources/anu-transcription.md
 * Fixture:         accuracy-testing/fixtures/anu-roadmap.json
 *
 * Anu's sheet is the ONLY portfolio-level external source (4 properties,
 * staggered purchases, Year 0-18 projection), so this harness weights the
 * multi-year multi-property compounding curve over any single line.
 *
 * Three layers:
 *   1. ANU REPLICA — her model hand-computed OUTSIDE the engine from the
 *      inferred rules (growth 10/10/7+, rent esc 5%, opex inflation 3%,
 *      interest = daily-compounded effective 6.18313% of loan, IO forever,
 *      no vacancy, no tax). Verified against every transcribed cell.
 *   2. ENGINE RUNS — the REAL engine (src/engine/scenarioRunner) on the same
 *      4-property portfolio, manual placement 2026/2027/2028/2029 (her Year 0
 *      = 2026 so all buys are post-NG-reform established => NG benefit $0 and
 *      our cashflow line is pre-tax like hers).
 *        Variant A: interest 6.00% (her stated rate, our simple-interest convention)
 *        Variant B: interest 6.18313% (her implied daily-compounding convention)
 *        Variant C: A but with our BUILT-IN High growth tier (what a BA gets
 *                   without customising assumptions) — value line only.
 *   3. RECONCILIATION — year-by-year her-vs-ours tables for all six Summary
 *      rows, crossover years, per-state stamp duty, per-cell before/after.
 *
 * Growth mapping: engine tiers are year1 / years2to3 / year4 / year5plus
 * (ownership years 2 AND 3 share one rate) so her 10/10/7/7... is not exactly
 * expressible. Best-fit custom curve (a BA can set this on the Assumptions
 * page): year1=10, years2to3=sqrt(1.10*1.07)-1=8.48963% (geometric mean —
 * cumulative value exact from ownership year 3 on), year4=7, year5plus=7.
 * Only each property's ownership-YEAR-2 snapshot dips (-1.37% per property).
 *
 * RUN WITH VITE-NODE (not tsx): timelineEngine reads import.meta.env.DEV.
 *   npx vite-node accuracy-testing/run-anu-comparison.ts
 */

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
  DEFAULT_INTEREST_RATE,
} from '../src/constants/financialParams';
import { calculateStampDuty } from '../src/utils/stampDutyCalculator';
import { CELL_IDS, getCategoryLabel, getCellDisplayLabel } from '../src/utils/propertyCells';
import { calcGrossYield } from '../src/utils/sharedFinancialCalcs';
import propertyDefaults from '../src/data/property-defaults.json';
import fixture from './fixtures/anu-roadmap.json';
import type { PropertyInstanceDetails } from '../src/types/propertyInstance';
import type { PropertyType } from '../src/contexts/PropertySelectionContext';
import type { PropertyAssumption } from '../src/contexts/DataAssumptionsContext';
import type { InvestmentProfileData } from '../src/contexts/InvestmentProfileContext';

// ─────────────────────────────────────────────────────────────────────────────
// Anu's model — inferred rules (fixture.derivedNotTranscribed)
// ─────────────────────────────────────────────────────────────────────────────

/** Her implied effective annual rate: 6.00% nominal compounded daily. */
const ANU_EFFECTIVE_RATE = Math.pow(1 + 0.06 / 365, 365) - 1; // 6.18313%
/** Best-fit engine curve for her 10/10/7/7... (see header). */
const ANU_FIT_CURVE = {
  year1: 10,
  years2to3: (Math.sqrt(1.10 * 1.07) - 1) * 100, // 8.48963
  year4: 7,
  year5plus: 7,
};
const ANU_YEARS = 19; // Year 0..18
/** Her Summary Year 0 = this calendar year in our engine run. */
const ANU_YEAR0_CALENDAR = 2026;

interface AnuRow {
  value: number;
  equity: number;
  rent: number;
  interest: number;
  opex: number;
  cashflow: number;
}

/** Hand-compute her sheet from the inferred rules — engine NOT involved. */
function anuReplica(): AnuRow[] {
  const props = fixture.properties.map(p => ({
    firstYear: p.summaryYearIndexFirstOwned,
    value: p.propertyValue,
    loan: p.loanAmount,
    annualRent: p.weeklyRent * 52,
    flatOpex: p.insuranceAnnual + p.ratesAnnual + p.otherExpensesAnnual,
    interest: p.loanAmount * ANU_EFFECTIVE_RATE,
  }));
  const growthTo = (ownYears: number) => {
    let v = 1;
    for (let y = 1; y <= ownYears; y++) v *= y <= 2 ? 1.10 : 1.07;
    return v;
  };
  const rows: AnuRow[] = [];
  for (let Y = 0; Y < ANU_YEARS; Y++) {
    let value = 0, debt = 0, rent = 0, interest = 0, opex = 0;
    for (const p of props) {
      if (Y < p.firstYear) continue;
      const own = Y - p.firstYear;
      value += p.value * growthTo(own);
      debt += p.loan;
      interest += p.interest;
      const gr = p.annualRent * Math.pow(1.05, own);
      rent += gr;
      opex += gr * 0.07 + p.flatOpex * Math.pow(1.03, own);
    }
    rows.push({ value, equity: value - debt, rent, interest, opex, cashflow: rent - opex - interest });
  }
  return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// Headless env — same construction as run-gameplans-comparison.ts, except the
// growth curve returned by getPropertyData is the Anu best-fit custom curve
// (equivalent to a BA editing growth rates on the Data Assumptions page).
// Instances in variants A/B carry growthAssumption: undefined so the engine
// reads this curve; variant C sets growthAssumption 'High' which bypasses it.
// ─────────────────────────────────────────────────────────────────────────────

interface Template extends PropertyInstanceDetails {
  propertyType: string;
  cellId: string;
}

const templates: Template[] = CELL_IDS.map(cellId => ({
  ...(propertyDefaults as Record<string, PropertyInstanceDetails>)[cellId],
  propertyType: getCellDisplayLabel(cellId),
  cellId,
}));

const propertyTypes: PropertyType[] = templates.map(t => {
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
  _growthAssumptionOverride?: string,
): PropertyAssumption | undefined => {
  const template = templates.find(
    t => t.cellId === propertyType || t.propertyType === propertyType,
  );
  if (!template) return undefined;
  return {
    type: template.propertyType,
    averageCost: template.purchasePrice.toString(),
    yield: calcGrossYield(template.rentPerWeek, template.purchasePrice).toFixed(1),
    // Anu best-fit custom curve (documented in file header + fixture)
    growthYear1: ANU_FIT_CURVE.year1.toString(),
    growthYears2to3: ANU_FIT_CURVE.years2to3.toString(),
    growthYear4: ANU_FIT_CURVE.year4.toString(),
    growthYear5plus: ANU_FIT_CURVE.year5plus.toString(),
    deposit: (100 - template.lvr).toString(),
    loanType: template.loanProduct,
    ...template,
  } as PropertyAssumption;
};

const env: ScenarioEnv = { propertyTypes, getPropertyData };

// ─────────────────────────────────────────────────────────────────────────────
// Scenario builder — every input explicit so defaults can't contaminate
// ─────────────────────────────────────────────────────────────────────────────

const yearToPeriod = (year: number) => (year - BASE_YEAR) * PERIODS_PER_YEAR + 1;
const CELL = 'regional-house-growth'; // carrier cell only — every field overridden

function buildScenario(opts: {
  interestRatePct: number;
  growthAssumption?: 'High' | 'Medium' | 'Low'; // undefined => Anu-fit custom curve
}): ScenarioInput {
  const instances: Record<string, PropertyInstanceDetails> = {};
  const order: string[] = [];

  fixture.properties.forEach((p, i) => {
    const id = `${CELL}_instance_${i}`;
    order.push(id);
    instances[id] = {
      // Section A
      state: p.state,
      purchasePrice: p.propertyValue,
      valuationAtPurchase: p.propertyValue,
      rentPerWeek: p.weeklyRent,
      growthAssumption: opts.growthAssumption as PropertyInstanceDetails['growthAssumption'],
      // Section B
      lvr: 80,
      lmiWaiver: false,
      lmiCapitalized: false,
      loanProduct: 'IO',
      interestRate: opts.interestRatePct,
      loanTerm: 30,
      ioTermYears: 30, // stay IO for the whole horizon (portfolio lines are IO-flat regardless — documented)
      // Section D — her sheet: BA fee 19,500 + legals 2,500 + stamp duty only
      engagementFee: p.buyersAgentFee,
      conditionalHoldingDeposit: 0,
      buildingInsuranceUpfront: 0,
      buildingPestInspection: 0,
      plumbingElectricalInspections: 0,
      independentValuation: 0,
      mortgageFees: 0,
      conveyancing: p.legalFeesAndOtherCharges,
      maintenanceAllowancePostSettlement: 0,
      stampDutyOverride: p.stampDuty, // her figure; our calculator compared separately
      // Section E — her cashflow block
      propertyManagementPercent: p.managementFeePct,
      buildingInsuranceAnnual: p.insuranceAnnual,
      councilRatesWater: p.ratesAnnual,
      strata: 0,
      maintenanceAllowanceAnnual: p.otherExpensesAnnual, // her "Other Expenses" (breakdown unknown)
      landTaxOverride: 0,
      vacancyRate: 0, // her sheet has no vacancy row
      // Section F
      isManuallyPlaced: true,
      manualPlacementPeriod: yearToPeriod(ANU_YEAR0_CALENDAR + p.summaryYearIndexFirstOwned),
      isNewBuild: false, // established => post-2026 buys get $0 NG benefit (pre-tax line, like hers)
      entity: 'individual',
      saleYear: null,
      mode: 'Growth',
    } as PropertyInstanceDetails;
  });

  const profile: Partial<InvestmentProfileData> = {
    // Funding — generous so manual placements are never starved (this harness
    // measures the projection, not deposit/BC gating)
    depositPool: 900000,
    annualSavings: 60000,
    baseSalary: 350000,
    borrowingCapacity: 5000000,
    portfolioValue: 0,
    currentDebt: 0,
    useExistingEquity: true,
    maxPurchasesPerYear: 3,
    timelineYears: 20, // 2025..2044 — covers her Year 0..18 (2026..2044)
    // Dials — set to HER sheet's implied behaviour
    interestRate: opts.interestRatePct / 100,
    vacancyRate: 0,
    rentEscalationRate: 0.05,
    inflationRate: 0.03,
    wageGrowthRate: 0.025,
    existingPortfolioGrowthRate: 0.05, // unused (no existing properties)
    growthCurve: ANU_FIT_CURVE, // fallback only; instances resolve via getPropertyData/tier
    marginalTaxRate: 0.45, // moot: all buys ring-fenced established => NG $0
    sellingCostsPercent: 3, // unused (no sales)
    ioToPiTransitionYears: 5, // unused for planned-portfolio lines
    equityGoal: 0,
    cashflowGoal: 0,
  };

  return {
    propertySelections: { [CELL]: fixture.properties.length },
    propertyOrder: order,
    investmentProfile: profile,
    propertyInstances: instances,
    existingProperties: [],
    eventBlocks: [],
    pauseBlocks: [],
  };
}

/** Pull the six Summary-row series out of an engine run, aligned to her Year 0..18. */
function extractEngineRows(result: ScenarioRunResult): (AnuRow & { reconciles: boolean })[] {
  const rows: (AnuRow & { reconciles: boolean })[] = [];
  for (let Y = 0; Y < ANU_YEARS; Y++) {
    const year = String(ANU_YEAR0_CALENDAR + Y);
    const g = result.projection.portfolioGrowthData.find(d => d.year === year);
    const c = result.projection.cashflowData.find(d => d.year === year);
    if (!g || !c) throw new Error(`engine missing year ${year}`);
    rows.push({
      value: g.portfolioValue,
      equity: g.propertyEquity,
      rent: c.rentalIncome,
      interest: c.loanRepayments,
      opex: c.expenses,
      cashflow: c.cashflow,
      // engine's own identity: cashflow = rent - opex - interest + NG. NG must
      // be 0 here (post-reform established), so the identity must close.
      reconciles: Math.abs(c.cashflow - (c.rentalIncome - c.expenses - c.loanRepayments)) <= 2,
    });
  }
  return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// Printing
// ─────────────────────────────────────────────────────────────────────────────

const f = (n: number) => (n < 0 ? '-' : '') + Math.abs(Math.round(n)).toLocaleString('en-AU');
const pct = (delta: number, base: number) =>
  base === 0 ? '—' : ((delta / Math.abs(base)) * 100).toFixed(2) + '%';
const pad = (s: string, w: number) => s.padStart(w);

function printMetricTable(
  label: string,
  anu: number[],
  engineA: number[],
  engineB: number[],
) {
  console.log(`\n  ── ${label} — Anu vs engine (A: 6.00% simple / Anu-fit growth; B: 6.18313% effective) ──`);
  const header = ['Yr', 'Anu', 'Engine A', 'Δ A', 'Δ A %', 'Engine B', 'Δ B'];
  const widths = [4, 12, 12, 10, 8, 12, 10];
  console.log('  ' + header.map((h, i) => pad(h, widths[i])).join(' '));
  for (let Y = 0; Y < ANU_YEARS; Y++) {
    const dA = engineA[Y] - anu[Y];
    const dB = engineB[Y] - anu[Y];
    console.log(
      '  ' +
        [String(Y), f(anu[Y]), f(engineA[Y]), f(dA), pct(dA, anu[Y]), f(engineB[Y]), f(dB)]
          .map((s, i) => pad(s, widths[i]))
          .join(' '),
    );
  }
  const maxA = Math.max(...anu.map((v, Y) => Math.abs(engineA[Y] - v)));
  const maxB = Math.max(...anu.map((v, Y) => Math.abs(engineB[Y] - v)));
  console.log(`  max |Δ|: A $${f(maxA)}   B $${f(maxB)}`);
}

function crossover(series: number[]): number | null {
  for (let Y = 0; Y < series.length; Y++) if (series[Y] >= 0) return Y;
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

console.log('Anu "Fresh Start — Property Roadmap" × PropPath engine comparison');
console.log(
  `BASE_YEAR=${BASE_YEAR}  her Year 0 => calendar ${ANU_YEAR0_CALENDAR}  ` +
  `DEFAULT_INTEREST_RATE=${(DEFAULT_INTEREST_RATE * 100).toFixed(2)}%  ` +
  `Anu effective rate=${(ANU_EFFECTIVE_RATE * 100).toFixed(5)}%  ` +
  `Anu-fit curve=${ANU_FIT_CURVE.year1}/${ANU_FIT_CURVE.years2to3.toFixed(5)}/${ANU_FIT_CURVE.year4}/${ANU_FIT_CURVE.year5plus}`,
);

// ── 1. Anu replica: validate the inferred rules against every transcribed cell ──
console.log('\n' + '═'.repeat(100));
console.log('1. ANU REPLICA — inferred rules vs her transcribed Summary (max |deviation| per row, 19 years)');
console.log('═'.repeat(100));
const replica = anuReplica();
const T = fixture.portfolioSummaryYear0to18;
const her = {
  value: T.portfolioValue,
  equity: T.equity,
  rent: T.grossRentalIncome,
  interest: T.interestCosts.map(v => -v),
  opex: T.operatingCosts.map(v => -v),
  cashflow: T.cashflowAnnual,
};
(['value', 'equity', 'rent', 'interest', 'opex', 'cashflow'] as const).forEach(k => {
  const maxDev = Math.max(...her[k].map((v, Y) => Math.abs(replica[Y][k] - v)));
  console.log(`  ${k.padEnd(9)} max |replica - transcribed| = $${maxDev.toFixed(2)} ${maxDev < 1 ? '✓' : '✗ RULES DO NOT FIT'}`);
});

// ── 2. Engine runs ──
console.log('\n' + '═'.repeat(100));
console.log('2. ENGINE RUNS (real engine via scenarioRunner — placement + projection)');
console.log('═'.repeat(100));

const runA = runScenario(buildScenario({ interestRatePct: 6.0 }), env);
const runB = runScenario(buildScenario({ interestRatePct: ANU_EFFECTIVE_RATE * 100 }), env);
const runC = runScenario(buildScenario({ interestRatePct: 6.0, growthAssumption: 'High' }), env);

runA.timelineProperties.forEach((tp, i) => {
  const p = fixture.properties[i];
  console.log(
    `  placed: ${p.id} ${p.state} — buy ${Math.floor(tp.affordableYear)} (her Year ${p.summaryYearIndexFirstOwned})` +
    ` | price $${f(tp.cost)} | loan $${f(tp.loanAmount)} (her $${f(p.loanAmount)}) | status ${tp.status}`,
  );
});
console.log(`  allFeasible: ${runA.allFeasible}`);

const engA = extractEngineRows(runA);
const engB = extractEngineRows(runB);
const engC = extractEngineRows(runC);

const badRecon = [...engA, ...engB].filter(r => !r.reconciles).length;
console.log(
  `  engine identity check (cashflow = rent − opex − interest, i.e. NG benefit = 0): ` +
  `${badRecon === 0 ? '✓ all 38 rows' : `✗ ${badRecon} rows FAILED`}`,
);

// ── 3. Year-by-year tables ──
console.log('\n' + '═'.repeat(100));
console.log('3. YEAR-BY-YEAR — her Summary vs our engine (her Year 0 = calendar 2026)');
console.log('═'.repeat(100));

printMetricTable('PORTFOLIO VALUE', her.value, engA.map(r => r.value), engB.map(r => r.value));
printMetricTable('EQUITY', her.equity, engA.map(r => r.equity), engB.map(r => r.equity));
printMetricTable('GROSS RENTAL INCOME', her.rent, engA.map(r => r.rent), engB.map(r => r.rent));
printMetricTable('INTEREST COSTS', her.interest, engA.map(r => r.interest), engB.map(r => r.interest));
printMetricTable('OPERATING COSTS', her.opex, engA.map(r => r.opex), engB.map(r => r.opex));
printMetricTable('NET CASHFLOW (ANNUAL)', her.cashflow, engA.map(r => r.cashflow), engB.map(r => r.cashflow));

// ── 4. Crossover ──
console.log('\n' + '═'.repeat(100));
console.log('4. CASHFLOW-POSITIVE CROSSOVER');
console.log('═'.repeat(100));
const xHer = crossover(her.cashflow);
const xA = crossover(engA.map(r => r.cashflow));
const xB = crossover(engB.map(r => r.cashflow));
console.log(`  Anu sheet:            Year ${xHer} (transcribed: Year ${T.cashflowPositiveCrossoverYearIndex}, $${f(her.cashflow[xHer!])})`);
console.log(`  Engine A (6.00%):     Year ${xA} ($${f(engA[xA!].cashflow)})  — calendar ${ANU_YEAR0_CALENDAR + xA!}`);
console.log(`  Engine B (6.18313%):  Year ${xB} ($${f(engB[xB!].cashflow)})  — calendar ${ANU_YEAR0_CALENDAR + xB!}`);

// ── 5. Out-of-box growth tier (variant C) — value line only ──
console.log('\n' + '═'.repeat(100));
console.log('5. BUILT-IN GROWTH TIER CHECK — variant C: growthAssumption High (12.5/10/7.5/6), no custom curve');
console.log('═'.repeat(100));
console.log('  What a BA gets from the nearest built-in tier instead of customised assumptions:');
const header5 = ['Yr', 'Anu value', 'High tier', 'Δ', 'Δ %'];
const w5 = [4, 13, 13, 12, 8];
console.log('  ' + header5.map((h, i) => pad(h, w5[i])).join(' '));
for (const Y of [0, 1, 2, 3, 5, 8, 12, 18]) {
  const d = engC[Y].value - her.value[Y];
  console.log('  ' + [String(Y), f(her.value[Y]), f(engC[Y].value), f(d), pct(d, her.value[Y])].map((s, i) => pad(s, w5[i])).join(' '));
}

// ── 6. Per-property purchase costing (incl. our stamp duty vs hers) ──
console.log('\n' + '═'.repeat(100));
console.log('6. PER-PROPERTY PURCHASE COSTING — her Purchases sheet vs our calculators');
console.log('═'.repeat(100));
const header6 = ['', 'Anu', 'PropPath', 'Δ'];
const w6 = [34, 12, 12, 10];
fixture.properties.forEach(p => {
  const ourDuty = calculateStampDuty(p.state, p.propertyValue);
  const ourDeposit = p.propertyValue * 0.2;
  const ourLoan = p.propertyValue * 0.8;
  console.log(`  ${p.id} — ${p.state} $${f(p.propertyValue)} (bought her Year ${p.summaryYearIndexFirstOwned}):`);
  const rows: [string, number, number][] = [
    ['stamp duty (our calculator)', p.stampDuty, ourDuty],
    ['deposit @ 20%', p.depositAmount, ourDeposit],
    ['loan @ 80% LVR', p.loanAmount, ourLoan],
    ['LMI', p.lendersMortgageInsurance, 0],
    ['interest yr-1 (6.00% convention)', p.annualInterestCosts, ourLoan * 0.06],
    ['net cashflow yr-1', p.annualNetCashflow,
      p.weeklyRent * 52 - (p.weeklyRent * 52 * 0.07 + p.insuranceAnnual + p.ratesAnnual + p.otherExpensesAnnual) - ourLoan * 0.06],
  ];
  console.log('  ' + header6.map((h, i) => i === 0 ? h.padEnd(w6[0]) : pad(h, w6[i])).join(' '));
  rows.forEach(([label, hers, ours]) =>
    console.log('  ' + label.padEnd(w6[0]) + pad(f(hers), w6[1]) + ' ' + pad(f(ours), w6[2]) + ' ' + pad(f(ours - hers), w6[3])),
  );
});

console.log('\nDone. Findings written up in accuracy-testing/anu-comparison.md');
