import type { PropertyPurchase, PropertyMetrics, PropertyExpenses, CashFlowAnalysis, GrowthProjection } from '../types/property';

// Tiered growth function: 10% for years 1-2, 6% for years 3+
const calculatePropertyGrowth = (initialValue: number, years: number): number => {
  let currentValue = initialValue;
  
  for (let year = 1; year <= years; year++) {
    let growthRate;
    if (year <= 2) {
      growthRate = 0.10; // 10% for years 1-2
    } else {
      growthRate = 0.06; // 6% for years 3+
    }
    currentValue *= (1 + growthRate);
  }
  
  return currentValue;
};

// Helper function to get the growth rate for a specific year
export const getGrowthRateForYear = (yearsOwned: number): number => {
  if (yearsOwned <= 2) {
    return 0.10; // 10% for years 1-2
  } else {
    return 0.06; // 6% for years 3+
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
  yearsOwned: number = 0
): { total: number; breakdown: CashFlowAnalysis['expenseBreakdown'] } => {
  // Apply 3% annual inflation to all expenses
  const inflationFactor = Math.pow(1.03, yearsOwned);
  
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
  expenses: PropertyExpenses = DEFAULT_PROPERTY_EXPENSES
): CashFlowAnalysis => {
  const yearsHeld = Math.max(0, currentYear - purchase.year);
  // Use tiered growth (10% years 1-2, 6% years 3+)
  const currentValue = calculatePropertyGrowth(purchase.cost, yearsHeld);
  const annualRent = currentValue * purchase.rentalYield;
  
  const mortgagePayments = calculateMortgagePayments(
    purchase.loanAmount, 
    purchase.interestRate || 0.05
  );
  
  const expensesAnalysis = calculateAnnualExpenses(currentValue, annualRent, expenses, yearsHeld);
  
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
  interestRate: number = 0.05,
  expenses: PropertyExpenses = DEFAULT_PROPERTY_EXPENSES
): PropertyMetrics => {
  return purchases.reduce((metrics, purchase) => {
    const yearsHeld = Math.max(0, currentYear - purchase.year);
    
    // Use tiered growth (10% years 1-2, 6% years 3+)
    const currentValue = calculatePropertyGrowth(purchase.cost, yearsHeld);
    
    // Use detailed cash flow analysis
    const cashFlowAnalysis = analyzeCashFlow(purchase, currentYear, expenses);
    
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
  interestRate: number = 0.05
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

  // Use tiered growth (10% years 1-2, 6% years 3+)
  const currentValue = calculatePropertyGrowth(portfolioValue, yearsGrown);
  const equity = Math.max(0, currentValue - currentDebt);
  const annualRepayments = currentDebt * interestRate;

  return {
    portfolioValue: currentValue,
    totalEquity: equity,
    totalDebt: currentDebt,
    annualCashflow: -annualRepayments, // Existing portfolio typically has no rental income in this model
    annualLoanRepayments: annualRepayments
  };
};

export const calculateTotalRentalIncome = (
  purchases: PropertyPurchase[],
  currentYear: number,
  growthRate: number
): number => {
  return purchases.reduce((totalIncome, purchase) => {
    const yearsHeld = Math.max(0, currentYear - purchase.year);
    // Use tiered growth (10% years 1-2, 6% years 3+)
    const currentValue = calculatePropertyGrowth(purchase.cost, yearsHeld);
    const annualRent = purchase.rentalYield * currentValue;
    return totalIncome + annualRent;
  }, 0);
};

export const calculateBorrowingCapacityProgression = (
  baseCapacity: number,
  purchases: PropertyPurchase[],
  timelineYears: number,
  growthRate: number,
  debtServiceRatio: number = 0.8
): Array<{ year: number; capacity: number; rentContribution: number }> => {
  const progression: Array<{ year: number; capacity: number; rentContribution: number }> = [];
  
  for (let year = 1; year <= timelineYears; year++) {
    const currentYear = 2025 + year - 1;
    const purchasesByThisYear = purchases.filter(p => p.year <= currentYear);
    
    // Calculate existing debt
    const existingDebt = purchasesByThisYear.reduce((debt, p) => debt + p.loanAmount, 0);
    
    // Calculate rental income
    const rentalIncome = calculateTotalRentalIncome(purchasesByThisYear, currentYear, growthRate);
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
  baseYear: number = 2025
): GrowthProjection[] => {
  const projections: GrowthProjection[] = [];
  
  for (let year = 0; year <= timelineYears; year++) {
    const currentYear = baseYear + year;
    
    // Calculate existing portfolio growth with tiered rates
    let existingValue = 0;
    let existingEquity = 0;
    if (existingPortfolioValue > 0) {
      // Use tiered growth (10% years 1-2, 6% years 3+)
      existingValue = calculatePropertyGrowth(existingPortfolioValue, year);
      existingEquity = Math.max(0, existingValue - existingDebt);
    }
    
    // Calculate values for purchased properties
    const propertyValues = purchases
      .filter(p => p.year <= currentYear)
      .map(purchase => {
        const yearsHeld = Math.max(0, currentYear - purchase.year);
        // Use tiered growth (10% years 1-2, 6% years 3+)
        const currentValue = calculatePropertyGrowth(purchase.cost, yearsHeld);
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