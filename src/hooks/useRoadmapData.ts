import { useMemo } from 'react';
import { useInvestmentProfile } from './useInvestmentProfile';
import { useAffordabilityCalculator } from './useAffordabilityCalculator';
import { usePropertyInstance } from '../contexts/PropertyInstanceContext';
import { usePropertySelection, type EventBlock, type EventCategory } from '../contexts/PropertySelectionContext';
import { EVENT_TYPES, getEventLabel } from '../constants/eventTypes';
import { getGrowthCurveFromAssumption } from '../utils/propertyInstanceDefaults';
import {
  getGrowthRateAdjustment,
  getEffectiveInterestRate,
  getPropertyEffectiveRate,
  getRenovationValueIncrease,
  applyGrowthAdjustment,
} from '../utils/eventProcessing';
import type { YearBreakdownData } from '@/types/property';
import {
  PERIODS_PER_YEAR,
  BASE_YEAR,
  SERVICEABILITY_FACTOR,
  RENTAL_SERVICEABILITY_CONTRIBUTION_RATE,
  EQUITY_EXTRACTION_LVR_CAP,
  DEFAULT_INTEREST_RATE,
  ANNUAL_INFLATION_RATE,
  annualRateToPeriodRate,
  calculateRentalRecognitionRate,
} from '../constants/financialParams';

// Currency formatter helper
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Tiered growth function matching useAffordabilityCalculator pattern
// Now supports event-adjusted growth rates via market correction events
const calculatePropertyGrowthWithEvents = (
  initialValue: number, 
  periods: number, 
  growthCurve: { year1: number; years2to3: number; year4: number; year5plus: number },
  eventBlocks: EventBlock[],
  basePeriod: number = 0 // The period at which the property was purchased
): number => {
  let currentValue = initialValue;
  
  const year1Rate = annualRateToPeriodRate(growthCurve.year1 / 100);
  const years2to3Rate = annualRateToPeriodRate(growthCurve.years2to3 / 100);
  const year4Rate = annualRateToPeriodRate(growthCurve.year4 / 100);
  const year5plusRate = annualRateToPeriodRate(growthCurve.year5plus / 100);
  
  for (let period = 1; period <= periods; period++) {
    // Calculate the actual calendar period (for market correction event lookup)
    const actualPeriod = basePeriod + period;
    
    // Get market correction adjustment for this period
    const growthAdjustment = getGrowthRateAdjustment(actualPeriod, eventBlocks);
    
    let periodRate;
    
    if (period <= 2) {
      // Year 1 (periods 1-2)
      periodRate = year1Rate;
    } else if (period <= 6) {
      // Years 2-3 (periods 3-6)
      periodRate = years2to3Rate;
    } else if (period <= 8) {
      // Year 4 (periods 7-8)
      periodRate = year4Rate;
    } else {
      // Year 5+ (period 9+)
      periodRate = year5plusRate;
    }
    
    // Apply market correction adjustment (convert to period rate)
    const adjustedPeriodRate = periodRate + annualRateToPeriodRate(growthAdjustment);
    
    // Ensure rate doesn't go negative
    currentValue *= (1 + Math.max(-0.1, adjustedPeriodRate)); // Cap at -10% per period
  }
  
  return currentValue;
};

// Legacy version without event support (kept for backward compatibility)
const calculatePropertyGrowth = (
  initialValue: number, 
  periods: number, 
  growthCurve: { year1: number; years2to3: number; year4: number; year5plus: number }
): number => {
  return calculatePropertyGrowthWithEvents(initialValue, periods, growthCurve, [], 0);
};

// Conservative growth for existing/mature portfolios
// Default 3% annual rate (configurable via profile.existingPortfolioGrowthRate)
const DEFAULT_EXISTING_PORTFOLIO_GROWTH_RATE = 0.03; // 3% annual

const calculateExistingPortfolioGrowthByPeriod = (
  initialValue: number,
  periods: number,
  growthRate: number = DEFAULT_EXISTING_PORTFOLIO_GROWTH_RATE
): number => {
  const years = periods / PERIODS_PER_YEAR;
  return initialValue * Math.pow(1 + growthRate, years);
};

// Funding breakdown for a purchase
export interface FundingBreakdown {
  cash: number;
  savings: number;
  equity: number;
  totalCashRequired: number;
}

// Single purchase detail structure
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

// Event summary for roadmap display
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
  // Raw numeric values for calculations
  portfolioValueRaw: number;
  totalEquityRaw: number;
  availableFundsRaw: number;
  totalDebt: number;
  propertyCount: number;
  annualCashflow: number;
  // Cashflow breakdown metrics
  grossRentalIncome: number;
  totalExpenses: number;
  totalLoanInterest: number;
  // Purchase info for this year
  purchaseInYear: boolean;
  // Array of all purchases in this year (supports stacking multiple properties)
  purchaseDetails?: PurchaseDetail[];
  // Full breakdown data for funnel components (only for years with purchases)
  yearBreakdownData?: YearBreakdownData;
  // Events scheduled for this year
  events?: EventSummary[];
}

