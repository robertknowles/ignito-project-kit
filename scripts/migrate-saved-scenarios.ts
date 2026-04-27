/**
 * Saved-scenario migration — rewrite legacy property type keys to v4 cell IDs.
 *
 * Phase 5.1 of STRATEGY-PIVOT-PLAN.md.
 *
 * Walks every row in the Supabase `scenarios` table and rewrites
 * `propertySelections`, `propertyOrder`, and `propertyInstances` to use the
 * v4 cell-ID model. Saved scenarios continue to load via the runtime alias
 * layer if this script never runs — it only cleans up the database.
 *
 * Usage:
 *   # Dry run — log what would change, write nothing.
 *   npx tsx scripts/migrate-saved-scenarios.ts --dry-run
 *
 *   # Live run — write back to Supabase.
 *   npx tsx scripts/migrate-saved-scenarios.ts --live
 *
 * Required env vars:
 *   SUPABASE_URL — project URL (e.g. https://abc.supabase.co)
 *   SUPABASE_SERVICE_ROLE_KEY — service role key (NOT the anon key)
 *
 * Safety:
 *   - Default mode is dry-run; --live must be passed explicitly.
 *   - Take a Supabase backup of the `scenarios` table before --live.
 *   - The runtime alias layer means scenarios still load correctly if
 *     migration is delayed — there's no rush.
 */

import { createClient } from '@supabase/supabase-js';
import {
  isCellId,
  translateLegacyEngineId,
  translateLegacyTypeKey,
  translateLegacyInstanceId,
  getCellMode,
  type CellId,
  type Mode,
} from '../src/utils/propertyCells';

interface PropertyInstance {
  mode?: Mode;
  [key: string]: unknown;
}

interface ScenarioData {
  propertySelections?: Record<string, number>;
  propertyOrder?: string[];
  propertyInstances?: Record<string, PropertyInstance>;
  [key: string]: unknown;
}

interface MigrationStats {
  scenariosScanned: number;
  scenariosChanged: number;
  selectionsRekeyed: number;
  orderEntriesRekeyed: number;
  instanceIdsRekeyed: number;
  modesAdded: number;
}

const stats: MigrationStats = {
  scenariosScanned: 0,
  scenariosChanged: 0,
  selectionsRekeyed: 0,
  orderEntriesRekeyed: 0,
  instanceIdsRekeyed: 0,
  modesAdded: 0,
};

/** Translate a single selections record. Returns null if no change needed. */
function migrateSelections(
  raw: Record<string, number>
): Record<string, number> | null {
  let changed = false;
  const out: Record<string, number> = {};
  for (const [key, qty] of Object.entries(raw)) {
    if (isCellId(key)) {
      out[key] = (out[key] ?? 0) + qty;
      continue;
    }
    const translated =
      translateLegacyEngineId(key) ?? translateLegacyTypeKey(key)?.newCellId;
    if (translated) {
      out[translated] = (out[translated] ?? 0) + qty;
      changed = true;
      stats.selectionsRekeyed += 1;
    } else {
      // Custom block or unknown key — preserve as-is.
      out[key] = (out[key] ?? 0) + qty;
    }
  }
  return changed ? out : null;
}

/** Translate a property order array. Returns null if no change needed. */
function migrateOrder(raw: string[]): string[] | null {
  let changed = false;
  const out = raw.map((id) => {
    const translated = translateLegacyInstanceId(id);
    if (translated !== id) {
      changed = true;
      stats.orderEntriesRekeyed += 1;
    }
    return translated;
  });
  return changed ? out : null;
}

/**
 * Translate property instance keys and add `mode` field where missing.
 * Returns null if no change needed.
 */
