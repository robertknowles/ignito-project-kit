import { useMemo } from 'react';
import { useInvestmentProfile } from './useInvestmentProfile';
import { useAffordabilityCalculator } from './useAffordabilityCalculator';
import { useDataAssumptions } from '../contexts/DataAssumptionsContext';
import { usePropertyInstance } from '../contexts/PropertyInstanceContext';
import { calculatePortfolioMetrics, calculateExistingPortfolioMetrics, combineMetrics, DEFAULT_PROPERTY_EXPENSES, calculatePropertyGrowth } from '../utils/metricsCalculator';
import { calculateDetailedCashflow } from '../utils/detailedCashflowCalculator';
import { getPropertyInstanceDefaults } from '../utils/propertyInstanceDefaults';
import type { PropertyPurchase } from '../types/property';
import {
  PERIODS_PER_YEAR,
  DEFAULT_INTEREST_RATE,
  DEFAULT_RENTAL_YIELD,
  DEFAULT_EXPENSE_RATIO,
  ANNUAL_INFLATION_RATE,
} from '../constants/financialParams';

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
  expenses: number; // Operating expenses (management, insurance, rates, strata, maintenance)
  loanRepayments: number;
  highlight?: boolean;
}

// Comparison chart data types for overlay charts
export interface ComparisonPortfolioDataPoint {
  year: string;
  portfolioValueA: number;
  portfolioValueB: number;
  equityA: number;
  equityB: number;
  propertiesA?: string[];
  propertiesB?: string[];
}

export interface ComparisonCashflowDataPoint {
  year: string;
  cashflowA: number;
  cashflowB: number;
  rentalIncomeA: number;
  rentalIncomeB: number;
  expensesA: number;
  expensesB: number;
}

export interface ComparisonChartData {
  portfolioData: ComparisonPortfolioDataPoint[];
  cashflowData: ComparisonCashflowDataPoint[];
  equityGoalYearA: number | null;
  equityGoalYearB: number | null;
  incomeGoalYearA: number | null;
  incomeGoalYearB: number | null;
}

// Note: Charts display year-level aggregation for clarity
// Individual purchases happen at 6-month periods (H1/H2)
// but are aggregated to annual values for chart visualization

import type { TimelineProperty } from '../types/property';
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext';

// Optional scenario data for multi-scenario mode
interface ScenarioDataInput {
  timelineProperties: TimelineProperty[];
  profile: InvestmentProfileData;
}

