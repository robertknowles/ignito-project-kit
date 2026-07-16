#!/usr/bin/env npx vite-node
/**
 * Ella Spreadsheet Comparison Harness (Task 4 — measurement only, no app code changes)
 *
 * Compares the REAL PropPath engine (src/engine/scenarioRunner → timelineEngine +
 * projectionEngine) against Ella's Excel "Cashflow Calculator", tab
 * "11 Emma Ct Driver" (Darwin NT, $650k house), transcribed in
 * accuracy-testing/external-sources/ella-transcription.md and frozen in
 * accuracy-testing/fixtures/ella-spreadsheet.json.
 *
 * Three legs (her sheet shows P&I and IO side by side):
 *   IO @ 6.29% · IO @ 6.39% · P&I @ 6.29%
 * Each leg is compared twice, because her sheet carries the management fee two
 * ways: $2,974 (true 8.8% of $33,800) in the mid block, but $1,859 (= exactly
 * 5.5% of $33,800) inside the Annual Total. We NEVER silently pick one.
 *
 * Placement: manual, period 3 (2027 H1 at BASE_YEAR 2026). Deliberate — an ESTABLISHED property
 * bought >= NG_REFORM_YEAR (2026) is ring-fenced, so the engine's after-tax
 * cashflow line equals its PRE-TAX line, which is the only basis Ella's sheet
 * has. The runner asserts ngBenefit === 0.
 *
 * Every input is set EXPLICITLY on the instance/profile (overrides beat
 * defaults everywhere) so a future default change cannot contaminate the run.
 *
 * RUN WITH VITE-NODE (not tsx): timelineEngine reads `import.meta.env.DEV`.
 *
 *   npx vite-node accuracy-testing/run-ella-spreadsheet-comparison.ts
 */

import {
  runScenario,
  type ScenarioInput,
  type ScenarioEnv,
} from '../src/engine/scenarioRunner';
import { calculateDetailedCashflow } from '../src/utils/detailedCashflowCalculator';
import { calculateNegativeGearingBenefit } from '../src/utils/negativeGearingCalculator';
import { calculateStampDuty } from '../src/utils/stampDutyCalculator';
import { calculateLMI } from '../src/utils/lmiCalculator';
import { calculateLandTax } from '../src/utils/landTaxCalculator';
import { calculateOneOffCosts, calculateDepositBalance } from '../src/utils/oneOffCostsCalculator';
import {
  BASE_YEAR,
  PERIODS_PER_YEAR,
  GROWTH_RATE_TIERS,
} from '../src/constants/financialParams';
import { CELL_IDS, getCategoryLabel, getCellDisplayLabel } from '../src/utils/propertyCells';
import { calcGrossYield } from '../src/utils/sharedFinancialCalcs';
import propertyDefaults from '../src/data/property-defaults.json';
import type { PropertyInstanceDetails } from '../src/types/propertyInstance';
import type { PropertyType } from '../src/contexts/PropertySelectionContext';
import type { PropertyAssumption } from '../src/contexts/DataAssumptionsContext';
import type { InvestmentProfileData } from '../src/contexts/InvestmentProfileContext';
import ella from './fixtures/ella-spreadsheet.json';

// ─────────────────────────────────────────────────────────────────────────────
// Headless env — identical assembly to run-gameplans-comparison.ts (Task 1).
// Input assembly is the caller's job per scenarioRunner's contract; all MATH
// runs in the real engine.
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
// Ella's exact inputs → one fully-explicit instance (NO field left to defaults)
// ─────────────────────────────────────────────────────────────────────────────

const CELL = 'metro-house-cashflow'; // house cell; every field below is overridden anyway
const PURCHASE_YEAR = BASE_YEAR + 1; // 2026 → established + post-reform → NG ring-fenced → pre-tax line
const PURCHASE_PERIOD = (PURCHASE_YEAR - BASE_YEAR) * PERIODS_PER_YEAR + 1; // period 3

const IN = ella.inputs;

