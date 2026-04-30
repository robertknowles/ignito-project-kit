import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { useInvestmentProfile, type InvestmentProfileData } from './useInvestmentProfile';
import { usePropertySelection, type EventBlock } from '../contexts/PropertySelectionContext';
import { useDataAssumptions, type PropertyAssumption } from '../contexts/DataAssumptionsContext';
import type { TimelineProperty } from '../types/property';
import { useClient } from '../contexts/ClientContext';
import { usePropertyInstance } from '../contexts/PropertyInstanceContext';
import { calculateDetailedCashflow } from '../utils/detailedCashflowCalculator';
import { calculateOneOffCosts, calculateDepositBalance } from '../utils/oneOffCostsCalculator';
import { calculateLMI, calculateLoanAmount } from '../utils/lmiCalculator';
import { calculateStampDuty } from '../utils/stampDutyCalculator';
import { calculateLandTax } from '../utils/landTaxCalculator';
import { applyPropertyOverrides } from '../utils/applyPropertyOverrides';
import { getPropertyInstanceDefaults } from '../utils/propertyInstanceDefaults';
import { calculateCascadeEffect, initializeCascadeState } from '../utils/cascadeCalculator';
import {
  getInterestRateAdjustment,
  getGrowthRateAdjustment,
  getEffectiveInterestRate,
  getPropertyEffectiveRate,
  getRenovationValueIncrease,
} from '../utils/eventProcessing';
import {
  PERIODS_PER_YEAR,
  BASE_YEAR,
  SERVICEABILITY_FACTOR,
  RENTAL_SERVICEABILITY_CONTRIBUTION_RATE,
  EQUITY_EXTRACTION_LVR_CAP,
  DEFAULT_INTEREST_RATE,
  ANNUAL_INFLATION_RATE,
  annualRateToPeriodRate,
  periodToDisplay,
  periodToYear,
  yearToPeriod,
  RENTAL_RECOGNITION_RATE,
  SAVINGS_DEPLOYMENT_RATE,
  DEPENDENT_BC_PENALTY,
  DEPENDENT_SAVINGS_PENALTY,
  DEFAULT_VACANCY_RATE,
  calculateInflationFactor,
} from '../constants/financialParams';
import { calculateExistingPortfolioGrowthByPeriod } from '../utils/metricsCalculator';

export interface AffordabilityResult {
  period: number;
  canAfford: boolean;
  availableFunds: number;
  usableEquity: number;
  totalPortfolioValue: number;
  totalDebt: number;
}

