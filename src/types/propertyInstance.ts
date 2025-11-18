/**
 * Represents all editable details for a single property instance in the timeline.
 * These values can override the default property type assumptions.
 */
export interface PropertyInstanceDetails {
  // Section A: Property Overview (6 fields)
  
  /** Australian state where property is located (VIC, NSW, QLD, SA, WA, TAS, NT, ACT) */
  state: string;
  
  /** Purchase price of the property */
  purchasePrice: number;
  
  /** Valuation at time of purchase (typically higher than purchase price for good deals) */
  valuationAtPurchase: number;
  
  /** Weekly rental income */
  rentPerWeek: number;
  
  /** Growth assumption tier (High, Medium, Low) - determines tiered growth rates */
  growthAssumption: 'High' | 'Medium' | 'Low';
  
  /** Minimum acceptable yield threshold for validation */
  minimumYield: number;
  
  // Section B: Contract & Loan Details (8 fields)
  
  /** Days from contract to unconditional exchange */
  daysToUnconditional: number;
  
  /** Days from contract to settlement */
  daysForSettlement: number;
  
  /** Loan-to-value ratio (0-100) */
  lvr: number;
  
  /** Whether LMI is waived (typically for commercial or professional packages) */
  lmiWaiver: boolean;
  
  /** Loan product type: Interest Only or Principal & Interest */
  loanProduct: 'IO' | 'PI';
  
  /** Annual interest rate (e.g., 6.5 for 6.5%) */
  interestRate: number;
  
  /** Loan term in years (typically 30 for residential, 20-25 for commercial) */
  loanTerm: number;
  
  /** Balance in offset account (reduces effective interest paid) */
  loanOffsetAccount: number;
  
  // Section D: One-Off Purchase Costs (12 fields)
  
  /** Buyer's agent engagement fee */
  engagementFee: number;
  
  /** Deposit paid at conditional exchange (typically 2% of purchase price) */
  conditionalHoldingDeposit: number;
  
  /** Upfront building and landlord insurance premium */
  buildingInsuranceUpfront: number;
  
  /** Building and pest inspection cost */
  buildingPestInspection: number;
  
  /** Plumbing and electrical inspection cost (optional) */
  plumbingElectricalInspections: number;
  
  /** Independent property valuation cost (optional) */
  independentValuation: number;
  
  /** Additional deposit at unconditional exchange (typically $0) */
  unconditionalHoldingDeposit: number;
  
  /** Mortgage setup and discharge fees */
  mortgageFees: number;
  
  /** Conveyancing fees including searches */
  conveyancing: number;
  
  /** Council rates adjustment at settlement (typically $0) */
  ratesAdjustment: number;
  
  /** Post-settlement maintenance buffer fund */
  maintenanceAllowancePostSettlement: number;
  
  /** Override for calculated stamp duty (null = use calculated value) */
  stampDutyOverride: number | null;
  
  // Section E: Cashflow (8 fields)
  
  /** Vacancy rate as percentage (e.g., 2 for 2%) */
  vacancyRate: number;
  
  /** Property management fee as percentage of rent (e.g., 6.6 for 6.6%) */
  propertyManagementPercent: number;
  
  /** Annual building and landlord insurance cost */
  buildingInsuranceAnnual: number;
  
  /** Annual council rates and water charges */
  councilRatesWater: number;
  
  /** Annual strata fees (body corporate) - $0 for houses */
  strata: number;
  
  /** Annual maintenance allowance (typically 0.5-1% of property value) */
  maintenanceAllowanceAnnual: number;
  
  /** Override for calculated land tax (null = use calculated value) */
  landTaxOverride: number | null;
  
  /** Potential tax deductions or rebates */
  potentialDeductionsRebates: number;
}





