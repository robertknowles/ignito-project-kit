import { useState, useCallback } from 'react';
import { DragStartEvent, DragEndEvent, DragOverEvent, DragCancelEvent } from '@dnd-kit/core';
import { usePropertyInstance } from '@/contexts/PropertyInstanceContext';

/**
 * Information about the property currently being dragged
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
 * Hook to manage drag-and-drop state for property icons on the chart.
 * Coordinates with PropertyInstanceContext for manual placement tracking.
 */
export const usePropertyDragDrop = () => {
  const { updateInstance, getInstance } = usePropertyInstance();
  
  // Currently dragged property
  const [draggedProperty, setDraggedProperty] = useState<DraggedProperty | null>(null);
  
  // Period currently being hovered over during drag
  const [targetPeriod, setTargetPeriod] = useState<number | null>(null);
  
  // Whether a drag operation is in progress
  const [isDragging, setIsDragging] = useState(false);

  /**
   * Called when a drag operation starts
   */
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const propertyData = active.data.current as DraggedProperty;
    
    if (propertyData) {
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

    // Update the property instance with the new manual placement
    const propertyData = active.data.current as DraggedProperty;
    
    if (propertyData && propertyData.instanceId) {
      // Get current instance to preserve existing data
      const currentInstance = getInstance(propertyData.instanceId);
      
      if (currentInstance) {
        // Update with manual placement data
        updateInstance(propertyData.instanceId, {
          isManuallyPlaced: true,
          manualPlacementPeriod: newPeriod,
        });
        
        console.log(`Property ${propertyData.instanceId} manually placed at period ${newPeriod}`);
      }
    }

    // Reset drag state
    setDraggedProperty(null);
    setTargetPeriod(null);
    setIsDragging(false);
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

  return {
    // State
    draggedProperty,
    targetPeriod,
    isDragging,
    
    // Event handlers for DndContext
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    
    // Utility functions
    resetManualPlacement,
    isManuallyPlaced,
    getManualPlacementPeriod,
  };
};
