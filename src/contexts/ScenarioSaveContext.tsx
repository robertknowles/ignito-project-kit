import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useClient } from './ClientContext';
import { usePropertySelection } from './PropertySelectionContext';
import { useInvestmentProfile } from './InvestmentProfileContext';
import { usePropertyInstance } from './PropertyInstanceContext';
import { useMultiScenario, Scenario } from './MultiScenarioContext';
import { useAuth } from './AuthContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { PropertyInstanceDetails } from '../types/propertyInstance';

// Communication log entry for CRM features
export interface CommunicationLogEntry {
  id: string;
  date: string;
  note: string;
  author: string;
}

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
  // CRM Features
  clientViewedAt?: string; // ISO timestamp when client first viewed report
  communicationLog?: CommunicationLogEntry[];
  onboardingCompleted?: boolean;
  onboardingCompletedAt?: string;
  lastSaved: string;
  // Multi-scenario comparison data
  comparisonMode?: boolean;
  scenarios?: Scenario[];
}

interface ScenarioSaveContextType {
  hasUnsavedChanges: boolean;
  isLoading: boolean;
  lastSaved: string | null;
  scenarioId: number | null;
  saveScenario: () => void;
  resetScenario: () => void;
  loadClientScenario: (clientId: number) => ScenarioData | null;
  setTimelineSnapshot: (snapshot: any[]) => void;
  setChartData: (chartData: ScenarioData['chartData']) => void;
  // Client sandbox mode
  clientScenarioLoading: boolean;
  noScenarioForClient: boolean;
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
  const { scenarios, isMultiScenarioMode, syncCurrentScenarioFromContext } = useMultiScenario();
  const { user, role } = useAuth();

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // Client sandbox mode state
  const [clientScenarioLoading, setClientScenarioLoading] = useState(false);
  const [noScenarioForClient, setNoScenarioForClient] = useState(false);
  const clientUserLoadedRef = useRef<boolean>(false);
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
    // In multi-scenario mode, sync the current active scenario and get updated scenarios
    let currentScenarios = scenarios;
    if (isMultiScenarioMode) {
      currentScenarios = syncCurrentScenarioFromContext();
    }
    
    const baseData: ScenarioData = {
      propertySelections: selections,
      propertyOrder: propertyOrder,
      investmentProfile: profile,
      propertyInstances: propertyInstanceContext.instances,
      timelineSnapshot: timelineSnapshot,
      chartData: chartData,
      lastSaved: new Date().toISOString(),
    };
    
    // If in multi-scenario mode, include all scenarios for comparison report
    if (isMultiScenarioMode && currentScenarios.length >= 2) {
      return {
        ...baseData,
        comparisonMode: true,
        scenarios: currentScenarios, // Include all scenarios for the comparison report
      };
    }
    
