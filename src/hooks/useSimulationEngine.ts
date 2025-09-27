import { useState, useEffect, useMemo } from 'react';
import { useInvestmentProfile } from './useInvestmentProfile';
import { usePropertySelection } from '../contexts/PropertySelectionContext';
import { useDataAssumptions } from '../contexts/DataAssumptionsContext';

export interface OwnedProperty {
  id: string;
  type: string;
  purchasePrice: number;
  currentValue: number;
  purchaseYear: number;
  yieldPercent: number;
  growthPercent: number;
  depositPaid: number;
  loanAmount: number;
}

export interface PropertyQueueItem {
  propertyId: string;
  quantity: number;
  processed: number;
}

export interface SimulationState {
  cashPool: number;
  ownedProperties: OwnedProperty[];
  totalDebt: number;
  currentYear: number;
  propertyQueue: PropertyQueueItem[];
}

export interface YearlyData {
  year: number;
  portfolioValue: number;
  totalEquity: number;
  cashflow: number;
  cashPool: number;
  totalDebt: number;
}

export interface TimelineEntry {
  year: number;
  propertyType: string;
  action: 'purchase' | 'pending';
  status: 'feasible' | 'delayed' | 'challenging';
  deposit: number;
  price: number;
}

export interface SimulationResults {
  timelineEntries: TimelineEntry[];
  yearlyData: YearlyData[];
  finalState: SimulationState;
}

export const useSimulationEngine = () => {
  const { profile } = useInvestmentProfile();
  const { selections, propertyTypes } = usePropertySelection();
  const { globalFactors } = useDataAssumptions();

  const [simulationResults, setSimulationResults] = useState<SimulationResults>({
    timelineEntries: [],
    yearlyData: [],
    finalState: {
      cashPool: 0,
      ownedProperties: [],
      totalDebt: 0,
      currentYear: 0,
      propertyQueue: [],
    }
  });

  // Create property queue from selections
  const propertyQueue = useMemo((): PropertyQueueItem[] => {
    const queue: PropertyQueueItem[] = [];
    Object.entries(selections).forEach(([propertyId, quantity]) => {
      if (quantity > 0) {
        queue.push({
          propertyId,
          quantity,
          processed: 0,
        });
      }
    });
    console.log('Property queue created:', queue);
    return queue;
  }, [selections]);

  // Run simulation
  const runSimulation = useMemo((): SimulationResults => {
    console.log('Starting simulation...');
    console.log('Initial profile:', profile);
    console.log('Property queue:', propertyQueue);
    console.log('Global factors:', globalFactors);

    // Initialize simulation state
    const initialState: SimulationState = {
      cashPool: profile.depositPool,
      ownedProperties: [],
      totalDebt: 0,
      currentYear: 0,
      propertyQueue: [...propertyQueue], // Copy array to avoid mutation
    };

    const yearlyData: YearlyData[] = [];
    const timelineEntries: TimelineEntry[] = [];
    let currentState = { ...initialState };

    console.log('Initial state:', currentState);

    // Yearly simulation loop
    for (let year = 1; year <= profile.timelineYears; year++) {
      console.log(`\n--- Processing Year ${year} ---`);
      
      // Update current year
      currentState.currentYear = year;
      
      // Add annual savings to cash pool
      currentState.cashPool += profile.annualSavings;
      console.log(`Added ${profile.annualSavings} annual savings. Cash pool: ${currentState.cashPool}`);

      // Apply growth rate to all owned properties
      currentState.ownedProperties.forEach(property => {
        const oldValue = property.currentValue;
        property.currentValue *= (1 + property.growthPercent / 100);
        console.log(`Property ${property.id} grew from ${oldValue} to ${property.currentValue}`);
      });

      // Process property queue (framework only - no purchase logic yet)
      currentState.propertyQueue.forEach(queueItem => {
        const remainingQuantity = queueItem.quantity - queueItem.processed;
        if (remainingQuantity > 0) {
          const propertyType = propertyTypes.find(p => p.id === queueItem.propertyId);
          if (propertyType) {
            console.log(`Queue item: ${propertyType.title}, remaining: ${remainingQuantity}`);
            
            // Add placeholder timeline entry for unprocessed properties
            timelineEntries.push({
              year: year,
              propertyType: propertyType.title,
              action: 'pending',
              status: 'feasible', // TODO: Add actual feasibility check
              deposit: propertyType.depositRequired,
              price: propertyType.cost,
            });
          }
        }
      });

      // Calculate yearly metrics
      const portfolioValue = currentState.ownedProperties.reduce(
        (total, property) => total + property.currentValue, 
        0
      );
      
      const totalEquity = portfolioValue - currentState.totalDebt;
      
      const cashflow = currentState.ownedProperties.reduce(
        (total, property) => total + (property.currentValue * property.yieldPercent / 100),
        0
      );

      const yearData: YearlyData = {
        year,
        portfolioValue,
        totalEquity,
        cashflow,
        cashPool: currentState.cashPool,
        totalDebt: currentState.totalDebt,
      };

      yearlyData.push(yearData);
      console.log(`Year ${year} data:`, yearData);
    }

    const results: SimulationResults = {
      timelineEntries,
      yearlyData,
      finalState: currentState,
    };

    console.log('Simulation completed. Results:', results);
    return results;
  }, [profile, propertyQueue, propertyTypes, globalFactors]);

  // Update results when simulation changes
  useEffect(() => {
    setSimulationResults(runSimulation);
  }, [runSimulation]);

  return {
    simulationResults,
    isSimulationComplete: simulationResults.yearlyData.length > 0,
  };
};