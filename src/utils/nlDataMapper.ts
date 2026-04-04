/**
 * NL Data Mapper
 *
 * Converts NLParseResponse (from the nl-parse edge function) into the exact
 * shapes needed by PropPath's existing React contexts. Claude extracts data;
 * this module maps it; the engine calculates.
 *
 * Steps 1.6, 1.7, 1.8 of NL-PIVOT-PLAN.csv
 */

import type { NLParseResponse } from '@/types/nlParse';
import type { InvestmentProfileData } from '@/contexts/InvestmentProfileContext';
import type { PropertySelection } from '@/contexts/PropertySelectionContext';
import type { PropertyInstanceDetails } from '@/types/propertyInstance';
import { getPropertyInstanceDefaults } from '@/utils/propertyInstanceDefaults';
import propertyDefaults from '@/data/property-defaults.json';

// ── Property Type Key → Engine ID Mapping ─────────────────────────
// The engine (PropertySelectionContext) uses index-based IDs like "property_0".
// The NL system uses descriptive keys like "units-apartments".
// This map bridges the two worlds.
const propertyDefaultKeys = Object.keys(propertyDefaults);
const nlKeyToEngineId: Record<string, string> = {};
const engineIdToNlKey: Record<string, string> = {};
propertyDefaultKeys.forEach((key, index) => {
  nlKeyToEngineId[key] = `property_${index}`;
  engineIdToNlKey[`property_${index}`] = key;
});

// ── Step 1.6: Map to Investment Profile ────────────────────────────

/**
 * Maps NLParseResponse to a partial InvestmentProfileData that can be
 * passed to InvestmentProfileContext.updateProfile().
 *
 * Only sets fields that Claude extracted — the rest keep their defaults.
 */
export function mapToInvestmentProfile(
  response: NLParseResponse
): Partial<InvestmentProfileData> {
  const updates: Partial<InvestmentProfileData> = {};

  // From clientProfile
  if (response.clientProfile) {
    const { currentDeposit, monthlySavings, existingDebt, members } = response.clientProfile;

    updates.depositPool = currentDeposit;
    updates.annualSavings = monthlySavings * 12;
    updates.currentDebt = existingDebt ?? 0;

    // baseSalary = highest individual earner (used for serviceability)
    if (members.length > 0) {
      updates.baseSalary = Math.max(...members.map((m) => m.annualIncome));
    }
  }

  // From investmentProfile (overrides clientProfile values if both present)
  if (response.investmentProfile) {
    const ip = response.investmentProfile;

    if (ip.depositPool !== undefined) updates.depositPool = ip.depositPool;
    if (ip.annualSavings !== undefined) updates.annualSavings = ip.annualSavings;
    if (ip.baseSalary !== undefined) updates.baseSalary = ip.baseSalary;
    if (ip.timelineYears !== undefined) updates.timelineYears = ip.timelineYears;
    if (ip.equityGoal !== undefined) updates.equityGoal = ip.equityGoal;
    if (ip.cashflowGoal !== undefined) updates.cashflowGoal = ip.cashflowGoal;
    if (ip.targetPassiveIncome !== undefined) updates.targetPassiveIncome = ip.targetPassiveIncome;
  }

  // Pacing mode from NL input
  if (response.pacing) {
    updates.pacingMode = response.pacing;
  }

  return updates;
}

// ── Step 1.7: Map to Property Selections + Instances ───────────────

interface PropertyMappingResult {
  selections: PropertySelection;
  propertyOrder: string[];
  instances: Record<string, PropertyInstanceDetails>;
}

/**
 * Maps NLParseResponse.properties[] to the three things PropPath needs:
 * 1. PropertySelection — { propertyTypeId: count }
 * 2. propertyOrder — ordered list of instance IDs
 * 3. instances — Record<instanceId, PropertyInstanceDetails>
 *
 * Uses getPropertyInstanceDefaults() as the base template (fills all 36 fields),
 * then overlays Claude's specific values (price, state, growth, LVR, loan type).
 */
export function mapToPropertySelections(
  response: NLParseResponse
): PropertyMappingResult {
  const selections: PropertySelection = {};
  const propertyOrder: string[] = [];
  const instances: Record<string, PropertyInstanceDetails> = {};

  if (!response.properties || response.properties.length === 0) {
    return { selections, propertyOrder, instances };
  }

  // Track counts per property type to generate correct instance IDs
  const typeCounts: Record<string, number> = {};

  for (const prop of response.properties) {
    const nlKey = prop.type; // Descriptive key from Claude (e.g. "units-apartments")
    // Convert to engine ID (e.g. "property_0") — fall back to nlKey for custom types
    const engineId = nlKeyToEngineId[nlKey] ?? nlKey;

    // Count this type
    const currentCount = typeCounts[engineId] ?? 0;
    typeCounts[engineId] = currentCount + 1;

    // Generate instance ID matching PropPath's convention: {engineId}_instance_{index}
    const instanceId = `${engineId}_instance_${currentCount}`;

    // Get the full 36-field template from property-defaults.json
    // Use the NL key (descriptive name) since getPropertyInstanceDefaults expects that format
    const defaults = getPropertyInstanceDefaults(nlKey);

    // Overlay Claude's extracted values onto the defaults
    const instance: PropertyInstanceDetails = {
      ...defaults,
      purchasePrice: prop.purchasePrice,
      valuationAtPurchase: prop.purchasePrice, // Always match purchase price
      state: prop.state,
      growthAssumption: prop.growthAssumption,
      loanProduct: prop.loanProduct,
      lvr: prop.lvr,
    };

    // Optional: rent per week (if Claude extracted it)
    if (prop.rentPerWeek !== undefined) {
      instance.rentPerWeek = prop.rentPerWeek;
    }

    // Optional: manual placement if Claude suggested a specific period
    if (prop.targetPeriod !== undefined) {
      instance.isManuallyPlaced = true;
      instance.manualPlacementPeriod = prop.targetPeriod;
    }

    instances[instanceId] = instance;
    propertyOrder.push(instanceId);
  }

  // Build selections: { engineId: count } (e.g. { "property_0": 2 })
  for (const [engineId, count] of Object.entries(typeCounts)) {
    selections[engineId] = count;
  }

  return { selections, propertyOrder, instances };
}

