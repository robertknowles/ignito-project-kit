import { useEffect, useCallback } from 'react';
import { useAutoSave } from '@/contexts/AutoSaveContext';
import { useClient } from '@/contexts/ClientContext';
import { PropertySelection } from '@/contexts/PropertySelectionContext';
import { GlobalEconomicFactors, PropertyAssumption } from '@/contexts/DataAssumptionsContext';
import { InvestmentProfileData } from '@/contexts/InvestmentProfileContext';

// Hook for auto-saving property selections
export const useAutoSavePropertySelections = (selections: PropertySelection) => {
  const { saveClientData, markAsChanged } = useAutoSave();
  const { activeClient } = useClient();

  useEffect(() => {
    if (activeClient?.id && Object.keys(selections).length > 0) {
      markAsChanged();
      saveClientData({ propertySelections: selections });
    }
  }, [selections, activeClient?.id, saveClientData, markAsChanged]);
};

// Hook for auto-saving data assumptions
export const useAutoSaveDataAssumptions = (
  globalFactors: GlobalEconomicFactors,
  propertyAssumptions: PropertyAssumption[]
) => {
  const { saveClientData, markAsChanged } = useAutoSave();
  const { activeClient } = useClient();

  useEffect(() => {
    if (activeClient?.id) {
      markAsChanged();
      saveClientData({ 
        globalFactors,
        propertyAssumptions 
      });
    }
  }, [globalFactors, propertyAssumptions, activeClient?.id, saveClientData, markAsChanged]);
};

// Hook for auto-saving investment profile
export const useAutoSaveInvestmentProfile = (profile: InvestmentProfileData) => {
  const { saveClientData, markAsChanged } = useAutoSave();
  const { activeClient } = useClient();

  useEffect(() => {
    if (activeClient?.id) {
      markAsChanged();
      saveClientData({ investmentProfile: profile });
    }
  }, [profile, activeClient?.id, saveClientData, markAsChanged]);
};

// Hook for loading client data when switching clients
export const useLoadClientData = () => {
  const { loadClientData } = useAutoSave();
  
  const loadScenarioData = useCallback((clientId: number) => {
    return loadClientData(clientId);
  }, [loadClientData]);

  return { loadScenarioData };
};