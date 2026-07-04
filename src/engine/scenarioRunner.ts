/**
 * Scenario Runner — run the full calculation pipeline (placement + projection)
 * on an arbitrary scenario object, headlessly.
 *
 * Powers Compare: re-running saved scenarios live and charting AI-remodelled
 * drafts. Calls the SAME extracted engines the dashboard hooks delegate to
 * (src/engine/timelineEngine.ts, src/engine/projectionEngine.ts), so a run
 * here is the dashboard's math by construction — parity failures can only
 * come from input assembly, which this module owns.
 *
 * Parity conditions (must mirror a freshly-loaded dashboard):
 * - missing instances are materialized exactly like
 *   PropertyInstanceContext.createInstance (defaults + VIC fallback +
 *   valuation synced to purchase price);
 * - `timelineLoanTypes` is `{}` (session-only state, empty after any reload);
 * - `eventBlocks`/`pauseBlocks` default to `[]` (not persisted in saves);
 * - `getPropertyData` MUST be the live DataAssumptionsContext function —
 *   never a copy (see the planPreCheck growth-curve drift incident).
 */

import { computeTimelineProperties } from './timelineEngine';
import { computeProjection, type PortfolioProjectionResult } from './projectionEngine';
import { getPropertyInstanceDefaults } from '../utils/propertyInstanceDefaults';
import {
  INITIAL_INVESTMENT_PROFILE,
  type InvestmentProfileData,
} from '../contexts/InvestmentProfileContext';
import type { EventBlock, PauseBlock, PropertyType } from '../contexts/PropertySelectionContext';
import type { PropertyAssumption } from '../contexts/DataAssumptionsContext';
import type { PropertyInstanceDetails } from '../types/propertyInstance';
import type { ExistingProperty } from '../types/existingProperty';
import type { TimelineProperty } from '../types/property';

/** A scenario as persisted in scenarios.data (plus optional session-only extras). */
export interface ScenarioInput {
  propertySelections: Record<string, number>;
  propertyOrder: string[];
  /** Merged over INITIAL_INVESTMENT_PROFILE so legacy saves with missing
   *  fields never feed `undefined` into the math (strictNullChecks is off). */
  investmentProfile: Partial<InvestmentProfileData>;
  propertyInstances: Record<string, PropertyInstanceDetails>;
  existingProperties?: ExistingProperty[];
  eventBlocks?: EventBlock[];
  pauseBlocks?: PauseBlock[];
}

/** Agent-level template data captured ONCE from live contexts (never copied). */
export interface ScenarioEnv {
  propertyTypes: PropertyType[];
  getPropertyData: (title: string, growthAssumption?: string) => PropertyAssumption | undefined;
}

export interface ScenarioRunResult {
  /** The normalized profile the run actually used (defaults merged in). */
  profile: InvestmentProfileData;
  /** The instances the run actually used (missing ones materialized). */
  instances: Record<string, PropertyInstanceDetails>;
  timelineProperties: TimelineProperty[];
  projection: PortfolioProjectionResult;
  allFeasible: boolean;
  /** Goal-achievement years — same expressions as useChartDataSync, which is
   *  what populates the saved chartData's equityGoalYear/incomeGoalYear. */
  equityGoalYear: number | null;
  incomeGoalYear: number | null;
}

export function runScenario(scenario: ScenarioInput, env: ScenarioEnv): ScenarioRunResult {
  // Own copies of everything: the placement loop mutates its own purchase
  // history records, and two sides (A/B) may run from related objects — a run
  // must never bleed into the caller's scenario or a sibling run.
  const profile: InvestmentProfileData = {
    ...INITIAL_INVESTMENT_PROFILE,
    ...(scenario.investmentProfile ?? {}),
  };
  const propertyOrder = [...(scenario.propertyOrder ?? [])];
  const selections = { ...(scenario.propertySelections ?? {}) };
  const instances: Record<string, PropertyInstanceDetails> = {};
  for (const [id, inst] of Object.entries(scenario.propertyInstances ?? {})) {
    instances[id] = { ...inst };
  }
  const existingProperties = (scenario.existingProperties ?? []).map(p => ({ ...p }));
  const eventBlocks = (scenario.eventBlocks ?? []).map(b => ({ ...b }));
  const pauseBlocks = (scenario.pauseBlocks ?? []).map(b => ({ ...b }));

  // Materialize missing instances exactly as PropertyInstanceContext.
  // createInstance does after each dashboard render. The dashboard's steady
  // state always has an instance per planned property; a headless run must
  // start from that same state.
  for (const id of propertyOrder) {
    if (!instances[id]) {
      const type = id.replace(/_instance_\d+$/, '');
      const defaults = getPropertyInstanceDefaults(type);
      instances[id] = {
        ...defaults,
        state: defaults.state || 'VIC',
        valuationAtPurchase: defaults.purchasePrice,
      };
    }
  }

  const getInstance = (id: string): PropertyInstanceDetails | null => instances[id] ?? null;

  const timelineProperties = computeTimelineProperties({
    profile,
    propertyOrder,
    selections,
    propertyTypes: env.propertyTypes,
    instances,
    existingProperties,
    eventBlocks,
    pauseBlocks,
    timelineLoanTypes: {},
    getPropertyData: env.getPropertyData,
  });

  const projection = computeProjection({
    profile,
    timelineProperties,
    getInstance,
    existingProperties,
    eventBlocks,
    getPropertyData: env.getPropertyData,
  });

  // Goal years — byte-identical logic to useChartDataSync so a live run's
  // goals agree with what the saved snapshot would say.
  let equityGoalYear: number | null = null;
  let incomeGoalYear: number | null = null;
  const equityGoalReached = projection.portfolioGrowthData.find(
    d => d.equity >= (profile.equityGoal || 0),
  );
  if (equityGoalReached) equityGoalYear = parseInt(equityGoalReached.year, 10);
  const incomeGoalReached = projection.cashflowData.find(
    d => d.cashflow >= (profile.cashflowGoal || 0),
  );
  if (incomeGoalReached) incomeGoalYear = parseInt(incomeGoalReached.year, 10);

  const allFeasible = timelineProperties.every(
    tp => tp.status === 'feasible' && tp.period !== Infinity,
  );

  return {
    profile,
    instances,
    timelineProperties,
    projection,
    allFeasible,
    equityGoalYear,
    incomeGoalYear,
  };
}
