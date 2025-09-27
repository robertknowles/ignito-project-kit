import type { PropertyPurchase, PropertyMetrics } from '../types/property';

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
  interestRate: number = 0.05
): PropertyMetrics => {
  return purchases.reduce((metrics, purchase) => {
    const yearsHeld = Math.max(0, currentYear - purchase.year);
    
    // Use property-specific growth rate if available, otherwise use base rate
    const growthRate = purchase.growthRate || baseGrowthRate;
    const currentValue = purchase.cost * Math.pow(1 + growthRate, yearsHeld);
    
    // Simplified debt model - no principal reduction
    const remainingDebt = purchase.loanAmount;
    const propertyEquity = Math.max(0, currentValue - remainingDebt);
    
    // Annual rental income based on current property value
    const annualRent = purchase.rentalYield * currentValue;
    
    // Annual loan repayments (interest only)
    const annualRepayments = purchase.loanAmount * interestRate;

    return {
      portfolioValue: metrics.portfolioValue + currentValue,
      totalEquity: metrics.totalEquity + propertyEquity,
      totalDebt: metrics.totalDebt + remainingDebt,
      annualCashflow: metrics.annualCashflow + (annualRent - annualRepayments),
      annualLoanRepayments: metrics.annualLoanRepayments + annualRepayments
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