import { useState, useEffect, useMemo } from 'react';
import { InvestmentProfileData, CalculatedValues } from './useInvestmentProfile';
import { PropertyType, PropertySelection, PortfolioCalculations } from './usePropertySelection';

// Core data structures for simulation results
export interface InvestmentTimelineItem {
  year: number;
  quarter: string;
  propertyType: string;
  purchasePrice: number;
  depositUsed: number;
  fundingSource: string;
  newLoanAmount: number;
  portfolioValueAfter: number;
  totalEquityAfter: number;
  cashflowImpact: number;
  roleInPortfolio: string;
  feasibilityStatus: 'feasible' | 'delayed' | 'challenging';
}

export interface PortfolioProjection {
  year: number;
  portfolioValue: number;
  totalEquity: number;
  totalIncome: number;
  totalExpenses: number;
  netCashflow: number;
}

export interface PortfolioSummary {
  finalPortfolioValue: number;
  totalEquityAchieved: number;
  numberOfProperties: number;
  finalAnnualCashflow: number;
  totalCashRequired: number;
  yearsToAchieveGoals: number;
  overallFeasibility: 'feasible' | 'delayed' | 'challenging';
}

export interface PropertyScore {
  propertyId: string;
  equityScore: number;
  cashflowScore: number;
  weightedScore: number;
}

export interface SimulationResults {
  timeline: InvestmentTimelineItem[];
  projections: PortfolioProjection[];
  summary: PortfolioSummary;
  propertyScores: PropertyScore[];
}

interface SimulationState {
  year: number;
  cash: number;
  portfolioValue: number;
  totalDebt: number;
  ownedProperties: { type: string; value: number; loan: number; yield: number }[];
}