export interface RoadmapData {
  years: YearData[];
  startYear: number;
  endYear: number;
}

// Optional scenario data for multi-scenario mode
interface ScenarioDataInput {
  timelineProperties: typeof import('./useAffordabilityCalculator').useAffordabilityCalculator extends () => { timelineProperties: infer T } ? T : never;
  profile: typeof import('./useInvestmentProfile').useInvestmentProfile extends () => { profile: infer T } ? T : never;
}

export const useRoadmapData = (scenarioData?: ScenarioDataInput): RoadmapData => {
  const { profile: contextProfile } = useInvestmentProfile();
  const { timelineProperties: contextTimelineProperties } = useAffordabilityCalculator();
  const { getInstance } = usePropertyInstance();
  const { eventBlocks } = usePropertySelection();
  
  // Use scenarioData if provided (multi-scenario mode), otherwise use global contexts
  const profile = scenarioData?.profile ?? contextProfile;
  const timelineProperties = scenarioData?.timelineProperties ?? contextTimelineProperties;
  
  const roadmapData = useMemo((): RoadmapData => {
    const years: YearData[] = [];
    
    // Calculate end year based on user's timeline setting (max 20 years)
    const endYear = BASE_YEAR + (profile.timelineYears || 15) - 1;
// Default interest rate for calculations
    const defaultInterestRate = DEFAULT_INTEREST_RATE;
    
    // Build a map of years to purchases
    const purchasesByYear = new Map<number, typeof timelineProperties>();
    timelineProperties
      .filter(p => p.affordableYear !== Infinity)
      .forEach(prop => {
        const year = Math.floor(prop.affordableYear);
        if (!purchasesByYear.has(year)) {
          purchasesByYear.set(year, []);
        }
        purchasesByYear.get(year)!.push(prop);
      });
    
    // ============================================================================
    // CHRONOLOGICAL FUNDING TRACKING
    // Track cumulative spending from each source across all years
    // Once cash is spent, it stays spent. Savings accumulate but can be drawn down.
    // ============================================================================
    let runningCashBalance = profile.depositPool; // Starts at initial deposit, depletes permanently
    let runningSavingsBalance = 0; // Accumulates each year, can be drawn down for purchases
    let cumulativeEquityUsed = 0; // Track total equity extracted across all purchases
    let cumulativeSavingsSpent = 0; // Track total savings used for purchases
    
    // Generate data for each year from BASE_YEAR to user's timeline end
    for (let year = BASE_YEAR; year <= endYear; year++) {
      const yearIndex = year - BASE_YEAR;
      const periodsElapsed = yearIndex * PERIODS_PER_YEAR;
      
      // Get all properties purchased by this year
      const propertiesPurchasedByYear = timelineProperties.filter(
        p => p.affordableYear !== Infinity && Math.floor(p.affordableYear) <= year
      );
      
      // Get properties purchased BEFORE this year (for cashflow calculation)
      const propertiesPurchasedBeforeThisYear = timelineProperties.filter(
        p => p.affordableYear !== Infinity && Math.floor(p.affordableYear) < year
      );
      
      const propertyCount = propertiesPurchasedByYear.length;
      
      // Get event-adjusted interest rate for this period
      const effectiveInterestRate = getEffectiveInterestRate(periodsElapsed, eventBlocks);
      
      // Calculate existing portfolio value with configurable flat rate (mature properties)
      const existingGrowthRate = profile.existingPortfolioGrowthRate || DEFAULT_EXISTING_PORTFOLIO_GROWTH_RATE;
      let portfolioValue = profile.portfolioValue > 0 
        ? calculateExistingPortfolioGrowthByPeriod(profile.portfolioValue, periodsElapsed, existingGrowthRate)
        : 0;
      
      let totalDebt = profile.currentDebt;
      let grossRentalIncome = 0;
      let totalLoanInterest = 0;
      let totalExpenses = 0;
      
      // Expense breakdown accumulators - accumulate ACTUAL values from each property
      let accCouncilRatesWater = 0;
      let accStrataFees = 0;
      let accInsurance = 0;
      let accManagementFees = 0;
      let accRepairsMaintenance = 0;
      let accLandTax = 0;
      let accOther = 0;
      
      // Track portfolio value BEFORE this year's purchases (for extractable equity calculation)
      // Uses configurable flat rate for existing portfolio (mature properties)
      let portfolioValueBeforeThisYear = profile.portfolioValue > 0 
        ? calculateExistingPortfolioGrowthByPeriod(profile.portfolioValue, periodsElapsed, existingGrowthRate)
        : 0;
      let totalDebtBeforeThisYear = profile.currentDebt;
      
      // Add each property's contribution using pre-calculated values from timeline properties
      // These values already use the detailed cashflow calculator with all 39 property inputs
      propertiesPurchasedByYear.forEach(prop => {
        const purchaseYear = Math.floor(prop.affordableYear);
        const yearsOwned = year - purchaseYear;
        const periodsOwned = yearsOwned * PERIODS_PER_YEAR;
        
        // Calculate the purchase period for event adjustment
        const purchasePeriod = (purchaseYear - BASE_YEAR) * PERIODS_PER_YEAR;
        
        // Get property instance to check for custom growth rate
        const propertyInstance = getInstance(prop.instanceId);
        
        // PRIORITY: Use instance growthAssumption if set, then profile fallback
        // This ensures edits to the property card slider are reflected in roadmap
        const effectiveGrowthCurve = propertyInstance?.growthAssumption 
          ? getGrowthCurveFromAssumption(propertyInstance.growthAssumption)
          : profile.growthCurve;
        
        // Calculate current property value with tiered growth (using instance growth rate)
        // Apply market correction events using purchasePeriod as basePeriod
        const baseValue = calculatePropertyGrowthWithEvents(prop.cost, periodsOwned, effectiveGrowthCurve, eventBlocks, purchasePeriod);
        
        // Add renovation value increases
        const renovationIncrease = getRenovationValueIncrease(prop.instanceId, periodsElapsed, eventBlocks);
        const currentValue = baseValue + renovationIncrease;
        
        portfolioValue += currentValue;
        totalDebt += prop.loanAmount;
        
        // Track portfolio BEFORE this year's purchases (for equity calculation)
        if (purchaseYear < year) {
          portfolioValueBeforeThisYear += currentValue;
          totalDebtBeforeThisYear += prop.loanAmount;
        }
        
        // Use pre-calculated values from the timeline property (already computed via detailed cashflow)
        // These include all 39 property inputs like management fees, strata, insurance, etc.
        // Apply growth factor for income (rent grows with property value), inflation only for expenses
        const growthFactor = yearsOwned > 0 ? currentValue / prop.cost : 1;
        const inflationFactor = Math.pow(1 + ANNUAL_INFLATION_RATE, periodsOwned / PERIODS_PER_YEAR);
        
        // Scale the pre-calculated values for time elapsed since purchase
        // BUG FIX: Income grows with both property value AND inflation
        grossRentalIncome += prop.grossRentalIncome * growthFactor * inflationFactor;
        totalLoanInterest += prop.loanInterest; // Interest doesn't scale with growth
        // BUG FIX: Expenses only grow with inflation, NOT property value
        totalExpenses += prop.expenses * inflationFactor;
        
        // Get INDIVIDUAL property expense values from the property instance
        // This avoids the cumulative breakdown issue in timeline properties
        // Note: propertyInstance already declared above, reuse it
        if (propertyInstance) {
          // Calculate management fee based on adjusted income (rent - vacancy)
          const grossAnnualIncome = propertyInstance.rentPerWeek * 52;
          const vacancyAmount = grossAnnualIncome * (propertyInstance.vacancyRate / 100);
          const adjustedIncome = grossAnnualIncome - vacancyAmount;
          const managementFee = adjustedIncome * (propertyInstance.propertyManagementPercent / 100);
          
          // Add each property's individual expenses (with inflation)
          accCouncilRatesWater += propertyInstance.councilRatesWater * inflationFactor;
          accStrataFees += propertyInstance.strata * inflationFactor;
          accInsurance += propertyInstance.buildingInsuranceAnnual * inflationFactor;
          accManagementFees += managementFee * inflationFactor;
          accRepairsMaintenance += propertyInstance.maintenanceAllowanceAnnual * inflationFactor;
          accLandTax += (propertyInstance.landTaxOverride || 0) * inflationFactor;
        }
      });
      
      const totalEquity = portfolioValue - totalDebt;
      // CRITICAL: Extractable equity is based on portfolio BEFORE this year's purchases
      // You can't use equity from a property you haven't bought yet to fund that purchase!
      const extractableEquity = Math.max(0, (portfolioValueBeforeThisYear * EQUITY_EXTRACTION_LVR_CAP) - totalDebtBeforeThisYear);
      
      // Calculate net cashflow from properties owned BEFORE this year
      // (Properties bought this year don't generate cashflow until next year)
      let netCashflowFromExistingProperties = 0;
      propertiesPurchasedBeforeThisYear.forEach(prop => {
        const purchaseYear = Math.floor(prop.affordableYear);
        const yearsOwned = year - purchaseYear;
        const periodsOwned = yearsOwned * PERIODS_PER_YEAR;
        const propPurchasePeriod = (purchaseYear - BASE_YEAR) * PERIODS_PER_YEAR;
        
        // Get instance for custom growth rate
        const propInstance = getInstance(prop.instanceId);
        const propGrowthCurve = propInstance?.growthAssumption 
          ? getGrowthCurveFromAssumption(propInstance.growthAssumption)
          : profile.growthCurve;
        
        // Use event-aware growth calculation
        const baseValue = calculatePropertyGrowthWithEvents(prop.cost, periodsOwned, propGrowthCurve, eventBlocks, propPurchasePeriod);
        const renovationIncrease = getRenovationValueIncrease(prop.instanceId, periodsElapsed, eventBlocks);
        const currentValue = baseValue + renovationIncrease;
        const growthFactor = yearsOwned > 0 ? currentValue / prop.cost : 1;
        const inflationFactor = Math.pow(1 + ANNUAL_INFLATION_RATE, periodsOwned / PERIODS_PER_YEAR);
        
        const propRentalIncome = prop.grossRentalIncome * growthFactor * inflationFactor;
        const propExpenses = prop.expenses * inflationFactor;
        // Use event-adjusted interest rate for property
        const propEffectiveRate = getPropertyEffectiveRate(periodsElapsed, eventBlocks, prop.instanceId);
        const propInterest = prop.loanAmount * propEffectiveRate;
        
        netCashflowFromExistingProperties += propRentalIncome - propInterest - propExpenses;
      });
      
      const netCashflow = grossRentalIncome - totalLoanInterest - totalExpenses;
      
      // ============================================================================
      // STEP 1: Get purchases for this year and read balances from calculator
      // The affordability calculator is the SINGLE SOURCE OF TRUTH for all balances
      // ============================================================================
      const purchasesThisYear = purchasesByYear.get(year);
      const purchaseFundingBreakdowns: Map<string, FundingBreakdown> = new Map();
      
      // CAPTURE START OF YEAR VALUES (before any purchases this year)
      // For purchase years, read from calculator (SINGLE SOURCE OF TRUTH)
      // For non-purchase years, calculate based on accumulated values
      const SAVINGS_RATE = 0.25;
      const firstPurchaseThisYear = purchasesThisYear?.[0];
      
      // Cash: use calculator's baseDeposit for purchase years
      const startOfYearCash = firstPurchaseThisYear 
        ? firstPurchaseThisYear.baseDeposit 
        : runningCashBalance;
      
      // Savings: accumulation minus what's been spent on previous purchases
      // This ensures the displayed savings value correctly accounts for funds used
      const grossSavingsAccumulated = yearIndex > 0 
        ? profile.annualSavings * SAVINGS_RATE * yearIndex
        : 0;
      const startOfYearSavings = Math.max(0, grossSavingsAccumulated - cumulativeSavingsSpent);
      
      // Equity: use calculator's equityRelease for purchase years (what was actually available)
      const startOfYearEquity = firstPurchaseThisYear
        ? firstPurchaseThisYear.equityRelease
        : Math.max(0, extractableEquity - cumulativeEquityUsed);
      
      if (purchasesThisYear && purchasesThisYear.length > 0) {
        // READ funding breakdown from each purchase (SINGLE SOURCE OF TRUTH)
        purchasesThisYear.forEach(purchase => {
          const funding = purchase.fundingBreakdown;
          purchaseFundingBreakdowns.set(purchase.instanceId, {
            cash: funding.cash,
            savings: funding.savings,
            equity: funding.equity,
            totalCashRequired: funding.total,
          });
          // Track cumulative savings spent across all purchases
          cumulativeSavingsSpent += funding.savings;
        });
        
        // Use balances from the LAST purchase this year (SINGLE SOURCE OF TRUTH)
        // The calculator has already computed these correctly
        const lastPurchase = purchasesThisYear[purchasesThisYear.length - 1];
        runningCashBalance = lastPurchase.balancesAfterPurchase.cash;
        runningSavingsBalance = lastPurchase.balancesAfterPurchase.savings;
        cumulativeEquityUsed = lastPurchase.balancesAfterPurchase.equityUsed;
        
      } else {
        // NO PURCHASES THIS YEAR - accumulate savings normally
        // This is the only place we calculate savings independently
        // (because the calculator doesn't compute non-purchase years)
        // Only 25% of annual savings goes into the "available for investment" pool
        const SAVINGS_RATE = 0.25;
        const annualSavingsContribution = profile.annualSavings * SAVINGS_RATE;
        // Only deduct negative cashflow (property shortfall you need to cover)
        const cashflowDeduction = netCashflowFromExistingProperties < 0 ? netCashflowFromExistingProperties : 0;
        const thisYearSavingsContribution = annualSavingsContribution + cashflowDeduction;
        
        const prevSavings = runningSavingsBalance;
        if (yearIndex > 0) { // Don't add savings for year 0 (starting point)
          runningSavingsBalance = Math.max(0, runningSavingsBalance + thisYearSavingsContribution);
        }
        }
      
      // ============================================================================
      // STEP 3: Calculate balances for display
      // Use START OF YEAR values for the Avail row (what was available before purchases)
      // ============================================================================
      const cashRemaining = runningCashBalance;  // Still track running balance internally
      const savingsRemaining = runningSavingsBalance;  // Still track running balance internally
      const equityRemaining = Math.max(0, extractableEquity - cumulativeEquityUsed);  // Still track internally
      
      // Cashflow reinvestment is now built into savings
      // This variable is kept for backwards compatibility
      const cashflowReinvestment = 0;
      
      // Available funds = START OF YEAR values (what was available BEFORE any purchases this year)
      const availableFunds = startOfYearCash + startOfYearSavings + startOfYearEquity;
      
      // Determine test statuses
      // For years with purchases, use the actual test results
      // For years without purchases, calculate if a hypothetical purchase could be made
      // (purchasesThisYear already defined above in funding allocation section)
      let depositStatus: 'pass' | 'fail' | 'na' = 'na';
      let borrowingStatus: 'pass' | 'fail' | 'na' = 'na';
      let serviceabilityStatus: 'pass' | 'fail' | 'na' = 'na';
      let purchaseInYear = false;
      let purchaseDetails: PurchaseDetail[] | undefined = undefined;
      
      // Compute yearBreakdownData for years with purchases
      let yearBreakdownData: YearBreakdownData | undefined = undefined;
      
      if (purchasesThisYear && purchasesThisYear.length > 0) {
        purchaseInYear = true;
        const firstPurchase = purchasesThisYear[0];
        
        // Use actual test results from the timeline property (use first purchase for overall status)
        depositStatus = firstPurchase.depositTestPass ? 'pass' : 'fail';
        serviceabilityStatus = firstPurchase.serviceabilityTestPass ? 'pass' : 'fail';
        borrowingStatus = firstPurchase.borrowingCapacityRemaining >= 0 ? 'pass' : 'fail';
        
        // Include ALL purchases for this year (supports stacking multiple properties)
        // Include the actual funding breakdown calculated during allocation
        purchaseDetails = purchasesThisYear.map(purchase => {
          const funding = purchaseFundingBreakdowns.get(purchase.instanceId) || {
            cash: 0,
            savings: 0,
            equity: 0,
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
        
        // Calculate values needed for YearBreakdownData
        // Use event-adjusted interest rate for this period
        const existingDebt = totalDebt - firstPurchase.loanAmount;
        const newDebt = firstPurchase.loanAmount;
        const existingLoanInterest = existingDebt * effectiveInterestRate;
        const newLoanInterest = newDebt * effectiveInterestRate;
        const baseServiceabilityCapacity = profile.borrowingCapacity * SERVICEABILITY_FACTOR;
        const rentalServiceabilityContribution = grossRentalIncome * RENTAL_SERVICEABILITY_CONTRIBUTION_RATE;
        const equityBoost = extractableEquity * profile.equityFactor;
        const effectiveCapacity = profile.borrowingCapacity + equityBoost;
        const lvr = portfolioValue > 0 ? (totalDebt / portfolioValue) * 100 : 0;
        const dsr = (baseServiceabilityCapacity + rentalServiceabilityContribution) > 0 
          ? ((existingLoanInterest + newLoanInterest) / (baseServiceabilityCapacity + rentalServiceabilityContribution)) * 100 
          : 0;
        
        // Build all portfolio properties array
        const allPortfolioProperties = propertiesPurchasedByYear.map((prop, idx) => {
          const propPurchaseYear = Math.floor(prop.affordableYear);
          const propYearsOwned = year - propPurchaseYear;
          const propPeriodsOwned = propYearsOwned * PERIODS_PER_YEAR;
          const propPurchasePeriod = (propPurchaseYear - BASE_YEAR) * PERIODS_PER_YEAR;
          
          // Get instance for custom growth rate
          const propInstance = getInstance(prop.instanceId);
          const propGrowthCurve = propInstance?.growthAssumption 
            ? getGrowthCurveFromAssumption(propInstance.growthAssumption)
            : profile.growthCurve;
          
          // Use event-aware growth calculation
          const propBaseValue = calculatePropertyGrowthWithEvents(prop.cost, propPeriodsOwned, propGrowthCurve, eventBlocks, propPurchasePeriod);
          const propRenovationIncrease = getRenovationValueIncrease(prop.instanceId, periodsElapsed, eventBlocks);
          const propCurrentValue = propBaseValue + propRenovationIncrease;
          const halfYear = prop.affordableYear % 1 >= 0.5 ? 'H2' : 'H1';
          
          return {
            propertyId: prop.instanceId,
            propertyType: prop.title,
            purchaseYear: propPurchaseYear,
            displayPeriod: `${propPurchaseYear} ${halfYear}`,
            originalCost: prop.cost,
            currentValue: propCurrentValue,
            loanAmount: prop.loanAmount,
            equity: propCurrentValue - prop.loanAmount,
            extractableEquity: Math.max(0, (propCurrentValue * EQUITY_EXTRACTION_LVR_CAP) - prop.loanAmount),
          };
        });
        
        // Build YearBreakdownData
        yearBreakdownData = {
          period: yearIndex * PERIODS_PER_YEAR + 1,
          year,
          displayYear: yearIndex,
          displayPeriod: `${year} H1`,
          status: 'purchased',
          propertyNumber: propertyCount,
          propertyType: firstPurchase.title,
          
          // Portfolio metrics
          portfolioValue,
          totalEquity,
          totalDebt,
          extractableEquity,
          
          // Cash engine
          availableDeposit: availableFunds,
          annualCashFlow: netCashflow,
          
          // Available funds breakdown - START OF YEAR VALUES
          // Shows what was available BEFORE this year's purchases
          // This is what the deposit test checks against
          baseDeposit: startOfYearCash, // Start of year cash balance
          cumulativeSavings: startOfYearSavings, // Start of year savings balance
          cashflowReinvestment: 0, // Cashflow reinvestment is already included in savings
          equityRelease: startOfYearEquity, // Start of year extractable equity
          annualSavingsRate: profile.annualSavings,
          totalAnnualCapacity: profile.annualSavings + Math.max(0, netCashflow),
          
          // Cashflow components
          grossRental: grossRentalIncome,
          loanRepayments: totalLoanInterest,
          expenses: totalExpenses,
          
          // Expense breakdown - USE ACTUAL VALUES from property instances
          expenseBreakdown: {
            councilRatesWater: accCouncilRatesWater,
            strataFees: accStrataFees,
            insurance: accInsurance,
            managementFees: accManagementFees,
            repairsMaintenance: accRepairsMaintenance,
            landTax: accLandTax,
            other: accOther,
          },
          
          // Requirements - SUM of ALL purchases this year
          requiredDeposit: purchasesThisYear.reduce((sum, p) => sum + p.depositRequired, 0),
          requiredLoan: purchasesThisYear.reduce((sum, p) => sum + p.loanAmount, 0),
          propertyCost: purchasesThisYear.reduce((sum, p) => sum + p.cost, 0),
          
          // Capacity
          availableBorrowingCapacity: Math.max(0, effectiveCapacity - totalDebt),
          borrowingCapacity: profile.borrowingCapacity,
          
          // Borrowing Capacity Breakdown
          equityBoost,
          effectiveCapacity,
          equityFactor: profile.equityFactor,
          
          // Debt breakdown
          existingDebt,
          newDebt,
          existingLoanInterest,
          newLoanInterest,
          
          // Enhanced serviceability breakdown
          baseServiceabilityCapacity,
          rentalServiceabilityContribution,
          
          // Assumptions
          interestRate: defaultInterestRate * 100,
          rentalRecognition: 75,
          
          // Tests - SINGLE SOURCE OF TRUTH: Use values directly from calculator
          depositTest: {
            pass: firstPurchase.depositTestPass,
            surplus: firstPurchase.depositTestSurplus,
            available: firstPurchase.availableFundsUsed,
            required: firstPurchase.totalCashRequired,  // Use totalCashRequired (deposit + acquisition costs)
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
          
          // Flags
          gapRule: firstPurchase.isGapRuleBlocked || false,
          equityReleaseYear: extractableEquity > 0,
          
          // Strategy metrics
          portfolioScaling: propertyCount,
          selfFundingEfficiency: firstPurchase.cost > 0 ? (netCashflow / firstPurchase.cost) * 100 : 0,
          equityRecyclingImpact: portfolioValue > 0 ? (totalEquity / portfolioValue) * 100 : 0,
          dsr,
          lvr,
          
          // Breakdown details - include ALL purchases this year with full acquisition costs
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
            extractableEquity: Math.max(0, (purchase.cost * EQUITY_EXTRACTION_LVR_CAP) - purchase.loanAmount),
            // Include acquisition costs from TimelineProperty
            stampDuty: purchase.acquisitionCosts?.stampDuty || 0,
            lmi: purchase.acquisitionCosts?.lmi || 0,
            legalFees: purchase.acquisitionCosts?.legalFees || 0,
            inspectionFees: purchase.acquisitionCosts?.inspectionFees || 0,
            otherFees: purchase.acquisitionCosts?.otherFees || 0,
            totalCashRequired: purchase.totalCashRequired,
          })),
          
          // All portfolio properties
          allPortfolioProperties,
        };
      } else if (year > BASE_YEAR) {
        // For non-purchase years, calculate hypothetical capacity
        // Using dynamic borrowing capacity with equity boost
        const equityBoost = extractableEquity * profile.equityFactor;
        const effectiveBorrowingCapacity = profile.borrowingCapacity + equityBoost;
        const remainingBorrowingCapacity = Math.max(0, effectiveBorrowingCapacity - totalDebt);
        
        // Enhanced serviceability with rental income contribution
        const baseCapacity = profile.borrowingCapacity * SERVICEABILITY_FACTOR;
        const rentalContribution = grossRentalIncome * RENTAL_SERVICEABILITY_CONTRIBUTION_RATE;
        const enhancedServiceabilityCapacity = baseCapacity + rentalContribution;
        
        // Assume a hypothetical $500k property to test capacity
        // Use event-adjusted interest rate
        const hypotheticalPropertyCost = 500000;
        const hypotheticalDeposit = hypotheticalPropertyCost * (1 - EQUITY_EXTRACTION_LVR_CAP);
        const hypotheticalLoan = hypotheticalPropertyCost * EQUITY_EXTRACTION_LVR_CAP;
        const hypotheticalLoanPayment = hypotheticalLoan * effectiveInterestRate;
        
        // Check deposit capacity
        const depositTestPass = availableFunds >= hypotheticalDeposit;
        const depositTestSurplus = availableFunds - hypotheticalDeposit;
        depositStatus = depositTestPass ? 'pass' : 'fail';
        
        // Check borrowing capacity
        const borrowingTestPass = remainingBorrowingCapacity >= hypotheticalLoan;
        const borrowingTestSurplus = remainingBorrowingCapacity - hypotheticalLoan;
        borrowingStatus = borrowingTestPass ? 'pass' : 'fail';
        
        // Check serviceability
        const totalPaymentsWithNew = totalLoanInterest + hypotheticalLoanPayment;
        const serviceabilityTestPass = enhancedServiceabilityCapacity >= totalPaymentsWithNew;
        const serviceabilityTestSurplus = enhancedServiceabilityCapacity - totalPaymentsWithNew;
        serviceabilityStatus = serviceabilityTestPass ? 'pass' : 'fail';
        
        // Calculate additional values for YearBreakdownData
        // Use event-adjusted interest rate
        const existingLoanInterest = totalDebt * effectiveInterestRate;
        const lvr = portfolioValue > 0 ? (totalDebt / portfolioValue) * 100 : 0;
        const dsr = enhancedServiceabilityCapacity > 0 
          ? (totalLoanInterest / enhancedServiceabilityCapacity) * 100 
          : 0;
        
        // Build all portfolio properties array for non-purchase years
        const allPortfolioProperties = propertiesPurchasedByYear.map((prop) => {
          const propPurchaseYear = Math.floor(prop.affordableYear);
          const propYearsOwned = year - propPurchaseYear;
          const propPeriodsOwned = propYearsOwned * PERIODS_PER_YEAR;
          const propPurchasePeriod = (propPurchaseYear - BASE_YEAR) * PERIODS_PER_YEAR;
          
          // Get instance for custom growth rate
          const propInstance = getInstance(prop.instanceId);
          const propGrowthCurve = propInstance?.growthAssumption 
            ? getGrowthCurveFromAssumption(propInstance.growthAssumption)
            : profile.growthCurve;
          
          // Use event-aware growth calculation
          const propBaseValue = calculatePropertyGrowthWithEvents(prop.cost, propPeriodsOwned, propGrowthCurve, eventBlocks, propPurchasePeriod);
          const propRenovationIncrease = getRenovationValueIncrease(prop.instanceId, periodsElapsed, eventBlocks);
          const propCurrentValue = propBaseValue + propRenovationIncrease;
          const halfYear = prop.affordableYear % 1 >= 0.5 ? 'H2' : 'H1';
          
          return {
            propertyId: prop.instanceId,
            propertyType: prop.title,
            purchaseYear: propPurchaseYear,
            displayPeriod: `${propPurchaseYear} ${halfYear}`,
            originalCost: prop.cost,
            currentValue: propCurrentValue,
            loanAmount: prop.loanAmount,
            equity: propCurrentValue - prop.loanAmount,
            extractableEquity: Math.max(0, (propCurrentValue * EQUITY_EXTRACTION_LVR_CAP) - prop.loanAmount),
          };
        });
        
        // Build YearBreakdownData for non-purchase years (hypothetical analysis)
        yearBreakdownData = {
          period: yearIndex * PERIODS_PER_YEAR + 1,
          year,
          displayYear: yearIndex,
          displayPeriod: `${year} H1`,
          status: 'waiting',
          propertyNumber: null,
          propertyType: 'Hypothetical Property',
          
          // Portfolio metrics
          portfolioValue,
          totalEquity,
          totalDebt,
          extractableEquity,
          
          // Cash engine
          availableDeposit: availableFunds,
          annualCashFlow: netCashflow,
          
          // Available funds breakdown - START OF YEAR VALUES (consistent with purchase years)
          baseDeposit: startOfYearCash,
          cumulativeSavings: startOfYearSavings,
          cashflowReinvestment: 0,
          equityRelease: startOfYearEquity,
          annualSavingsRate: profile.annualSavings,
          totalAnnualCapacity: profile.annualSavings + Math.max(0, netCashflow),
          
          // Cashflow components
          grossRental: grossRentalIncome,
          loanRepayments: totalLoanInterest,
          expenses: totalExpenses,
          
          // Expense breakdown - USE ACTUAL VALUES from property instances
          expenseBreakdown: {
            councilRatesWater: accCouncilRatesWater,
            strataFees: accStrataFees,
            insurance: accInsurance,
            managementFees: accManagementFees,
            repairsMaintenance: accRepairsMaintenance,
            landTax: accLandTax,
            other: accOther,
          },
          
          // Requirements (hypothetical $500k property)
          requiredDeposit: hypotheticalDeposit,
          requiredLoan: hypotheticalLoan,
          propertyCost: hypotheticalPropertyCost,
          
          // Capacity
          availableBorrowingCapacity: remainingBorrowingCapacity,
          borrowingCapacity: profile.borrowingCapacity,
          
          // Borrowing Capacity Breakdown
          equityBoost,
          effectiveCapacity: effectiveBorrowingCapacity,
          equityFactor: profile.equityFactor,
          
          // Debt breakdown
          existingDebt: totalDebt,
          newDebt: hypotheticalLoan,
          existingLoanInterest,
          newLoanInterest: hypotheticalLoanPayment,
          
          // Enhanced serviceability breakdown
          baseServiceabilityCapacity: baseCapacity,
          rentalServiceabilityContribution: rentalContribution,
          
          // Assumptions
          interestRate: defaultInterestRate * 100,
          rentalRecognition: 75,
          
          // Tests (hypothetical)
          depositTest: {
            pass: depositTestPass,
            surplus: depositTestSurplus,
            available: availableFunds,
            required: hypotheticalDeposit,
          },
          
          borrowingCapacityTest: {
            pass: borrowingTestPass,
            surplus: borrowingTestSurplus,
            available: effectiveBorrowingCapacity,
            required: totalDebt + hypotheticalLoan,
          },
          
          serviceabilityTest: {
            pass: serviceabilityTestPass,
            surplus: serviceabilityTestSurplus,
            available: enhancedServiceabilityCapacity,
            required: totalPaymentsWithNew,
          },
          
          // Flags
          gapRule: false,
          equityReleaseYear: extractableEquity > 0,
          
          // Strategy metrics
          portfolioScaling: propertyCount,
          selfFundingEfficiency: 0,
          equityRecyclingImpact: portfolioValue > 0 ? (totalEquity / portfolioValue) * 100 : 0,
          dsr,
          lvr,
          
          // Breakdown details (empty for non-purchase years)
          purchases: [],
          
          // All portfolio properties
          allPortfolioProperties,
        };
      }
      
      // Get events scheduled for this year
      // Convert year to period range (H1 and H2 of this year)
      const yearStartPeriod = (year - BASE_YEAR) * PERIODS_PER_YEAR + 1;
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
      
      years.push({
        year,
        depositStatus,
        borrowingStatus,
        serviceabilityStatus,
        portfolioValue: formatCurrency(portfolioValue),
        totalEquity: formatCurrency(totalEquity),
        availableFunds: formatCurrency(availableFunds),
        portfolioValueRaw: portfolioValue,
        totalEquityRaw: totalEquity,
        availableFundsRaw: availableFunds,
        totalDebt,
        propertyCount,
        annualCashflow: netCashflow,
        grossRentalIncome,
        totalExpenses,
        totalLoanInterest,
        purchaseInYear,
        purchaseDetails,
        yearBreakdownData,
        events: eventsThisYear.length > 0 ? eventsThisYear : undefined,
      });
    }
    
    return {
      years,
      startYear: BASE_YEAR,
      endYear,
    };
  }, [profile, timelineProperties, eventBlocks]);
  
  return roadmapData;
};