    return baseData;
  }, [selections, propertyOrder, profile, propertyInstanceContext.instances, timelineSnapshot, chartData, isMultiScenarioMode, scenarios, syncCurrentScenarioFromContext]);

  // Save scenario
  const saveScenario = useCallback(async () => {
    // Block saves for client role - sandbox mode
    if (role === 'client') {
      console.log('ScenarioSaveContext: Save blocked for client role (sandbox mode)');
      return;
    }

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
      
      // Fetch agent profile for display names
      let agentDisplayName = 'Agent';
      let companyDisplayName = 'PropPath';
      
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, company_name')
          .eq('id', user.id)
          .single();
        
        if (profileData) {
          agentDisplayName = profileData.full_name || user.user_metadata?.name || 'Agent';
          companyDisplayName = profileData.company_name || 'PropPath';
        }
      }
      
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
            data: scenarioData,
            client_display_name: activeClient.name || 'Client',
            agent_display_name: agentDisplayName,
            company_display_name: companyDisplayName,
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
            data: scenarioData,
            client_display_name: activeClient.name || 'Client',
            agent_display_name: agentDisplayName,
            company_display_name: companyDisplayName,
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
      
      // Different toast message for comparison mode
      if (scenarioData.comparisonMode && scenarioData.scenarios) {
        toast({
          title: "Scenarios Saved",
          description: `${scenarioData.scenarios.length} scenarios saved for ${activeClient.name} (comparison mode)`,
        });
      } else {
        toast({
          title: "Scenario Saved",
          description: `${activeClient.name}'s scenario saved successfully`,
        });
      }
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
  }, [role, activeClient, getCurrentScenarioData, user]);

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

  // Reset scenario - clear all data and delete from database
  const resetScenario = useCallback(async () => {
    if (!activeClient) {
      console.warn('ScenarioSaveContext: Cannot reset - no active client');
      return;
    }

    console.log('ScenarioSaveContext: Resetting scenario to empty state for client:', activeClient.id);
    setIsLoading(true);

    try {
      // Delete the scenario from the database if it exists
      if (scenarioId) {
        const { error } = await supabase
          .from('scenarios')
          .delete()
          .eq('id', scenarioId);
        
        if (error) throw error;
        console.log('ScenarioSaveContext: ✓ Deleted scenario from database');
      }

      // Reset all local state to empty/defaults
      resetSelections();
      propertyInstanceContext.setInstances({});
      setPropertyOrder([]);
      
      // Reset scenario tracking state
      setLastSavedData(null);
      setLastSaved(null);
      setScenarioId(null);
      setHasUnsavedChanges(false);
      setTimelineSnapshot([]);
      setChartData(undefined);

      toast({
        title: "Scenario Reset",
        description: `${activeClient.name}'s scenario has been cleared.`,
      });
    } catch (error) {
      console.error('ScenarioSaveContext: ✗ Error resetting scenario:', error);
      toast({
        title: "Reset Error",
        description: "Failed to reset scenario. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [activeClient, scenarioId, resetSelections, propertyInstanceContext, setPropertyOrder]);

  // Load scenario for client user by client_user_id (for sandbox mode)
  const loadScenarioForClientUser = useCallback(async (userId: string) => {
    console.log('ScenarioSaveContext: Loading scenario for client user:', userId);
    
    setClientScenarioLoading(true);
    setNoScenarioForClient(false);
    
    try {
      // Query scenarios by client_user_id
      const { data, error } = await supabase
        .from('scenarios')
        .select('*')
        .eq('client_user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        // PGRST116 means no rows found
        if (error.code === 'PGRST116') {
          console.log('ScenarioSaveContext: No scenario found for client user', userId);
          setNoScenarioForClient(true);
          setLastSavedData(null);
          setLastSaved(null);
          setScenarioId(null);
          resetSelections();
          propertyInstanceContext.setInstances({});
          return null;
        }
        throw error;
      }
      
      if (data?.data) {
        const scenarioData = data.data as ScenarioData;
        console.log('ScenarioSaveContext: ✓ Loaded scenario for client user');
        console.log('ScenarioSaveContext: - Property selections:', Object.keys(scenarioData.propertySelections).length);
        
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
          propertyInstanceContext.setInstances(scenarioData.propertyInstances);
        } else {
          propertyInstanceContext.setInstances({});
        }
        
        // Restore property order
        if (scenarioData.propertyOrder && scenarioData.propertyOrder.length > 0) {
          setPropertyOrder(scenarioData.propertyOrder);
        } else {
          const reconstructedOrder: string[] = [];
          Object.entries(scenarioData.propertySelections).forEach(([propertyId, quantity]) => {
            for (let i = 0; i < quantity; i++) {
              reconstructedOrder.push(`${propertyId}_instance_${i}`);
            }
          });
          setPropertyOrder(reconstructedOrder);
        }
        
        setLastSavedData(scenarioData);
        setLastSaved(scenarioData.lastSaved);
        setHasUnsavedChanges(false);
        setNoScenarioForClient(false);
        
        console.log('ScenarioSaveContext: ✓ Client user scenario loaded successfully');
        return scenarioData;
      } else {
        console.log('ScenarioSaveContext: No data in scenario for client user');
        setNoScenarioForClient(true);
        setLastSavedData(null);
        setLastSaved(null);
        resetSelections();
        propertyInstanceContext.setInstances({});
        return null;
      }
    } catch (error) {
      console.error('ScenarioSaveContext: ✗ Error loading scenario for client user:', error);
      setNoScenarioForClient(true);
      toast({
        title: "Load Error",
        description: "Failed to load your scenario. Please refresh the page.",
        variant: "destructive",
      });
      return null;
    } finally {
      setClientScenarioLoading(false);
    }
  }, [resetSelections, updateProfile, updatePropertyQuantity, propertyInstanceContext, setPropertyOrder]);

  // Auto-load scenario for client users (sandbox mode)
  useEffect(() => {
    if (role === 'client' && user?.id && !clientUserLoadedRef.current) {
      console.log('ScenarioSaveContext: Client user detected, auto-loading scenario');
      clientUserLoadedRef.current = true;
      loadScenarioForClientUser(user.id);
    }
  }, [role, user?.id, loadScenarioForClientUser]);

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
    resetScenario,
    loadClientScenario,
    setTimelineSnapshot,
    setChartData,
    // Client sandbox mode
    clientScenarioLoading,
    noScenarioForClient,
  };

  return (
    <ScenarioSaveContext.Provider value={value}>
      {children}
    </ScenarioSaveContext.Provider>
  );
};