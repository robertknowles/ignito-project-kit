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
import type { ExistingProperty } from '@/types/existingProperty';
import { getPropertyInstanceDefaults, applyGlobalCostDefaults } from '@/utils/propertyInstanceDefaults';
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
 *   - A legacy positional engine ID ("property_5") - defensive
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
 * Only sets fields that Claude extracted - the rest keep their defaults.
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
    } else if (members.length > 0) {
      // Derive BC from income when not stated: 8x combined income
      const combinedIncome = members.reduce((sum, m) => sum + m.annualIncome, 0);
      updates.borrowingCapacity = combinedIncome * 8;
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
    if (ip.goalPriority !== undefined) updates.goalPriority = ip.goalPriority;
    if (ip.targetPassiveIncome !== undefined) updates.targetPassiveIncome = ip.targetPassiveIncome;
  }

  // Strategy preset from NL input.
  if (response.strategyPreset) {
    updates.strategyPreset = response.strategyPreset;
  }

  return updates;
}

/**
 * Force refinancing (equity release) ON for every AI-extracted existing
 * property. The AI sometimes returns allowEquityRelease: false, which
 * silently removes that property's equity from all funding calculations.
 * Product decision: plans always arrive with refinancing on - the BA can
 * still turn it off per property in the confirmation brief or Portfolio tab.
 */
export function forceRefinanceOn(response: NLParseResponse): NLParseResponse {
  const forceOn = <T extends { allowEquityRelease?: boolean }>(list: T[]): T[] =>
    list.map(p => ({ ...p, allowEquityRelease: true }));

  let result = response;
  if (result.clientProfile?.existingPortfolio?.length) {
    result = {
      ...result,
      clientProfile: { ...result.clientProfile, existingPortfolio: forceOn(result.clientProfile.existingPortfolio) },
    };
  }
  if (result.profileUpdates?.existingPortfolio?.length) {
    result = {
      ...result,
      profileUpdates: { ...result.profileUpdates, existingPortfolio: forceOn(result.profileUpdates.existingPortfolio) },
    };
  }
  return result;
}

/**
 * Map AI-extracted existing portfolio to ExistingProperty[].
 * Returns null if no existing portfolio data was extracted.
 */
export function mapToExistingProperties(
  response: NLParseResponse
): ExistingProperty[] | null {
  const portfolio = response.clientProfile?.existingPortfolio
    ?? response.profileUpdates?.existingPortfolio;
  if (!portfolio || portfolio.length === 0) return null;

  return portfolio.map((p, i) => {
    const annualRent = (p.rentPerWeek ?? Math.round((p.currentValue * 0.04) / 52)) * 52;
    return {
      id: `ep-ai-${Date.now()}-${i}`,
      address: p.address ?? '',
      state: p.state,
      boughtYear: p.boughtYear ?? new Date().getFullYear(),
      purchasePrice: p.purchasePrice,
      currentValue: p.currentValue,
      loan: p.loan,
      rentPerWeek: p.rentPerWeek ?? Math.round((p.currentValue * 0.04) / 52),
      yield: p.currentValue > 0 ? (annualRent / p.currentValue) * 100 : 4.0,
      interestRate: p.interestRate ?? 6.0,
      loanType: p.loanType ?? 'IO',
      stampDuty: 0,
      legals: 1_500,
      buildingPest: 700,
      baFee: 0,
      cashDeposit: Math.max(0, p.purchasePrice - p.loan),
      propertyMgmtPercent: 8,
      councilWater: 2_500,
      insurance: 1_500,
      maintenance: 2_000,
      growthAssumption: 'Medium' as const,
      loanTerm: 30,
      strata: 0,
      vacancyRate: 2,
      allowEquityRelease: p.allowEquityRelease !== false,
      saleYear: p.saleYear ?? null,
      isNewBuild: p.isNewBuild ?? false,
    }
  });
}

// ── Step 1.7: Map to Property Selections + Instances ───────────────

interface PropertyMappingResult {
  selections: PropertySelection;
  propertyOrder: string[];
  instances: Record<string, PropertyInstanceDetails>;
}

/**
 * Maps NLParseResponse.properties[] to the three things PropPath needs:
 * 1. PropertySelection - { propertyTypeId: count }
 * 2. propertyOrder - ordered list of instance IDs
 * 3. instances - Record<instanceId, PropertyInstanceDetails>
 *
 * Uses getPropertyInstanceDefaults() as the base template (fills all 36 fields),
 * then overlays Claude's specific values (price, state, growth, LVR, loan type).
 */
