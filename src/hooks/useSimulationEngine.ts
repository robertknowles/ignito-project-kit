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

      // Sort properties by weighted score (highest first)
      const rankedProperties = propertyScores
        .sort((a, b) => b.weightedScore - a.weightedScore)
        .map(score => propertyTypes.find(p => p.id === score.propertyId)!)
        .filter(Boolean);

      // Cashflow-tolerance filter (before choosing)
      const allowNegativeCF = profile.equityGrowth >= 50;
      const filteredRanked = rankedProperties.filter(p => {
        const impact = p.cashflowImpact ?? impactFrom(p.cashFlow);
        if (!allowNegativeCF && impact === 'Negative') return false;
        return true;
      });

      // Step 3: Initial Portfolio Construction - treat as allowed pool
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

      // Continue simulation for remaining years
      for (let year = 1; year <= profile.timelineYears; year++) {
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

        // C. Purchase Phase: 1 purchase max per year
        let purchasedThisYear = false;
        for (const prop of filteredRanked) {
          if (!selectedProperties.some(sp => sp.id === prop.id)) continue; // only user-enabled
          const { ok, available, loan } = canBuy(simulationState.cash, simulationState.portfolioValue, simulationState.totalDebt, prop, profile.borrowingCapacity);
          if (!ok) continue;

          // funding split (use savings first, rest equity)
          const ue = usableEquityOf(simulationState.portfolioValue, simulationState.totalDebt);
          const need = prop.depositRequired;
          const fromCash = Math.min(simulationState.cash, need);
          const fromEquity = need - fromCash;

          // mutate state
          simulationState.cash -= fromCash;
          simulationState.totalDebt += loan;
          simulationState.portfolioValue += prop.averagePrice;
          simulationState.ownedProperties.push({
            type: prop.title, value: prop.averagePrice, loan, yield: (prop.yieldPct ?? parsePct(prop.yield))*100
          });

          const postUE = usableEquityOf(simulationState.portfolioValue, simulationState.totalDebt);

          // feasibility color
          const borrowUtil = simulationState.totalDebt / profile.borrowingCapacity;
          const depositBuffer = (simulationState.cash + postUE) / need; // rough buffer
          const color = borrowUtil >= 0.9 ? 'challenging' : borrowUtil >= 0.8 ? 'delayed' : 'feasible';

          timeline.push({
            year,
            quarter: `Yr ${year}`,
            propertyType: prop.title,
            purchasePrice: prop.averagePrice,
            depositUsed: need,
            fundingSource: fromEquity > 0 ? `$${(fromCash/1000).toFixed(0)}k cash + $${(fromEquity/1000).toFixed(0)}k equity` : 'Savings',
            newLoanAmount: loan,
            portfolioValueAfter: simulationState.portfolioValue,
            totalEquityAfter: postUE,
            cashflowImpact: (prop.cashflowImpact ?? impactFrom(prop.cashFlow)) === 'Negative' ? -1 : 1, // keep your field shape if needed
            roleInPortfolio: 'Auto-Selected',
            feasibilityStatus: color as any
          });

          purchasedThisYear = true;
          break;
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

      console.log('After processing all properties:', {
        portfolioValue: simulationState.portfolioValue,
        propertiesOwned: simulationState.ownedProperties.length,
        projectionsLength: projections.length,
        firstProjection: projections[0],
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