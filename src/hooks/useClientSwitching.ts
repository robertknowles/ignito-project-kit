import { useEffect, useCallback } from 'react';
import { useClient } from '@/contexts/ClientContext';
import { useScenarioSave, ScenarioData } from '@/contexts/ScenarioSaveContext';
import { useDataAssumptions, GlobalEconomicFactors } from '@/contexts/DataAssumptionsContext';
import { usePropertySelection } from '@/contexts/PropertySelectionContext';
import { useInvestmentProfile } from '@/contexts/InvestmentProfileContext';
import { toast } from '@/hooks/use-toast';

export const useClientSwitching = () => {
  const { activeClient } = useClient();
  const { 
    hasUnsavedChanges, 
    loadClientScenario, 
    checkForUnsavedChanges 
  } = useScenarioSave();
  
  const { 
    updateGlobalFactor, 
    updatePropertyAssumption,
    globalFactors,
    propertyAssumptions 
  } = useDataAssumptions();
  
  const { 
    updatePropertyQuantity, 
    resetSelections 
  } = usePropertySelection();
  
  const { updateProfile } = useInvestmentProfile();

  // Load client data when active client changes
  const loadClientData = useCallback((clientId: number) => {
    const savedData: ScenarioData | null = loadClientScenario(clientId);
    
    if (savedData) {
      // Load property selections
      resetSelections();
      Object.entries(savedData.propertySelections).forEach(([propertyId, quantity]) => {
        if (typeof quantity === 'number') {
          updatePropertyQuantity(propertyId, quantity);
        }
      });
      
      // Load global factors
      Object.entries(savedData.globalFactors).forEach(([key, value]) => {
        if (typeof value === 'string') {
          updateGlobalFactor(key as keyof GlobalEconomicFactors, value);
        }
      });
      
      // Load property assumptions
      savedData.propertyAssumptions.forEach((assumption, index) => {
        Object.entries(assumption).forEach(([field, value]) => {
          if (field !== 'type' && typeof value === 'string') {
            updatePropertyAssumption(index, field as any, value);
          }
        });
      });
      
      // Load investment profile
      updateProfile(savedData.investmentProfile);
      
      toast({
        title: "Scenario Loaded",
        description: `Loaded saved data for this client`,
      });
    } else {
      // New client - start fresh
      resetSelections();
      toast({
        title: "New Client",
        description: "Starting with default settings for new client",
      });
    }
  }, [
    loadClientScenario,
    resetSelections,
    updatePropertyQuantity,
    updateGlobalFactor,
    updatePropertyAssumption,
    updateProfile,
    globalFactors
  ]);

  // Handle client switching with unsaved changes warning
  useEffect(() => {
    if (activeClient) {
      // Load new client's data
      loadClientData(activeClient.id);
    }
  }, [activeClient?.id, loadClientData]);

  return {
    hasUnsavedChanges,
    loadClientData,
  };
};