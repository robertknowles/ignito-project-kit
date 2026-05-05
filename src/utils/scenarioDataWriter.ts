/**
 * scenarioDataWriter — safe writer for arbitrary fields inside scenarios.data
 *
 * Background: scenarios.data is a JSONB column. ScenarioSaveContext autosaves
 * its managed keys (propertySelections, propertyOrder, investmentProfile,
 * propertyInstances, timelineSnapshot, chartData, chatHistory, comparisonMode,
 * scenarios, lastSaved) every 250ms from in-memory state. Several other pages
 * write OTHER fields directly: portfolioTracking, communicationLog,
 * clientViewedAt, onboardingCompleted, etc.
 *
 * Without coordination, those direct writes race the autosave and get stomped
 * (cofounder reports 2026-05-04 / 2026-05-05). The autosave was patched to
 * preserve unmanaged keys via RMW, but its read-then-write window is still a
 * race target — if a direct writer commits between the autosave's SELECT and
 * UPDATE, the autosave's preserved snapshot is stale and the direct write is
 * lost.
 *
 * This helper is the single chokepoint for direct writes to scenarios.data.
 * It uses optimistic version locking with retry: every write bumps version,
 * every write requires the version to be unchanged since read. If two writers
 * collide, the loser re-reads and re-applies its mutation against the latest
 * state (the mutator is idempotent by construction — it operates on whatever
 * the latest data is).
 *
 * Pair with ScenarioSaveContext.syncScenarioVersion in React callers so the
 * autosave's loadedVersion pointer stays current. Otherwise the next autosave
 * would conflict, fall into the reload path, and discard any in-memory edits
 * the user made since the last successful autosave.
 */
import { supabase } from '@/integrations/supabase/client';

export type ScenarioDataMutator = (
  current: Record<string, unknown>
) => Record<string, unknown>;

export type MutateScenarioDataResult =
  | { ok: true; newVersion: number }
  | { ok: false; error: string };

interface MutateScenarioDataOptions {
  maxRetries?: number;
}

export async function mutateScenarioData(
  scenarioId: number,
  mutator: ScenarioDataMutator,
  options: MutateScenarioDataOptions = {}
): Promise<MutateScenarioDataResult> {
  const maxRetries = options.maxRetries ?? 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const { data: row, error: fetchError } = await supabase
      .from('scenarios')
      .select('data, version')
      .eq('id', scenarioId)
      .single();

    if (fetchError) {
      return { ok: false, error: fetchError.message };
    }

    const currentData = (row?.data ?? {}) as Record<string, unknown>;
    const currentVersion = (row as { version?: number } | null)?.version ?? 0;
    const nextData = mutator(currentData);
    const newVersion = currentVersion + 1;

    const { data: updated, error: updateError } = await supabase
      .from('scenarios')
      .update({
        data: nextData,
        version: newVersion,
        updated_at: new Date().toISOString(),
      })
      .eq('id', scenarioId)
      .eq('version', currentVersion)
      .select('id');

    if (updateError) {
      return { ok: false, error: updateError.message };
    }

    if (updated && updated.length > 0) {
      return { ok: true, newVersion };
    }
    // Version mismatch — another writer committed in the meantime. Re-read
    // and re-apply the mutator on the next attempt.
  }

  return {
    ok: false,
    error: 'Concurrent modification — could not save after retries.',
  };
}
