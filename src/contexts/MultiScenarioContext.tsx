import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { usePropertySelection } from './PropertySelectionContext';
import { useInvestmentProfile } from './InvestmentProfileContext';
import { usePropertyInstance } from './PropertyInstanceContext';
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator';
import type { ScenarioData } from './ScenarioSaveContext';
import type { TimelineProperty } from '../types/property';
import type { InvestmentProfileData } from './InvestmentProfileContext';
import type { PropertyInstanceDetails } from '../types/propertyInstance';

export interface Scenario {
  id: string;
  name: string;
  propertySelections: { [propertyId: string]: number };
  propertyOrder: string[];
  investmentProfile: InvestmentProfileData;
  propertyInstances: Record<string, PropertyInstanceDetails>;
  timeline: TimelineProperty[];
  isActive: boolean;
}

interface MultiScenarioContextType {
  scenarios: Scenario[];
  activeScenarioId: string | null;
  activeScenario: Scenario | null;
  isMultiScenarioMode: boolean;
  isDeletionInProgress: () => boolean;
  addScenario: () => void;
  removeScenario: (id: string) => void;
  setActiveScenario: (id: string) => void;
  updateScenario: (id: string, updates: Partial<Scenario>) => void;
  syncCurrentScenarioFromContext: () => Scenario[];
  restoreScenarioToGlobalContexts: (scenarioId: string) => void;
}

const MultiScenarioContext = createContext<MultiScenarioContextType | undefined>(undefined);

export const useMultiScenario = () => {
  const context = useContext(MultiScenarioContext);
  if (context === undefined) {
    throw new Error('useMultiScenario must be used within a MultiScenarioProvider');
  }
  return context;
};

interface MultiScenarioProviderProps {
  children: ReactNode;
}