function buildInstance(opts: {
  loanProduct: 'IO' | 'PI';
  interestRate: number;
  managementPercent: number;
}): PropertyInstanceDetails {
  return {
    // Section A — property overview
    state: IN.state, // NT
    purchasePrice: IN.purchasePrice, // 650000
    valuationAtPurchase: IN.purchasePrice, // no manufactured equity on her sheet
    rentPerWeek: IN.rentPerWeek, // 650
    growthAssumption: 'Medium', // irrelevant: her sheet has no growth projection
    // Section B — contract & loan
    lvr: 100 - IN.depositPercent, // 80 → loan 520,000
    lmiWaiver: false, // LVR 80 → LMI $0 anyway; leave the real calc on
    lmiCapitalized: false,
    loanProduct: opts.loanProduct,
    interestRate: opts.interestRate,
    loanTerm: IN.loanTermYearsImpliedByPmtHelper, // 30 (her PMT helper: n = 1560 weeks)
    ioTermYears: 30, // her IO leg never rolls to P&I on-sheet; year-1 unaffected either way
    // Section D — one-off purchase costs (only her lines are non-zero)
    engagementFee: 0, // "Buyer's agent fee (already paid)" — blank on her sheet
    conditionalHoldingDeposit: 0, // her deposit is a single $130k line
    buildingInsuranceUpfront: 0,
    buildingPestInspection: IN.buildingAndPest, // 1850
    plumbingElectricalInspections: 0,
    independentValuation: 0,
    mortgageFees: 0,
    conveyancing: IN.conveyancerLegals, // 1500
    maintenanceAllowancePostSettlement: 0,
    stampDutyOverride: null, // let OUR NT schedule speak — that's the test
    // Section E — cashflow
    propertyManagementPercent: opts.managementPercent, // 8.8 or 5.5 (her ambiguity)
    buildingInsuranceAnnual: IN.insuranceAnnual, // 1000
    councilRatesWater: IN.councilWaterRatesAnnual, // 3500
    strata: 0, // house
    // GAP: no advertising/letting field exists — carried via the maintenance
    // allowance (a flat annual $ line, so the year-1 math is identical).
    maintenanceAllowanceAnnual: IN.advertisingLettingAnnual, // 750
    landTaxOverride: IN.landTaxAnnual, // 1300 — NT actually has NO land tax; her sheet's line, replicated
    vacancyRate: 0, // her sheet has no vacancy anywhere
    // Section F — placement
    isManuallyPlaced: true,
    manualPlacementPeriod: PURCHASE_PERIOD,
    mode: 'Cashflow',
    entity: 'individual',
    isNewBuild: false, // established → ring-fenced NG → engine line is pre-tax
  } as PropertyInstanceDetails;
}

// Generous funding so manual placement is never starved — this harness measures
// CASHFLOW + UPFRONT COSTS, not deposit/BC gating. Profile dials all explicit.
function buildProfile(interestRatePct: number): Partial<InvestmentProfileData> {
  return {
    depositPool: 600000,
    annualSavings: 42000,
    baseSalary: 250000,
    borrowingCapacity: 4000000,
    useExistingEquity: true,
    timelineYears: 30,
    interestRate: interestRatePct / 100, // matches the instance rate → no resolution ambiguity
    vacancyRate: 0,
    rentEscalationRate: 0.05, // year-1 factor is 1.0 — explicit anyway
    inflationRate: 0.03, // year-1 factor is 1.0 — explicit anyway
    marginalTaxRate: 0.45, // NG is ring-fenced to $0 for this purchase; explicit anyway
  };
}

