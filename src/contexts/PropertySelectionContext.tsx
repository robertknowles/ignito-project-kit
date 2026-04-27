import React, { createContext, useContext, useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useDataAssumptions } from './DataAssumptionsContext';
import { useClient } from './ClientContext';
import type { PropertyInstanceDetails } from '../types/propertyInstance';
import { GROWTH_RATE_TIERS } from '../constants/financialParams';

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

// Extended CustomPropertyBlock interface with all PropertyInstanceDetails fields
export interface CustomPropertyBlock extends Partial<PropertyInstanceDetails> {
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

// =============================================================================
// EVENT BLOCK TYPES - For Custom Events System
// =============================================================================

export type EventCategory = 'income' | 'portfolio' | 'life' | 'market';

export type EventType = 
  // Income events
  | 'salary_change' 
  | 'partner_income_change' 
  | 'bonus_windfall'
  // Portfolio events  
  | 'sell_property' 
  | 'refinance' 
  | 'renovate'
  // Life events
  | 'inheritance' 
  | 'major_expense' 
  | 'dependent_change'
  // Market events
  | 'interest_rate_change' 
  | 'market_correction';

export interface EventPayload {
  // Income events
  newSalary?: number;
  previousSalary?: number;
  newPartnerSalary?: number;
  previousPartnerSalary?: number;
  bonusAmount?: number;
  
  // Portfolio events
  propertyInstanceId?: string;
  salePrice?: number;
  newInterestRate?: number;
  previousInterestRate?: number;
  renovationCost?: number;
  valueIncrease?: number;
  
  // Life events
  cashAmount?: number;        // For inheritance/expense
  dependentChange?: number;   // +1 or -1
  
  // Market events
  rateChange?: number;        // e.g., +0.5 (percentage points)
  growthAdjustment?: number;  // e.g., -3 (percentage points)
  durationPeriods?: number;   // How long effect lasts (in periods)
}

export interface EventBlock {
  id: string;
  type: 'event';
  eventType: EventType;
  category: EventCategory;
  period: number;           // When event occurs (1, 2, 3... = period number)
  order: number;            // Position in timeline sequence (for interleaving with properties/pauses)
  payload: EventPayload;    // Event-specific data
  label?: string;           // Optional custom label for display
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
  setPropertyOrder: (order: string[]) => void;
  
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
  
  // Event block management - Custom Events System
  eventBlocks: EventBlock[];
  addEvent: (event: Omit<EventBlock, 'id'>) => void;
  removeEvent: (eventId: string) => void;
  updateEvent: (eventId: string, updates: Partial<EventBlock>) => void;
  getEventCount: () => number;
  getEventsAtPeriod: (period: number) => EventBlock[];
  getEventsUpToPeriod: (period: number) => EventBlock[];
  
  // Client switching - load all data for a client
  loadClientData: (clientId: number) => void;
  
