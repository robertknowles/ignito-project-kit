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
  /** True while loadClientScenario's async fetch is in flight. */
  isLoadingScenario: boolean;
  /**
   * The client id whose data the current in-memory scenario state reflects.
   * null until the first load completes. Consumers like ChatPanel use this
   * to detect when savedChatMessages is fresh for the active client vs still
   * stale from a previous one (race between activeClient change and the
   * async scenario fetch settling).
   */
  loadedScenarioClientId: number | null;
  isAutosaving: boolean;
  lastSaved: string | null;
  scenarioId: number | null;
  saveScenario: (silent?: boolean) => Promise<void>;
  resetScenario: () => void;
  loadClientScenario: (clientId: number) => ScenarioData | null;
  /**
   * Sync the loaded version pointer after a direct write to scenarios.data
   * (e.g. via mutateScenarioData). Without this, the next autosave would
   * conflict on the stale version, fall into the reload path, and discard
   * in-memory edits made since the last successful autosave.
   */
  syncScenarioVersion: (newVersion: number) => void;
  /**
   * True while a chat request is in flight (plan generation, modification,
   * explanation). Lifted to this context (which lives above the route layer)
   * so other components — notably the tab nav in TopBar — can react to it
   * across route changes. Without this, switching tabs mid-request remounts
   * ChatPanel and orphans the in-flight fetch in the unmounted component's
   * closure, causing visible glitches and dropped responses.
   */
  isChatRequestInFlight: boolean;
  setChatRequestInFlight: (inFlight: boolean) => void;
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
  // Tracks which client the in-memory scenario state (chatMessages, scenarioId,
  // selections, etc.) currently reflects. Set after loadClientScenario settles
  // for that client (success OR no-data path). Consumers like ChatPanel use
  // this to know whether savedChatMessages is fresh for the active client or
  // still stale from the previous one.
  const [loadedScenarioClientId, setLoadedScenarioClientId] = useState<number | null>(null);
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
  }, [selections, propertyOrder, profile, propertyInstanceContext.instances, timelineSnapshot, chartData, chatMessages, isMultiScenarioMode, scenarios, syncCurrentScenarioFromContext, isDeletionInProgress]);

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
        // maybeSingle so a missing profile row (rare) doesn't trigger
        // Supabase's 15-second auth-retry storm.
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, company_name, company_id')
          .eq('id', user.id)
          .maybeSingle();

        if (profileData) {
          agentDisplayName = profileData.full_name || user.user_metadata?.name || 'Agent';
          companyDisplayName = profileData.company_name || 'PropPath';
          userCompanyId = profileData.company_id;
        }
      }

      // Merge with any DB-side fields we don't manage in this context.
      //
      // Other pages (Portfolio.tsx, DataAssumptions.tsx) directly write to
      // scenarios.data.portfolioTracking via their own savePortfolioTracking
      // helper. Without this merge, our autosave would build scenarioData from
      // in-memory state (which has no portfolioTracking) and stomp those
      // writes — that's the "marked as purchased turns back off after nav"
      // bug (cofounder report 2026-05-05).
      //
      // Preserve any unmanaged keys from the existing DB row. Managed keys
      // (the in-memory state we own) take precedence from scenarioData.
      // Future-proofs against any other page that writes to scenarios.data.
      const MANAGED_KEYS = new Set([
        'propertySelections',
        'propertyOrder',
        'investmentProfile',
        'propertyInstances',
        'timelineSnapshot',
        'chartData',
        'chatHistory',
        'lastSaved',
        'comparisonMode',
        'scenarios',
      ]);
      let mergedData: ScenarioData = scenarioData;
      if (scenarioId !== null) {
        const { data: existingRow } = await supabase
          .from('scenarios')
          .select('data')
          .eq('id', scenarioId)
          .single();
        const existingData = (existingRow?.data ?? {}) as Record<string, unknown>;
        const preserved: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(existingData)) {
          if (!MANAGED_KEYS.has(key)) preserved[key] = val;
        }
        mergedData = { ...preserved, ...scenarioData } as ScenarioData;
      }

      const baseFields = {
        name: `${activeClient.name}'s Scenario`,
        updated_at: new Date().toISOString(),
        data: mergedData,
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
    if (loadInProgressRef.current) {
      return null;
    }

    loadInProgressRef.current = true;
    setIsLoadingScenario(true);
    // Eager-clear chat history ONLY when switching to a different client —
    // otherwise (self-heal recovery, same-client reload from save conflict)
    // we'd wipe in-memory chat messages that haven't been autosaved yet,
    // making the user's last message vanish on navigation. Same-client
    // reload preserves chat by default and only adopts the DB version if
    // it's at least as long (see chat-restore block below).
    //
    // Use loadedClientRef.current (the LAST client we initiated a load for)
    // rather than activeClient?.id from the closure — the closure can be
    // stale because loadClientScenario isn't redeclared on every activeClient
    // change. When the parent effect fires loadClientScenario(client2) right
    // after setActiveClient(client2), the closure here may still see
    // activeClient.id = client1, making isSameClientReload incorrectly true
    // and skipping the chat clear → previous client's chat persists into the
    // new client's slot until the async fetch lands.
    const isSameClientReload = loadedClientRef.current === clientId;
    if (!isSameClientReload) {
      setChatMessages([]);
      setLoadedScenarioClientId(null);
    }

    try {
      // .maybeSingle() returns null instead of erroring when no rows match.
      // Using .single() here returned 406 Not Acceptable for new clients with
      // no saved scenario, which Supabase JS treats as auth-retryable and
      // retries with exponential backoff (~1+2+4+8 ≈ 15s). That 15s of
      // retrying was visible to the user as a stalled loading state on the
      // home → new-client flow (founder report 2026-05-06).
      const { data, error } = await supabase
        .from('scenarios')
        .select('*')
        .eq('client_id', clientId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        // No saved scenario for this client. Don't wipe selections/instances
        // — the user may have unsaved chat-driven data in memory.
        setLastSavedData(null);
        setLastSaved(null);
        setScenarioId(null);
        setLoadedVersion(0);
        if (!isSameClientReload) {
          setChatMessages([]);
        }
        setLoadedScenarioClientId(clientId);
        return null;
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
        
        // Restore NL chat history. On a same-client reload (recovery path),
        // only adopt the DB version if it's at least as long as what's in
        // memory — otherwise an autosave that hadn't fired yet would have
        // its in-memory chat overwritten by stale DB data, making the user's
        // last message disappear on navigation.
        if (scenarioData.chatHistory && scenarioData.chatHistory.length > 0) {
          if (isSameClientReload) {
            setChatMessages((prev) =>
              scenarioData.chatHistory!.length >= prev.length ? scenarioData.chatHistory! : prev
            );
          } else {
            setChatMessages(scenarioData.chatHistory);
          }
        } else if (!isSameClientReload) {
          setChatMessages([]);
        }
        // (else: same-client reload with no DB chat — keep whatever's in memory)

        setLastSavedData(scenarioData);
        setLastSaved(scenarioData.lastSaved);
        setHasUnsavedChanges(false);
        setLoadedScenarioClientId(clientId);

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
        setLoadedScenarioClientId(clientId);
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
      // Query scenarios by client_user_id. maybeSingle so a no-rows case
      // returns null cleanly — see loadClientScenario for why .single() was
      // a 15-second auth-retry stall.
      const { data, error } = await supabase
        .from('scenarios')
        .select('*')
        .eq('client_user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        // No scenario for this client user — full blank slate.
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

  // Reset the load guard when the auth user changes (logout/login). Without
  // this, logout-then-login leaves loadedClientRef pointing at the previous
  // session's client id, so the load effect below silently skips the
  // re-fetch — and any client-side wipe to the contexts during logout (e.g.
  // future cleanup we add, or framework-level state churn) leaves the
  // dashboard blank with no recovery path.
  useEffect(() => {
    loadedClientRef.current = null;
  }, [user?.id]);

  // Load scenario when activeClient changes
  useEffect(() => {
    if (activeClient && loadedClientRef.current !== activeClient.id) {
      loadClientScenario(activeClient.id);
      loadedClientRef.current = activeClient.id;
    }
  }, [activeClient?.id, loadClientScenario]);

  // Self-heal: defensive recovery from in-memory context wipe.
  //
  // Pattern: user has a saved scenario, navigates to another page (per-property
  // detail, home, settings) and back. On return the dashboard renders blank
  // because propertyOrder/selections went empty, even though Supabase still
  // holds the row and chat history is intact. Reproduced across multiple
  // navigation pathways (cofounder report 2026-05-04, 2026-05-05).
  //
  // Root cause is hard to pin down — could be transient context churn, a child
  // provider remount, or a stale closure. Rather than chase per-page, we detect
  // the empty-state-with-saved-row condition at the context level and refetch.
  //
  // Trigger conditions (ALL must hold):
  //  - activeClient is set
  //  - we previously loaded a scenario from Supabase (scenarioId != null)
  //  - propertyOrder is empty (the visible symptom of a wipe)
  //  - no load is currently in flight
  //  - role is owner/agent (client sandbox has its own loader)
  //
  // Covers all entry pathways automatically — Dashboard, Portfolio, Retirement,
  // Settings, DataAssumptions, the property detail modal, and any future page
  // that reads scenario state. loadInProgressRef inside loadClientScenario
  // guards against concurrent calls if a route-level recovery also fires.
  // Track which (client, scenario) pair we've already attempted recovery on.
  // Without this, scenarios with corrupt data (chatHistory present but
  // propertyOrder/propertySelections genuinely empty in the DB row) cause
  // the self-heal to loop infinitely — fetch returns the same empty data,
  // propertyOrder.length stays 0, loadInProgressRef + isLoadingScenario
  // toggle false, effect re-fires, repeat forever (cofounder report
  // 2026-05-06: hundreds of identical GETs to /scenarios on Lucy click).
  const selfHealAttemptedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeClient) return;
    if (role === 'client') return;
    if (!scenarioId) return;
    if (propertyOrder.length > 0) return;
    if (loadInProgressRef.current) return;
    if (isLoadingScenario) return;
    const attemptKey = `${activeClient.id}:${scenarioId}`;
    if (selfHealAttemptedRef.current === attemptKey) return;
    selfHealAttemptedRef.current = attemptKey;
    loadClientScenario(activeClient.id);
  }, [activeClient?.id, role, scenarioId, propertyOrder.length, isLoadingScenario, loadClientScenario]);

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
    }, 250);

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

  const syncScenarioVersion = useCallback((newVersion: number) => {
    setLoadedVersion(newVersion);
  }, []);

  const [isChatRequestInFlight, setChatRequestInFlight] = useState<boolean>(false);

  const value = {
    hasUnsavedChanges,
    isLoading,
    isLoadingScenario,
    loadedScenarioClientId,
    isAutosaving,
    lastSaved,
    scenarioId,
    saveScenario,
    resetScenario,
    loadClientScenario,
    syncScenarioVersion,
    isChatRequestInFlight,
    setChatRequestInFlight,
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