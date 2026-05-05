/**
 * Shared writer for portfolio tracking entries (purchased / address / photo).
 *
 * Both Portfolio.tsx and DataAssumptions.tsx previously had copy-pasted
 * savePortfolioTracking helpers that did unversioned full-overwrite RMW on
 * scenarios.data. That pattern raced the ScenarioSaveContext autosave and
 * silently dropped marked-as-purchased state (cofounder report 2026-05-05).
 *
 * Single helper now, version-locked via mutateScenarioData. Both pages import
 * this and pass the result's newVersion to ScenarioSaveContext.syncScenarioVersion
 * so the autosave's version pointer stays current.
 */
import {
  mutateScenarioData,
  type MutateScenarioDataResult,
} from './scenarioDataWriter';

export interface PortfolioTrackingEntry {
  isPurchased: boolean;
  address: string;
  photo: string;
}

export async function savePortfolioTracking(
  scenarioId: number,
  instanceId: string,
  tracking: PortfolioTrackingEntry
): Promise<MutateScenarioDataResult> {
  return mutateScenarioData(scenarioId, (current) => {
    const portfolioTracking = (current.portfolioTracking ?? {}) as Record<
      string,
      PortfolioTrackingEntry
    >;
    return {
      ...current,
      portfolioTracking: {
        ...portfolioTracking,
        [instanceId]: tracking,
      },
    };
  });
}