  // Bulk setters for scenario restoration
  setAllSelections: (selections: PropertySelection, propertyOrder: string[]) => void;
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
  const [eventBlocks, setEventBlocks] = useState<EventBlock[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // Property order tracking - stores instance IDs in the order they were added
  const [propertyOrder, setPropertyOrder] = useState<string[]>([]);
  // Ref to track pending quantity changes to avoid stale closure issues with rapid clicks
  const pendingQuantityRef = useRef<Record<string, number>>({});
  const { propertyTypeTemplates } = useDataAssumptions(); // Get profile-level templates from DataAssumptionsContext
  

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

  // Save event blocks to localStorage whenever they change
  useEffect(() => {
    if (activeClient?.id) {
      const eventBlocksStorageKey = `event_blocks_${activeClient.id}`;
      localStorage.setItem(eventBlocksStorageKey, JSON.stringify(eventBlocks));
    }
  }, [eventBlocks, activeClient?.id]);

  // Sync the pendingQuantityRef with actual selections state after each render
  // This ensures the ref stays in sync and handles cases like loading from localStorage
  useEffect(() => {
    pendingQuantityRef.current = { ...selections };
  }, [selections]);

  // Convert property type templates to property types for calculations
  const propertyTypes = useMemo(() => {
    // Predefined property types from templates (source of truth)
    const predefinedTypes = propertyTypeTemplates.map((template, index) => {
      const yieldPercent = (template.rentPerWeek * 52 / template.purchasePrice) * 100;
      const depositPercent = 100 - template.lvr;
      const growthTier = (template.growthAssumption || 'Medium') as keyof typeof GROWTH_RATES;
      const rates = GROWTH_RATE_TIERS[growthTier] || GROWTH_RATE_TIERS.Medium;
      
      return {
        id: `property_${index}`,
        title: template.propertyType,
        priceRange: `$${template.purchasePrice.toLocaleString()}`,
        yield: `${yieldPercent.toFixed(1)}%`,
        cashFlow: `$${Math.round((template.purchasePrice * yieldPercent / 100) / 12)}`,
        riskLevel: 'Medium' as const,
        cost: template.purchasePrice,
        depositRequired: Math.round((template.purchasePrice * depositPercent) / 100),
        yieldPercent: yieldPercent,
        growthPercent: rates.year1, // Use Year 1 growth rate for display
        state: template.state || 'NSW',
        loanType: template.loanProduct || 'IO',
        isCustom: false,
      };
    });

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
  }, [propertyTypeTemplates, customBlocks]);

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

  // =============================================================================
  // EVENT BLOCK MANAGEMENT FUNCTIONS - Custom Events System
  // =============================================================================

  const addEvent = useCallback((event: Omit<EventBlock, 'id'>) => {
    const newEvent: EventBlock = {
      ...event,
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setEventBlocks(prev => [...prev, newEvent]);
  }, []);

  const removeEvent = useCallback((eventId: string) => {
    setEventBlocks(prev => prev.filter(e => e.id !== eventId));
  }, []);

  const updateEvent = useCallback((eventId: string, updates: Partial<EventBlock>) => {
    setEventBlocks(prev => prev.map(event => 
      event.id === eventId ? { ...event, ...updates } : event
    ));
  }, []);

  const getEventCount = useCallback(() => {
    return eventBlocks.length;
  }, [eventBlocks.length]);

  // Get all events that occur at a specific period
  const getEventsAtPeriod = useCallback((period: number): EventBlock[] => {
    return eventBlocks.filter(e => e.period === period);
  }, [eventBlocks]);

  // Get all events that occur at or before a specific period (for cumulative effects)
  const getEventsUpToPeriod = useCallback((period: number): EventBlock[] => {
    return eventBlocks
      .filter(e => e.period <= period)
      .sort((a, b) => a.period - b.period);
  }, [eventBlocks]);

  // Bulk setter for scenario restoration - sets selections and propertyOrder atomically
  const setAllSelections = useCallback((newSelections: PropertySelection, newPropertyOrder: string[]) => {
    setSelections({ ...newSelections });
    setPropertyOrder([...newPropertyOrder]);
    // Update pending ref to match new selections
    pendingQuantityRef.current = { ...newSelections };
  }, []);

  // Load all client data from localStorage
  const loadClientData = useCallback((clientId: number) => {
    setIsLoading(true);
    
    // Use setTimeout to ensure state updates happen in next tick
    // This prevents React batching issues
    setTimeout(() => {
      try {
        // Load property selections
        const storageKey = `property_selections_${clientId}`;
        const stored = localStorage.getItem(storageKey);
        
        if (stored) {
          const parsedSelections = JSON.parse(stored);
          setSelections(parsedSelections);
        } else {
          setSelections({});
        }
        
        // Load pause blocks
        const pauseStorageKey = `pause_blocks_${clientId}`;
        const storedPauses = localStorage.getItem(pauseStorageKey);
        if (storedPauses) {
          setPauseBlocks(JSON.parse(storedPauses));
        } else {
          setPauseBlocks([]);
        }
        
        // Load custom blocks
        const customBlocksStorageKey = `custom_blocks_${clientId}`;
        const storedCustomBlocks = localStorage.getItem(customBlocksStorageKey);
        if (storedCustomBlocks) {
          setCustomBlocks(JSON.parse(storedCustomBlocks));
        } else {
          setCustomBlocks([]);
        }
        
        // Load event blocks
        const eventBlocksStorageKey = `event_blocks_${clientId}`;
        const storedEventBlocks = localStorage.getItem(eventBlocksStorageKey);
        if (storedEventBlocks) {
          setEventBlocks(JSON.parse(storedEventBlocks));
        } else {
          setEventBlocks([]);
        }
        
        // Load property order
        const propertyOrderStorageKey = `property_order_${clientId}`;
        const storedPropertyOrder = localStorage.getItem(propertyOrderStorageKey);
        if (storedPropertyOrder) {
          setPropertyOrder(JSON.parse(storedPropertyOrder));
        } else {
          // If no property order exists, reconstruct from selections for backwards compatibility
          const parsedSelections = stored ? JSON.parse(stored) : {};
          const reconstructedOrder: string[] = [];
          Object.entries(parsedSelections).forEach(([propertyId, quantity]) => {
            for (let i = 0; i < (quantity as number); i++) {
              reconstructedOrder.push(`${propertyId}_instance_${i}`);
            }
          });
          setPropertyOrder(reconstructedOrder);
        }
      } catch (error) {
        setSelections({});
        setPauseBlocks([]);
        setCustomBlocks([]);
        setEventBlocks([]);
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
    setPropertyOrder,
    
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
    
    // Event block management - Custom Events System
    eventBlocks,
    addEvent,
    removeEvent,
    updateEvent,
    getEventCount,
    getEventsAtPeriod,
    getEventsUpToPeriod,
    
    // Client switching
    loadClientData,
    
    // Bulk setters for scenario restoration
    setAllSelections,
  };

  return (
    <PropertySelectionContext.Provider value={value}>
      {children}
    </PropertySelectionContext.Provider>
  );
};