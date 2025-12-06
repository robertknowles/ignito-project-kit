import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useClient } from './ClientContext';
import { usePropertySelection } from './PropertySelectionContext';
import { useInvestmentProfile } from './InvestmentProfileContext';
import { usePropertyInstance } from './PropertyInstanceContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { PropertyInstanceDetails } from '../types/propertyInstance';

export interface ScenarioData {
  propertySelections: { [propertyId: string]: number };
  propertyOrder?: string[]; // Track the chronological order in which properties were added
  investmentProfile: {
    depositPool: number;
    borrowingCapacity: number;
    portfolioValue: number;
    currentDebt: number;
    annualSavings: number;
    timelineYears: number;
    equityGrowth: number;
    cashflow: number;
    equityGoal?: number;
    cashflowGoal?: number;
    targetYear?: number;
    growthCurve?: {
      year1: number;
      years2to3: number;
      year4: number;
      year5plus: number;
    };
  };
  propertyInstances?: Record<string, PropertyInstanceDetails>;
  timelineSnapshot?: any[];
  // Pre-calculated chart data for Client Report consistency
  chartData?: {
    portfolioGrowthData: Array<{
      year: string;
      portfolioValue: number;
      equity: number;
      properties?: string[];
    }>;
    cashflowData: Array<{
      year: string;
      cashflow: number;
      rentalIncome: number;
      loanRepayments: number;
    }>;
    equityGoalYear: number | null;
    incomeGoalYear: number | null;
  };
  lastSaved: string;
}

interface ScenarioSaveContextType {
  hasUnsavedChanges: boolean;
  isLoading: boolean;
  lastSaved: string | null;
  scenarioId: number | null;
  saveScenario: () => void;
  loadClientScenario: (clientId: number) => ScenarioData | null;
  setTimelineSnapshot: (snapshot: any[]) => void;
  setChartData: (chartData: ScenarioData['chartData']) => void;
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
  const { selections, propertyOrder, resetSelections, updatePropertyQuantity, setPropertyOrder } = usePropertySelection();
  const { profile, updateProfile } = useInvestmentProfile();
  const propertyInstanceContext = usePropertyInstance();

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [scenarioId, setScenarioId] = useState<number | null>(null);
  const [lastSavedData, setLastSavedData] = useState<ScenarioData | null>(null);
  const [timelineSnapshot, setTimelineSnapshot] = useState<any[]>([]);
  const [chartData, setChartData] = useState<ScenarioData['chartData'] | undefined>(undefined);
  const loadedClientRef = useRef<number | null>(null);
  const saveInProgressRef = useRef<boolean>(false);
  const loadInProgressRef = useRef<boolean>(false);

  // Get current scenario data
  const getCurrentScenarioData = useCallback((): ScenarioData => {
    return {
      propertySelections: selections,
      propertyOrder: propertyOrder,
      investmentProfile: profile,
      propertyInstances: propertyInstanceContext.instances,
      timelineSnapshot: timelineSnapshot,
      chartData: chartData,
      lastSaved: new Date().toISOString(),
    };
  }, [selections, propertyOrder, profile, propertyInstanceContext.instances, timelineSnapshot, chartData]);

