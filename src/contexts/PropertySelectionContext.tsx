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
  state?: string; // 'NSW', 'VIC', 'QLD', etc.
  loanType?: 'IO' | 'PI'; // Interest Only or Principal & Interest
  isCustom?: boolean; // Flag to identify custom blocks
}

export interface CustomPropertyBlock {
  id: string;
  title: string;
  cost: number;
  yieldPercent: number;
  lvr: number;
  loanType: 'IO' | 'PI';
  isCustom: true;
  growthPercent: number;
}

export interface PropertySelection {
  [propertyId: string]: number; // quantity of each property type
}

export interface PauseBlock {
  id: string;
  type: 'pause';
  duration: number; // Duration in years (0.5, 1, 1.5, 2, 3)
  order: number; // Sequence position in timeline
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
  isLoading: boolean;
  
  // Pause block management
  pauseBlocks: PauseBlock[];
  addPause: (duration?: number) => void;
  removePause: () => void;
  updatePauseDuration: (pauseId: string, duration: number) => void;
  getPauseCount: () => number;
  
  // Loan type management
  propertyLoanTypes: Record<string, 'IO' | 'PI'>;
  updateLoanType: (propertyId: string, loanType: 'IO' | 'PI') => void;
  
  // Custom block management
  customBlocks: CustomPropertyBlock[];
  addCustomBlock: (block: CustomPropertyBlock) => void;
  removeCustomBlock: (blockId: string) => void;
  updateCustomBlock: (blockId: string, updates: Partial<CustomPropertyBlock>) => void;
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
  const [pauseBlocks, setPauseBlocks] = useState<PauseBlock[]>([]);
  const [propertyLoanTypes, setPropertyLoanTypes] = useState<Record<string, 'IO' | 'PI'>>({});
  const [customBlocks, setCustomBlocks] = useState<CustomPropertyBlock[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { propertyAssumptions } = useDataAssumptions();

  // Load selections from localStorage on mount or when client changes
  useEffect(() => {
    if (activeClient?.id) {
      setIsLoading(true);
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
      
      // Load pause blocks
      const pauseStorageKey = `pause_blocks_${activeClient.id}`;
      const storedPauses = localStorage.getItem(pauseStorageKey);
      if (storedPauses) {
        try {
          setPauseBlocks(JSON.parse(storedPauses));
        } catch (error) {
          console.error('Failed to load pause blocks from localStorage:', error);
          setPauseBlocks([]);
        }
      } else {
        setPauseBlocks([]);
      }
      
      // Load loan types
      const loanTypeStorageKey = `property_loan_types_${activeClient.id}`;
      const storedLoanTypes = localStorage.getItem(loanTypeStorageKey);
      if (storedLoanTypes) {
        try {
          setPropertyLoanTypes(JSON.parse(storedLoanTypes));
        } catch (error) {
          console.error('Failed to load loan types from localStorage:', error);
          setPropertyLoanTypes({});
        }
      } else {
        setPropertyLoanTypes({});
      }
      
      // Load custom blocks
      const customBlocksStorageKey = `custom_blocks_${activeClient.id}`;
      const storedCustomBlocks = localStorage.getItem(customBlocksStorageKey);
      if (storedCustomBlocks) {
        try {
          setCustomBlocks(JSON.parse(storedCustomBlocks));
        } catch (error) {
          console.error('Failed to load custom blocks from localStorage:', error);
          setCustomBlocks([]);
        }
      } else {
        setCustomBlocks([]);
      }
      
      setIsLoading(false);
    }
  }, [activeClient?.id]);

  // Save selections to localStorage whenever they change
  useEffect(() => {
    if (activeClient?.id) {
      const storageKey = `property_selections_${activeClient.id}`;
      localStorage.setItem(storageKey, JSON.stringify(selections));
    }
  }, [selections, activeClient?.id]);

  // Save pause blocks to localStorage whenever they change
  useEffect(() => {
    if (activeClient?.id) {
      const pauseStorageKey = `pause_blocks_${activeClient.id}`;
      localStorage.setItem(pauseStorageKey, JSON.stringify(pauseBlocks));
    }
  }, [pauseBlocks, activeClient?.id]);

  // Save loan types to localStorage whenever they change
  useEffect(() => {
    if (activeClient?.id) {
      const loanTypeStorageKey = `property_loan_types_${activeClient.id}`;
      localStorage.setItem(loanTypeStorageKey, JSON.stringify(propertyLoanTypes));
    }
  }, [propertyLoanTypes, activeClient?.id]);

  // Save custom blocks to localStorage whenever they change
  useEffect(() => {
    if (activeClient?.id) {
      const customBlocksStorageKey = `custom_blocks_${activeClient.id}`;
      localStorage.setItem(customBlocksStorageKey, JSON.stringify(customBlocks));
    }
  }, [customBlocks, activeClient?.id]);

  // Convert data assumptions to property types for calculations
  const propertyTypes = useMemo(() => {
    // Predefined property types from assumptions
    const predefinedTypes = propertyAssumptions.map((assumption, index) => ({
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
      state: 'NSW', // Default to NSW for all properties
      // Use user's selected loan type, or fall back to assumption's loan type, or default to IO
      loanType: propertyLoanTypes[`property_${index}`] || assumption.loanType || 'IO',
      isCustom: false,
    }));

    // Custom property types
    const customTypes = customBlocks.map((block) => ({
      id: block.id,
      title: block.title,
      priceRange: `$${block.cost.toLocaleString()}`,
      yield: `${block.yieldPercent}%`,
      cashFlow: `$${Math.round((block.cost * block.yieldPercent) / 100 / 12)}`,
      riskLevel: 'Medium' as const,
      cost: block.cost,
      depositRequired: Math.round(block.cost * (1 - block.lvr / 100)),
      yieldPercent: block.yieldPercent,
      growthPercent: block.growthPercent,
      state: 'NSW', // Default to NSW for custom properties
      loanType: propertyLoanTypes[block.id] || block.loanType,
      isCustom: true,
    }));

    return [...predefinedTypes, ...customTypes];
  }, [propertyAssumptions, propertyLoanTypes, customBlocks]);

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

  // Pause block management functions
  const addPause = useCallback((duration: number = 1) => {
    const totalItems = Object.values(selections).reduce((sum, qty) => sum + qty, 0) + pauseBlocks.length;
    const newPause: PauseBlock = {
      id: `pause-${Date.now()}`,
      type: 'pause',
      duration,
      order: totalItems,
    };
    setPauseBlocks(prev => [...prev, newPause]);
  }, [selections, pauseBlocks.length]);

  const removePause = useCallback(() => {
    if (pauseBlocks.length > 0) {
      setPauseBlocks(prev => prev.slice(0, -1));
    }
  }, [pauseBlocks.length]);

  const updatePauseDuration = useCallback((pauseId: string, duration: number) => {
    setPauseBlocks(prev => prev.map(p => 
      p.id === pauseId ? { ...p, duration } : p
    ));
  }, []);

  const getPauseCount = useCallback(() => {
    return pauseBlocks.length;
  }, [pauseBlocks.length]);

  // Update loan type for a property
  const updateLoanType = useCallback((propertyId: string, loanType: 'IO' | 'PI') => {
    setPropertyLoanTypes(prev => ({
      ...prev,
      [propertyId]: loanType,
    }));
    
    // Also update in custom blocks if it's a custom property
    setCustomBlocks(prev => prev.map(block => 
      block.id === propertyId ? { ...block, loanType } : block
    ));
  }, []);

  // Custom block management functions
  const addCustomBlock = useCallback((block: CustomPropertyBlock) => {
    setCustomBlocks(prev => [...prev, block]);
    
    // Initialize selection with quantity 0
    setSelections(prev => ({
      ...prev,
      [block.id]: 0,
    }));
  }, []);

  const removeCustomBlock = useCallback((blockId: string) => {
    setCustomBlocks(prev => prev.filter(b => b.id !== blockId));
    
    // Remove from selections
    setSelections(prev => {
      const newSelections = { ...prev };
      delete newSelections[blockId];
      return newSelections;
    });
    
    // Remove from loan types
    setPropertyLoanTypes(prev => {
      const newLoanTypes = { ...prev };
      delete newLoanTypes[blockId];
      return newLoanTypes;
    });
  }, []);

  const updateCustomBlock = useCallback((blockId: string, updates: Partial<CustomPropertyBlock>) => {
    setCustomBlocks(prev => prev.map(block => 
      block.id === blockId ? { ...block, ...updates } : block
    ));
  }, []);

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
    isLoading,
    
    // Pause block management
    pauseBlocks,
    addPause,
    removePause,
    updatePauseDuration,
    getPauseCount,
    
    // Loan type management
    propertyLoanTypes,
    updateLoanType,
    
    // Custom block management
    customBlocks,
    addCustomBlock,
    removeCustomBlock,
    updateCustomBlock,
  };

  return (
    <PropertySelectionContext.Provider value={value}>
      {children}
    </PropertySelectionContext.Provider>
  );
};