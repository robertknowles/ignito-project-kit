/**
 * Leaf module for the ScenarioSave context object + the outside-provider-safe
 * existing-properties hook.
 *
 * Why this exists: ScenarioSaveContext → MultiScenarioContext →
 * useAffordabilityCalculator → ScenarioSaveContext formed a runtime import
 * cycle. Bundlers (Lovable's build in particular) could order those modules so
 * that one accessed another's binding before it initialised, crashing the whole
 * app with "Cannot access 'X' before initialization" (a white screen).
 *
 * By holding the context object and useExistingPropertiesSafe here - with only a
 * type-only import back to ScenarioSaveContext, which is erased at runtime -
 * useAffordabilityCalculator can read existing properties without importing
 * ScenarioSaveContext.tsx, breaking the runtime cycle for good.
 */

import { createContext, useContext } from 'react';
import type { ScenarioSaveContextType } from './ScenarioSaveContext';

export const ScenarioSaveContext = createContext<ScenarioSaveContextType | undefined>(undefined);

/** Existing properties, safe to call outside the provider (returns [] if absent). */
export const useExistingPropertiesSafe = () => {
  const context = useContext(ScenarioSaveContext);
  return context?.existingProperties ?? [];
};