export function mapToPropertySelections(
  response: NLParseResponse,
  lvrOverride?: number,
  profile?: Partial<InvestmentProfileData>,
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
    // If unresolvable (truly unknown type), fall back to the raw input -
    // engine still works, it just won't have matrix-defined defaults.
    const engineId: string = resolvedCellId ?? prop.type;

    const currentCount = typeCounts[engineId] ?? 0;
    typeCounts[engineId] = currentCount + 1;

    // Instance ID convention: {cellId}_instance_{index}
    const instanceId = `${engineId}_instance_${currentCount}`;

    // Pull the full template defaults for this cell, then overlay the BA's
    // global Next-Purchase cost defaults (Assumptions page) so an AI-generated
    // plan picks up the same universal costs as a manual add. Seed the overlay
    // with the AI's purchase price so percent-based defaults (engagement fee,
    // annual maintenance) compute off the real figure, not the template price.
    const baseDefaults = getPropertyInstanceDefaults(engineId);
    const defaults = profile
      ? applyGlobalCostDefaults({ ...baseDefaults, purchasePrice: prop.purchasePrice }, profile)
      : baseDefaults;

    // Overlay Claude's extracted values. Mode comes from prop.mode if Claude
    // sent it (Phase 3+); otherwise inherit the cell's default mode from defaults.
    const instance: PropertyInstanceDetails = {
      ...defaults,
      purchasePrice: prop.purchasePrice,
      valuationAtPurchase: prop.purchasePrice,
      state: prop.state,
      growthAssumption: prop.growthAssumption,
      loanProduct: prop.loanProduct,
      lvr: lvrOverride ?? prop.lvr,
      lmiCapitalized: prop.lmiCapitalized ?? false,
      mode: prop.mode ?? defaults.mode,
    };

    // Optional: rent per week (if Claude extracted it)
    if (prop.rentPerWeek !== undefined) {
      instance.rentPerWeek = prop.rentPerWeek;
    }

    // Optional: entity type (individual, trust, company, smsf)
    if (prop.entity !== undefined) {
      instance.entity = prop.entity;
    }

    // Optional: manual placement if Claude suggested a specific period
    if (prop.targetPeriod !== undefined) {
      instance.isManuallyPlaced = true;
      instance.manualPlacementPeriod = prop.targetPeriod;
    }

    // Optional: planned sale year (set via the brief's Sell toggle)
    if (prop.saleYear !== undefined) {
      instance.saleYear = prop.saleYear;
    }

    if (prop.isNewBuild !== undefined) {
      instance.isNewBuild = prop.isNewBuild;
    }

    if (prop.alertDismissed) {
      instance.alertDismissed = true;
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

// ── Step 1.7b: Map Update Profile to Updates ────────────────────────

/**
 * Maps an update_profile response to partial InvestmentProfileData.
 *
 * The update_profile type handles mid-conversation profile corrections
 * like "he actually makes 150k" or "borrowing capacity is 800k". The
 * AI extracts only the changed fields into profileUpdates - we map
 * them to the investment profile shape.
 */
export function mapUpdateProfileToUpdates(
  response: NLParseResponse
): Partial<InvestmentProfileData> {
  const updates: Partial<InvestmentProfileData> = {};

  if (!response.profileUpdates) {
    console.warn('[nlDataMapper] mapUpdateProfileToUpdates called with no profileUpdates');
    return updates;
  }

  const pu = response.profileUpdates;

  if (pu.baseSalary !== undefined) updates.baseSalary = pu.baseSalary;
  if (pu.annualSavings !== undefined) updates.annualSavings = pu.annualSavings;
  if (pu.depositPool !== undefined) updates.depositPool = pu.depositPool;
  if (pu.borrowingCapacity !== undefined) updates.borrowingCapacity = pu.borrowingCapacity;
  if (pu.equityGoal !== undefined) updates.equityGoal = pu.equityGoal;
  if (pu.cashflowGoal !== undefined) updates.cashflowGoal = pu.cashflowGoal;
  if (pu.timelineYears !== undefined) updates.timelineYears = pu.timelineYears;
  if (pu.targetPassiveIncome !== undefined) updates.targetPassiveIncome = pu.targetPassiveIncome;

  if (typeof pu.existingPropertyDebt === 'number') {
    updates.currentDebt = pu.existingPropertyDebt;
  }
  if (typeof pu.existingPropertyEquity === 'number') {
    const resolvedDebt = pu.existingPropertyDebt ?? 0;
    updates.portfolioValue = (pu.existingPropertyEquity + resolvedDebt) / 0.8;
  }

  return updates;
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
  'interestRate',
  'entity',
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
  currentOrder: string[],
  profile?: Partial<InvestmentProfileData>
): ContextUpdates {
  if (!response.modification) {
    console.warn('[nlDataMapper] mapModificationToUpdates called with no modification on response');
    return {};
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
      console.warn(`[nlDataMapper] property index out of range: requested ${requestedNumber}, have ${total}`);
      return {};
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
          console.warn(`[nlDataMapper] move without targetPeriod for property ${requestedNumber}`);
        }
        break;
      }

      case 'change': {
        const instanceChanges: Partial<PropertyInstanceDetails> = {};
        if (params.purchasePrice !== undefined) {
          instanceChanges.purchasePrice = params.purchasePrice as number;
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
        if (params.interestRate !== undefined) {
          instanceChanges.interestRate = params.interestRate as number;
        }
        if (params.entity !== undefined) {
          instanceChanges.entity = params.entity as 'individual' | 'trust' | 'company' | 'smsf';
        }

        // Surface any params Claude tried to set that we don't actually
        // support. Without this, the mapper silently dropped them and the
        // chat happily said "Done!" - the source of "I asked it to change X
        // and nothing happened" reports.
        //
        // EXCEPTION: a no-op `type` "change" is silently suppressed. The cell
        // ID is encoded as the instanceId prefix (e.g. "regional-house-growth_
        // instance_0"); when the AI emits a type change matching the current
        // cell, it's just acknowledging - not actually mutating. Surfacing a
        // warning for that is misleading (founder report 2026-05-05, B3:
        // "make property 1 a regional house" when it already was).
        const currentCellId = instanceId.replace(/_instance_\d+$/, '');
        const unsupported = Object.keys(params).filter((k) => {
          if (SUPPORTED_CHANGE_FIELDS.has(k)) return false;
          if (k === 'type' && params.type === currentCellId) {
            // No-op type "change" - current type already matches. Silent skip.
            return false;
          }
          return true;
        });
        if (unsupported.length > 0) {
          console.warn(`[nlDataMapper] dropped unsupported change fields: ${unsupported.join(', ')}`);
        }

        if (Object.keys(instanceChanges).length > 0) {
          updates.instanceUpdates = [{ instanceId, updates: instanceChanges }];
        } else if (unsupported.length === 0) {
          // No supported and no unsupported fields - Claude returned an empty
          // params object. Tell the user.
          console.warn('[nlDataMapper] empty params for property change', { target, requestedNumber });
        }
        break;
      }

      case 'remove': {
        // Remove this property - rebuild selections without it
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

  // Add property - target is "portfolio", new property details are in response.properties
  if (action === 'add') {
    if (response.properties && response.properties.length > 0) {
      const newMapping = mapToPropertySelections(response, undefined, profile)

      // Re-index new property IDs to avoid collisions with existing ones.
      // mapToPropertySelections generates IDs starting from _instance_0
      // per type. If the plan already has metro-unit-growth_instance_0
      // and the AI adds another metro-unit-growth, both get _instance_0
      // and the new one is silently dropped by the merge. Fix: find the
      // max existing index per type and re-number colliding new entries.
      const existingIds = new Set(currentOrder)
      const maxIndexByType: Record<string, number> = {}
      for (const id of currentOrder) {
        const type = id.replace(/_instance_\d+$/, '')
        const match = id.match(/_instance_(\d+)$/)
        const idx = match ? parseInt(match[1], 10) : 0
        maxIndexByType[type] = Math.max(maxIndexByType[type] ?? -1, idx)
      }

      const reindexedOrder: string[] = []
      const reindexedInstances: Record<string, PropertyInstanceDetails> = {}
      for (const id of newMapping.propertyOrder) {
        if (existingIds.has(id)) {
          const existing = currentInstances[id]
          const incoming = newMapping.instances[id]
          const isDuplicate = existing && incoming &&
            existing.purchasePrice === incoming.purchasePrice &&
            existing.state === incoming.state
          if (isDuplicate) {
            // AI returned an existing property verbatim - skip it
            continue
          }
          // Genuine new property of the same type - re-index to next slot
          const type = id.replace(/_instance_\d+$/, '')
          const nextIdx = (maxIndexByType[type] ?? -1) + 1
          maxIndexByType[type] = nextIdx
          const newId = `${type}_instance_${nextIdx}`
          reindexedOrder.push(newId)
          reindexedInstances[newId] = newMapping.instances[id]
        } else {
          reindexedOrder.push(id)
          reindexedInstances[id] = newMapping.instances[id]
        }
      }

      const mergedOrder = [...currentOrder, ...reindexedOrder]
      const mergedInstances: Record<string, PropertyInstanceDetails> = {
        ...reindexedInstances,
        ...currentInstances,
      }

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
    } else {
      // AI said "added a property" but didn't include the property details on
      // response.properties - without this guard the mapper silently no-ops
      // and the chat happily says "Added a 6th property…" with no actual
      // change on the dashboard (founder report 2026-05-05, B6).
      console.warn('[nlDataMapper] add action returned with no response.properties array');
    }
  }

  // Profile-level modifications (savings, income, etc.)
  // Accept multiple param names the AI might use for each field.
  if (target === 'savings') {
    const val = (params.monthlySavings ?? params.savings ?? params.annualSavings) as number | undefined;
    if (val !== undefined) {
      const annual = params.annualSavings !== undefined ? val : val * 12;
      updates.profileUpdates = { annualSavings: annual };
    }
  }

  if (target === 'income') {
    const val = (params.annualIncome ?? params.income ?? params.baseSalary ?? params.salary) as number | undefined;
    if (val !== undefined) {
      updates.profileUpdates = { baseSalary: val };
    }
  }

  if (target === 'timeline') {
    const val = (params.timelineYears ?? params.timeline ?? params.years) as number | undefined;
    if (val !== undefined) {
      updates.profileUpdates = { timelineYears: val };
    }
  }

  if (target === 'equityGoal' || target === 'equity-goal') {
    const val = (params.equityGoal ?? params.equity ?? params.goal) as number | undefined;
    if (val !== undefined) {
      updates.profileUpdates = { equityGoal: val };
    }
  }

  if (target === 'cashflowGoal' || target === 'cashflow-goal') {
    const val = (params.cashflowGoal ?? params.cashflow ?? params.goal) as number | undefined;
    if (val !== undefined) {
      updates.profileUpdates = { cashflowGoal: val };
    }
  }

  if (target === 'lvr') {
    // Apply LVR change to all properties
    updates.instanceUpdates = currentOrder.map((instanceId) => ({
      instanceId,
      updates: { lvr: params.lvr as number },
    }));
  }

  if ((target === 'rates' || target === 'interestRate') && params.interestRate !== undefined) {
    // Apply interest rate change to all properties. Bulk target so the AI
    // can emit a single modification instead of one change per property.
    updates.instanceUpdates = currentOrder.map((instanceId) => ({
      instanceId,
      updates: { interestRate: params.interestRate as number },
    }));
  }

  // Fallback: catch equity/cashflow goal params regardless of target.
  // The AI sometimes sends these on target "portfolio" or "investmentProfile"
  // instead of the dedicated "equityGoal"/"cashflowGoal" targets.
  if (!updates.profileUpdates) {
    const eqVal = (params.equityGoal ?? params.equity) as number | undefined;
    const cfVal = (params.cashflowGoal ?? params.cashflow) as number | undefined;
    if (eqVal !== undefined || cfVal !== undefined) {
      const goalUpdates: Record<string, number> = {};
      if (eqVal !== undefined) goalUpdates.equityGoal = eqVal;
      if (cfVal !== undefined) goalUpdates.cashflowGoal = cfVal;
      updates.profileUpdates = goalUpdates;
    }
  }

  // Decide whether a no-update outcome deserves a user-visible warning.
  // Claude sometimes sends compound modifications that include redundant
  // "change" mods on context-only targets like clientProfile / investmentProfile
  // - those are not real targets and should be silently ignored instead of
  // confusing the user with "I couldn't apply it" messages while the actual
  // remove/change worked.
  const KNOWN_NON_PROPERTY_TARGETS = new Set([
    'savings',
    'income',
    'timeline',
    'equityGoal',
    'equity-goal',
    'cashflowGoal',
    'cashflow-goal',
    'lvr',
    'rates',
    'interestRate',
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
      // Unknown target - Claude sent us something we don't model. Log for
      // diagnostics but do NOT surface to the user; this commonly fires for
      // redundant context-only mods alongside a real change in the same batch.
      console.warn('[nlDataMapper] ignoring unknown modification target', {
        target,
        action,
        paramKeys: Object.keys(params ?? {}),
      });
    } else {
      console.warn('[nlDataMapper] known target produced no updates', {
        target,
        action,
        paramKeys: Object.keys(params ?? {}),
      });
    }
  }

  if (warnings.length > 0) {
    updates.warnings = warnings;
  }
  return updates;
}
