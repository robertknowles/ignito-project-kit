import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useClient } from './ClientContext';
import { usePropertySelection } from './PropertySelectionContext';
import { useInvestmentProfile, INITIAL_INVESTMENT_PROFILE } from './InvestmentProfileContext';
import { usePropertyInstance } from './PropertyInstanceContext';
import { useMultiScenario, Scenario } from './MultiScenarioContext';
import { useAuth } from './AuthContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { PropertyInstanceDetails } from '../types/propertyInstance';
import type { ChatMessage } from '../types/nlParse';
import {
  translateLegacyEngineId,
  translateLegacyInstanceId,
} from '../utils/propertyCells';

/** Translate a saved propertySelections record from legacy positional IDs to v4 cell IDs. */
const translateSavedSelections = (raw: Record<string, number>): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const [key, qty] of Object.entries(raw)) {
    const newKey = translateLegacyEngineId(key) ?? key;
    out[newKey] = (out[newKey] ?? 0) + qty;
  }
  return out;
};

/** Translate a saved propertyOrder array from legacy positional instance IDs to v4 form. */
const translateSavedOrder = (raw: string[]): string[] => raw.map((id) => translateLegacyInstanceId(id));

/** Translate a saved propertyInstances record so keys match the new instance IDs. */
const translateSavedInstances = (
  raw: Record<string, PropertyInstanceDetails>
): Record<string, PropertyInstanceDetails> => {
  const out: Record<string, PropertyInstanceDetails> = {};
  for (const [oldId, instance] of Object.entries(raw)) {
    const newId = translateLegacyInstanceId(oldId);
    out[newId] = instance;
  }
  return out;
};

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
    portfolioValueGoal?: number;
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
  // NL Chat history — persists conversation with scenario
  chatHistory?: ChatMessage[];
  // Multi-scenario comparison data
  comparisonMode?: boolean;
  scenarios?: Scenario[];
}

interface ScenarioSaveContextType {
  hasUnsavedChanges: boolean;
  isLoading: boolean;
  isAutosaving: boolean;
  lastSaved: string | null;
  scenarioId: number | null;
  saveScenario: (silent?: boolean) => Promise<void>;
  resetScenario: () => void;
  loadClientScenario: (clientId: number) => ScenarioData | null;
  setTimelineSnapshot: (snapshot: any[]) => void;
  setChartData: (chartData: ScenarioData['chartData']) => void;
  // NL Chat history persistence
  chatMessages: ChatMessage[];
  setChatMessages: (messages: ChatMessage[]) => void;
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
  const { activeClient, updateClient } = useClient();
  const { selections, propertyOrder, resetSelections, updatePropertyQuantity, setPropertyOrder } = usePropertySelection();
  const { profile, updateProfile, setProfile } = useInvestmentProfile();
  const propertyInstanceContext = usePropertyInstance();
  const { scenarios, isMultiScenarioMode, syncCurrentScenarioFromContext, isDeletionInProgress } = useMultiScenario();
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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  // Optimistic concurrency: capture the version at load time, increment on successful save.
  // If a save fails because DB version no longer matches, another tab won — reload.
  const [loadedVersion, setLoadedVersion] = useState<number>(0);
  // Pause change-detection during a load so we don't briefly flag a freshly-loaded scenario as "unsaved".
  const [isLoadingScenario, setIsLoadingScenario] = useState<boolean>(false);
  const [isAutosaving, setIsAutosaving] = useState<boolean>(false);
  const loadedClientRef = useRef<number | null>(null);
  const saveInProgressRef = useRef<boolean>(false);
  const loadInProgressRef = useRef<boolean>(false);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get current scenario data
  const getCurrentScenarioData = useCallback((): ScenarioData => {
    // Check if deletion is in progress - if so, skip multi-scenario handling
    // to prevent stale closures from restoring deleted scenarios
    const deletionActive = isDeletionInProgress();
    
    // In multi-scenario mode, sync the current active scenario and get updated scenarios
    // But skip if deletion is in progress to avoid stale data
    let currentScenarios = scenarios;
    if (isMultiScenarioMode && !deletionActive) {
      currentScenarios = syncCurrentScenarioFromContext();
    }
    
    // Always explicitly set comparisonMode and scenarios to ensure old data is cleared
    const baseData: ScenarioData = {
      propertySelections: selections,
      propertyOrder: propertyOrder,
      investmentProfile: profile,
      propertyInstances: propertyInstanceContext.instances,
      timelineSnapshot: timelineSnapshot,
      chartData: chartData,
      chatHistory: chatMessages.length > 0 ? chatMessages : undefined,
      lastSaved: new Date().toISOString(),
      comparisonMode: false,  // Explicitly set to false by default
      scenarios: undefined,    // Explicitly clear old scenarios array
    };
    
    // If in multi-scenario mode, include all scenarios for comparison report
    // But skip during deletion to avoid saving stale scenario data
    if (isMultiScenarioMode && currentScenarios.length >= 2 && !deletionActive) {
      return {
        ...baseData,
        comparisonMode: true,
        scenarios: currentScenarios, // Include all scenarios for the comparison report
      };
    }
    
    return baseData;
  }, [selections, propertyOrder, profile, propertyInstanceContext.instances, timelineSnapshot, chartData, isMultiScenarioMode, scenarios, syncCurrentScenarioFromContext, isDeletionInProgress]);

