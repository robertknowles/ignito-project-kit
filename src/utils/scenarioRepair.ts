/**
 * scenarioRepair — last-resort recovery tool for partially-corrupted scenarios.
 *
 * Symptoms of the kind of corruption this fixes:
 *   - propertyInstances has entries (the per-property details survived)
 *   - propertyOrder is [] (empty)
 *   - propertySelections is {} (empty)
 *
 * That's the signature of a saveScenario partial overwrite during a client
 * transition — the managed keys (propertyOrder, propertySelections, etc.)
 * were written empty while propertyInstances/portfolioTracking/chatHistory
 * stayed intact (they're written by separate version-locked writers).
 *
 * Recovery: rebuild propertyOrder from Object.keys(propertyInstances) and
 * derive propertySelections by counting instance prefixes. The scenario
 * comes back without needing to re-run the AI prompt — propertyInstances
 * already contains all the financial detail.
 *
 * MANUAL-ONLY. There is no auto-trigger for this. Cofounder explicitly
 * asked for this as a last-resort tool, NOT something that fires
 * automatically.
 */
import { supabase } from '@/integrations/supabase/client';
import { mutateScenarioData, type MutateScenarioDataResult } from './scenarioDataWriter';

export interface RepairDiagnosis {
  needsRepair: boolean;
  reason: string;
  instanceCount: number;
  orderCount: number;
  selectionCount: number;
}

/** Inspect a scenario row and decide whether the repair pattern applies. */
export async function diagnoseScenario(scenarioId: number): Promise<
  | { ok: true; diagnosis: RepairDiagnosis }
  | { ok: false; error: string }
> {
  const { data, error } = await supabase
    .from('scenarios')
    .select('data')
    .eq('id', scenarioId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data?.data) return { ok: false, error: 'Scenario row has no data payload.' };

  const payload = data.data as Record<string, unknown>;
  const instances = (payload.propertyInstances ?? {}) as Record<string, unknown>;
  const order = (payload.propertyOrder ?? []) as string[];
  const selections = (payload.propertySelections ?? {}) as Record<string, number>;

  const instanceCount = Object.keys(instances).length;
  const orderCount = Array.isArray(order) ? order.length : 0;
  const selectionCount = Object.keys(selections).length;

  const needsRepair = instanceCount > 0 && orderCount === 0 && selectionCount === 0;

  return {
    ok: true,
    diagnosis: {
      needsRepair,
      reason: needsRepair
        ? `${instanceCount} property instances are stored but propertyOrder/propertySelections are empty — this is the partial-write corruption signature.`
        : `Scenario looks intact — ${instanceCount} instances, ${orderCount} ordered, ${selectionCount} selection keys.`,
      instanceCount,
      orderCount,
      selectionCount,
    },
  };
}

/**
 * Derive the property type id from an instance id.
 * Instance ids look like `regional-house-growth_instance_0`.
 * The legacy alias layer (translateLegacyInstanceId) accepts these directly,
 * so we just strip the `_instance_<n>` suffix.
 */
function instanceToTypeId(instanceId: string): string {
  return instanceId.replace(/_instance_\d+$/, '');
}

/**
 * Sort instances by their numeric suffix so we get a stable, deterministic
 * propertyOrder. `regional-house-growth_instance_0` before
 * `regional-house-growth_instance_1`, etc.
 */
function sortInstanceIds(instanceIds: string[]): string[] {
  return [...instanceIds].sort((a, b) => {
    const aMatch = a.match(/_instance_(\d+)$/);
    const bMatch = b.match(/_instance_(\d+)$/);
    const aIdx = aMatch ? parseInt(aMatch[1], 10) : 0;
    const bIdx = bMatch ? parseInt(bMatch[1], 10) : 0;
    if (aIdx !== bIdx) return aIdx - bIdx;
    // Tiebreak by full id alphabetical so order is reproducible.
    return a.localeCompare(b);
  });
}

/**
 * Rebuild propertyOrder + propertySelections from the surviving
 * propertyInstances. Versioned write via mutateScenarioData so it can't
 * race the autosave loop.
 */
export async function repairScenario(scenarioId: number): Promise<
  | (MutateScenarioDataResult & {
      restoredOrder: string[];
      restoredSelections: Record<string, number>;
    })
  | { ok: false; error: string; restoredOrder?: undefined; restoredSelections?: undefined }
> {
  let restoredOrder: string[] = [];
  let restoredSelections: Record<string, number> = {};

  const result = await mutateScenarioData(scenarioId, (current) => {
    const instances = (current.propertyInstances ?? {}) as Record<string, unknown>;
    const instanceIds = sortInstanceIds(Object.keys(instances));

    restoredOrder = instanceIds;
    restoredSelections = instanceIds.reduce<Record<string, number>>(
      (acc, instanceId) => {
        const typeId = instanceToTypeId(instanceId);
        acc[typeId] = (acc[typeId] ?? 0) + 1;
        return acc;
      },
      {},
    );

    return {
      ...current,
      propertyOrder: restoredOrder,
      propertySelections: restoredSelections,
    };
  });

  if (!result.ok) return { ok: false, error: result.error };
  return { ...result, restoredOrder, restoredSelections };
}