export const useSimulationEngine = (
  profile: InvestmentProfileData,
  calculatedValues: CalculatedValues,
  selections: PropertySelection,
  propertyTypes: PropertyType[]
) => {
  const [simulationResults, setSimulationResults] = useState<SimulationResults | null>(null);

  const runSimulation = useMemo(() => {
    return (): SimulationResults => {
      // Debug selections at the start
      console.log('🔍 Simulation Debug:', {
        selectionsEntries: Object.entries(selections),
        hasSelections: Object.values(selections).some(q => q > 0),
        propertyTypesIds: propertyTypes.map(p => p.id)
      });

      // Check if any properties are selected
      const hasSelections = Object.values(selections).some(quantity => quantity > 0);
      console.log('🔍 Checking selections:', { selections, hasSelections });
      
      // Step 1: Calculate Starting Financial Position
      const startingEquity = calculatedValues.currentUsableEquity;
      const availableDeposit = calculatedValues.availableDeposit;

      // Step 2: Calculate Property Scores (for display purposes only)
      const propertyScores: PropertyScore[] = propertyTypes.map(property => {
        // Extract numeric values from strings
        const yieldValue = parseFloat(property.yield.replace('%', ''));
        const cashFlowValue = parseFloat(property.cashFlow.replace(/[$,]/g, ''));
        
        // Equity Score (0-100 based on property value and growth potential)
        const equityScore = Math.min(100, (property.averagePrice > 600000 ? 30 : 20) + (yieldValue * 5));
        
        // Cashflow Score (0-100 based on yield and cashflow impact)
        const cashflowScore = Math.min(100, (yieldValue * 15) + (cashFlowValue > 0 ? 30 : 0));
        
        // Weighted Score using equity/cashflow goals
        const weightedScore = (equityScore * profile.equityGrowth / 100) + (cashflowScore * profile.cashflow / 100);

        return {
          propertyId: property.id,
          equityScore,
          cashflowScore,
          weightedScore
        };
      });

      // Step 3: Create Property Queue from Agent's Selections
      const propertyQueue: PropertyType[] = [];
      Object.entries(selections).forEach(([propertyId, quantity]) => {
        const property = propertyTypes.find(p => p.id === propertyId);
        if (property && quantity > 0) {
          for (let i = 0; i < quantity; i++) {
            propertyQueue.push(property);
          }
        }
      });

      console.log('📋 Property queue created from selections:', {
        queueLength: propertyQueue.length,
        properties: propertyQueue.map(p => ({ title: p.title, id: p.id }))
      });

      // Helper functions for viability checks
      const usableEquityOf = (portfolioValue: number, totalDebt: number) => portfolioValue * 0.8 - totalDebt;
      
      const canAffordProperty = (cash: number, portfolioValue: number, totalDebt: number, property: PropertyType, borrowingCapacity: number) => {
        const usableEquity = usableEquityOf(portfolioValue, totalDebt);
        const availableFunding = cash + usableEquity;
        const loanAmount = property.averagePrice - property.depositRequired;
        
        const hasEnoughDeposit = availableFunding >= property.depositRequired;
        const withinBorrowingLimit = (totalDebt + loanAmount) <= borrowingCapacity;
        
        return hasEnoughDeposit && withinBorrowingLimit;
      };

      // Step 4: Initialize Simulation State
      let simulationState: SimulationState = {
        year: 0,
        cash: profile.depositPool,
        portfolioValue: profile.portfolioValue,
        totalDebt: profile.currentDebt,
        ownedProperties: []
      };

      const timeline: InvestmentTimelineItem[] = [];
      const projections: PortfolioProjection[] = [];
      let queueIndex = 0; // Track position in property queue

      // Add initial year projection (Year 0)
      const initialEquity = simulationState.portfolioValue * 0.8 - simulationState.totalDebt;
      const initialIncome = simulationState.ownedProperties.reduce((sum, prop) => 
        sum + (prop.value * prop.yield / 100), 0);
      const initialExpenses = simulationState.ownedProperties.reduce((sum, prop) => 
        sum + (prop.loan * 0.06), 0); // 6% interest rate

      projections.push({
        year: 0,
        portfolioValue: simulationState.portfolioValue,
        totalEquity: initialEquity,
        totalIncome: initialIncome,
        totalExpenses: initialExpenses,
        netCashflow: initialIncome - initialExpenses
      });

      // Step 5: Annual Simulation Loop
      for (let year = 0; year <= profile.timelineYears; year++) {
        // A. Growth Phase: Add savings and apply growth (skip for year 0)
        if (year > 0) {
          simulationState.cash += profile.annualSavings;
          simulationState.ownedProperties.forEach(property => {
            const growthRate = 0.07; // 7% annual growth
            property.value *= (1 + growthRate);
          });
          simulationState.portfolioValue = simulationState.ownedProperties.reduce((sum, prop) => sum + prop.value, 0) + profile.portfolioValue;
        }

        // B. Purchase Phase: Check if next property in queue is viable
        if (queueIndex < propertyQueue.length) {
          const nextProperty = propertyQueue[queueIndex];
          
          if (canAffordProperty(simulationState.cash, simulationState.portfolioValue, simulationState.totalDebt, nextProperty, profile.borrowingCapacity)) {
            // Can afford this property - purchase it
            const loanAmount = nextProperty.averagePrice - nextProperty.depositRequired;
            const usableEquity = usableEquityOf(simulationState.portfolioValue, simulationState.totalDebt);
            const fromCash = Math.min(simulationState.cash, nextProperty.depositRequired);
            const fromEquity = nextProperty.depositRequired - fromCash;
            
            // Update simulation state
            simulationState.cash -= fromCash;
            simulationState.portfolioValue += nextProperty.averagePrice;
            simulationState.totalDebt += loanAmount;
            simulationState.ownedProperties.push({
              type: nextProperty.title,
              value: nextProperty.averagePrice,
              loan: loanAmount,
              yield: parseFloat(nextProperty.yield.replace('%', ''))
            });

            // Determine funding source
            const fundingSource = fromEquity > 0 
              ? `$${(fromCash / 1000).toFixed(0)}k cash + $${(fromEquity / 1000).toFixed(0)}k equity`
              : 'Savings';

            // Determine feasibility status
            const borrowingUtilization = simulationState.totalDebt / profile.borrowingCapacity;
            const feasibilityStatus = borrowingUtilization >= 0.9 ? 'challenging' : 
                                    borrowingUtilization >= 0.8 ? 'delayed' : 'feasible';

            timeline.push({
              year,
              quarter: `Yr ${year}`,
              propertyType: nextProperty.title,
              purchasePrice: nextProperty.averagePrice,
              depositUsed: nextProperty.depositRequired,
              fundingSource,
              newLoanAmount: loanAmount,
              portfolioValueAfter: simulationState.portfolioValue,
              totalEquityAfter: usableEquityOf(simulationState.portfolioValue, simulationState.totalDebt),
              cashflowImpact: parseFloat(nextProperty.cashFlow.replace(/[$,]/g, '')),
              roleInPortfolio: queueIndex === 0 ? "Foundation" : queueIndex < 3 ? "Growth" : "Cashflow",
              feasibilityStatus
            });

            queueIndex++; // Move to next property in queue
          }
        }

        // C. Calculate Detailed Financials Per Year
        const usableEquity = usableEquityOf(simulationState.portfolioValue, simulationState.totalDebt);
        const annualIncome = simulationState.ownedProperties.reduce((sum, prop) => 
          sum + (prop.value * prop.yield / 100), 0);
        
        const interestRate = 0.06; // 6% interest rate
        const annualExpenses = simulationState.ownedProperties.reduce((sum, prop) => 
          sum + (prop.loan * interestRate), 0);

        projections.push({
          year,
          portfolioValue: simulationState.portfolioValue,
          totalEquity: usableEquity,
          totalIncome: annualIncome,
          totalExpenses: annualExpenses,
          netCashflow: annualIncome - annualExpenses
        });

        // Stop early if all properties in queue have been processed
        if (queueIndex >= propertyQueue.length) {
          break;
        }
      }

      // Step 6: Calculate Final Summary KPIs
      const finalUsableEquity = usableEquityOf(simulationState.portfolioValue, simulationState.totalDebt);
      const borrowingUtilization = simulationState.totalDebt / profile.borrowingCapacity;
      const totalCashRequired = timeline.reduce((sum, item) => sum + item.depositUsed, 0);

      let overallFeasibility: 'feasible' | 'delayed' | 'challenging' = 'feasible';
      if (borrowingUtilization >= 0.9) {
        overallFeasibility = 'challenging';
      } else if (borrowingUtilization >= 0.8) {
        overallFeasibility = 'delayed';
      }

      const finalProjection = projections[projections.length - 1] || {
        portfolioValue: simulationState.portfolioValue,
        totalEquity: finalUsableEquity,
        netCashflow: 0
      };

      const summary: PortfolioSummary = {
        finalPortfolioValue: finalProjection.portfolioValue,
        totalEquityAchieved: finalProjection.totalEquity,
        numberOfProperties: simulationState.ownedProperties.length,
        finalAnnualCashflow: finalProjection.netCashflow,
        totalCashRequired,
        yearsToAchieveGoals: timeline.length > 0 ? Math.max(...timeline.map(t => t.year)) + 1 : 0,
        overallFeasibility
      };

      console.log('📊 Simulation completed:', {
        portfolioValue: simulationState.portfolioValue,
        propertiesOwned: simulationState.ownedProperties.length,
        propertiesInQueue: propertyQueue.length,
        propertiesPurchased: queueIndex,
        projections: projections.length,
        timeline: timeline.length
      });

      const results = {
        timeline,
        projections,
        summary,
        propertyScores
      };

      console.log('📊 Final simulation results:', {
        hasTimeline: timeline.length > 0,
        hasProjections: projections.length > 0,
        summaryValues: summary,
        queueProcessed: `${queueIndex}/${propertyQueue.length}`
      });

      return results;
    };
  }, [profile, calculatedValues, selections, propertyTypes]);

  // Calculate selection count for dependency tracking
  const selectionCount = Object.values(selections).reduce((sum, qty) => sum + qty, 0);

  // Run simulation when inputs change
  useEffect(() => {
    console.log('🔄 Effect triggered - running simulation', { 
      selectionCount,
      depositPool: profile.depositPool,
      borrowingCapacity: profile.borrowingCapacity,
      propertyTypesLength: propertyTypes.length
    });
    const results = runSimulation();
    console.log('✅ Simulation results generated:', { 
      timelineLength: results.timeline.length,
      summaryValue: results.summary.finalPortfolioValue,
      projectionLength: results.projections.length
    });
    setSimulationResults(results);
  }, [profile.depositPool, profile.borrowingCapacity, selectionCount, propertyTypes.length, runSimulation]);

  return {
    simulationResults,
    runSimulation: () => {
      const results = runSimulation();
      setSimulationResults(results);
      return results;
    }
  };
};