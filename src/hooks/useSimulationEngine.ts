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

// Helper functions for eligibility
const usableEquityOf = (value:number, debt:number) => value*0.8 - debt;

const canBuy = (cash:number, value:number, debt:number, prop: PropertyType, cap:number) => {
  const ue = usableEquityOf(value, debt);
  const available = cash + ue;
  const loan = prop.averagePrice - prop.depositRequired;
  const withinDeposit = available >= prop.depositRequired;
  const withinCap = (debt + loan) <= cap;
  return { ok: withinDeposit && withinCap, available, loan };
};

const parsePct = (s: string) => {
  // "6-8%" -> 0.07 (midpoint), "4-5%" -> 0.045, "-9%" -> -0.09
  const nums = (s.match(/-?\d+(\.\d+)?/g) || []).map(Number);
  if (!nums.length) return 0;
  const avg = nums.reduce((a,b)=>a+b,0)/nums.length;
  return avg/100;
};

const impactFrom = (s: string): 'Positive'|'Neutral'|'Negative' =>
  /neg/i.test(s) ? 'Negative' : /pos/i.test(s) ? 'Positive' : 'Neutral';

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
        const yieldPct = property.yieldPct ?? (parseFloat(property.yield)/100 || parsePct(property.yield));
        const growthPct = property.growthRatePct ?? 0.07;
        const impactAdj = property.cashflowImpact === 'Positive' ? 20 : property.cashflowImpact === 'Negative' ? -20 : 0;

        const equityScore = Math.max(0, Math.min(100, (growthPct*100)*8));       // growth-weighted
        const cashflowScore = Math.max(0, Math.min(100, (yieldPct*100)*6 + impactAdj));

        const weightedScore =
          equityScore * (profile.equityGrowth/100) +
          cashflowScore * (profile.cashflow/100);

        return {
          propertyId: property.id,
          equityScore,
          cashflowScore,
          weightedScore
        };
      });

      // Step 3: Create Property Queue - treat as ordered queue to process
      const propertyQueue = Object.entries(selections)
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

      console.log('📋 Property queue populated:', {
        totalInQueue: propertyQueue.length,
        properties: propertyQueue.map(p => ({ title: p.title, id: p.id, riskLevel: p.riskLevel }))
      });

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

      // Add initial year projection (Year 0) - no properties yet
      projections.push({
        year: 0,
        portfolioValue: simulationState.portfolioValue,
        totalEquity: usableEquityOf(simulationState.portfolioValue, simulationState.totalDebt),
        totalIncome: 0,
        totalExpenses: 0,
        netCashflow: 0
      });

      // Continue simulation for remaining years or until queue is empty
      for (let year = 1; year <= profile.timelineYears && propertyQueue.length > 0; year++) {
        // A. Growth Phase: Add savings and apply growth
        simulationState.cash += profile.annualSavings;
        simulationState.ownedProperties.forEach(property => {
          const growthRate = 0.07; // TODO: pull from assumptions UI later
          property.value *= (1 + growthRate);
        });
        simulationState.portfolioValue = simulationState.ownedProperties.reduce((sum, prop) => sum + prop.value, 0);

        // B. Equity Phase: Recalculate usable equity
        const usableEquity = usableEquityOf(simulationState.portfolioValue, simulationState.totalDebt);
        const totalAvailable = simulationState.cash + usableEquity;

        // C. Purchase Phase: Process next property in queue
        if (propertyQueue.length > 0) {
          const nextProperty = propertyQueue[0]; // Get next property from queue
          const { ok, available, loan } = canBuy(simulationState.cash, simulationState.portfolioValue, simulationState.totalDebt, nextProperty, profile.borrowingCapacity);
          
          if (ok) {
            // Purchase is viable - proceed with purchase
            const ue = usableEquityOf(simulationState.portfolioValue, simulationState.totalDebt);
            const need = nextProperty.depositRequired;
            const fromCash = Math.min(simulationState.cash, need);
            const fromEquity = need - fromCash;

            // mutate state
            simulationState.cash -= fromCash;
            simulationState.totalDebt += loan;
            simulationState.portfolioValue += nextProperty.averagePrice;
            simulationState.ownedProperties.push({
              type: nextProperty.title, value: nextProperty.averagePrice, loan, yield: (nextProperty.yieldPct ?? parsePct(nextProperty.yield))*100
            });

            const postUE = usableEquityOf(simulationState.portfolioValue, simulationState.totalDebt);

            // feasibility color
            const borrowUtil = simulationState.totalDebt / profile.borrowingCapacity;
            const color = borrowUtil >= 0.9 ? 'challenging' : borrowUtil >= 0.8 ? 'delayed' : 'feasible';

            timeline.push({
              year,
              quarter: `Yr ${year}`,
              propertyType: nextProperty.title,
              purchasePrice: nextProperty.averagePrice,
              depositUsed: need,
              fundingSource: fromEquity > 0 ? `$${(fromCash/1000).toFixed(0)}k cash + $${(fromEquity/1000).toFixed(0)}k equity` : 'Savings',
              newLoanAmount: loan,
              portfolioValueAfter: simulationState.portfolioValue,
              totalEquityAfter: postUE,
              cashflowImpact: (nextProperty.cashflowImpact ?? impactFrom(nextProperty.cashFlow)) === 'Negative' ? -1 : 1,
              roleInPortfolio: 'Queued Purchase',
              feasibilityStatus: color as any
            });

            // Remove purchased property from queue
            propertyQueue.shift();
            console.log(`✅ Purchased ${nextProperty.title} in Year ${year}. Queue remaining: ${propertyQueue.length}`);
          } else {
            console.log(`⏳ ${nextProperty.title} not viable in Year ${year}. Available: $${available.toFixed(0)}, Need: $${nextProperty.depositRequired}`);
          }
        }

        // Step 5: Calculate Detailed Financials Per Year
        const annualIncome = simulationState.ownedProperties.reduce((sum, prop) => 
          sum + (prop.value * prop.yield / 100), 0);
        
        const interestRate = 0.06; // 6% interest rate
        const annualExpenses = simulationState.ownedProperties.reduce((sum, prop) => 
          sum + (prop.loan * interestRate), 0);

        projections.push({
          year,
          portfolioValue: simulationState.portfolioValue,
          totalEquity: usableEquityOf(simulationState.portfolioValue, simulationState.totalDebt),
          totalIncome: annualIncome,
          totalExpenses: annualExpenses,
          netCashflow: annualIncome - annualExpenses
        });
      }

      // Step 6: Assess Feasibility & Risk
      const finalUsableEquity = usableEquityOf(simulationState.portfolioValue, simulationState.totalDebt);
      const borrowingUtilization = simulationState.totalDebt / profile.borrowingCapacity;
      const totalCashRequired = timeline.reduce((sum, item) => sum + item.depositUsed, 0);

      // Overall feasibility color (align to Blue/Orange/Red)
      const borrowUtil = simulationState.totalDebt / profile.borrowingCapacity;
      const overallFeasibility = borrowUtil >= 0.9 ? 'challenging'
        : borrowUtil >= 0.8 ? 'delayed'
        : 'feasible';

      // Step 7: Generate Final Summary KPIs
      const finalProjection = projections[projections.length - 1] || {
        portfolioValue: simulationState.portfolioValue,
        totalEquity: finalUsableEquity,
        netCashflow: 0
      };

      const summary: PortfolioSummary = {
        finalPortfolioValue: finalProjection.portfolioValue || simulationState.portfolioValue,
        totalEquityAchieved: finalProjection.totalEquity || finalUsableEquity,
        numberOfProperties: simulationState.ownedProperties.length,
        finalAnnualCashflow: finalProjection.netCashflow || 0,
        totalCashRequired: totalCashRequired,
        yearsToAchieveGoals: timeline.length > 0 ? Math.max(...timeline.map(t => t.year)) + 1 : 0,
        overallFeasibility
      };

      console.log('After processing property queue:', {
        portfolioValue: simulationState.portfolioValue,
        propertiesOwned: simulationState.ownedProperties.length,
        remainingInQueue: propertyQueue.length,
        projectionsLength: projections.length,
        summary: summary
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
        queueProcessed: Object.values(selections).reduce((sum, qty) => sum + qty, 0) - propertyQueue.length
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