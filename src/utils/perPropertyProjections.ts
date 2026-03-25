/**
 * Pure calculation function for per-property projections.
 *
 * Mirrors the logic in usePerPropertyTracking but accepts data as parameters
 * instead of reading from React context. This allows it to be used in both:
 * - Dashboard (via the hook, which wraps this)
 * - Portfolio (directly, with stored scenario data)
 *
 * Uses the SAME calculation functions as the rest of the system:
 * - calculatePropertyGrowth (tiered growth curve)
 * - calculateDetailedCashflow (real expense breakdown with vacancy, management, insurance, etc.)
 * - calculateLandTax (state-specific)
 *
 * Note: applyPropertyOverrides is NOT called here because the stored propertyInstances
 * in Supabase are already the merged/overridden values (saved after user customisation).
 */

import type { PropertyInstanceDetails } from '../types/propertyInstance';
import type { GrowthCurve } from '../types/property';
import { calculateDetailedCashflow } from './detailedCashflowCalculator';
import { calculateLandTax } from './landTaxCalculator';
import { calculatePropertyGrowth } from './metricsCalculator';
import { ANNUAL_INFLATION_RATE, PERIODS_PER_YEAR } from '../constants/financialParams';

// --- Types ---

export interface EquityDataPoint {
  year: number;
  propertyValue: number;
  loanBalance: number;
  equity: number;
}

export interface CashflowDataPoint {
  year: number;
  grossIncome: number;
  totalExpenses: number;
  loanInterest: number;
  netCashflow: number;
}

export interface PerPropertyProjection {
  // Key Metrics
  currentPropertyValue: number;
  currentEquity: number;
  totalCashInvested: number;
  cashOnCashReturn: number;
  roic: number;
  yearsHeld: number;
  capitalReturnedInYears: number;

  // Year-by-year data
  equityOverTime: EquityDataPoint[];
  cashflowOverTime: CashflowDataPoint[];

  // Derived year-by-year for table display
  yearRows: YearRow[];

  // Context
  propertyTitle: string;
  purchaseYear: number;
}

export interface YearRow {
  year: number;
  yearLabel: string;
  propertyValue: number;
  loanBalance: number;
  equity: number;
  grossIncome: number;
  grossYieldPct: number;
  interestExpense: number;
  operatingExpenses: number;
  netCashflow: number;
  netCashflowCumulative: number;
  monthlyCost: number;
  capitalGrowthAnnual: number;
  capitalGrowthCumulative: number;
  totalPerformance: number;
  cocReturnCumulative: number;
  roic: number;
}

// --- Input types ---

export interface TimelinePropertyData {
  title: string;
  cost: number;
  loanAmount: number;
  depositRequired: number;
  period: number;
  affordableYear: number;
  displayPeriod: string;
  loanType?: 'IO' | 'PI';
  acquisitionCosts?: {
    stampDuty: number;
    lmi: number;
    legalFees: number;
    inspectionFees: number;
    otherFees: number;
    total: number;
  };
  upfrontCosts?: { total: number };
}

export interface ProjectionConfig {
  growthCurve: GrowthCurve;
  projectionYears?: number;
}

// --- Main calculation function ---

