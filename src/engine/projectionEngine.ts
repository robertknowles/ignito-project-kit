/**
 * Projection Engine - Stage 2 of the calculation pipeline.
 *
 * Pure extraction of usePortfolioProjection's single computation-pass memo
 * body (Phase 0 of the Compare evolution plan). Zero React dependencies -
 * callable headlessly with a snapshot of context state.
 *
 * MOVED code, not rewritten: the math here must produce byte-identical numbers
 * to the pre-extraction dashboard. Do not "improve" it.
 */

import { convertExistingToInstance } from '../utils/existingPropertyAdapter';
import { calculateNegativeGearingBenefit, calculateNewBuildBcUplift } from '../utils/negativeGearingCalculator';
import { calculateDetailedCashflow } from '../utils/detailedCashflowCalculator';
import { calculateCgtComparison } from '../utils/cgtCalculator';
import { getPropertyInstanceDefaults, getGrowthCurveFromAssumption } from '../utils/propertyInstanceDefaults';
import { calculateRemainingLoanBalance } from '../utils/metricsCalculator';
import {
  getGrowthRateAdjustment,
  getEffectiveInterestRate,
  getPropertyEffectiveRate,
  getRenovationValueIncrease,
} from '../utils/eventProcessing';
import { calculateBorrowingCeiling } from '../utils/borrowingCapacityCeiling';
import { EVENT_TYPES, getEventLabel } from '../constants/eventTypes';
import type { GrowthCurve, YearBreakdownData, TimelineProperty } from '../types/property';
import type { EventBlock, EventCategory } from '../contexts/PropertySelectionContext';
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext';
import type { PropertyInstanceDetails } from '../types/propertyInstance';
import type { ExistingProperty } from '../types/existingProperty';
import type { PropertyAssumption } from '../contexts/DataAssumptionsContext';
import {
  PERIODS_PER_YEAR,
  BASE_YEAR,
  DEFAULT_INTEREST_RATE,
  DEFAULT_VACANCY_RATE,
  DEFAULT_RENTAL_YIELD,
  ANNUAL_INFLATION_RATE,
  ANNUAL_WAGE_GROWTH_RATE,
  SAVINGS_INTEREST_RATE,
  SAVINGS_DEPLOYMENT_RATE,
  EQUITY_EXTRACTION_LVR_CAP,
  ENTITY_SERVICEABILITY_FACTORS,
  SERVICEABILITY_FACTOR,
  RENTAL_SERVICEABILITY_CONTRIBUTION_RATE,
  annualRateToPeriodRate,
} from '../constants/financialParams';
import { PROPERTY_COLORS } from '../constants/chartColors';

// ─────────────────────────────────────────────────────────────
// Types - superset of all previous hooks' output types
// ─────────────────────────────────────────────────────────────

/** Re-export for backward compatibility with chart components */
export interface PortfolioGrowthDataPoint {
  year: string;
  portfolioValue: number;
  propertyEquity: number;
  equity: number;
  properties?: string[];
  doNothingBalance?: number;
  totalDebt?: number;
  availableFunds?: number;
  monthlyHoldingCost?: number;
  borrowingCapacity?: number;
  /** Display-only borrowing-capacity uplift from planned NEW BUILD purchases
   *  (retained negative-gearing add-back). Added on top of the stated/computed
   *  ceiling by the BC chart and Dashboard headroom calc; NOT used by gating. */
  newBuildBcUplift?: number;
  cashFromSales?: number;
  cashOffset?: number;
  entityDiscountedDebt?: number;
}

export interface CashflowDataPoint {
  year: string;
  cashflow: number;
  rentalIncome: number;
  expenses: number;
  loanRepayments: number;
  highlight?: boolean;
}

/** Per-property cashflow entry (replaces usePortfolioCashflow types) */
export interface PropertyCashflowEntry {
  title: string;
  instanceId: string;
  color: string;
  purchaseYear: number;
  grossIncome: number;
  totalOutgoings: number;
  netCashflow: number;
}

export interface YearCashflowSnapshot {
  year: number;
  properties: PropertyCashflowEntry[];
  totalIn: number;
  totalOut: number;
  netAnnual: number;
  netMonthly: number;
}

/** Per-property projection (replaces calculatePerPropertyProjection) */
export interface PerPropertyYearRow {
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

/** @deprecated Use PerPropertyYearRow instead */
export type YearRow = PerPropertyYearRow;

export interface PerPropertyProjection {
  currentPropertyValue: number;
  currentEquity: number;
  totalCashInvested: number;
  cashOnCashReturn: number;
  roic: number;
  yearsHeld: number;
  capitalReturnedInYears: number;
  equityOverTime: Array<{ year: number; propertyValue: number; loanBalance: number; equity: number }>;
  cashflowOverTime: Array<{ year: number; grossIncome: number; totalExpenses: number; loanInterest: number; netCashflow: number }>;
  yearRows: PerPropertyYearRow[];
  propertyTitle: string;
  purchaseYear: number;
}

/** Funding breakdown for a purchase (from useRoadmapData) */
export interface FundingBreakdown {
  cash: number;
  savings: number;
  equity: number;
  totalCashRequired: number;
}

export interface PurchaseDetail {
  propertyTitle: string;
  cost: number;
  depositRequired: number;
  totalCashRequired: number;
  loanAmount: number;
  instanceId: string;
  propertyType: string;
  fundingBreakdown: FundingBreakdown;
}

export interface EventSummary {
  id: string;
  eventType: string;
  category: EventCategory;
  label: string;
  icon: string;
  period: number;
}

export interface YearData {
  year: number;
  depositStatus: 'pass' | 'fail' | 'na';
  borrowingStatus: 'pass' | 'fail' | 'na';
  serviceabilityStatus: 'pass' | 'fail' | 'na';
  portfolioValue: string;
  totalEquity: string;
  availableFunds: string;
  portfolioValueRaw: number;
  propertyEquityRaw: number;
  totalEquityRaw: number;
  availableFundsRaw: number;
  totalDebt: number;
  propertyCount: number;
  annualCashflow: number;
  grossRentalIncome: number;
  totalExpenses: number;
  totalLoanInterest: number;
  purchaseInYear: boolean;
  purchaseDetails?: PurchaseDetail[];
  yearBreakdownData?: YearBreakdownData;
  events?: EventSummary[];
  doNothingBalance?: number;
  cashFromSales: number;
}

export interface RoadmapData {
  years: YearData[];
  startYear: number;
  endYear: number;
}

/** One modelled property sale. CGT is on the 2027 basis (the rules the market
 *  already applies): indexation + 30% minimum tax, with new builds electing the
 *  50% discount where cheaper. */
export interface SaleCgtRow {
  /** Property/instance id, for matching to a row in the UI. */
  id: string;
  name: string;
  saleYear: number;
  kind: 'existing' | 'planned';
  capitalGain: number;
  cgt: number;
  netProceeds: number;
}

/** The complete unified output */
export interface PortfolioProjectionResult {
  // Chart data (replaces useChartDataGenerator)
  portfolioGrowthData: PortfolioGrowthDataPoint[];
  cashflowData: CashflowDataPoint[];
  monthlyHoldingCost: {
    total: number;
    byProperty: Array<{ propertyTitle: string; monthlyCost: number; instanceId: string }>;
  };
  netWorthData: Array<{ year: string; totalAssets: number; totalDebt: number; netWorth: number }>;

  // Roadmap data (replaces useRoadmapData)
  roadmapData: RoadmapData;

  // Per-property cashflow (replaces usePortfolioCashflow)
  portfolioCashflow: {
    snapshots: Map<number, YearCashflowSnapshot>;
    yearRange: [number, number];
    lastPurchaseYear: number;
    purchaseYears: number[];
  } | null;

  // Per-property projections (replaces calculatePerPropertyProjection)
  propertyProjections: Map<string, PerPropertyProjection>;

