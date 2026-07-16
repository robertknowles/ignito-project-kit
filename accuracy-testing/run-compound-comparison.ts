#!/usr/bin/env npx vite-node
/**
 * Compound (Ben & Adam) 10-year comparison harness — Task 7 of the accuracy
 * benchmarking program. Measurement only: no app code changes.
 *
 * Runs the REAL engine (src/engine/scenarioRunner → timelineEngine +
 * projectionEngine) headlessly on the single-property deal transcribed in
 * accuracy-testing/external-sources/benadam-compound-transcription.md
 * (5/804 Warrigal Road, Malvern East VIC — $315k buy, $380k valuation,
 * 88% LVR IO 6.04%, LMI capitalised) and compares our full 10-year
 * value/loan/equity/income/expense/net-cashflow lines against their
 * projection table (fixtures/compound-calculator.json).
 *
 * RUN WITH VITE-NODE (not tsx): timelineEngine reads import.meta.env.DEV.
 *
 *   npx vite-node accuracy-testing/run-compound-comparison.ts
 *
 * Row alignment convention (documented, not fudged):
 *   Compound's "Year N" row mixes END-of-year-N balance-sheet columns
 *   (value/loan/equity after N years of growth) with DURING-year-N flow
 *   columns (income at rent-escalation^(N-1)). Our engine's yearRow at
 *   yearsOwned=k carries the value after k years of growth alongside flows
 *   at escalation^k. So their Year N is compared against:
 *     - our value/loan/equity at yearsOwned = N        (end of year N)
 *     - our income/expense flows at yearsOwned = N - 1 (during year N)
 *   Year-1 flows (escalation^0) come from projection.cashflowData[0]
 *   because yearRows only start at yearsOwned = 1.
 *
 * Two growth treatments, per the task brief:
 *   (A) Engine run with growthAssumption 'High' (our nearest tier:
 *       12.5 / 10 / 10 / 7.5 / 6…6) — documents the raw curve mismatch.
 *   (B) Their exact per-year curve (12/10/8/5/5, then 5% flat) applied to
 *       the same $380k basis using the engine's own semi-annual compounding
 *       mechanics (annualRateToPeriodRate, 2 periods/yr) — isolates whether
 *       our value/equity MECHANICS track theirs once the curve is
 *       normalised out (value − loan = equity check).
 */

import {
  runScenario,
  type ScenarioInput,
  type ScenarioEnv,
} from '../src/engine/scenarioRunner';
import { calculateDetailedCashflow } from '../src/utils/detailedCashflowCalculator';
import { calculateStampDuty } from '../src/utils/stampDutyCalculator';
import { calculateLMI } from '../src/utils/lmiCalculator';
import { calculateOneOffCosts, calculateDepositBalance } from '../src/utils/oneOffCostsCalculator';
import {
  BASE_YEAR,
  PERIODS_PER_YEAR,
  GROWTH_RATE_TIERS,
  annualRateToPeriodRate,
} from '../src/constants/financialParams';
import { CELL_IDS, getCategoryLabel, getCellDisplayLabel } from '../src/utils/propertyCells';
import { calcGrossYield } from '../src/utils/sharedFinancialCalcs';
import propertyDefaults from '../src/data/property-defaults.json';
import fixture from './fixtures/compound-calculator.json';
import type { PropertyInstanceDetails } from '../src/types/propertyInstance';
import type { PropertyType } from '../src/contexts/PropertySelectionContext';
import type { PropertyAssumption } from '../src/contexts/DataAssumptionsContext';
import type { InvestmentProfileData } from '../src/contexts/InvestmentProfileContext';

// ─────────────────────────────────────────────────────────────────────────────
// Headless env (same assembly as run-gameplans-comparison.ts — input assembly
// is the caller's contract; all MATH runs in the real engine)
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
// The Compound deal — EVERY instance + profile input set explicitly so cell /
// platform defaults cannot contaminate the comparison.
// ─────────────────────────────────────────────────────────────────────────────

const CELL_ID = 'regional-house-cashflow'; // carrier cell only — every field overridden below
const INSTANCE_ID = `${CELL_ID}_instance_0`;

