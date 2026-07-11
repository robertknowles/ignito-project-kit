/**
 * useScenarioRunner - captures the agent-level environment (property type
 * templates + assumption lookups) from live contexts and returns a memoized
 * headless engine runner.
 *
 * The env values are passed by REFERENCE, never copied - getPropertyData must
 * always be the live DataAssumptionsContext function so headless runs can't
 * drift from the dashboard (the planPreCheck growth-curve incident).
 */

import { useCallback, useMemo } from 'react';
import { usePropertySelection } from '../contexts/PropertySelectionContext';
import { useDataAssumptions } from '../contexts/DataAssumptionsContext';
import {
  runScenario,
  type ScenarioInput,
  type ScenarioEnv,
  type ScenarioRunResult,
} from '../engine/scenarioRunner';

export type { ScenarioInput, ScenarioRunResult } from '../engine/scenarioRunner';

export const useScenarioRunner = () => {
  const { propertyTypes } = usePropertySelection();
  const { getPropertyData } = useDataAssumptions();

  const env: ScenarioEnv = useMemo(
    () => ({ propertyTypes, getPropertyData }),
    [propertyTypes, getPropertyData],
  );

  const run = useCallback(
    (scenario: ScenarioInput): ScenarioRunResult => runScenario(scenario, env),
    [env],
  );

  return { run, env };
};
