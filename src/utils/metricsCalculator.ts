import type { PropertyPurchase, PropertyMetrics, PropertyExpenses, CashFlowAnalysis } from '../types/property';

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
  expenses: PropertyExpenses = DEFAULT_PROPERTY_EXPENSES
): { total: number; breakdown: CashFlowAnalysis['expenseBreakdown'] } => {
  const managementFees = rentalIncome * expenses.managementFeeRate;
  const councilRates = expenses.councilRates;
  const insurance = expenses.insurance;
  const maintenance = propertyValue * expenses.maintenanceRate;
  const vacancyAllowance = rentalIncome * expenses.vacancyRate;
  const strataFees = expenses.strataFees || 0;
  
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
  const currentValue = purchase.cost * Math.pow(1 + purchase.growthRate, yearsHeld);
  const annualRent = currentValue * purchase.rentalYield;
  
  const mortgagePayments = calculateMortgagePayments(
    purchase.loanAmount, 
    purchase.interestRate || 0.05
  );
  
  const expensesAnalysis = calculateAnnualExpenses(currentValue, annualRent, expenses);
  
  const netCashflow = annualRent - mortgagePayments - expensesAnalysis.total;
  
  return {
    rentalIncome: Math.round(annualRent),
    mortgagePayments: Math.round(mortgagePayments),
    propertyExpenses: expensesAnalysis.total,
    netCashflow: Math.round(netCashflow),
    expenseBreakdown: expensesAnalysis.breakdown
  };
};

export const calculateUpdatedBorrowingCapacity = (
  baseCapacity: number,
  existingLoans: number,
  rentalIncome: number,
  debtServiceRatio: number = 0.8
): number => {
  const availableServiceability = baseCapacity * debtServiceRatio;
  const rentalContribution = rentalIncome * 0.7; // Typically banks consider 70% of rental income
  return Math.max(0, availableServiceability - existingLoans + rentalContribution);
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
    
    // Use property-specific growth rate if available, otherwise use base rate
    const growthRate = purchase.growthRate || baseGrowthRate;
    const currentValue = purchase.cost * Math.pow(1 + growthRate, yearsHeld);
    
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

  const currentValue = portfolioValue * Math.pow(1 + growthRate, yearsGrown);
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
    const growthRateToUse = purchase.growthRate || growthRate;
    const currentValue = purchase.cost * Math.pow(1 + growthRateToUse, yearsHeld);
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
    
    // Calculate updated capacity
    const capacity = calculateUpdatedBorrowingCapacity(baseCapacity, existingDebt, rentalIncome, debtServiceRatio);
    
    progression.push({
      year: currentYear,
      capacity: Math.round(capacity),
      rentContribution: Math.round(rentContribution)
    });
  }
  
  return progression;
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