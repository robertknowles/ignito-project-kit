import { useMemo } from 'react';
import { useInvestmentProfile } from './useInvestmentProfile';
import { useAffordabilityCalculator } from './useAffordabilityCalculator';
import { useDataAssumptions } from '../contexts/DataAssumptionsContext';

export interface PortfolioGrowthDataPoint {
  year: string;
  portfolioValue: number;
  equity: number;
  property?: string;
}

export interface CashflowDataPoint {
  year: string;
  cashflow: number;
  rentalIncome: number;
  loanRepayments: number;
  highlight?: boolean;
}

export const useChartDataGenerator = () => {
  const { profile } = useInvestmentProfile();
  const { timelineProperties } = useAffordabilityCalculator();
  const { globalFactors, getPropertyData } = useDataAssumptions();

  const portfolioGrowthData = useMemo((): PortfolioGrowthDataPoint[] => {
    const data: PortfolioGrowthDataPoint[] = [];
    const startYear = 2025;
    const endYear = startYear + profile.timelineYears;
    const growthRate = parseFloat(globalFactors.growthRate) / 100;

    // Create purchase schedule - when each property is bought (only feasible ones)
    const purchaseSchedule: { [year: number]: typeof timelineProperties } = {};
    const feasibleProperties = timelineProperties.filter(property => property.status === 'feasible');
    
    feasibleProperties.forEach(property => {
      if (!purchaseSchedule[property.affordableYear]) {
        purchaseSchedule[property.affordableYear] = [];
      }
      purchaseSchedule[property.affordableYear].push(property);
    });

    let cumulativePortfolioValue = profile.portfolioValue;
    let cumulativeDebt = profile.currentDebt;
    const ownedProperties: Array<{ cost: number; title: string; purchaseYear: number }> = [];

    for (let year = startYear; year <= endYear; year++) {
      // Add new purchases this year
      const purchasesThisYear = purchaseSchedule[year] || [];
      purchasesThisYear.forEach(purchase => {
        cumulativePortfolioValue += purchase.cost;
        cumulativeDebt += purchase.loanAmount;
        ownedProperties.push({
          cost: purchase.cost,
          title: purchase.title,
          purchaseYear: year
        });
      });

      // Apply growth to existing properties
      if (year > startYear) {
        // Grow existing portfolio
        if (profile.portfolioValue > 0) {
          const existingGrowth = profile.portfolioValue * growthRate;
          cumulativePortfolioValue += existingGrowth;
        }

        // Grow owned properties
        ownedProperties.forEach(property => {
          const yearsOwned = year - property.purchaseYear;
          if (yearsOwned > 0) {
            const propertyData = getPropertyData(property.title);
            const propertyGrowthRate = propertyData ? parseFloat(propertyData.growth) / 100 : growthRate;
            const growth = property.cost * propertyGrowthRate;
            cumulativePortfolioValue += growth;
            property.cost += growth; // Update cost for compound growth
          }
        });
      }

      // Calculate equity
      const equity = Math.max(0, cumulativePortfolioValue - cumulativeDebt);

      // Determine if there's a property purchase this year
      const propertyPurchased = purchasesThisYear.length > 0 ? purchasesThisYear[0].title : undefined;

      data.push({
        year: year.toString(),
        portfolioValue: Math.round(cumulativePortfolioValue),
        equity: Math.round(equity),
        property: propertyPurchased
      });
    }

    return data;
  }, [timelineProperties, profile, globalFactors, getPropertyData]);

  const cashflowData = useMemo((): CashflowDataPoint[] => {
    const data: CashflowDataPoint[] = [];
    const startYear = 2025;
    const endYear = startYear + profile.timelineYears;
    const interestRate = parseFloat(globalFactors.interestRate) / 100;

    // Create purchase schedule
    const purchaseSchedule: { [year: number]: typeof timelineProperties } = {};
    timelineProperties.forEach(property => {
      if (property.status === 'feasible') {
        if (!purchaseSchedule[property.affordableYear]) {
          purchaseSchedule[property.affordableYear] = [];
        }
        purchaseSchedule[property.affordableYear].push(property);
      }
    });

    const ownedProperties: Array<{ 
      cost: number; 
      title: string; 
      loanAmount: number; 
      purchaseYear: number 
    }> = [];

    for (let year = startYear; year <= endYear; year++) {
      // Add new purchases this year
      const purchasesThisYear = purchaseSchedule[year] || [];
      purchasesThisYear.forEach(purchase => {
        ownedProperties.push({
          cost: purchase.cost,
          title: purchase.title,
          loanAmount: purchase.loanAmount,
          purchaseYear: year
        });
      });

      // Calculate rental income and loan repayments
      let totalRentalIncome = 0;
      let totalLoanRepayments = 0;

      ownedProperties.forEach(property => {
        const yearsOwned = year - property.purchaseYear;
        if (yearsOwned >= 0) {
          const propertyData = getPropertyData(property.title);
          if (propertyData) {
            // Calculate current property value with growth
            const propertyGrowthRate = parseFloat(propertyData.growth) / 100;
            const currentValue = property.cost * Math.pow(1 + propertyGrowthRate, yearsOwned);
            
            // Calculate rental income (yield on current value)
            const yieldRate = parseFloat(propertyData.yield) / 100;
            totalRentalIncome += currentValue * yieldRate;
          }

          // Calculate loan repayments (interest only for simplicity)
          totalLoanRepayments += property.loanAmount * interestRate;
        }
      });

      const netCashflow = totalRentalIncome - totalLoanRepayments;

      data.push({
        year: year.toString(),
        cashflow: Math.round(netCashflow),
        rentalIncome: Math.round(totalRentalIncome),
        loanRepayments: Math.round(totalLoanRepayments),
        highlight: netCashflow >= 0 && year === startYear + Math.floor(profile.timelineYears / 2) // Highlight positive cashflow around mid-timeline
      });
    }

    return data;
  }, [timelineProperties, profile, globalFactors, getPropertyData]);

  return {
    portfolioGrowthData,
    cashflowData
  };
};