export const MultiScenarioProvider: React.FC<MultiScenarioProviderProps> = ({ children }) => {
  const { selections, propertyOrder, setAllSelections } = usePropertySelection();
  const { profile, setProfile } = useInvestmentProfile();
  const { instances, setInstances } = usePropertyInstance();
  const { timelineProperties } = useAffordabilityCalculator();

  // Initialize with a single scenario
  const [scenarios, setScenarios] = useState<Scenario[]>(() => [{
    id: 'scenario-1',
    name: 'Scenario A',
    propertySelections: { ...selections },
    propertyOrder: [...propertyOrder],
    investmentProfile: { ...profile },
    propertyInstances: { ...instances },
    timeline: [...timelineProperties],
    isActive: true,
  }]);

  const [activeScenarioId, setActiveScenarioId] = useState<string>('scenario-1');
  
  // Ref to track when deletion is in progress to prevent auto-sync from restoring deleted scenarios
  const deletionInProgressRef = useRef(false);

  // Get the active scenario
  const activeScenario = scenarios.find(s => s.id === activeScenarioId) || null;

  // Check if we're in multi-scenario mode (more than 1 scenario)
  const isMultiScenarioMode = scenarios.length > 1;

  // Sync the current active scenario with the global context state
  // This is called when we need to capture the current state into the active scenario
  // Returns the updated scenarios array synchronously for saving
  const syncCurrentScenarioFromContext = useCallback((): Scenario[] => {
    // Skip sync during deletion to prevent restoring deleted scenarios with stale data
    if (deletionInProgressRef.current) {
      return scenarios;
    }
    
    if (!activeScenarioId) return scenarios;

    const updatedScenarios = scenarios.map(s => {
      if (s.id === activeScenarioId) {
        return {
          ...s,
          propertySelections: { ...selections },
          propertyOrder: [...propertyOrder],
          investmentProfile: { ...profile },
          propertyInstances: { ...instances },
          timeline: [...timelineProperties],
        };
      }
      return s;
    });
    
    // Update state for UI
    setScenarios(updatedScenarios);
    
    // Return the updated array synchronously for immediate use
    return updatedScenarios;
  }, [activeScenarioId, scenarios, selections, propertyOrder, profile, instances, timelineProperties]);

  // Restore a scenario's state TO the global contexts
  // This is the key function that enables independent scenarios
  const restoreScenarioToGlobalContexts = useCallback((scenarioId: string) => {
    // Find the scenario in the current state
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) {
      return;
    }

    // Restore property selections and order
    setAllSelections(scenario.propertySelections, scenario.propertyOrder);

    // Restore investment profile
    setProfile(scenario.investmentProfile);

    // Restore property instances
    setInstances(scenario.propertyInstances);
  }, [scenarios, setAllSelections, setProfile, setInstances]);

  // Auto-sync the active scenario when context data changes (only in multi-scenario mode)
  useEffect(() => {
    // Skip auto-sync during deletion to prevent restoring deleted scenarios
    if (isMultiScenarioMode && !deletionInProgressRef.current) {
      syncCurrentScenarioFromContext();
    }
  }, [isMultiScenarioMode, selections, propertyOrder, profile, instances, timelineProperties]);

  // Add a new scenario (starts with EMPTY property selections for independent modeling)
  // Each scenario should be independent - not a clone of the current scenario
  const addScenario = useCallback(() => {
    // Sync current state before adding new scenario
    syncCurrentScenarioFromContext();

    const currentActiveScenario = scenarios.find(s => s.id === activeScenarioId);
    
    // NEW SCENARIO STARTS FRESH:
    // - Empty property selections (no properties selected)
    // - Empty property order
    // - Empty property instances  
    // - Empty timeline (will be calculated when properties are added)
    // - BUT: Copy the investment profile so financial assumptions are consistent
    const newScenario: Scenario = {
      id: `scenario-${Date.now()}`,
      name: `Scenario ${String.fromCharCode(65 + scenarios.length)}`, // A, B, C, etc.
      // Start with EMPTY property selections - this is key for independent scenarios
      propertySelections: {},
      propertyOrder: [],
      // Copy investment profile from current scenario (keeps financial assumptions consistent)
      investmentProfile: currentActiveScenario 
        ? { ...currentActiveScenario.investmentProfile } 
        : { ...profile },
      // Start with EMPTY property instances
      propertyInstances: {},
      // Start with EMPTY timeline (will be recalculated when properties are added)
      timeline: [],
      isActive: false,
    };

    // Add the new scenario but keep the current scenario (Scenario A) active
    setScenarios(prev => [...prev, newScenario]);
    
    // Don't switch to the new scenario - keep the existing active scenario
    // The user can click on the new scenario to switch to it when ready
  }, [scenarios, activeScenarioId, profile, syncCurrentScenarioFromContext]);

  // Remove a scenario
  const removeScenario = useCallback((id: string) => {
    // Don't allow removing the last scenario
    if (scenarios.length === 1) {
      return;
    }

    // Mark deletion in progress to prevent auto-sync from restoring the deleted scenario
    deletionInProgressRef.current = true;

    const remainingScenarios = scenarios.filter(s => s.id !== id);
    setScenarios(remainingScenarios);

    // If removing the active scenario, switch to the first remaining scenario
    if (id === activeScenarioId && remainingScenarios.length > 0) {
      const newActiveId = remainingScenarios[0].id;
      setActiveScenarioId(newActiveId);
      setScenarios(prev => prev.map(s => ({
        ...s,
        isActive: s.id === newActiveId,
      })));
      // Restore the new active scenario's state to global contexts
      restoreScenarioToGlobalContexts(newActiveId);
    }

    // Clear the deletion flag after a longer delay to ensure save operations
    // that might be triggered don't restore deleted scenarios with stale closures
    setTimeout(() => {
      deletionInProgressRef.current = false;
    }, 500);
  }, [scenarios, activeScenarioId, restoreScenarioToGlobalContexts]);

  // Set the active scenario
  const setActiveScenarioHandler = useCallback((id: string) => {
    // Don't do anything if switching to the already-active scenario
    if (id === activeScenarioId) return;

    // First sync the current scenario's state FROM global contexts
    syncCurrentScenarioFromContext();

    // Update the active scenario ID and isActive flags
    setActiveScenarioId(id);
    setScenarios(prev => prev.map(s => ({
      ...s,
      isActive: s.id === id,
    })));

    // Restore the new scenario's state TO global contexts
    // This is the critical step that makes scenarios truly independent
    restoreScenarioToGlobalContexts(id);
  }, [activeScenarioId, syncCurrentScenarioFromContext, restoreScenarioToGlobalContexts]);

  // Update a specific scenario
  const updateScenario = useCallback((id: string, updates: Partial<Scenario>) => {
    setScenarios(prev => prev.map(s => 
      s.id === id ? { ...s, ...updates } : s
    ));
  }, []);

  // Getter for deletion in progress state (for other contexts to check)
  const isDeletionInProgress = useCallback(() => deletionInProgressRef.current, []);

  const value: MultiScenarioContextType = {
    scenarios,
    activeScenarioId,
    activeScenario,
    isMultiScenarioMode,
    isDeletionInProgress,
    addScenario,
    removeScenario,
    setActiveScenario: setActiveScenarioHandler,
    updateScenario,
    syncCurrentScenarioFromContext,
    restoreScenarioToGlobalContexts,
  };

  return (
    <MultiScenarioContext.Provider value={value}>
      {children}
    </MultiScenarioContext.Provider>
  );
};
