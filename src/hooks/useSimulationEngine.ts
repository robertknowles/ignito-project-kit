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

      // Process property queue with purchase logic
      for (let i = 0; i < currentState.propertyQueue.length; i++) {
        const queueItem = currentState.propertyQueue[i];
        const remainingQuantity = queueItem.quantity - queueItem.processed;
        
        if (remainingQuantity > 0) {
          const propertyType = propertyTypes.find(p => p.id === queueItem.propertyId);
          if (propertyType) {
            console.log(`\nEvaluating purchase: ${propertyType.title}, remaining: ${remainingQuantity}`);
            
            // Calculate usable equity: (total property value × 0.8) - totalDebt
            const totalPropertyValue = currentState.ownedProperties.reduce(
              (total, property) => total + property.currentValue, 
              0
            );
            const usableEquity = Math.max(0, (totalPropertyValue * 0.8) - currentState.totalDebt);
            
            // Calculate available deposit: cashPool + usableEquity
            const availableDeposit = currentState.cashPool + usableEquity;
            
            // Get property data from data assumptions
            const propertyData = propertyTypes.find(p => p.id === queueItem.propertyId);
            if (!propertyData) continue;
            
            // Calculate required deposit: property cost × (deposit % from data page)
            const requiredDeposit = propertyData.depositRequired;
            
            // Calculate required borrowing: property cost - required deposit
            const requiredBorrowing = propertyData.cost - requiredDeposit;
            
            console.log(`Financial check - Available deposit: ${availableDeposit}, Required: ${requiredDeposit}`);
            console.log(`Borrowing check - Current debt: ${currentState.totalDebt}, Required borrowing: ${requiredBorrowing}, Capacity: ${profile.borrowingCapacity}`);
            
            // Feasibility checks
            const hasAdequateDeposit = availableDeposit >= requiredDeposit;
            const withinBorrowingCapacity = (currentState.totalDebt + requiredBorrowing) <= profile.borrowingCapacity;
            const canPurchase = hasAdequateDeposit && withinBorrowingCapacity;
            
            if (canPurchase) {
              console.log(`✅ Purchase approved for ${propertyType.title}`);
              
              // Execute purchase
              const newProperty: OwnedProperty = {
                id: `${queueItem.propertyId}_${queueItem.processed + 1}`,
                type: propertyData.title,
                purchasePrice: propertyData.cost,
                currentValue: propertyData.cost,
                purchaseYear: year,
                yieldPercent: propertyData.yieldPercent,
                growthPercent: propertyData.growthPercent,
                depositPaid: requiredDeposit,
                loanAmount: requiredBorrowing,
              };
              
              // Add to owned properties
              currentState.ownedProperties.push(newProperty);
              
              // Deduct deposit from cash pool (use cash first, then equity)
              const cashUsed = Math.min(currentState.cashPool, requiredDeposit);
              const equityUsed = requiredDeposit - cashUsed;
              currentState.cashPool -= cashUsed;
              
              // Add loan to total debt
              currentState.totalDebt += requiredBorrowing;
              
              // Update queue
              queueItem.processed += 1;
              
              // Add successful purchase to timeline
              timelineEntries.push({
                year: year,
                propertyType: propertyType.title,
                action: 'purchase',
                status: 'feasible',
                deposit: requiredDeposit,
                price: propertyData.cost,
              });
              
              console.log(`Purchase completed - Cash used: ${cashUsed}, Equity used: ${equityUsed}, New debt: ${requiredBorrowing}`);
            } else {
              console.log(`❌ Purchase declined for ${propertyType.title}`);
              console.log(`Reason - Adequate deposit: ${hasAdequateDeposit}, Within capacity: ${withinBorrowingCapacity}`);
              
              // Add delayed/challenging entry to timeline
              let status: 'delayed' | 'challenging' = 'delayed';
              if (!withinBorrowingCapacity) {
                status = 'challenging';
              }
              
              timelineEntries.push({
                year: year,
                propertyType: propertyType.title,
                action: 'pending',
                status: status,
                deposit: requiredDeposit,
                price: propertyData.cost,
              });
            }
          }
        }
      }

      // Calculate yearly metrics
      const portfolioValue = currentState.ownedProperties.reduce(
        (total, property) => total + property.currentValue, 
        0
      );
      
      const totalEquity = portfolioValue - currentState.totalDebt;
      
      // Calculate rental income: property value × (yield % from data page / 100)
      const totalRentalIncome = currentState.ownedProperties.reduce(
        (total, property) => total + (property.currentValue * property.yieldPercent / 100),
        0
      );
      
      // Calculate loan repayments: loan amount × (interest rate from data page / 100)
      const interestRate = parseFloat(globalFactors.interestRate) / 100;
      const totalLoanRepayments = currentState.ownedProperties.reduce(
        (total, property) => total + (property.loanAmount * interestRate),
        0
      );
      
      // Track annual cashflow: total rental income - total loan repayments
      const cashflow = totalRentalIncome - totalLoanRepayments;

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
      console.log(`Rental income: ${totalRentalIncome}, Loan repayments: ${totalLoanRepayments}, Net cashflow: ${cashflow}`);
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