  // Save scenario.
  // `silent`: suppress toasts (used by autosave). Errors still toast unless silent.
  const saveScenario = useCallback(async (silent: boolean = false): Promise<void> => {
    // Block saves for client role - sandbox mode
    if (role === 'client') {
      return;
    }

    if (!activeClient) {
      return;
    }

    // Prevent concurrent save operations. Autosave silently bows out; manual save toasts.
    if (saveInProgressRef.current) {
      if (!silent) {
        toast({
          title: "Save in Progress",
          description: "Please wait for the current save to complete",
        });
      }
      return;
    }

    saveInProgressRef.current = true;
    if (silent) {
      setIsAutosaving(true);
    } else {
      setIsLoading(true);
    }

    try {
      const scenarioData = getCurrentScenarioData();

      // Fetch agent profile for display names and company_id
      let agentDisplayName = 'Agent';
      let companyDisplayName = 'PropPath';
      let userCompanyId: string | null = null;

      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, company_name, company_id')
          .eq('id', user.id)
          .single();

        if (profileData) {
          agentDisplayName = profileData.full_name || user.user_metadata?.name || 'Agent';
          companyDisplayName = profileData.company_name || 'PropPath';
          userCompanyId = profileData.company_id;
        }
      }

      const baseFields = {
        name: `${activeClient.name}'s Scenario`,
        updated_at: new Date().toISOString(),
        data: scenarioData,
        client_display_name: activeClient.name || 'Client',
        agent_display_name: agentDisplayName,
        company_display_name: companyDisplayName,
      };

      if (scenarioId !== null) {
        // UPDATE path with optimistic version check.
        // Only succeeds if DB version still matches the version we loaded.
        const newVersion = loadedVersion + 1;
        const { data: updated, error } = await supabase
          .from('scenarios')
          .update({
            ...baseFields,
            version: newVersion,
            ...(userCompanyId && { company_id: userCompanyId }),
          })
          .eq('id', scenarioId)
          .eq('version', loadedVersion)
          .select('id, version');

        if (error) throw error;

        if (!updated || updated.length === 0) {
          // Version conflict — another tab saved while we were editing.
          // Reload so the user sees the freshest state.
          if (!silent) {
            toast({
              title: "Updated in another tab",
              description: "Reloading the latest version of this scenario.",
            });
          }
          await loadClientScenario(activeClient.id);
          return;
        }

        setLoadedVersion(updated[0].version);
      } else {
        // No scenarioId in state. Defensive pre-check in case state and DB drifted —
        // if a row exists we should reload, not insert a duplicate.
        const { data: existing, error: existingError } = await supabase
          .from('scenarios')
          .select('id, version')
          .eq('client_id', activeClient.id)
          .limit(1);

        if (existingError) throw existingError;

        if (existing && existing.length > 0) {
          if (!silent) {
            toast({
              title: "Existing scenario found",
              description: "Reloading the saved version for this client.",
            });
          }
          await loadClientScenario(activeClient.id);
          return;
        }

        // Truly new — INSERT with version 0
        const { data: newScenario, error } = await supabase
          .from('scenarios')
          .insert({
            ...baseFields,
            client_id: activeClient.id,
            company_id: userCompanyId,
            version: 0,
          })
          .select('id, version')
          .single();

        if (error) throw error;
        if (newScenario) {
          setScenarioId(newScenario.id);
          setLoadedVersion(newScenario.version);
        }
      }

      setLastSavedData(scenarioData);
      setLastSaved(scenarioData.lastSaved);
      setHasUnsavedChanges(false);

      // Update roadmap_status to 'draft' if currently 'not_started'
      if (activeClient.roadmap_status === 'not_started' || !activeClient.roadmap_status) {
        await updateClient(activeClient.id, { roadmap_status: 'draft' });
      }

      if (!silent) {
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
      }
    } catch (error) {
      // Autosave failures fail quietly to avoid spam; manual saves toast.
      // Future improvement: surface a persistent indicator if multiple autosaves fail in a row.
      if (!silent) {
        toast({
          title: "Save Error",
          description: "Failed to save scenario. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
      setIsAutosaving(false);
      saveInProgressRef.current = false;
    }
  }, [role, activeClient, getCurrentScenarioData, user, scenarioId, loadedVersion, updateClient]);

  // Load client scenario
  const loadClientScenario = useCallback(async (clientId: number) => {
    // Prevent concurrent load operations
    if (loadInProgressRef.current) {
      return null;
    }

    loadInProgressRef.current = true;
    setIsLoadingScenario(true);
    // Eager-clear chat history so the previous client's chat doesn't briefly
    // render in the new client's panel during the async fetch.
    setChatMessages([]);

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
          setLastSavedData(null);
          setLastSaved(null);
          setScenarioId(null);
          setLoadedVersion(0);
          // No saved scenario in Supabase. Don't wipe selections/instances —
          // the user may have unsaved chat-driven data already in
          // localStorage that PropertySelectionContext.loadClientData has
          // (or will) restore. Leave the contexts as they are. The debounced
          // change-detection effect below sets hasUnsavedChanges separately.
          return null;
        }
        throw error;
      }
      
      if (data?.data) {
        const scenarioData = data.data as ScenarioData;

        // Set the scenario ID and capture version for optimistic concurrency.
        setScenarioId(data.id);
        setLoadedVersion((data as { version?: number }).version ?? 0);

        // Translate saved data through the legacy alias layer so pre-pivot
        // scenarios (which used positional IDs like `property_5`) load
        // correctly under the v4 cell-ID model.
        const translatedSelections = translateSavedSelections(scenarioData.propertySelections);
        const translatedOrder = scenarioData.propertyOrder
          ? translateSavedOrder(scenarioData.propertyOrder)
          : undefined;
        const translatedInstances = scenarioData.propertyInstances
          ? translateSavedInstances(scenarioData.propertyInstances)
          : undefined;

        // Apply property selections
        resetSelections();
        Object.entries(translatedSelections).forEach(([propertyId, quantity]) => {
          if (quantity > 0) {
            updatePropertyQuantity(propertyId, quantity);
          }
        });

        // Apply investment profile
        if (scenarioData.investmentProfile) {
          updateProfile(scenarioData.investmentProfile);
        }

        // Load property instances
        if (translatedInstances && Object.keys(translatedInstances).length > 0) {
          propertyInstanceContext.setInstances(translatedInstances);
        } else {
          propertyInstanceContext.setInstances({});
        }

        // Restore property order (chronological order in which properties were added)
        if (translatedOrder && translatedOrder.length > 0) {
          setPropertyOrder(translatedOrder);
        } else {
          // Backwards compatibility: reconstruct order from translated selections.
          const reconstructedOrder: string[] = [];
          Object.entries(translatedSelections).forEach(([propertyId, quantity]) => {
            for (let i = 0; i < quantity; i++) {
              reconstructedOrder.push(`${propertyId}_instance_${i}`);
            }
          });
          setPropertyOrder(reconstructedOrder);
        }
        
        // Restore NL chat history if present
        if (scenarioData.chatHistory && scenarioData.chatHistory.length > 0) {
          setChatMessages(scenarioData.chatHistory);
        } else {
          setChatMessages([]);
        }

        setLastSavedData(scenarioData);
        setLastSaved(scenarioData.lastSaved);
        setHasUnsavedChanges(false);

        return scenarioData;
      } else {
        // Row exists but has no `data` payload — treat the same as no saved
        // scenario: blank slate.
        setLastSavedData(null);
        setLastSaved(null);
        setLoadedVersion(0);
        setHasUnsavedChanges(false);
        resetSelections();
        setPropertyOrder([]);
        propertyInstanceContext.setInstances({});
        setProfile({ ...INITIAL_INVESTMENT_PROFILE });
        setChatMessages([]);
        setTimelineSnapshot([]);
        setChartData(undefined);
        return null;
      }
    } catch (error) {
      toast({
        title: "Load Error",
        description: "Failed to load scenario. Please refresh the page.",
        variant: "destructive",
      });
      return null;
    } finally {
      loadInProgressRef.current = false;
      setIsLoadingScenario(false);
    }
  }, [resetSelections, updateProfile, setProfile, updatePropertyQuantity, propertyInstanceContext, setPropertyOrder, setChatMessages]);

  // Reset scenario - clear all data and delete from database
  const resetScenario = useCallback(async () => {
    if (!activeClient) {
      return;
    }

    setIsLoading(true);

    try {
      // Delete the scenario from the database if it exists
      if (scenarioId) {
        const { error } = await supabase
          .from('scenarios')
          .delete()
          .eq('id', scenarioId);
        
        if (error) throw error;
      }

      // Reset all local state to empty/defaults
      resetSelections();
      propertyInstanceContext.setInstances({});
      setPropertyOrder([]);
      
      // Reset scenario tracking state
      setLastSavedData(null);
      setLastSaved(null);
      setScenarioId(null);
      setLoadedVersion(0);
      setHasUnsavedChanges(false);
      setTimelineSnapshot([]);
      setChartData(undefined);
      setChatMessages([]);

      // Cancel any pending autosave so it doesn't immediately recreate the row.
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }

      toast({
        title: "Scenario Reset",
        description: `${activeClient.name}'s scenario has been cleared.`,
      });
    } catch (error) {
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
        // PGRST116 means no rows found — full blank slate.
        if (error.code === 'PGRST116') {
          setNoScenarioForClient(true);
          setLastSavedData(null);
          setLastSaved(null);
          setScenarioId(null);
          setHasUnsavedChanges(false);
          resetSelections();
          setPropertyOrder([]);
          propertyInstanceContext.setInstances({});
          setProfile({ ...INITIAL_INVESTMENT_PROFILE });
          setChatMessages([]);
          setTimelineSnapshot([]);
          setChartData(undefined);
          return null;
        }
        throw error;
      }
      
      if (data?.data) {
        const scenarioData = data.data as ScenarioData;
        
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
        
        return scenarioData;
      } else {
        setNoScenarioForClient(true);
        setLastSavedData(null);
        setLastSaved(null);
        setHasUnsavedChanges(false);
        resetSelections();
        setPropertyOrder([]);
        propertyInstanceContext.setInstances({});
        setProfile({ ...INITIAL_INVESTMENT_PROFILE });
        setChatMessages([]);
        setTimelineSnapshot([]);
        setChartData(undefined);
        return null;
      }
    } catch (error) {
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
  }, [resetSelections, updateProfile, setProfile, updatePropertyQuantity, propertyInstanceContext, setPropertyOrder, setChatMessages]);

  // Auto-load scenario for client users (sandbox mode)
  useEffect(() => {
    if (role === 'client' && user?.id && !clientUserLoadedRef.current) {
      clientUserLoadedRef.current = true;
      loadScenarioForClientUser(user.id);
    }
  }, [role, user?.id, loadScenarioForClientUser]);

  // Load scenario when activeClient changes
  useEffect(() => {
    if (activeClient && loadedClientRef.current !== activeClient.id) {
      loadClientScenario(activeClient.id);
      loadedClientRef.current = activeClient.id;
    }
  }, [activeClient?.id, loadClientScenario]);

  // Debounced change detection to prevent excessive calculations
  const changeDetectionTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Don't run change-detection while a load is in flight — the freshly-loaded
    // state needs a moment to settle before it makes sense to compare against
    // lastSavedData. Without this, we briefly flash hasUnsavedChanges=true on
    // a scenario the user just opened.
    if (isLoadingScenario) return;

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
  }, [selections, propertyOrder, profile, propertyInstanceContext.instances, activeClient, lastSavedData, getCurrentScenarioData, isLoadingScenario]);

  // Autosave: when there are unsaved changes, persist them silently after a
  // short debounce. This means scenarios are durable as soon as the chat
  // generates a plan or the user touches a property card — no manual Save click
  // required. Reset is the only way to clear the saved state.
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    if (role === 'client') return; // sandbox role can't write
    if (!activeClient) return;
    if (isLoadingScenario) return;
    if (saveInProgressRef.current) return; // save already happening; the next change-detection tick will re-trigger

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null;
      // Fire and forget — saveScenario handles its own errors.
      void saveScenario(true);
    }, 1000);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [hasUnsavedChanges, role, activeClient, isLoadingScenario, saveScenario]);

  // beforeunload safety net — only fires if a user closes the tab DURING the
  // 1s autosave debounce window. With autosave wired up, this should rarely
  // trigger, but it prevents silent data loss in the edge case.
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  const value = {
    hasUnsavedChanges,
    isLoading,
    isAutosaving,
    lastSaved,
    scenarioId,
    saveScenario,
    resetScenario,
    loadClientScenario,
    setTimelineSnapshot,
    setChartData,
    // NL Chat history persistence
    chatMessages,
    setChatMessages,
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