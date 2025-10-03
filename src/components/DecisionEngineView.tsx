import React, { useMemo } from 'react';
import { useAffordabilityCalculator } from '@/hooks/useAffordabilityCalculator';
import { useInvestmentProfile } from '@/hooks/useInvestmentProfile';
import { useDataAssumptions } from '@/contexts/DataAssumptionsContext';
import { AffordabilityBreakdownTable } from './AffordabilityBreakdownTable';
import type { YearBreakdownData } from '@/hooks/useAffordabilityBreakdown';

export const DecisionEngineView: React.FC = () => {
  const { timelineProperties } = useAffordabilityCalculator();
  const { profile } = useInvestmentProfile();
  const { globalFactors } = useDataAssumptions();

  // Transform TimelineProperty[] to YearBreakdownData[]
  const yearBreakdownData = useMemo((): YearBreakdownData[] => {
    if (!timelineProperties || timelineProperties.length === 0) {
      return [];
    }

    const baseYear = 2025;
    const interestRate = parseFloat(globalFactors.interestRate) / 100;
    const lvrRatio = parseFloat(globalFactors.loanToValueRatio) / 100;
    
    // Create a map of years to properties for quick lookup
    const propertyByYear = new Map<number, typeof timelineProperties[0]>();
    timelineProperties.forEach(prop => {
      propertyByYear.set(prop.affordableYear, prop);
    });

    // Generate year-by-year breakdown
    const years: YearBreakdownData[] = [];
    const startYear = Math.min(...timelineProperties.map(p => p.affordableYear));
    const endYear = Math.max(...timelineProperties.map(p => p.affordableYear));

    for (let year = startYear; year <= endYear; year++) {
      const property = propertyByYear.get(year);
      const propertyIndex = property ? property.propertyIndex + 1 : null;
      
      if (property) {
        // Calculate rental recognition based on portfolio size
        const portfolioSize = propertyIndex || 1;
        let rentalRecognition = 0.75;
        if (portfolioSize <= 2) rentalRecognition = 0.75;
        else if (portfolioSize <= 4) rentalRecognition = 0.70;
        else rentalRecognition = 0.65;

        // Calculate basic metrics
        const totalDebt = property.portfolioValueAfter - property.totalEquityAfter;
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

        const yearData: YearBreakdownData = {
          year,
          displayYear: year - baseYear,
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
          cumulativeSavings: profile.annualSavings * (year - baseYear),
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
