import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent, DragOverEvent, DragCancelEvent } from '@dnd-kit/core';
import { usePropertyInstance } from '@/contexts/PropertyInstanceContext';
import { getPropertyTypeIcon } from '@/utils/propertyTypeIcon';

// Period conversion constants (must match useAffordabilityCalculator)
const PERIODS_PER_YEAR = 2;

/**
 * Information about the property currently being dragged on the chart
 */
export interface DraggedProperty {
  instanceId: string;
  propertyId: string;
  title: string;
  currentPeriod: number;
  cost: number;
  depositRequired: number;
  loanAmount: number;
}

/**
 * Validation function type for checking if a property can be placed at a period
 */
export type PlacementValidator = (instanceId: string, period: number) => { isValid: boolean };

interface PropertyDragDropContextValue {
  // State
  draggedProperty: DraggedProperty | null;
  targetPeriod: number | null;
  isDragging: boolean;
  
  // Utility functions
  resetManualPlacement: (instanceId: string) => void;
  isManuallyPlaced: (instanceId: string) => boolean;
  getManualPlacementPeriod: (instanceId: string) => number | undefined;
  
  // Validation callback registration
  setPlacementValidator: (validator: PlacementValidator | null) => void;
}

const PropertyDragDropContext = createContext<PropertyDragDropContextValue | null>(null);

interface PropertyDragDropProviderProps {
  children: ReactNode;
}

