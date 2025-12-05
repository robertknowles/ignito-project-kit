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
  
  // Property order tracking - tracks the order in which properties were added
  propertyOrder: string[];
  
  // Pause block management
  pauseBlocks: PauseBlock[];
  addPause: (duration?: number) => void;
  removePause: () => void;
  updatePauseDuration: (pauseId: string, duration: number) => void;
  getPauseCount: () => number;
  
  // Custom block management
  customBlocks: CustomPropertyBlock[];
  addCustomBlock: (block: CustomPropertyBlock) => void;
  removeCustomBlock: (blockId: string) => void;
  updateCustomBlock: (blockId: string, updates: Partial<CustomPropertyBlock>) => void;
  
  // Client switching - load all data for a client
  loadClientData: (clientId: number) => void;
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
  const [customBlocks, setCustomBlocks] = useState<CustomPropertyBlock[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // Property order tracking - stores instance IDs in the order they were added
  const [propertyOrder, setPropertyOrder] = useState<string[]>([]);
  // Ref to track pending quantity changes to avoid stale closure issues with rapid clicks
  const pendingQuantityRef = useRef<Record<string, number>>({});
  const { propertyAssumptions } = useDataAssumptions(); // Get profile-level assumptions from DataAssumptionsContext

  // Disable auto-loading from localStorage - this is now handled by useClientSwitching hook
  // to prevent conflicts between individual context loading and unified scenario loading
  useEffect(() => {
    if (activeClient?.id) {
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

  // Save custom blocks to localStorage whenever they change
  useEffect(() => {
    if (activeClient?.id) {
      const customBlocksStorageKey = `custom_blocks_${activeClient.id}`;
      localStorage.setItem(customBlocksStorageKey, JSON.stringify(customBlocks));
    }
  }, [customBlocks, activeClient?.id]);

  // Save property order to localStorage whenever it changes
  useEffect(() => {
    if (activeClient?.id) {
      const propertyOrderStorageKey = `property_order_${activeClient.id}`;
      localStorage.setItem(propertyOrderStorageKey, JSON.stringify(propertyOrder));
    }
  }, [propertyOrder, activeClient?.id]);

  // Sync the pendingQuantityRef with actual selections state after each render
  // This ensures the ref stays in sync and handles cases like loading from localStorage
  useEffect(() => {
    pendingQuantityRef.current = { ...selections };
  }, [selections]);

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
      growthPercent: parseFloat(assumption.growthYear1), // Use Year 1 growth rate for display
      state: 'NSW', // Default to NSW for all properties
      // Loan type will be managed per-instance in the timeline
      loanType: assumption.loanType || 'IO',
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
      loanType: block.loanType,
      isCustom: true,
    }));

    return [...predefinedTypes, ...customTypes];
  }, [propertyAssumptions, customBlocks]);

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
    // Get the pending quantity (includes uncommitted updates from rapid clicks)
    // This avoids stale closure issues where selections hasn't updated yet
    const pendingQty = pendingQuantityRef.current[propertyId] ?? (selections[propertyId] || 0);
    const instanceId = `${propertyId}_instance_${pendingQty}`;
    
    // Update pending immediately (synchronous) to handle rapid clicks
    pendingQuantityRef.current[propertyId] = pendingQty + 1;
    
    // Update both states separately (React will batch these)
    setSelections(prev => ({
      ...prev,
      [propertyId]: (prev[propertyId] || 0) + 1,
    }));
    
    setPropertyOrder(prev => [...prev, instanceId]);
  }, [selections]);

  const decrementProperty = useCallback((propertyId: string) => {
    // Get the pending quantity (includes uncommitted updates from rapid clicks)
    const pendingQty = pendingQuantityRef.current[propertyId] ?? (selections[propertyId] || 0);
    if (pendingQty > 0) {
      const instanceIdToRemove = `${propertyId}_instance_${pendingQty - 1}`;
      
      // Update pending immediately (synchronous) to handle rapid clicks
      pendingQuantityRef.current[propertyId] = pendingQty - 1;
      
      setSelections(prev => ({
        ...prev,
        [propertyId]: Math.max(0, (prev[propertyId] || 0) - 1),
      }));
      
      setPropertyOrder(prev => {
        const lastIndex = prev.lastIndexOf(instanceIdToRemove);
        if (lastIndex !== -1) {
          return [...prev.slice(0, lastIndex), ...prev.slice(lastIndex + 1)];
        }
        return prev;
      });
    }
  }, [selections]);

  const getPropertyQuantity = (propertyId: string): number => {
    return selections[propertyId] || 0;
  };

  const resetSelections = () => {
    setSelections({});
    setPropertyOrder([]);
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

  const removePause = useCallback((pauseId?: string) => {
    if (pauseId) {
      // Remove specific pause by ID
      setPauseBlocks(prev => prev.filter(p => p.id !== pauseId));
    } else {
      // Remove last pause (for backward compatibility with strategy builder)
      if (pauseBlocks.length > 0) {
        setPauseBlocks(prev => prev.slice(0, -1));
      }
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
  }, []);

  const updateCustomBlock = useCallback((blockId: string, updates: Partial<CustomPropertyBlock>) => {
    setCustomBlocks(prev => prev.map(block => 
      block.id === blockId ? { ...block, ...updates } : block
    ));
  }, []);

  // Load all client data from localStorage
  const loadClientData = useCallback((clientId: number) => {
    console.log('PropertySelectionContext: Loading data for client', clientId);
    setIsLoading(true);
    
    // Use setTimeout to ensure state updates happen in next tick
    // This prevents React batching issues
    setTimeout(() => {
      try {
        // Load property selections
        const storageKey = `property_selections_${clientId}`;
        const stored = localStorage.getItem(storageKey);
        console.log('PropertySelectionContext: localStorage key:', storageKey);
        console.log('PropertySelectionContext: stored data:', stored);
        
        if (stored) {
          const parsedSelections = JSON.parse(stored);
          setSelections(parsedSelections);
          console.log('PropertySelectionContext: Loaded selections', parsedSelections);
        } else {
          setSelections({});
          console.log('PropertySelectionContext: No selections found, reset to empty');
        }
        
        // Load pause blocks
        const pauseStorageKey = `pause_blocks_${clientId}`;
        const storedPauses = localStorage.getItem(pauseStorageKey);
        if (storedPauses) {
          setPauseBlocks(JSON.parse(storedPauses));
          console.log('PropertySelectionContext: Loaded pause blocks');
        } else {
          setPauseBlocks([]);
        }
        
        // Load custom blocks
        const customBlocksStorageKey = `custom_blocks_${clientId}`;
        const storedCustomBlocks = localStorage.getItem(customBlocksStorageKey);
        if (storedCustomBlocks) {
          setCustomBlocks(JSON.parse(storedCustomBlocks));
          console.log('PropertySelectionContext: Loaded custom blocks');
        } else {
          setCustomBlocks([]);
        }
        
        // Load property order
        const propertyOrderStorageKey = `property_order_${clientId}`;
        const storedPropertyOrder = localStorage.getItem(propertyOrderStorageKey);
        if (storedPropertyOrder) {
          setPropertyOrder(JSON.parse(storedPropertyOrder));
          console.log('PropertySelectionContext: Loaded property order');
        } else {
          // If no property order exists, reconstruct from selections for backwards compatibility
          // This handles cases where data was saved before propertyOrder was introduced
          const parsedSelections = stored ? JSON.parse(stored) : {};
          const reconstructedOrder: string[] = [];
          Object.entries(parsedSelections).forEach(([propertyId, quantity]) => {
            for (let i = 0; i < (quantity as number); i++) {
              reconstructedOrder.push(`${propertyId}_instance_${i}`);
            }
          });
          setPropertyOrder(reconstructedOrder);
          console.log('PropertySelectionContext: Reconstructed property order from selections');
        }
        
        console.log('PropertySelectionContext: Finished loading client data for client', clientId);
      } catch (error) {
        console.error('PropertySelectionContext: Failed to load client data:', error);
        setSelections({});
        setPauseBlocks([]);
        setCustomBlocks([]);
        setPropertyOrder([]);
      } finally {
        setIsLoading(false);
      }
    }, 0);
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
    
    // Property order tracking
    propertyOrder,
    
    // Pause block management
    pauseBlocks,
    addPause,
    removePause,
    updatePauseDuration,
    getPauseCount,
    
    // Custom block management
    customBlocks,
    addCustomBlock,
    removeCustomBlock,
    updateCustomBlock,
    
    // Client switching
    loadClientData,
  };

  return (
    <PropertySelectionContext.Provider value={value}>
      {children}
    </PropertySelectionContext.Provider>
  );
};