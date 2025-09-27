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

      // Step 2: Score & Rank All Properties
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

      // Sort properties by weighted score (highest first)
      const rankedProperties = propertyScores
        .sort((a, b) => b.weightedScore - a.weightedScore)
        .map(score => propertyTypes.find(p => p.id === score.propertyId)!)
        .filter(Boolean);

      // Step 3: Initial Portfolio Construction
      const selectedProperties = Object.entries(selections)
        .filter(([_, quantity]) => quantity > 0)
        .flatMap(([propertyId, quantity]) => {
          const property = propertyTypes.find(p => p.id === propertyId);
          console.log(`🔍 Property mapping:`, { 
            propertyId, 
            quantity, 
            found: !!property,
            propertyTitle: property?.title,
            riskLevel: property?.riskLevel 
          });
          return property ? Array(quantity).fill(property) : [];
        });

      console.log('📋 selectedProperties array populated:', {
        totalSelected: selectedProperties.length,
        properties: selectedProperties.map(p => ({ title: p.title, id: p.id, riskLevel: p.riskLevel }))
      });

      const initialTotalCost = selectedProperties.reduce((sum, prop) => sum + prop.averagePrice, 0);
      const initialTotalDeposit = selectedProperties.reduce((sum, prop) => sum + prop.depositRequired, 0);
      const initialTotalLoans = initialTotalCost - initialTotalDeposit;

      // Step 4: Annual Simulation Loop
      let simulationState: SimulationState = {
        year: 0,
        cash: profile.depositPool,
        portfolioValue: profile.portfolioValue,
        totalDebt: profile.currentDebt,
        ownedProperties: []
      };

      const timeline: InvestmentTimelineItem[] = [];
      const projections: PortfolioProjection[] = [];

      // Process initial selections first
      selectedProperties.forEach((property, index) => {
        const purchaseYear = Math.floor(index / 2); // Spread purchases over years
        const usableEquity = simulationState.portfolioValue * 0.8 - simulationState.totalDebt;
        const availableFunding = simulationState.cash + usableEquity;
        
        console.log(`🏠 Processing property ${index + 1}:`, {
          type: property.title,
          deposit: property.depositRequired,
          availableFunding,
          canAfford: availableFunding >= property.depositRequired
        });
        
        // Always add timeline item regardless of affordability
        const loanAmount = property.averagePrice - property.depositRequired;
        
        if (availableFunding >= property.depositRequired) {
          simulationState.portfolioValue += property.averagePrice;
          simulationState.totalDebt += loanAmount;
          simulationState.cash -= property.depositRequired;
          simulationState.ownedProperties.push({
            type: property.title,
            value: property.averagePrice,
            loan: loanAmount,
            yield: parseFloat(property.yield.replace('%', ''))
          });
        }

        // Determine funding source
        let fundingSource = "Savings";
        if (usableEquity > 0 && simulationState.cash < property.depositRequired) {
          const equityUsed = property.depositRequired - simulationState.cash;
          fundingSource = `$${(simulationState.cash / 1000).toFixed(0)}k savings + $${(equityUsed / 1000).toFixed(0)}k equity`;
        }

        timeline.push({
          year: purchaseYear,
          quarter: `Yr ${purchaseYear}`,
          propertyType: property.title,
          purchasePrice: property.averagePrice,
          depositUsed: property.depositRequired,
          fundingSource,
          newLoanAmount: loanAmount,
          portfolioValueAfter: simulationState.portfolioValue,
          totalEquityAfter: simulationState.portfolioValue * 0.8 - simulationState.totalDebt,
          cashflowImpact: parseFloat(property.cashFlow.replace(/[$,]/g, '')),
          roleInPortfolio: index === 0 ? "Foundation" : index < 3 ? "Growth" : "Cashflow",
          feasibilityStatus: availableFunding >= property.depositRequired * 1.2 ? 'feasible' : 
                           availableFunding >= property.depositRequired ? 'delayed' : 'challenging'
        });
      });

      // Continue simulation for remaining years
      for (let year = 1; year <= profile.timelineYears; year++) {
        // A. Growth Phase: Add savings and apply growth
        simulationState.cash += profile.annualSavings;
        simulationState.ownedProperties.forEach(property => {
          const growthRate = 0.05; // 5% annual growth
          property.value *= (1 + growthRate);
        });
        simulationState.portfolioValue = simulationState.ownedProperties.reduce((sum, prop) => sum + prop.value, 0);

        // B. Equity Phase: Recalculate usable equity
        const usableEquity = simulationState.portfolioValue * 0.8 - simulationState.totalDebt;
        const totalAvailable = simulationState.cash + usableEquity;

        // Step 5: Calculate Detailed Financials Per Year
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

        // C. Purchase Phase: Check for additional purchases from ranked list
        for (const property of rankedProperties) {
          if (totalAvailable >= property.depositRequired && simulationState.totalDebt + (property.averagePrice - property.depositRequired) <= profile.borrowingCapacity) {
            // Can afford this property - simulate purchase
            break; // Only one purchase per year for simplicity
          }
        }
      }

      // Step 6: Assess Feasibility & Risk
      const finalUsableEquity = simulationState.portfolioValue * 0.8 - simulationState.totalDebt;
      const borrowingUtilization = simulationState.totalDebt / profile.borrowingCapacity;
      const depositUtilization = initialTotalDeposit / availableDeposit;

      let overallFeasibility: 'feasible' | 'delayed' | 'challenging' = 'feasible';
      if (borrowingUtilization > 0.9 || depositUtilization > 0.9) {
        overallFeasibility = 'challenging';
      } else if (borrowingUtilization > 0.8 || depositUtilization > 0.8) {
        overallFeasibility = 'delayed';
      }

      // Step 7: Generate Final Summary KPIs
      const finalProjection = projections[projections.length - 1] || {
        portfolioValue: simulationState.portfolioValue,
        totalEquity: finalUsableEquity,
        netCashflow: 0
      };

      const summary: PortfolioSummary = {
        finalPortfolioValue: finalProjection.portfolioValue || 0,
        totalEquityAchieved: finalProjection.totalEquity || 0,
        numberOfProperties: simulationState.ownedProperties.length || 0,
        finalAnnualCashflow: finalProjection.netCashflow || 0,
        totalCashRequired: initialTotalDeposit || 0,
        yearsToAchieveGoals: timeline.length > 0 ? Math.max(...timeline.map(t => t.year)) + 1 : 0,
        overallFeasibility
      };

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
        selectedPropertiesProcessed: selectedProperties.length
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