const compoundInstance: PropertyInstanceDetails = {
  // Section A — overview
  state: 'VIC',
  purchasePrice: 315000,
  valuationAtPurchase: 380000, // buy-under-market: $65k day-one uplift
  valuationAtPurchaseManual: true,
  rentPerWeek: 450,
  growthAssumption: 'High',
  // Section B — contract & loan
  lvr: 88,
  lmiWaiver: false,
  loanProduct: 'IO',
  interestRate: 6.04, // ≠ platform default 5.5 → counts as a per-property override
  loanTerm: 30,
  ioTermYears: 30, // loanTerm − ioTermYears = 0 P&I years → loan stays flat all 10 years (their no-reversion treatment)
  lmiCapitalized: true, // their $5,544 LMI rides in the loan: carried loan $282,744
  // Section D — one-off purchase costs (their PURCHASE block, verbatim)
  engagementFee: 10000,
  conditionalHoldingDeposit: 10000,
  buildingInsuranceUpfront: 1401.64,
  buildingPestInspection: 600,
  plumbingElectricalInspections: 0,
  independentValuation: 0,
  mortgageFees: 1000,
  conveyancing: 2200,
  maintenanceAllowancePostSettlement: 0,
  stampDutyOverride: 13970, // their estimate — our VIC calc for $315k is printed alongside
  // Section E — cashflow (their HOLD block, verbatim)
  propertyManagementPercent: 6.6,
  buildingInsuranceAnnual: 350,
  councilRatesWater: 2000,
  strata: 2700,
  maintenanceAllowanceAnnual: 0,
  landTaxOverride: 975,
  vacancyRate: 0, // their sheet: 0/52 weeks
  // Section F — placement & flags
  isManuallyPlaced: true,
  manualPlacementPeriod: 1, // BASE_YEAR H1
  hasBeenAmended: false,
  alertDismissed: false,
  mode: 'Cashflow',
  saleYear: null,
  entity: 'individual',
  isNewBuild: false,
  // Display overrides — all explicitly OFF
  yieldOverride: null,
  holdingCostOverride: null,
  purchaseCostsOverride: null,
  loanAmountOverride: null,
  depositOverride: null,
  lmiOverride: null,
  totalCashRequiredOverride: null,
  grossAnnualIncomeOverride: null,
  adjustedIncomeOverride: null,
  loanInterestOverride: null,
  totalExpensesOverride: null,
  netAnnualCashflowOverride: null,
  netMonthlyCashflowOverride: null,
  netWeeklyCashflowOverride: null,
  fundingCashOverride: null,
  fundingSavingsOverride: null,
  fundingEquityOverride: null,
  fundingTotalOverride: null,
};

const profile: Partial<InvestmentProfileData> = {
  // Generous funding so placement gating can't contaminate (harness measures projection, not gating)
  depositPool: 600000,
  annualSavings: 42000,
  baseSalary: 250000,
  borrowingCapacity: 4000000,
  portfolioValue: 0,
  currentDebt: 0,
  useExistingEquity: false,
  timelineYears: 15,
  maxPurchasesPerYear: 3,
  // Assumption dials — explicit, mapped to Compound's
  interestRate: 0.0604, // belt-and-braces alongside the instance rate
  vacancyRate: 0, // theirs: 0 weeks
  inflationRate: 0.03, // their expense escalation 3%/yr
  rentEscalationRate: 0.04, // ours is a SINGLE rate; theirs steps 4%→3% after year 5 (hybrid line computed below)
  wageGrowthRate: 0.025,
  existingPortfolioGrowthRate: 0.05,
  marginalTaxRate: 0.45,
  sellingCostsPercent: 3,
};