export const useChartDataGenerator = (scenarioData?: ScenarioDataInput) => {
  const { profile: contextProfile } = useInvestmentProfile();
  const { timelineProperties: contextTimelineProperties } = useAffordabilityCalculator();
  const { globalFactors, getPropertyData } = useDataAssumptions();
  const { getInstance } = usePropertyInstance();
  
  // Use scenarioData if provided (multi-scenario mode), otherwise use global contexts
  const profile = scenarioData?.profile ?? contextProfile;
  const timelineProperties = scenarioData?.timelineProperties ?? contextTimelineProperties;

  const portfolioGrowthData = useMemo((): PortfolioGrowthDataPoint[] => {
    const data: PortfolioGrowthDataPoint[] = [];
    const startYear = 2025;
    const endYear = startYear + profile.timelineYears - 1;
    // DEPRECATED: No longer using globalFactors - each property uses its own template values
    const defaultGrowthRate = 0.06; // Default 6% for chart calculations
    const defaultInterestRate = DEFAULT_INTEREST_RATE;

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
        rentalYield: propertyData ? parseFloat(propertyData.yield) / 100 : DEFAULT_RENTAL_YIELD,
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
    const endYear = startYear + profile.timelineYears - 1;
    const defaultInterestRate = DEFAULT_INTEREST_RATE;

    // Get feasible properties with their detailed cashflow data
    const feasibleProperties = timelineProperties.filter(property => property.status === 'feasible');

    for (let year = startYear; year <= endYear; year++) {
      const yearsElapsed = year - startYear;
      
      // Calculate existing portfolio cashflow (simplified - uses default expenses)
      let existingCashflow = 0;
      let existingRentalIncome = 0;
      let existingExpenses = 0;
      let existingLoanPayments = 0;
      
      if (profile.portfolioValue > 0) {
        const periodsElapsed = yearsElapsed * PERIODS_PER_YEAR;
        const grownValue = calculatePropertyGrowth(profile.portfolioValue, periodsElapsed, profile.growthCurve);
        existingRentalIncome = grownValue * DEFAULT_RENTAL_YIELD;
        existingLoanPayments = profile.currentDebt * defaultInterestRate;
        // Simplified expense ratio for existing portfolio
        existingExpenses = existingRentalIncome * DEFAULT_EXPENSE_RATIO;
        existingCashflow = existingRentalIncome - existingLoanPayments - existingExpenses;
      }

      // Calculate cashflow from new purchases using DETAILED property instance data
      let newPurchasesCashflow = 0;
      let newPurchasesRentalIncome = 0;
      let newPurchasesExpenses = 0;
      let newPurchasesLoanPayments = 0;

      // Filter properties purchased by this year
      const propertiesByThisYear = feasibleProperties.filter(p => p.affordableYear <= year);
      
      propertiesByThisYear.forEach(property => {
        const yearsOwned = year - property.affordableYear;
        const periodsOwned = Math.max(0, yearsOwned * PERIODS_PER_YEAR);
        
        // Get property instance for detailed cashflow calculation
        const propertyInstance = getInstance(property.instanceId);
        const propertyData = getPropertyData(property.title);
        
        if (propertyInstance) {
          // Calculate property growth for rent adjustment
          const propertyGrowthCurve = propertyData ? {
            year1: parseFloat(propertyData.growthYear1),
            years2to3: parseFloat(propertyData.growthYears2to3),
            year4: parseFloat(propertyData.growthYear4),
            year5plus: parseFloat(propertyData.growthYear5plus)
          } : profile.growthCurve;
          
          const currentValue = calculatePropertyGrowth(property.cost, periodsOwned, propertyGrowthCurve);
          const growthFactor = currentValue / property.cost;
          
          // Calculate detailed cashflow using all 39 property fields
          const cashflowBreakdown = calculateDetailedCashflow(propertyInstance, property.loanAmount);
          
          // Adjust for property growth (rent increases with property value)
          // Apply inflation to expenses
          const inflationFactor = Math.pow(1 + ANNUAL_INFLATION_RATE, yearsOwned);
          
          // Gross income grows with property value
          const adjustedGrossIncome = cashflowBreakdown.grossAnnualIncome * growthFactor;
          const adjustedVacancy = cashflowBreakdown.vacancyAmount * growthFactor;
          const adjustedIncome = adjustedGrossIncome - adjustedVacancy;
          
          // Operating expenses grow with inflation (not property value)
          // Note: Loan interest is tracked separately, not as an expense
          const adjustedManagement = cashflowBreakdown.propertyManagementFee * growthFactor; // % of rent
          const adjustedInsurance = cashflowBreakdown.buildingInsurance * inflationFactor;
          const adjustedCouncil = cashflowBreakdown.councilRatesWater * inflationFactor;
          const adjustedStrata = cashflowBreakdown.strata * inflationFactor;
          const adjustedMaintenance = cashflowBreakdown.maintenance * inflationFactor;
          
          // Operating expenses (excluding loan interest - that's tracked in loanRepayments)
          const adjustedOperatingExpensesExLoan = 
            adjustedManagement +
            adjustedInsurance +
            adjustedCouncil +
            adjustedStrata +
            adjustedMaintenance;
          
          // Non-deductible expenses with inflation (land tax, principal payments)
          const adjustedNonDeductible = cashflowBreakdown.totalNonDeductibleExpenses * inflationFactor;
          
          // Total expenses (excluding loan interest)
          const totalPropertyExpenses = adjustedOperatingExpensesExLoan + adjustedNonDeductible;
          
          // Deductions (depreciation benefits) - stays constant or grows slightly
          const adjustedDeductions = cashflowBreakdown.potentialDeductions;
          
          // Net cashflow for this property
          const propertyCashflow = adjustedIncome - totalPropertyExpenses - cashflowBreakdown.loanInterest + adjustedDeductions;
          
          newPurchasesCashflow += propertyCashflow;
          newPurchasesRentalIncome += adjustedIncome;
          newPurchasesExpenses += totalPropertyExpenses - adjustedDeductions; // Net of deductions
          newPurchasesLoanPayments += cashflowBreakdown.loanInterest;
        } else {
          // Fallback: Use property type defaults if instance not found
          const fallbackInstance = getPropertyInstanceDefaults(property.title);
          fallbackInstance.purchasePrice = property.cost;
          
          // Use yield from property data if available
          if (propertyData) {
            const yieldRate = parseFloat(propertyData.yield) / 100;
            fallbackInstance.rentPerWeek = Math.round((property.cost * yieldRate) / 52);
          }
          
          const fallbackCashflow = calculateDetailedCashflow(fallbackInstance, property.loanAmount);
          
          // Simple growth adjustment for fallback
          const propertyGrowthCurve = propertyData ? {
            year1: parseFloat(propertyData.growthYear1),
            years2to3: parseFloat(propertyData.growthYears2to3),
            year4: parseFloat(propertyData.growthYear4),
            year5plus: parseFloat(propertyData.growthYear5plus)
          } : profile.growthCurve;
          
          const currentValue = calculatePropertyGrowth(property.cost, periodsOwned, propertyGrowthCurve);
          const growthFactor = currentValue / property.cost;
          const inflationFactor = Math.pow(1 + ANNUAL_INFLATION_RATE, yearsOwned);
          
          // Calculate fallback expenses (excluding loan interest)
          const fallbackExpenses = (
            fallbackCashflow.propertyManagementFee +
            fallbackCashflow.buildingInsurance +
            fallbackCashflow.councilRatesWater +
            fallbackCashflow.strata +
            fallbackCashflow.maintenance +
            fallbackCashflow.totalNonDeductibleExpenses -
            fallbackCashflow.potentialDeductions
          ) * inflationFactor;
          
          const adjustedCashflow = (fallbackCashflow.netAnnualCashflow + fallbackCashflow.loanInterest) * growthFactor - fallbackCashflow.loanInterest;
          
          newPurchasesCashflow += adjustedCashflow;
          newPurchasesRentalIncome += fallbackCashflow.adjustedIncome * growthFactor;
          newPurchasesExpenses += fallbackExpenses;
          newPurchasesLoanPayments += fallbackCashflow.loanInterest;
        }
      });

      // Combine existing and new portfolio cashflow
      const totalCashflow = existingCashflow + newPurchasesCashflow;
      const totalRentalIncome = existingRentalIncome + newPurchasesRentalIncome;
      const totalExpenses = existingExpenses + newPurchasesExpenses;
      const totalLoanPayments = existingLoanPayments + newPurchasesLoanPayments;

      data.push({
        year: year.toString(),
        cashflow: Math.round(totalCashflow),
        rentalIncome: Math.round(totalRentalIncome),
        expenses: Math.round(totalExpenses),
        loanRepayments: Math.round(totalLoanPayments),
        highlight: totalCashflow >= 0 && year === startYear + Math.floor(profile.timelineYears / 2)
      });
    }

    return data;
  }, [timelineProperties, profile, globalFactors, getPropertyData, getInstance]);

  return {
    portfolioGrowthData,
    cashflowData
  };
};