export const PropertyDragDropProvider: React.FC<PropertyDragDropProviderProps> = ({ children }) => {
  const { updateInstance, getInstance } = usePropertyInstance();
  
  // Currently dragged property
  const [draggedProperty, setDraggedProperty] = useState<DraggedProperty | null>(null);
  
  // Period currently being hovered over during drag
  const [targetPeriod, setTargetPeriod] = useState<number | null>(null);
  
  // Whether a drag operation is in progress
  const [isDragging, setIsDragging] = useState(false);
  
  // Placement validator function (set by ChartWithRoadmap which has access to previewPlacementAtPeriod)
  const placementValidatorRef = useRef<PlacementValidator | null>(null);
  
  // Setter for the placement validator
  const setPlacementValidator = useCallback((validator: PlacementValidator | null) => {
    placementValidatorRef.current = validator;
  }, []);

  // Configure drag sensors with activation constraints
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum distance before drag starts
      },
    })
  );

  /**
   * Called when a drag operation starts
   */
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const propertyData = active.data.current as DraggedProperty;
    
    if (propertyData) {
      console.log(`[DragStart] Started dragging ${propertyData.title} from period ${propertyData.currentPeriod}`);
      setDraggedProperty(propertyData);
      setIsDragging(true);
    }
  }, []);

  /**
   * Called when dragging over a droppable area
   */
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    
    if (over) {
      // Extract period from droppable id (format: "period-{number}")
      const periodId = over.id as string;
      if (periodId.startsWith('period-')) {
        const period = parseInt(periodId.replace('period-', ''), 10);
        if (!isNaN(period)) {
          console.log(`[DragOver] Hovering over period ${period}`);
          setTargetPeriod(period);
        }
      }
    } else {
      setTargetPeriod(null);
    }
  }, []);

  /**
   * Called when a drag operation ends (drop or cancel)
   */
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !draggedProperty) {
      // Dropped outside valid target or no property was being dragged
      setDraggedProperty(null);
      setTargetPeriod(null);
      setIsDragging(false);
      return;
    }

    // Extract period from droppable id
    const periodId = over.id as string;
    if (!periodId.startsWith('period-')) {
      setDraggedProperty(null);
      setTargetPeriod(null);
      setIsDragging(false);
      return;
    }

    const newPeriod = parseInt(periodId.replace('period-', ''), 10);
    if (isNaN(newPeriod)) {
      setDraggedProperty(null);
      setTargetPeriod(null);
      setIsDragging(false);
      return;
    }

    const propertyData = active.data.current as DraggedProperty;
    
    // CRITICAL: Reset drag state BEFORE updating instance to prevent useEffect infinite loops
    // The validation useEffect in ChartWithRoadmap watches isDragging + targetPeriod + validatePlacementAtPeriod
    // If we update instance while isDragging is true, the timeline recalculates, which triggers
    // validatePlacementAtPeriod to change, which triggers the useEffect, causing an infinite loop.
    // By clearing drag state first, the useEffect sees isDragging=false and skips validation.
    setDraggedProperty(null);
    setTargetPeriod(null);
    setIsDragging(false);
    
    if (propertyData && propertyData.instanceId) {
      // Update property with manual placement data
      const currentInstance = getInstance(propertyData.instanceId);
      
      if (currentInstance) {
        // Determine the BEST period within the year to place the property
        // The droppable column represents a whole year, but we need to find
        // which half (H1 or H2) the property can actually be afforded in.
        const yearStartPeriod = Math.floor((newPeriod - 1) / PERIODS_PER_YEAR) * PERIODS_PER_YEAR + 1;
        const yearEndPeriod = yearStartPeriod + 1; // H2 of the same year
        
        let finalPeriod = newPeriod;
        
        // If we have a validator, use it to find the valid period
        if (placementValidatorRef.current) {
          const validator = placementValidatorRef.current;
          const resultH1 = validator(propertyData.instanceId, yearStartPeriod);
          const resultH2 = validator(propertyData.instanceId, yearEndPeriod);
          
          if (resultH1.isValid && resultH2.isValid) {
            // Both valid - prefer H1 (earlier in the year)
            finalPeriod = yearStartPeriod;
          } else if (resultH1.isValid) {
            finalPeriod = yearStartPeriod;
          } else if (resultH2.isValid) {
            finalPeriod = yearEndPeriod;
          } else {
            // Neither valid - still place at the dropped period (user explicitly chose this year)
            // The guardrails will show the violation
            finalPeriod = newPeriod;
          }
          
          console.log(`[DragEnd] Year validation: H1(${yearStartPeriod})=${resultH1.isValid}, H2(${yearEndPeriod})=${resultH2.isValid}, using period ${finalPeriod}`);
        }
        
        updateInstance(propertyData.instanceId, {
          isManuallyPlaced: true,
          manualPlacementPeriod: finalPeriod,
        });
        
        console.log(`Property ${propertyData.instanceId} manually placed at period ${finalPeriod}`);
      }
    }
  }, [draggedProperty, updateInstance, getInstance]);

  /**
   * Called when a drag operation is cancelled
   */
  const handleDragCancel = useCallback((event: DragCancelEvent) => {
    setDraggedProperty(null);
    setTargetPeriod(null);
    setIsDragging(false);
  }, []);

  /**
   * Reset manual placement for a property (return to auto-placement)
   */
  const resetManualPlacement = useCallback((instanceId: string) => {
    updateInstance(instanceId, {
      isManuallyPlaced: false,
      manualPlacementPeriod: undefined,
    });
    console.log(`Property ${instanceId} reset to auto-placement`);
  }, [updateInstance]);

  /**
   * Check if a property is manually placed
   */
  const isManuallyPlaced = useCallback((instanceId: string): boolean => {
    const instance = getInstance(instanceId);
    return instance?.isManuallyPlaced === true;
  }, [getInstance]);

  /**
   * Get the manual placement period for a property (if any)
   */
  const getManualPlacementPeriod = useCallback((instanceId: string): number | undefined => {
    const instance = getInstance(instanceId);
    return instance?.isManuallyPlaced ? instance.manualPlacementPeriod : undefined;
  }, [getInstance]);

  const contextValue: PropertyDragDropContextValue = {
    draggedProperty,
    targetPeriod,
    isDragging,
    resetManualPlacement,
    isManuallyPlaced,
    getManualPlacementPeriod,
    setPlacementValidator,
  };

  return (
    <PropertyDragDropContext.Provider value={contextValue}>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {children}
        
        {/* Drag Overlay - shows the dragged item while dragging */}
        <DragOverlay dropAnimation={null}>
          {draggedProperty && (
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-blue-500 opacity-80">
              {getPropertyTypeIcon(draggedProperty.title, 16, 'text-blue-600')}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </PropertyDragDropContext.Provider>
  );
};

export const usePropertyDragDropContext = (): PropertyDragDropContextValue => {
  const context = useContext(PropertyDragDropContext);
  if (!context) {
    throw new Error('usePropertyDragDropContext must be used within a PropertyDragDropProvider');
  }
  return context;
};
