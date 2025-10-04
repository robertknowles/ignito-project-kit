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
    
    // Create a map of years to properties for quick lookup
    const propertyByYear = new Map<number, typeof timelineProperties[0]>();
    timelineProperties.forEach(prop => {
      propertyByYear.set(prop.affordableYear, prop);
    });

    // Generate year-by-year breakdown for purchase years only (calculator provides all needed data)
    const years: YearBreakdownData[] = [];

    timelineProperties.forEach(property => {
      const year = property.affordableYear;
      const yearIndex = year - baseYear;
      const propertyIndex = property.propertyIndex + 1;
      
      // Use data directly from calculator - no recalculation
      const lvr = property.portfolioValueAfter > 0 
        ? (property.totalDebtAfter / property.portfolioValueAfter) * 100 
        : 0;
      const dsr = property.grossRentalIncome > 0 
        ? (property.loanInterest / property.grossRentalIncome) * 100 
        : 0;

      const yearData: YearBreakdownData = {
        year,
        displayYear: yearIndex,
        status: property.status === 'feasible' ? 'purchased' :
                property.status === 'consolidation' ? 'consolidated' :
                property.status === 'waiting' ? 'waiting' :
                property.status === 'blocked' ? 'blocked' :
                property.status === 'challenging' ? 'blocked' :
                'purchased', // fallback
        propertyNumber: propertyIndex,
        propertyType: property.title,
        
        // Portfolio metrics (from calculator)
        portfolioValue: property.portfolioValueAfter,
        totalEquity: property.totalEquityAfter,
        totalDebt: property.totalDebtAfter,
        
        // Cash engine (from calculator)
        availableDeposit: property.availableFundsUsed,
        annualCashFlow: property.netCashflow,
        
        // Available funds breakdown (from calculator)
        baseDeposit: property.baseDeposit,
        cumulativeSavings: property.cumulativeSavings,
        cashflowReinvestment: property.cashflowReinvestment,
        equityRelease: property.equityRelease,
        
        // Cashflow components (from calculator)
        grossRental: property.grossRentalIncome,
        loanRepayments: property.loanInterest,
        expenses: property.expenses,
        
        // Requirements
        requiredDeposit: property.depositRequired,
        requiredLoan: property.loanAmount,
        propertyCost: property.cost,
        
        // Capacity (from calculator)
        availableBorrowingCapacity: property.borrowingCapacityRemaining,
        borrowingCapacity: profile.borrowingCapacity,
        
        // Assumptions (from calculator)
        interestRate: interestRate * 100,
        rentalRecognition: property.rentalRecognitionRate * 100,
        
        // Tests (from calculator)
        depositTest: {
          pass: property.depositTestPass,
          surplus: property.depositTestSurplus,
          available: property.availableFundsUsed,
          required: property.depositRequired,
        },
        
        serviceabilityTest: {
          pass: property.serviceabilityTestPass,
          surplus: property.serviceabilityTestSurplus,
          available: profile.borrowingCapacity,
          required: property.loanAmount,
        },
        
        // Flags (from calculator)
        gapRule: property.isGapRuleBlocked,
        equityReleaseYear: property.equityRelease > 0,
        
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
        portfolioScaling: propertyIndex,
        selfFundingEfficiency: property.cost > 0 ? (property.netCashflow / property.cost) * 100 : 0,
        equityRecyclingImpact: property.portfolioValueAfter > 0 ? (property.totalEquityAfter / property.portfolioValueAfter) * 100 : 0,
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
    });

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
