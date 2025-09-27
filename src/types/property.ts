export interface PropertyPurchase {
  year: number;
  cost: number;
  loanAmount: number;
  depositRequired: number;
  title: string;
  rentalYield: number;
  growthRate: number;
  interestRate?: number;
}

export interface PropertyExpenses {
  managementFeeRate: number; // % of rental income
  councilRates: number; // Annual fixed amount
  insurance: number; // Annual fixed amount
  maintenanceRate: number; // % of property value
  vacancyRate: number; // % allowance for vacancy
  strataFees?: number; // Annual strata fees (for apartments)
}

export interface CashFlowAnalysis {
  rentalIncome: number;
  mortgagePayments: number;
  propertyExpenses: number;
  netCashflow: number;
  expenseBreakdown: {
    managementFees: number;
    councilRates: number;
    insurance: number;
    maintenance: number;
    vacancyAllowance: number;
    strataFees: number;
  };
}

export interface GrowthProjection {
  year: number;
  portfolioValue: number;
  totalEquity: number;
  annualIncome: number;
  properties: {
    propertyId: string;
    title: string;
    currentValue: number;
    equity: number;
    rentalIncome: number;
    yearsPurchased: number;
  }[];
}

export interface PropertyMetrics {
  portfolioValue: number;
  totalEquity: number;
  totalDebt: number;
  annualCashflow: number;
  annualLoanRepayments: number;
}

export interface TimelineProperty {
  id: string;
  title: string;
  cost: number;
  depositRequired: number;
  loanAmount: number;
  affordableYear: number;
  status: 'feasible' | 'challenging';
  propertyIndex: number;
  portfolioValueAfter: number;
  totalEquityAfter: number;
  availableFundsUsed: number;
}