import { useMemo } from 'react';
import { useInvestmentProfile } from './useInvestmentProfile';
import { useAffordabilityCalculator } from './useAffordabilityCalculator';
import { useDataAssumptions } from '../contexts/DataAssumptionsContext';
import { usePropertyInstance } from '../contexts/PropertyInstanceContext';
import { usePropertySelection } from '../contexts/PropertySelectionContext';
import { calculatePortfolioMetrics, calculateExistingPortfolioMetrics, combineMetrics, DEFAULT_PROPERTY_EXPENSES, calculatePropertyGrowth, calculateExistingPortfolioGrowthByPeriod } from '../utils/metricsCalculator';
import { calculateDetailedCashflow } from '../utils/detailedCashflowCalculator';
import { getPropertyInstanceDefaults, getGrowthCurveFromAssumption } from '../utils/propertyInstanceDefaults';
import {
  getGrowthRateAdjustment,
  getEffectiveInterestRate,
  getPropertyEffectiveRate,
  getRenovationValueIncrease,
  applyGrowthAdjustment,
} from '../utils/eventProcessing';
import type { PropertyPurchase } from '../types/property';
import {
  PERIODS_PER_YEAR,
  BASE_YEAR,
  DEFAULT_INTEREST_RATE,
  DEFAULT_VACANCY_RATE,
  DEFAULT_RENTAL_YIELD,
  DEFAULT_EXPENSE_RATIO,
  ANNUAL_INFLATION_RATE,
  ANNUAL_WAGE_GROWTH_RATE,
  SAVINGS_INTEREST_RATE,
  EQUITY_EXTRACTION_LVR_CAP,
} from '../constants/financialParams';

export interface PortfolioGrowthDataPoint {
  year: string; // Year label for chart display
  portfolioValue: number;
  equity: number;
  properties?: string[]; // Array of property titles purchased this year
  // Dashboard redesign fields (optional for backward compatibility)
  doNothingBalance?: number;      // Compound savings trajectory (no property investment)
  totalDebt?: number;             // Sum of all loan balances
  availableFunds?: number;        // Deposit pool + cumulative savings + usable equity
  monthlyHoldingCost?: number;    // Net monthly cost to hold portfolio
  borrowingCapacity?: number;     // Remaining borrowing capacity
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
  const { eventBlocks } = usePropertySelection();
  
  // Use scenarioData if provided (multi-scenario mode), otherwise use global contexts
  const profile = scenarioData?.profile ?? contextProfile;
  const timelineProperties = scenarioData?.timelineProperties ?? contextTimelineProperties;

  // Profile-level assumption overrides (set via Assumptions page).
  // Each falls back to its platform constant when not set on the profile.
  // Declared at component scope so all downstream useMemos (portfolioGrowthData,
  // cashflowData, monthlyHoldingCost, etc.) can reference them.
  const defaultInterestRate = profile.interestRate ?? DEFAULT_INTEREST_RATE;
  const profileVacancyRate = profile.vacancyRate ?? DEFAULT_VACANCY_RATE;
  const profileWageGrowth = profile.wageGrowthRate ?? ANNUAL_WAGE_GROWTH_RATE;
  const profileInflation = profile.inflationRate ?? ANNUAL_INFLATION_RATE;

