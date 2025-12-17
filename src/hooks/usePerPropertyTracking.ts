import { useMemo } from 'react';
import { usePropertyInstance } from '../contexts/PropertyInstanceContext';
import { useAffordabilityCalculator } from './useAffordabilityCalculator';
import { useInvestmentProfile } from './useInvestmentProfile';
import { useDataAssumptions } from '../contexts/DataAssumptionsContext';
import { calculateDetailedCashflow } from '../utils/detailedCashflowCalculator';
import { calculateLandTax } from '../utils/landTaxCalculator';
import { applyPropertyOverrides } from '../utils/applyPropertyOverrides';
import { calculatePropertyGrowth } from '../utils/metricsCalculator';
import type { GrowthCurve } from '../types/property';

// Period conversion constants (aligned with calculator)
const PERIODS_PER_YEAR = 2;
const BASE_YEAR = 2025;

interface EquityDataPoint {
  year: number;
  propertyValue: number;
  loanBalance: number;
  equity: number;
}

interface CashflowDataPoint {
  year: number;
  grossIncome: number;
  totalExpenses: number;
  netCashflow: number;
}

export interface PerPropertyTrackingData {
  // Key Metrics
  currentPropertyValue: number;
  currentEquity: number;
  totalCashInvested: number;
  cashOnCashReturn: number; // Year 1 return
  roic: number; // Annualized return on invested capital
  yearsHeld: number;
  
  // Chart Data
  equityOverTime: EquityDataPoint[];
  cashflowOverTime: CashflowDataPoint[];
  
  // Additional context
  propertyTitle: string;
  purchasePeriod: string;
  purchaseYear: number;
}

