import type { PropertyPurchase, PropertyMetrics, PropertyExpenses, CashFlowAnalysis, GrowthProjection, GrowthCurve } from '../types/property';
import {
  PERIODS_PER_YEAR,
  ANNUAL_INFLATION_RATE,
  annualRateToPeriodRate,
} from '../constants/financialParams';

// Tiered growth function: Customizable growth rates per year
// Default: 12.5% Y1, 10% Y2-3, 7.5% Y4, 6% Y5+
export const calculatePropertyGrowth = (
  initialValue: number, 
  periods: number,
  growthCurve: GrowthCurve
): number => {
  let currentValue = initialValue;
  
  // Convert annual rates to per-period rates
  const year1Rate = annualRateToPeriodRate(growthCurve.year1 / 100);
  const years2to3Rate = annualRateToPeriodRate(growthCurve.years2to3 / 100);
  const year4Rate = annualRateToPeriodRate(growthCurve.year4 / 100);
  const year5plusRate = annualRateToPeriodRate(growthCurve.year5plus / 100);
  
  for (let period = 1; period <= periods; period++) {
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
    
    currentValue *= (1 + periodRate);
  }
  
  return currentValue;
};

// Conservative growth for existing/mature portfolios
// Uses flat 3% annual rate (vs tiered rates for new purchases)
// TODO: Make this rate configurable in the future
// Default growth rate for existing/mature portfolio (can be overridden via profile)
export const DEFAULT_EXISTING_PORTFOLIO_GROWTH_RATE = 0.03; // 3% annual

export const calculateExistingPortfolioGrowth = (
  initialValue: number,
  years: number,
  growthRate: number = DEFAULT_EXISTING_PORTFOLIO_GROWTH_RATE
): number => {
  return initialValue * Math.pow(1 + growthRate, years);
};

// Period-based version for compatibility with period-based calculations
export const calculateExistingPortfolioGrowthByPeriod = (
  initialValue: number,
  periods: number,
  growthRate: number = DEFAULT_EXISTING_PORTFOLIO_GROWTH_RATE
): number => {
  const years = periods / PERIODS_PER_YEAR;
  return calculateExistingPortfolioGrowth(initialValue, years, growthRate);
};

// Helper function to get the growth rate for a specific period
export const getGrowthRateForPeriod = (
  periodsOwned: number,
  growthCurve: GrowthCurve
): number => {
  if (periodsOwned <= 2) {
    // Year 1 (periods 1-2)
    return annualRateToPeriodRate(growthCurve.year1 / 100);
  } else if (periodsOwned <= 6) {
    // Years 2-3 (periods 3-6)
    return annualRateToPeriodRate(growthCurve.years2to3 / 100);
  } else if (periodsOwned <= 8) {
    // Year 4 (periods 7-8)
    return annualRateToPeriodRate(growthCurve.year4 / 100);
  } else {
    // Year 5+ (period 9+)
    return annualRateToPeriodRate(growthCurve.year5plus / 100);
  }
};

// Default property expenses (typical Australian property investment)
export const DEFAULT_PROPERTY_EXPENSES: PropertyExpenses = {
  managementFeeRate: 0.08, // 8% of rental income
  councilRates: 2500, // $2,500 annually
  insurance: 1200, // $1,200 annually
  maintenanceRate: 0.01, // 1% of property value annually
  vacancyRate: 0.04, // 4% vacancy allowance
  strataFees: 0 // $0 for houses, varies for apartments
};