  // Save scenario
  const saveScenario = useCallback(async () => {
    if (!activeClient) {
      console.warn('ScenarioSaveContext: Cannot save - no active client');
      return;
    }

    // Prevent concurrent save operations
    if (saveInProgressRef.current) {
      console.warn('ScenarioSaveContext: Save already in progress, skipping');
      toast({
        title: "Save in Progress",
        description: "Please wait for the current save to complete",
      });
      return;
    }

    saveInProgressRef.current = true;
    setIsLoading(true);
    
    try {
      const scenarioData = getCurrentScenarioData();
      console.log('ScenarioSaveContext: Saving scenario with', Object.keys(scenarioData.propertyInstances || {}).length, 'property instances');
      console.log('ScenarioSaveContext: Property instances:', Object.keys(scenarioData.propertyInstances || {}));
      
      // Check if a scenario already exists for this client
      const { data: existingScenarios, error: fetchError } = await supabase
        .from('scenarios')
        .select('id')
        .eq('client_id', activeClient.id)
        .limit(1);
      
      if (fetchError) throw fetchError;
      
      if (existingScenarios && existingScenarios.length > 0) {
        // Update existing scenario
        console.log('ScenarioSaveContext: Updating existing scenario', existingScenarios[0].id);
        const { error } = await supabase
          .from('scenarios')
          .update({
            name: `${activeClient.name}'s Scenario`,
            updated_at: new Date().toISOString(),
            data: scenarioData
          })
          .eq('id', existingScenarios[0].id);
        
        if (error) throw error;
        setScenarioId(existingScenarios[0].id);
        console.log('ScenarioSaveContext: ✓ Scenario updated successfully');
      } else {
        // Insert new scenario
        console.log('ScenarioSaveContext: Creating new scenario');
        const { data: newScenario, error } = await supabase
          .from('scenarios')
          .insert({
            name: `${activeClient.name}'s Scenario`,
            client_id: activeClient.id,
            updated_at: new Date().toISOString(),
            data: scenarioData
          })
          .select('id')
          .single();
        
        if (error) throw error;
        if (newScenario) {
          setScenarioId(newScenario.id);
        }
        console.log('ScenarioSaveContext: ✓ New scenario created successfully');
      }
      
      setLastSavedData(scenarioData);
      setLastSaved(scenarioData.lastSaved);
      setHasUnsavedChanges(false);
      
      toast({
        title: "Scenario Saved",
        description: `${activeClient.name}'s scenario saved successfully`,
      });
    } catch (error) {
      console.error('ScenarioSaveContext: ✗ Error saving scenario:', error);
      toast({
        title: "Save Error",
        description: "Failed to save scenario. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      saveInProgressRef.current = false;
    }
  }, [activeClient, getCurrentScenarioData]);

  // Load client scenario
  const loadClientScenario = useCallback(async (clientId: number) => {
    console.log('ScenarioSaveContext: Loading scenario for client:', clientId);
    
    // Prevent concurrent load operations
    if (loadInProgressRef.current) {
      console.warn('ScenarioSaveContext: Load already in progress, skipping');
      return null;
    }

    loadInProgressRef.current = true;
    
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
          console.log('ScenarioSaveContext: No saved scenario found for client', clientId);
          setLastSavedData(null);
          setLastSaved(null);
          setScenarioId(null);
          setHasUnsavedChanges(false);
          // Reset contexts to default
          resetSelections();
          propertyInstanceContext.setInstances({});
          return null;
        }
        throw error;
      }
      
      if (data?.data) {
        const scenarioData = data.data as ScenarioData;
        console.log('ScenarioSaveContext: ✓ Loaded scenario data');
        console.log('ScenarioSaveContext: - Property selections:', Object.keys(scenarioData.propertySelections).length);
        console.log('ScenarioSaveContext: - Property instances:', Object.keys(scenarioData.propertyInstances || {}).length);
        
        // Set the scenario ID
        setScenarioId(data.id);
        
        // Apply property selections
        resetSelections();
        Object.entries(scenarioData.propertySelections).forEach(([propertyId, quantity]) => {
          if (quantity > 0) {
            updatePropertyQuantity(propertyId, quantity);
          }
        });
        
        // Apply investment profile
        if (scenarioData.investmentProfile) {
          updateProfile(scenarioData.investmentProfile);
        }
        
        // Load property instances
        if (scenarioData.propertyInstances && Object.keys(scenarioData.propertyInstances).length > 0) {
          console.log('ScenarioSaveContext: Restoring', Object.keys(scenarioData.propertyInstances).length, 'property instances');
          console.log('ScenarioSaveContext: Instance IDs:', Object.keys(scenarioData.propertyInstances).join(', '));
          propertyInstanceContext.setInstances(scenarioData.propertyInstances);
        } else {
          console.log('ScenarioSaveContext: No property instances to restore');
          propertyInstanceContext.setInstances({});
        }
        
        // Restore property order (chronological order in which properties were added)
        if (scenarioData.propertyOrder && scenarioData.propertyOrder.length > 0) {
          console.log('ScenarioSaveContext: Restoring property order with', scenarioData.propertyOrder.length, 'entries');
          setPropertyOrder(scenarioData.propertyOrder);
        } else {
          // Backwards compatibility: reconstruct order from selections if propertyOrder not saved
          // This groups by property type, so chronological order is lost for legacy data
          const reconstructedOrder: string[] = [];
          Object.entries(scenarioData.propertySelections).forEach(([propertyId, quantity]) => {
            for (let i = 0; i < quantity; i++) {
              reconstructedOrder.push(`${propertyId}_instance_${i}`);
            }
          });
          console.log('ScenarioSaveContext: Reconstructed property order from selections (legacy data)');
          setPropertyOrder(reconstructedOrder);
        }
        
        setLastSavedData(scenarioData);
        setLastSaved(scenarioData.lastSaved);
        setHasUnsavedChanges(false);
        
        console.log('ScenarioSaveContext: ✓ Scenario loaded successfully');
        return scenarioData;
      } else {
        console.log('ScenarioSaveContext: No data in scenario');
        setLastSavedData(null);
        setLastSaved(null);
        setHasUnsavedChanges(false);
        resetSelections();
        propertyInstanceContext.setInstances({});
        return null;
      }
    } catch (error) {
      console.error('ScenarioSaveContext: ✗ Error loading scenario:', error);
      toast({
        title: "Load Error",
        description: "Failed to load scenario. Please refresh the page.",
        variant: "destructive",
      });
      return null;
    } finally {
      loadInProgressRef.current = false;
    }
  }, [resetSelections, updateProfile, updatePropertyQuantity, propertyInstanceContext, setPropertyOrder]);

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
        
        const currentInstances = JSON.stringify(propertyInstanceContext.instances);
        const savedInstances = JSON.stringify(lastSavedData.propertyInstances || {});
        const hasInstanceChanges = currentInstances !== savedInstances;
        
        // Check if property order has changed
        const currentOrder = currentData.propertyOrder || [];
        const savedOrder = lastSavedData.propertyOrder || [];
        const hasOrderChanges = currentOrder.length !== savedOrder.length ||
          currentOrder.some((id, index) => savedOrder[index] !== id);
        
        const hasChanges = hasSelectionChanges || hasProfileChanges || hasInstanceChanges || hasOrderChanges;
        setHasUnsavedChanges(hasChanges);
      } else if (activeClient && !lastSavedData) {
        // New client with data = unsaved changes
        const hasData = Object.keys(selections).length > 0;
        setHasUnsavedChanges(hasData);
      }
    }, 150); // 150ms debounce
  }, [selections, propertyOrder, profile, propertyInstanceContext.instances, activeClient, lastSavedData, getCurrentScenarioData]);

  const value = {
    hasUnsavedChanges,
    isLoading,
    lastSaved,
    scenarioId,
    saveScenario,
    loadClientScenario,
    setTimelineSnapshot,
    setChartData,
  };

  return (
    <ScenarioSaveContext.Provider value={value}>
      {children}
    </ScenarioSaveContext.Provider>
  );
};