export const usePerPropertyTracking = (propertyInstanceId: string | null) => {
  const { getInstance } = usePropertyInstance();
  const { timelineProperties } = useAffordabilityCalculator();
  const { profile } = useInvestmentProfile();
  const { getPropertyData, propertyAssumptions } = useDataAssumptions();
  
  const trackingData = useMemo((): PerPropertyTrackingData | null => {
    if (!propertyInstanceId) {
      return null;
    }
    
    // Find the timeline property for this instance
    const timelineProperty = timelineProperties.find(p => p.instanceId === propertyInstanceId);
    
    if (!timelineProperty || timelineProperty.status !== 'feasible') {
      return null;
    }
    
    // Get property instance details (if customized)
    const propertyInstance = getInstance(propertyInstanceId);
    
    // Get property data from assumptions
    const propertyData = getPropertyData(timelineProperty.title);
    
    if (!propertyData) {
      return null;
    }
    
    // Apply overrides if instance exists
    const propertyDetails = propertyInstance 
      ? applyPropertyOverrides(propertyData, propertyInstance)
      : propertyData;
    
    // Initial values
    const purchasePeriod = timelineProperty.period;
    const purchasePrice = timelineProperty.cost;
    let loanBalance = timelineProperty.loanAmount;
    const loanType = timelineProperty.loanType || 'IO';
    
    // Total cash invested = deposit + acquisition costs
    const totalCashInvested = timelineProperty.upfrontCosts?.total ?? 
      (timelineProperty.depositRequired + (timelineProperty.acquisitionCosts?.total || 0));
    
    // Use the profile's growth curve (same as portfolio growth chart)
    const growthCurve = profile.growthCurve;
    
    // Calculate projections based on timeline years
    const projectionYears = profile.timelineYears || 10;
    const equityOverTime: EquityDataPoint[] = [];
    const cashflowOverTime: CashflowDataPoint[] = [];
    
    // For P&I loans, we need to calculate principal reduction
    const calculateAnnualPrincipalPayment = (loanAmount: number, interestRate: number, termYears: number): number => {
      const monthlyRate = interestRate / 12;
      const numPayments = termYears * 12;
      
      const monthlyPayment = loanAmount * 
        (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
        (Math.pow(1 + monthlyRate, numPayments) - 1);
      
      const annualPayment = monthlyPayment * 12;
      const annualInterest = loanAmount * interestRate;
      const annualPrincipal = annualPayment - annualInterest;
      
      return annualPrincipal;
    };
    
    for (let year = 1; year <= projectionYears; year++) {
      // Calculate periods held (using same period-based calculation as portfolio chart)
      const periodsHeld = year * PERIODS_PER_YEAR;
      
      // Use the same growth calculation as portfolio growth chart
      const currentPropertyValue = calculatePropertyGrowth(purchasePrice, periodsHeld, growthCurve);
      
      // Reduce loan balance if P&I
      if (loanType === 'PI') {
        const annualPrincipal = calculateAnnualPrincipalPayment(
          loanBalance,
          propertyDetails.interestRate / 100,
          propertyDetails.loanTerm
        );
        loanBalance = Math.max(0, loanBalance - annualPrincipal);
      }
      
      // Calculate equity
      const equity = currentPropertyValue - loanBalance;
      
      equityOverTime.push({
        year,
        propertyValue: Math.round(currentPropertyValue),
        loanBalance: Math.round(loanBalance),
        equity: Math.round(equity),
      });
      
      // Calculate cashflow for this year
      // We need to use current property value for rental income calculation
      const landTax = propertyDetails.landTaxOverride ?? calculateLandTax(
        propertyDetails.state,
        currentPropertyValue
      );
      
      const propertyWithLandTax = {
        ...propertyDetails,
        landTaxOverride: propertyDetails.landTaxOverride ?? landTax,
      };
      
      // Update rent based on property value growth (assuming rent grows with value)
      const rentGrowthFactor = currentPropertyValue / purchasePrice;
      const adjustedProperty = {
        ...propertyWithLandTax,
        rentPerWeek: propertyDetails.rentPerWeek * rentGrowthFactor,
      };
      
      const cashflowBreakdown = calculateDetailedCashflow(
        adjustedProperty,
        loanBalance
      );
      
      cashflowOverTime.push({
        year,
        grossIncome: Math.round(cashflowBreakdown.adjustedIncome),
        totalExpenses: Math.round(
          cashflowBreakdown.totalOperatingExpenses + 
          cashflowBreakdown.totalNonDeductibleExpenses -
          cashflowBreakdown.potentialDeductions
        ),
        netCashflow: Math.round(cashflowBreakdown.netAnnualCashflow),
      });
    }
    
    // Calculate key metrics
    const latestEquity = equityOverTime[equityOverTime.length - 1];
    const currentPropertyValueFinal = latestEquity.propertyValue;
    const currentEquityFinal = latestEquity.equity;
    
    // Cash-on-Cash Return (Year 1 net cashflow / total cash invested)
    const firstYearNetCashflow = cashflowOverTime[0]?.netCashflow || 0;
    const cashOnCashReturn = totalCashInvested > 0 
      ? (firstYearNetCashflow / totalCashInvested) * 100 
      : 0;
    
    // Return on Invested Capital (ROIC) - Annualized
    // Total return = (Current Equity - Total Invested + Total Cashflow) / Total Invested / Years Held
    const totalCashflow = cashflowOverTime.reduce((sum, cf) => sum + cf.netCashflow, 0);
    const totalReturn = currentEquityFinal - totalCashInvested + totalCashflow;
    const yearsHeld = projectionYears; // Use timeline years from profile
    const roic = totalCashInvested > 0 
      ? (totalReturn / totalCashInvested / yearsHeld) * 100 
      : 0;
    
    return {
      currentPropertyValue: currentPropertyValueFinal,
      currentEquity: currentEquityFinal,
      totalCashInvested,
      cashOnCashReturn,
      roic,
      yearsHeld,
      equityOverTime,
      cashflowOverTime,
      propertyTitle: timelineProperty.title,
      purchasePeriod: timelineProperty.displayPeriod,
      purchaseYear: Math.floor(timelineProperty.affordableYear),
    };
  }, [propertyInstanceId, timelineProperties, getInstance, getPropertyData, propertyAssumptions, profile.growthCurve]);
  
  return { trackingData };
};

