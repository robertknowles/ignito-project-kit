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

  // Section B: Contract & Loan Details (5 fields)

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

  // Section D: One-Off Purchase Costs (11 fields)
  
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

  /** Mortgage setup and discharge fees */
  mortgageFees: number;
  
  /** Conveyancing fees including searches */
  conveyancing: number;

  /** Post-settlement maintenance buffer fund */
  maintenanceAllowancePostSettlement: number;
  
  /** Override for calculated stamp duty (null = use calculated value) */
  stampDutyOverride: number | null;
  
  // Section E: Cashflow (7 fields)

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

  /** Vacancy rate as % of rental income (e.g., 2 for 2%). Optional — UI surfaces it for per-property override; engine currently uses DEFAULT_VACANCY_RATE constant globally. */
  vacancyRate?: number;

  // Section F: Manual Placement (Drag-and-Drop)
  
  /** Whether this property has been manually placed via drag-and-drop */
  isManuallyPlaced?: boolean;
  
  /** The target period when manually placed (1 = 2025 H1, 2 = 2025 H2, etc.) */
  manualPlacementPeriod?: number;
  
  /** Flag indicating this property has been manually amended to fit guardrails */
  hasBeenAmended?: boolean;
  
  /** Whether LMI should be capitalized into the loan (reduces upfront cash required) */
  lmiCapitalized?: boolean;

  /**
   * Strategic configuration mode for the property type.
   * 'Growth' | 'Cashflow' for residential cells; 'HighCost' | 'LowCost' for commercial.
   * Optional during the pivot — defaults inferred from the cell ID via propertyCells.ts.
   */
  mode?: 'Growth' | 'Cashflow' | 'HighCost' | 'LowCost';
}