  const portfolioGrowthData = useMemo((): PortfolioGrowthDataPoint[] => {
    const data: PortfolioGrowthDataPoint[] = [];
    const startYear = BASE_YEAR;
    const endYear = startYear + profile.timelineYears - 1;
    // DEPRECATED: No longer using globalFactors - each property uses its own template values
    const defaultGrowthRate = 0.06; // Default 6% for chart calculations

    // Convert feasible properties to PropertyPurchase format
    const feasibleProperties = timelineProperties.filter(property => property.status === 'feasible');
    const purchases: PropertyPurchase[] = feasibleProperties.map(property => {
      const propertyData = getPropertyData(property.title);
      const propertyInstance = getInstance(property.instanceId);
      
      // PRIORITY: Use instance growthAssumption if available, then template, then profile fallback
      // This ensures edits to the property card slider are reflected in charts
      let propertyGrowthCurve;
      if (propertyInstance?.growthAssumption) {
        // Instance has explicit growth assumption - use it (connects slider to chart)
        propertyGrowthCurve = getGrowthCurveFromAssumption(propertyInstance.growthAssumption);
      } else if (propertyData) {
        // Fallback to property type template rates
        propertyGrowthCurve = {
          year1: parseFloat(propertyData.growthYear1),
          years2to3: parseFloat(propertyData.growthYears2to3),
          year4: parseFloat(propertyData.growthYear4),
          year5plus: parseFloat(propertyData.growthYear5plus)
        };
      } else {
        // Final fallback to profile growth curve
        propertyGrowthCurve = profile.growthCurve;
      }
      
      // Use instance rent if available, otherwise calculate from yield
      const instanceRentPerWeek = propertyInstance?.rentPerWeek;
      const rentalYield = instanceRentPerWeek 
        ? (instanceRentPerWeek * 52) / property.cost 
        : (propertyData ? parseFloat(propertyData.yield) / 100 : DEFAULT_RENTAL_YIELD);
      
      // Manufactured equity: if BA secured property under valuation, use the
      // valuation as the compounding basis. Loan is still based on cost (purchase
      // price). When valuationAtPurchase <= cost, growthBasis falls back to cost
      // (no behaviour change vs pre-2026-04-30).
      const valuationAtPurchase = propertyInstance?.valuationAtPurchase;
      const growthBasis = (valuationAtPurchase && valuationAtPurchase > property.cost)
        ? valuationAtPurchase
        : property.cost;

      return {
        year: property.affordableYear,
        cost: property.cost,
        growthBasis,
        loanAmount: property.loanAmount,
        depositRequired: property.depositRequired,
        title: property.title,
        instanceId: property.instanceId, // Include instanceId for renovation tracking
        rentalYield: rentalYield,
        growthRate: defaultGrowthRate, // DEPRECATED: kept for backward compatibility
        growthCurve: propertyGrowthCurve, // Use instance-specific tiered growth rates
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
      const yearsElapsed = year - startYear;
      const periodsElapsed = yearsElapsed * PERIODS_PER_YEAR;
      
      // Get market correction adjustment for this period
      const growthAdjustment = getGrowthRateAdjustment(periodsElapsed, eventBlocks);
      
      // Apply growth adjustment to profile's growth curve for existing portfolio
      const adjustedProfileGrowthCurve = growthAdjustment !== 0 
        ? applyGrowthAdjustment(profile.growthCurve, growthAdjustment)
        : profile.growthCurve;
      
      // Calculate metrics for existing portfolio with event-adjusted growth
      // Use profile's existingPortfolioGrowthRate for mature properties (default 3%)
      const existingMetrics = calculateExistingPortfolioMetrics(
        profile.portfolioValue,
        profile.currentDebt,
        yearsElapsed,
        profile.existingPortfolioGrowthRate || 0.05,
        adjustedProfileGrowthCurve,
        defaultInterestRate
      );

      // Calculate metrics for purchases made by this year
      // Apply growth adjustment to each purchase's growth curve
      const relevantPurchases = purchases.filter(p => p.year <= year);
      const adjustedPurchases = relevantPurchases.map(purchase => {
        const adjustedGrowthCurve = growthAdjustment !== 0 && purchase.growthCurve
          ? applyGrowthAdjustment(purchase.growthCurve, growthAdjustment)
          : purchase.growthCurve;
        
        return {
          ...purchase,
          growthCurve: adjustedGrowthCurve,
        };
      });
      
      const newPurchasesMetrics = calculatePortfolioMetrics(
        adjustedPurchases,
        year,
        defaultGrowthRate,
        adjustedProfileGrowthCurve,
        defaultInterestRate,
        DEFAULT_PROPERTY_EXPENSES
      );

      // Combine metrics
      let totalMetrics = combineMetrics(existingMetrics, newPurchasesMetrics);
      
      // Add renovation value increases to portfolio value and equity
      let totalRenovationIncrease = 0;
      relevantPurchases.forEach(purchase => {
        if (purchase.instanceId) {
          const renovationIncrease = getRenovationValueIncrease(
            purchase.instanceId,
            periodsElapsed,
            eventBlocks
          );
          totalRenovationIncrease += renovationIncrease;
        }
      });
      
      if (totalRenovationIncrease > 0) {
        totalMetrics = {
          ...totalMetrics,
          portfolioValue: totalMetrics.portfolioValue + totalRenovationIncrease,
          totalEquity: totalMetrics.totalEquity + totalRenovationIncrease,
        };
      }

      // Determine if there's a property purchase this year
      const purchasesThisYear = purchaseSchedule[year] || [];

      // Collect all property titles for this year (one data point per year)
      const propertiesPurchased = purchasesThisYear.length > 0
        ? purchasesThisYear.map(p => p.title)
        : undefined;

      // Do-nothing baseline: compound savings with no property investment.
      // Savings grow with profile-level wage growth override (default 2.5%).
      const doNothingBalance = (() => {
        let balance = profile.depositPool;
        for (let y = 0; y < yearsElapsed; y++) {
          const yearSavings = profile.annualSavings * Math.pow(1 + profileWageGrowth, y);
          balance = balance * (1 + SAVINGS_INTEREST_RATE) + yearSavings;
        }
        return Math.round(balance);
      })();

      // Available funds: deposit pool + cumulative wage-grown savings + usable equity from portfolio.
      // Cumulative savings = sum of geometric series annualSavings × (1+wageGrowth)^i for i in [0, yearsElapsed).
      // Closed form: annualSavings × ((1+wageGrowth)^yearsElapsed − 1) / wageGrowth
      const usableEquity = Math.max(0, totalMetrics.portfolioValue * EQUITY_EXTRACTION_LVR_CAP - totalMetrics.totalDebt);
      const cumulativeSavings = yearsElapsed > 0 && profileWageGrowth > 0
        ? profile.annualSavings * (Math.pow(1 + profileWageGrowth, yearsElapsed) - 1) / profileWageGrowth
        : profile.annualSavings * yearsElapsed;
      const depositsUsed = relevantPurchases.reduce((sum, p) => sum + p.depositRequired, 0);
      const availableFunds = Math.round(Math.max(0, profile.depositPool + cumulativeSavings + usableEquity - depositsUsed));

      // Remaining borrowing capacity
      const loansUsed = relevantPurchases.reduce((sum, p) => sum + p.loanAmount, 0);
      const borrowingCapacity = Math.round(Math.max(0, profile.borrowingCapacity - loansUsed));

      data.push({
        year: year.toString(),
        portfolioValue: Math.round(totalMetrics.portfolioValue),
        equity: Math.round(totalMetrics.totalEquity),
        properties: propertiesPurchased,
        doNothingBalance,
        totalDebt: Math.round(totalMetrics.totalDebt),
        availableFunds,
        borrowingCapacity,
      });
    }

    return data;
  }, [timelineProperties, profile, globalFactors, getPropertyData, eventBlocks, getInstance]);

  const cashflowData = useMemo((): CashflowDataPoint[] => {
    const data: CashflowDataPoint[] = [];
    const startYear = BASE_YEAR;
    const endYear = startYear + Math.max(profile.timelineYears, 30) - 1;

    // Get feasible properties with their detailed cashflow data
    const feasibleProperties = timelineProperties.filter(property => property.status === 'feasible');

    for (let year = startYear; year <= endYear; year++) {
      const yearsElapsed = year - startYear;
      const periodsElapsed = yearsElapsed * PERIODS_PER_YEAR;
      
      // Get event-adjusted interest rate for this period (market-wide)
      const effectiveInterestRate = getEffectiveInterestRate(periodsElapsed, eventBlocks);
      
      // Get market correction adjustment for growth calculations
      const growthAdjustment = getGrowthRateAdjustment(periodsElapsed, eventBlocks);
      const adjustedProfileGrowthCurve = growthAdjustment !== 0 
        ? applyGrowthAdjustment(profile.growthCurve, growthAdjustment)
        : profile.growthCurve;
      
      // Calculate existing portfolio cashflow (simplified - uses default expenses)
      let existingCashflow = 0;
      let existingRentalIncome = 0;
      let existingExpenses = 0;
      let existingLoanPayments = 0;
      
      if (profile.portfolioValue > 0) {
        // Use configurable flat rate for existing portfolio (mature properties)
        const existingGrowthRate = profile.existingPortfolioGrowthRate || 0.05;
        const grownValue = calculateExistingPortfolioGrowthByPeriod(profile.portfolioValue, periodsElapsed, existingGrowthRate);
        existingRentalIncome = grownValue * DEFAULT_RENTAL_YIELD;
        // Use event-adjusted interest rate for existing debt
        existingLoanPayments = profile.currentDebt * effectiveInterestRate;
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
        
        // Get the effective interest rate for this property (considers property-specific refinance)
        const propertyEffectiveRate = getPropertyEffectiveRate(
          periodsElapsed,
          eventBlocks,
          property.instanceId
        );
        
        // Get renovation value increase for this property
        const renovationValueIncrease = getRenovationValueIncrease(
          property.instanceId,
          periodsElapsed,
          eventBlocks
        );
        
        if (propertyInstance) {
          // PRIORITY: Use instance growthAssumption if set, then template, then profile fallback
          let propertyGrowthCurve;
          if (propertyInstance.growthAssumption) {
            propertyGrowthCurve = getGrowthCurveFromAssumption(propertyInstance.growthAssumption);
          } else if (propertyData) {
            propertyGrowthCurve = {
              year1: parseFloat(propertyData.growthYear1),
              years2to3: parseFloat(propertyData.growthYears2to3),
              year4: parseFloat(propertyData.growthYear4),
              year5plus: parseFloat(propertyData.growthYear5plus)
            };
          } else {
            propertyGrowthCurve = profile.growthCurve;
          }
          
          // Apply market correction to property's growth curve
          const adjustedPropertyGrowthCurve = growthAdjustment !== 0
            ? applyGrowthAdjustment(propertyGrowthCurve, growthAdjustment)
            : propertyGrowthCurve;
          
          // Use growthBasis (defaults to cost if no manufactured equity at purchase)
          const propertyGrowthBasis = property.growthBasis ?? property.cost;
          const baseValue = calculatePropertyGrowth(propertyGrowthBasis, periodsOwned, adjustedPropertyGrowthCurve);
          // Add renovation value increase
          const currentValue = baseValue + renovationValueIncrease;
          const growthFactor = currentValue / propertyGrowthBasis;
          
          // Calculate detailed cashflow using all 39 property fields
          const cashflowBreakdown = calculateDetailedCashflow(propertyInstance, property.loanAmount, profileVacancyRate);
          
          // Recalculate loan interest with event-adjusted rate
          const adjustedLoanInterest = property.loanAmount * propertyEffectiveRate;
          
          // Adjust for property growth (rent increases with property value)
          // Apply inflation to expenses
          const inflationFactor = Math.pow(1 + profileInflation, yearsOwned);
          
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
          
          // Net cashflow for this property (using event-adjusted loan interest)
          const propertyCashflow = adjustedIncome - totalPropertyExpenses - adjustedLoanInterest + adjustedDeductions;
          
          newPurchasesCashflow += propertyCashflow;
          newPurchasesRentalIncome += adjustedIncome;
          newPurchasesExpenses += totalPropertyExpenses - adjustedDeductions; // Net of deductions
          newPurchasesLoanPayments += adjustedLoanInterest;
        } else {
          // Fallback: Use property type defaults if instance not found
          const fallbackInstance = getPropertyInstanceDefaults(property.title);
          fallbackInstance.purchasePrice = property.cost;
          
          // Use yield from property data if available
          if (propertyData) {
            const yieldRate = parseFloat(propertyData.yield) / 100;
            fallbackInstance.rentPerWeek = Math.round((property.cost * yieldRate) / 52);
          }
          
          const fallbackCashflow = calculateDetailedCashflow(fallbackInstance, property.loanAmount, profileVacancyRate);
          
          // Simple growth adjustment for fallback
          let propertyGrowthCurve = propertyData ? {
            year1: parseFloat(propertyData.growthYear1),
            years2to3: parseFloat(propertyData.growthYears2to3),
            year4: parseFloat(propertyData.growthYear4),
            year5plus: parseFloat(propertyData.growthYear5plus)
          } : profile.growthCurve;
          
          // Apply market correction to growth curve
          if (growthAdjustment !== 0) {
            propertyGrowthCurve = applyGrowthAdjustment(propertyGrowthCurve, growthAdjustment);
          }
          
          // Use growthBasis (defaults to cost if no manufactured equity at purchase)
          const propertyGrowthBasis = property.growthBasis ?? property.cost;
          const baseValue = calculatePropertyGrowth(propertyGrowthBasis, periodsOwned, propertyGrowthCurve);
          const currentValue = baseValue + renovationValueIncrease;
          const growthFactor = currentValue / propertyGrowthBasis;
          const inflationFactor = Math.pow(1 + profileInflation, yearsOwned);
          
          // Recalculate loan interest with event-adjusted rate
          const adjustedLoanInterest = property.loanAmount * propertyEffectiveRate;
          
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
          
          const adjustedCashflow = (fallbackCashflow.netAnnualCashflow + fallbackCashflow.loanInterest) * growthFactor - adjustedLoanInterest;
          
          newPurchasesCashflow += adjustedCashflow;
          newPurchasesRentalIncome += fallbackCashflow.adjustedIncome * growthFactor;
          newPurchasesExpenses += fallbackExpenses;
          newPurchasesLoanPayments += adjustedLoanInterest;
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
  }, [timelineProperties, profile, globalFactors, getPropertyData, getInstance, eventBlocks]);

  // Enrich portfolio data with monthly holding cost from cashflow data
  const enrichedPortfolioData = useMemo((): PortfolioGrowthDataPoint[] => {
    return portfolioGrowthData.map((point, index) => {
      const cashflow = cashflowData[index];
      if (!cashflow) return point;
      return {
        ...point,
        monthlyHoldingCost: Math.round(cashflow.cashflow / 12),
      };
    });
  }, [portfolioGrowthData, cashflowData]);

  // Monthly holding cost summary for SummaryBar (total + per-property breakdown)
  const monthlyHoldingCost = useMemo(() => {
    const feasibleProperties = timelineProperties.filter(p => p.status === 'feasible');
    const finalCashflow = cashflowData[cashflowData.length - 1];

    const byProperty = feasibleProperties.map(property => {
      const propertyInstance = getInstance(property.instanceId);
      if (!propertyInstance) {
        return { propertyTitle: property.title, monthlyCost: 0, instanceId: property.instanceId };
      }
      const breakdown = calculateDetailedCashflow(propertyInstance, property.loanAmount, profileVacancyRate);
      return {
        propertyTitle: property.title,
        monthlyCost: Math.round(breakdown.netWeeklyCashflow * 52 / 12),
        instanceId: property.instanceId,
      };
    });

    return {
      total: finalCashflow ? Math.round(finalCashflow.cashflow / 12) : 0,
      byProperty,
    };
  }, [timelineProperties, cashflowData, getInstance]);

  // Net worth data for NetWorthChart
  const netWorthData = useMemo(() => {
    return enrichedPortfolioData.map(point => ({
      year: point.year,
      totalAssets: point.portfolioValue,
      totalDebt: point.totalDebt ?? 0,
      netWorth: point.portfolioValue - (point.totalDebt ?? 0),
    }));
  }, [enrichedPortfolioData]);

  return {
    portfolioGrowthData: enrichedPortfolioData,
    cashflowData,
    monthlyHoldingCost,
    netWorthData,
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