export interface GrowthCurve {
  year1: number;        // Default: 12.5%
  years2to3: number;    // Default: 10%
  year4: number;        // Default: 7.5%
  year5plus: number;    // Default: 6%
}

export interface PropertyPurchase {
  year: number;
  cost: number;
  loanAmount: number;
  depositRequired: number;
  title: string;
  rentalYield: number;
  growthRate: number; // DEPRECATED: Use growthCurve instead
  growthCurve?: GrowthCurve; // Property-specific tiered growth rates
  interestRate?: number;
  state?: string; // 'NSW', 'VIC', 'QLD', etc.
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
  instanceId: string;          // NEW: Unique identifier for this property instance
  title: string;
  cost: number;
  depositRequired: number;
  loanAmount: number;
  period: number;              // NEW: Period when affordable (1, 2, 3, 4...)
  affordableYear: number;      // KEEP: For backwards compatibility (2025, 2025.5, 2026...)
  displayPeriod: string;       // NEW: "2025 H1", "2025 H2", "2026 H1"...
  status: 'feasible' | 'challenging';
  propertyIndex: number;
  portfolioValueAfter: number;
  totalEquityAfter: number;
  totalDebtAfter: number;
  availableFundsUsed: number;
  loanType?: 'IO' | 'PI';      // NEW: Interest Only or Principal & Interest (per-instance)
  
  // Period-by-period cashflow breakdown
  grossRentalIncome: number;
  loanInterest: number;
  expenses: number;
  netCashflow: number;
  
  // Expense breakdown (NEW)
  expenseBreakdown?: {
    councilRatesWater: number;
    strataFees: number;
    insurance: number;
    managementFees: number;
    repairsMaintenance: number;
    landTax: number;
    other: number;
  };
  
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
  
  // Acquisition costs (NEW)
  state?: string; // 'NSW', 'VIC', 'QLD', etc.
  acquisitionCosts?: {
    stampDuty: number;
    lmi: number;
    legalFees: number;
    inspectionFees: number;
    otherFees: number;
    total: number;
  };
  totalCashRequired: number; // deposit + acquisition costs
}

export interface YearBreakdownData {
  period: number;              // NEW: 1, 2, 3, 4... (6-month periods)
  year: number;                // KEEP: For backwards compatibility (2025, 2025.5, 2026...)
  displayYear: number;         // DEPRECATED: Kept for compatibility, consider removing
  displayPeriod: string;       // NEW: "2025 H1", "2025 H2", "2026 H1"...
  status: 'initial' | 'purchased' | 'blocked' | 'waiting';
  propertyNumber: number | null;
  propertyType: string | null;
  
  // Portfolio metrics
  portfolioValue: number;
  totalEquity: number;
  totalDebt: number;
  extractableEquity: number; // NEW: (portfolioValue * 0.80) - totalDebt
  
  // Cash engine
  availableDeposit: number;
  annualCashFlow: number;
  
  // Available funds breakdown
  baseDeposit: number;
  cumulativeSavings: number;
  cashflowReinvestment: number;
  equityRelease: number;
  annualSavingsRate: number; // NEW: Annual savings (not cumulative)
  totalAnnualCapacity: number; // NEW: Annual savings + cashflow reinvestment
  
  // Cashflow components
  grossRental: number;
  loanRepayments: number;
  expenses: number;
  
  // Expense breakdown (NEW)
  expenseBreakdown: {
    councilRatesWater: number; // Combined council rates and water
    strataFees: number;
    insurance: number;
    managementFees: number;
    repairsMaintenance: number;
    landTax: number;
    other: number;
  };
  
  // Requirements
  requiredDeposit: number;
  requiredLoan: number;
  propertyCost: number;
  
  // Capacity
  availableBorrowingCapacity: number;
  borrowingCapacity: number;
  
  // Debt breakdown (NEW)
  existingDebt: number; // Debt before current purchase
  newDebt: number; // Just the new loan for this purchase
  existingLoanInterest: number; // Interest on existing debt only
  newLoanInterest: number; // Interest on new loan only
  
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
  
  borrowingCapacityTest: {
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
  
  // Strategy metrics
  portfolioScaling: number;
  selfFundingEfficiency: number;
  equityRecyclingImpact: number;
  dsr: number;
  lvr: number;
  
  // Breakdown details - Enhanced with equity calculations
  purchases: Array<{
    propertyId: string;
    propertyType: string;
    cost: number;
    deposit: number;
    loanAmount: number;
    loanType?: 'IO' | 'PI';
    year: number;
    displayPeriod: string;
    currentValue: number; // NEW: Current value with growth
    equity: number; // NEW: currentValue - loanAmount
    extractableEquity: number; // NEW: (currentValue * 0.80) - loanAmount
  }>;
  
  // All portfolio properties at this point in time (NEW)
  allPortfolioProperties: Array<{
    propertyId: string;
    propertyType: string;
    purchaseYear: number;
    displayPeriod: string;
    originalCost: number;
    currentValue: number;
    loanAmount: number;
    equity: number;
    extractableEquity: number;
  }>;
}