function migrateInstances(
  raw: Record<string, PropertyInstance>
): Record<string, PropertyInstance> | null {
  let changed = false;
  const out: Record<string, PropertyInstance> = {};
  for (const [oldId, instance] of Object.entries(raw)) {
    const newId = translateLegacyInstanceId(oldId);
    const idChanged = newId !== oldId;
    if (idChanged) {
      changed = true;
      stats.instanceIdsRekeyed += 1;
    }

    // Infer mode from the cell ID portion of the new instance ID.
    let nextInstance = instance;
    if (!instance.mode) {
      const match = newId.match(/^(.+)_instance_\d+$/);
      const cellPart = match?.[1];
      if (cellPart && isCellId(cellPart)) {
        nextInstance = { ...instance, mode: getCellMode(cellPart as CellId) };
        changed = true;
        stats.modesAdded += 1;
      }
    }

    out[newId] = nextInstance;
  }
  return changed ? out : null;
}

/** Main migration entry point. */
async function main() {
  const args = new Set(process.argv.slice(2));
  const isDryRun = !args.has('--live');

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing env: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required.');
    process.exit(1);
  }

  console.log(
    `\nStrategy pivot — saved scenario migration (${isDryRun ? 'DRY RUN' : 'LIVE'})\n`
  );

  const supabase = createClient(url, key, {
    auth: { persistSession: false },
  });

  const { data: scenarios, error } = await supabase
    .from('scenarios')
    .select('id, scenario_data, name, client_id');

  if (error) {
    console.error('Failed to fetch scenarios:', error);
    process.exit(1);
  }

  if (!scenarios || scenarios.length === 0) {
    console.log('No scenarios found.');
    return;
  }

  console.log(`Found ${scenarios.length} scenarios to scan.\n`);

  for (const row of scenarios) {
    stats.scenariosScanned += 1;
    const data = (row.scenario_data ?? {}) as ScenarioData;

    const selectionsBefore = stats.selectionsRekeyed;
    const orderBefore = stats.orderEntriesRekeyed;
    const instancesBefore = stats.instanceIdsRekeyed;
    const modesBefore = stats.modesAdded;

    const newSelections = data.propertySelections
      ? migrateSelections(data.propertySelections)
      : null;
    const newOrder = data.propertyOrder ? migrateOrder(data.propertyOrder) : null;
    const newInstances = data.propertyInstances
      ? migrateInstances(data.propertyInstances)
      : null;

    const anyChanged = newSelections || newOrder || newInstances;
    if (!anyChanged) continue;

    stats.scenariosChanged += 1;
    console.log(
      `[${row.id}] "${row.name ?? '(unnamed)'}" — ` +
        `selections: +${stats.selectionsRekeyed - selectionsBefore}, ` +
        `order: +${stats.orderEntriesRekeyed - orderBefore}, ` +
        `instances: +${stats.instanceIdsRekeyed - instancesBefore}, ` +
        `modes: +${stats.modesAdded - modesBefore}`
    );

    if (isDryRun) continue;

    const updatedData: ScenarioData = {
      ...data,
      ...(newSelections ? { propertySelections: newSelections } : {}),
      ...(newOrder ? { propertyOrder: newOrder } : {}),
      ...(newInstances ? { propertyInstances: newInstances } : {}),
    };

    const { error: updateError } = await supabase
      .from('scenarios')
      .update({ scenario_data: updatedData })
      .eq('id', row.id);

    if (updateError) {
      console.error(`  -> UPDATE FAILED: ${updateError.message}`);
    }
  }

  console.log('\n— Summary —');
  console.log(`  Scenarios scanned : ${stats.scenariosScanned}`);
  console.log(`  Scenarios changed : ${stats.scenariosChanged}`);
  console.log(`  Selections rekeyed: ${stats.selectionsRekeyed}`);
  console.log(`  Order entries     : ${stats.orderEntriesRekeyed}`);
  console.log(`  Instance IDs      : ${stats.instanceIdsRekeyed}`);
  console.log(`  Modes added       : ${stats.modesAdded}`);
  if (isDryRun) {
    console.log('\nNothing was written. Re-run with --live after taking a backup.');
  } else {
    console.log('\nMigration complete.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
