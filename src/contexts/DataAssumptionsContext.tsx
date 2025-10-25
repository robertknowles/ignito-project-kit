import React, { createContext, useContext, useState } from 'react';

export interface PropertyAssumption {
  type: string;
  averageCost: string;
  yield: string;
  growth: string;
  deposit: string;
  loanType?: 'IO' | 'PI';
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
      loanType: 'IO',
    },
    {
      type: 'Villas / Townhouses',
      averageCost: '325000',
      yield: '7',
      growth: '6',
      deposit: '15',
      loanType: 'IO',
    },
    {
      type: 'Houses (Regional focus)',
      averageCost: '350000',
      yield: '7',
      growth: '6',
      deposit: '15',
      loanType: 'IO',
    },
    {
      type: 'Granny Flats (add-on)',
      averageCost: '195000',
      yield: '9',
      growth: '0',
      deposit: '100',
      loanType: 'IO',
    },
    {
      type: 'Duplexes',
      averageCost: '550000',
      yield: '7',
      growth: '6',
      deposit: '15',
      loanType: 'IO',
    },
    {
      type: 'Small Blocks (3-4 units)',
      averageCost: '900000',
      yield: '7',
      growth: '6',
      deposit: '20',
      loanType: 'IO',
    },
    {
      type: 'Metro Houses',
      averageCost: '800000',
      yield: '4',
      growth: '7',
      deposit: '15',
      loanType: 'IO',
    },
    {
      type: 'Larger Blocks (10-20 units)',
      averageCost: '3500000',
      yield: '7',
      growth: '5',
      deposit: '45',
      loanType: 'IO',
    },
    {
      type: 'Commercial Property',
      averageCost: '3000000',
      yield: '8',
      growth: '4',
      deposit: '40',
      loanType: 'IO',
    },
  ]);

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