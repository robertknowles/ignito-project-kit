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
import {
  isCellId,
  translateLegacyTypeKey,
  translateLegacyEngineId,
  type CellId,
} from '@/utils/propertyCells';

/**
 * Resolve any chatbot-supplied property type value to a v4 cell ID.
 *
 * Accepts:
 *   - A v4 cell ID directly ("metro-house-growth")
 *   - A legacy v3 type key ("duplexes", "units-apartments")
 *   - A legacy positional engine ID ("property_5") — defensive
 *
 * Returns null if no translation possible (unknown type).
 */
const resolveCellId = (value: string): CellId | null => {
  if (isCellId(value)) return value;
  const legacyTranslation = translateLegacyTypeKey(value);
  if (legacyTranslation) return legacyTranslation.newCellId;
  const positional = translateLegacyEngineId(value);
  if (positional) return positional;
  return null;
};

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
    const {
      currentDeposit,
      monthlySavings,
      existingDebt,
      existingPropertyDebt,
      existingPropertyEquity,
      borrowingCapacity,
      members,
    } = response.clientProfile as typeof response.clientProfile & { existingDebt?: number };

    updates.depositPool = currentDeposit;
    updates.annualSavings = monthlySavings * 12;

    const resolvedDebt = existingPropertyDebt ?? existingDebt ?? 0;
    updates.currentDebt = resolvedDebt;

    // existingPropertyEquity → portfolioValue such that the context's
    // usable-equity formula (portfolioValue * 0.8 − currentDebt) yields
    // the stated equity figure.
    if (typeof existingPropertyEquity === 'number') {
      updates.portfolioValue = (existingPropertyEquity + resolvedDebt) / 0.8;
    }

    if (typeof borrowingCapacity === 'number' && borrowingCapacity > 0) {
      updates.borrowingCapacity = borrowingCapacity;
    }

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

  // Strategy preset from NL input.
  if (response.strategyPreset) {
    updates.strategyPreset = response.strategyPreset;
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

  // Track counts per cell ID to generate correct instance IDs.
  const typeCounts: Record<string, number> = {};

  for (const prop of response.properties) {
    // Resolve Claude's `prop.type` to a v4 cell ID. Accepts cell IDs,
    // legacy v3 keys, or positional engine IDs.
    const resolvedCellId = resolveCellId(prop.type);
    // If unresolvable (truly unknown type), fall back to the raw input —
    // engine still works, it just won't have matrix-defined defaults.
    const engineId: string = resolvedCellId ?? prop.type;

    const currentCount = typeCounts[engineId] ?? 0;
    typeCounts[engineId] = currentCount + 1;

    // Instance ID convention: {cellId}_instance_{index}
    const instanceId = `${engineId}_instance_${currentCount}`;

    // Pull the full template defaults for this cell.
    const defaults = getPropertyInstanceDefaults(engineId);

    // Overlay Claude's extracted values. Mode comes from prop.mode if Claude
    // sent it (Phase 3+); otherwise inherit the cell's default mode from defaults.
    const instance: PropertyInstanceDetails = {
      ...defaults,
      purchasePrice: prop.purchasePrice,
      valuationAtPurchase: prop.purchasePrice,
      state: prop.state,
      growthAssumption: prop.growthAssumption,
      loanProduct: prop.loanProduct,
      lvr: prop.lvr,
      mode: prop.mode ?? defaults.mode,
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
  // Human-readable reasons the mapper couldn't apply something. Surfaced
  // in the chat by ChatPanel so we never silently drop a modification while
  // letting Claude's "Done!" message stand. Empty/undefined = no warnings.
  warnings?: string[];
}

// Property fields the mapper knows how to apply. Anything else returned by
// Claude is reported as a warning so the user (and we) can see it was dropped.
// Keep this in sync with the change-handler in mapModificationToUpdates.
const SUPPORTED_CHANGE_FIELDS = new Set([
  'purchasePrice',
  'state',
  'lvr',
  'loanProduct',
  'growthAssumption',
  'rentPerWeek',
]);

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
    console.warn('[nlDataMapper] mapModificationToUpdates called with no modification on response');
    return { warnings: ['I tried to make a change but the request came through empty — try saying it a different way.'] };
  }

  const { target, action, params } = response.modification;
  const updates: ContextUpdates = {};
  const warnings: string[] = [];

  // Resolve "property-N" to actual instance ID (1-indexed in chat, 0-indexed in array)
  const propertyMatch = target.match(/^property-(\d+)$/);

  if (propertyMatch) {
    const requestedNumber = parseInt(propertyMatch[1], 10);
    const propertyIndex = requestedNumber - 1; // Convert to 0-indexed
    const instanceId = currentOrder[propertyIndex];

    if (!instanceId) {
      const total = currentOrder.length;
      const msg = total === 0
        ? `I tried to change property ${requestedNumber}, but the plan doesn't have any properties yet.`
        : `I tried to change property ${requestedNumber}, but the plan only has ${total} ${total === 1 ? 'property' : 'properties'}. Which one did you mean?`;
      console.warn(`[nlDataMapper] property index out of range: requested ${requestedNumber}, have ${total}`);
      return { warnings: [msg] };
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
        } else {
          warnings.push(`Wanted to move property ${requestedNumber} but no target period was given.`);
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

        // Surface any params Claude tried to set that we don't actually
        // support. Without this, the mapper silently dropped them and the
        // chat happily said "Done!" — the source of "I asked it to change X
        // and nothing happened" reports.
        const unsupported = Object.keys(params).filter(
          (k) => !SUPPORTED_CHANGE_FIELDS.has(k),
        );
        if (unsupported.length > 0) {
          console.warn(`[nlDataMapper] dropped unsupported change fields: ${unsupported.join(', ')}`);
          warnings.push(
            `Couldn't change ${unsupported.join(', ')} on property ${requestedNumber} — that field isn't editable yet.`,
          );
        }

        if (Object.keys(instanceChanges).length > 0) {
          updates.instanceUpdates = [{ instanceId, updates: instanceChanges }];
        } else if (unsupported.length === 0) {
          // No supported and no unsupported fields — Claude returned an empty
          // params object. Tell the user.
          warnings.push(
            `Got a change request for property ${requestedNumber} but no fields were specified.`,
          );
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

  // Decide whether a no-update outcome deserves a user-visible warning.
  // Claude sometimes sends compound modifications that include redundant
  // "change" mods on context-only targets like clientProfile / investmentProfile
  // — those are not real targets and should be silently ignored instead of
  // confusing the user with "I couldn't apply it" messages while the actual
  // remove/change worked.
  const KNOWN_NON_PROPERTY_TARGETS = new Set([
    'savings',
    'income',
    'timeline',
    'lvr',
    'portfolio',
  ]);
  const isPropertyTarget = !!propertyMatch;
  const isKnownTarget = isPropertyTarget || KNOWN_NON_PROPERTY_TARGETS.has(target);

  const producedUpdates =
    !!updates.profileUpdates ||
    !!updates.instanceUpdates ||
    !!updates.selectionChanges;

  if (!producedUpdates && warnings.length === 0) {
    if (!isKnownTarget) {
      // Unknown target — Claude sent us something we don't model. Log for
      // diagnostics but do NOT surface to the user; this commonly fires for
      // redundant context-only mods alongside a real change in the same batch.
      console.warn('[nlDataMapper] ignoring unknown modification target', {
        target,
        action,
        paramKeys: Object.keys(params ?? {}),
      });
    } else {
      // Known target but nothing landed — that IS surprising, tell the user.
      console.warn('[nlDataMapper] known target produced no updates', {
        target,
        action,
        paramKeys: Object.keys(params ?? {}),
      });
      warnings.push(
        `I understood the request but couldn't apply it — the engine didn't get any concrete changes from "${action}" on "${target}".`,
      );
    }
  }

  if (warnings.length > 0) {
    updates.warnings = warnings;
  }
  return updates;
}