export function calculatePerPropertyProjection(
  timelineProperty: TimelinePropertyData,
  propertyDetails: PropertyInstanceDetails,
  config: ProjectionConfig,
): PerPropertyProjection {
  const purchasePrice = timelineProperty.cost;
  let loanBalance = timelineProperty.loanAmount;
  const loanType = timelineProperty.loanType || propertyDetails.loanProduct || 'IO';
  const projectionYears = config.projectionYears || 10;
  const growthCurve = config.growthCurve;

  // Total cash invested = deposit + acquisition costs (same as usePerPropertyTracking)
  const totalCashInvested = timelineProperty.upfrontCosts?.total ??
    (timelineProperty.depositRequired + (timelineProperty.acquisitionCosts?.total || 0));

  const equityOverTime: EquityDataPoint[] = [];
  const cashflowOverTime: CashflowDataPoint[] = [];
  const yearRows: YearRow[] = [];

  let netCashflowCumulative = 0;
  let capitalGrowthCumulative = 0;
  let capitalReturnedInYears = 30;
  let prevValue = purchasePrice;

  // P&I principal payment helper (same as usePerPropertyTracking)
  const calculateAnnualPrincipalPayment = (loanAmt: number, interestRate: number, termYears: number): number => {
    const monthlyRate = interestRate / 12;
    const numPayments = termYears * 12;
    const monthlyPayment = loanAmt *
      (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
      (Math.pow(1 + monthlyRate, numPayments) - 1);
    const annualPayment = monthlyPayment * 12;
    const annualInterest = loanAmt * interestRate;
    return annualPayment - annualInterest;
  };

  for (let year = 1; year <= projectionYears; year++) {
    // Property value via tiered growth (same as usePerPropertyTracking)
    const periodsHeld = year * PERIODS_PER_YEAR;
    const currentPropertyValue = calculatePropertyGrowth(purchasePrice, periodsHeld, growthCurve);

    // Loan balance reduction for P&I
    if (loanType === 'PI') {
      const annualPrincipal = calculateAnnualPrincipalPayment(
        loanBalance,
        propertyDetails.interestRate / 100,
        propertyDetails.loanTerm,
      );
      loanBalance = Math.max(0, loanBalance - annualPrincipal);
    }

    const equity = currentPropertyValue - loanBalance;

    equityOverTime.push({
      year,
      propertyValue: Math.round(currentPropertyValue),
      loanBalance: Math.round(loanBalance),
      equity: Math.round(equity),
    });

    // Cashflow via calculateDetailedCashflow (same as usePerPropertyTracking)
    const landTax = propertyDetails.landTaxOverride ?? calculateLandTax(
      propertyDetails.state,
      currentPropertyValue,
    );

    const rentGrowthFactor = currentPropertyValue / purchasePrice;
    const adjustedProperty: PropertyInstanceDetails = {
      ...propertyDetails,
      landTaxOverride: propertyDetails.landTaxOverride ?? landTax,
      rentPerWeek: propertyDetails.rentPerWeek * rentGrowthFactor,
    };

    const cashflowBreakdown = calculateDetailedCashflow(adjustedProperty, loanBalance);

    // Inflation-adjusted expenses (same as usePerPropertyTracking)
    const inflationFactor = Math.pow(1 + ANNUAL_INFLATION_RATE, year);
    const adjustedManagement = cashflowBreakdown.propertyManagementFee; // Already growth-adjusted via rent
    const adjustedInsurance = cashflowBreakdown.buildingInsurance * inflationFactor;
    const adjustedCouncil = cashflowBreakdown.councilRatesWater * inflationFactor;
    const adjustedStrata = cashflowBreakdown.strata * inflationFactor;
    const adjustedMaintenance = cashflowBreakdown.maintenance * inflationFactor;

    const adjustedOperatingExpensesExLoan =
      adjustedManagement +
      adjustedInsurance +
      adjustedCouncil +
      adjustedStrata +
      adjustedMaintenance;

    const inflationAdjustedNonDeductible = cashflowBreakdown.totalNonDeductibleExpenses * inflationFactor;
    const totalExpensesForDisplay = adjustedOperatingExpensesExLoan + inflationAdjustedNonDeductible - cashflowBreakdown.potentialDeductions;
    const netCashflow = cashflowBreakdown.adjustedIncome - totalExpensesForDisplay - cashflowBreakdown.loanInterest;

    cashflowOverTime.push({
      year,
      grossIncome: Math.round(cashflowBreakdown.adjustedIncome),
      totalExpenses: Math.round(totalExpensesForDisplay),
      loanInterest: Math.round(cashflowBreakdown.loanInterest),
      netCashflow: Math.round(netCashflow),
    });

    // Derived metrics for year-by-year table
    netCashflowCumulative += netCashflow;
    const capitalGrowthAnnual = currentPropertyValue - prevValue;
    capitalGrowthCumulative += capitalGrowthAnnual;
    const totalPerformance = capitalGrowthCumulative + netCashflowCumulative;
    const cocReturnCumulative = totalCashInvested > 0 ? (netCashflowCumulative / totalCashInvested) * 100 : 0;
    const roicYear = totalCashInvested > 0 ? (totalPerformance / totalCashInvested) * 100 : 0;
    const grossYieldPct = currentPropertyValue > 0 ? (cashflowBreakdown.adjustedIncome / currentPropertyValue) * 100 : 0;

    if (capitalReturnedInYears === 30 && totalPerformance >= totalCashInvested) {
      capitalReturnedInYears = year;
    }

    yearRows.push({
      year,
      yearLabel: (Math.floor(timelineProperty.affordableYear) + year).toString(),
      propertyValue: Math.round(currentPropertyValue),
      loanBalance: Math.round(loanBalance),
      equity: Math.round(equity),
      grossIncome: Math.round(cashflowBreakdown.adjustedIncome),
      grossYieldPct,
      interestExpense: Math.round(cashflowBreakdown.loanInterest),
      operatingExpenses: Math.round(totalExpensesForDisplay),
      netCashflow: Math.round(netCashflow),
      netCashflowCumulative: Math.round(netCashflowCumulative),
      monthlyCost: Math.round(netCashflow / 12),
      capitalGrowthAnnual: Math.round(capitalGrowthAnnual),
      capitalGrowthCumulative: Math.round(capitalGrowthCumulative),
      totalPerformance: Math.round(totalPerformance),
      cocReturnCumulative,
      roic: roicYear,
    });

    prevValue = currentPropertyValue;
  }

  // Final metrics (same as usePerPropertyTracking)
  const latestEquity = equityOverTime[equityOverTime.length - 1];
  const firstYearNetCashflow = cashflowOverTime[0]?.netCashflow || 0;
  const cashOnCashReturn = totalCashInvested > 0
    ? (firstYearNetCashflow / totalCashInvested) * 100
    : 0;

  const totalCashflow = cashflowOverTime.reduce((sum, cf) => sum + cf.netCashflow, 0);
  const totalReturn = latestEquity.equity - totalCashInvested + totalCashflow;
  const roic = totalCashInvested > 0
    ? (totalReturn / totalCashInvested / projectionYears) * 100
    : 0;

  return {
    currentPropertyValue: latestEquity.propertyValue,
    currentEquity: latestEquity.equity,
    totalCashInvested,
    cashOnCashReturn,
    roic,
    yearsHeld: projectionYears,
    capitalReturnedInYears,
    equityOverTime,
    cashflowOverTime,
    yearRows,
    propertyTitle: timelineProperty.title,
    purchaseYear: Math.floor(timelineProperty.affordableYear),
  };
}
