import type { PropertyInstanceDetails } from '../types/propertyInstance';

// Import the property defaults JSON
import propertyDefaults from '../data/property-defaults.json';

/**
 * Converts property type display name to JSON key
 * e.g., "Units / Apartments" -> "units-apartments"
 */
const propertyTypeToKey = (propertyType: string): string => {
  return propertyType
    .toLowerCase()
    .replace(/\s*\/\s*/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[()]/g, '');
};

/**
 * Gets default values for a property instance based on property type
 * NO LONGER uses global assumptions - each property type has its own template with all fields
 * Note: valuationAtPurchase is set to purchasePrice by default
 */
export const getPropertyInstanceDefaults = (
  propertyType: string
): PropertyInstanceDetails => {
  const key = propertyTypeToKey(propertyType);
  const defaults = propertyDefaults[key as keyof typeof propertyDefaults];
  
  if (!defaults) {
    console.warn(`No defaults found for property type: ${propertyType} (key: ${key})`);
    // Return minimal defaults
    return createMinimalDefaults();
  }
  
  // Return the template with valuationAtPurchase defaulting to purchasePrice
  return {
    ...defaults,
    valuationAtPurchase: defaults.purchasePrice, // Default valuation to purchase price
  };
};

/**
 * Creates minimal defaults when property type not found
 * Note: valuationAtPurchase defaults to purchasePrice
 */
const createMinimalDefaults = (): PropertyInstanceDetails => {
  return {
    state: 'VIC',
    purchasePrice: 350000,
    valuationAtPurchase: 350000, // Default to same as purchase price
    rentPerWeek: 480,
    growthAssumption: 'High',
    minimumYield: 6.5,
    daysToUnconditional: 21,
    daysForSettlement: 42,
    lvr: 80,
    lmiWaiver: false,
    loanProduct: 'IO',
    interestRate: 6.5,
    loanTerm: 30,
    loanOffsetAccount: 0,
    engagementFee: 8000,
    conditionalHoldingDeposit: 7000,
    buildingInsuranceUpfront: 1400,
    buildingPestInspection: 600,
    plumbingElectricalInspections: 0,
    independentValuation: 0,
    unconditionalHoldingDeposit: 0,
    mortgageFees: 1000,
    conveyancing: 2200,
    ratesAdjustment: 0,
    maintenanceAllowancePostSettlement: 0,
    stampDutyOverride: null,
    vacancyRate: 0,
    propertyManagementPercent: 6.6,
    buildingInsuranceAnnual: 350,
    councilRatesWater: 2000,
    strata: 2700,
    maintenanceAllowanceAnnual: 1750,
    landTaxOverride: null,
    potentialDeductionsRebates: 0,
  };
};



