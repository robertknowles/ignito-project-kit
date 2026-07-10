import type { PropertyInstanceDetails } from '../types/propertyInstance';
import type { GrowthCurve } from '../types/property';
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext';
import { GROWTH_RATE_TIERS } from '../constants/financialParams';
import {
  isCellId,
  translateLegacyTypeKey,
  translateLegacyEngineId,
} from './propertyCells';

// 10-cell type×mode matrix (canonical model).
import propertyDefaults from '../data/property-defaults.json';

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
 *   1. If input is a v4 cell ID → return cell defaults.
 *   2. If input is a legacy positional engine ID (`property_N`) → translate
 *      to v4 cell ID and return cell defaults.
 *   3. If input is a legacy v3 type key (e.g. "duplexes") → translate to v4
 *      cell ID and return cell defaults (preserves saved scenarios).
 *   4. Normalise display label to a key, then retry steps 1 + 3.
 *   5. Fall back to minimal defaults.
 *
 * `valuationAtPurchase` always defaults to `purchasePrice`.
 */
export const getPropertyInstanceDefaults = (
  propertyType: string
): PropertyInstanceDetails => {
  const lookupCell = (cellId: string): PropertyInstanceDetails | null => {
    const defaults = propertyDefaults[cellId as keyof typeof propertyDefaults] as
      | PropertyInstanceDetails
      | undefined;
    return defaults ? { ...defaults, valuationAtPurchase: defaults.purchasePrice } : null;
  };

  // 1. Direct v4 cell ID
  if (isCellId(propertyType)) {
    const result = lookupCell(propertyType);
    if (result) return result;
  }

  // 2. Legacy positional engine ID (property_0..property_7)
  const positionalCellId = translateLegacyEngineId(propertyType);
  if (positionalCellId) {
    const result = lookupCell(positionalCellId);
    if (result) return result;
  }

  // 3. Legacy v3 type key (e.g. "duplexes", "units-apartments")
  const legacyTranslation = translateLegacyTypeKey(propertyType);
  if (legacyTranslation) {
    const result = lookupCell(legacyTranslation.newCellId);
    if (result) return result;
  }

  // 4. Display-label normalisation
  const normalisedKey = propertyTypeToKey(propertyType);
  if (isCellId(normalisedKey)) {
    const result = lookupCell(normalisedKey);
    if (result) return result;
  }
  const normalisedLegacy = translateLegacyTypeKey(normalisedKey);
  if (normalisedLegacy) {
    const result = lookupCell(normalisedLegacy.newCellId);
    if (result) return result;
  }

  // 5. Minimal defaults
  return createMinimalDefaults();
};

/**
 * Overlays the BA's global Next-Purchase cost defaults (set on the Assumptions
 * page) onto a freshly-resolved instance-defaults object.
 *
 * Applied ONLY at instance materialisation (createInstance / scenarioRunner
 * gap-fill), so already-placed / loaded instances are never rewritten — the
 * defaults affect FUTURE purchases only.
 *
 * For each field: an `undefined` profile default means "leave the per-type
 * value" (keeps property-defaults.json's tailored costs). A defined value
 * overrides. The two `*Mode === 'percent'` fields seed a dollar figure from the
 * base purchase price. Returns a new object; never mutates `base`.
 */
export const applyGlobalCostDefaults = (
  base: PropertyInstanceDetails,
  profile: Partial<InvestmentProfileData>
): PropertyInstanceDetails => {
  const price = base.purchasePrice;
  const flat = (v: number | undefined, fallback: number): number =>
    v === undefined ? fallback : v;

  return {
    ...base,
    // One-off purchase costs
    engagementFee:
      profile.defaultEngagementFee === undefined
        ? base.engagementFee
        : profile.defaultEngagementFeeMode === 'percent'
          ? Math.round(price * (profile.defaultEngagementFee / 100))
          : profile.defaultEngagementFee,
    conveyancing: flat(profile.defaultConveyancing, base.conveyancing),
    mortgageFees: flat(profile.defaultMortgageFees, base.mortgageFees),
    buildingPestInspection: flat(profile.defaultBuildingPestInspection, base.buildingPestInspection),
    buildingInsuranceUpfront: flat(profile.defaultBuildingInsuranceUpfront, base.buildingInsuranceUpfront),
    plumbingElectricalInspections: flat(profile.defaultPlumbingElectricalInspections, base.plumbingElectricalInspections),
    independentValuation: flat(profile.defaultIndependentValuation, base.independentValuation),
    maintenanceAllowancePostSettlement: flat(profile.defaultMaintenancePostSettlement, base.maintenanceAllowancePostSettlement),
    // Annual holding costs
    propertyManagementPercent: flat(profile.defaultPropertyManagementPercent, base.propertyManagementPercent),
    buildingInsuranceAnnual: flat(profile.defaultBuildingInsuranceAnnual, base.buildingInsuranceAnnual),
    councilRatesWater: flat(profile.defaultCouncilRatesWater, base.councilRatesWater),
    strata: flat(profile.defaultStrata, base.strata),
    maintenanceAllowanceAnnual:
      profile.defaultMaintenanceAnnual === undefined
        ? base.maintenanceAllowanceAnnual
        : profile.defaultMaintenanceAnnualMode === 'percent'
          ? Math.round(price * (profile.defaultMaintenanceAnnual / 100))
          : profile.defaultMaintenanceAnnual,
  };
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
    ioTermYears: 5,
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