function runLeg(loanProduct: 'IO' | 'PI', interestRate: number, managementPercent: number) {
  const inst = buildInstance({ loanProduct, interestRate, managementPercent });
  const scenario: ScenarioInput = {
    propertySelections: { [CELL]: 1 },
    propertyOrder: [`${CELL}_instance_0`],
    investmentProfile: buildProfile(interestRate),
    propertyInstances: { [`${CELL}_instance_0`]: inst },
    existingProperties: [],
    eventBlocks: [],
  };
  const result = runScenario(scenario, env);
  const tp = result.timelineProperties[0];
  const breakdown = calculateDetailedCashflow(inst, tp.loanAmount, 0);

  // NG must be zero (established, bought 2026) or the engine line isn't pre-tax.
  const ng = calculateNegativeGearingBenefit({
    propertyCost: tp.cost,
    annualRentNet: breakdown.grossAnnualIncome,
    deductibleExpenses:
      breakdown.propertyManagementFee + breakdown.buildingInsurance + breakdown.councilRatesWater +
      breakdown.strata + breakdown.maintenance + breakdown.loanInterest + (breakdown.landTax ?? 0),
    isNewBuild: false,
    buyYear: PURCHASE_YEAR,
    marginalRate: 0.45,
  });

  const engineRow = result.projection.cashflowData.find((d) => d.year === String(PURCHASE_YEAR));
  const engineCashflow = engineRow ? engineRow.cashflow : NaN;
  const reconciles = Math.abs(engineCashflow - breakdown.netAnnualCashflow) <= 2;

  return { inst, result, tp, breakdown, ng, engineCashflow, reconciles };
}

// ─────────────────────────────────────────────────────────────────────────────
// Printing
// ─────────────────────────────────────────────────────────────────────────────

const f = (n: number, dp = 0) =>
  (n < 0 ? '-' : '') +
  Math.abs(n).toLocaleString('en-AU', { minimumFractionDigits: dp, maximumFractionDigits: dp });

function row(label: string, hers: number | null, ours: number, dp = 0) {
  const dS = hers === null ? '—' : f(ours - hers, dp);
  const dP = hers === null || hers === 0 ? '—' : (((ours - hers) / Math.abs(hers)) * 100).toFixed(2) + '%';
  console.log(
    '  ' +
      label.padEnd(44) +
      (hers === null ? '—' : f(hers, dp)).padStart(12) +
      f(ours, dp).padStart(12) +
      dS.padStart(11) +
      dP.padStart(9),
  );
}

function header() {
  console.log(
    '  ' + 'Line'.padEnd(44) + 'Ella'.padStart(12) + 'PropPath'.padStart(12) + 'Δ $'.padStart(11) + 'Δ %'.padStart(9),
  );
  console.log('  ' + '─'.repeat(88));
}

interface LegSpec {
  id: string;
  loanProduct: 'IO' | 'PI';
  rate: number;
  ella: {
    annualRepayments: number; // her annual loan-repayment line
    monthlyRepayments: number | null;
    annualExpenseTotal: number | null; // her "Total @ rate" (uses the $1,859 mgmt)
    cashflowAnnual: number;
    cashflowMonthly: number | null;
    cashflowWeekly: number | null;
  };
}

const H = ella.herComputedLines;
const CF = ella.cashflowBottomBlock;

const LEGS: LegSpec[] = [
  {
    id: 'IO @ 6.29%',
    loanProduct: 'IO',
    rate: IN.interestRatePI, // 6.29 — her sheet prices the IO line at both rates
    ella: {
      annualRepayments: H.annualLoanRepaymentsIO_629,
      monthlyRepayments: H.loanRepaymentsMonthlyIO_629,
      annualExpenseTotal: H.annualExpenseTotal_629,
      cashflowAnnual: CF.interestOnly_629.annual,
      cashflowMonthly: CF.interestOnly_629.perMonth,
      cashflowWeekly: CF.interestOnly_629.perWeek,
    },
  },
  {
    id: 'IO @ 6.39%',
    loanProduct: 'IO',
    rate: IN.interestRateIO,
    ella: {
      annualRepayments: H.annualLoanRepaymentsIO_639,
      monthlyRepayments: H.loanRepaymentsMonthlyIO_639,
      annualExpenseTotal: H.annualExpenseTotal_639,
      cashflowAnnual: CF.interestOnly_639.annual,
      cashflowMonthly: CF.interestOnly_639.perMonth,
      cashflowWeekly: CF.interestOnly_639.perWeek,
    },
  },
  {
    id: 'P&I @ 6.29%',
    loanProduct: 'PI',
    rate: IN.interestRatePI,
    ella: {
      annualRepayments: H.pmtHelper.impliedAnnualPIRepayment_weeklyPmtx52, // weekly PMT ×52
      monthlyRepayments: null, // not printed on her sheet
      annualExpenseTotal: null, // not printed on her sheet
      cashflowAnnual: CF.principalAndInterest_629.annual,
      cashflowMonthly: CF.principalAndInterest_629.perMonth,
      cashflowWeekly: CF.principalAndInterest_629.perWeek,
    },
  },
];