  // CGT under current law vs the proposed 2027 reform, per modelled sale.
  salesCgtBreakdown: SaleCgtRow[];
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

/**
 * Period-by-period growth WITH event adjustments (from useRoadmapData).
 * More accurate than useChartDataGenerator's approach which applies
 * a single adjustment to the entire curve once per year.
 */
const calculatePropertyGrowthWithEvents = (
  initialValue: number,
  periods: number,
  growthCurve: { year1: number; years2to3: number; year4: number; year5plus: number },
  eventBlocks: EventBlock[],
  basePeriod: number = 0,
): number => {
  let currentValue = initialValue;
  const year1Rate = annualRateToPeriodRate(growthCurve.year1 / 100);
  const years2to3Rate = annualRateToPeriodRate(growthCurve.years2to3 / 100);
  const year4Rate = annualRateToPeriodRate(growthCurve.year4 / 100);
  const year5plusRate = annualRateToPeriodRate(growthCurve.year5plus / 100);

  for (let period = 1; period <= periods; period++) {
    const actualPeriod = basePeriod + period;
    const growthAdjustment = getGrowthRateAdjustment(actualPeriod, eventBlocks);

    let periodRate: number;
    if (period <= 2) periodRate = year1Rate;
    else if (period <= 6) periodRate = years2to3Rate;
    else if (period <= 8) periodRate = year4Rate;
    else periodRate = year5plusRate;

    const adjustedPeriodRate = periodRate + annualRateToPeriodRate(growthAdjustment);
    currentValue *= 1 + Math.max(-0.1, adjustedPeriodRate);
  }
  return currentValue;
};

// ─────────────────────────────────────────────────────────────
// Inputs
// ─────────────────────────────────────────────────────────────

export interface ProjectionEngineInputs {
  profile: InvestmentProfileData;
  timelineProperties: TimelineProperty[];
  /** Instance lookup - matches what the moved memo body reads (it only ever calls getInstance). */
  getInstance: (instanceId: string) => PropertyInstanceDetails | null;
  existingProperties: ExistingProperty[];
  eventBlocks: EventBlock[];
  getPropertyData: (title: string, growthAssumption?: string) => PropertyAssumption | undefined;
}

// ─────────────────────────────────────────────────────────────
// Main computation (moved verbatim from usePortfolioProjection)
// ─────────────────────────────────────────────────────────────

export function computeProjection(inputs: ProjectionEngineInputs): PortfolioProjectionResult {
  const { profile, timelineProperties, getInstance, existingProperties, eventBlocks, getPropertyData } = inputs;

  // Profile-level assumption overrides
  const defaultInterestRate = profile.interestRate ?? DEFAULT_INTEREST_RATE;
  const profileVacancyRate = profile.vacancyRate ?? DEFAULT_VACANCY_RATE;
  const profileWageGrowth = profile.wageGrowthRate ?? ANNUAL_WAGE_GROWTH_RATE;
  const profileInflation = profile.inflationRate ?? ANNUAL_INFLATION_RATE;
  const existingGrowthRate = profile.existingPortfolioGrowthRate || 0.05;

  // ───────────────────────────────────────────────────────────
  // SINGLE COMPUTATION PASS
  // Computes portfolio-level, per-year roadmap, per-property, and
  // cashflow data in one loop. Every consumer reads from this.
  // ───────────────────────────────────────────────────────────
  const startYear = BASE_YEAR;
  const endYear = startYear + (profile.timelineYears || 20) - 1;
  const cashflowEndYear = startYear + Math.max(profile.timelineYears, 20) - 1;
  // Per-property projections feed the Brief performance view, which offers a
  // 10/20/30-year horizon toggle. Extend the loop far enough that each owned
  // property can accumulate up to 30 yearRows, independent of the (shorter)
  // plan timeline that bounds portfolio-level outputs below.
  const perPropertyEndYear = startYear + Math.max(profile.timelineYears || 20, 30) - 1;
  const consolidationYear = endYear - (profile.ioToPiTransitionYears ?? 5) + 1;

  // Plottable properties (feasible AND challenging - not Infinity)
  const plottableProperties = timelineProperties.filter(p => p.period !== Infinity);
  const feasibleProperties = timelineProperties.filter(
    p => p.status === 'feasible' && p.instanceId,
  );

  // ── Resolve per-property inputs once ──
  interface ResolvedProperty {
    prop: TimelineProperty;
    growthCurve: GrowthCurve;
    growthBasis: number;
    rentalYield: number;
    instanceId: string;
    loanType: 'IO' | 'PI';
    loanTerm: number;
    ioTermYears: number;
    interestRate: number;
  }

  const resolvedProperties: ResolvedProperty[] = plottableProperties.map(prop => {
    const propertyInstance = getInstance(prop.instanceId);
    const propertyData = getPropertyData(prop.title, propertyInstance?.growthAssumption);

    let propertyGrowthCurve: GrowthCurve;
    if (propertyInstance?.growthAssumption) {
      propertyGrowthCurve = getGrowthCurveFromAssumption(propertyInstance.growthAssumption);
    } else if (propertyData) {
      propertyGrowthCurve = {
        year1: parseFloat(propertyData.growthYear1),
        years2to3: parseFloat(propertyData.growthYears2to3),
        year4: parseFloat(propertyData.growthYear4),
        year5plus: parseFloat(propertyData.growthYear5plus),
      };
    } else {
      propertyGrowthCurve = profile.growthCurve;
    }

    const instanceRentPerWeek = propertyInstance?.rentPerWeek;
    const rentalYield = instanceRentPerWeek
      ? (instanceRentPerWeek * 52) / prop.cost
      : propertyData
        ? parseFloat(propertyData.yield) / 100
        : DEFAULT_RENTAL_YIELD;

    const valuationAtPurchase = propertyInstance?.valuationAtPurchase;
    const growthBasis =
      valuationAtPurchase && valuationAtPurchase > prop.cost
        ? valuationAtPurchase
        : prop.cost;

    return {
      prop,
      growthCurve: propertyGrowthCurve,
      growthBasis,
      rentalYield,
      instanceId: prop.instanceId,
      loanType: (propertyInstance?.loanProduct ?? 'IO') as 'IO' | 'PI',
      loanTerm: propertyInstance?.loanTerm ?? 30,
      ioTermYears: propertyInstance?.ioTermYears ?? 5,
      interestRate: propertyInstance?.interestRate
        ? propertyInstance.interestRate / 100
        : defaultInterestRate,
    };
  });

  // Build purchase-by-year map
  const purchasesByYear = new Map<number, TimelineProperty[]>();
  plottableProperties.forEach(prop => {
    const year = Math.floor(prop.affordableYear);
    if (!purchasesByYear.has(year)) purchasesByYear.set(year, []);
    purchasesByYear.get(year)!.push(prop);
  });

  // Purchase schedule for chart display (rounded years)
  const purchaseSchedule: Record<number, ResolvedProperty[]> = {};
  resolvedProperties.forEach(rp => {
    const chartYear = Math.round(rp.prop.affordableYear);
    if (!purchaseSchedule[chartYear]) purchaseSchedule[chartYear] = [];
    purchaseSchedule[chartYear].push(rp);
  });

  // ── Output accumulators ──
  const portfolioGrowthData: PortfolioGrowthDataPoint[] = [];
  const cashflowData: CashflowDataPoint[] = [];
  const roadmapYears: YearData[] = [];

  // Running state for roadmap funding tracking (from useRoadmapData SSOT)
  let runningCashBalance = profile.depositPool;
  let runningSavingsBalance = 0;
  let cumulativeEquityUsed = 0;
  let cumulativeSavingsSpent = 0;
  let salesProceedsCash = 0;
  const salesCgtBreakdown: SaleCgtRow[] = [];

  // Per-property cashflow snapshots
  const cashflowSnapshots = new Map<number, YearCashflowSnapshot>();

  // Per-property projection accumulators
  // (built incrementally during the main loop to use the SAME growth logic)
  interface PropertyProjectionAccumulator {
    yearRows: PerPropertyYearRow[];
    equityOverTime: Array<{ year: number; propertyValue: number; loanBalance: number; equity: number }>;
    cashflowOverTime: Array<{ year: number; grossIncome: number; totalExpenses: number; loanInterest: number; netCashflow: number }>;
    netCashflowCumulative: number;
    capitalGrowthCumulative: number;
    capitalReturnedInYears: number;
    prevValue: number;
    loanBalance: number;
    totalCashInvested: number;
    propertyTitle: string;
    purchaseYear: number;
  }
  const propertyAccumulators = new Map<string, PropertyProjectionAccumulator>();

  // A planned property is "sold" (dropped from value/debt/rent/cashflow/equity)
  // once the year reaches its instance saleYear. Mirrors `ep.saleYear` handling
  // for existing properties.
  const isPlannedSold = (rp: ResolvedProperty, atYear: number): boolean => {
    const sy = getInstance(rp.instanceId)?.saleYear;
    return !!sy && sy > 0 && atYear >= sy;
  };

  // ── MAIN YEAR LOOP ──
  for (let year = startYear; year <= Math.max(endYear, cashflowEndYear, perPropertyEndYear); year++) {
    const yearIndex = year - startYear;
    const yearsElapsed = yearIndex;
    const periodsElapsed = yearIndex * PERIODS_PER_YEAR;

    // ── EXISTING PROPERTIES: value, debt, equity (with amortisation from Chart) ──
    let epPortfolioValue = 0;
    let epCurrentDebt = 0;
    let epRefiValue = 0;
    let epRefiDebt = 0;

    if (existingProperties.length > 0) {
      existingProperties.forEach(ep => {
        if (ep.saleYear && ep.saleYear > 0 && year >= ep.saleYear) return;
        const yearsFromPurchase = Math.max(0, year - (ep.boughtYear || BASE_YEAR));
        const grownValue = ep.currentValue * Math.pow(1 + existingGrowthRate, yearsFromPurchase);
        epPortfolioValue += grownValue;

        // Amortise existing loans (from useChartDataGenerator - more correct)
        const epRate = ep.interestRate ? ep.interestRate / 100 : defaultInterestRate;
        const amortisedLoan = calculateRemainingLoanBalance(
          ep.loan,
          yearsFromPurchase,
          epRate,
          ep.loanType ?? 'IO',
          ep.loanTerm ?? 30,
          ep.ioTermYears ?? 5,
        );
        epCurrentDebt += amortisedLoan;

        if (ep.allowEquityRelease !== false) {
          epRefiValue += grownValue;
          epRefiDebt += amortisedLoan;
        }
      });
    } else if (profile.portfolioValue > 0) {
      const grownValue = profile.portfolioValue * Math.pow(1 + existingGrowthRate, yearsElapsed);
      epPortfolioValue = grownValue;
      epCurrentDebt = profile.currentDebt;
      epRefiValue = grownValue;
      epRefiDebt = profile.currentDebt;
    }

    // ── SALE PROCEEDS (same logic, both hooks agree) ──
    existingProperties.forEach(ep => {
      if (year > cashflowEndYear || !ep.saleYear || ep.saleYear <= 0 || year !== ep.saleYear) return;
      const yearsHeld = ep.saleYear - BASE_YEAR;
      const grownValue = ep.currentValue * Math.pow(1 + existingGrowthRate, yearsHeld);
      const sellingCostsFraction = (profile.sellingCostsPercent ?? 3) / 100;
      const capitalGain = Math.max(0, grownValue - (ep.purchasePrice || ep.currentValue));
      // Current law drives the roadmap (default). calculateCgtComparison also
      // returns the proposed-reform figure for the side-by-side in PortfolioTab.
      const cgt = calculateCgtComparison({
        entity: ep.entity,
        profile,
        capitalGain,
        costBase: ep.purchasePrice || ep.currentValue,
        valueAtHoldStart: ep.currentValue,
        holdStartYear: BASE_YEAR,
        saleYear: ep.saleYear,
        isNewBuild: ep.isNewBuild,
        isConsolidationPeriod: ep.saleYear >= consolidationYear,
      });
      const cgtLiability = cgt.reform.cgt; // 2027 basis - the market already applies it
      const netProceeds = Math.max(0, grownValue * (1 - sellingCostsFraction) - ep.loan - cgtLiability);
      salesProceedsCash += netProceeds;
      salesCgtBreakdown.push({
        id: ep.id,
        name: ep.address?.trim() || `${ep.state} ${ep.boughtYear}`,
        saleYear: ep.saleYear, kind: 'existing',
        capitalGain, cgt: cgtLiability, netProceeds,
      });
    });

    // ── PLANNED PROPERTY SALE PROCEEDS (mirror of existing-property sales) ──
    resolvedProperties.forEach(rp => {
      const inst = getInstance(rp.instanceId);
      const sy = inst?.saleYear;
      if (year > cashflowEndYear || !sy || sy <= 0 || year !== sy) return;
      const purchaseYear = Math.floor(rp.prop.affordableYear);
      if (sy <= purchaseYear) return; // can't sell before/at purchase
      const yearsOwned = sy - purchaseYear;
      const periodsOwned = yearsOwned * PERIODS_PER_YEAR;
      const purchasePeriod = (purchaseYear - BASE_YEAR) * PERIODS_PER_YEAR;
      const baseValue = calculatePropertyGrowthWithEvents(
        rp.growthBasis, periodsOwned, rp.growthCurve, eventBlocks, purchasePeriod,
      );
      const grownValue = baseValue + getRenovationValueIncrease(rp.instanceId, periodsElapsed, eventBlocks);
      const costBase = rp.prop.cost;
      const sellingCostsFraction = (profile.sellingCostsPercent ?? 3) / 100;
      const capitalGain = Math.max(0, grownValue - costBase);
      // Current law drives the roadmap; calculateCgtComparison also yields the reform figure.
      const cgt = calculateCgtComparison({
        entity: inst?.entity,
        profile,
        capitalGain,
        costBase,
        valueAtHoldStart: costBase, // new purchase - no embedded pre-hold gain
        holdStartYear: purchaseYear,
        saleYear: sy,
        isNewBuild: inst?.isNewBuild,
        isConsolidationPeriod: sy >= consolidationYear,
      });
      const cgtLiability = cgt.reform.cgt; // 2027 basis - the market already applies it
      const netProceeds = Math.max(0, grownValue * (1 - sellingCostsFraction) - rp.prop.loanAmount - cgtLiability);
      salesProceedsCash += netProceeds;
      salesCgtBreakdown.push({
        id: rp.instanceId,
        name: rp.prop.title,
        saleYear: sy, kind: 'planned',
        capitalGain, cgt: cgtLiability, netProceeds,
      });
    });

    // ── NEW PROPERTIES: growth with events (from useRoadmapData - period-by-period) ──
    let newPurchasesPortfolioValue = 0;
    let newPurchasesDebt = 0;
    let refiNewValue = 0; // For equity extraction calc

    // Track portfolio value BEFORE this year's purchases (for roadmap equity calc)
    let portfolioValueBeforeThisYear = epPortfolioValue;
    let totalDebtBeforeThisYear = epCurrentDebt;
    let refiEligibleValueBeforeThisYear = epRefiValue;
    let refiEligibleDebtBeforeThisYear = epRefiDebt;

    // Properties purchased by this year (for various calculations)
    const propertiesByThisYear = resolvedProperties.filter(
      rp => rp.prop.affordableYear <= year,
    );
    const propertiesBeforeThisYear = resolvedProperties.filter(
      rp => Math.floor(rp.prop.affordableYear) < year,
    );

    propertiesByThisYear.forEach(rp => {
      if (isPlannedSold(rp, year)) return;
      const purchaseYear = Math.floor(rp.prop.affordableYear);
      const yearsOwned = year - purchaseYear;
      const periodsOwned = yearsOwned * PERIODS_PER_YEAR;
      const purchasePeriod = (purchaseYear - BASE_YEAR) * PERIODS_PER_YEAR;

      // Growth with events - period-by-period (roadmap approach, more accurate)
      const baseValue = calculatePropertyGrowthWithEvents(
        rp.growthBasis, periodsOwned, rp.growthCurve, eventBlocks, purchasePeriod,
      );
      const renovationIncrease = getRenovationValueIncrease(rp.instanceId, periodsElapsed, eventBlocks);
      const currentValue = baseValue + renovationIncrease;

      newPurchasesPortfolioValue += currentValue;
      newPurchasesDebt += rp.prop.loanAmount;
      refiNewValue += currentValue; // all new purchases eligible for refi

      if (purchaseYear < year) {
        portfolioValueBeforeThisYear += currentValue;
        totalDebtBeforeThisYear += rp.prop.loanAmount;
        refiEligibleValueBeforeThisYear += currentValue;
        refiEligibleDebtBeforeThisYear += rp.prop.loanAmount;
      }
    });

    const totalPortfolioValue = epPortfolioValue + newPurchasesPortfolioValue;
    const totalDebt = epCurrentDebt + newPurchasesDebt;
    const propertyEquity = totalPortfolioValue - totalDebt;
    const totalEquity = propertyEquity + salesProceedsCash;

    // ── CASHFLOW (unified, using profile overrides from Chart) ──
    let totalRentalIncome = 0;
    let totalExpenses = 0;
    let totalLoanPayments = 0;
    // After-tax modelling: negative-gearing benefit added to the displayed
    // cashflow line, and (new builds only) the display-only BC uplift.
    let totalNgBenefit = 0;
    let newBuildBcUpliftAnnual = 0;

    // Expense breakdown accumulators for roadmap
    let accCouncilRatesWater = 0;
    let accStrataFees = 0;
    let accInsurance = 0;
    let accManagementFees = 0;
    let accRepairsMaintenance = 0;
    let accLandTax = 0;

    // Existing property cashflow
    existingProperties.forEach(ep => {
      if (ep.saleYear && year >= ep.saleYear) return;
      const epInstance = convertExistingToInstance(ep, profile.interestRate ?? 0.0625);
      const rentEscFactor = Math.pow(1 + (profile.rentEscalationRate ?? 0.05), yearsElapsed);
      const inflFactor = Math.pow(1 + profileInflation, yearsElapsed);

      const breakdown = calculateDetailedCashflow(epInstance, ep.loan, profileVacancyRate);
      const adjustedGrossIncome = breakdown.grossAnnualIncome * rentEscFactor;
      const adjustedVacancy = breakdown.vacancyAmount * rentEscFactor;
      const adjustedIncome = adjustedGrossIncome - adjustedVacancy;

      const adjustedManagement = breakdown.propertyManagementFee * rentEscFactor;
      const adjustedInsurance = breakdown.buildingInsurance * inflFactor;
      const adjustedCouncil = breakdown.councilRatesWater * inflFactor;
      const adjustedStrata = breakdown.strata * inflFactor;
      const adjustedMaintenance = breakdown.maintenance * inflFactor;
      const opExpenses = adjustedManagement + adjustedInsurance + adjustedCouncil + adjustedStrata + adjustedMaintenance;
      const adjNonDeductible = breakdown.totalNonDeductibleExpenses * inflFactor;
      const propTotalExpenses = opExpenses + adjNonDeductible;

      totalRentalIncome += adjustedIncome;
      totalExpenses += propTotalExpenses;
      totalLoanPayments += breakdown.loanInterest;

      // After-tax: negative-gearing benefit. Existing holdings are
      // grandfathered (buyYear in the past → never ring-fenced), so they keep
      // the benefit whether new build or established.
      const epDeductibleExpenses = opExpenses + breakdown.loanInterest + (breakdown.landTax ?? 0) * inflFactor;
      const epNg = calculateNegativeGearingBenefit({
        propertyCost: ep.purchasePrice || ep.currentValue || 0,
        annualRentNet: adjustedIncome,
        deductibleExpenses: epDeductibleExpenses,
        isNewBuild: !!ep.isNewBuild,
        buyYear: ep.boughtYear || 0,
        marginalRate: profile.marginalTaxRate ?? 0.45,
      });
      totalNgBenefit += epNg.ngBenefit;

      accCouncilRatesWater += adjustedCouncil;
      accStrataFees += adjustedStrata;
      accInsurance += adjustedInsurance;
      accManagementFees += adjustedManagement;
      accRepairsMaintenance += adjustedMaintenance;
      accLandTax += (breakdown.landTax ?? 0) * inflFactor;
    });

    // New property cashflow + per-property projection accumulation
    const perPropertyCashflowEntries: PropertyCashflowEntry[] = [];

    propertiesByThisYear.forEach((rp, idx) => {
      if (isPlannedSold(rp, year)) return;
      const purchaseYear = Math.floor(rp.prop.affordableYear);
      const yearsOwned = year - purchaseYear;
      const periodsOwned = yearsOwned * PERIODS_PER_YEAR;
      const purchasePeriod = (purchaseYear - BASE_YEAR) * PERIODS_PER_YEAR;

      // Property effective rate (event-adjusted, property-specific)
      const propertyEffectiveRate = getPropertyEffectiveRate(periodsElapsed, eventBlocks, rp.instanceId);

      // Growth (same calculation as portfolio value above - consistent)
      const baseValue = calculatePropertyGrowthWithEvents(
        rp.growthBasis, periodsOwned, rp.growthCurve, eventBlocks, purchasePeriod,
      );
      const renovationIncrease = getRenovationValueIncrease(rp.instanceId, periodsElapsed, eventBlocks);
      const currentValue = baseValue + renovationIncrease;

      const propertyInstance = getInstance(rp.instanceId);

      if (propertyInstance) {
        const inflationFactor = Math.pow(1 + profileInflation, yearsOwned);
        const rentEscalationFactor = Math.pow(1 + (profile.rentEscalationRate ?? 0.05), yearsOwned);

        const breakdown = calculateDetailedCashflow(propertyInstance, rp.prop.loanAmount, profileVacancyRate);
        const adjustedLoanInterest = rp.prop.loanAmount * propertyEffectiveRate;

        const adjustedGrossIncome = breakdown.grossAnnualIncome * rentEscalationFactor;
        const adjustedVacancy = breakdown.vacancyAmount * rentEscalationFactor;
        const adjustedIncome = adjustedGrossIncome - adjustedVacancy;

        const adjustedManagement = breakdown.propertyManagementFee * rentEscalationFactor;
        const adjustedInsurance = breakdown.buildingInsurance * inflationFactor;
        const adjustedCouncil = breakdown.councilRatesWater * inflationFactor;
        const adjustedStrata = breakdown.strata * inflationFactor;
        const adjustedMaintenance = breakdown.maintenance * inflationFactor;
        const opExpenses = adjustedManagement + adjustedInsurance + adjustedCouncil + adjustedStrata + adjustedMaintenance;
        const adjNonDeductible = breakdown.totalNonDeductibleExpenses * inflationFactor;
        const propTotalExpenses = opExpenses + adjNonDeductible;
        const adjustedDeductions = breakdown.potentialDeductions;

        const propertyCashflow = adjustedIncome - propTotalExpenses - adjustedLoanInterest + adjustedDeductions;

        // After-tax: negative-gearing benefit for this planned purchase.
        // Established purchases (dated post-reform) are ring-fenced → $0; new
        // builds keep the wage offset and also lift displayed borrowing capacity.
        const npDeductibleExpenses = opExpenses + adjustedLoanInterest + (breakdown.landTax ?? 0) * inflationFactor;
        const npNg = calculateNegativeGearingBenefit({
          propertyCost: rp.prop.cost,
          annualRentNet: adjustedIncome,
          deductibleExpenses: npDeductibleExpenses,
          isNewBuild: !!propertyInstance.isNewBuild,
          buyYear: purchaseYear,
          marginalRate: profile.marginalTaxRate ?? 0.45,
        });
        totalNgBenefit += npNg.ngBenefit;
        if (propertyInstance.isNewBuild) {
          newBuildBcUpliftAnnual += calculateNewBuildBcUplift(
            npNg.ngBenefit,
            profile.salaryServiceabilityMultiplier ?? 6.0,
          );
        }

        totalRentalIncome += adjustedIncome;
        totalExpenses += propTotalExpenses - adjustedDeductions;
        totalLoanPayments += adjustedLoanInterest;

        // Expense breakdown for roadmap
        accCouncilRatesWater += adjustedCouncil;
        accStrataFees += adjustedStrata;
        accInsurance += adjustedInsurance;
        accManagementFees += adjustedManagement;
        accRepairsMaintenance += adjustedMaintenance;
        accLandTax += (breakdown.landTax ?? 0) * inflationFactor;

        // Per-property cashflow for PortfolioCashflow component
        if (rp.prop.status === 'feasible' && yearsOwned >= 0) {
          perPropertyCashflowEntries.push({
            title: rp.prop.title,
            instanceId: rp.instanceId,
            color: PROPERTY_COLORS[idx % PROPERTY_COLORS.length],
            purchaseYear,
            grossIncome: Math.round(adjustedIncome),
            totalOutgoings: Math.round(propTotalExpenses - adjustedDeductions + adjustedLoanInterest),
            netCashflow: Math.round(propertyCashflow),
          });
        }

        // ── Per-property projection accumulator (replaces calculatePerPropertyProjection) ──
        if (yearsOwned >= 1) {
          let acc = propertyAccumulators.get(rp.instanceId);
          if (!acc) {
            // totalCashRequired is the affordability calculator's canonical
            // all-in figure (deposit + stamp duty + LMI + other costs). Use it
            // directly so RoIC / cash-on-cash / payback match the Purchase tab.
            // Do NOT add depositRequired on top: acquisitionCosts.total already
            // includes the deposit, so summing them double-counts it.
            const totalCashInvested =
              rp.prop.totalCashRequired ??
              rp.prop.acquisitionCosts?.total ??
              rp.prop.depositRequired;
            acc = {
              yearRows: [],
              equityOverTime: [],
              cashflowOverTime: [],
              netCashflowCumulative: 0,
              capitalGrowthCumulative: 0,
              capitalReturnedInYears: 30,
              prevValue: rp.prop.cost,
              loanBalance: rp.prop.loanAmount,
              totalCashInvested,
              propertyTitle: rp.prop.title,
              purchaseYear,
            };
            propertyAccumulators.set(rp.instanceId, acc);
          }

          // Loan amortisation - handles the IO→PI transition (IO term then P&I
          // paydown). Recompute from the original loan each year via the canonical
          // helper so the IO term is respected; the previous P&I-only path left IO
          // loans flat forever and never started principal paydown after the IO term.
          acc.loanBalance = calculateRemainingLoanBalance(
            rp.prop.loanAmount,
            yearsOwned,
            rp.interestRate,
            rp.loanType,
            rp.loanTerm,
            rp.ioTermYears,
          );

          const equity = currentValue - acc.loanBalance;
          acc.equityOverTime.push({
            year: yearsOwned,
            propertyValue: Math.round(currentValue),
            loanBalance: Math.round(acc.loanBalance),
            equity: Math.round(equity),
          });

          // Cashflow for this property (using event-adjusted values - consistent with portfolio)
          const propNetCashflow = propertyCashflow;
          acc.cashflowOverTime.push({
            year: yearsOwned,
            grossIncome: Math.round(adjustedIncome),
            totalExpenses: Math.round(propTotalExpenses - adjustedDeductions),
            loanInterest: Math.round(adjustedLoanInterest),
            netCashflow: Math.round(propNetCashflow),
          });

          // Year row metrics
          acc.netCashflowCumulative += propNetCashflow;
          const capitalGrowthAnnual = currentValue - acc.prevValue;
          acc.capitalGrowthCumulative += capitalGrowthAnnual;
          const totalPerformance = acc.capitalGrowthCumulative + acc.netCashflowCumulative;
          const cocReturnCumulative = acc.totalCashInvested > 0
            ? (acc.netCashflowCumulative / acc.totalCashInvested) * 100
            : 0;
          const roicYear = acc.totalCashInvested > 0
            ? (totalPerformance / acc.totalCashInvested) * 100
            : 0;
          const grossYieldPct = currentValue > 0
            ? (adjustedIncome / currentValue) * 100
            : 0;

          if (acc.capitalReturnedInYears === 30 && totalPerformance >= acc.totalCashInvested) {
            acc.capitalReturnedInYears = yearsOwned;
          }

          acc.yearRows.push({
            year: yearsOwned,
            yearLabel: (purchaseYear + yearsOwned).toString(),
            propertyValue: Math.round(currentValue),
            loanBalance: Math.round(acc.loanBalance),
            equity: Math.round(equity),
            grossIncome: Math.round(adjustedIncome),
            grossYieldPct,
            interestExpense: Math.round(adjustedLoanInterest),
            operatingExpenses: Math.round(propTotalExpenses - adjustedDeductions),
            netCashflow: Math.round(propNetCashflow),
            netCashflowCumulative: Math.round(acc.netCashflowCumulative),
            monthlyCost: Math.round(propNetCashflow / 12),
            capitalGrowthAnnual: Math.round(capitalGrowthAnnual),
            capitalGrowthCumulative: Math.round(acc.capitalGrowthCumulative),
            totalPerformance: Math.round(totalPerformance),
            cocReturnCumulative,
            roic: roicYear,
          });

          acc.prevValue = currentValue;
        }
      } else {
        // Fallback (no property instance)
        const fallbackInstance = getPropertyInstanceDefaults(rp.prop.title);
        fallbackInstance.purchasePrice = rp.prop.cost;
        const propertyData = getPropertyData(rp.prop.title, undefined);
        if (propertyData) {
          const yieldRate = parseFloat(propertyData.yield) / 100;
          fallbackInstance.rentPerWeek = Math.round((rp.prop.cost * yieldRate) / 52);
        }
        const fallbackBreakdown = calculateDetailedCashflow(fallbackInstance, rp.prop.loanAmount, profileVacancyRate);
        const adjustedLoanInterest = rp.prop.loanAmount * propertyEffectiveRate;
        const inflationFactor = Math.pow(1 + profileInflation, yearsOwned);
        const fallbackRentEsc = Math.pow(1 + (profile.rentEscalationRate ?? 0.05), yearsOwned);
        const fallbackExpenses = (
          fallbackBreakdown.propertyManagementFee +
          fallbackBreakdown.buildingInsurance +
          fallbackBreakdown.councilRatesWater +
          fallbackBreakdown.strata +
          fallbackBreakdown.maintenance +
          fallbackBreakdown.totalNonDeductibleExpenses -
          fallbackBreakdown.potentialDeductions
        ) * inflationFactor;
        const adjustedCashflow =
          (fallbackBreakdown.netAnnualCashflow + fallbackBreakdown.loanInterest) * fallbackRentEsc - adjustedLoanInterest;

        totalRentalIncome += fallbackBreakdown.adjustedIncome * fallbackRentEsc;
        totalExpenses += fallbackExpenses;
        totalLoanPayments += adjustedLoanInterest;
      }
    });

    // Displayed cashflow is AFTER-TAX: pre-tax net + negative-gearing benefit.
    // Established baseline ≈ pre-tax (ring-fenced); new builds sit above it.
    const totalCashflow = totalRentalIncome - totalExpenses - totalLoanPayments + totalNgBenefit;

    // ── Per-property cashflow snapshot ──
    if (year <= cashflowEndYear && perPropertyCashflowEntries.length > 0) {
      const totalIn = perPropertyCashflowEntries.reduce((s, p) => s + p.grossIncome, 0);
      const totalOut = perPropertyCashflowEntries.reduce((s, p) => s + p.totalOutgoings, 0);
      cashflowSnapshots.set(year, {
        year,
        properties: perPropertyCashflowEntries,
        totalIn,
        totalOut,
        netAnnual: totalIn - totalOut,
        netMonthly: Math.round((totalIn - totalOut) / 12),
      });
    }

    // ── BORROWING CAPACITY (from useChartDataGenerator - most sophisticated) ──
    let grossRentalIncomeForBC = 0;
    propertiesByThisYear.forEach(rp => {
      if (isPlannedSold(rp, year)) return;
      const inst = getInstance(rp.instanceId);
      if (inst?.rentPerWeek) {
        const yearsHeld = Math.max(0, year - rp.prop.affordableYear);
        const rentEsc = Math.pow(1 + (profile.rentEscalationRate ?? 0.05), yearsHeld);
        grossRentalIncomeForBC += inst.rentPerWeek * 52 * rentEsc;
      }
    });
    existingProperties.forEach(ep => {
      if (ep.saleYear && ep.saleYear > 0 && year >= ep.saleYear) return;
      const rentEsc = Math.pow(1 + (profile.rentEscalationRate ?? 0.05), yearsElapsed);
      grossRentalIncomeForBC += ep.rentPerWeek * 52 * rentEsc;
    });

    const chartPeriod = periodsElapsed + 1;
    const borrowingCeiling = calculateBorrowingCeiling(chartPeriod, {
      statedBC: profile.borrowingCapacity ?? 0,
      baseSalary: profile.baseSalary ?? 60000,
      salaryMultiplier: profile.salaryServiceabilityMultiplier ?? 6.0,
      wageGrowth: profileWageGrowth,
      grossRentalIncome: grossRentalIncomeForBC,
      eventBlocks,
    });

    let entityDiscountedDebt = 0;
    propertiesByThisYear.forEach(rp => {
      if (isPlannedSold(rp, year)) return;
      const inst = getInstance(rp.instanceId);
      const factor = ENTITY_SERVICEABILITY_FACTORS[inst?.entity ?? 'individual'] ?? 1.0;
      entityDiscountedDebt += rp.prop.loanAmount * factor;
    });
    if (existingProperties.length > 0) {
      existingProperties.forEach(ep => {
        if (ep.saleYear && ep.saleYear > 0 && chartPeriod >= (ep.saleYear - BASE_YEAR) * PERIODS_PER_YEAR + 1) return;
        if (ep.entity === 'smsf') return;
        const factor = ENTITY_SERVICEABILITY_FACTORS[ep.entity ?? 'individual'] ?? 1.0;
        entityDiscountedDebt += ep.loan * factor;
      });
    } else {
      entityDiscountedDebt += profile.currentDebt;
    }
    // Display ceiling includes the new-build NG uplift (gating does not).
    const borrowingCapacity = Math.round(Math.max(0, borrowingCeiling + newBuildBcUpliftAnnual - entityDiscountedDebt));

    // ── AVAILABLE FUNDS (from useChartDataGenerator for chart, from useRoadmapData for roadmap) ──
    // Chart-style available funds (deposit + cumulative savings + usable equity)
    const refiPortfolioValue = epRefiValue * Math.pow(1 + existingGrowthRate, yearsElapsed) / (epRefiValue || 1) * epRefiValue + refiNewValue;
    // Simpler: recalculate refi values
    const chartRefiExistingGrown = existingProperties.length > 0
      ? epRefiValue
      : (profile.portfolioValue > 0 ? profile.portfolioValue * Math.pow(1 + existingGrowthRate, yearsElapsed) : 0);
    const chartRefiPortfolioValue = chartRefiExistingGrown + newPurchasesPortfolioValue;
    const chartRefiTotalDebt = epRefiDebt + newPurchasesDebt;
    const usableEquity = Math.max(0, chartRefiPortfolioValue * EQUITY_EXTRACTION_LVR_CAP - chartRefiTotalDebt);
    const cumulativeSavings = yearsElapsed > 0 && profileWageGrowth > 0
      ? profile.annualSavings * (Math.pow(1 + profileWageGrowth, yearsElapsed) - 1) / profileWageGrowth
      : profile.annualSavings * yearsElapsed;
    const depositsUsed = propertiesByThisYear.reduce((sum, rp) => sum + rp.prop.depositRequired, 0);
    const availableFundsChart = Math.round(Math.max(0, profile.depositPool + cumulativeSavings + usableEquity - depositsUsed));
    const cashOffset = Math.round(Math.max(0, profile.depositPool + cumulativeSavings - depositsUsed + salesProceedsCash));

    // ── DO-NOTHING BASELINE (from useChartDataGenerator - wage-grown savings) ──
    const doNothingBalance = (() => {
      let balance = profile.depositPool;
      for (let y = 0; y < yearsElapsed; y++) {
        const yearSavings = profile.annualSavings * Math.pow(1 + profileWageGrowth, y);
        balance = balance * (1 + SAVINGS_INTEREST_RATE) + yearSavings;
      }
      return Math.round(balance);
    })();

    // ── CHART DATA POINT ──
    if (year <= endYear) {
      const purchasesThisYearForChart = purchaseSchedule[year] || [];
      const propertiesPurchased = purchasesThisYearForChart.length > 0
        ? purchasesThisYearForChart.map(rp => rp.prop.title)
        : undefined;

      portfolioGrowthData.push({
        year: year.toString(),
        portfolioValue: Math.round(totalPortfolioValue),
        propertyEquity: Math.round(propertyEquity),
        equity: Math.round(totalEquity),
        properties: propertiesPurchased,
        doNothingBalance,
        totalDebt: Math.round(totalDebt),
        availableFunds: availableFundsChart,
        borrowingCapacity,
        newBuildBcUplift: Math.round(newBuildBcUpliftAnnual),
        cashFromSales: Math.round(salesProceedsCash),
        cashOffset,
        entityDiscountedDebt: Math.round(entityDiscountedDebt),
      });
    }

    // ── CASHFLOW DATA POINT ──
    if (year <= cashflowEndYear) {
      cashflowData.push({
        year: year.toString(),
        cashflow: Math.round(totalCashflow),
        rentalIncome: Math.round(totalRentalIncome),
        expenses: Math.round(totalExpenses),
        loanRepayments: Math.round(totalLoanPayments),
        highlight: totalCashflow >= 0 && year === startYear + Math.floor(profile.timelineYears / 2),
      });
    }

    // ── ROADMAP YEAR DATA (funding tracking from useRoadmapData SSOT) ──
    if (year <= endYear) {
      const purchasesThisYear = purchasesByYear.get(year);
      const purchaseFundingBreakdowns = new Map<string, FundingBreakdown>();
      const effectiveInterestRate = getEffectiveInterestRate(periodsElapsed, eventBlocks);
      const extractableEquity = profile.useExistingEquity
        ? Math.max(0, refiEligibleValueBeforeThisYear * EQUITY_EXTRACTION_LVR_CAP - refiEligibleDebtBeforeThisYear)
        : 0;

      // Start-of-year values for roadmap
      const firstPurchaseThisYear = purchasesThisYear?.[0];
      const startOfYearCash = firstPurchaseThisYear
        ? firstPurchaseThisYear.baseDeposit
        : runningCashBalance;
      const grossSavingsAccumulated = yearIndex > 0
        ? profile.annualSavings * SAVINGS_DEPLOYMENT_RATE * yearIndex
        : 0;
      const startOfYearSavings = Math.max(0, grossSavingsAccumulated - cumulativeSavingsSpent);
      const startOfYearEquity = firstPurchaseThisYear
        ? firstPurchaseThisYear.equityRelease
        : Math.max(0, extractableEquity - cumulativeEquityUsed);

      if (purchasesThisYear && purchasesThisYear.length > 0) {
        purchasesThisYear.forEach(purchase => {
          const funding = purchase.fundingBreakdown;
          purchaseFundingBreakdowns.set(purchase.instanceId, {
            cash: funding.cash,
            savings: funding.savings,
            equity: funding.equity,
            totalCashRequired: funding.total,
          });
          cumulativeSavingsSpent += funding.savings;
        });
        const lastPurchase = purchasesThisYear[purchasesThisYear.length - 1];
        runningCashBalance = lastPurchase.balancesAfterPurchase.cash;
        runningSavingsBalance = lastPurchase.balancesAfterPurchase.savings;
        cumulativeEquityUsed = lastPurchase.balancesAfterPurchase.equityUsed;
      } else {
        const annualSavingsContribution = profile.annualSavings * SAVINGS_DEPLOYMENT_RATE;
        // Cashflow from properties purchased before this year
        let netCashflowFromPriorProps = 0;
        existingProperties.forEach(ep => {
          if (ep.saleYear && ep.saleYear > 0 && year >= ep.saleYear) return;
          const epInst = convertExistingToInstance(ep, profile.interestRate ?? 0.0625);
          const epYears = year - BASE_YEAR;
          const epRentEsc = Math.pow(1 + (profile.rentEscalationRate ?? 0.05), epYears);
          const epInfl = Math.pow(1 + profileInflation, epYears);
          const epCf = calculateDetailedCashflow(epInst, ep.loan);
          netCashflowFromPriorProps += epCf.adjustedIncome * epRentEsc - epCf.loanInterest - epCf.totalOperatingExpenses * epInfl;
        });
        propertiesBeforeThisYear.forEach(rp => {
          if (isPlannedSold(rp, year)) return;
          const pYear = Math.floor(rp.prop.affordableYear);
          const yearsOwned = year - pYear;
          const propRentEsc = Math.pow(1 + (profile.rentEscalationRate ?? 0.05), yearsOwned);
          const propInfl = Math.pow(1 + profileInflation, yearsOwned);
          const propEffRate = getPropertyEffectiveRate(periodsElapsed, eventBlocks, rp.instanceId);
          netCashflowFromPriorProps += rp.prop.grossRentalIncome * propRentEsc - rp.prop.loanAmount * propEffRate - rp.prop.expenses * propInfl;
        });
        const cashflowDeduction = netCashflowFromPriorProps < 0 ? netCashflowFromPriorProps : 0;
        if (yearIndex > 0) {
          runningSavingsBalance = Math.max(0, runningSavingsBalance + annualSavingsContribution + cashflowDeduction);
        }
      }

      const roadmapAvailableFunds = startOfYearCash + startOfYearSavings + startOfYearEquity;

      // Test statuses
      let depositStatus: 'pass' | 'fail' | 'na' = 'na';
      let borrowingStatusRM: 'pass' | 'fail' | 'na' = 'na';
      let serviceabilityStatus: 'pass' | 'fail' | 'na' = 'na';
      let purchaseInYear = false;
      let purchaseDetails: PurchaseDetail[] | undefined;
      let yearBreakdownData: YearBreakdownData | undefined;

      if (purchasesThisYear && purchasesThisYear.length > 0) {
        purchaseInYear = true;
        const firstPurchase = purchasesThisYear[0];
        depositStatus = firstPurchase.depositTestPass ? 'pass' : 'fail';
        serviceabilityStatus = firstPurchase.serviceabilityTestPass ? 'pass' : 'fail';
        borrowingStatusRM = firstPurchase.borrowingCapacityRemaining >= 0 ? 'pass' : 'fail';

        purchaseDetails = purchasesThisYear.map(purchase => {
          const funding = purchaseFundingBreakdowns.get(purchase.instanceId) || {
            cash: 0, savings: 0, equity: 0,
            totalCashRequired: purchase.totalCashRequired || purchase.depositRequired,
          };
          return {
            propertyTitle: purchase.title,
            cost: purchase.cost,
            depositRequired: purchase.depositRequired,
            totalCashRequired: purchase.totalCashRequired || purchase.depositRequired,
            loanAmount: purchase.loanAmount,
            instanceId: purchase.instanceId,
            propertyType: purchase.title,
            fundingBreakdown: funding,
          };
        });

        // Build YearBreakdownData for purchase years
        const existingDebt = totalDebt - firstPurchase.loanAmount;
        const newDebt = firstPurchase.loanAmount;
        const existingLoanInterest = existingDebt * effectiveInterestRate;
        const newLoanInterest = newDebt * effectiveInterestRate;
        const baseServiceabilityCapacity = profile.borrowingCapacity * SERVICEABILITY_FACTOR;
        const rentalServiceabilityContribution = totalRentalIncome * RENTAL_SERVICEABILITY_CONTRIBUTION_RATE;
        const equityBoost = extractableEquity * profile.equityFactor;
        const effectiveCapacity = profile.borrowingCapacity + equityBoost;
        const lvr = totalPortfolioValue > 0 ? (totalDebt / totalPortfolioValue) * 100 : 0;
        const dsr = (baseServiceabilityCapacity + rentalServiceabilityContribution) > 0
          ? ((existingLoanInterest + newLoanInterest) / (baseServiceabilityCapacity + rentalServiceabilityContribution)) * 100
          : 0;

        const allPortfolioProperties = propertiesByThisYear.map(rp => {
          const pYear = Math.floor(rp.prop.affordableYear);
          const pYearsOwned = year - pYear;
          const pPeriodsOwned = pYearsOwned * PERIODS_PER_YEAR;
          const pPurchasePeriod = (pYear - BASE_YEAR) * PERIODS_PER_YEAR;
          const pBaseValue = calculatePropertyGrowthWithEvents(rp.growthBasis, pPeriodsOwned, rp.growthCurve, eventBlocks, pPurchasePeriod);
          const pRenInc = getRenovationValueIncrease(rp.instanceId, periodsElapsed, eventBlocks);
          const pCurrentValue = pBaseValue + pRenInc;
          const halfYear = rp.prop.affordableYear % 1 >= 0.5 ? 'H2' : 'H1';
          return {
            propertyId: rp.instanceId,
            propertyType: rp.prop.title,
            purchaseYear: pYear,
            displayPeriod: `${pYear} ${halfYear}`,
            originalCost: rp.prop.cost,
            currentValue: pCurrentValue,
            loanAmount: rp.prop.loanAmount,
            equity: pCurrentValue - rp.prop.loanAmount,
            extractableEquity: Math.max(0, pCurrentValue * EQUITY_EXTRACTION_LVR_CAP - rp.prop.loanAmount),
          };
        });

        yearBreakdownData = {
          period: periodsElapsed + 1,
          year,
          displayYear: yearIndex,
          displayPeriod: `${year} H1`,
          status: 'purchased',
          propertyNumber: propertiesByThisYear.length,
          propertyType: firstPurchase.title,
          portfolioValue: totalPortfolioValue,
          totalEquity,
          totalDebt,
          extractableEquity,
          availableDeposit: roadmapAvailableFunds,
          annualCashFlow: totalCashflow,
          baseDeposit: startOfYearCash,
          cumulativeSavings: startOfYearSavings,
          cashflowReinvestment: 0,
          equityRelease: startOfYearEquity,
          annualSavingsRate: profile.annualSavings,
          totalAnnualCapacity: profile.annualSavings + Math.max(0, totalCashflow),
          grossRental: totalRentalIncome,
          loanRepayments: totalLoanPayments,
          expenses: totalExpenses,
          expenseBreakdown: {
            councilRatesWater: accCouncilRatesWater,
            strataFees: accStrataFees,
            insurance: accInsurance,
            managementFees: accManagementFees,
            repairsMaintenance: accRepairsMaintenance,
            landTax: accLandTax,
            other: 0,
          },
          requiredDeposit: purchasesThisYear.reduce((sum, p) => sum + p.depositRequired, 0),
          requiredLoan: purchasesThisYear.reduce((sum, p) => sum + p.loanAmount, 0),
          propertyCost: purchasesThisYear.reduce((sum, p) => sum + p.cost, 0),
          availableBorrowingCapacity: Math.max(0, effectiveCapacity - totalDebt),
          borrowingCapacity: profile.borrowingCapacity,
          equityBoost,
          effectiveCapacity,
          equityFactor: profile.equityFactor,
          existingDebt,
          newDebt,
          existingLoanInterest,
          newLoanInterest,
          baseServiceabilityCapacity,
          rentalServiceabilityContribution,
          interestRate: defaultInterestRate * 100,
          rentalRecognition: 80,
          depositTest: {
            pass: firstPurchase.depositTestPass,
            surplus: firstPurchase.depositTestSurplus,
            available: firstPurchase.availableFundsUsed,
            required: firstPurchase.totalCashRequired,
          },
          borrowingCapacityTest: {
            pass: firstPurchase.borrowingCapacityRemaining >= 0,
            surplus: firstPurchase.borrowingCapacityRemaining,
            available: effectiveCapacity,
            required: totalDebt,
          },
          serviceabilityTest: {
            pass: firstPurchase.serviceabilityTestPass,
            surplus: firstPurchase.serviceabilityTestSurplus,
            available: baseServiceabilityCapacity + rentalServiceabilityContribution,
            required: existingLoanInterest + newLoanInterest,
          },
          gapRule: firstPurchase.isGapRuleBlocked || false,
          equityReleaseYear: extractableEquity > 0,
          portfolioScaling: propertiesByThisYear.length,
          selfFundingEfficiency: firstPurchase.cost > 0 ? (totalCashflow / firstPurchase.cost) * 100 : 0,
          equityRecyclingImpact: totalPortfolioValue > 0 ? (totalEquity / totalPortfolioValue) * 100 : 0,
          dsr,
          lvr,
          purchases: purchasesThisYear.map(purchase => ({
            propertyId: purchase.instanceId,
            propertyType: purchase.title,
            cost: purchase.cost,
            deposit: purchase.depositRequired,
            loanAmount: purchase.loanAmount,
            loanType: purchase.loanType || 'IO',
            year,
            displayPeriod: `${year} H1`,
            currentValue: purchase.cost,
            equity: purchase.cost - purchase.loanAmount,
            extractableEquity: Math.max(0, purchase.cost * EQUITY_EXTRACTION_LVR_CAP - purchase.loanAmount),
            stampDuty: purchase.acquisitionCosts?.stampDuty || 0,
            lmi: purchase.acquisitionCosts?.lmi || 0,
            legalFees: purchase.acquisitionCosts?.legalFees || 0,
            inspectionFees: purchase.acquisitionCosts?.inspectionFees || 0,
            otherFees: purchase.acquisitionCosts?.otherFees || 0,
            totalCashRequired: purchase.totalCashRequired,
          })),
          allPortfolioProperties,
        };
      } else if (year > BASE_YEAR) {
        // Non-purchase year hypothetical tests
        const equityBoost = extractableEquity * profile.equityFactor;
        const effectiveBorrowingCapacity = profile.borrowingCapacity + equityBoost;
        const remainingBorrowingCapacity = Math.max(0, effectiveBorrowingCapacity - totalDebt);
        const baseCapacity = profile.borrowingCapacity * SERVICEABILITY_FACTOR;
        const rentalContribution = totalRentalIncome * RENTAL_SERVICEABILITY_CONTRIBUTION_RATE;
        const enhancedServiceabilityCapacity = baseCapacity + rentalContribution;

        const hypotheticalPropertyCost = 500000;
        const hypotheticalDeposit = hypotheticalPropertyCost * (1 - EQUITY_EXTRACTION_LVR_CAP);
        const hypotheticalLoan = hypotheticalPropertyCost * EQUITY_EXTRACTION_LVR_CAP;
        const hypotheticalLoanPayment = hypotheticalLoan * effectiveInterestRate;

        const depositTestPass = roadmapAvailableFunds >= hypotheticalDeposit;
        depositStatus = depositTestPass ? 'pass' : 'fail';
        const borrowingTestPass = remainingBorrowingCapacity >= hypotheticalLoan;
        borrowingStatusRM = borrowingTestPass ? 'pass' : 'fail';
        const totalPaymentsWithNew = totalLoanPayments + hypotheticalLoanPayment;
        const serviceabilityTestPass = enhancedServiceabilityCapacity >= totalPaymentsWithNew;
        serviceabilityStatus = serviceabilityTestPass ? 'pass' : 'fail';

        const existingLoanInterest = totalDebt * effectiveInterestRate;
        const lvr = totalPortfolioValue > 0 ? (totalDebt / totalPortfolioValue) * 100 : 0;
        const dsr = enhancedServiceabilityCapacity > 0
          ? (totalLoanPayments / enhancedServiceabilityCapacity) * 100
          : 0;

        const allPortfolioProperties = propertiesByThisYear.map(rp => {
          const pYear = Math.floor(rp.prop.affordableYear);
          const pYearsOwned = year - pYear;
          const pPeriodsOwned = pYearsOwned * PERIODS_PER_YEAR;
          const pPurchasePeriod = (pYear - BASE_YEAR) * PERIODS_PER_YEAR;
          const pBaseValue = calculatePropertyGrowthWithEvents(rp.growthBasis, pPeriodsOwned, rp.growthCurve, eventBlocks, pPurchasePeriod);
          const pRenInc = getRenovationValueIncrease(rp.instanceId, periodsElapsed, eventBlocks);
          const pCurrentValue = pBaseValue + pRenInc;
          const halfYear = rp.prop.affordableYear % 1 >= 0.5 ? 'H2' : 'H1';
          return {
            propertyId: rp.instanceId,
            propertyType: rp.prop.title,
            purchaseYear: pYear,
            displayPeriod: `${pYear} ${halfYear}`,
            originalCost: rp.prop.cost,
            currentValue: pCurrentValue,
            loanAmount: rp.prop.loanAmount,
            equity: pCurrentValue - rp.prop.loanAmount,
            extractableEquity: Math.max(0, pCurrentValue * EQUITY_EXTRACTION_LVR_CAP - rp.prop.loanAmount),
          };
        });

        yearBreakdownData = {
          period: periodsElapsed + 1,
          year,
          displayYear: yearIndex,
          displayPeriod: `${year} H1`,
          status: 'waiting',
          propertyNumber: null,
          propertyType: 'Hypothetical Property',
          portfolioValue: totalPortfolioValue,
          totalEquity,
          totalDebt,
          extractableEquity,
          availableDeposit: roadmapAvailableFunds,
          annualCashFlow: totalCashflow,
          baseDeposit: startOfYearCash,
          cumulativeSavings: startOfYearSavings,
          cashflowReinvestment: 0,
          equityRelease: startOfYearEquity,
          annualSavingsRate: profile.annualSavings,
          totalAnnualCapacity: profile.annualSavings + Math.max(0, totalCashflow),
          grossRental: totalRentalIncome,
          loanRepayments: totalLoanPayments,
          expenses: totalExpenses,
          expenseBreakdown: {
            councilRatesWater: accCouncilRatesWater,
            strataFees: accStrataFees,
            insurance: accInsurance,
            managementFees: accManagementFees,
            repairsMaintenance: accRepairsMaintenance,
            landTax: accLandTax,
            other: 0,
          },
          requiredDeposit: hypotheticalDeposit,
          requiredLoan: hypotheticalLoan,
          propertyCost: hypotheticalPropertyCost,
          availableBorrowingCapacity: remainingBorrowingCapacity,
          borrowingCapacity: profile.borrowingCapacity,
          equityBoost,
          effectiveCapacity: effectiveBorrowingCapacity,
          equityFactor: profile.equityFactor,
          existingDebt: totalDebt,
          newDebt: hypotheticalLoan,
          existingLoanInterest,
          newLoanInterest: hypotheticalLoanPayment,
          baseServiceabilityCapacity: baseCapacity,
          rentalServiceabilityContribution: rentalContribution,
          interestRate: defaultInterestRate * 100,
          rentalRecognition: 80,
          depositTest: {
            pass: depositTestPass,
            surplus: roadmapAvailableFunds - hypotheticalDeposit,
            available: roadmapAvailableFunds,
            required: hypotheticalDeposit,
          },
          borrowingCapacityTest: {
            pass: borrowingTestPass,
            surplus: remainingBorrowingCapacity - hypotheticalLoan,
            available: effectiveBorrowingCapacity,
            required: totalDebt + hypotheticalLoan,
          },
          serviceabilityTest: {
            pass: serviceabilityTestPass,
            surplus: enhancedServiceabilityCapacity - totalPaymentsWithNew,
            available: enhancedServiceabilityCapacity,
            required: totalPaymentsWithNew,
          },
          gapRule: false,
          equityReleaseYear: extractableEquity > 0,
          portfolioScaling: propertiesByThisYear.length,
          selfFundingEfficiency: 0,
          equityRecyclingImpact: totalPortfolioValue > 0 ? (totalEquity / totalPortfolioValue) * 100 : 0,
          dsr,
          lvr,
          purchases: [],
          allPortfolioProperties,
        };
      }

      // Events this year
      const yearStartPeriod = yearIndex * PERIODS_PER_YEAR + 1;
      const yearEndPeriod = yearStartPeriod + PERIODS_PER_YEAR - 1;
      const eventsThisYear: EventSummary[] = eventBlocks
        .filter(e => e.period >= yearStartPeriod && e.period <= yearEndPeriod)
        .map(e => {
          const typeDef = EVENT_TYPES[e.eventType];
          return {
            id: e.id,
            eventType: e.eventType,
            category: e.category,
            label: e.label || getEventLabel(e.eventType, e.payload),
            icon: typeDef?.icon || '📅',
            period: e.period,
          };
        });

      roadmapYears.push({
        year,
        depositStatus,
        borrowingStatus: borrowingStatusRM,
        serviceabilityStatus,
        portfolioValue: formatCurrency(totalPortfolioValue),
        totalEquity: formatCurrency(totalEquity),
        availableFunds: formatCurrency(roadmapAvailableFunds),
        portfolioValueRaw: totalPortfolioValue,
        propertyEquityRaw: propertyEquity,
        totalEquityRaw: totalEquity,
        availableFundsRaw: roadmapAvailableFunds,
        totalDebt,
        propertyCount: propertiesByThisYear.length,
        annualCashflow: totalCashflow,
        grossRentalIncome: totalRentalIncome,
        totalExpenses,
        totalLoanInterest: totalLoanPayments,
        purchaseInYear,
        purchaseDetails,
        yearBreakdownData,
        events: eventsThisYear.length > 0 ? eventsThisYear : undefined,
        doNothingBalance,
        cashFromSales: Math.round(salesProceedsCash),
      });
    }
  }
  // ── END MAIN YEAR LOOP ──

  // ── Enrich portfolio data with monthly holding cost from cashflow ──
  const enrichedPortfolioData = portfolioGrowthData.map((point, index) => {
    const cf = cashflowData[index];
    if (!cf) return point;
    return { ...point, monthlyHoldingCost: Math.round(cf.cashflow / 12) };
  });

  // ── Monthly holding cost summary ──
  const finalCashflow = cashflowData[cashflowData.length - 1];
  const holdingCostByProperty = feasibleProperties.map(prop => {
    const propertyInstance = getInstance(prop.instanceId);
    if (!propertyInstance) {
      return { propertyTitle: prop.title, monthlyCost: 0, instanceId: prop.instanceId };
    }
    const breakdown = calculateDetailedCashflow(propertyInstance, prop.loanAmount, profileVacancyRate);
    return {
      propertyTitle: prop.title,
      monthlyCost: Math.round(breakdown.netWeeklyCashflow * 52 / 12),
      instanceId: prop.instanceId,
    };
  });

  // ── Net worth data ──
  const netWorthData = enrichedPortfolioData.map(point => ({
    year: point.year,
    totalAssets: point.portfolioValue,
    totalDebt: point.totalDebt ?? 0,
    netWorth: point.portfolioValue - (point.totalDebt ?? 0),
  }));

  // ── Finalize per-property projections ──
  const propertyProjections = new Map<string, PerPropertyProjection>();
  propertyAccumulators.forEach((acc, instanceId) => {
    const latestEquity = acc.equityOverTime[acc.equityOverTime.length - 1];
    const firstYearNetCashflow = acc.cashflowOverTime[0]?.netCashflow || 0;
    const cashOnCashReturn = acc.totalCashInvested > 0
      ? (firstYearNetCashflow / acc.totalCashInvested) * 100
      : 0;
    const totalCashflowSum = acc.cashflowOverTime.reduce((sum, cf) => sum + cf.netCashflow, 0);
    const totalReturn = (latestEquity?.equity ?? 0) - acc.totalCashInvested + totalCashflowSum;
    const projectionYears = acc.yearRows.length;
    const roic = acc.totalCashInvested > 0 && projectionYears > 0
      ? (totalReturn / acc.totalCashInvested / projectionYears) * 100
      : 0;

    propertyProjections.set(instanceId, {
      currentPropertyValue: latestEquity?.propertyValue ?? 0,
      currentEquity: latestEquity?.equity ?? 0,
      totalCashInvested: acc.totalCashInvested,
      cashOnCashReturn,
      roic,
      yearsHeld: projectionYears,
      capitalReturnedInYears: acc.capitalReturnedInYears,
      equityOverTime: acc.equityOverTime,
      cashflowOverTime: acc.cashflowOverTime,
      yearRows: acc.yearRows,
      propertyTitle: acc.propertyTitle,
      purchaseYear: acc.purchaseYear,
    });
  });

  // ── Portfolio cashflow result ──
  const purchaseYearsSet = new Set(feasibleProperties.map(p => Math.floor(p.affordableYear)));
  const purchaseYears = Array.from(purchaseYearsSet).sort((a, b) => a - b);
  const portfolioCashflow = cashflowSnapshots.size > 0
    ? {
        snapshots: cashflowSnapshots,
        yearRange: [
          purchaseYears[0] ?? startYear,
          endYear,
        ] as [number, number],
        lastPurchaseYear: purchaseYears[purchaseYears.length - 1] ?? startYear,
        purchaseYears,
      }
    : null;

  return {
    portfolioGrowthData: enrichedPortfolioData,
    cashflowData,
    monthlyHoldingCost: {
      total: finalCashflow ? Math.round(finalCashflow.cashflow / 12) : 0,
      byProperty: holdingCostByProperty,
    },
    netWorthData,
    roadmapData: {
      years: roadmapYears,
      startYear: BASE_YEAR,
      endYear,
    },
    portfolioCashflow,
    propertyProjections,
    salesCgtBreakdown,
  };
}
