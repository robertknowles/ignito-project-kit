import type { PropertyPurchase, PropertyMetrics } from '../types/property';

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