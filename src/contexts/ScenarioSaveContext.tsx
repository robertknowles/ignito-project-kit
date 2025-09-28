import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useClient } from './ClientContext';
import { useDataAssumptions } from './DataAssumptionsContext';
import { usePropertySelection } from './PropertySelectionContext';
import { useInvestmentProfile } from './InvestmentProfileContext';
import { toast } from '@/hooks/use-toast';

export interface ScenarioData {
  propertySelections: { [propertyId: string]: number };
  globalFactors: {
    growthRate: string;
    loanToValueRatio: string;
    interestRate: string;
  };
  propertyAssumptions: Array<{
    type: string;
    averageCost: string;
    yield: string;
    growth: string;
    deposit: string;
  }>;
  investmentProfile: {
    depositPool: number;
    borrowingCapacity: number;
    portfolioValue: number;
    currentDebt: number;
    annualSavings: number;
    timelineYears: number;
    equityGrowth: number;
    cashflow: number;
  };
  lastSaved: string;
}

interface ScenarioSaveContextType {
  hasUnsavedChanges: boolean;
  isLoading: boolean;
  lastSaved: string | null;
  saveScenario: () => void;
  loadClientScenario: (clientId: number) => ScenarioData | null;
}

const ScenarioSaveContext = createContext<ScenarioSaveContextType | undefined>(undefined);

export const useScenarioSave = () => {
  const context = useContext(ScenarioSaveContext);
  if (context === undefined) {
    throw new Error('useScenarioSave must be used within a ScenarioSaveProvider');
  }
  return context;
};

export const ScenarioSaveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeClient } = useClient();
  const { globalFactors, propertyAssumptions } = useDataAssumptions();
  const { selections } = usePropertySelection();
  const { profile } = useInvestmentProfile();

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [lastSavedData, setLastSavedData] = useState<ScenarioData | null>(null);

  // Get current scenario data
  const getCurrentScenarioData = useCallback((): ScenarioData => {
    return {
      propertySelections: selections,
      globalFactors,
      propertyAssumptions,
      investmentProfile: profile,
      lastSaved: new Date().toISOString(),
    };
  }, [selections, globalFactors, propertyAssumptions, profile]);

  // Save scenario
  const saveScenario = useCallback(() => {
    if (!activeClient) return;

    setIsLoading(true);
    
    try {
      const scenarioData = getCurrentScenarioData();
      const storageKey = `scenario_${activeClient.id}`;
      
      localStorage.setItem(storageKey, JSON.stringify(scenarioData));
      
      setLastSavedData(scenarioData);
      setLastSaved(scenarioData.lastSaved);
      setHasUnsavedChanges(false);
      
      toast({
        title: "Scenario Saved",
        description: `${activeClient.name}'s scenario saved successfully`,
      });
    } catch (error) {
      console.error('Error saving scenario:', error);
      toast({
        title: "Save Error",
        description: "Failed to save scenario. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [activeClient, getCurrentScenarioData]);

  // Load client scenario
  const loadClientScenario = useCallback((clientId: number) => {
    try {
      const storageKey = `scenario_${clientId}`;
      const savedData = localStorage.getItem(storageKey);
      
      if (savedData) {
        const scenarioData: ScenarioData = JSON.parse(savedData);
        setLastSavedData(scenarioData);
        setLastSaved(scenarioData.lastSaved);
        setHasUnsavedChanges(false);
        return scenarioData;
      } else {
        setLastSavedData(null);
        setLastSaved(null);
        setHasUnsavedChanges(false);
        return null;
      }
    } catch (error) {
      console.error('Error loading scenario:', error);
      return null;
    }
  }, []);

  // Check for changes
  useEffect(() => {
    if (activeClient && lastSavedData) {
      const currentData = getCurrentScenarioData();
      const hasChanges = 
        JSON.stringify(currentData.propertySelections) !== JSON.stringify(lastSavedData.propertySelections) ||
        JSON.stringify(currentData.globalFactors) !== JSON.stringify(lastSavedData.globalFactors) ||
        JSON.stringify(currentData.propertyAssumptions) !== JSON.stringify(lastSavedData.propertyAssumptions) ||
        JSON.stringify(currentData.investmentProfile) !== JSON.stringify(lastSavedData.investmentProfile);
      
      setHasUnsavedChanges(hasChanges);
    } else if (activeClient && !lastSavedData) {
      // New client with data = unsaved changes
      const hasData = Object.keys(selections).length > 0;
      setHasUnsavedChanges(hasData);
    }
  }, [selections, globalFactors, propertyAssumptions, profile, activeClient, lastSavedData, getCurrentScenarioData]);

  const value = {
    hasUnsavedChanges,
    isLoading,
    lastSaved,
    saveScenario,
    loadClientScenario,
  };

  return (
    <ScenarioSaveContext.Provider value={value}>
      {children}
    </ScenarioSaveContext.Provider>
  );
};