// ── Step 1.8: Map Modification to Updates ──────────────────────────

export interface ContextUpdates {
  profileUpdates?: Partial<InvestmentProfileData>;
  instanceUpdates?: Array<{
    instanceId: string;
    updates: Partial<PropertyInstanceDetails>;
  }>;
  // For add/remove, we need to rebuild selections
  selectionChanges?: {
    selections: PropertySelection;
    propertyOrder: string[];
    instances: Record<string, PropertyInstanceDetails>;
  };
}

/**
 * Maps a modification-type NLParseResponse to specific context updates.
 *
 * Takes the current plan state so it can resolve references like "property-2"
 * to actual instance IDs.
 */
export function mapModificationToUpdates(
  response: NLParseResponse,
  currentInstances: Record<string, PropertyInstanceDetails>,
  currentOrder: string[]
): ContextUpdates {
  if (!response.modification) {
    return {};
  }

  const { target, action, params } = response.modification;
  const updates: ContextUpdates = {};

  // Resolve "property-N" to actual instance ID (1-indexed in chat, 0-indexed in array)
  const propertyMatch = target.match(/^property-(\d+)$/);

  if (propertyMatch) {
    const propertyIndex = parseInt(propertyMatch[1], 10) - 1; // Convert to 0-indexed
    const instanceId = currentOrder[propertyIndex];

    if (!instanceId) {
      return updates; // Invalid property reference
    }

    switch (action) {
      case 'move': {
        const targetPeriod = params.targetPeriod as number | undefined;
        if (targetPeriod !== undefined) {
          updates.instanceUpdates = [{
            instanceId,
            updates: {
              isManuallyPlaced: true,
              manualPlacementPeriod: targetPeriod,
            },
          }];
        }
        break;
      }

      case 'change': {
        const instanceChanges: Partial<PropertyInstanceDetails> = {};
        if (params.purchasePrice !== undefined) {
          instanceChanges.purchasePrice = params.purchasePrice as number;
          instanceChanges.valuationAtPurchase = params.purchasePrice as number;
        }
        if (params.state !== undefined) {
          instanceChanges.state = params.state as string;
        }
        if (params.lvr !== undefined) {
          instanceChanges.lvr = params.lvr as number;
        }
        if (params.loanProduct !== undefined) {
          instanceChanges.loanProduct = params.loanProduct as 'IO' | 'PI';
        }
        if (params.growthAssumption !== undefined) {
          instanceChanges.growthAssumption = params.growthAssumption as 'High' | 'Medium' | 'Low';
        }
        if (params.rentPerWeek !== undefined) {
          instanceChanges.rentPerWeek = params.rentPerWeek as number;
        }
        if (Object.keys(instanceChanges).length > 0) {
          updates.instanceUpdates = [{ instanceId, updates: instanceChanges }];
        }
        break;
      }

      case 'remove': {
        // Remove this property — rebuild selections without it
        const newOrder = currentOrder.filter((id) => id !== instanceId);
        const newInstances = { ...currentInstances };
        delete newInstances[instanceId];

        const newSelections: PropertySelection = {};
        for (const id of newOrder) {
          // Extract property type from instance ID: "units-apartments_instance_0" → "units-apartments"
          const type = id.replace(/_instance_\d+$/, '');
          newSelections[type] = (newSelections[type] ?? 0) + 1;
        }

        updates.selectionChanges = {
          selections: newSelections,
          propertyOrder: newOrder,
          instances: newInstances,
        };
        break;
      }
    }
  }

  // Add property — target is "portfolio", new property details are in response.properties
  if (action === 'add' && response.properties && response.properties.length > 0) {
    const newMapping = mapToPropertySelections(response)

    // Merge new properties into existing plan
    const mergedInstances = { ...currentInstances, ...newMapping.instances }
    const mergedOrder = [...currentOrder, ...newMapping.propertyOrder]

    // Rebuild selections from merged order
    const mergedSelections: PropertySelection = {}
    for (const id of mergedOrder) {
      const type = id.replace(/_instance_\d+$/, '')
      mergedSelections[type] = (mergedSelections[type] ?? 0) + 1
    }

    updates.selectionChanges = {
      selections: mergedSelections,
      propertyOrder: mergedOrder,
      instances: mergedInstances,
    }
  }

  // Profile-level modifications (savings, income, etc.)
  if (target === 'savings' && params.monthlySavings !== undefined) {
    updates.profileUpdates = {
      annualSavings: (params.monthlySavings as number) * 12,
    };
  }

  if (target === 'income' && params.annualIncome !== undefined) {
    updates.profileUpdates = {
      baseSalary: params.annualIncome as number,
    };
  }

  if (target === 'timeline' && params.timelineYears !== undefined) {
    updates.profileUpdates = {
      timelineYears: params.timelineYears as number,
    };
  }

  if (target === 'lvr') {
    // Apply LVR change to all properties
    updates.instanceUpdates = currentOrder.map((instanceId) => ({
      instanceId,
      updates: { lvr: params.lvr as number },
    }));
  }

  return updates;
}
