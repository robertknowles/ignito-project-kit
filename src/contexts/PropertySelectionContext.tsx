import React, { createContext, useContext, useState, useMemo } from 'react';

export interface PropertyType {
  id: string;
  title: string;
  priceRange: string;
  averagePrice: number;
  depositRequired: number; // 20% of average price
  yield: string;
  cashFlow: string;
  riskLevel: 'Low' | 'Medium' | 'Medium-Low' | 'High' | 'Very High';
}

export interface PropertySelection {
  [propertyId: string]: number; // quantity of each property type
}

export interface PortfolioCalculations {
  totalProperties: number;
  totalCost: number;
  totalDepositRequired: number;
  totalLoanAmount: number;
}

export interface FeasibilityChecks {
  hasAdequateDeposit: boolean;
  withinBorrowingCapacity: boolean;
  overallFeasible: boolean;
}

// Property definitions with realistic pricing data
export const PROPERTY_TYPES: PropertyType[] = [
  {
    id: 'granny-flats',
    title: 'Granny Flats',
    priceRange: '$170k-$400k',
    averagePrice: 285000,
    depositRequired: 57000, // 20%
    yield: '-9%',
    cashFlow: 'Positive',
    riskLevel: 'Medium',
  },
  {
    id: 'villas-townhouses',
    title: 'Villas / Townhouses',
    priceRange: '$250k-$400k',
    averagePrice: 325000,
    depositRequired: 65000, // 20%
    yield: '6-8%',
    cashFlow: 'Negative',
    riskLevel: 'High',
  },
  {
    id: 'units-apartments',
    title: 'Units / Apartments',
    priceRange: '$250k-$450k',
    averagePrice: 350000,
    depositRequired: 70000, // 20%
    yield: '6-8%',
    cashFlow: 'Neutral → Positive',
    riskLevel: 'High',
  },
  {
    id: 'houses-regional',
    title: 'Houses (Regional)',
    priceRange: '$250k-$450k',
    averagePrice: 350000,
    depositRequired: 70000, // 20%
    yield: '6-8%',
    cashFlow: 'Neutral → Positive',
    riskLevel: 'Medium',
  },
  {
    id: 'duplexes',
    title: 'Duplexes',
    priceRange: '$250k-$450k',
    averagePrice: 400000,
    depositRequired: 80000, // 20%
    yield: '6-8%',
    cashFlow: 'Neutral → Positive',
    riskLevel: 'Medium',
  },
  {
    id: 'metro-houses',
    title: 'Metro Houses',
    priceRange: '$600k-$800k',
    averagePrice: 700000,
    depositRequired: 140000, // 20%
    yield: '4-5%',
    cashFlow: 'Negative',
    riskLevel: 'Medium-Low',
  },
  {
    id: 'commercial-retail',
    title: 'Commercial Retail',
    priceRange: '$400k-$1.2M',
    averagePrice: 800000,
    depositRequired: 160000, // 20%
    yield: '7-9%',
    cashFlow: 'Positive',
    riskLevel: 'High',
  },
  {
    id: 'office-space',
    title: 'Office Space',
    priceRange: '$500k-$2M',
    averagePrice: 1250000,
    depositRequired: 250000, // 20%
    yield: '6-8%',
    cashFlow: 'Positive',
    riskLevel: 'Very High',
  },
  {
    id: 'industrial-units',
    title: 'Industrial Units',
    priceRange: '$350k-$1.5M',
    averagePrice: 925000,
    depositRequired: 185000, // 20%
    yield: '7-10%',
    cashFlow: 'Positive',
    riskLevel: 'High',
  },
];

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
  const [selections, setSelections] = useState<PropertySelection>({});

  // Calculate portfolio totals
  const calculations = useMemo((): PortfolioCalculations => {
    let totalProperties = 0;
    let totalCost = 0;
    let totalDepositRequired = 0;

    Object.entries(selections).forEach(([propertyId, quantity]) => {
      const property = PROPERTY_TYPES.find(p => p.id === propertyId);
      if (property && quantity > 0) {
        totalProperties += quantity;
        totalCost += property.averagePrice * quantity;
        totalDepositRequired += property.depositRequired * quantity;
      }
    });

    const totalLoanAmount = totalCost - totalDepositRequired;

    return {
      totalProperties,
      totalCost,
      totalDepositRequired,
      totalLoanAmount,
    };
  }, [selections]);

  // Check financial feasibility against available funds
  const checkFeasibility = (availableDeposit: number, borrowingCapacity: number): FeasibilityChecks => {
    const hasAdequateDeposit = calculations.totalDepositRequired <= availableDeposit;
    const withinBorrowingCapacity = calculations.totalLoanAmount <= borrowingCapacity;
    const overallFeasible = hasAdequateDeposit && withinBorrowingCapacity;

    return {
      hasAdequateDeposit,
      withinBorrowingCapacity,
      overallFeasible,
    };
  };

  const updatePropertyQuantity = (propertyId: string, quantity: number) => {
    setSelections(prev => ({
      ...prev,
      [propertyId]: Math.max(0, quantity), // Ensure non-negative
    }));
  };

  const incrementProperty = (propertyId: string) => {
    setSelections(prev => ({
      ...prev,
      [propertyId]: (prev[propertyId] || 0) + 1,
    }));
  };

  const decrementProperty = (propertyId: string) => {
    setSelections(prev => ({
      ...prev,
      [propertyId]: Math.max(0, (prev[propertyId] || 0) - 1),
    }));
  };

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
    propertyTypes: PROPERTY_TYPES,
  };

  return (
    <PropertySelectionContext.Provider value={value}>
      {children}
    </PropertySelectionContext.Provider>
  );
};