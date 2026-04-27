import type { PropertyInstanceDetails } from '../types/propertyInstance';
import type { GrowthCurve } from '../types/property';
import { GROWTH_RATE_TIERS } from '../constants/financialParams';
import {
  isCellId,
  translateLegacyTypeKey,
  translateLegacyEngineId,
} from './propertyCells';

// v4: 10-cell type×mode matrix (current model)
import propertyDefaultsV4 from '../data/property-defaults-v4.json';
// v3: 8-template legacy model — kept for back-compat scenario loads.
import propertyDefaultsV3 from '../data/property-defaults.json';

/**
 * Converts a growthAssumption tier (High/Medium/Low) to a GrowthCurve.
 * Reads from the canonical GROWTH_RATE_TIERS in financialParams.ts.
 * Falls back to 'High' if an invalid value is provided.
 */
export const getGrowthCurveFromAssumption = (
  growthAssumption: 'High' | 'Medium' | 'Low' | undefined
): GrowthCurve => {
  const tier = growthAssumption || 'High';
  return GROWTH_RATE_TIERS[tier] || GROWTH_RATE_TIERS.High;
};

/**
 * Normalises a display label to a kebab-case key.
 * e.g. "Units / Apartments" → "units-apartments"
 *      "Metro House — Growth" → "metro-house-—-growth" (then v4-key-equivalent below)
 */
const propertyTypeToKey = (propertyType: string): string => {
  return propertyType
    .toLowerCase()
    .replace(/\s*\/\s*/g, '-')
    .replace(/\s*—\s*/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[()]/g, '');
};

/**
 * Returns instance defaults for a property type.
 *
 * Resolution order:
 *   1. If input is a v4 cell ID → return v4 defaults.
 *   2. If input is a legacy positional engine ID (`property_N`) → translate
 *      to v4 cell ID and return v4 defaults.
 *   3. If input is a legacy v3 type key (e.g. "duplexes") → translate to v4
 *      cell ID and return v4 defaults (preserves saved scenarios).
 *   4. Normalise display label to a key:
 *      a. If normalised key is a v4 cell ID → v4 defaults.
 *      b. Else if normalised key is a v3 key → v3 defaults.
 *   5. Fall back to minimal defaults.
 *
 * `valuationAtPurchase` always defaults to `purchasePrice`.
 */
export const getPropertyInstanceDefaults = (
  propertyType: string
): PropertyInstanceDetails => {
  // 1. Direct v4 cell ID
  if (isCellId(propertyType)) {
    const defaults = propertyDefaultsV4[propertyType] as PropertyInstanceDetails;
    return { ...defaults, valuationAtPurchase: defaults.purchasePrice };
  }

  // 2. Legacy positional engine ID (property_0..property_7)
  const positionalCellId = translateLegacyEngineId(propertyType);
  if (positionalCellId) {
    const defaults = propertyDefaultsV4[positionalCellId] as PropertyInstanceDetails;
    return { ...defaults, valuationAtPurchase: defaults.purchasePrice };
  }

  // 3. Legacy v3 type key (e.g. "duplexes", "units-apartments")
  const legacyTranslation = translateLegacyTypeKey(propertyType);
  if (legacyTranslation) {
    const defaults = propertyDefaultsV4[legacyTranslation.newCellId] as PropertyInstanceDetails;
    return { ...defaults, valuationAtPurchase: defaults.purchasePrice };
  }

  // 4. Display-label paths
  const normalisedKey = propertyTypeToKey(propertyType);

  // 4a. Normalised → v4 cell ID
  if (isCellId(normalisedKey)) {
    const defaults = propertyDefaultsV4[normalisedKey] as PropertyInstanceDetails;
    return { ...defaults, valuationAtPurchase: defaults.purchasePrice };
  }

  // 4b. Normalised → v3 key (back-compat for "Metro Houses" etc. before UI migration)
  const v3Defaults = propertyDefaultsV3[normalisedKey as keyof typeof propertyDefaultsV3];
  if (v3Defaults) {
    // Translate v3 → v4 to keep behaviour aligned with the new matrix.
    const v3Translation = translateLegacyTypeKey(normalisedKey);
    if (v3Translation) {
      const v4Defaults = propertyDefaultsV4[v3Translation.newCellId] as PropertyInstanceDetails;
      return { ...v4Defaults, valuationAtPurchase: v4Defaults.purchasePrice };
    }
    // No translation found — return v3 defaults as-is (defensive fallback).
    return { ...v3Defaults, valuationAtPurchase: v3Defaults.purchasePrice } as PropertyInstanceDetails;
  }

  // 5. Minimal defaults
  return createMinimalDefaults();
};

/**
 * Creates minimal defaults when property type not found.
 * Note: valuationAtPurchase defaults to purchasePrice.
 */
const createMinimalDefaults = (): PropertyInstanceDetails => {
  return {
    state: 'NSW',
    purchasePrice: 420000,
    valuationAtPurchase: 420000,
    rentPerWeek: 405,
    growthAssumption: 'Medium',
    lvr: 88,
    lmiWaiver: false,
    loanProduct: 'IO',
    interestRate: 6.5,
    loanTerm: 30,
    engagementFee: 8000,
    conditionalHoldingDeposit: 8400,
    buildingInsuranceUpfront: 1500,
    buildingPestInspection: 700,
    plumbingElectricalInspections: 300,
    independentValuation: 0,
    mortgageFees: 1000,
    conveyancing: 2200,
    maintenanceAllowancePostSettlement: 1500,
    stampDutyOverride: null,
    propertyManagementPercent: 8,
    buildingInsuranceAnnual: 1200,
    councilRatesWater: 2000,
    strata: 2000,
    maintenanceAllowanceAnnual: 1600,
    landTaxOverride: null,
    lmiCapitalized: false,
    mode: 'Growth',
  };
};
