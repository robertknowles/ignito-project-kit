import type { PropertyInstanceDetails } from '../types/propertyInstance';
import type { GrowthCurve } from '../types/property';

// Import the property defaults JSON
import propertyDefaults from '../data/property-defaults.json';

/**
 * Growth curve presets for High/Medium/Low growth assumptions
 * These are used when a property instance has a growthAssumption set
 */
export const GROWTH_CURVE_PRESETS: Record<'High' | 'Medium' | 'Low', GrowthCurve> = {
  High: {
    year1: 12.5,      // Strong initial growth
    years2to3: 10,    // Continued strong growth
    year4: 7.5,       // Moderating
    year5plus: 6,     // Long-term average
  },
  Medium: {
    year1: 8,
    years2to3: 6,
    year4: 5,
    year5plus: 4,
  },
  Low: {
    year1: 5,
    years2to3: 4,
    year4: 3,
    year5plus: 2.5,
  },
};

/**
 * Converts a growthAssumption tier (High/Medium/Low) to a GrowthCurve
 * Falls back to 'High' if an invalid value is provided
 */
export const getGrowthCurveFromAssumption = (
  growthAssumption: 'High' | 'Medium' | 'Low' | undefined
): GrowthCurve => {
  const tier = growthAssumption || 'High';
  return GROWTH_CURVE_PRESETS[tier] || GROWTH_CURVE_PRESETS.High;
};

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
    rentPerWeek: 335,
    growthAssumption: 'Medium',
    minimumYield: 4.5,
    daysToUnconditional: 21,
    daysForSettlement: 42,
    lvr: 88,
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
    vacancyRate: 4,
    propertyManagementPercent: 8,
    buildingInsuranceAnnual: 1200,
    councilRatesWater: 2000,
    strata: 2700,
    maintenanceAllowanceAnnual: 1750,
    landTaxOverride: null,
    potentialDeductionsRebates: 0,
    // LMI capitalization defaults to false (LMI paid upfront, not added to loan)
    lmiCapitalized: false,
  };
};



