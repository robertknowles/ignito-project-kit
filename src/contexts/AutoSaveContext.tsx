import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useClient } from './ClientContext';
import { PropertySelection } from './PropertySelectionContext';
import { GlobalEconomicFactors, PropertyAssumption } from './DataAssumptionsContext';
import { InvestmentProfileData } from './InvestmentProfileContext';

export interface ClientScenarioData {
  clientId: number;
  lastSaved: string;
  propertySelections: PropertySelection;
  globalFactors: GlobalEconomicFactors;
  propertyAssumptions: PropertyAssumption[];
  investmentProfile: InvestmentProfileData;
  timelineResults?: any; // Store timeline calculation results
}

export interface SaveStatus {
  isSaving: boolean;
  lastSaved: string | null;
  hasUnsavedChanges: boolean;
  error: string | null;
}

interface AutoSaveContextType {
  saveStatus: SaveStatus;
  saveClientData: (data: Partial<ClientScenarioData>) => void;
  loadClientData: (clientId: number) => ClientScenarioData | null;
  clearClientData: (clientId: number) => void;
  setSaveIndicator: (saving: boolean) => void;
  markAsChanged: () => void;
}

const AutoSaveContext = createContext<AutoSaveContextType | undefined>(undefined);

export const useAutoSave = () => {
  const context = useContext(AutoSaveContext);
  if (context === undefined) {
    throw new Error('useAutoSave must be used within an AutoSaveProvider');
  }
  return context;
};

const STORAGE_KEY_PREFIX = 'lovable_client_scenario_';
const DEBOUNCE_DELAY = 2500; // 2.5 seconds

interface AutoSaveProviderProps {
  children: ReactNode;
}

