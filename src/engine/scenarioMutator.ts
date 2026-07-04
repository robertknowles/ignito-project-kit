/**
 * Scenario Mutator — apply an nl-parse response to a plain scenario COPY.
 *
 * Pure re-host of ChatPanel.handleModification's merge loop (compound
 * modifications, valuation auto-sync, orphaned-add safety net) plus
 * handleUpdateProfile — but applied to a ScenarioInput object instead of the
 * live dashboard contexts. The AI-arg interpretation itself stays in
 * utils/nlDataMapper.ts, shared with ChatPanel, so the two paths can never
 * drift on what a modification MEANS — only on where it lands.
 *
 * Used by Compare's "Remodel with AI": mutate a copy of a client's plan,
 * re-run the engine on it, chart it against the original. The client's real
 * scenario is never touched.
 */

import { mapModificationToUpdates, mapUpdateProfileToUpdates } from '../utils/nlDataMapper';
import type { NLParseResponse } from '../types/nlParse';
import type { PropertyInstanceDetails } from '../types/propertyInstance';
import type { ScenarioInput } from './scenarioRunner';

export interface MutationResult {
  scenario: ScenarioInput;
  /** Instance ids the response changed or added — drives row highlighting. */
  changedInstanceIds: string[];
  /** Mapper warnings — things the AI claimed to do that couldn't be applied.
   *  Must be surfaced; never let the AI's "Done!" stand for a silent drop. */
  warnings: string[];
  /** False when the response produced no applicable change at all. */
  didChange: boolean;
}

export function applyNlResponseToScenario(
  base: ScenarioInput,
  response: NLParseResponse,
): MutationResult {
  let profile = { ...(base.investmentProfile ?? {}) };
  let instances: Record<string, PropertyInstanceDetails> = { ...(base.propertyInstances ?? {}) };
  let order = [...(base.propertyOrder ?? [])];
  let selections = { ...(base.propertySelections ?? {}) };
  const warnings: string[] = [];
  const changed = new Set<string>();
  let didChange = false;

  const applySelectionChanges = (changes: {
    selections: Record<string, number>;
    propertyOrder: string[];
    instances: Record<string, PropertyInstanceDetails>;
  }) => {
    const beforeIds = new Set(order);
    order = changes.propertyOrder;
    selections = changes.selections;
    instances = changes.instances;
    for (const id of order) if (!beforeIds.has(id)) changed.add(id);
    didChange = true;
  };

  if (response.type === 'update_profile') {
    const updates = mapUpdateProfileToUpdates(response);
    if (Object.keys(updates).length > 0) {
      profile = { ...profile, ...updates };
      didChange = true;
    }
  }

  if (response.type === 'modification') {
    // Compound modifications array or a single modification — same as ChatPanel.
    const modList = response.modifications
      ? response.modifications
      : response.modification
        ? [response.modification]
        : [];

    for (const mod of modList) {
      const singleResponse = { ...response, modification: mod, modifications: undefined };
      const updates = mapModificationToUpdates(singleResponse, instances, order);

      if (updates.warnings && updates.warnings.length > 0) {
        warnings.push(...updates.warnings);
      }

      if (updates.profileUpdates) {
        profile = { ...profile, ...updates.profileUpdates };
        didChange = true;
      }

      if (updates.instanceUpdates) {
        for (const { instanceId, updates: instUpdates } of updates.instanceUpdates) {
          const current = instances[instanceId];
          if (current) {
            const merged = { ...current, ...instUpdates };
            // Auto-sync valuation when purchasePrice changes and the BA
            // hasn't manually overridden valuationAtPurchase (ChatPanel rule).
            if (
              instUpdates.purchasePrice !== undefined &&
              instUpdates.valuationAtPurchase === undefined &&
              !current.valuationAtPurchaseManual
            ) {
              merged.valuationAtPurchase = instUpdates.purchasePrice;
            }
            instances = { ...instances, [instanceId]: merged };
            changed.add(instanceId);
            didChange = true;
          } else {
            warnings.push("Couldn't find that property to update — it may have been removed.");
          }
        }
      }

      if (updates.selectionChanges) {
        applySelectionChanges(updates.selectionChanges);
      }
    }

    // Safety net (ChatPanel parity): the AI sometimes returns a compound like
    // remove+add but puts the add info only in `properties` with no add mod —
    // process the orphaned properties as an add so they aren't dropped.
    const hadAddMod = modList.some(m => m.action === 'add');
    if (!hadAddMod && response.properties && response.properties.length > 0) {
      const addResponse = {
        ...response,
        modification: { target: 'portfolio', action: 'add' as const, params: {} },
        modifications: undefined,
      };
      const addUpdates = mapModificationToUpdates(addResponse, instances, order);
      if (addUpdates.selectionChanges) {
        applySelectionChanges(addUpdates.selectionChanges);
      }
      if (addUpdates.warnings?.length) {
        warnings.push(...addUpdates.warnings);
      }
    }
  }

  return {
    scenario: {
      ...base,
      investmentProfile: profile,
      propertyInstances: instances,
      propertyOrder: order,
      propertySelections: selections,
    },
    changedInstanceIds: [...changed],
    warnings: [...new Set(warnings)],
    didChange,
  };
}
