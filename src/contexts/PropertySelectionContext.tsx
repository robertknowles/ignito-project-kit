import React, { createContext, useContext, useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useDataAssumptions } from './DataAssumptionsContext';
import { useClient } from './ClientContext';

export interface PropertyType {
  id: string;
  title: string;
  priceRange: string;
  yield: string;
  cashFlow: string;
  riskLevel: 'Low' | 'Medium' | 'Medium-Low' | 'High' | 'Very High';
  cost: number;
  depositRequired: number;
  yieldPercent: number;
  growthPercent: number;
}

export interface PropertySelection {
  [propertyId: string]: number; // quantity of each property type
}

export interface PortfolioCalculations {
  totalProperties: number;
  totalCost: number;
  totalDepositRequired: number;
  totalAnnualIncome: number;
}

export interface FeasibilityChecks {
  hasAdequateDeposit: boolean;
  withinBorrowingCapacity: boolean;
  overallFeasible: boolean;
}


interface PropertySelectionContextType {
  selections: PropertySelection;
  calculations: PortfolioCalculations;
  checkFeasibility: (availableDeposit: number, borrowingCapacity: number) => FeasibilityChecks;
  updatePropertyQuantity: (propertyId: string, quantity: number) => void;
  incrementProperty: (propertyId: string) => void;
  decrementProperty: (propertyId: string) => void;
  getPropertyQuantity: (propertyId: string) => number;
  resetSelections: () => void;
  propertyTypes: PropertyType[];
}

const PropertySelectionContext = createContext<PropertySelectionContextType | undefined>(undefined);

export const usePropertySelection = () => {
  const context = useContext(PropertySelectionContext);
  if (context === undefined) {
    throw new Error('usePropertySelection must be used within a PropertySelectionProvider');
  }
  return context;
};

interface PropertySelectionProviderProps {
  children: React.ReactNode;
}

export const PropertySelectionProvider: React.FC<PropertySelectionProviderProps> = ({ children }) => {
  const { activeClient } = useClient();
  const [selections, setSelections] = useState<PropertySelection>({});
  const { propertyAssumptions } = useDataAssumptions();

  // Load selections from localStorage on mount or when client changes
  useEffect(() => {
    if (activeClient?.id) {
      const storageKey = `property_selections_${activeClient.id}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          setSelections(JSON.parse(stored));
        } catch (error) {
          console.error('Failed to load property selections from localStorage:', error);
          setSelections({});
        }
      } else {
        setSelections({});
      }
    }
  }, [activeClient?.id]);

  // Save selections to localStorage whenever they change
  useEffect(() => {
    if (activeClient?.id) {
      const storageKey = `property_selections_${activeClient.id}`;
      localStorage.setItem(storageKey, JSON.stringify(selections));
    }
  }, [selections, activeClient?.id]);

  // Convert data assumptions to property types for calculations
  const propertyTypes = useMemo(() => {
    return propertyAssumptions.map((assumption, index) => ({
      id: `property_${index}`,
      title: assumption.type,
      priceRange: `$${parseFloat(assumption.averageCost).toLocaleString()}`,
      yield: `${assumption.yield}%`,
      cashFlow: `$${Math.round((parseFloat(assumption.averageCost) * parseFloat(assumption.yield)) / 100 / 12)}`,
      riskLevel: 'Medium' as const,
      cost: parseFloat(assumption.averageCost),
      depositRequired: Math.round((parseFloat(assumption.averageCost) * parseFloat(assumption.deposit)) / 100),
      yieldPercent: parseFloat(assumption.yield),
      growthPercent: parseFloat(assumption.growth),
    }));
  }, [propertyAssumptions]);

  // Calculate portfolio totals
  const calculations = useMemo((): PortfolioCalculations => {
    let totalProperties = 0;
    let totalCost = 0;
    let totalDepositRequired = 0;
    let totalAnnualIncome = 0;

    // Calculate totals based on selections
    Object.entries(selections).forEach(([propertyId, quantity]) => {
      if (quantity > 0) {
        const propertyType = propertyTypes.find(p => p.id === propertyId);
        if (propertyType) {
          totalProperties += quantity;
          totalCost += propertyType.cost * quantity;
          totalDepositRequired += propertyType.depositRequired * quantity;
          totalAnnualIncome += (propertyType.cost * propertyType.yieldPercent / 100) * quantity;
        }
      }
    });

    return {
      totalProperties,
      totalCost,
      totalDepositRequired,
      totalAnnualIncome,
    };
  }, [selections, propertyTypes]);

  // Check financial feasibility against available funds
  const checkFeasibility = (availableDeposit: number, borrowingCapacity: number): FeasibilityChecks => {
    const totalLoanAmount = calculations.totalCost - calculations.totalDepositRequired;
    const hasAdequateDeposit = calculations.totalDepositRequired <= availableDeposit;
    const withinBorrowingCapacity = totalLoanAmount <= borrowingCapacity;
    const overallFeasible = hasAdequateDeposit && withinBorrowingCapacity;

    return {
      hasAdequateDeposit,
      withinBorrowingCapacity,
      overallFeasible,
    };
  };

  const updatePropertyQuantity = useCallback((propertyId: string, quantity: number) => {
    setSelections(prev => ({
      ...prev,
      [propertyId]: Math.max(0, quantity), // Ensure non-negative
    }));
  }, []);

  const incrementProperty = useCallback((propertyId: string) => {
    setSelections(prev => ({
      ...prev,
      [propertyId]: (prev[propertyId] || 0) + 1,
    }));
  }, []);

  const decrementProperty = useCallback((propertyId: string) => {
    setSelections(prev => ({
      ...prev,
      [propertyId]: Math.max(0, (prev[propertyId] || 0) - 1),
    }));
  }, []);

  const getPropertyQuantity = (propertyId: string): number => {
    return selections[propertyId] || 0;
  };

  const resetSelections = () => {
    setSelections({});
  };

  const value = {
    selections,
    calculations,
    checkFeasibility,
    updatePropertyQuantity,
    incrementProperty,
    decrementProperty,
    getPropertyQuantity,
    resetSelections,
    propertyTypes,
  };

  return (
    <PropertySelectionContext.Provider value={value}>
      {children}
    </PropertySelectionContext.Provider>
  );
};