export const AutoSaveProvider: React.FC<AutoSaveProviderProps> = ({ children }) => {
  const { activeClient } = useClient();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({
    isSaving: false,
    lastSaved: null,
    hasUnsavedChanges: false,
    error: null,
  });
  
  const [pendingData, setPendingData] = useState<Partial<ClientScenarioData> | null>(null);
  const [saveTimeoutId, setSaveTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Default scenario data for new clients
  const getDefaultScenarioData = (clientId: number): ClientScenarioData => ({
    clientId,
    lastSaved: new Date().toISOString(),
    propertySelections: {},
    globalFactors: {
      growthRate: '7',
      loanToValueRatio: '80',
      interestRate: '6',
    },
    propertyAssumptions: [
      {
        type: 'Units / Apartments',
        averageCost: '350000',
        yield: '7',
        growth: '5',
        deposit: '15',
      },
      {
        type: 'Villas / Townhouses',
        averageCost: '325000',
        yield: '7',
        growth: '6',
        deposit: '15',
      },
      {
        type: 'Houses (Regional focus)',
        averageCost: '350000',
        yield: '7',
        growth: '6',
        deposit: '15',
      },
      {
        type: 'Granny Flats (add-on)',
        averageCost: '195000',
        yield: '9',
        growth: '0',
        deposit: '100',
      },
      {
        type: 'Duplexes',
        averageCost: '550000',
        yield: '7',
        growth: '6',
        deposit: '15',
      },
      {
        type: 'Small Blocks (3-4 units)',
        averageCost: '900000',
        yield: '7',
        growth: '6',
        deposit: '20',
      },
      {
        type: 'Metro Houses',
        averageCost: '800000',
        yield: '4',
        growth: '7',
        deposit: '15',
      },
      {
        type: 'Larger Blocks (10-20 units)',
        averageCost: '3500000',
        yield: '7',
        growth: '5',
        deposit: '45',
      },
      {
        type: 'Commercial Property',
        averageCost: '3000000',
        yield: '8',
        growth: '4',
        deposit: '40',
      },
    ],
    investmentProfile: {
      depositPool: 50000,
      borrowingCapacity: 500000,
      portfolioValue: 0,
      currentDebt: 0,
      annualSavings: 24000,
      timelineYears: 15,
      equityGrowth: 75,
      cashflow: 25,
    },
  });

  // Generate storage key for client
  const getStorageKey = (clientId: number): string => `${STORAGE_KEY_PREFIX}${clientId}`;

  // Load client data from localStorage
  const loadClientData = useCallback((clientId: number): ClientScenarioData | null => {
    try {
      const key = getStorageKey(clientId);
      const stored = localStorage.getItem(key);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate the data structure
        if (parsed.clientId === clientId && parsed.lastSaved) {
          return parsed as ClientScenarioData;
        }
      }
      
      // Return default data for new clients
      return getDefaultScenarioData(clientId);
    } catch (error) {
      console.error('Error loading client data:', error);
      setSaveStatus(prev => ({ 
        ...prev, 
        error: 'Failed to load client data' 
      }));
      return getDefaultScenarioData(clientId);
    }
  }, []);

  // Save data to localStorage with error handling
  const performSave = useCallback(async (clientId: number, data: ClientScenarioData) => {
    setSaveStatus(prev => ({ ...prev, isSaving: true, error: null }));
    
    try {
      const key = getStorageKey(clientId);
      const dataToSave = {
        ...data,
        lastSaved: new Date().toISOString(),
      };
      
      // Check localStorage quota
      const serialized = JSON.stringify(dataToSave);
      if (serialized.length > 5 * 1024 * 1024) { // 5MB limit
        throw new Error('Data size exceeds storage limit');
      }
      
      localStorage.setItem(key, serialized);
      
      setSaveStatus(prev => ({ 
        ...prev, 
        isSaving: false,
        lastSaved: dataToSave.lastSaved,
        hasUnsavedChanges: false,
        error: null
      }));
      
      console.log(`Auto-saved data for client ${clientId}:`, dataToSave);
    } catch (error) {
      console.error('Error saving client data:', error);
      setSaveStatus(prev => ({ 
        ...prev, 
        isSaving: false,
        error: error instanceof Error ? error.message : 'Failed to save data'
      }));
    }
  }, []);

  // Debounced save function
  const debouncedSave = useCallback((clientId: number, data: Partial<ClientScenarioData>) => {
    // Clear existing timeout
    if (saveTimeoutId) {
      clearTimeout(saveTimeoutId);
    }

    // Mark as having unsaved changes
    setSaveStatus(prev => ({ ...prev, hasUnsavedChanges: true }));

    // Set new timeout for debounced save
    const timeoutId = setTimeout(() => {
      const existingData = loadClientData(clientId) || getDefaultScenarioData(clientId);
      const mergedData = { ...existingData, ...data, clientId };
      performSave(clientId, mergedData);
    }, DEBOUNCE_DELAY);

    setSaveTimeoutId(timeoutId);
  }, [saveTimeoutId, loadClientData, performSave]);

  // Public save function
  const saveClientData = useCallback((data: Partial<ClientScenarioData>) => {
    if (!activeClient?.id) return;
    
    debouncedSave(activeClient.id, data);
  }, [activeClient?.id, debouncedSave]);

  // Clear client data
  const clearClientData = useCallback((clientId: number) => {
    try {
      const key = getStorageKey(clientId);
      localStorage.removeItem(key);
      console.log(`Cleared data for client ${clientId}`);
    } catch (error) {
      console.error('Error clearing client data:', error);
    }
  }, []);

  // Manual save indicator setter
  const setSaveIndicator = useCallback((saving: boolean) => {
    setSaveStatus(prev => ({ ...prev, isSaving: saving }));
  }, []);

  // Mark data as changed
  const markAsChanged = useCallback(() => {
    setSaveStatus(prev => ({ ...prev, hasUnsavedChanges: true }));
  }, []);

  // Load initial data when active client changes
  useEffect(() => {
    if (activeClient?.id) {
      const clientData = loadClientData(activeClient.id);
      if (clientData) {
        setSaveStatus(prev => ({
          ...prev,
          lastSaved: clientData.lastSaved,
          hasUnsavedChanges: false,
          error: null
        }));
      }
    }
  }, [activeClient?.id, loadClientData]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutId) {
        clearTimeout(saveTimeoutId);
      }
    };
  }, [saveTimeoutId]);

  // Handle browser beforeunload for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus.hasUnsavedChanges]);

  const value = {
    saveStatus,
    saveClientData,
    loadClientData,
    clearClientData,
    setSaveIndicator,
    markAsChanged,
  };

  return (
    <AutoSaveContext.Provider value={value}>
      {children}
    </AutoSaveContext.Provider>
  );
};