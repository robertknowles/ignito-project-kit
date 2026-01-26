import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
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
  addScenario: () => void;
  removeScenario: (id: string) => void;
  setActiveScenario: (id: string) => void;
  updateScenario: (id: string, updates: Partial<Scenario>) => void;
  syncCurrentScenarioFromContext: () => void;
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
  const { selections, propertyOrder } = usePropertySelection();
  const { profile } = useInvestmentProfile();
  const { instances } = usePropertyInstance();
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

  // Get the active scenario
  const activeScenario = scenarios.find(s => s.id === activeScenarioId) || null;

  // Check if we're in multi-scenario mode (more than 1 scenario)
  const isMultiScenarioMode = scenarios.length > 1;

  // Sync the current active scenario with the global context state
  // This is called when we need to capture the current state into the active scenario
  const syncCurrentScenarioFromContext = useCallback(() => {
    if (!activeScenarioId) return;

    setScenarios(prev => prev.map(s => {
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
    }));
  }, [activeScenarioId, selections, propertyOrder, profile, instances, timelineProperties]);

  // Auto-sync the active scenario when context data changes (only in multi-scenario mode)
  useEffect(() => {
    if (isMultiScenarioMode) {
      syncCurrentScenarioFromContext();
    }
  }, [isMultiScenarioMode, selections, propertyOrder, profile, instances, timelineProperties]);

  // Add a new scenario (clones the active scenario)
  const addScenario = useCallback(() => {
    // Sync current state before cloning
    syncCurrentScenarioFromContext();

    const currentActiveScenario = scenarios.find(s => s.id === activeScenarioId);
    
    const newScenario: Scenario = {
      id: `scenario-${Date.now()}`,
      name: `Scenario ${String.fromCharCode(65 + scenarios.length)}`, // A, B, C, etc.
      propertySelections: currentActiveScenario 
        ? { ...currentActiveScenario.propertySelections } 
        : { ...selections },
      propertyOrder: currentActiveScenario 
        ? [...currentActiveScenario.propertyOrder] 
        : [...propertyOrder],
      investmentProfile: currentActiveScenario 
        ? { ...currentActiveScenario.investmentProfile } 
        : { ...profile },
      propertyInstances: currentActiveScenario 
        ? { ...currentActiveScenario.propertyInstances } 
        : { ...instances },
      timeline: currentActiveScenario 
        ? [...currentActiveScenario.timeline] 
        : [...timelineProperties],
      isActive: false,
    };

    // Add the new scenario but keep the current scenario (Scenario A) active
    setScenarios(prev => [...prev, newScenario]);
    
    // Don't switch to the new scenario - keep the existing active scenario
    // The user can click on the new scenario to switch to it when ready
  }, [scenarios, activeScenarioId, selections, propertyOrder, profile, instances, timelineProperties, syncCurrentScenarioFromContext]);

  // Remove a scenario
  const removeScenario = useCallback((id: string) => {
    // Don't allow removing the last scenario
    if (scenarios.length === 1) {
      console.warn('Cannot remove the last scenario');
      return;
    }

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
    }
  }, [scenarios, activeScenarioId]);

  // Set the active scenario
  const setActiveScenarioHandler = useCallback((id: string) => {
    // First sync the current scenario before switching
    syncCurrentScenarioFromContext();

    setActiveScenarioId(id);
    setScenarios(prev => prev.map(s => ({
      ...s,
      isActive: s.id === id,
    })));
  }, [syncCurrentScenarioFromContext]);

  // Update a specific scenario
  const updateScenario = useCallback((id: string, updates: Partial<Scenario>) => {
    setScenarios(prev => prev.map(s => 
      s.id === id ? { ...s, ...updates } : s
    ));
  }, []);

  const value: MultiScenarioContextType = {
    scenarios,
    activeScenarioId,
    activeScenario,
    isMultiScenarioMode,
    addScenario,
    removeScenario,
    setActiveScenario: setActiveScenarioHandler,
    updateScenario,
    syncCurrentScenarioFromContext,
  };

  return (
    <MultiScenarioContext.Provider value={value}>
      {children}
    </MultiScenarioContext.Provider>
  );
};
