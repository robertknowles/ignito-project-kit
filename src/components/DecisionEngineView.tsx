import React, { useMemo } from 'react';
import { useAffordabilityCalculator } from '@/hooks/useAffordabilityCalculator';
import { useInvestmentProfile } from '@/hooks/useInvestmentProfile';
import { useDataAssumptions } from '@/contexts/DataAssumptionsContext';
import { AffordabilityBreakdownTable } from './AffordabilityBreakdownTable';
import type { YearBreakdownData } from '@/types/property';

export const DecisionEngineView: React.FC = () => {
  const { timelineProperties } = useAffordabilityCalculator();
  const { profile } = useInvestmentProfile();
  const { globalFactors } = useDataAssumptions();

  // Transform TimelineProperty[] to YearBreakdownData[]
  const yearBreakdownData = useMemo((): YearBreakdownData[] => {
    const baseYear = 2025;
    const interestRate = parseFloat(globalFactors.interestRate) / 100;
    const lvrRatio = parseFloat(globalFactors.loanToValueRatio) / 100;
    const growthRate = parseFloat(globalFactors.growthRate) / 100;
    
    // Create a map of years to properties for quick lookup
    const propertyByYear = new Map<number, typeof timelineProperties[0]>();
    timelineProperties.forEach(prop => {
      propertyByYear.set(prop.affordableYear, prop);
    });

    // Generate year-by-year breakdown for ALL years
    const years: YearBreakdownData[] = [];
    const endYear = baseYear + profile.timelineYears;
    
    // Track rolling state across years
    let rollingPortfolioValue = profile.portfolioValue;
    let rollingTotalDebt = profile.currentDebt;
    let rollingEquity = rollingPortfolioValue - rollingTotalDebt;
    let cumulativeSavings = 0;
    let cumulativeCashflow = 0;

    for (let year = baseYear; year <= endYear; year++) {
      const property = propertyByYear.get(year);
      const yearIndex = year - baseYear;
      const propertyIndex = property ? property.propertyIndex + 1 : null;
      
      // Update cumulative savings
      if (yearIndex > 0) {
        cumulativeSavings += profile.annualSavings;
      }
      
      // Grow existing portfolio
      if (yearIndex > 0 && rollingPortfolioValue > 0) {
        rollingPortfolioValue *= (1 + growthRate);
        rollingEquity = rollingPortfolioValue - rollingTotalDebt;
      }
      
      if (property) {
        // PURCHASE YEAR - Full details
        // Calculate rental recognition based on portfolio size
        const portfolioSize = propertyIndex || 1;
        let rentalRecognition = 0.75;
        if (portfolioSize <= 2) rentalRecognition = 0.75;
        else if (portfolioSize <= 4) rentalRecognition = 0.70;
        else rentalRecognition = 0.65;

        // Use calculated debt from calculator
        const totalDebt = property.totalDebtAfter || 0;
        const lvr = property.portfolioValueAfter > 0 
          ? (totalDebt / property.portfolioValueAfter) * 100 
          : 0;
        const dsr = totalDebt > 0 
          ? (property.loanAmount * interestRate) / (property.cost * 0.07) 
          : 0;

        // Estimate rental income and expenses
        const grossRental = property.cost * 0.07; // 7% yield estimate
        const loanRepayments = property.loanAmount * interestRate;
        const expenses = property.cost * 0.015; // 1.5% of property value
        const annualCashFlow = grossRental - loanRepayments - expenses;

        // Update rolling state with this purchase
        rollingPortfolioValue = property.portfolioValueAfter;
        rollingTotalDebt = totalDebt;
        rollingEquity = property.totalEquityAfter;
        cumulativeCashflow += annualCashFlow;

        const yearData: YearBreakdownData = {
          year,
          displayYear: yearIndex,
          status: property.isConsolidationPhase ? 'consolidated' : 'purchased',
          propertyNumber: propertyIndex,
          propertyType: property.title,
          
          // Portfolio metrics
          portfolioValue: property.portfolioValueAfter,
          totalEquity: property.totalEquityAfter,
          totalDebt,
          
          // Cash engine
          availableDeposit: property.availableFundsUsed,
          annualCashFlow,
          
          // Available funds breakdown
          baseDeposit: profile.depositPool,
          cumulativeSavings,
          cashflowReinvestment: annualCashFlow > 0 ? annualCashFlow : 0,
          equityRelease: property.availableFundsUsed - property.depositRequired,
          
          // Cashflow components
          grossRental,
          loanRepayments,
          expenses,
          
          // Requirements
          requiredDeposit: property.depositRequired,
          requiredLoan: property.loanAmount,
          propertyCost: property.cost,
          
          // Capacity
          availableBorrowingCapacity: profile.borrowingCapacity,
          borrowingCapacity: profile.borrowingCapacity,
          
          // Assumptions
          interestRate: interestRate * 100,
          rentalRecognition,
          
          // Tests
          depositTest: {
            pass: property.status === 'feasible',
            surplus: property.availableFundsUsed - property.depositRequired,
            available: property.availableFundsUsed,
            required: property.depositRequired,
          },
          
          serviceabilityTest: {
            pass: property.status === 'feasible',
            surplus: property.status === 'feasible' ? 50000 : -50000,
            available: profile.borrowingCapacity,
            required: property.loanAmount,
          },
          
          // Flags
          gapRule: true,
          equityReleaseYear: property.totalEquityAfter > 0,
          
          // Consolidation
          consolidation: property.consolidationDetails ? {
            triggered: true,
            eligible: true,
            consecutiveFailures: 0,
            propertiesSold: property.consolidationDetails.propertiesSold,
            equityFreed: property.consolidationDetails.equityFreed,
            debtReduced: property.consolidationDetails.debtReduced,
            newLvr: lvr,
          } : undefined,
          
          // Strategy metrics
          portfolioScaling: propertyIndex || 0,
          selfFundingEfficiency: annualCashFlow > 0 ? (annualCashFlow / property.cost) * 100 : 0,
          equityRecyclingImpact: property.totalEquityAfter > 0 ? (property.totalEquityAfter / property.portfolioValueAfter) * 100 : 0,
          dsr,
          lvr,
          
          // Breakdown details
          purchases: [{
            propertyId: property.id,
            propertyType: property.title,
            cost: property.cost,
            deposit: property.depositRequired,
            loanAmount: property.loanAmount,
            year,
          }],
        };

        years.push(yearData);
      } else {
        // NON-PURCHASE YEAR - Show rolling state and decision reasoning
        const usableEquity = Math.max(0, rollingEquity - (rollingPortfolioValue * 0.2)); // Keep 20% as buffer
        const availableDeposit = profile.depositPool + cumulativeSavings + cumulativeCashflow + usableEquity;
        
        // Estimate next property requirement (use average of properties or default)
        const avgPropertyCost = timelineProperties.length > 0 
          ? timelineProperties.reduce((sum, p) => sum + p.cost, 0) / timelineProperties.length 
          : 600000;
        const estimatedDeposit = avgPropertyCost * lvrRatio;
        const estimatedLoan = avgPropertyCost * (1 - lvrRatio);
        
        // Calculate portfolio cash flow from existing properties
        const portfolioCashFlow = rollingPortfolioValue > 0 ? rollingPortfolioValue * 0.02 : 0; // Rough 2% net yield
        cumulativeCashflow += portfolioCashFlow;
        
        // Determine status
        const depositPass = availableDeposit >= estimatedDeposit;
        const serviceabilityPass = profile.borrowingCapacity >= estimatedLoan;
        
        let status: 'waiting' | 'blocked' = 'waiting'; // waiting = building capacity, blocked = failed tests
        if (!depositPass || !serviceabilityPass) status = 'blocked';
        
        const yearData: YearBreakdownData = {
          year,
          displayYear: yearIndex,
          status,
          propertyNumber: null,
          propertyType: '-',
          
          // Portfolio metrics (rolling)
          portfolioValue: rollingPortfolioValue,
          totalEquity: rollingEquity,
          totalDebt: rollingTotalDebt,
          
          // Cash engine
          availableDeposit,
          annualCashFlow: portfolioCashFlow,
          
          // Available funds breakdown
          baseDeposit: profile.depositPool,
          cumulativeSavings,
          cashflowReinvestment: cumulativeCashflow,
          equityRelease: usableEquity,
          
          // Cashflow components
          grossRental: 0,
          loanRepayments: rollingTotalDebt * interestRate,
          expenses: 0,
          
          // Requirements (estimated for next property)
          requiredDeposit: estimatedDeposit,
          requiredLoan: estimatedLoan,
          propertyCost: avgPropertyCost,
          
          // Capacity
          availableBorrowingCapacity: profile.borrowingCapacity,
          borrowingCapacity: profile.borrowingCapacity,
          
          // Assumptions
          interestRate: interestRate * 100,
          rentalRecognition: 0.75,
          
          // Tests (against next property estimate)
          depositTest: {
            pass: depositPass,
            surplus: availableDeposit - estimatedDeposit,
            available: availableDeposit,
            required: estimatedDeposit,
          },
          
          serviceabilityTest: {
            pass: serviceabilityPass,
            surplus: profile.borrowingCapacity - estimatedLoan,
            available: profile.borrowingCapacity,
            required: estimatedLoan,
          },
          
          // Flags
          gapRule: false,
          equityReleaseYear: usableEquity > 0,
          
          // Strategy metrics
          portfolioScaling: 0,
          selfFundingEfficiency: 0,
          equityRecyclingImpact: rollingEquity > 0 && rollingPortfolioValue > 0 
            ? (rollingEquity / rollingPortfolioValue) * 100 
            : 0,
          dsr: 0,
          lvr: rollingPortfolioValue > 0 ? (rollingTotalDebt / rollingPortfolioValue) * 100 : 0,
          
          // Breakdown details
          purchases: [],
        };

        years.push(yearData);
      }
    }

    return years;
  }, [timelineProperties, profile, globalFactors]);

  return (
    <AffordabilityBreakdownTable 
      data={yearBreakdownData} 
      isCalculating={false}
      hasChanges={false}
    />
  );
};
