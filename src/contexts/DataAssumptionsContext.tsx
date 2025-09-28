import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAutoSaveDataAssumptions, useLoadClientData } from '@/hooks/useAutoSaveIntegration';
import { useClient } from './ClientContext';

export interface PropertyAssumption {
  type: string;
  averageCost: string;
  yield: string;
  growth: string;
  deposit: string;
}

export interface GlobalEconomicFactors {
  growthRate: string;
  loanToValueRatio: string;
  interestRate: string;
}

interface DataAssumptionsContextType {
  globalFactors: GlobalEconomicFactors;
  propertyAssumptions: PropertyAssumption[];
  updateGlobalFactor: (factor: keyof GlobalEconomicFactors, value: string) => void;
  updatePropertyAssumption: (index: number, field: keyof PropertyAssumption, value: string) => void;
  getPropertyData: (propertyType: string) => PropertyAssumption | undefined;
}

const DataAssumptionsContext = createContext<DataAssumptionsContextType | undefined>(undefined);

export const useDataAssumptions = () => {
  const context = useContext(DataAssumptionsContext);
  if (context === undefined) {
    throw new Error('useDataAssumptions must be used within a DataAssumptionsProvider');
  }
  return context;
};

interface DataAssumptionsProviderProps {
  children: React.ReactNode;
}

export const DataAssumptionsProvider: React.FC<DataAssumptionsProviderProps> = ({ children }) => {
  const { activeClient } = useClient();
  const { loadScenarioData } = useLoadClientData();
  
  const [globalFactors, setGlobalFactors] = useState<GlobalEconomicFactors>({
    growthRate: '7',
    loanToValueRatio: '80',
    interestRate: '6',
  });

  const [propertyAssumptions, setPropertyAssumptions] = useState<PropertyAssumption[]>([
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
  ]);

  // Auto-save integration
  useAutoSaveDataAssumptions(globalFactors, propertyAssumptions);

  // Load client data when active client changes
  useEffect(() => {
    if (activeClient?.id) {
      const clientData = loadScenarioData(activeClient.id);
      if (clientData) {
        if (clientData.globalFactors) {
          setGlobalFactors(clientData.globalFactors);
        }
        if (clientData.propertyAssumptions) {
          setPropertyAssumptions(clientData.propertyAssumptions);
        }
      }
    }
  }, [activeClient?.id, loadScenarioData]);

  const updateGlobalFactor = (factor: keyof GlobalEconomicFactors, value: string) => {
    setGlobalFactors(prev => ({
      ...prev,
      [factor]: value,
    }));
  };

  const updatePropertyAssumption = (index: number, field: keyof PropertyAssumption, value: string) => {
    setPropertyAssumptions(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  const getPropertyData = (propertyType: string): PropertyAssumption | undefined => {
    return propertyAssumptions.find(prop => prop.type === propertyType);
  };

  const value = {
    globalFactors,
    propertyAssumptions,
    updateGlobalFactor,
    updatePropertyAssumption,
    getPropertyData,
  };

  return (
    <DataAssumptionsContext.Provider value={value}>
      {children}
    </DataAssumptionsContext.Provider>
  );
};