export const useAffordabilityCalculator = () => {
  const { profile, calculatedValues } = useInvestmentProfile();
  const { selections, propertyTypes, pauseBlocks, propertyOrder, eventBlocks } = usePropertySelection();
  const { globalFactors, getPropertyData, propertyAssumptions, getPropertyTypeTemplate, propertyTypeTemplates } = useDataAssumptions();
  const { activeClient } = useClient();
  const { getInstance, createInstance, instances } = usePropertyInstance();
  
  // Per-instance loan type state (keyed by instanceId). In-memory only;
  // persists across a session but not across reloads. Saved scenarios
  // restore their own loan types via PropertyInstanceDetails.loanProduct.
  const [timelineLoanTypes, setTimelineLoanTypes] = useState<Record<string, 'IO' | 'PI'>>({});

  // Reset loan-type overrides when the active client changes.
  useEffect(() => {
    setTimelineLoanTypes({});
  }, [activeClient?.id]);
  
  // Function to update loan type for a specific timeline property instance
  const updateTimelinePropertyLoanType = useCallback((instanceId: string, loanType: 'IO' | 'PI') => {
    setTimelineLoanTypes(prev => ({
      ...prev,
      [instanceId]: loanType,
    }));
  }, []);

  // Create stable selections hash to avoid expensive JSON.stringify on every render
  const selectionsHash = useMemo(() => {
    return Object.entries(selections)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, qty]) => `${id}:${qty}`)
      .join('|');
  }, [selections]);

  // Debug flag - set to true to enable detailed debugging
  const DEBUG_MODE = false; // Disabled for performance

  // Calculate annual loan payment (IO vs P&I)
  const calculateAnnualLoanPayment = (
    loanAmount: number,
    interestRate: number,
    loanType: 'IO' | 'PI',
    loanTermYears: number = 30
  ): number => {
    if (loanType === 'IO') {
      // Interest only - just pay interest
      return loanAmount * interestRate;
    } else {
      // Principal & Interest - use amortization formula
      const monthlyRate = interestRate / 12;
      const numPayments = loanTermYears * 12;
      
      const monthlyPayment = loanAmount * 
        (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
        (Math.pow(1 + monthlyRate, numPayments) - 1);
      
      return monthlyPayment * 12;
    }
  };

  // Move helper functions outside useMemo so they can be accessed by other functions
  // This function now optionally accepts a basePeriod to apply market correction events
  const calculatePropertyGrowth = (
    initialValue: number, 
    periods: number, 
    assumption: PropertyAssumption,
    basePeriod: number = 0 // The period at which the property was purchased (for event adjustment)
  ) => {
    let currentValue = initialValue;
    
    // Use per-property tiered growth rates
    const year1Rate = annualRateToPeriodRate(parseFloat(assumption.growthYear1) / 100);
    const years2to3Rate = annualRateToPeriodRate(parseFloat(assumption.growthYears2to3) / 100);
    const year4Rate = annualRateToPeriodRate(parseFloat(assumption.growthYear4) / 100);
    const year5plusRate = annualRateToPeriodRate(parseFloat(assumption.growthYear5plus) / 100);
    
    for (let period = 1; period <= periods; period++) {
      // Calculate the actual calendar period (for market correction event lookup)
      const actualPeriod = basePeriod + period;
      
      // Get market correction adjustment for this period
      const growthAdjustment = getGrowthRateAdjustment(actualPeriod, eventBlocks);
      
      let periodRate;
      
      if (period <= 2) {
        // Year 1 (periods 1-2)
        periodRate = year1Rate;
      } else if (period <= 6) {
        // Years 2-3 (periods 3-6)
        periodRate = years2to3Rate;
      } else if (period <= 8) {
        // Year 4 (periods 7-8)
        periodRate = year4Rate;
      } else {
        // Year 5+ (period 9+)
        periodRate = year5plusRate;
      }
      
      // Apply market correction adjustment (convert to period rate)
      // Growth adjustment is already a decimal (e.g., -0.03 for -3%)
      const adjustedPeriodRate = periodRate + annualRateToPeriodRate(growthAdjustment);
      
      // Ensure rate doesn't go negative
      currentValue *= (1 + Math.max(-0.1, adjustedPeriodRate)); // Cap at -10% per period
    }
    
    return currentValue;
  };

  // Progressive rental recognition rates - imported from financialParams

  // =============================================================================
  // EVENT PROCESSING - Get modified profile at a specific period
  // =============================================================================
  
  /**
   * Computes a modified InvestmentProfileData based on events that have occurred
   * up to (and including) the specified period. This allows events to modify
   * simulation parameters like salary, borrowing capacity, etc.
   * 
   * @param period - The period number (1, 2, 3...)
   * @param baseProfile - The original investment profile
   * @param events - Array of event blocks to process
   * @returns Modified profile with event effects applied
   */
  const getProfileAtPeriod = (
    period: number,
    baseProfile: InvestmentProfileData,
    events: EventBlock[]
  ): InvestmentProfileData => {
    // Start with a copy of the base profile
    let modifiedProfile = { ...baseProfile };
    
    // Sort events by period (process in chronological order)
    const eventsUpToPeriod = events
      .filter(e => e.period <= period)
      .sort((a, b) => a.period - b.period);
    
    // Track cumulative one-time cash events for the current period only
    let oneTimeCashAdjustment = 0;
    
    for (const event of eventsUpToPeriod) {
      switch (event.eventType) {
        // =============================================================================
        // INCOME EVENTS
        // =============================================================================
        case 'salary_change':
          if (event.payload.newSalary !== undefined) {
            modifiedProfile.baseSalary = event.payload.newSalary;
            // Recalculate borrowing capacity based on new salary
            modifiedProfile.borrowingCapacity = 
              event.payload.newSalary * modifiedProfile.salaryServiceabilityMultiplier;
            // Estimate savings change (rough approximation - SAVINGS_DEPLOYMENT_RATE of salary delta)
            const salaryDelta = event.payload.newSalary - (event.payload.previousSalary || baseProfile.baseSalary);
            modifiedProfile.annualSavings = baseProfile.annualSavings + (salaryDelta * SAVINGS_DEPLOYMENT_RATE);
          }
          break;
          
        case 'partner_income_change':
          if (event.payload.newPartnerSalary !== undefined) {
            // Partner income affects household borrowing capacity and savings
            const partnerDelta = event.payload.newPartnerSalary - (event.payload.previousPartnerSalary || 0);
            // Add partner income contribution to borrowing capacity (assume same multiplier)
            modifiedProfile.borrowingCapacity += partnerDelta * modifiedProfile.salaryServiceabilityMultiplier;
            // Add to household savings (same SAVINGS_DEPLOYMENT_RATE as salary deltas)
            modifiedProfile.annualSavings += partnerDelta * SAVINGS_DEPLOYMENT_RATE;
          }
          break;
          
        case 'bonus_windfall':
          // One-time cash event - effect persists for all future periods
          if (event.period <= period && event.payload.bonusAmount !== undefined) {
            oneTimeCashAdjustment += event.payload.bonusAmount;
          }
          break;
          
        // =============================================================================
        // LIFE EVENTS
        // =============================================================================
        case 'inheritance':
          // One-time cash event - effect persists for all future periods
          if (event.period <= period && event.payload.cashAmount !== undefined) {
            oneTimeCashAdjustment += event.payload.cashAmount;
          }
          break;
          
        case 'major_expense':
          // One-time cash event (deduction) - effect persists for all future periods
          if (event.period <= period && event.payload.cashAmount !== undefined) {
            oneTimeCashAdjustment -= event.payload.cashAmount;
          }
          break;
          
        case 'dependent_change':
          if (event.payload.dependentChange !== undefined) {
            modifiedProfile.borrowingCapacity -=
              event.payload.dependentChange * DEPENDENT_BC_PENALTY;
            modifiedProfile.annualSavings -=
              event.payload.dependentChange * DEPENDENT_SAVINGS_PENALTY;
          }
          break;
          
        // =============================================================================
        // MARKET EVENTS
        // =============================================================================
        case 'interest_rate_change':
          // Market-wide rate change - this is handled in the cashflow calculations
          // by storing the rate change and applying it to all loan calculations
          // The profile doesn't directly store interest rate, but we could track it
          // for now, this is a placeholder - actual implementation in cashflow calc
          break;
          
        case 'market_correction':
          // Market correction affects growth rates - handled in property growth calc
          // This is a placeholder - actual implementation would modify growth curve
          break;
          
        // =============================================================================
        // PORTFOLIO EVENTS
        // =============================================================================
        case 'sell_property':
          // Property sale is complex - handled separately in timeline calculation
          // The equity release from sale would be tracked as available funds
          break;
          
        case 'refinance':
          // Refinance at new rate - similar to interest rate change but property-specific
          break;
          
        case 'renovate':
          // Renovation uses cash and increases property value
          // Cash deduction persists for all future periods (money is spent)
          if (event.period <= period && event.payload.renovationCost !== undefined) {
            oneTimeCashAdjustment -= event.payload.renovationCost;
          }
          break;
      }
    }
    
    // Apply cumulative cash adjustments to deposit pool
    // Cash events (inheritance, expense, bonus, renovation) persist from their period onwards
    modifiedProfile.depositPool = baseProfile.depositPool + oneTimeCashAdjustment;
    
    // Ensure values don't go negative
    modifiedProfile.borrowingCapacity = Math.max(0, modifiedProfile.borrowingCapacity);
    modifiedProfile.annualSavings = Math.max(0, modifiedProfile.annualSavings);
    modifiedProfile.depositPool = Math.max(0, modifiedProfile.depositPool);
    
    return modifiedProfile;
  };

  // NOTE: getInterestRateAdjustment and getGrowthRateAdjustment are now imported from '../utils/eventProcessing'
  // They are used throughout this file to apply market events to calculations

  const calculateAvailableFunds = (
      currentPeriod: number, 
      previousPurchases: Array<{ period: number; cost: number; depositRequired: number; totalCashRequired?: number; loanAmount: number; title: string; instanceId: string; loanType?: 'IO' | 'PI'; cumulativeEquityReleased?: number }>
    ): {
      total: number;
      baseDeposit: number;
      cumulativeSavings: number;
      cashflowReinvestment: number;
      equityRelease: number;
      depositsUsed: number;
      // New: Track remaining balances after equity-first allocation
      cashRemaining: number;
      savingsRemaining: number;
      equityRemaining: number;
    } => {
      // ============================================================================
      // EQUITY-FIRST FUNDING ALLOCATION
      // Strategy: Leverage portfolio equity before using cash/savings
      // This matches how BAs help investors accelerate property acquisition
      // ============================================================================
      
      // Get the event-modified profile for this period
      // This applies salary changes, one-time cash events (inheritance, expense), etc.
      const periodProfile = getProfileAtPeriod(currentPeriod, profile, eventBlocks);
      
      // Initialize running balances using event-modified profile
      let runningCashBalance = periodProfile.depositPool; // Starting cash pool (may be modified by events)
      let runningSavingsBalance = 0; // Accumulates over time
      let cumulativeEquityUsed = 0; // Tracks total equity extracted across all purchases
      
      // Calculate existing portfolio equity at current period (from existing properties before this scenario)
      // Uses conservative flat rate for mature properties (configurable in profile)
      // Only include if useExistingEquity toggle is enabled
      let existingPortfolioEquity = 0;
      if (periodProfile.portfolioValue > 0 && profile.useExistingEquity) {
        const growthRate = profile.existingPortfolioGrowthRate || 0.05;
        const grownPortfolioValue = calculateExistingPortfolioGrowthByPeriod(periodProfile.portfolioValue, currentPeriod - 1, growthRate);
        existingPortfolioEquity = Math.max(0, grownPortfolioValue * EQUITY_EXTRACTION_LVR_CAP - periodProfile.currentDebt);
      }
      
      // Process each period chronologically to track running balances.
      // Only SAVINGS_DEPLOYMENT_RATE of annual savings flows into the
      // "available for investment" pool — the rest stays liquid.
      const periodSavings = (periodProfile.annualSavings * SAVINGS_DEPLOYMENT_RATE) / PERIODS_PER_YEAR;
      let totalBaseSavings = 0;
      let totalCashflowReinvestment = 0;
      
      for (let period = 1; period <= currentPeriod; period++) {
        // Calculate net cashflow from properties owned BEFORE this period
        let periodNetCashflow = 0;
        previousPurchases.forEach(purchase => {
          if (purchase.period < period) {
            const periodsOwned = period - purchase.period;
            const propertyData = getPropertyData(purchase.title);
            
            if (propertyData) {
              // Pass purchase.period as basePeriod for correct market correction event timing
              const currentValue = calculatePropertyGrowth(purchase.cost, periodsOwned, propertyData, purchase.period);
              const propertyInstance = getInstance(purchase.instanceId);
              
              if (propertyInstance) {
                const cashflowBreakdown = calculateDetailedCashflow(propertyInstance, purchase.loanAmount);
                const growthFactor = currentValue / purchase.cost;
                const adjustedAnnualCashflow = cashflowBreakdown.netAnnualCashflow * growthFactor;
                const inflationFactor = calculateInflationFactor(periodsOwned);
                const inflationAdjustedCashflow = adjustedAnnualCashflow * inflationFactor;
                periodNetCashflow += inflationAdjustedCashflow / PERIODS_PER_YEAR;
              } else {
                const fallbackInstance = getPropertyInstanceDefaults(purchase.title);
                fallbackInstance.purchasePrice = purchase.cost;
                fallbackInstance.rentPerWeek = (currentValue * (parseFloat(propertyData.yield) / 100)) / 52;
                const fallbackCashflow = calculateDetailedCashflow(fallbackInstance, purchase.loanAmount);
                const growthFactor = currentValue / purchase.cost;
                const adjustedAnnualCashflow = fallbackCashflow.netAnnualCashflow * growthFactor;
                const inflationFactor = calculateInflationFactor(periodsOwned);
                periodNetCashflow += (adjustedAnnualCashflow * inflationFactor) / PERIODS_PER_YEAR;
              }
            }
          }
        });
        
        // Add this period's savings contribution
        // Only deduct negative cashflow (property shortfall you need to cover from savings)
        // Positive cashflow stays in the property portfolio, not added to savings
        const cashflowDeduction = periodNetCashflow < 0 ? periodNetCashflow : 0;
        const periodContribution = periodSavings + cashflowDeduction;
        runningSavingsBalance = Math.max(0, runningSavingsBalance + periodContribution);
        totalBaseSavings += periodSavings;
        totalCashflowReinvestment += cashflowDeduction; // Only track negative cashflow impact
        
        // Calculate extractable equity at this period (from properties bought BEFORE this period)
        let extractableEquityThisPeriod = existingPortfolioEquity;
        previousPurchases.forEach(purchase => {
          if (purchase.period < period) { // Only properties bought before this period have usable equity
            const propertyData = getPropertyData(purchase.title);
            if (propertyData) {
              const periodsOwned = period - purchase.period;
              // Pass purchase.period as basePeriod for correct market correction event timing
              const propertyCurrentValue = calculatePropertyGrowth(purchase.cost, periodsOwned, propertyData, purchase.period);
              const currentLoanAmount = purchase.loanAmount + (purchase.cumulativeEquityReleased || 0);
              const usableEquity = Math.max(0, propertyCurrentValue * EQUITY_EXTRACTION_LVR_CAP - currentLoanAmount);
              extractableEquityThisPeriod += usableEquity;
            }
          }
        });
        
        // Process purchases made in this period
        const purchasesInThisPeriod = previousPurchases.filter(p => p.period === period);
        purchasesInThisPeriod.forEach(purchase => {
          // Use totalCashRequired (deposit + stamp duty + fees) if available, otherwise depositRequired
          const cashNeeded = purchase.totalCashRequired || purchase.depositRequired;
          let remaining = cashNeeded;
          
          // EQUITY-FIRST: 1. Use available equity first
          const availableEquity = Math.max(0, extractableEquityThisPeriod - cumulativeEquityUsed);
          const fromEquity = Math.min(remaining, availableEquity);
          remaining -= fromEquity;
          cumulativeEquityUsed += fromEquity;
          
          // 2. Then use cash (depletes permanently)
          const fromCash = Math.min(remaining, runningCashBalance);
          remaining -= fromCash;
          runningCashBalance = Math.max(0, runningCashBalance - fromCash);
          
          // 3. Finally use savings - use all accumulated savings (already only 25% of total)
          const savingsAvailableForPurchase = runningSavingsBalance;
          const fromSavings = Math.min(remaining, savingsAvailableForPurchase);
          runningSavingsBalance = Math.max(0, runningSavingsBalance - fromSavings);
        });
      }
      
      // Calculate extractable equity at current period (for availability display)
      let totalExtractableEquity = existingPortfolioEquity;
      previousPurchases.forEach(purchase => {
        if (purchase.period < currentPeriod) { // Only properties bought before current period
          const propertyData = getPropertyData(purchase.title);
          if (propertyData) {
            const periodsOwned = currentPeriod - purchase.period;
            const propertyCurrentValue = calculatePropertyGrowth(purchase.cost, periodsOwned, propertyData);
            const currentLoanAmount = purchase.loanAmount + (purchase.cumulativeEquityReleased || 0);
            const usableEquity = Math.max(0, propertyCurrentValue * EQUITY_EXTRACTION_LVR_CAP - currentLoanAmount);
            totalExtractableEquity += usableEquity;
          }
        }
      });
      
      // Calculate remaining balances
      const equityRemaining = Math.max(0, totalExtractableEquity - cumulativeEquityUsed);
      const cashRemaining = runningCashBalance;
      const savingsRemaining = runningSavingsBalance;
      
      // Total available = remaining from each source
      const totalAvailable = cashRemaining + savingsRemaining + equityRemaining;
      
      // Calculate total deposits used (for backwards compatibility)
      const totalDepositsUsed = previousPurchases.reduce((sum, purchase) => {
        if (purchase.period <= currentPeriod) {
          return sum + (purchase.totalCashRequired || purchase.depositRequired);
        }
        return sum;
      }, 0);
      
      return {
        total: totalAvailable,
        baseDeposit: cashRemaining, // Now reflects actual remaining cash
        cumulativeSavings: totalBaseSavings,
        cashflowReinvestment: totalCashflowReinvestment,
        equityRelease: totalExtractableEquity,
        depositsUsed: totalDepositsUsed,
        // New fields for accurate tracking
        cashRemaining,
        savingsRemaining,
        equityRemaining,
        totalEquityUsed: cumulativeEquityUsed, // Total equity used across all purchases
      };
    };

  const checkAffordability = (
    property: any,
    availableFunds: number,
    previousPurchases: Array<{ period: number; cost: number; depositRequired: number; loanAmount: number; title: string; instanceId: string; loanType?: 'IO' | 'PI'; cumulativeEquityReleased?: number }>,
    currentPeriod: number
  ): { canAfford: boolean } => {
      
      // Calculate key financial metrics for debugging
      const baseDeposit = calculatedValues.availableDeposit;
      const annualSavings = profile.annualSavings;
      
      // Calculate net cashflow from all current properties
      let netCashflow = 0;
      let grossRentalIncome = 0;
      let loanInterest = 0;
      let expenses = 0;
      
      // CRITICAL: Add rental income from EXISTING portfolio (before this scenario)
      // The existing portfolio generates rental income that helps serviceability
      if (profile.portfolioValue > 0) {
        const existingGrowthRate = profile.existingPortfolioGrowthRate || 0.05;
        const grownPortfolioValue = calculateExistingPortfolioGrowthByPeriod(profile.portfolioValue, currentPeriod - 1, existingGrowthRate);
        const existingRentalYield = profile.existingRentalYield || 0.04; // Default 4% yield
        const existingAnnualRent = grownPortfolioValue * existingRentalYield;
        // Apply flat 80% recognition rate (matches bank practice)
        const existingRecognizedRent = existingAnnualRent * RENTAL_RECOGNITION_RATE;
        grossRentalIncome += existingRecognizedRent;
        
        // Also add existing portfolio's loan interest to track
        if (profile.currentDebt > 0) {
          const effectiveRate = getEffectiveInterestRate(currentPeriod, eventBlocks);
          loanInterest += profile.currentDebt * effectiveRate;
        }
      }
      
      // Expense breakdown accumulators
      let accCouncilRatesWater = 0;
      let accStrataFees = 0;
      let accInsurance = 0;
      let accManagementFees = 0;
      let accRepairsMaintenance = 0;
      let accLandTax = 0;
      let accOther = 0;
      
      previousPurchases.forEach(purchase => {
        if (purchase.period <= currentPeriod) {
          const periodsOwned = currentPeriod - purchase.period;
          const propertyData = getPropertyData(purchase.title);
          
        if (propertyData) {
          // Calculate current property value with tiered growth
          // Pass purchase.period as basePeriod for correct market correction event timing
          const currentValue = calculatePropertyGrowth(purchase.cost, periodsOwned, propertyData, purchase.period);
          
          // Get property instance for detailed cashflow calculation
          const propertyInstance = getInstance(purchase.instanceId);
          
          if (propertyInstance) {
            // Calculate detailed cashflow using all 39 inputs
            const cashflowBreakdown = calculateDetailedCashflow(propertyInstance, purchase.loanAmount);
            
            // Adjust for property growth (rent increases with property value)
            const growthFactor = currentValue / purchase.cost;
            const adjustedIncome = cashflowBreakdown.adjustedIncome * growthFactor;
            
            // Apply inflation - expenses only grow with inflation, NOT property value
            const inflationFactor = calculateInflationFactor(periodsOwned);
            const inflationAdjustedIncome = adjustedIncome * inflationFactor;
            
            // BUG FIX: Operating expenses should NOT grow with property value (growthFactor)
            // Only rent grows with property value; expenses only grow with inflation
            const inflationAdjustedOperatingExpenses = cashflowBreakdown.totalOperatingExpenses * inflationFactor;
            
            // CRITICAL FIX: Exclude principal payments from non-deductible expenses
            // Non-deductible expenses (like land tax) also only grow with inflation
            const inflationAdjustedNonDeductible = (cashflowBreakdown.totalNonDeductibleExpenses - cashflowBreakdown.principalPayments) * inflationFactor;
            
            // Apply progressive rental recognition based on portfolio size
            const portfolioSize = previousPurchases.filter(p => p.period < currentPeriod).length;
            const recognitionRate = RENTAL_RECOGNITION_RATE;
            const recognizedIncome = inflationAdjustedIncome * recognitionRate;
            
            // Calculate net cashflow (income - expenses - interest - principal)
            const propertyCashflow = recognizedIncome - inflationAdjustedOperatingExpenses - inflationAdjustedNonDeductible - cashflowBreakdown.loanInterest - cashflowBreakdown.principalPayments;
            
            grossRentalIncome += recognizedIncome;
            loanInterest += cashflowBreakdown.loanInterest;
            expenses += (inflationAdjustedOperatingExpenses + inflationAdjustedNonDeductible); // Operating + Land Tax ONLY (no principal)
            netCashflow += propertyCashflow;
            
            // Accumulate expense breakdown components (only inflation, NOT property growth)
            accCouncilRatesWater += cashflowBreakdown.councilRatesWater * inflationFactor;
            accStrataFees += cashflowBreakdown.strata * inflationFactor;
            accInsurance += cashflowBreakdown.buildingInsurance * inflationFactor;
            accManagementFees += cashflowBreakdown.propertyManagementFee * inflationFactor;
            accRepairsMaintenance += cashflowBreakdown.maintenance * inflationFactor;
            accLandTax += cashflowBreakdown.landTax * inflationFactor;
          } else {
            // Fallback: Use property type defaults for detailed cashflow (shouldn't happen normally)
const fallbackInstance = getPropertyInstanceDefaults(purchase.title);
            const yieldRate = parseFloat(propertyData.yield) / 100;
            const portfolioSize = previousPurchases.filter(p => p.period < currentPeriod).length;
            const recognitionRate = RENTAL_RECOGNITION_RATE;
            
            // Override with actual purchase values
            fallbackInstance.purchasePrice = purchase.cost;
            fallbackInstance.rentPerWeek = (currentValue * yieldRate) / 52;
            
            const fallbackCashflow = calculateDetailedCashflow(fallbackInstance, purchase.loanAmount);
            const growthFactor = currentValue / purchase.cost;
            const inflationFactor = calculateInflationFactor(periodsOwned);
            
            // Apply recognition rate and adjustments
            // Income grows with both property value AND inflation
            const adjustedIncome = fallbackCashflow.adjustedIncome * growthFactor * inflationFactor * recognitionRate;
            // Expenses only grow with inflation, NOT property value
            const adjustedExpenses = (fallbackCashflow.totalOperatingExpenses + fallbackCashflow.totalNonDeductibleExpenses - fallbackCashflow.principalPayments) * inflationFactor;
            
            grossRentalIncome += adjustedIncome;
            loanInterest += fallbackCashflow.loanInterest;
            expenses += adjustedExpenses;
            netCashflow += (adjustedIncome - fallbackCashflow.loanInterest - adjustedExpenses - fallbackCashflow.principalPayments);
            
            // Accumulate expense breakdown from fallback (only inflation, NOT property growth)
            accCouncilRatesWater += fallbackCashflow.councilRatesWater * inflationFactor;
            accStrataFees += fallbackCashflow.strata * inflationFactor;
            accInsurance += fallbackCashflow.buildingInsurance * inflationFactor;
            accManagementFees += fallbackCashflow.propertyManagementFee * inflationFactor;
            accRepairsMaintenance += fallbackCashflow.maintenance * inflationFactor;
            accLandTax += fallbackCashflow.landTax * inflationFactor;
          }
          }
        }
      });
      
      // Calculate total existing debt
      // CRITICAL: Include cumulative equity released (which increases loan amounts)
      let totalExistingDebt = profile.currentDebt;
      previousPurchases.forEach(purchase => {
        if (purchase.period <= currentPeriod) {
          // Current loan = original loan + any equity released from this property
          const currentLoanAmount = purchase.loanAmount + (purchase.cumulativeEquityReleased || 0);
          totalExistingDebt += currentLoanAmount;
        }
      });
      
      // Calculate portfolio value
      let totalPortfolioValue = profile.portfolioValue;
      let propertyValues: number[] = [];
      let usableEquityPerProperty: number[] = [];
      
        if (profile.portfolioValue > 0 && profile.useExistingEquity) {
          // Use configurable flat rate for existing portfolio (mature properties)
          const growthRate = profile.existingPortfolioGrowthRate || 0.05;
          const grownPortfolioValue = calculateExistingPortfolioGrowthByPeriod(profile.portfolioValue, currentPeriod - 1, growthRate);
          propertyValues.push(grownPortfolioValue);
          
          // Continuous equity release - LVR cap, no time constraint
          const portfolioEquity = Math.max(0, grownPortfolioValue * EQUITY_EXTRACTION_LVR_CAP - profile.currentDebt);
          usableEquityPerProperty.push(portfolioEquity);
        }
        
        previousPurchases.forEach(purchase => {
          if (purchase.period <= currentPeriod) {
            const periodsOwned = currentPeriod - purchase.period;
            const propertyData = getPropertyData(purchase.title);
            if (propertyData) {
              const currentValue = calculatePropertyGrowth(purchase.cost, periodsOwned, propertyData);
              totalPortfolioValue += currentValue;
              propertyValues.push(currentValue);
              
              // Continuous equity release - 80% LVR cap, no time constraint
              // Current loan = original loan + any equity released so far
              const currentLoanAmount = purchase.loanAmount + (purchase.cumulativeEquityReleased || 0);
              const usableEquity = Math.max(0, currentValue * EQUITY_EXTRACTION_LVR_CAP - currentLoanAmount);
              usableEquityPerProperty.push(usableEquity);
            }
          }
        });
      
      const totalUsableEquity = usableEquityPerProperty.reduce((sum, equity) => sum + equity, 0);
      
      // Calculate DYNAMIC borrowing capacity based on equity
      const equityBoost = totalUsableEquity * profile.equityFactor; // Use equityFactor from profile (typically 0.70-0.75)
      const effectiveBorrowingCapacity = profile.borrowingCapacity + equityBoost;
      
      const newLoanAmount = property.cost - property.depositRequired;
      const totalDebtAfterPurchase = totalExistingDebt + newLoanAmount;
      
      // NEW SERVICEABILITY-BASED DEBT TEST
      // Calculate annual loan payments for all properties (IO or P&I)
      // Apply market-wide interest rate adjustments from events
      let totalAnnualLoanPayment = 0;
      
      // Get the effective interest rate for this period (market-wide adjustment)
      const effectiveMarketRate = getEffectiveInterestRate(currentPeriod, eventBlocks);
      
      // Existing debt payment (use event-adjusted market rate)
      if (profile.currentDebt > 0) {
        totalAnnualLoanPayment += calculateAnnualLoanPayment(profile.currentDebt, effectiveMarketRate, 'IO');
      }
      
      // Previous purchases loan payments (use their instance interest rates + refinance events)
      previousPurchases.forEach(purchase => {
        if (purchase.period <= currentPeriod) {
          // Get property-specific effective rate (considers refinance events)
          const purchaseEffectiveRate = getPropertyEffectiveRate(
            currentPeriod,
            eventBlocks,
            purchase.instanceId
          );
          const purchaseLoanType = purchase.loanType || 'IO';
          totalAnnualLoanPayment += calculateAnnualLoanPayment(purchase.loanAmount, purchaseEffectiveRate, purchaseLoanType);
        }
      });
      
      // Get property instance for interest rate and LMI waiver
      const propertyInstance = getInstance(property.instanceId);
      // Get property-specific effective rate (considers refinance events)
      const propertyInterestRate = getPropertyEffectiveRate(
        currentPeriod,
        eventBlocks,
        property.instanceId
      );
      const lmiWaiver = propertyInstance?.lmiWaiver ?? false;
      
      // Add new property loan payment (use event-adjusted property interest rate)
      const newPropertyLoanType = property.loanType || 'IO';
      const newPropertyLoanPayment = calculateAnnualLoanPayment(newLoanAmount, propertyInterestRate, newPropertyLoanType);
      totalAnnualLoanPayment += newPropertyLoanPayment;
      
      // Calculate rental income from new property for DSR calculation
      // CRITICAL: Use instance rentPerWeek if available, not template yield
      const affordPropertyInstance = getInstance(property.instanceId);
      const propertyData = getPropertyData(property.title);
      let newPropertyRentalIncome = 0;
      if (affordPropertyInstance) {
        // Use actual instance rent (agent-editable)
        const annualRent = affordPropertyInstance.rentPerWeek * 52;
        const vacancyAdjusted = annualRent * (1 - DEFAULT_VACANCY_RATE);
        const portfolioSize = previousPurchases.filter(p => p.period <= currentPeriod).length;
        const recognitionRate = RENTAL_RECOGNITION_RATE;
        newPropertyRentalIncome = vacancyAdjusted * recognitionRate;
      } else if (propertyData) {
        // Fallback to template yield
        const yieldRate = parseFloat(propertyData.yield) / 100;
        const portfolioSize = previousPurchases.filter(p => p.period <= currentPeriod).length;
        const recognitionRate = RENTAL_RECOGNITION_RATE;
        newPropertyRentalIncome = property.cost * yieldRate * recognitionRate;
      }
      
      // Total rental income including new property
      const totalRentalIncome = grossRentalIncome + newPropertyRentalIncome;
      const affordPropertyInstanceForCosts = affordPropertyInstance ?? getPropertyInstanceDefaults(property.title || 'Default');
      
      // Use LVR from instance
      const affordInstanceLvr = affordPropertyInstance?.lvr ?? ((newLoanAmount / property.cost) * 100);
      
      // Calculate stamp duty (with override support)
      const affordStampDuty = affordPropertyInstanceForCosts.stampDutyOverride ?? calculateStampDuty(
        affordPropertyInstanceForCosts.state,
        property.cost,
        false
      );
      
      // Calculate LMI (using valuationAtPurchase for effective LVR calculation)
      const affordLmi = calculateLMI(
        newLoanAmount,
        affordInstanceLvr,
        lmiWaiver,
        affordPropertyInstanceForCosts.valuationAtPurchase,
        property.cost
      );
      
      // Calculate deposit balance
      const affordDepositBalance = calculateDepositBalance(
        property.cost,
        affordInstanceLvr,
        affordPropertyInstanceForCosts.conditionalHoldingDeposit
      );
      
      // Calculate all one-off costs using property instance
      const affordOneOffCosts = calculateOneOffCosts(
        affordPropertyInstanceForCosts,
        affordStampDuty,
        affordDepositBalance
      );
      
      // Add LMI to total cash required
      const totalCashRequired = affordOneOffCosts.totalCashRequired + affordLmi;
      
      // Enhanced serviceability test with rental income contribution
      const baseCapacity = profile.borrowingCapacity * SERVICEABILITY_FACTOR;
      const rentalContribution = totalRentalIncome * RENTAL_SERVICEABILITY_CONTRIBUTION_RATE;
      const enhancedCapacity = baseCapacity + rentalContribution;
      const maxAnnualPayment = enhancedCapacity;
      const serviceabilityTestSurplus = maxAnnualPayment - totalAnnualLoanPayment;
      const serviceabilityTestPass = serviceabilityTestSurplus >= 0;
      
      // BORROWING CAPACITY TEST: New loan amount cannot exceed EFFECTIVE (dynamic) borrowing capacity
      const borrowingCapacityTestPass = newLoanAmount <= effectiveBorrowingCapacity;
      const borrowingCapacityTestSurplus = effectiveBorrowingCapacity - newLoanAmount;
      
      // DEPOSIT TEST: Available funds must cover deposit + all acquisition costs
      const canAffordDeposit = availableFunds >= totalCashRequired;
      const canAffordServiceability = serviceabilityTestPass;
      const canAffordBorrowingCapacity = borrowingCapacityTestPass;
      
      // Debug trace output
      if (DEBUG_MODE) {
        const timelineDisplay = periodToDisplay(currentPeriod);
        const timelineYear = periodToYear(currentPeriod);
        const depositPool = availableFunds;
        const equityFreed = 0;
        const rentalIncome = grossRentalIncome;
        const adjustedCapacity = effectiveBorrowingCapacity;
        const baseCapacity = profile.borrowingCapacity;
        const serviceabilityMethod = 'borrowing-capacity';
        const existingDebt = totalExistingDebt;
        const newLoan = newLoanAmount;
        const totalDebt = totalDebtAfterPurchase;
        const depositPass = canAffordDeposit;
        const serviceabilityPass = canAffordServiceability;
        const purchaseDecision = canAffordServiceability && canAffordDeposit ? timelineDisplay : '❌';
        const requiredDeposit = property.depositRequired;

        // === AVAILABLE FUNDS BREAKDOWN ===
        const cumulativeSavings = annualSavings * (currentPeriod / PERIODS_PER_YEAR);
        const continuousEquityAccess = totalUsableEquity;
        const totalAnnualSavings = profile.annualSavings + netCashflow; // Self-funding flywheel
        
        // === SELF-FUNDING FLYWHEEL ===
        // === EQUITY BREAKDOWN ===
        propertyValues.forEach((value, i) => {
          const equity = usableEquityPerProperty[i];
          });

        // === CASHFLOW BREAKDOWN ===
        // === SERVICEABILITY TEST ===
        const annualLoanPayment = totalAnnualLoanPayment;
        const maxAnnualPaymentValue = maxAnnualPayment;
        const serviceabilitySurplus = serviceabilityTestSurplus;
        
        // === DYNAMIC BORROWING CAPACITY ===
// === DEBT POSITION ===
        // === BORROWING CAPACITY CHECK ===
// === STRATEGY INSIGHTS ===
        const portfolioScalingVelocity = previousPurchases.filter(p => p.period <= currentPeriod).length;
        const selfFundingEfficiency = netCashflow > 0 ? (netCashflow / totalAnnualSavings * 100) : 0;
        const equityRecyclingImpact = continuousEquityAccess > 0 ? (continuousEquityAccess / depositPool * 100) : 0;
// === FINAL DECISION ===
}
      
      if (!canAffordDeposit) {
        return { canAfford: false };
      }
      
      // Check if all tests pass
      if (canAffordServiceability && canAffordBorrowingCapacity) {
        return { canAfford: true };
      }
      
      return { canAfford: false };
    };

  const calculateTimelineProperties = useMemo((): TimelineProperty[] => {
    // Helper function to check if a period falls within any pause block
    const isPausedPeriod = (
      period: number, 
      propertyIndex: number
    ): boolean => {
      // Calculate which pause blocks should be active based on property sequence
      let propertiesProcessed = 0;
      let pausesProcessed = 0;
      let totalItemsProcessed = 0;
      
      // Walk through the sequence to determine if we're in a pause at this property index
      for (let i = 0; i <= propertyIndex; i++) {
        // Check if we should insert a pause at this position
        while (pausesProcessed < pauseBlocks.length && 
               pauseBlocks[pausesProcessed].order === totalItemsProcessed) {
          pausesProcessed++;
          totalItemsProcessed++;
        }
        
        if (i < propertyIndex) {
          propertiesProcessed++;
          totalItemsProcessed++;
        }
      }
      
      // Now check if there's an active pause at the current property index
      if (pausesProcessed < pauseBlocks.length && 
          pauseBlocks[pausesProcessed].order === totalItemsProcessed) {
        // Calculate pause period range
        // The pause starts after the last property and extends for the pause duration
        // This is handled by the main loop - we just need to know if we should skip this period
        return false; // Pauses are handled by extending the timeline, not blocking periods
      }
      
      return false;
    };

    const determineNextPurchasePeriod = (
      property: any,
      previousPurchases: Array<{ period: number; cost: number; depositRequired: number; totalCashRequired?: number; loanAmount: number; title: string; instanceId: string; loanType?: 'IO' | 'PI'; cumulativeEquityReleased?: number }>,
      propertyIndex: number
    ): { period: number } => {
      let currentPurchases = [...previousPurchases];
      let iterationCount = 0;
      const maxPeriods = profile.timelineYears * PERIODS_PER_YEAR;
      const maxIterations = profile.timelineYears * PERIODS_PER_YEAR * 2; // Double the periods
      
      // Calculate pause offset: how many periods to add due to pauses before this property
      let pausePeriodsToAdd = 0;
      let itemsProcessed = 0;
      
      // Determine pauses that should occur before this property
      for (let i = 0; i < pauseBlocks.length; i++) {
        const pause = pauseBlocks[i];
        if (pause.order <= propertyIndex) {
          pausePeriodsToAdd += Math.ceil(pause.duration * PERIODS_PER_YEAR);
        }
      }
      
      // FIFO ORDERING: Each property must be purchased at or after the previous property's period
      // This ensures properties are added in the order the user specified
      const minPeriod = previousPurchases.length > 0 
        ? previousPurchases[previousPurchases.length - 1].period 
        : 1;
      
      for (let period = minPeriod; period <= maxPeriods + pausePeriodsToAdd; period++) {
        iterationCount++;
        if (iterationCount > maxIterations) {
return { period: Infinity };
        }
        
        // Check if this period is within a pause range
        let isInPause = false;
        let pauseEndPeriod = 0;
        
        // Calculate pause periods based on purchase sequence
        let currentPauseStartPeriod = 0;
        for (let i = 0; i < pauseBlocks.length; i++) {
          const pause = pauseBlocks[i];
          
          // Find when this pause should start (after property at pause.order position)
          if (pause.order <= propertyIndex) {
            // Find the last purchase period before or at this pause order
            const purchasesBeforePause = previousPurchases.filter((_, idx) => idx < pause.order);
            if (purchasesBeforePause.length > 0) {
              const lastPurchasePeriod = Math.max(...purchasesBeforePause.map(p => p.period));
              currentPauseStartPeriod = lastPurchasePeriod + 1;
              pauseEndPeriod = currentPauseStartPeriod + Math.ceil(pause.duration * PERIODS_PER_YEAR);
              
              if (period >= currentPauseStartPeriod && period < pauseEndPeriod) {
                isInPause = true;
                break;
              }
            }
          }
        }
        
        if (isInPause) {
          if (DEBUG_MODE) {
            }
          continue;
        }
        
        // PURCHASE VELOCITY LIMIT - check against max purchases per year from profile
        // Calculate which year this period is in and count purchases for that year
        const currentYear = Math.floor((period - 1) / PERIODS_PER_YEAR);
        const yearStartPeriod = currentYear * PERIODS_PER_YEAR + 1;
        const yearEndPeriod = yearStartPeriod + PERIODS_PER_YEAR - 1;
        const purchasesThisYear = currentPurchases.filter(p => p.period >= yearStartPeriod && p.period <= yearEndPeriod).length;
        const maxPurchasesPerYear = profile.maxPurchasesPerYear || 3;
        
        if (purchasesThisYear >= maxPurchasesPerYear) {
          if (DEBUG_MODE) {
            }
          continue; // Skip to the next period - year limit reached
        }
        
        // Check if property instance exists
        // If not, we'll just use template defaults for this calculation
        // DON'T call createInstance here - it will be created in useEffect
        const propertyInstance = getInstance(property.instanceId);
        if (!propertyInstance) {
          // Just log - instance will be created in useEffect
          if (DEBUG_MODE) {
}
        }
        
        const availableFunds = calculateAvailableFunds(period, currentPurchases);
        const affordabilityResult = checkAffordability(property, availableFunds.total, currentPurchases, period);
        
        if (affordabilityResult.canAfford) {
          return { period };
        }
      }
      
      return { period: Infinity };
    };

    // Main calculation logic - Create a list of all properties to purchase
    // Use propertyOrder to maintain user-defined insertion order (FIFO)
    const allPropertiesToPurchase: Array<{ property: any; index: number; instanceId: string }> = [];
    
    // If propertyOrder is available and non-empty, use it to determine order
    if (propertyOrder && propertyOrder.length > 0) {
      propertyOrder.forEach((instanceId) => {
        // Parse instanceId format: "propertyId_instance_index"
        const parts = instanceId.split('_instance_');
        if (parts.length === 2) {
          const propertyId = parts[0];
          const index = parseInt(parts[1], 10);
          const property = propertyTypes.find(p => p.id === propertyId);
          if (property) {
            allPropertiesToPurchase.push({ property, index, instanceId });
          }
        }
      });
    } else {
      // Fallback to old behavior if propertyOrder is not available (backwards compatibility)
      Object.entries(selections).forEach(([propertyId, quantity]) => {
        if (quantity > 0) {
          const property = propertyTypes.find(p => p.id === propertyId);
          if (property) {
            for (let i = 0; i < quantity; i++) {
              // Generate a stable instanceId for this property (based on propertyId and index)
              // This ensures the same property in the same position keeps its loan type setting
              const instanceId = `${propertyId}_instance_${i}`;
              allPropertiesToPurchase.push({ property, index: i, instanceId });
            }
          }
        }
      });
    }

    const timelineProperties: TimelineProperty[] = [];
    let purchaseHistory: Array<{ period: number; cost: number; depositRequired: number; totalCashRequired?: number; loanAmount: number; title: string; instanceId: string; loanType?: 'IO' | 'PI'; cumulativeEquityReleased?: number }> = [];
    
    // Process properties sequentially, determining purchase period for each
    allPropertiesToPurchase.forEach(({ property, index, instanceId }, globalIndex) => {
      // Get the correct values from the instance (if it has been updated)
      const propertyInstance = getInstance(instanceId);
      const correctPurchasePrice = propertyInstance?.purchasePrice ?? property.cost;
      
      // CRITICAL: Use instance LVR for loan amount calculation, not template deposit percentage
      // This ensures agent edits to LVR are reflected in calculations
      const instanceLvr = propertyInstance?.lvr ?? ((property.cost - property.depositRequired) / property.cost * 100);
      const baseLoanAmount = correctPurchasePrice * (instanceLvr / 100);
      const correctDepositRequired = correctPurchasePrice - baseLoanAmount;
      
      // Calculate LMI early to determine if it affects loan amount (when capitalized)
      // LMI is based on the base loan amount before capitalization
      const earlyLmi = calculateLMI(
        baseLoanAmount,
        instanceLvr,
        propertyInstance?.lmiWaiver ?? false,
        propertyInstance?.valuationAtPurchase,
        correctPurchasePrice
      );
      
      // Check if LMI is being capitalized into the loan
      const isLmiCapitalized = propertyInstance?.lmiCapitalized ?? false;
      
      // Final loan amount includes LMI if capitalized (increases debt but reduces upfront cash)
      const correctLoanAmount = isLmiCapitalized ? baseLoanAmount + earlyLmi : baseLoanAmount;
      
      // Attach instanceId to property for use in determineNextPurchasePeriod
      const propertyWithInstance = { ...property, instanceId, cost: correctPurchasePrice, depositRequired: correctDepositRequired };
      
      // MANUAL PLACEMENT MODE: Check if property has been manually placed via drag-and-drop
      // If so, use the manual placement period instead of auto-calculating
      let result: { period: number };
      
      if (propertyInstance?.isManuallyPlaced && propertyInstance?.manualPlacementPeriod !== undefined) {
        // Use the manually specified period
        result = { period: propertyInstance.manualPlacementPeriod };
        if (DEBUG_MODE) {
          }
      } else {
        // Auto-calculate the purchase period based on affordability
        result = determineNextPurchasePeriod(propertyWithInstance, purchaseHistory, globalIndex);
      }
      
      const loanAmount = correctLoanAmount;
      
      // Calculate portfolio metrics at time of purchase
      let portfolioValueAfter = 0;
      let totalEquityAfter = 0;
      let availableFundsUsed = 0;
      let totalDebtAfter = 0;
      
      // Initialize cashflow variables with default values
      let grossRentalIncome = 0;
      let loanInterest = 0;
      let expenses = 0;
      let netCashflow = 0;
      let portfolioSize = 0;
      let rentalRecognitionRate = 0.80;
      
      // Expense breakdown accumulators for timeline
      let timelineAccCouncilRatesWater = 0;
      let timelineAccStrataFees = 0;
      let timelineAccInsurance = 0;
      let timelineAccManagementFees = 0;
      let timelineAccRepairsMaintenance = 0;
      let timelineAccLandTax = 0;
      let timelineAccOther = 0;
      
      if (result.period !== Infinity) {
        const purchasePeriod = result.period;
        
        // Calculate existing portfolio value (with growth)
        // Uses configurable flat rate for mature properties
        if (profile.portfolioValue > 0) {
          const growthRate = profile.existingPortfolioGrowthRate || 0.05;
          portfolioValueAfter += calculateExistingPortfolioGrowthByPeriod(profile.portfolioValue, purchasePeriod - 1, growthRate);
        }
        
        // Calculate total debt from existing portfolio
        totalDebtAfter = profile.currentDebt;
        
        // Add all previous purchases (with growth based on periods owned)
        // CRITICAL FIX: Only include purchases made by or before the current purchase period
        purchaseHistory.forEach(purchase => {
          if (purchase.period <= purchasePeriod) {
            const periodsOwned = purchasePeriod - purchase.period;
            const propertyData = getPropertyData(purchase.title);
            if (propertyData) {
              portfolioValueAfter += calculatePropertyGrowth(purchase.cost, periodsOwned, propertyData);
              // Current loan = original loan + any equity released so far
              const currentLoanAmount = purchase.loanAmount + (purchase.cumulativeEquityReleased || 0);
              totalDebtAfter += currentLoanAmount;
            }
          }
        });
        
        // Add the current property being purchased (use correct purchase price)
        portfolioValueAfter += correctPurchasePrice;
        totalDebtAfter += loanAmount;
        
        // Calculate equity
        totalEquityAfter = portfolioValueAfter - totalDebtAfter;
        
        // Calculate available funds used
        const fundsBreakdown = calculateAvailableFunds(purchasePeriod, purchaseHistory);
        availableFundsUsed = fundsBreakdown.total;
        
        // Calculate cashflow breakdown for this property
        // Calculate portfolio size for rental recognition
        portfolioSize = purchaseHistory.filter(p => p.period <= purchasePeriod).length + 1;
        rentalRecognitionRate = RENTAL_RECOGNITION_RATE;
        
        // Get the loan type for this instance (default to 'IO' if not set)
        const currentInstanceLoanType = timelineLoanTypes[instanceId] || 'IO';
        
        // Calculate cashflow from all properties including this one (use correct purchase price from top of loop)
        [...purchaseHistory, { period: purchasePeriod, cost: correctPurchasePrice, depositRequired: correctDepositRequired, loanAmount: loanAmount, title: property.title, instanceId: instanceId, loanType: currentInstanceLoanType }].forEach(purchase => {
          const periodsOwned = purchasePeriod - purchase.period;
          const propertyData = getPropertyData(purchase.title);
          
          if (propertyData && purchase.period <= purchasePeriod) {
            // Get property instance if it exists (user customizations)
            const propertyInstance = getInstance(purchase.instanceId);
            
            // Use instance data if available, otherwise use defaults
            const propertyDetails = propertyInstance 
              ? applyPropertyOverrides(propertyData, propertyInstance)
              : propertyData;
            
            // Calculate current property value with tiered growth
            const currentValue = calculatePropertyGrowth(purchase.cost, periodsOwned, propertyData);
            
            // Calculate land tax if not overridden
            const landTax = propertyDetails.landTaxOverride ?? calculateLandTax(
              propertyDetails.state,
              currentValue
            );
            
            // Update property details with calculated land tax for cashflow calculation
            const propertyWithLandTax = {
              ...propertyDetails,
              landTaxOverride: propertyDetails.landTaxOverride ?? landTax
            };
            
            // 1. Calculate Growth & Inflation Factors
            const growthFactor = currentValue / purchase.cost;
            const inflationFactor = calculateInflationFactor(periodsOwned);
            
            // 2. Calculate Detailed Cashflow (Base)
            // This gets us the base rent and expenses for the property instance
            const cashflowBreakdown = calculateDetailedCashflow(
              propertyWithLandTax,
              purchase.loanAmount
            );
            
            // 3. Apply Growth to Rent (Fixing the "Static Rent" bug)
            // Rent should grow in proportion to property value
            const adjustedRentalIncome = cashflowBreakdown.adjustedIncome * growthFactor;
            
            // 4. Apply Inflation to Expenses
            // CRITICAL FIX: Separate Principal from Expenses to avoid double-counting
            const inflationAdjustedOperating = cashflowBreakdown.totalOperatingExpenses * inflationFactor;
            
            // IMPORTANT: totalNonDeductibleExpenses includes principalPayments + landTax
            // We must exclude principalPayments to avoid double-counting in the netCashflow formula
            const nonDeductibleWithoutPrincipal = cashflowBreakdown.totalNonDeductibleExpenses - cashflowBreakdown.principalPayments;
            const inflationAdjustedNonDeductible = nonDeductibleWithoutPrincipal * inflationFactor;
            
            // 5. Calculate Final Component Values (Operating + Non-Deductible WITHOUT Principal)
            const totalExpenses = inflationAdjustedOperating + inflationAdjustedNonDeductible;
            
            // 6. Update Accumulators for the UI
            grossRentalIncome += adjustedRentalIncome;
            loanInterest += cashflowBreakdown.loanInterest; // Interest ONLY
            expenses += totalExpenses; // Operating + Land Tax ONLY (Principal excluded)
            
            // Accumulate expense breakdown components (only inflation, NOT property growth)
            timelineAccCouncilRatesWater += cashflowBreakdown.councilRatesWater * inflationFactor;
            timelineAccStrataFees += cashflowBreakdown.strata * inflationFactor;
            timelineAccInsurance += cashflowBreakdown.buildingInsurance * inflationFactor;
            timelineAccManagementFees += cashflowBreakdown.propertyManagementFee * inflationFactor;
            timelineAccRepairsMaintenance += cashflowBreakdown.maintenance * inflationFactor;
            timelineAccLandTax += cashflowBreakdown.landTax * inflationFactor;
          }
        });
        
        // 7. Correct Net Cashflow Formula
        // Net = Income - Expenses - Interest - Principal Repayments
        // Note: We need to calculate total principal payments separately
        let totalPrincipalPayments = 0;
        [...purchaseHistory, { period: purchasePeriod, cost: correctPurchasePrice, depositRequired: correctDepositRequired, loanAmount: loanAmount, title: property.title, instanceId: instanceId, loanType: currentInstanceLoanType }].forEach(purchase => {
          const periodsOwned = purchasePeriod - purchase.period;
          const propertyData = getPropertyData(purchase.title);
          
          if (propertyData && purchase.period <= purchasePeriod) {
            const propertyInstance = getInstance(purchase.instanceId);
            const propertyDetails = propertyInstance 
              ? applyPropertyOverrides(propertyData, propertyInstance)
              : propertyData;
            
            const currentValue = calculatePropertyGrowth(purchase.cost, periodsOwned, propertyData);
            const landTax = propertyDetails.landTaxOverride ?? calculateLandTax(
              propertyDetails.state,
              currentValue
            );
            
            const propertyWithLandTax = {
              ...propertyDetails,
              landTaxOverride: propertyDetails.landTaxOverride ?? landTax
            };
            
            const cashflowBreakdown = calculateDetailedCashflow(
              propertyWithLandTax,
              purchase.loanAmount
            );
            
            totalPrincipalPayments += cashflowBreakdown.principalPayments;
          }
        });
        
        netCashflow = grossRentalIncome - expenses - loanInterest - totalPrincipalPayments;
      }
      
      // Calculate all purchase costs for this property (using instance fields for all 39 inputs)
      const timelinePropertyInstance = getInstance(instanceId);
      const propertyInstanceForCosts = timelinePropertyInstance ?? getPropertyInstanceDefaults(property.title);
      
      // Note: instanceLvr already defined above from property instance
      
      // Calculate stamp duty (with override support)
      const stampDuty = propertyInstanceForCosts.stampDutyOverride ?? calculateStampDuty(
        propertyInstanceForCosts.state,
        correctPurchasePrice,
        false
      );
      
      // Use the LMI calculated earlier (earlyLmi) for consistency
      // This ensures the same LMI value is used for both loan amount and cash required calculations
      const lmi = earlyLmi;
      
      // Calculate deposit balance
      const depositBalance = calculateDepositBalance(
        correctPurchasePrice,
        instanceLvr,
        propertyInstanceForCosts.conditionalHoldingDeposit
      );
      
      // Calculate all one-off costs using property instance (includes all 12 purchase cost fields)
      const oneOffCosts = calculateOneOffCosts(
        propertyInstanceForCosts,
        stampDuty,
        depositBalance
      );
      
      // Add LMI to total cash required ONLY if not capitalized into the loan
      // When LMI is capitalized, it's added to the loan amount instead of paid upfront
      const lmiCashRequired = isLmiCapitalized ? 0 : lmi;
      const totalCashRequired = oneOffCosts.totalCashRequired + lmiCashRequired;
      
      // Calculate test results
      const depositTestSurplus = availableFundsUsed - totalCashRequired;
      const depositTestPass = depositTestSurplus >= 0;
      
      // Enhanced serviceability test with rental income contribution
      const baseCapacity = profile.borrowingCapacity * SERVICEABILITY_FACTOR;
      const rentalContribution = grossRentalIncome * RENTAL_SERVICEABILITY_CONTRIBUTION_RATE;
      const enhancedCapacity = baseCapacity + rentalContribution;
      const maxAnnualInterest = enhancedCapacity;
      const serviceabilityTestSurplus = maxAnnualInterest - loanInterest;
      const serviceabilityTestPass = serviceabilityTestSurplus >= 0;
      
      // Initialize funds breakdown variables with defaults
      let cumulativeSavings = 0;
      let baseDeposit = 0;
      let equityRelease = 0;
      let cashflowReinvestment = 0;
      
      // Funding breakdown for THIS purchase (SINGLE SOURCE OF TRUTH)
      let fundingFromCash = 0;
      let fundingFromSavings = 0;
      let fundingFromEquity = 0;
      
      // Balances AFTER this purchase (SINGLE SOURCE OF TRUTH for useRoadmapData)
      let cashAfterPurchase = 0;
      let savingsAfterPurchase = 0;
      let equityUsedAfterPurchase = 0;
      
      // Calculate available funds breakdown only if property is affordable
      // CRITICAL: These values represent what was available AT TIME OF PURCHASE (before this purchase)
      // This is used for the Deposit Test modal to show "what we had" when making the decision
      if (result.period !== Infinity) {
        const purchasePeriod = result.period;
        const fundsBreakdownFinal = calculateAvailableFunds(purchasePeriod, purchaseHistory);
        
        // Use the "remaining" values which represent what's available BEFORE this purchase
        // (purchaseHistory doesn't include current purchase yet)
        baseDeposit = fundsBreakdownFinal.cashRemaining;
        cumulativeSavings = fundsBreakdownFinal.cumulativeSavings;  // Use accumulated savings (for display), not remaining
        equityRelease = fundsBreakdownFinal.equityRemaining;
        cashflowReinvestment = fundsBreakdownFinal.cashflowReinvestment;
        
        // ============================================================================
        // CALCULATE FUNDING BREAKDOWN FOR THIS PURCHASE (SINGLE SOURCE OF TRUTH)
        // This determines exactly how much comes from each source
        // Equity → Cash → Savings (with 75% savings buffer)
        // ============================================================================
        let remaining = totalCashRequired;
        
        // 1. EQUITY FIRST - leverage existing portfolio
        fundingFromEquity = Math.min(remaining, equityRelease);
        remaining -= fundingFromEquity;
        
        // 2. CASH SECOND - from deposit pool
        fundingFromCash = Math.min(remaining, baseDeposit);
        remaining -= fundingFromCash;
        
        // 3. SAVINGS LAST - use all accumulated savings (already only 25% of total)
        const savingsAvailableForPurchase = cumulativeSavings;
        fundingFromSavings = Math.min(remaining, savingsAvailableForPurchase);
        
        // Calculate balances AFTER this purchase (SINGLE SOURCE OF TRUTH)
        // These will be passed to useRoadmapData to avoid recalculation
        cashAfterPurchase = baseDeposit - fundingFromCash;
        savingsAfterPurchase = cumulativeSavings - fundingFromSavings;
        equityUsedAfterPurchase = fundsBreakdownFinal.totalEquityUsed + fundingFromEquity;
        
        // Update cumulative equity released tracking on previous purchases
        purchaseHistory.forEach(purchase => {
          if (purchase.period <= purchasePeriod) {
            const periodsOwned = purchasePeriod - purchase.period;
            const propertyData = getPropertyData(purchase.title);
            if (propertyData) {
              const currentValue = calculatePropertyGrowth(purchase.cost, periodsOwned, propertyData);
              const maxLoan = currentValue * EQUITY_EXTRACTION_LVR_CAP;
              const equityReleasedFromProperty = Math.max(0, maxLoan - purchase.loanAmount);
              purchase.cumulativeEquityReleased = equityReleasedFromProperty;
            }
          }
        });
      }
      
      // Calculate effective borrowing capacity for timeline display
      const timelineEquityBoost = equityRelease * profile.equityFactor;
      const timelineEffectiveBorrowingCapacity = profile.borrowingCapacity + timelineEquityBoost;
      
      // Get the loan type for this specific instance (default to 'IO' if not set)
      const instanceLoanType = timelineLoanTypes[instanceId] || 'IO';
      
      const timelineProperty: TimelineProperty = {
        id: `${property.id}_${index}`,
        instanceId: instanceId,
        title: property.title,
        cost: correctPurchasePrice,
        depositRequired: correctDepositRequired,
        loanAmount: loanAmount,
        period: result.period !== Infinity ? result.period : Infinity,
        affordableYear: result.period !== Infinity ? periodToYear(result.period) : Infinity,
        displayPeriod: result.period !== Infinity ? periodToDisplay(result.period) : 'N/A',
        status: result.period === Infinity ? 'challenging' : 'feasible',
        propertyIndex: index,
        portfolioValueAfter: portfolioValueAfter,
        totalEquityAfter: totalEquityAfter,
        totalDebtAfter: totalDebtAfter,
        availableFundsUsed: availableFundsUsed,
        loanType: instanceLoanType,
        
        // Cashflow breakdown
        grossRentalIncome,
        loanInterest,
        expenses,
        netCashflow,
        
        // Expense breakdown
        expenseBreakdown: {
          councilRatesWater: timelineAccCouncilRatesWater,
          strataFees: timelineAccStrataFees,
          insurance: timelineAccInsurance,
          managementFees: timelineAccManagementFees,
          repairsMaintenance: timelineAccRepairsMaintenance,
          landTax: timelineAccLandTax,
          other: timelineAccOther,
        },
        
        // Test details
        depositTestSurplus,
        depositTestPass,
        serviceabilityTestSurplus,
        serviceabilityTestPass,
        borrowingCapacityUsed: loanAmount,
        // CRITICAL: This calculation MUST match the borrowing capacity test in checkAffordability
        // Both use: effectiveBorrowingCapacity - totalDebt (where totalDebt is filtered by year)
        borrowingCapacityRemaining: Math.max(0, timelineEffectiveBorrowingCapacity - totalDebtAfter),
        
        // Flags and rates
        isGapRuleBlocked: false, // Set based on gap rule logic
        rentalRecognitionRate,
        
        // Portfolio state before purchase (use correct purchase price)
        portfolioValueBefore: portfolioValueAfter - correctPurchasePrice,
        totalEquityBefore: totalEquityAfter - (correctPurchasePrice - loanAmount),
        totalDebtBefore: totalDebtAfter - loanAmount,
        
        // Available funds breakdown
        baseDeposit,
        cumulativeSavings,
        cashflowReinvestment,
        equityRelease,
        
        // Acquisition costs (using all 12 purchase cost fields from instance)
        state: propertyInstanceForCosts.state,
        acquisitionCosts: {
          stampDuty: stampDuty,
          lmi: lmi,
          legalFees: oneOffCosts.conveyancing,
          inspectionFees: oneOffCosts.buildingPestInspection + oneOffCosts.plumbingElectricalInspections + oneOffCosts.independentValuation,
          // Other fees includes ALL remaining one-off costs
          otherFees: oneOffCosts.mortgageFees +
                     oneOffCosts.engagementFee +
                     oneOffCosts.conditionalHoldingDeposit +
                     oneOffCosts.buildingInsuranceUpfront +
                     oneOffCosts.maintenanceAllowancePostSettlement,
          total: oneOffCosts.totalCashRequired + lmi,
        },
        totalCashRequired: totalCashRequired,
        
        // FUNDING BREAKDOWN - SINGLE SOURCE OF TRUTH
        // Calculated here, consumed by useRoadmapData for display
        fundingBreakdown: {
          cash: fundingFromCash,
          savings: fundingFromSavings,
          equity: fundingFromEquity,
          total: fundingFromCash + fundingFromSavings + fundingFromEquity,
        },
        
        // RUNNING BALANCES AFTER PURCHASE - SINGLE SOURCE OF TRUTH
        // Used by useRoadmapData to display correct balances without recalculating
        balancesAfterPurchase: {
          cash: cashAfterPurchase,
          savings: savingsAfterPurchase,
          equityUsed: equityUsedAfterPurchase,
        },
      };
      
      timelineProperties.push(timelineProperty);
      
      // Add to purchase history if affordable (use correct purchase price)
      if (result.period !== Infinity) {
        purchaseHistory.push({
          period: result.period,
          cost: correctPurchasePrice,
          depositRequired: correctDepositRequired,
          totalCashRequired: totalCashRequired, // Include full acquisition costs for equity-first allocation
          loanAmount: loanAmount,
          title: property.title,
          instanceId: instanceId,
          loanType: instanceLoanType,
          cumulativeEquityReleased: 0 // Initialize equity tracking
        });
        
        // No longer sorting purchaseHistory - FIFO ordering is enforced by minPeriod constraint
        // Each property is scheduled at or after the previous one, so history is naturally chronological
      }
    });
    
    // Return properties in user-defined order (FIFO - as they were added)
    // No longer sorting by period - properties stay in the order they were added
    return timelineProperties;
  }, [
    // Only re-calculate when these specific values change
    selectionsHash,
    propertyTypes.length,
    profile.timelineYears,
    profile.borrowingCapacity,
    profile.depositPool,
    profile.annualSavings,
    profile.portfolioValue, // Trigger recalculation when existing portfolio changes
    profile.currentDebt, // Trigger recalculation when existing debt changes
    profile.useExistingEquity, // Trigger recalculation when equity toggle changes
    profile.existingPortfolioGrowthRate, // Trigger recalculation when growth rate changes
    profile.maxPurchasesPerYear, // Trigger recalculation when purchase limit changes
    calculatedValues.availableDeposit,
    globalFactors.interestRate,
    getPropertyData,
    propertyAssumptions,
    propertyTypeTemplates,
    pauseBlocks,
    eventBlocks, // Trigger recalculation when events change (Custom Events System)
    timelineLoanTypes,
    getInstance, // Keep getInstance as it depends on instances state
    instances, // Trigger recalculation when property instances change (e.g., purchasePrice updates)
    propertyOrder, // Trigger recalculation when property order changes
  ]);

  // Function to calculate affordability for any period and property
  const calculateAffordabilityForPeriod = useCallback((
    period: number,
    property: any,
    previousPurchases: Array<{ period: number; cost: number; depositRequired: number; loanAmount: number; title: string; instanceId: string; loanType?: 'IO' | 'PI'; cumulativeEquityReleased?: number }>
  ) => {
    const availableFunds = calculateAvailableFunds(period, previousPurchases);
    const affordabilityResult = checkAffordability(property, availableFunds.total, previousPurchases, period);
    
    // Calculate all purchase costs using property instance (includes all 39 fields)
    const baseLoanAmount = property.cost - property.depositRequired;
    const affordabilityPropertyInstance = getInstance(property.instanceId);
    const affordabilityPropertyInstanceForCosts = affordabilityPropertyInstance ?? getPropertyInstanceDefaults(property.title || 'Default');
    
    // Use LVR from instance
    const affordabilityInstanceLvr = affordabilityPropertyInstance?.lvr ?? ((baseLoanAmount / property.cost) * 100);
    
    // Check if LMI is being capitalized into the loan
    const isAffordabilityLmiCapitalized = affordabilityPropertyInstance?.lmiCapitalized ?? false;
    
    // Calculate stamp duty (with override support)
    const affordabilityStampDuty = affordabilityPropertyInstanceForCosts.stampDutyOverride ?? calculateStampDuty(
      affordabilityPropertyInstanceForCosts.state,
      property.cost,
      false
    );
    
    // Calculate LMI (using valuationAtPurchase for effective LVR calculation)
    // LMI is calculated on base loan amount, before any capitalization adjustment
    const affordabilityLmi = calculateLMI(
      baseLoanAmount,
      affordabilityInstanceLvr,
      affordabilityPropertyInstanceForCosts.lmiWaiver ?? false,
      affordabilityPropertyInstanceForCosts.valuationAtPurchase,
      property.cost
    );
    
    // Final loan amount: prefer passed value if available (for live preview in modals)
    // This allows the modal to pass pre-calculated loan amount including LMI capitalization
    const calculatedLoanAmount = isAffordabilityLmiCapitalized ? baseLoanAmount + affordabilityLmi : baseLoanAmount;
    const newLoanAmount = property.loanAmount !== undefined ? property.loanAmount : calculatedLoanAmount;
    
    // Calculate deposit balance
    const affordabilityDepositBalance = calculateDepositBalance(
      property.cost,
      affordabilityInstanceLvr,
      affordabilityPropertyInstanceForCosts.conditionalHoldingDeposit
    );
    
    // Calculate all one-off costs using property instance
    const affordabilityOneOffCosts = calculateOneOffCosts(
      affordabilityPropertyInstanceForCosts,
      affordabilityStampDuty,
      affordabilityDepositBalance
    );
    
    // Add LMI to total cash required ONLY if not capitalized into the loan
    const lmiCashRequired = isAffordabilityLmiCapitalized ? 0 : affordabilityLmi;
    const calculatedTotalCashRequired = affordabilityOneOffCosts.totalCashRequired + lmiCashRequired;
    
    // Use passed totalCashRequired if available (for live preview in modals)
    // This allows the modal to pass pre-calculated values including adjusted costs and LMI capitalization
    const totalCashRequired = property.totalCashRequired !== undefined ? property.totalCashRequired : calculatedTotalCashRequired;
    
    // Calculate test results even if affordability fails
    const depositTestSurplus = availableFunds.total - totalCashRequired;
    const depositTestPass = depositTestSurplus >= 0;
    
    // Calculate rental income for enhanced serviceability test
    let totalRentalIncome = 0;
    previousPurchases.forEach(purchase => {
      if (purchase.period <= period) {
        const periodsOwned = period - purchase.period;
        const propertyData = getPropertyData(purchase.title);
        const purchaseInstance = getInstance(purchase.instanceId);
        
        if (purchaseInstance && propertyData) {
          // Use instance rent with growth adjustment
          const currentValue = calculatePropertyGrowth(purchase.cost, periodsOwned, propertyData);
          const growthFactor = currentValue / purchase.cost;
          const annualRent = purchaseInstance.rentPerWeek * 52 * growthFactor;
          const vacancyAdjusted = annualRent * (1 - DEFAULT_VACANCY_RATE);
          const portfolioSize = previousPurchases.filter(p => p.period <= period).length;
          const recognitionRate = RENTAL_RECOGNITION_RATE;
          totalRentalIncome += vacancyAdjusted * recognitionRate;
        } else if (propertyData) {
          // Fallback to template yield
          const currentValue = calculatePropertyGrowth(purchase.cost, periodsOwned, propertyData);
          const yieldRate = parseFloat(propertyData.yield) / 100;
          const portfolioSize = previousPurchases.filter(p => p.period <= period).length;
          const recognitionRate = RENTAL_RECOGNITION_RATE;
          totalRentalIncome += currentValue * yieldRate * recognitionRate;
        }
      }
    });
    
    // Add new property rental income
    const newPropertyInstance = getInstance(property.instanceId);
    const propertyData = getPropertyData(property.title);
    if (newPropertyInstance) {
      // Use instance rent (agent-editable)
      const annualRent = newPropertyInstance.rentPerWeek * 52;
      const vacancyAdjusted = annualRent * (1 - DEFAULT_VACANCY_RATE);
      const portfolioSize = previousPurchases.filter(p => p.period <= period).length;
      const recognitionRate = RENTAL_RECOGNITION_RATE;
      totalRentalIncome += vacancyAdjusted * recognitionRate;
    } else if (propertyData) {
      // Fallback to template yield
      const yieldRate = parseFloat(propertyData.yield) / 100;
      const portfolioSize = previousPurchases.filter(p => p.period <= period).length;
      const recognitionRate = RENTAL_RECOGNITION_RATE;
      totalRentalIncome += property.cost * yieldRate * recognitionRate;
    }
    
    // Calculate total loan payment for serviceability test
    // Apply market-wide interest rate adjustments from events
    let totalAnnualLoanPayment = 0;
    
    // Get the effective interest rate for this period (market-wide adjustment)
    const effectiveMarketRateForPeriod = getEffectiveInterestRate(period, eventBlocks);
    
    // Existing debt payment (use event-adjusted market rate)
    if (profile.currentDebt > 0) {
      totalAnnualLoanPayment += calculateAnnualLoanPayment(profile.currentDebt, effectiveMarketRateForPeriod, 'IO');
    }
    
    // Previous purchases loan payments (use property-specific effective rates with refinance events)
    previousPurchases.forEach(purchase => {
      if (purchase.period <= period) {
        // Get property-specific effective rate (considers refinance events)
        const purchaseEffectiveRate = getPropertyEffectiveRate(
          period,
          eventBlocks,
          purchase.instanceId
        );
        const purchaseLoanType = purchase.loanType || 'IO';
        totalAnnualLoanPayment += calculateAnnualLoanPayment(purchase.loanAmount, purchaseEffectiveRate, purchaseLoanType);
      }
    });
    
    // Add new property loan payment (use event-adjusted property interest rate)
    // Get property-specific effective rate (considers refinance events)
    const propertyEffectiveRateForPeriod = getPropertyEffectiveRate(
      period,
      eventBlocks,
      property.instanceId
    );
    const newPropertyLoanType = property.loanType || 'IO';
    const newPropertyLoanPayment = calculateAnnualLoanPayment(newLoanAmount, propertyEffectiveRateForPeriod, newPropertyLoanType);
    totalAnnualLoanPayment += newPropertyLoanPayment;
    
    // Enhanced serviceability test with rental income contribution
    const baseCapacity = profile.borrowingCapacity * SERVICEABILITY_FACTOR;
    const rentalContribution = totalRentalIncome * RENTAL_SERVICEABILITY_CONTRIBUTION_RATE;
    const enhancedCapacity = baseCapacity + rentalContribution;
    const maxAnnualPayment = enhancedCapacity;
    const serviceabilityTestSurplus = maxAnnualPayment - totalAnnualLoanPayment;
    const serviceabilityTestPass = serviceabilityTestSurplus >= 0;
    
    // BORROWING CAPACITY TEST
    // Calculate total existing debt from previous purchases
    let totalExistingDebt = profile.currentDebt;
    previousPurchases.forEach(purchase => {
      if (purchase.period <= period) {
        const currentLoanAmount = purchase.loanAmount + (purchase.cumulativeEquityReleased || 0);
        totalExistingDebt += currentLoanAmount;
      }
    });
    
    // Calculate usable equity from existing portfolio and previous purchases
    let totalUsableEquity = 0;
    
    // Existing portfolio equity - uses configurable flat rate for mature properties
    // Only include if useExistingEquity toggle is enabled
    if (profile.portfolioValue > 0 && profile.useExistingEquity) {
      const growthRate = profile.existingPortfolioGrowthRate || 0.05;
      const grownPortfolioValue = calculateExistingPortfolioGrowthByPeriod(profile.portfolioValue, period - 1, growthRate);
      const portfolioEquity = Math.max(0, grownPortfolioValue * EQUITY_EXTRACTION_LVR_CAP - profile.currentDebt);
      totalUsableEquity += portfolioEquity;
    }
    
    // Previous purchases equity
    previousPurchases.forEach(purchase => {
      if (purchase.period <= period) {
        const periodsOwned = period - purchase.period;
        const purchasePropertyData = getPropertyData(purchase.title);
        if (purchasePropertyData) {
          const currentValue = calculatePropertyGrowth(purchase.cost, periodsOwned, purchasePropertyData);
          const currentLoanAmount = purchase.loanAmount + (purchase.cumulativeEquityReleased || 0);
          const usableEquity = Math.max(0, currentValue * EQUITY_EXTRACTION_LVR_CAP - currentLoanAmount);
          totalUsableEquity += usableEquity;
        }
      }
    });
    
    // Calculate effective borrowing capacity with equity boost
    const equityBoost = totalUsableEquity * profile.equityFactor;
    const effectiveBorrowingCapacity = profile.borrowingCapacity + equityBoost;
    
    // Borrowing capacity test: new loan must not exceed effective capacity
    const borrowingCapacityTestPass = newLoanAmount <= effectiveBorrowingCapacity;
    const borrowingCapacityRemaining = effectiveBorrowingCapacity - newLoanAmount;
    
    return {
      canAfford: affordabilityResult.canAfford,
      depositTestSurplus,
      depositTestPass,
      serviceabilityTestSurplus,
      serviceabilityTestPass,
      borrowingCapacityPass: borrowingCapacityTestPass,
      borrowingCapacityRemaining,
      availableFunds: availableFunds.total
    };
  }, [profile, globalFactors, calculatedValues, getPropertyData, propertyAssumptions, propertyTypeTemplates]);

  // AUTO-CREATE MISSING PROPERTY INSTANCES
  // This useEffect runs after render to create any property instances that don't exist yet
  // This prevents the "setState during render" error
  useEffect(() => {
    const timeline = calculateTimelineProperties;
    if (!timeline || timeline.length === 0) return;
    
    const instancesToCreate: Array<{ instanceId: string; propertyType: string; period: number }> = [];
    
    // Check all timeline properties for missing instances
    timeline.forEach(timelineProp => {
      if (timelineProp.instanceId) {
        const instance = getInstance(timelineProp.instanceId);
        if (!instance) {
          instancesToCreate.push({
            instanceId: timelineProp.instanceId,
            propertyType: timelineProp.title,
            period: timelineProp.period !== Infinity ? timelineProp.period : 1
          });
        }
      }
    });
    
    // Create all missing instances in a batch
    if (instancesToCreate.length > 0) {
instancesToCreate.forEach(({ instanceId, propertyType, period }) => {
createInstance(instanceId, propertyType, period);
      });
    }
    // Note: createInstance is stable (useCallback), so we don't need it in deps
    // getInstance depends on instances state, which is already tracked via calculateTimelineProperties
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculateTimelineProperties]);

  // Trigger recalculation when property instances change
  const [isRecalculating, setIsRecalculating] = useState(false);

  useEffect(() => {
    // Debounce recalculation to avoid excessive updates
    setIsRecalculating(true);
    const timer = setTimeout(() => {
      setIsRecalculating(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [instances]);

  // PREVIEW PLACEMENT: Evaluate what would happen if a property were placed at a specific period
  // This uses the SAME logic as the auto-placer to ensure consistent validation
  const previewPlacementAtPeriod = useCallback((
    instanceId: string,
    targetPeriod: number
  ): { isValid: boolean; depositTestPass: boolean; serviceabilityTestPass: boolean; borrowingCapacityPass: boolean } => {
    // Find the property in timelineProperties
    const property = calculateTimelineProperties.find(p => p.instanceId === instanceId);
    if (!property) {
      return { isValid: false, depositTestPass: false, serviceabilityTestPass: false, borrowingCapacityPass: false };
    }
    
    // Get the property's position in the FIFO order
    const draggedPropertyOrderIndex = propertyOrder.indexOf(instanceId);
    
    // Build purchase history for all properties that would come BEFORE this one
    // This includes:
    // 1. Properties at periods before the target period
    // 2. Properties at the same period but earlier in FIFO order
    const purchaseHistoryForValidation: Array<{
      period: number;
      cost: number;
      depositRequired: number;
      totalCashRequired?: number;
      loanAmount: number;
      title: string;
      instanceId: string;
      loanType?: 'IO' | 'PI';
      cumulativeEquityReleased?: number;
    }> = [];
    
    // Process properties in FIFO order to build correct purchase history
    propertyOrder.forEach((orderId, orderIndex) => {
      if (orderId === instanceId) return; // Skip the property being validated
      
      const tp = calculateTimelineProperties.find(p => p.instanceId === orderId);
      if (!tp || tp.period === Infinity) return;
      
      // Include this property if:
      // 1. Its period is before the target period, OR
      // 2. Its period equals target period AND it comes before the dragged property in FIFO order
      let shouldInclude = false;
      if (tp.period < targetPeriod) {
        shouldInclude = true;
      } else if (tp.period === targetPeriod && orderIndex < draggedPropertyOrderIndex) {
        shouldInclude = true;
      }
      
      if (shouldInclude) {
        purchaseHistoryForValidation.push({
          period: tp.period,
          cost: tp.cost,
          depositRequired: tp.depositRequired,
          totalCashRequired: tp.totalCashRequired,
          loanAmount: tp.loanAmount,
          title: tp.title,
          instanceId: tp.instanceId,
          loanType: tp.loanType,
          cumulativeEquityReleased: 0, // Will be recalculated by calculateAvailableFunds
        });
      }
    });
    
    // Sort by period then by FIFO order for consistent processing
    purchaseHistoryForValidation.sort((a, b) => {
      if (a.period !== b.period) return a.period - b.period;
      return propertyOrder.indexOf(a.instanceId) - propertyOrder.indexOf(b.instanceId);
    });
    
    // Now calculate available funds at the target period with this purchase history
    const availableFunds = calculateAvailableFunds(targetPeriod, purchaseHistoryForValidation);
    
    // Check affordability using the same function as the auto-placer
    const affordabilityResult = checkAffordability(
      { cost: property.cost, depositRequired: property.depositRequired, instanceId: property.instanceId, title: property.title },
      availableFunds.total,
      purchaseHistoryForValidation,
      targetPeriod
    );
    
    // Calculate deposit test
    const depositTestSurplus = availableFunds.total - property.totalCashRequired;
    const depositTestPass = depositTestSurplus >= 0;
    
    // Calculate serviceability test
    // Get total rental income from previous purchases
    let totalRentalIncome = 0;
    purchaseHistoryForValidation.forEach(purchase => {
      if (purchase.period <= targetPeriod) {
        const periodsOwned = targetPeriod - purchase.period;
        const propertyData = getPropertyData(purchase.title);
        const purchaseInstance = getInstance(purchase.instanceId);
        
        if (purchaseInstance && propertyData) {
          const currentValue = calculatePropertyGrowth(purchase.cost, periodsOwned, propertyData);
          const growthFactor = currentValue / purchase.cost;
          const annualRent = purchaseInstance.rentPerWeek * 52 * growthFactor;
          const vacancyAdjusted = annualRent * (1 - DEFAULT_VACANCY_RATE);
          const portfolioSize = purchaseHistoryForValidation.filter(p => p.period <= targetPeriod).length;
          const recognitionRate = RENTAL_RECOGNITION_RATE;
          totalRentalIncome += vacancyAdjusted * recognitionRate;
        } else if (propertyData) {
          const currentValue = calculatePropertyGrowth(purchase.cost, periodsOwned, propertyData);
          const yieldRate = parseFloat(propertyData.yield) / 100;
          const portfolioSize = purchaseHistoryForValidation.filter(p => p.period <= targetPeriod).length;
          const recognitionRate = RENTAL_RECOGNITION_RATE;
          totalRentalIncome += currentValue * yieldRate * recognitionRate;
        }
      }
    });
    
    // Calculate total debt from previous purchases
    let totalDebtFromPurchases = 0;
    purchaseHistoryForValidation.forEach(purchase => {
      if (purchase.period <= targetPeriod) {
        totalDebtFromPurchases += purchase.loanAmount;
      }
    });
    
    // Calculate total interest payments
    const interestRate = parseFloat(globalFactors.interestRate) / 100;
    const totalInterestPayments = (totalDebtFromPurchases + property.loanAmount) * interestRate;
    
    // Calculate serviceability
    const effectiveRentalIncome = totalRentalIncome * RENTAL_SERVICEABILITY_CONTRIBUTION_RATE;
    const adjustedIncome = profile.borrowingCapacity / SERVICEABILITY_FACTOR + effectiveRentalIncome;
    const assessmentInterestPayments = totalInterestPayments * SERVICEABILITY_FACTOR;
    const serviceabilitySurplus = adjustedIncome - assessmentInterestPayments;
    const serviceabilityTestPass = serviceabilitySurplus >= 0;
    
    // Calculate borrowing capacity test
    const newLoanAmount = property.loanAmount;
    let totalUsableEquity = 0;
    purchaseHistoryForValidation.forEach(purchase => {
      if (purchase.period <= targetPeriod) {
        const periodsOwned = targetPeriod - purchase.period;
        const propertyData = getPropertyData(purchase.title);
        if (propertyData && periodsOwned >= 2) {
          const currentValue = calculatePropertyGrowth(purchase.cost, periodsOwned, propertyData);
          const maxLoan = currentValue * EQUITY_EXTRACTION_LVR_CAP;
          const usableEquity = Math.max(0, maxLoan - purchase.loanAmount);
          totalUsableEquity += usableEquity;
        }
      }
    });
    
    const equityBoost = totalUsableEquity * profile.equityFactor;
    const effectiveBorrowingCapacity = profile.borrowingCapacity + equityBoost;
    const borrowingCapacityPass = newLoanAmount <= effectiveBorrowingCapacity;
    
    const isValid = affordabilityResult.canAfford && depositTestPass && serviceabilityTestPass && borrowingCapacityPass;
    
    return {
      isValid,
      depositTestPass,
      serviceabilityTestPass,
      borrowingCapacityPass,
    };
  }, [calculateTimelineProperties, propertyOrder, calculateAvailableFunds, checkAffordability, getPropertyData, getInstance, globalFactors.interestRate, profile.borrowingCapacity, profile.equityFactor, calculatePropertyGrowth]);

  // Only expose the memoized result
  return {
    timelineProperties: calculateTimelineProperties,
    isCalculating: false, // Could add state tracking if needed
    calculateAffordabilityForProperty: calculateAffordabilityForPeriod,
    previewPlacementAtPeriod,
    updateTimelinePropertyLoanType,
    isRecalculating,
  };
};