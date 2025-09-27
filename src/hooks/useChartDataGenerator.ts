import { useMemo } from 'react';
import { useInvestmentProfile } from './useInvestmentProfile';
import { useAffordabilityCalculator } from './useAffordabilityCalculator';
import { useDataAssumptions } from '../contexts/DataAssumptionsContext';
import { calculatePortfolioMetrics, calculateExistingPortfolioMetrics, combineMetrics, DEFAULT_PROPERTY_EXPENSES } from '../utils/metricsCalculator';
import type { PropertyPurchase } from '../types/property';

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
    const interestRate = parseFloat(globalFactors.interestRate) / 100;

    // Convert feasible properties to PropertyPurchase format
    const feasibleProperties = timelineProperties.filter(property => property.status === 'feasible');
    const purchases: PropertyPurchase[] = feasibleProperties.map(property => {
      const propertyData = getPropertyData(property.title);
      return {
        year: property.affordableYear,
        cost: property.cost,
        loanAmount: property.loanAmount,
        depositRequired: property.depositRequired,
        title: property.title,
        rentalYield: propertyData ? parseFloat(propertyData.yield) / 100 : 0.04,
        growthRate: propertyData ? parseFloat(propertyData.growth) / 100 : growthRate,
        interestRate: interestRate
      };
    });

    // Create purchase schedule for property display
    const purchaseSchedule: { [year: number]: PropertyPurchase[] } = {};
    purchases.forEach(purchase => {
      if (!purchaseSchedule[purchase.year]) {
        purchaseSchedule[purchase.year] = [];
      }
      purchaseSchedule[purchase.year].push(purchase);
    });

    for (let year = startYear; year <= endYear; year++) {
      // Calculate metrics for existing portfolio
      const existingMetrics = calculateExistingPortfolioMetrics(
        profile.portfolioValue,
        profile.currentDebt,
        year - startYear,
        growthRate,
        interestRate
      );

      // Calculate metrics for purchases made by this year
      const relevantPurchases = purchases.filter(p => p.year <= year);
      const newPurchasesMetrics = calculatePortfolioMetrics(
        relevantPurchases,
        year,
        growthRate,
        interestRate,
        DEFAULT_PROPERTY_EXPENSES
      );

      // Combine metrics
      const totalMetrics = combineMetrics(existingMetrics, newPurchasesMetrics);

      // Determine if there's a property purchase this year
      const purchasesThisYear = purchaseSchedule[year] || [];
      const propertyPurchased = purchasesThisYear.length > 0 ? purchasesThisYear[0].title : undefined;

      data.push({
        year: year.toString(),
        portfolioValue: Math.round(totalMetrics.portfolioValue),
        equity: Math.round(totalMetrics.totalEquity),
        property: propertyPurchased
      });
    }

    return data;
  }, [timelineProperties, profile, globalFactors, getPropertyData]);

  const cashflowData = useMemo((): CashflowDataPoint[] => {
    const data: CashflowDataPoint[] = [];
    const startYear = 2025;
    const endYear = startYear + profile.timelineYears;
    const growthRate = parseFloat(globalFactors.growthRate) / 100;
    const interestRate = parseFloat(globalFactors.interestRate) / 100;

    // Convert feasible properties to PropertyPurchase format
    const feasibleProperties = timelineProperties.filter(property => property.status === 'feasible');
    const purchases: PropertyPurchase[] = feasibleProperties.map(property => {
      const propertyData = getPropertyData(property.title);
      return {
        year: property.affordableYear,
        cost: property.cost,
        loanAmount: property.loanAmount,
        depositRequired: property.depositRequired,
        title: property.title,
        rentalYield: propertyData ? parseFloat(propertyData.yield) / 100 : 0.04,
        growthRate: propertyData ? parseFloat(propertyData.growth) / 100 : growthRate,
        interestRate: interestRate
      };
    });

    for (let year = startYear; year <= endYear; year++) {
      // Calculate metrics for existing portfolio
      const existingMetrics = calculateExistingPortfolioMetrics(
        profile.portfolioValue,
        profile.currentDebt,
        year - startYear,
        growthRate,
        interestRate
      );

      // Calculate metrics for purchases made by this year
      const relevantPurchases = purchases.filter(p => p.year <= year);
      const newPurchasesMetrics = calculatePortfolioMetrics(
        relevantPurchases,
        year,
        growthRate,
        interestRate,
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