/**
 * Generate comparison chart data by merging two scenarios' data
 * Used for overlay charts in comparison reports
 */
export const generateComparisonChartData = (
  dataA: { portfolioGrowthData: PortfolioGrowthDataPoint[]; cashflowData: CashflowDataPoint[] },
  dataB: { portfolioGrowthData: PortfolioGrowthDataPoint[]; cashflowData: CashflowDataPoint[] },
  equityGoal: number,
  incomeGoal: number
): ComparisonChartData => {
  // Get all unique years from both datasets
  const allYearsSet = new Set<string>();
  dataA.portfolioGrowthData.forEach(d => allYearsSet.add(d.year));
  dataB.portfolioGrowthData.forEach(d => allYearsSet.add(d.year));
  const allYears = Array.from(allYearsSet).sort((a, b) => parseInt(a) - parseInt(b));

  // Merge portfolio data
  const portfolioData: ComparisonPortfolioDataPoint[] = allYears.map(year => {
    const pointA = dataA.portfolioGrowthData.find(d => d.year === year);
    const pointB = dataB.portfolioGrowthData.find(d => d.year === year);
    
    return {
      year,
      portfolioValueA: pointA?.portfolioValue ?? 0,
      portfolioValueB: pointB?.portfolioValue ?? 0,
      equityA: pointA?.equity ?? 0,
      equityB: pointB?.equity ?? 0,
      propertiesA: pointA?.properties,
      propertiesB: pointB?.properties,
    };
  });

  // Merge cashflow data
  const cashflowData: ComparisonCashflowDataPoint[] = allYears.map(year => {
    const pointA = dataA.cashflowData.find(d => d.year === year);
    const pointB = dataB.cashflowData.find(d => d.year === year);
    
    return {
      year,
      cashflowA: pointA?.cashflow ?? 0,
      cashflowB: pointB?.cashflow ?? 0,
      rentalIncomeA: pointA?.rentalIncome ?? 0,
      rentalIncomeB: pointB?.rentalIncome ?? 0,
      expensesA: pointA?.expenses ?? 0,
      expensesB: pointB?.expenses ?? 0,
    };
  });

  // Find equity goal achievement years
  const equityGoalYearA = dataA.portfolioGrowthData.find(d => d.equity >= equityGoal)?.year 
    ? parseInt(dataA.portfolioGrowthData.find(d => d.equity >= equityGoal)!.year) 
    : null;
  const equityGoalYearB = dataB.portfolioGrowthData.find(d => d.equity >= equityGoal)?.year
    ? parseInt(dataB.portfolioGrowthData.find(d => d.equity >= equityGoal)!.year)
    : null;

  // Find income goal achievement years
  const incomeGoalYearA = dataA.cashflowData.find(d => d.cashflow >= incomeGoal)?.year
    ? parseInt(dataA.cashflowData.find(d => d.cashflow >= incomeGoal)!.year)
    : null;
  const incomeGoalYearB = dataB.cashflowData.find(d => d.cashflow >= incomeGoal)?.year
    ? parseInt(dataB.cashflowData.find(d => d.cashflow >= incomeGoal)!.year)
    : null;

  return {
    portfolioData,
    cashflowData,
    equityGoalYearA,
    equityGoalYearB,
    incomeGoalYearA,
    incomeGoalYearB,
  };
};