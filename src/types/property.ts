export interface PropertyPurchase {
  year: number;
  cost: number;
  loanAmount: number;
  depositRequired: number;
  title: string;
  rentalYield: number;
  growthRate: number;
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