const scenario: ScenarioInput = {
  propertySelections: { [CELL_ID]: 1 },
  propertyOrder: [INSTANCE_ID],
  investmentProfile: profile,
  propertyInstances: { [INSTANCE_ID]: compoundInstance },
  existingProperties: [],
  eventBlocks: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Their model, recomputed from its own rules (validates the transcription AND
// gives exact expected lines for divergence decomposition)
// ─────────────────────────────────────────────────────────────────────────────

const THEIR = fixture.tenYearTable.rows;
const THEIR_CURVE = fixture.priceGrowthCurveByYearPct as number[]; // 12/10/8/5/5,5…
const OUR_HIGH = GROWTH_RATE_TIERS.High;

/** Our High tier expressed per-year (period mapping: p1-2=y1, p3-6=y2to3, p7-8=y4, p9+=y5plus). */
const ourHighYearRate = (yearN: number): number => {
  if (yearN === 1) return OUR_HIGH.year1;
  if (yearN <= 3) return OUR_HIGH.years2to3;
  if (yearN === 4) return OUR_HIGH.year4;
  return OUR_HIGH.year5plus;
};

/** Value line using the ENGINE'S semi-annual compounding mechanics on an arbitrary per-year curve. */
function valueLineWithEngineMechanics(basis: number, ratesPct: number[]): number[] {
  const out: number[] = [];
  let v = basis;
  for (const r of ratesPct) {
    const pr = annualRateToPeriodRate(r / 100);
    for (let p = 0; p < PERIODS_PER_YEAR; p++) v *= 1 + pr;
    out.push(v);
  }
  return out;
}

// Their flow rules: interest flat 16,983.40 (their quirk — 6.04% on ~$281,182,
// not on the carried $282,744); the ENTIRE non-interest bucket (incl. PM and
// land tax) inflated at 3%/yr from the Y1 total; rent +4%/yr for the first five
// increments then +3%.
const THEIR_INTEREST = 16983.4;
const THEIR_Y1_OP_BUCKET = 23400 * 0.066 + 350 + 2000 + 2700 + 0 + 975; // 7,569.40
function theirModel(yearN: number) {
  const k = yearN - 1;
  const rent4Steps = Math.min(k, 5);
  const rent3Steps = Math.max(0, k - 5);
  const income = 23400 * Math.pow(1.04, rent4Steps) * Math.pow(1.03, rent3Steps);
  const deductions = THEIR_INTEREST + THEIR_Y1_OP_BUCKET * Math.pow(1.03, k);
  return { income, deductions, net: income - deductions };
}

// Our flow rules, restated analytically for the decomposition (reconciled
// against the engine's own yearRows below — the ✓/✗ column):
//   income_k = 23,400 × 1.04^k          (single rentEscalationRate)
//   interest = 282,744 × 6.04% flat     (IO, no reversion, on the CARRIED loan)
//   PM_k     = 6.6% × income_k          (tracks rent — 4%/yr)
//   opex_k   = (350+2,000+2,700+0) × 1.03^k
//   landTax_k= 975 × 1.03^k
const OUR_LOAN = 277200 + 5544; // 282,744
const OUR_INTEREST = OUR_LOAN * 0.0604; // 17,077.74
function ourModel(k: number) {
  const income = 23400 * Math.pow(1.04, k);
  const pm = income * 0.066;
  const opex = (350 + 2000 + 2700 + 0) * Math.pow(1.03, k);
  const landTax = 975 * Math.pow(1.03, k);
  const deductions = OUR_INTEREST + pm + opex + landTax;
  return { income, pm, opex, landTax, deductions, net: income - deductions };
}

// ─────────────────────────────────────────────────────────────────────────────
// Run + print
// ─────────────────────────────────────────────────────────────────────────────

const f = (n: number) => (n < 0 ? '-' : '') + Math.abs(Math.round(n)).toLocaleString('en-AU');
const fd = (n: number) => (n >= 0 ? '+' : '-') + Math.abs(Math.round(n)).toLocaleString('en-AU');
const pad = (s: string, w: number) => s.padStart(w);

console.log('Compound (Ben & Adam) × PropPath — 10-year single-property comparison');
console.log(`BASE_YEAR=${BASE_YEAR}  |  deal: $315k buy / $380k val, 88% LVR IO 6.04%, LMI capitalised, rent $450/wk`);

const result = runScenario(scenario, env);
const tp = result.timelineProperties[0];
if (!tp || tp.period === Infinity) {
  console.error('FATAL: property did not place — funding profile insufficient?');
  process.exit(1);
}
console.log(
  `\nplaced: ${tp.title} — buy ${Math.floor(tp.affordableYear)} | price $${f(tp.cost)} | loan $${f(tp.loanAmount)} | status ${tp.status}`,
);

// ── Upfront cash block ──────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(96));
console.log('UPFRONT CASH — THE PURCHASE block vs our timeline engine');
console.log('═'.repeat(96));

const ourStampDutyCalc = calculateStampDuty('VIC', 315000, false);
const ourLmiCalc = calculateLMI(315000 * 0.88, 88, false, 380000, 315000);
const depBal = calculateDepositBalance(315000, 88, 10000);
const oneOff = calculateOneOffCosts(compoundInstance, 13970, depBal);

const upfrontRows: Array<[string, number | string, number | string]> = [
  ['Engagement fee', 10000, oneOff.engagementFee],
  ['Holding deposit (conditional)', 10000, oneOff.conditionalHoldingDeposit],
  ['Building & landlord insurance at exchange', 1401.64, oneOff.buildingInsuranceUpfront],
  ['Building & pest inspection', 600, oneOff.buildingPestInspection],
  ['Plumbing/electrical + independent valuation', 0, oneOff.plumbingElectricalInspections + oneOff.independentValuation],
  ['Deposit balance at settlement', 27800, oneOff.depositBalance],
  ['Stamp duty', 13970, oneOff.stampDuty],
  ['Mortgage fees & discharge', 1000, oneOff.mortgageFees],
  ['Conveyancing', 2200, oneOff.conveyancing],
  ['Post-settlement maintenance buffer', 0, oneOff.maintenanceAllowancePostSettlement],
  ['LMI in cash (capitalised → $0 cash)', 0, tp.acquisitionCosts && compoundInstance.lmiCapitalized ? 0 : ourLmiCalc],
  ['TOTAL CASH REQUIRED', 66972, tp.totalCashRequired ?? oneOff.totalCashRequired],
];
console.log('  ' + 'Line'.padEnd(48) + pad('Compound', 12) + pad('PropPath', 12) + pad('Δ', 10));
upfrontRows.forEach(([label, theirs, ours]) => {
  const t = Number(theirs);
  const o = Number(ours);
  console.log('  ' + String(label).padEnd(48) + pad(f(t), 12) + pad(f(o), 12) + pad(Math.abs(o - t) < 1 ? '=' : fd(o - t), 10));
});
console.log('\n  Cross-checks:');
console.log(`    our VIC stamp-duty calculator @ $315,000 (no override): $${f(ourStampDutyCalc)}  (their estimate: $13,970)`);
console.log(`    our LMI (88% LVR band, val $380k > price → security = $315k): $${f(ourLmiCalc)}  (their LMI tab 0.88–0.90 → 2%: $5,544)`);
console.log(`    our carried loan (base $277,200 + capitalised LMI): $${f(tp.loanAmount)}  (theirs: $282,744)`);
console.log(`    engine stage subtotals — engagement $${f(oneOff.engagementTotal)} | exchange $${f(oneOff.exchangeTotal)} | settlement $${f(oneOff.settlementTotal)} | post $${f(oneOff.postSettlementTotal)}`);
console.log(`    (theirs: $10,000 | $12,002 | $44,970 | $0)`);
console.log(`    tp.acquisitionCosts.total (adds LMI back even when capitalised — display field): $${f(tp.acquisitionCosts?.total ?? 0)}`);

// ── Day-one equity ──────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(96));
console.log('DAY-ONE EQUITY — does the engine honour valuationAtPurchase?');
console.log('═'.repeat(96));
const proj = result.projection.propertyProjections.get(INSTANCE_ID);
if (!proj) {
  console.error('FATAL: no per-property projection for the instance');
  process.exit(1);
}
const growthBasisCheck = proj.yearRows[0]
  ? proj.yearRows[0].propertyValue / Math.pow(1 + ourHighYearRate(1) / 100, 1)
  : NaN;
console.log(`  their at-purchase row: value $380,000 | loan $282,744 | equity $97,256`);
console.log(`  our growth basis (year-1 value ÷ (1 + our year-1 rate)): $${f(growthBasisCheck)}  → ${Math.abs(growthBasisCheck - 380000) < 2 ? 'HONOURS $380k valuation ✓' : 'DOES NOT honour valuation ✗'}`);
console.log(`  our day-one equity (basis − carried loan): $${f(growthBasisCheck - tp.loanAmount)}  (theirs $97,256)`);

// ── 10-year table ───────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(96));
console.log('10-YEAR PROJECTION — their table vs engine (alignment: values end-of-year-N; flows during year N)');
console.log('═'.repeat(96));

// Engine lines
const cf0 = result.projection.cashflowData.find((d) => d.year === String(BASE_YEAR))!;
const engineFlows = (k: number) => {
  if (k === 0) {
    return {
      income: cf0.rentalIncome,
      deductions: cf0.expenses + cf0.loanRepayments,
      net: cf0.rentalIncome - cf0.expenses - cf0.loanRepayments,
    };
  }
  const row = proj.yearRows[k - 1]; // yearsOwned = k
  return {
    income: row.grossIncome,
    deductions: row.operatingExpenses + row.interestExpense,
    net: row.netCashflow,
  };
};
const engineBalance = (N: number) => proj.yearRows[N - 1]; // yearsOwned = N

// Normalised value line: their curve through OUR compounding mechanics
const valueTheirCurveOurMech = valueLineWithEngineMechanics(380000, THEIR_CURVE);

console.log('\nA) VALUE / LOAN / EQUITY (their Year N vs our yearsOwned=N; High tier = our nearest curve)');
const hA = ['Yr', 'TheirVal', 'OursVal(High)', 'ΔVal', 'TheirLoan', 'OursLoan', 'TheirEq', 'OursEq', 'ΔEq'];
const wA = [3, 10, 14, 10, 10, 9, 9, 9, 10];
console.log('  ' + hA.map((h, i) => pad(h, wA[i])).join(' '));
THEIR.forEach((t) => {
  const b = engineBalance(t.year);
  console.log('  ' + [
    String(t.year), f(t.propertyValue), f(b.propertyValue), fd(b.propertyValue - t.propertyValue),
    f(t.loan), f(b.loanBalance), f(t.equity), f(b.equity), fd(b.equity - t.equity),
  ].map((s, i) => pad(s, wA[i])).join(' '));
});
console.log(`  our High tier per year: ${[1,2,3,4,5,6,7,8,9,10].map(ourHighYearRate).join('/')}%  vs their curve ${THEIR_CURVE.join('/')}%`);

console.log('\nB) GROWTH-CURVE-NORMALISED — their exact curve through our semi-annual mechanics; equity = value − our loan');
const hB = ['Yr', 'TheirVal', 'OursMech', 'ΔVal', 'NormEquity', 'TheirEq', 'ΔEq'];
const wB = [3, 10, 10, 7, 11, 9, 7];
console.log('  ' + hB.map((h, i) => pad(h, wB[i])).join(' '));
let maxNormValDiff = 0;
let maxNormEqDiff = 0;
THEIR.forEach((t, i) => {
  const v = valueTheirCurveOurMech[i];
  const loan = engineBalance(t.year).loanBalance;
  const eq = v - loan;
  maxNormValDiff = Math.max(maxNormValDiff, Math.abs(v - t.propertyValue));
  maxNormEqDiff = Math.max(maxNormEqDiff, Math.abs(eq - t.equity));
  console.log('  ' + [
    String(t.year), f(t.propertyValue), f(v), fd(v - t.propertyValue), f(eq), f(t.equity), fd(eq - t.equity),
  ].map((s, i2) => pad(s, wB[i2])).join(' '));
});
console.log(`  max |Δvalue| = $${f(maxNormValDiff)}   max |Δequity| = $${f(maxNormEqDiff)}   (≤ $2 ⇒ mechanics identical once curve normalised)`);

console.log('\nC) CASHFLOW — their Year N flows vs our flows at yearsOwned = N−1 (pre-tax; our displayed line adds NG benefit separately)');
const hC = ['Yr', 'TheirInc', 'OursInc', 'ΔInc', 'TheirDed', 'OursDed', 'ΔDed', 'TheirNet', 'OursNet', 'ΔNet', 'Engine✓'];
const wC = [3, 9, 9, 7, 9, 9, 7, 9, 9, 8, 8];
console.log('  ' + hC.map((h, i) => pad(h, wC[i])).join(' '));
let cumOurs = 0;
THEIR.forEach((t) => {
  const k = t.year - 1;
  const e = engineFlows(k);
  const a = ourModel(k); // analytic restatement — reconciliation check
  const reconciles = Math.abs(e.net - a.net) <= 2 && Math.abs(e.income - a.income) <= 2;
  cumOurs += e.net;
  console.log('  ' + [
    String(t.year), f(t.grossIncome), f(e.income), fd(e.income - t.grossIncome),
    f(t.cashDeductions), f(e.deductions), fd(e.deductions - t.cashDeductions),
    f(t.netCashflow), f(e.net), fd(e.net - t.netCashflow), reconciles ? '✓' : '✗',
  ].map((s, i) => pad(s, wC[i])).join(' '));
});
const theirCum = THEIR[THEIR.length - 1].netCashflowCumulative;
console.log(`  10-year cumulative net cashflow: theirs $${f(theirCum)} | ours $${f(cumOurs)} | Δ ${fd(cumOurs - theirCum)}`);

// ── Divergence decomposition ────────────────────────────────────────────────
console.log('\nD) NET-CASHFLOW DIVERGENCE DECOMPOSED (ours − theirs, per their year)');
console.log('   ΔInterest: ours 6.04% × carried $282,744 = $17,077.74 vs their flat $16,983.40 (their quirk: rate on ~$281,182)');
console.log('   ΔPM: ours tracks rent (6.6% × income, +4%/yr) vs theirs inflated at 3%/yr with the expense bucket (their quirk)');
console.log('   ΔRent: our single 4% escalation vs their 4%→3% step after year 5 (our single-dial gap)');
const hD = ['Yr', 'ΔNet', '=ΔInterest', '+ΔPM', '+ΔRentStep', '+resid'];
const wD = [3, 8, 11, 9, 11, 8];
console.log('  ' + hD.map((h, i) => pad(h, wD[i])).join(' '));
THEIR.forEach((t) => {
  const k = t.year - 1;
  const ours = ourModel(k);
  const theirs = theirModel(t.year);
  const dNet = ours.net - theirs.net;
  const dInterest = -(OUR_INTEREST - THEIR_INTEREST); // effect on NET (higher interest → lower net)
  const theirPmProxy = 1544.4 * Math.pow(1.03, k);
  const dPm = -(ours.pm - theirPmProxy);
  const dRent = (ours.income - theirs.income) * (1 - 0.066); // extra rent net of our PM take
  const resid = dNet - dInterest - dPm - dRent;
  console.log('  ' + [
    String(t.year), fd(dNet), fd(dInterest), fd(dPm), fd(dRent), fd(resid),
  ].map((s, i) => pad(s, wD[i])).join(' '));
});

// Hybrid expected income line (our engine if it COULD take the 4→3 step)
console.log('\nE) HYBRID RENT LINE — what our income line would be with their 4%→3% step (their-step − our-flat-4%)');
THEIR.forEach((t) => {
  const k = t.year - 1;
  const stepIncome = theirModel(t.year).income;
  const flatIncome = 23400 * Math.pow(1.04, k);
  if (Math.abs(stepIncome - flatIncome) > 1) {
    console.log(`    year ${t.year}: step $${f(stepIncome)} vs flat $${f(flatIncome)}  (ours overshoots by $${f(flatIncome - stepIncome)})`);
  }
});

// Transcription-model self-check (validates my reading of their sheet rules)
console.log('\nF) SELF-CHECK — their table recomputed from their own rules (flags transcription/rounding drift)');
let maxSelf = 0;
THEIR.forEach((t) => {
  const m = theirModel(t.year);
  const d = Math.abs(m.net - t.netCashflow);
  maxSelf = Math.max(maxSelf, d);
  if (d > 20) {
    console.log(`    year ${t.year}: recomputed $${f(m.net)} vs table $${f(t.netCashflow)} (Δ $${f(d)}) — matches the sheet's own Y10 interest-cell anomaly ($16,889 vs flat $16,983)`);
  }
});
console.log(`    max |recomputed − table| on net cashflow: $${f(maxSelf)} — years 1-9 within sheet rounding; the Y10 residual is THEIR anomaly, not replicated`);
console.log('    (this is also why section D shows ΔNet +985 at year 10 while section C shows +890: D compares against their FLAT-interest rule, C against their table cell)');

// Metrics they show
console.log('\nG) THEIR RICH METRICS vs engine coverage (PerPropertyYearRow / PerPropertyProjection)');
console.log(`    capital growth cumulative Y10: theirs $331,448 | ours(High) $${f(engineBalance(10).capitalGrowthCumulative)}`);
console.log(`    cash-on-cash cumulative Y10: theirs 31.9% | ours ${engineBalance(10).cocReturnCumulative.toFixed(1)}% (engine computes; cash base + curve differ)`);
console.log(`    ROIC Y10: theirs 526.8% | ours ${engineBalance(10).roic.toFixed(1)}%`);
console.log(`    capital returned in: theirs 2 years | ours ${proj.capitalReturnedInYears} year(s) — ours counts the $65k day-one buy-under-market uplift as year-1 capital growth (prevValue starts at COST $315k, not valuation $380k); theirs measures growth from the $380k valuation`);
console.log(`    gross yield: theirs 7.4%→10.2% is rent ÷ PURCHASE PRICE (rises with rent); ours Y1 ${engineBalance(1).grossYieldPct.toFixed(1)}% → Y10 ${engineBalance(10).grossYieldPct.toFixed(1)}% is rent ÷ CURRENT VALUE (falls as value compounds) — definitional difference, not an error`);
console.log(`    $/week line: theirs per-year; ours netWeeklyCashflow exists in CashflowBreakdown (year-1 only), no per-year $/wk row`);

console.log('\nDone. See accuracy-testing/compound-comparison.md for the written report.');