export const calculateMortgagePayments = (
  loanAmount: number,
  interestRate: number = 0.05,
  isInterestOnly: boolean = true
): number => {
  if (isInterestOnly) {
    return loanAmount * interestRate;
  }
  
  // Principal and interest calculation (30-year loan)
  const monthlyRate = interestRate / 12;
  const numberOfPayments = 30 * 12;
  const monthlyPayment = loanAmount * 
    (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
    (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
  
  return monthlyPayment * 12; // Annual payment
};

export const calculateAnnualExpenses = (
  propertyValue: number,
  rentalIncome: number,
  expenses: PropertyExpenses = DEFAULT_PROPERTY_EXPENSES,
  periodsOwned: number = 0
): { total: number; breakdown: CashFlowAnalysis['expenseBreakdown'] } => {
  // Apply annual inflation to all expenses
  const inflationFactor = Math.pow(1 + ANNUAL_INFLATION_RATE, periodsOwned / PERIODS_PER_YEAR);
  
  const managementFees = rentalIncome * expenses.managementFeeRate * inflationFactor;
  const councilRates = expenses.councilRates * inflationFactor;
  const insurance = expenses.insurance * inflationFactor;
  const maintenance = propertyValue * expenses.maintenanceRate * inflationFactor;
  const vacancyAllowance = rentalIncome * expenses.vacancyRate * inflationFactor;
  const strataFees = (expenses.strataFees || 0) * inflationFactor;
  
  const breakdown = {
    managementFees: Math.round(managementFees),
    councilRates: Math.round(councilRates),
    insurance: Math.round(insurance),
    maintenance: Math.round(maintenance),
    vacancyAllowance: Math.round(vacancyAllowance),
    strataFees: Math.round(strataFees)
  };
  
  const total = managementFees + councilRates + insurance + maintenance + vacancyAllowance + strataFees;
  
  return { total: Math.round(total), breakdown };
};

export const analyzeCashFlow = (
  purchase: PropertyPurchase,
  currentYear: number,
  growthCurve: GrowthCurve,
  expenses: PropertyExpenses = DEFAULT_PROPERTY_EXPENSES
): CashFlowAnalysis => {
  const yearsHeld = Math.max(0, currentYear - purchase.year);
  const periodsHeld = yearsHeld * PERIODS_PER_YEAR;
  // Use tiered growth with period-based calculations
  const currentValue = calculatePropertyGrowth(purchase.cost, periodsHeld, growthCurve);
  const annualRent = currentValue * purchase.rentalYield;
  
  const mortgagePayments = calculateMortgagePayments(
    purchase.loanAmount, 
    purchase.interestRate || 0.05
  );
  
  const expensesAnalysis = calculateAnnualExpenses(currentValue, annualRent, expenses, periodsHeld);
  
  const netCashflow = annualRent - mortgagePayments - expensesAnalysis.total;
  
  return {
    rentalIncome: Math.round(annualRent),
    mortgagePayments: Math.round(mortgagePayments),
    propertyExpenses: expensesAnalysis.total,
    netCashflow: Math.round(netCashflow),
    expenseBreakdown: expensesAnalysis.breakdown
  };
};

// NOTE: Future enhancement opportunity - implement advanced serviceability calculations
// that consider debt service ratios, rental income contributions, and bank lending criteria
export const calculateUpdatedBorrowingCapacity = (
  baseCapacity: number,
  existingLoans: number,
  rentalIncome: number
): number => {
  // Simplified logic: just return the base capacity for now
  // Advanced serviceability calculations can be added later as enhancement
  return baseCapacity;
};

export const calculatePortfolioMetrics = (
  purchases: PropertyPurchase[],
  currentYear: number,
  baseGrowthRate: number,
  growthCurve: GrowthCurve,
  interestRate: number = 0.05,
  expenses: PropertyExpenses = DEFAULT_PROPERTY_EXPENSES
): PropertyMetrics => {
  return purchases.reduce((metrics, purchase) => {
    const yearsHeld = Math.max(0, currentYear - purchase.year);
    const periodsHeld = yearsHeld * PERIODS_PER_YEAR;
    
    // Use property-specific growth curve if available, otherwise fallback to global curve
    const effectiveGrowthCurve = purchase.growthCurve || growthCurve;
    
    // Use tiered growth with period-based calculations using property-specific curve
    const currentValue = calculatePropertyGrowth(purchase.cost, periodsHeld, effectiveGrowthCurve);
    
    // Use detailed cash flow analysis with property-specific growth
    const cashFlowAnalysis = analyzeCashFlow(purchase, currentYear, effectiveGrowthCurve, expenses);
    
    // Simplified debt model - no principal reduction
    const remainingDebt = purchase.loanAmount;
    const propertyEquity = Math.max(0, currentValue - remainingDebt);

    return {
      portfolioValue: metrics.portfolioValue + currentValue,
      totalEquity: metrics.totalEquity + propertyEquity,
      totalDebt: metrics.totalDebt + remainingDebt,
      annualCashflow: metrics.annualCashflow + cashFlowAnalysis.netCashflow,
      annualLoanRepayments: metrics.annualLoanRepayments + cashFlowAnalysis.mortgagePayments
    };
  }, {
    portfolioValue: 0,
    totalEquity: 0,
    totalDebt: 0,
    annualCashflow: 0,
    annualLoanRepayments: 0
  });
};

export const calculateExistingPortfolioMetrics = (
  portfolioValue: number,
  currentDebt: number,
  yearsGrown: number,
  growthRate: number,
  growthCurve: GrowthCurve,
  interestRate: number = 0.05,
  rentalYield: number = 0.04, // Default 4% rental yield for existing portfolio
  expenses: PropertyExpenses = DEFAULT_PROPERTY_EXPENSES
): PropertyMetrics => {
  if (portfolioValue === 0) {
    return {
      portfolioValue: 0,
      totalEquity: 0,
      totalDebt: 0,
      annualCashflow: 0,
      annualLoanRepayments: 0
    };
  }

  // Use flat rate for existing portfolio (already mature properties)
  // Rate is passed in from profile.existingPortfolioGrowthRate (default 3%)
  const currentValue = portfolioValue * Math.pow(1 + growthRate, yearsGrown);
  const equity = Math.max(0, currentValue - currentDebt);
  const annualRepayments = currentDebt * interestRate;
  
  // Calculate rental income and expenses for existing portfolio
  const periodsGrown = yearsGrown * PERIODS_PER_YEAR; // For expense inflation calculation
  const annualRent = currentValue * rentalYield;
  const expensesAnalysis = calculateAnnualExpenses(currentValue, annualRent, expenses, periodsGrown);
  
  // Net cashflow = rental income - loan repayments - expenses
  const netCashflow = annualRent - annualRepayments - expensesAnalysis.total;

  return {
    portfolioValue: currentValue,
    totalEquity: equity,
    totalDebt: currentDebt,
    annualCashflow: netCashflow, // Now includes rental income minus expenses and loan repayments
    annualLoanRepayments: annualRepayments
  };
};

export const calculateTotalRentalIncome = (
  purchases: PropertyPurchase[],
  currentYear: number,
  growthRate: number,
  growthCurve: GrowthCurve
): number => {
  return purchases.reduce((totalIncome, purchase) => {
    const yearsHeld = Math.max(0, currentYear - purchase.year);
    const periodsHeld = yearsHeld * PERIODS_PER_YEAR;
    // Use tiered growth with period-based calculations
    const currentValue = calculatePropertyGrowth(purchase.cost, periodsHeld, growthCurve);
    const annualRent = purchase.rentalYield * currentValue;
    return totalIncome + annualRent;
  }, 0);
};

export const calculateBorrowingCapacityProgression = (
  baseCapacity: number,
  purchases: PropertyPurchase[],
  timelineYears: number,
  growthRate: number,
  growthCurve: GrowthCurve,
  debtServiceRatio: number = 0.8
): Array<{ year: number; capacity: number; rentContribution: number }> => {
  const progression: Array<{ year: number; capacity: number; rentContribution: number }> = [];
  
  for (let year = 1; year <= timelineYears; year++) {
    const currentYear = 2025 + year - 1;
    const purchasesByThisYear = purchases.filter(p => p.year <= currentYear);
    
    // Calculate existing debt
    const existingDebt = purchasesByThisYear.reduce((debt, p) => debt + p.loanAmount, 0);
    
    // Calculate rental income
    const rentalIncome = calculateTotalRentalIncome(purchasesByThisYear, currentYear, growthRate, growthCurve);
    const rentContribution = rentalIncome * 0.7; // 70% rental income contribution
    
    // Calculate updated capacity (simplified)
    const capacity = calculateUpdatedBorrowingCapacity(baseCapacity, existingDebt, rentalIncome);
    
    progression.push({
      year: currentYear,
      capacity: Math.round(capacity),
      rentContribution: Math.round(rentContribution)
    });
  }
  
  return progression;
};

export const calculateGrowthProjections = (
  purchases: PropertyPurchase[],
  existingPortfolioValue: number = 0,
  existingDebt: number = 0,
  timelineYears: number,
  growthCurve: GrowthCurve,
  baseYear: number = 2025,
  existingPortfolioGrowthRate: number = DEFAULT_EXISTING_PORTFOLIO_GROWTH_RATE
): GrowthProjection[] => {
  const projections: GrowthProjection[] = [];
  
  for (let year = 0; year <= timelineYears; year++) {
    const currentYear = baseYear + year;
    const periodsElapsed = year * PERIODS_PER_YEAR;
    
    // Calculate existing portfolio growth with flat rate (mature properties)
    let existingValue = 0;
    let existingEquity = 0;
    if (existingPortfolioValue > 0) {
      // Use configurable flat rate for existing portfolio (already mature properties)
      const annualGrowthFactor = Math.pow(1 + existingPortfolioGrowthRate, year); // Compound annually
      existingValue = existingPortfolioValue * annualGrowthFactor;
      existingEquity = Math.max(0, existingValue - existingDebt);
    }
    
    // Calculate values for purchased properties
    const propertyValues = purchases
      .filter(p => p.year <= currentYear)
      .map(purchase => {
        const yearsHeld = Math.max(0, currentYear - purchase.year);
        const periodsHeld = yearsHeld * PERIODS_PER_YEAR;
        // Use tiered growth with period-based calculations
        const currentValue = calculatePropertyGrowth(purchase.cost, periodsHeld, growthCurve);
        const remainingDebt = purchase.loanAmount; // Simplified - no principal reduction
        const equity = Math.max(0, currentValue - remainingDebt);
        const rentalIncome = currentValue * purchase.rentalYield;
        
        return {
          propertyId: `${purchase.title}_${purchase.year}`,
          title: purchase.title,
          currentValue: Math.round(currentValue),
          equity: Math.round(equity),
          rentalIncome: Math.round(rentalIncome),
          yearsPurchased: yearsHeld
        };
      });

    const totalPropertyValue = propertyValues.reduce((sum, p) => sum + p.currentValue, 0);
    const totalPropertyEquity = propertyValues.reduce((sum, p) => sum + p.equity, 0);
    const totalRentalIncome = propertyValues.reduce((sum, p) => sum + p.rentalIncome, 0);

    projections.push({
      year: currentYear,
      portfolioValue: Math.round(existingValue + totalPropertyValue),
      totalEquity: Math.round(existingEquity + totalPropertyEquity),
      annualIncome: Math.round(totalRentalIncome),
      properties: propertyValues
    });
  }
  
  return projections;
};

// =============================================================================
// SHARED PROPERTY TIMELINE PROJECTION
// =============================================================================
// Used by useHoldingCostTimeline and useEquityUnlockTimeline.
// Projects a single property forward year-by-year using the same growth/inflation
// logic as the rest of the calculation engine. NO duplicate math.

export interface PropertyYearSnapshot {
  year: number;
  // Value & debt
  propertyValue: number;
  loanBalance: number;
  lvr: number;
  extractableEquity: number; // max(0, value * 0.80 - loan)
  // Monthly holding costs
  monthlyRent: number;
  monthlyMortgage: number;
  monthlyManagement: number;
  monthlyCouncil: number;
  monthlyInsurance: number;
  monthlyMaintenance: number;
  monthlyVacancy: number;
  monthlyStrata: number;
  monthlyNetCost: number; // rent - all costs
  // Annuals (for cross-referencing)
  annualRent: number;
  annualTotalCosts: number;
  annualLandTax: number;
  annualDeductions: number;
}

export interface ProjectedPropertyTimeline {
  instanceId: string;
  title: string;
  buyYear: number;
  purchasePrice: number;
  loanAmount: number;
  snapshots: PropertyYearSnapshot[];
}

/**
 * Projects a single property's financials year-by-year from purchase to endYear.
 * Uses calculatePropertyGrowth for value (tiered curve) and inflation for expenses.
 * Loan balance stays constant for IO, amortises for PI.
 */
export const projectPropertyTimeline = (
  property: {
    instanceId: string;
    title: string;
    cost: number;
    loanAmount: number;
    affordableYear: number;
    grossRentalIncome: number; // Annual at purchase
    loanType?: 'IO' | 'PI';
    expenseBreakdown?: {
      councilRatesWater: number;
      strataFees: number;
      insurance: number;
      managementFees: number;
      repairsMaintenance: number;
      landTax: number;
      other: number;
    };
  },
  endYear: number,
  growthCurve: GrowthCurve,
  interestRate: number = 0.065,
): ProjectedPropertyTimeline => {
  const buyYear = Math.floor(property.affordableYear);
  const snapshots: PropertyYearSnapshot[] = [];

  // Derive initial annual rent from the property data
  // grossRentalIncome is per-period (semi-annual), so multiply by 2
  const initialAnnualRent = property.grossRentalIncome * PERIODS_PER_YEAR;

  // Derive expense base values from breakdown, or use defaults
  const eb = property.expenseBreakdown;
  // expenseBreakdown values are per-period, so multiply by 2 for annual
  const baseAnnualCouncil = eb ? eb.councilRatesWater * PERIODS_PER_YEAR : 2500;
  const baseAnnualInsurance = eb ? eb.insurance * PERIODS_PER_YEAR : 1200;
  const baseAnnualStrata = eb ? eb.strataFees * PERIODS_PER_YEAR : 0;
  // Management as a rate of rent (derive from initial values)
  const managementRate = eb && initialAnnualRent > 0
    ? (eb.managementFees * PERIODS_PER_YEAR) / initialAnnualRent
    : 0.08;
  // Maintenance as a rate of property value
  const maintenanceRate = eb && property.cost > 0
    ? (eb.repairsMaintenance * PERIODS_PER_YEAR) / property.cost
    : 0.01;
  // Vacancy as a rate of rent
  const vacancyRate = eb && initialAnnualRent > 0
    ? (eb.other * PERIODS_PER_YEAR) / initialAnnualRent
    : 0.04;

  // Land tax (from expense breakdown, grows with inflation)
  const baseAnnualLandTax = eb ? eb.landTax * PERIODS_PER_YEAR : 0;
  // Deductions (depreciation benefits — stays roughly constant)
  const baseAnnualDeductions = (property as any).potentialDeductions ?? 0;

  let loanBalance = property.loanAmount;

  for (let year = buyYear; year <= endYear; year++) {
    const yearsOwned = year - buyYear;
    const periodsOwned = yearsOwned * PERIODS_PER_YEAR;

    // Property value via tiered growth (reuses calculatePropertyGrowth)
    const propertyValue = calculatePropertyGrowth(property.cost, periodsOwned, growthCurve);

    // Rent grows with property value (same yield maintained)
    const rentGrowthFactor = propertyValue / property.cost;
    const annualRent = initialAnnualRent * rentGrowthFactor;

    // Expenses grow with inflation (fixed costs) or scale with rent/value
    const inflationFactor = Math.pow(1 + ANNUAL_INFLATION_RATE, yearsOwned);
    const annualCouncil = baseAnnualCouncil * inflationFactor;
    const annualInsurance = baseAnnualInsurance * inflationFactor;
    const annualStrata = baseAnnualStrata * inflationFactor;
    const annualManagement = annualRent * managementRate;
    const annualMaintenance = propertyValue * maintenanceRate;
    const annualVacancy = annualRent * vacancyRate;

    // Mortgage payment
    let annualMortgage: number;
    if (property.loanType === 'PI' && loanBalance > 0) {
      // P&I amortisation — standard 30-year term
      const monthlyRate = interestRate / 12;
      const remainingMonths = Math.max(1, (30 - yearsOwned) * 12);
      const monthlyPayment = loanBalance *
        (monthlyRate * Math.pow(1 + monthlyRate, remainingMonths)) /
        (Math.pow(1 + monthlyRate, remainingMonths) - 1);
      annualMortgage = monthlyPayment * 12;
      const interestPortion = loanBalance * interestRate;
      const principalPortion = Math.min(annualMortgage - interestPortion, loanBalance);
      loanBalance = Math.max(0, loanBalance - principalPortion);
    } else {
      // IO — interest only, balance constant
      annualMortgage = loanBalance * interestRate;
    }

    const annualTotalCosts = annualMortgage + annualManagement + annualCouncil +
      annualInsurance + annualMaintenance + annualVacancy + annualStrata;
    const annualNet = annualRent - annualTotalCosts;

    const lvr = propertyValue > 0 ? (loanBalance / propertyValue) * 100 : 0;
    const extractableEquity = Math.max(0, propertyValue * 0.80 - loanBalance);

    snapshots.push({
      year,
      propertyValue: Math.round(propertyValue),
      loanBalance: Math.round(loanBalance),
      lvr: Math.round(lvr * 10) / 10,
      extractableEquity: Math.round(extractableEquity),
      monthlyRent: Math.round(annualRent / 12),
      monthlyMortgage: Math.round(annualMortgage / 12),
      monthlyManagement: Math.round(annualManagement / 12),
      monthlyCouncil: Math.round(annualCouncil / 12),
      monthlyInsurance: Math.round(annualInsurance / 12),
      monthlyMaintenance: Math.round(annualMaintenance / 12),
      monthlyVacancy: Math.round(annualVacancy / 12),
      monthlyStrata: Math.round(annualStrata / 12),
      monthlyNetCost: Math.round(annualNet / 12),
      annualRent: Math.round(annualRent),
      annualTotalCosts: Math.round(annualTotalCosts),
      annualLandTax: Math.round(baseAnnualLandTax * inflationFactor),
      annualDeductions: Math.round(baseAnnualDeductions),
    });
  }

  return {
    instanceId: property.instanceId,
    title: property.title,
    buyYear,
    purchasePrice: property.cost,
    loanAmount: property.loanAmount,
    snapshots,
  };
};

export const combineMetrics = (...metrics: PropertyMetrics[]): PropertyMetrics => {
  return metrics.reduce((combined, metric) => ({
    portfolioValue: combined.portfolioValue + metric.portfolioValue,
    totalEquity: combined.totalEquity + metric.totalEquity,
    totalDebt: combined.totalDebt + metric.totalDebt,
    annualCashflow: combined.annualCashflow + metric.annualCashflow,
    annualLoanRepayments: combined.annualLoanRepayments + metric.annualLoanRepayments
  }), {
    portfolioValue: 0,
    totalEquity: 0,
    totalDebt: 0,
    annualCashflow: 0,
    annualLoanRepayments: 0
  });
};