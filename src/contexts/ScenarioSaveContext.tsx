import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useClient } from './ClientContext';
import { usePropertySelection } from './PropertySelectionContext';
import { useInvestmentProfile } from './InvestmentProfileContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface ScenarioData {
  propertySelections: { [propertyId: string]: number };
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
  const { selections, resetSelections, updatePropertyQuantity } = usePropertySelection();
  const { profile, updateProfile } = useInvestmentProfile();

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [lastSavedData, setLastSavedData] = useState<ScenarioData | null>(null);
  const loadedClientRef = useRef<number | null>(null);

  // Get current scenario data
  const getCurrentScenarioData = useCallback((): ScenarioData => {
    return {
      propertySelections: selections,
      investmentProfile: profile,
      lastSaved: new Date().toISOString(),
    };
  }, [selections, profile]);

  // Save scenario
  const saveScenario = useCallback(async () => {
    if (!activeClient) return;

    setIsLoading(true);
    
    try {
      const scenarioData = getCurrentScenarioData();
      
      // Check if a scenario already exists for this client
      const { data: existingScenarios } = await supabase
        .from('scenarios')
        .select('id')
        .eq('client_id', activeClient.id)
        .limit(1);
      
      if (existingScenarios && existingScenarios.length > 0) {
        // Update existing scenario
        const { error } = await supabase
          .from('scenarios')
          .update({
            name: `${activeClient.name}'s Scenario`,
            updated_at: new Date().toISOString(),
            data: scenarioData
          })
          .eq('id', existingScenarios[0].id);
        
        if (error) throw error;
      } else {
        // Insert new scenario
        const { error } = await supabase
          .from('scenarios')
          .insert({
            name: `${activeClient.name}'s Scenario`,
            client_id: activeClient.id,
            updated_at: new Date().toISOString(),
            data: scenarioData
          });
        
        if (error) throw error;
      }
      
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
  const loadClientScenario = useCallback(async (clientId: number) => {
    console.log('ScenarioSaveContext: Loading scenario for client:', clientId);
    
    try {
      const { data, error } = await supabase
        .from('scenarios')
        .select('*')
        .eq('client_id', clientId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        // PGRST116 means no rows found
        if (error.code === 'PGRST116') {
          console.log('ScenarioSaveContext: No saved scenario found');
          setLastSavedData(null);
          setLastSaved(null);
          setHasUnsavedChanges(false);
          // Reset contexts to default
          resetSelections();
          return null;
        }
        throw error;
      }
      
      if (data?.data) {
        const scenarioData = data.data as ScenarioData;
        console.log('ScenarioSaveContext: Loaded scenario data:', scenarioData);
        
        // Apply property selections
        resetSelections();
        Object.entries(scenarioData.propertySelections).forEach(([propertyId, quantity]) => {
          if (quantity > 0) {
            updatePropertyQuantity(propertyId, quantity);
          }
        });
        
        // Apply investment profile
        updateProfile(scenarioData.investmentProfile);
        
        setLastSavedData(scenarioData);
        setLastSaved(scenarioData.lastSaved);
        setHasUnsavedChanges(false);
        return scenarioData;
      } else {
        setLastSavedData(null);
        setLastSaved(null);
        setHasUnsavedChanges(false);
        resetSelections();
        return null;
      }
    } catch (error) {
      console.error('ScenarioSaveContext: Error loading scenario:', error);
      return null;
    }
  }, [resetSelections, updateProfile, updatePropertyQuantity]);

  // Load scenario when activeClient changes
  useEffect(() => {
    if (activeClient && loadedClientRef.current !== activeClient.id) {
      console.log('ScenarioSaveContext: activeClient changed, loading scenario for client:', activeClient.id);
      loadClientScenario(activeClient.id);
      loadedClientRef.current = activeClient.id;
    }
  }, [activeClient?.id, loadClientScenario]);

  // Debounced change detection to prevent excessive calculations
  const changeDetectionTimer = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (changeDetectionTimer.current) {
      clearTimeout(changeDetectionTimer.current);
    }
    
    changeDetectionTimer.current = setTimeout(() => {
      if (activeClient && lastSavedData) {
        const currentData = getCurrentScenarioData();
        
        // Use shallow comparison where possible instead of JSON.stringify
        const hasSelectionChanges = Object.keys(currentData.propertySelections).length !== Object.keys(lastSavedData.propertySelections).length ||
          Object.entries(currentData.propertySelections).some(([key, value]) => lastSavedData.propertySelections[key] !== value);
        
        const hasProfileChanges = JSON.stringify(currentData.investmentProfile) !== JSON.stringify(lastSavedData.investmentProfile);
        
        const hasChanges = hasSelectionChanges || hasProfileChanges;
        setHasUnsavedChanges(hasChanges);
      } else if (activeClient && !lastSavedData) {
        // New client with data = unsaved changes
        const hasData = Object.keys(selections).length > 0;
        setHasUnsavedChanges(hasData);
      }
    }, 150); // 150ms debounce
  }, [selections, profile, activeClient, lastSavedData, getCurrentScenarioData]);

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