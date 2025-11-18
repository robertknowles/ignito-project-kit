import { useMemo } from 'react';
import { useInvestmentProfile } from './useInvestmentProfile';
import { useAffordabilityCalculator } from './useAffordabilityCalculator';
import { useDataAssumptions } from '../contexts/DataAssumptionsContext';
import { calculatePortfolioMetrics, calculateExistingPortfolioMetrics, combineMetrics, DEFAULT_PROPERTY_EXPENSES } from '../utils/metricsCalculator';
import type { PropertyPurchase } from '../types/property';

export interface PortfolioGrowthDataPoint {
  year: string; // Year label for chart display
  portfolioValue: number;
  equity: number;
  properties?: string[]; // Array of property titles purchased this year
}

export interface CashflowDataPoint {
  year: string; // Year label for chart display
  cashflow: number;
  rentalIncome: number;
  loanRepayments: number;
  highlight?: boolean;
}

// Note: Charts display year-level aggregation for clarity
// Individual purchases happen at 6-month periods (H1/H2)
// but are aggregated to annual values for chart visualization

export const useChartDataGenerator = () => {
  const { profile } = useInvestmentProfile();
  const { timelineProperties } = useAffordabilityCalculator();
  const { globalFactors, getPropertyData } = useDataAssumptions();

  const portfolioGrowthData = useMemo((): PortfolioGrowthDataPoint[] => {
    const data: PortfolioGrowthDataPoint[] = [];
    const startYear = 2025;
    const endYear = startYear + profile.timelineYears;
    // DEPRECATED: No longer using globalFactors - each property uses its own template values
    const defaultGrowthRate = 0.06; // Default 6% for chart calculations
    const defaultInterestRate = 0.065; // Default 6.5% for chart calculations

    // Convert feasible properties to PropertyPurchase format
    const feasibleProperties = timelineProperties.filter(property => property.status === 'feasible');
    const purchases: PropertyPurchase[] = feasibleProperties.map(property => {
      const propertyData = getPropertyData(property.title);
      
      // Extract property-specific growth curve
      const propertyGrowthCurve = propertyData ? {
        year1: parseFloat(propertyData.growthYear1),
        years2to3: parseFloat(propertyData.growthYears2to3),
        year4: parseFloat(propertyData.growthYear4),
        year5plus: parseFloat(propertyData.growthYear5plus)
      } : profile.growthCurve; // Fallback to profile growth curve if no data
      
      return {
        year: property.affordableYear,
        cost: property.cost,
        loanAmount: property.loanAmount,
        depositRequired: property.depositRequired,
        title: property.title,
        rentalYield: propertyData ? parseFloat(propertyData.yield) / 100 : 0.04,
        growthRate: defaultGrowthRate, // DEPRECATED: kept for backward compatibility
        growthCurve: propertyGrowthCurve, // Use property-specific tiered growth rates
        interestRate: defaultInterestRate
      };
    });

    // Create purchase schedule for property display
    // Round affordableYear to nearest integer for chart grouping (2025.5 -> 2026, 2025.3 -> 2025)
    const purchaseSchedule: { [year: number]: PropertyPurchase[] } = {};
    purchases.forEach(purchase => {
      const chartYear = Math.round(purchase.year);
      if (!purchaseSchedule[chartYear]) {
        purchaseSchedule[chartYear] = [];
      }
      purchaseSchedule[chartYear].push(purchase);
    });

    for (let year = startYear; year <= endYear; year++) {
      // Calculate metrics for existing portfolio
      const existingMetrics = calculateExistingPortfolioMetrics(
        profile.portfolioValue,
        profile.currentDebt,
        year - startYear,
        defaultGrowthRate,
        profile.growthCurve,
        defaultInterestRate
      );

      // Calculate metrics for purchases made by this year
      const relevantPurchases = purchases.filter(p => p.year <= year);
      const newPurchasesMetrics = calculatePortfolioMetrics(
        relevantPurchases,
        year,
        defaultGrowthRate,
        profile.growthCurve,
        defaultInterestRate,
        DEFAULT_PROPERTY_EXPENSES
      );

      // Combine metrics
      const totalMetrics = combineMetrics(existingMetrics, newPurchasesMetrics);

      // Determine if there's a property purchase this year
      const purchasesThisYear = purchaseSchedule[year] || [];
      
      // Collect all property titles for this year (one data point per year)
      const propertiesPurchased = purchasesThisYear.length > 0 
        ? purchasesThisYear.map(p => p.title)
        : undefined;

      data.push({
        year: year.toString(),
        portfolioValue: Math.round(totalMetrics.portfolioValue),
        equity: Math.round(totalMetrics.totalEquity),
        properties: propertiesPurchased
      });
    }

    return data;
  }, [timelineProperties, profile, globalFactors, getPropertyData]);

  const cashflowData = useMemo((): CashflowDataPoint[] => {
    const data: CashflowDataPoint[] = [];
    const startYear = 2025;
    const endYear = startYear + profile.timelineYears;
    // DEPRECATED: No longer using globalFactors - each property uses its own template values
    const defaultGrowthRate = 0.06; // Default 6% for chart calculations
    const defaultInterestRate = 0.065; // Default 6.5% for chart calculations

    // Convert feasible properties to PropertyPurchase format
    const feasibleProperties = timelineProperties.filter(property => property.status === 'feasible');
    const purchases: PropertyPurchase[] = feasibleProperties.map(property => {
      const propertyData = getPropertyData(property.title);
      
      // Extract property-specific growth curve
      const propertyGrowthCurve = propertyData ? {
        year1: parseFloat(propertyData.growthYear1),
        years2to3: parseFloat(propertyData.growthYears2to3),
        year4: parseFloat(propertyData.growthYear4),
        year5plus: parseFloat(propertyData.growthYear5plus)
      } : profile.growthCurve; // Fallback to profile growth curve if no data
      
      return {
        year: property.affordableYear,
        cost: property.cost,
        loanAmount: property.loanAmount,
        depositRequired: property.depositRequired,
        title: property.title,
        rentalYield: propertyData ? parseFloat(propertyData.yield) / 100 : 0.04,
        growthRate: defaultGrowthRate, // DEPRECATED: kept for backward compatibility
        growthCurve: propertyGrowthCurve, // Use property-specific tiered growth rates
        interestRate: defaultInterestRate
      };
    });

    for (let year = startYear; year <= endYear; year++) {
      // Calculate metrics for existing portfolio
      const existingMetrics = calculateExistingPortfolioMetrics(
        profile.portfolioValue,
        profile.currentDebt,
        year - startYear,
        defaultGrowthRate,
        profile.growthCurve,
        defaultInterestRate
      );

      // Calculate metrics for purchases made by this year
      const relevantPurchases = purchases.filter(p => p.year <= year);
      const newPurchasesMetrics = calculatePortfolioMetrics(
        relevantPurchases,
        year,
        defaultGrowthRate,
        profile.growthCurve,
        defaultInterestRate,
        DEFAULT_PROPERTY_EXPENSES
      );

      // Combine metrics
      const totalMetrics = combineMetrics(existingMetrics, newPurchasesMetrics);

      // Calculate total rental income (cashflow + loan repayments)
      const totalRentalIncome = Math.round(totalMetrics.annualCashflow + totalMetrics.annualLoanRepayments);

      data.push({
        year: year.toString(),
        cashflow: Math.round(totalMetrics.annualCashflow),
        rentalIncome: totalRentalIncome,
        loanRepayments: Math.round(totalMetrics.annualLoanRepayments),
        highlight: totalMetrics.annualCashflow >= 0 && year === startYear + Math.floor(profile.timelineYears / 2)
      });
    }

    return data;
  }, [timelineProperties, profile, globalFactors, getPropertyData]);

  return {
    portfolioGrowthData,
    cashflowData
  };
};