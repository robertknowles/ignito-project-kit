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
  status: 'feasible' | 'challenging' | 'consolidation' | 'waiting' | 'blocked';
  propertyIndex: number;
  portfolioValueAfter: number;
  totalEquityAfter: number;
  totalDebtAfter: number;
  availableFundsUsed: number;
  isConsolidationPhase?: boolean;
  consolidationDetails?: {
    propertiesSold: number;
    equityFreed: number;
    debtReduced: number;
  };
  
  // Year-by-year cashflow breakdown
  grossRentalIncome: number;
  loanInterest: number;
  expenses: number;
  netCashflow: number;
  
  // Test details
  depositTestSurplus: number;
  depositTestPass: boolean;
  serviceabilityTestSurplus: number;
  serviceabilityTestPass: boolean;
  borrowingCapacityUsed: number;
  borrowingCapacityRemaining: number;
  
  // Flags and rates
  isGapRuleBlocked: boolean;
  rentalRecognitionRate: number;
  
  // Portfolio state before purchase
  portfolioValueBefore: number;
  totalEquityBefore: number;
  totalDebtBefore: number;
  
  // Available funds breakdown
  baseDeposit: number;
  cumulativeSavings: number;
  cashflowReinvestment: number;
  equityRelease: number;
}

export interface YearBreakdownData {
  year: number;
  displayYear: number;
  status: 'initial' | 'purchased' | 'blocked' | 'waiting' | 'consolidated';
  propertyNumber: number | null;
  propertyType: string | null;
  
  // Portfolio metrics
  portfolioValue: number;
  totalEquity: number;
  totalDebt: number;
  
  // Cash engine
  availableDeposit: number;
  annualCashFlow: number;
  
  // Available funds breakdown
  baseDeposit: number;
  cumulativeSavings: number;
  cashflowReinvestment: number;
  equityRelease: number;
  
  // Cashflow components
  grossRental: number;
  loanRepayments: number;
  expenses: number;
  
  // Requirements
  requiredDeposit: number;
  requiredLoan: number;
  propertyCost: number;
  
  // Capacity
  availableBorrowingCapacity: number;
  borrowingCapacity: number;
  
  // Assumptions
  interestRate: number;
  rentalRecognition: number;
  
  // Tests
  depositTest: {
    pass: boolean;
    surplus: number;
    available: number;
    required: number;
  };
  
  serviceabilityTest: {
    pass: boolean;
    surplus: number;
    available: number;
    required: number;
  };
  
  // Flags
  gapRule: boolean;
  equityReleaseYear: boolean;
  
  // Consolidation
  consolidation?: {
    triggered: boolean;
    eligible: boolean;
    consecutiveFailures: number;
    propertiesSold?: number;
    equityFreed?: number;
    debtReduced?: number;
    newLvr?: number;
  };
  
  // Strategy metrics
  portfolioScaling: number;
  selfFundingEfficiency: number;
  equityRecyclingImpact: number;
  dsr: number;
  lvr: number;
  
  // Breakdown details
  purchases: Array<{
    propertyId: string;
    propertyType: string;
    cost: number;
    deposit: number;
    loanAmount: number;
    year: number;
  }>;
}