const MGMT_TRUE = IN.managementFeePercent; // 8.8 → $2,974.40, her mid-block figure
const MGMT_AS_PRINTED = (H.managementFee_annualTotalBlock / ella.inputs.rentAnnual) * 100; // 5.5 → $1,859, her Annual-Total figure

console.log('Ella "Cashflow Calculator" (11 Emma Ct Driver, NT) × PropPath engine — Task 4');
console.log(
  `BASE_YEAR=${BASE_YEAR}  purchase year=${PURCHASE_YEAR} (period ${PURCHASE_PERIOD}, manual placement)  engine modules imported from src/, math untouched`,
);
console.log(
  `Management-fee ambiguity: her sheet shows BOTH $${f(H.managementFee_midBlock_8_8pct)} (true 8.8%) and $${f(
    H.managementFee_annualTotalBlock,
  )} (= exactly ${MGMT_AS_PRINTED.toFixed(2)}% of rent) — every leg is run both ways.\n`,
);

let allReconciled = true;
let anyNg = false;

for (const leg of LEGS) {
  for (const mgmt of [
    { pct: MGMT_TRUE, tag: `mgmt 8.8% ($${f(ella.inputs.rentAnnual * MGMT_TRUE / 100, 2)}) — her mid-block figure` },
    { pct: MGMT_AS_PRINTED, tag: `mgmt ${MGMT_AS_PRINTED.toFixed(2)}% ($${f(H.managementFee_annualTotalBlock)}) — her Annual-Total figure` },
  ]) {
    const r = runLeg(leg.loanProduct, leg.rate, mgmt.pct);
    const b = r.breakdown;
    const mgmtIsAsPrinted = mgmt.pct !== MGMT_TRUE;

    console.log('═'.repeat(92));
    console.log(`LEG ${leg.id}  ·  ${mgmt.tag}`);
    console.log('═'.repeat(92));
    console.log(
      `  placed: ${r.tp.title} — ${r.tp.displayPeriod} | price $${f(r.tp.cost)} | loan $${f(r.tp.loanAmount)} | ` +
        `status ${r.tp.status} | ngBenefit $${f(r.ng.ngBenefit)} (ringFenced=${r.ng.ringFenced})`,
    );
    if (r.ng.ngBenefit !== 0) anyNg = true;

    const annualRepay = b.loanInterest + b.principalPayments;
    const oursExpenseTotal =
      annualRepay + b.propertyManagementFee + b.buildingInsurance + b.councilRatesWater +
      b.strata + b.maintenance + (b.landTax ?? 0);

    header();
    row('Gross annual rent ($650/wk × 52)', ella.inputs.rentAnnual, b.grossAnnualIncome);
    row('Vacancy line (neither side deducts one)', 0, b.grossAnnualIncome - (b.netAnnualCashflow + oursExpenseTotal));
    if (leg.ella.monthlyRepayments !== null) {
      row('Loan repayments — monthly', leg.ella.monthlyRepayments, annualRepay / 12, 2);
    }
    row(
      leg.loanProduct === 'PI'
        ? 'Loan repayments — annual (P&I; hers = wk PMT×52)'
        : 'Loan repayments — annual (interest only)',
      leg.ella.annualRepayments,
      annualRepay,
    );
    if (leg.loanProduct === 'PI') {
      row('  of which interest (loan × 6.29%)', null, b.loanInterest);
      row('  of which principal (monthly-PMT derived)', null, b.principalPayments);
    }
    row(
      'Management fee',
      mgmtIsAsPrinted ? H.managementFee_annualTotalBlock : H.managementFee_midBlock_8_8pct,
      b.propertyManagementFee,
      2,
    );
    row('Council / water rates', ella.inputs.councilWaterRatesAnnual, b.councilRatesWater);
    row('Insurance', ella.inputs.insuranceAnnual, b.buildingInsurance);
    row('Advertising / letting (ours: via maintenance $)', ella.inputs.advertisingLettingAnnual, b.maintenance);
    row('Strata (house — both sides zero)', 0, b.strata);
    row('Land tax (NT has none; hers replicated via override)', ella.inputs.landTaxAnnual, b.landTax ?? 0);
    row(
      'Total annual expenses incl. repayments',
      mgmtIsAsPrinted ? leg.ella.annualExpenseTotal : null, // her printed total uses the $1,859 mgmt
      oursExpenseTotal,
    );
    row('NET CASHFLOW — annual', leg.ella.cashflowAnnual, b.netAnnualCashflow);
    row('NET CASHFLOW — per month', leg.ella.cashflowMonthly, b.netMonthlyCashflow, 2);
    row('NET CASHFLOW — per week (ours = annual ÷ 52)', leg.ella.cashflowWeekly, b.netWeeklyCashflow, 2);

    console.log(
      `\n  ENGINE CROSS-CHECK: projection.cashflowData[${PURCHASE_YEAR}] = $${f(r.engineCashflow)} ` +
        `vs detailedCashflow net $${f(b.netAnnualCashflow)} → ${r.reconciles ? '✓ reconciles' : '✗ DOES NOT RECONCILE'}`,
    );
    if (!r.reconciles) allReconciled = false;
    console.log('');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Upfront costs / initial outlay (identical across legs — take IO @ 6.39, mgmt 8.8)
// ─────────────────────────────────────────────────────────────────────────────

{
  const r = runLeg('IO', IN.interestRateIO, MGMT_TRUE);
  const O = ella.initialOutlay;
  const stampNT = calculateStampDuty('NT', IN.purchasePrice, false);
  const lmi = calculateLMI(r.tp.loanAmount, 100 - IN.depositPercent, false, IN.purchasePrice, IN.purchasePrice);
  const depositBalance = calculateDepositBalance(IN.purchasePrice, 100 - IN.depositPercent, 0);
  const oneOff = calculateOneOffCosts(r.inst, stampNT, depositBalance);

  console.log('═'.repeat(92));
  console.log('INITIAL OUTLAY / UPFRONT CASH (leg-independent)');
  console.log('═'.repeat(92));
  header();
  row('Purchase price', O.purchasePrice, r.tp.cost);
  row('Deposit (20%)', O.deposit, oneOff.depositBalance);
  row('Stamp duty + transfer (NT on $650k)', O.stampDutyPlusTransfer, oneOff.stampDuty);
  row('Conveyancer / legals', O.conveyancerLegals, oneOff.conveyancing);
  row('Building & pest', O.buildingAndPest, oneOff.buildingPestInspection);
  row("Buyer's agent fee (blank on her sheet)", 0, oneOff.engagementFee);
  row('LMI (80% LVR — both sides nil)', 0, lmi);
  row('All other one-off fields (explicitly zeroed)', 0,
    oneOff.buildingInsuranceUpfront + oneOff.plumbingElectricalInspections +
    oneOff.independentValuation + oneOff.mortgageFees +
    oneOff.conditionalHoldingDeposit + oneOff.maintenanceAllowancePostSettlement);
  row('TOTAL FUNDS REQUIRED', O.totalFundsRequired, oneOff.totalCashRequired);
  row('Total acquisition cost (price + costs ex-LMI)', O.totalAcquisitionCost,
    IN.purchasePrice + (oneOff.totalCashRequired - oneOff.depositBalance));

  console.log(
    `\n  ENGINE CROSS-CHECK: timelineEngine tp.totalCashRequired = $${f(r.tp.totalCashRequired)} ` +
      `vs calculateOneOffCosts total $${f(oneOff.totalCashRequired)} + LMI $${f(lmi)} → ${
        Math.abs(r.tp.totalCashRequired - (oneOff.totalCashRequired + lmi)) <= 2 ? '✓ reconciles' : '✗ DOES NOT RECONCILE'
      }`,
  );
  console.log(
    `  ENGINE CROSS-CHECK: tp.acquisitionCosts.stampDuty = $${f(r.tp.acquisitionCosts?.stampDuty ?? NaN)} ` +
      `vs direct calculateStampDuty('NT', 650000) = $${f(stampNT)} → ${
        Math.abs((r.tp.acquisitionCosts?.stampDuty ?? NaN) - stampNT) <= 1 ? '✓ reconciles' : '✗ DOES NOT RECONCILE'
      }`,
  );
  if (Math.abs(r.tp.totalCashRequired - (oneOff.totalCashRequired + lmi)) > 2) allReconciled = false;

  // Yields (her mid-block ratios)
  console.log('\n  YIELD RATIOS');
  header();
  row('Yield on purchase price (%)', H.yieldOnPurchasePrice, calcGrossYield(IN.rentPerWeek, IN.purchasePrice), 2);
  row('Yield on total acquisition (%)', H.yieldOnTotalAcquisition,
    (ella.inputs.rentAnnual / (IN.purchasePrice + (oneOff.totalCashRequired - oneOff.depositBalance))) * 100, 2);
  row('Yield on loan (%)', H.yieldOnLoan, (ella.inputs.rentAnnual / r.tp.loanAmount) * 100, 2);

  // NT schedule audit — her $35,838 vs our $32,175, plus a sub-$525k formula check
  console.log('\n  NT STAMP DUTY SCHEDULE AUDIT');
  console.log(`  Our NT duty on $650,000: $${f(stampNT)} (= 4.95% flat, NT TRO band $525k–$3m).`);
  console.log(`  Her "Stamp Duty + Transfer": $${f(O.stampDutyPlusTransfer)} → $${f(O.stampDutyPlusTransfer - stampNT)} above ours (${(((O.stampDutyPlusTransfer - stampNT) / stampNT) * 100).toFixed(1)}%).`);
  console.log('  Candidate explanations printed in the report (VIC-rate habit, fees, old calculator).');
  console.log('\n  Sub-$525k branch vs official NT formula D = 0.06571441·V² + 15V (V = $000s):');
  for (const price of [300000, 450000, 500000, 524999]) {
    const v = price / 1000;
    const official = 0.06571441 * v * v + 15 * v;
    const oursSub = calculateStampDuty('NT', price, false);
    console.log(
      `    $${f(price)}: ours $${f(oursSub)}  official $${f(official)}  Δ $${f(oursSub - official)}`,
    );
  }
  const below = calculateStampDuty('NT', 525000, false);
  const above = calculateStampDuty('NT', 525001, false);
  console.log(
    `    Boundary continuity: $525,000 → $${f(below)} vs $525,001 → $${f(above)} (official schedule is continuous: both ≈ $25,988).`,
  );
  console.log(
    `  Land tax sanity: calculateLandTax('NT', 650000) = $${f(calculateLandTax('NT', 650000))} — correct, NT levies no land tax; her $1,300 line is her sheet's.`,
  );
}

console.log('\n' + '═'.repeat(92));
console.log(
  `SUMMARY: engine cross-checks ${allReconciled ? 'ALL RECONCILE ✓' : 'FAILED ✗'}; ` +
    `NG benefit ${anyNg ? 'NON-ZERO ✗ (comparison NOT pre-tax!)' : 'zero on every leg ✓ (pre-tax basis confirmed)'}`,
);
