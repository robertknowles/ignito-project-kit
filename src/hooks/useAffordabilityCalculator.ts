import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { useInvestmentProfile } from './useInvestmentProfile';
import { usePropertySelection } from '../contexts/PropertySelectionContext';
import { useDataAssumptions, type PropertyAssumption } from '../contexts/DataAssumptionsContext';
import type { TimelineProperty } from '../types/property';
import { calculateAcquisitionCosts } from '../utils/costsCalculator';
import { useClient } from '../contexts/ClientContext';
import { usePropertyInstance } from '../contexts/PropertyInstanceContext';
import { calculateDetailedCashflow } from '../utils/detailedCashflowCalculator';
import { calculateOneOffCosts, calculateDepositBalance } from '../utils/oneOffCostsCalculator';
import { calculateLMI, calculateLoanAmount } from '../utils/lmiCalculator';
import { calculateStampDuty } from '../utils/stampDutyCalculator';
import { calculateLandTax } from '../utils/landTaxCalculator';
import { applyPropertyOverrides } from '../utils/applyPropertyOverrides';
import { calculateCascadeEffect, initializeCascadeState } from '../utils/cascadeCalculator';

// Period conversion constants
const PERIODS_PER_YEAR = 2;
const BASE_YEAR = 2025;

// Convert annual rate to per-period rate using compound interest formula
const annualRateToPeriodRate = (annualRate: number): number => {
  return Math.pow(1 + annualRate, 1 / PERIODS_PER_YEAR) - 1;
};

// Convert period number to display format
const periodToDisplay = (period: number): string => {
  const year = BASE_YEAR + Math.floor((period - 1) / PERIODS_PER_YEAR);
  const half = ((period - 1) % PERIODS_PER_YEAR) + 1;
  return `${year} H${half}`;
};

// Convert period to absolute year (for backwards compatibility)
const periodToYear = (period: number): number => {
  return BASE_YEAR + (period - 1) / PERIODS_PER_YEAR;
};

// Convert year to period
const yearToPeriod = (year: number): number => {
  return Math.round((year - BASE_YEAR) * PERIODS_PER_YEAR) + 1;
};

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
  const { selections, propertyTypes, pauseBlocks } = usePropertySelection();
  const { globalFactors, getPropertyData, propertyAssumptions, getPropertyTypeTemplate } = useDataAssumptions();
  const { activeClient } = useClient();
  const { getInstance, createInstance, instances } = usePropertyInstance();
  
  // Per-instance loan type state (keyed by instanceId)
  const [timelineLoanTypes, setTimelineLoanTypes] = useState<Record<string, 'IO' | 'PI'>>({});
  
  // Load timeline loan types from localStorage when client changes
  useEffect(() => {
    if (activeClient?.id) {
      const storageKey = `timeline_loan_types_${activeClient.id}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          setTimelineLoanTypes(JSON.parse(stored));
        } catch (error) {
          console.error('Failed to load timeline loan types:', error);
          setTimelineLoanTypes({});
        }
      } else {
        setTimelineLoanTypes({});
      }
    }
  }, [activeClient?.id]);
  
  // Save timeline loan types to localStorage whenever they change
  useEffect(() => {
    if (activeClient?.id) {
      const storageKey = `timeline_loan_types_${activeClient.id}`;
      localStorage.setItem(storageKey, JSON.stringify(timelineLoanTypes));
    }
  }, [timelineLoanTypes, activeClient?.id]);
  
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
  const calculatePropertyGrowth = (initialValue: number, periods: number, assumption: PropertyAssumption) => {
    let currentValue = initialValue;
    
    // Use per-property tiered growth rates
    const year1Rate = annualRateToPeriodRate(parseFloat(assumption.growthYear1) / 100);
    const years2to3Rate = annualRateToPeriodRate(parseFloat(assumption.growthYears2to3) / 100);
    const year4Rate = annualRateToPeriodRate(parseFloat(assumption.growthYear4) / 100);
    const year5plusRate = annualRateToPeriodRate(parseFloat(assumption.growthYear5plus) / 100);
    
    for (let period = 1; period <= periods; period++) {
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
      
      currentValue *= (1 + periodRate);
    }
    
    return currentValue;
  };

  // Progressive rental recognition rates based on portfolio size
  const calculateRentalRecognitionRate = (portfolioSize: number): number => {
    if (portfolioSize <= 2) return 0.75;      // Properties 1-2: 75%
    if (portfolioSize <= 4) return 0.70;      // Properties 3-4: 70%
    return 0.65;                              // Properties 5+: 65%
  };

  const calculateAvailableFunds = (
      currentPeriod: number, 
      previousPurchases: Array<{ period: number; cost: number; depositRequired: number; loanAmount: number; title: string; instanceId: string; loanType?: 'IO' | 'PI' }>
    ): {
      total: number;
      baseDeposit: number;
      cumulativeSavings: number;
      cashflowReinvestment: number;
      equityRelease: number;
      depositsUsed: number;
    } => {
      // Calculate enhanced period savings with cashflow feedback
      let totalEnhancedSavings = 0;
      const periodSavings = profile.annualSavings / PERIODS_PER_YEAR;
      
      for (let period = 1; period <= currentPeriod; period++) {
        // Base period savings
        let currentPeriodSavings = periodSavings;
        
        // Calculate net cashflow from all properties purchased before this period
        let netCashflow = 0;
        previousPurchases.forEach(purchase => {
          if (purchase.period < period) { // Only properties purchased in previous periods generate cashflow
            const periodsOwned = period - purchase.period;
            const propertyData = getPropertyData(purchase.title);
            
            if (propertyData) {
              // Calculate current property value with tiered growth
              const currentValue = calculatePropertyGrowth(purchase.cost, periodsOwned, propertyData);
              
              // Calculate rental income with progressive recognition rates
              const yieldRate = parseFloat(propertyData.yield) / 100;
              // Fix: Portfolio size should exclude current property for non-purchase periods
              const portfolioSize = previousPurchases.filter(p => p.period < period).length;
              const recognitionRate = calculateRentalRecognitionRate(portfolioSize);
              const annualRentalIncome = currentValue * yieldRate * recognitionRate;
              const periodRentalIncome = annualRentalIncome / PERIODS_PER_YEAR;
              
              // Get property instance for detailed cashflow calculation
              const propertyInstance = getInstance(purchase.instanceId);
              
              if (propertyInstance) {
                // Calculate detailed cashflow using all 39 inputs
                const cashflowBreakdown = calculateDetailedCashflow(propertyInstance, purchase.loanAmount);
                
                // Adjust rent for property growth (rent increases with property value)
                const growthFactor = currentValue / purchase.cost;
                const adjustedAnnualCashflow = cashflowBreakdown.netAnnualCashflow * growthFactor;
                
                // Apply inflation to expenses (3% annual)
                const inflationFactor = Math.pow(1.03, periodsOwned / PERIODS_PER_YEAR);
                const inflationAdjustedCashflow = adjustedAnnualCashflow * inflationFactor;
                
                // Convert to period cashflow
                const propertyCashflow = inflationAdjustedCashflow / PERIODS_PER_YEAR;
                netCashflow += propertyCashflow;
              } else {
                // Fallback: Use property type template if instance doesn't exist (shouldn't happen)
                console.warn(`Property instance not found for ${purchase.instanceId}, using template defaults`);
                const template = getPropertyTypeTemplate(purchase.title);
                const interestRate = template ? (template.interestRate / 100) : 0.065; // Default 6.5%
                const loanType = purchase.loanType || 'IO';
                const annualLoanPayment = calculateAnnualLoanPayment(purchase.loanAmount, interestRate, loanType);
                const periodLoanPayment = annualLoanPayment / PERIODS_PER_YEAR;
                const inflationFactor = Math.pow(1.03, periodsOwned / PERIODS_PER_YEAR);
                const periodExpenses = periodRentalIncome * 0.30 * inflationFactor;
                const propertyCashflow = periodRentalIncome - periodLoanPayment - periodExpenses;
                netCashflow += propertyCashflow;
              }
            }
          }
        });
        
        // Total savings for this period = base savings + net cashflow
        const totalPeriodSavings = currentPeriodSavings + netCashflow;
        totalEnhancedSavings += totalPeriodSavings;
      }
      
      // Calculate deposits used for previous purchases
      const totalDepositsUsed = previousPurchases.reduce((sum, purchase) => {
        if (purchase.period <= currentPeriod) {
          return sum + purchase.depositRequired;
        }
        return sum;
      }, 0);

      // Calculate base savings (without cashflow)
      const baseSavings = profile.annualSavings * (currentPeriod / PERIODS_PER_YEAR);
      
      // Calculate net cashflow reinvestment
      const netCashflow = totalEnhancedSavings - baseSavings;
      
      // CONTINUOUS EQUITY RECYCLING: Release equity whenever available (88% LVR cap)
      let existingPortfolioEquity = 0;
      let totalUsableEquity = 0;
      
      // Calculate existing portfolio equity with 88% LVR cap
      if (profile.portfolioValue > 0) {
        // Use first property type's growth rates for existing portfolio
        const defaultAssumption = propertyAssumptions[0];
        const grownPortfolioValue = calculatePropertyGrowth(profile.portfolioValue, currentPeriod - 1, defaultAssumption);
        existingPortfolioEquity = Math.max(0, grownPortfolioValue * 0.88 - profile.currentDebt);
      }

      // Calculate usable equity from previous purchases - with 88% LVR cap
      totalUsableEquity = previousPurchases.reduce((acc, purchase) => {
        if (purchase.period <= currentPeriod) {
          const propertyData = getPropertyData(purchase.title);
          if (propertyData) {
            const propertyCurrentValue = calculatePropertyGrowth(purchase.cost, currentPeriod - purchase.period, propertyData);
            const usableEquity = Math.max(0, propertyCurrentValue * 0.88 - purchase.loanAmount);
            return acc + usableEquity;
          }
        }
        return acc;
      }, existingPortfolioEquity);
      
      // Calculate final funds
      const finalFunds = calculatedValues.availableDeposit + totalEnhancedSavings + totalUsableEquity - totalDepositsUsed;
      
      return {
        total: finalFunds,
        baseDeposit: Math.max(0, calculatedValues.availableDeposit - totalDepositsUsed),
        cumulativeSavings: baseSavings,
        cashflowReinvestment: netCashflow,
        equityRelease: totalUsableEquity,
        depositsUsed: totalDepositsUsed
      };
    };

  const calculatePropertyScore = (
    purchase: { period: number; cost: number; depositRequired: number; loanAmount: number; title: string; instanceId: string; loanType?: 'IO' | 'PI' },
    currentPeriod: number
  ): { cashflowScore: number; equityScore: number; totalScore: number } => {
    const periodsOwned = currentPeriod - purchase.period;
    const propertyData = getPropertyData(purchase.title);
    
    if (!propertyData) {
      return { cashflowScore: 0, equityScore: 0, totalScore: 0 };
    }
    
    // Calculate current property value with tiered growth
    const currentValue = calculatePropertyGrowth(purchase.cost, periodsOwned, propertyData);
    
    // Cashflow Score using detailed cashflow calculation
    const propertyInstance = getInstance(purchase.instanceId);
    let netCashflow = 0;
    
    if (propertyInstance) {
      // Calculate detailed cashflow using all 39 inputs
      const cashflowBreakdown = calculateDetailedCashflow(propertyInstance, purchase.loanAmount);
      
      // Adjust for property growth (rent increases with property value)
      const growthFactor = currentValue / purchase.cost;
      const adjustedAnnualCashflow = cashflowBreakdown.netAnnualCashflow * growthFactor;
      
      // Apply inflation to expenses (3% annual)
      const inflationFactor = Math.pow(1.03, periodsOwned / PERIODS_PER_YEAR);
      netCashflow = adjustedAnnualCashflow * inflationFactor;
    } else {
      // Fallback: Use property type template if instance doesn't exist (shouldn't happen)
      console.warn(`Property instance not found for ${purchase.instanceId}, using template defaults`);
      const template = getPropertyTypeTemplate(purchase.title);
      const yieldRate = parseFloat(propertyData.yield) / 100;
      const rentalIncome = currentValue * yieldRate;
      const interestRate = template ? (template.interestRate / 100) : 0.065; // Default 6.5%
      const loanType = purchase.loanType || 'IO';
      const annualLoanPayment = calculateAnnualLoanPayment(purchase.loanAmount, interestRate, loanType);
      const inflationFactor = Math.pow(1.03, periodsOwned / PERIODS_PER_YEAR);
      const expenses = rentalIncome * 0.30 * inflationFactor;
      netCashflow = rentalIncome - annualLoanPayment - expenses;
    }
    
    // Equity Score (current equity in property)
    const currentEquity = currentValue - purchase.loanAmount;
    
    // Weighted scoring: 60% cashflow + 40% equity
    const weightedScore = 0.6 * netCashflow + 0.4 * currentEquity;
    
    return {
      cashflowScore: netCashflow,
      equityScore: currentEquity,
      totalScore: weightedScore
    };
  };

  const checkAffordability = (
    property: any,
    availableFunds: number,
    previousPurchases: Array<{ period: number; cost: number; depositRequired: number; loanAmount: number; title: string; instanceId: string; loanType?: 'IO' | 'PI' }>,
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
      
      previousPurchases.forEach(purchase => {
        if (purchase.period <= currentPeriod) {
          const periodsOwned = currentPeriod - purchase.period;
          const propertyData = getPropertyData(purchase.title);
          
        if (propertyData) {
          // Calculate current property value with tiered growth
          const currentValue = calculatePropertyGrowth(purchase.cost, periodsOwned, propertyData);
          
          // Get property instance for detailed cashflow calculation
          const propertyInstance = getInstance(purchase.instanceId);
          
          if (propertyInstance) {
            // Calculate detailed cashflow using all 39 inputs
            const cashflowBreakdown = calculateDetailedCashflow(propertyInstance, purchase.loanAmount);
            
            // Adjust for property growth (rent increases with property value)
            const growthFactor = currentValue / purchase.cost;
            const adjustedIncome = cashflowBreakdown.adjustedIncome * growthFactor;
            const adjustedOperatingExpenses = cashflowBreakdown.totalOperatingExpenses * growthFactor;
            const adjustedNonDeductibleExpenses = cashflowBreakdown.totalNonDeductibleExpenses * growthFactor;
            
            // Apply inflation (3% annual)
            const inflationFactor = Math.pow(1.03, periodsOwned / PERIODS_PER_YEAR);
            const inflationAdjustedIncome = adjustedIncome * inflationFactor;
            const inflationAdjustedOperatingExpenses = adjustedOperatingExpenses * inflationFactor;
            const inflationAdjustedNonDeductibleExpenses = adjustedNonDeductibleExpenses * inflationFactor;
            
            // Apply progressive rental recognition based on portfolio size
            const portfolioSize = previousPurchases.filter(p => p.period < currentPeriod).length;
            const recognitionRate = calculateRentalRecognitionRate(portfolioSize);
            const recognizedIncome = inflationAdjustedIncome * recognitionRate;
            
            // Calculate net cashflow
            const propertyCashflow = recognizedIncome - inflationAdjustedOperatingExpenses - inflationAdjustedNonDeductibleExpenses;
            
            grossRentalIncome += recognizedIncome;
            loanInterest += cashflowBreakdown.loanInterest;
            expenses += (inflationAdjustedOperatingExpenses + inflationAdjustedNonDeductibleExpenses);
            netCashflow += propertyCashflow;
          } else {
            // Fallback: Use property type template if instance doesn't exist (shouldn't happen)
            console.warn(`Property instance not found for ${purchase.instanceId}, using template defaults`);
            const template = getPropertyTypeTemplate(purchase.title);
            const yieldRate = parseFloat(propertyData.yield) / 100;
            const portfolioSize = previousPurchases.filter(p => p.period < currentPeriod).length;
            const recognitionRate = calculateRentalRecognitionRate(portfolioSize);
            const rentalIncome = currentValue * yieldRate * recognitionRate;
            const interestRate = template ? (template.interestRate / 100) : 0.065; // Default 6.5%
            const loanType = purchase.loanType || 'IO';
            const propertyLoanPayment = calculateAnnualLoanPayment(purchase.loanAmount, interestRate, loanType);
            const inflationFactor = Math.pow(1.03, periodsOwned / PERIODS_PER_YEAR);
            const propertyExpenses = rentalIncome * 0.30 * inflationFactor;
            
            grossRentalIncome += rentalIncome;
            loanInterest += propertyLoanPayment;
            expenses += propertyExpenses;
            netCashflow += (rentalIncome - propertyLoanPayment - propertyExpenses);
          }
          }
        }
      });
      
      // Calculate total existing debt
      let totalExistingDebt = profile.currentDebt;
      previousPurchases.forEach(purchase => {
        if (purchase.period <= currentPeriod) {
          totalExistingDebt += purchase.loanAmount;
        }
      });
      
      // Calculate portfolio value
      let totalPortfolioValue = profile.portfolioValue;
      let propertyValues: number[] = [];
      let usableEquityPerProperty: number[] = [];
      
        if (profile.portfolioValue > 0) {
          // Use first property type's growth rates for existing portfolio
          const defaultAssumption = propertyAssumptions[0];
          const grownPortfolioValue = calculatePropertyGrowth(profile.portfolioValue, currentPeriod - 1, defaultAssumption);
          propertyValues.push(grownPortfolioValue);
          
          // Continuous equity release - 88% LVR cap, no time constraint
          const portfolioEquity = Math.max(0, grownPortfolioValue * 0.88 - profile.currentDebt);
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
              
              // Continuous equity release - 88% LVR cap, no time constraint
              const usableEquity = Math.max(0, currentValue * 0.88 - purchase.loanAmount);
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
      let totalAnnualLoanPayment = 0;
      
      // Existing debt payment (use template default interest rate of 6.5%)
      if (profile.currentDebt > 0) {
        const existingInterestRate = 0.065; // Assume 6.5% for existing debt
        totalAnnualLoanPayment += calculateAnnualLoanPayment(profile.currentDebt, existingInterestRate, 'IO');
      }
      
      // Previous purchases loan payments (use their instance interest rates)
      previousPurchases.forEach(purchase => {
        if (purchase.period <= currentPeriod) {
          const purchaseInstance = getInstance(purchase.instanceId);
          const purchaseInterestRate = purchaseInstance ? (purchaseInstance.interestRate / 100) : 0.065;
          const purchaseLoanType = purchase.loanType || 'IO';
          totalAnnualLoanPayment += calculateAnnualLoanPayment(purchase.loanAmount, purchaseInterestRate, purchaseLoanType);
        }
      });
      
      // Get property instance for interest rate and LMI waiver
      const propertyInstance = getInstance(property.instanceId);
      const propertyInterestRate = propertyInstance ? (propertyInstance.interestRate / 100) : 0.065;
      const lmiWaiver = propertyInstance?.lmiWaiver ?? false;
      
      // Add new property loan payment (use property instance interest rate)
      const newPropertyLoanType = property.loanType || 'IO';
      const newPropertyLoanPayment = calculateAnnualLoanPayment(newLoanAmount, propertyInterestRate, newPropertyLoanType);
      totalAnnualLoanPayment += newPropertyLoanPayment;
      
      // Calculate rental income from new property for DSR calculation
      const propertyData = getPropertyData(property.title);
      let newPropertyRentalIncome = 0;
      if (propertyData) {
        const yieldRate = parseFloat(propertyData.yield) / 100;
        const portfolioSize = previousPurchases.filter(p => p.period <= currentPeriod).length;
        const recognitionRate = calculateRentalRecognitionRate(portfolioSize);
        newPropertyRentalIncome = property.cost * yieldRate * recognitionRate;
      }
      
      // Total rental income including new property
      const totalRentalIncome = grossRentalIncome + newPropertyRentalIncome;
      
      // Calculate acquisition costs (stamp duty, LMI, legal fees, etc.)
      const lvr = (newLoanAmount / property.cost) * 100;
      
      const acquisitionCosts = calculateAcquisitionCosts({
        propertyPrice: property.cost,
        loanAmount: newLoanAmount,
        lvr: lvr,
        isFirstHomeBuyer: false, // Could add this to profile in future
        lmiWaiver: lmiWaiver,
      });
      
      const totalCashRequired = property.depositRequired + acquisitionCosts.total;
      
      // Enhanced serviceability test with rental income contribution
      const baseCapacity = profile.borrowingCapacity * 0.10;
      const rentalContribution = totalRentalIncome * 0.70; // 70% of rental income counts
      const enhancedCapacity = baseCapacity + rentalContribution;
      const maxAnnualPayment = enhancedCapacity;
      const serviceabilityTestSurplus = maxAnnualPayment - totalAnnualLoanPayment;
      const serviceabilityTestPass = serviceabilityTestSurplus >= 0;
      
      // BORROWING CAPACITY TEST: Total debt cannot exceed EFFECTIVE (dynamic) borrowing capacity
      const borrowingCapacityTestPass = totalDebtAfterPurchase <= effectiveBorrowingCapacity;
      const borrowingCapacityTestSurplus = effectiveBorrowingCapacity - totalDebtAfterPurchase;
      
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

        console.log(`\n--- Period ${timelineDisplay} (Year ${timelineYear.toFixed(1)}) Debug Trace ---`);

        // === AVAILABLE FUNDS BREAKDOWN ===
        const cumulativeSavings = annualSavings * (currentPeriod / PERIODS_PER_YEAR);
        const continuousEquityAccess = totalUsableEquity;
        const totalAnnualSavings = profile.annualSavings + netCashflow; // Self-funding flywheel
        
        console.log(
          `💰 Available Funds: Total = ${depositPool.toLocaleString()}`
        );
        console.log(
          `   ├─ Base Deposit Pool: $${baseDeposit.toLocaleString()}`
        );
        console.log(
          `   ├─ Cumulative Savings: $${cumulativeSavings.toLocaleString()} (${(currentPeriod / PERIODS_PER_YEAR).toFixed(1)} years × $${profile.annualSavings.toLocaleString()})`
        );
        console.log(
          `   ├─ Net Cashflow Reinvestment: $${netCashflow.toLocaleString()}`
        );
        console.log(
          `   └─ Continuous Equity Access: $${continuousEquityAccess.toLocaleString()} (88% LVR cap)`
        );

        // === SELF-FUNDING FLYWHEEL ===
        console.log(
          `🔄 Self-Funding Flywheel: AnnualSavings = BaseSavings($${profile.annualSavings.toLocaleString()}) + NetCashflowReinvestment($${netCashflow.toLocaleString()}) = $${totalAnnualSavings.toLocaleString()}`
        );

        // === EQUITY BREAKDOWN ===
        console.log(
          `🏠 Equity Breakdown: Total Usable = $${totalUsableEquity.toLocaleString()}`
        );
        propertyValues.forEach((value, i) => {
          const equity = usableEquityPerProperty[i];
          console.log(
            `   Property ${i+1}: Value $${value.toLocaleString()} → Usable Equity $${equity.toLocaleString()}`
          );
        });

        // === CASHFLOW BREAKDOWN ===
        console.log(
          `💵 Cashflow: Net = $${netCashflow.toLocaleString()}/year`
        );
        console.log(
          `   ├─ Gross Rental: $${rentalIncome.toLocaleString()}`
        );
        console.log(
          `   ├─ Loan Interest: -$${loanInterest.toLocaleString()}`
        );
        console.log(
          `   └─ Expenses: -$${expenses.toLocaleString()} (30% + 3% annual inflation)`
        );

        // === SERVICEABILITY TEST ===
        const annualLoanPayment = totalAnnualLoanPayment;
        const maxAnnualPaymentValue = maxAnnualPayment;
        const serviceabilitySurplus = serviceabilityTestSurplus;
        
        console.log(
          `📊 Serviceability Test: ${serviceabilityPass ? "PASS" : "FAIL"} (Enhanced with Rental)`
        );
        console.log(
          `   ├─ Loan Payment: $${annualLoanPayment.toLocaleString()}`
        );
        console.log(
          `   ├─ Base Capacity: $${baseCapacity.toLocaleString()} (10% of $${profile.borrowingCapacity.toLocaleString()})`
        );
        console.log(
          `   ├─ Rental Contribution: $${rentalContribution.toLocaleString()} (70% of $${totalRentalIncome.toLocaleString()})`
        );
        console.log(
          `   ├─ Max Annual Payment: $${maxAnnualPaymentValue.toLocaleString()} (base + rental)`
        );
        console.log(
          `   └─ Surplus: $${serviceabilitySurplus.toLocaleString()}`
        );
        console.log(
          `   └─ Deposit Test: $${availableFunds.toLocaleString()} ≥ $${totalCashRequired.toLocaleString()} (deposit + costs)`
        );
        
        // === DYNAMIC BORROWING CAPACITY ===
        console.log(
          `📈 Dynamic Borrowing Capacity:`
        );
        console.log(
          `   ├─ Base Capacity: $${baseCapacity.toLocaleString()}`
        );
        console.log(
          `   ├─ Usable Equity: $${totalUsableEquity.toLocaleString()}`
        );
        console.log(
          `   ├─ Equity Factor: ${(profile.equityFactor * 100).toFixed(0)}%`
        );
        console.log(
          `   ├─ Equity Boost: $${equityBoost.toLocaleString()}`
        );
        console.log(
          `   └─ Effective Capacity: $${effectiveBorrowingCapacity.toLocaleString()}`
        );

        // === DEBT POSITION ===
        console.log(
          `💳 Debt Position: Total After Purchase = $${totalDebt.toLocaleString()}`
        );
        console.log(
          `   ├─ Existing Debt: $${existingDebt.toLocaleString()}`
        );
        console.log(
          `   └─ New Loan Required: $${newLoan.toLocaleString()}`
        );
        
        // === BORROWING CAPACITY CHECK ===
        console.log(
          `🏦 Borrowing Capacity Check: ${borrowingCapacityTestPass ? "PASS" : "FAIL"}`
        );
        console.log(
          `   ├─ Total Debt After Purchase: $${totalDebtAfterPurchase.toLocaleString()}`
        );
        console.log(
          `   ├─ Effective Borrowing Capacity Limit: $${effectiveBorrowingCapacity.toLocaleString()}`
        );
        console.log(
          `   └─ Remaining Capacity: $${borrowingCapacityTestSurplus.toLocaleString()}`
        );

        // === STRATEGY INSIGHTS ===
        const portfolioScalingVelocity = previousPurchases.filter(p => p.period <= currentPeriod).length;
        const selfFundingEfficiency = netCashflow > 0 ? (netCashflow / totalAnnualSavings * 100) : 0;
        const equityRecyclingImpact = continuousEquityAccess > 0 ? (continuousEquityAccess / depositPool * 100) : 0;
        
        console.log(
          `📈 Strategy Insights:`
        );
        console.log(
          `   ├─ Portfolio Scaling: ${portfolioScalingVelocity} properties acquired so far`
        );
        console.log(
          `   ├─ Self-Funding Efficiency: ${selfFundingEfficiency.toFixed(1)}% (cashflow contribution to annual savings)`
        );
        console.log(
          `   └─ Equity Recycling Impact: ${equityRecyclingImpact.toFixed(1)}% (equity as % of available funds)`
        );

        // === FINAL DECISION ===
        console.log(
          `✅ Final Decision: DepositTest = ${depositPass ? "PASS" : "FAIL"} | BorrowingCapacity = ${borrowingCapacityTestPass ? "PASS" : "FAIL"} | ServiceabilityTest = ${serviceabilityPass ? "PASS" : "FAIL"} | Purchase = ${purchaseDecision}`
        );
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
      previousPurchases: Array<{ period: number; cost: number; depositRequired: number; loanAmount: number; title: string; instanceId: string; loanType?: 'IO' | 'PI' }>,
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
      
      for (let period = 1; period <= maxPeriods + pausePeriodsToAdd; period++) {
        iterationCount++;
        if (iterationCount > maxIterations) {
          console.error('[SAFETY] Max iterations exceeded in determineNextPurchasePeriod');
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
            console.log(`[PAUSE] Period ${period} (${periodToDisplay(period)}): Skipped due to active pause period`);
          }
          continue;
        }
        
        // PURCHASE VELOCITY LIMIT: Max 3 properties per 6-month period
        const MAX_PURCHASES_PER_PERIOD = 3;
        const purchasesInThisPeriod = currentPurchases.filter(p => p.period === period).length;
        
        if (purchasesInThisPeriod >= MAX_PURCHASES_PER_PERIOD) {
          if (DEBUG_MODE) {
            console.log(`[PURCHASE LIMIT] Period ${period} (${periodToDisplay(period)}): Blocked - already ${purchasesInThisPeriod} purchases in this period (max: ${MAX_PURCHASES_PER_PERIOD})`);
          }
          continue; // Skip to the next period
        }
        
        // Check if property instance exists
        // If not, use template defaults for this calculation
        // Instance will be auto-created by useEffect after render
        const propertyInstance = getInstance(property.instanceId);
        if (!propertyInstance) {
          console.log(`Property instance not found for ${property.instanceId}, will be created after render`);
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
    const allPropertiesToPurchase: Array<{ property: any; index: number; instanceId: string }> = [];
    
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

    const timelineProperties: TimelineProperty[] = [];
    let purchaseHistory: Array<{ period: number; cost: number; depositRequired: number; loanAmount: number; title: string; instanceId: string; loanType?: 'IO' | 'PI' }> = [];
    
    // Process properties sequentially, determining purchase period for each
    allPropertiesToPurchase.forEach(({ property, index, instanceId }, globalIndex) => {
      // Attach instanceId to property for use in determineNextPurchasePeriod
      const propertyWithInstance = { ...property, instanceId };
      const result = determineNextPurchasePeriod(propertyWithInstance, purchaseHistory, globalIndex);
      const loanAmount = property.cost - property.depositRequired;
      
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
      let rentalRecognitionRate = 0.75;
      
      if (result.period !== Infinity) {
        const purchasePeriod = result.period;
        
        // Calculate existing portfolio value (with growth)
        if (profile.portfolioValue > 0) {
          // Use first property type's growth rates for existing portfolio
          const defaultAssumption = propertyAssumptions[0];
          portfolioValueAfter += calculatePropertyGrowth(profile.portfolioValue, purchasePeriod - 1, defaultAssumption);
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
              totalDebtAfter += purchase.loanAmount;
            }
          }
        });
        
        // Add the current property being purchased
        portfolioValueAfter += property.cost;
        totalDebtAfter += loanAmount;
        
        // Calculate equity
        totalEquityAfter = portfolioValueAfter - totalDebtAfter;
        
        // Calculate available funds used
        const fundsBreakdown = calculateAvailableFunds(purchasePeriod, purchaseHistory);
        availableFundsUsed = fundsBreakdown.total;
        
        // Calculate cashflow breakdown for this property
        // Calculate portfolio size for rental recognition
        portfolioSize = purchaseHistory.filter(p => p.period <= purchasePeriod).length + 1;
        rentalRecognitionRate = calculateRentalRecognitionRate(portfolioSize);
        
        // Get the loan type for this instance (default to 'IO' if not set)
        const currentInstanceLoanType = timelineLoanTypes[instanceId] || 'IO';
        
        // Calculate cashflow from all properties including this one
        [...purchaseHistory, { period: purchasePeriod, cost: property.cost, depositRequired: property.depositRequired, loanAmount: loanAmount, title: property.title, instanceId: instanceId, loanType: currentInstanceLoanType }].forEach(purchase => {
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
            
            // Calculate detailed cashflow
            const cashflowBreakdown = calculateDetailedCashflow(
              propertyWithLandTax,
              purchase.loanAmount
            );
            
            // Use net annual cashflow instead of old 30% rule
            const rentalIncome = cashflowBreakdown.adjustedIncome;
            const propertyLoanPayment = cashflowBreakdown.loanInterest + cashflowBreakdown.principalPayments;
            const propertyExpenses = cashflowBreakdown.totalOperatingExpenses + cashflowBreakdown.totalNonDeductibleExpenses - cashflowBreakdown.potentialDeductions;
            
            grossRentalIncome += rentalIncome;
            loanInterest += propertyLoanPayment;
            expenses += propertyExpenses;
          }
        });
        
        netCashflow = grossRentalIncome - loanInterest - expenses;
      }
      
      // Calculate acquisition costs for this property
      const lvr = (loanAmount / property.cost) * 100;
      
      // Get lmiWaiver from property instance (if available)
      const timelinePropertyInstance = getInstance(instanceId);
      const timelineLmiWaiver = timelinePropertyInstance?.lmiWaiver ?? false;
      
      const acquisitionCosts = calculateAcquisitionCosts({
        propertyPrice: property.cost,
        loanAmount: loanAmount,
        lvr: lvr,
        isFirstHomeBuyer: false,
        lmiWaiver: timelineLmiWaiver,
      });
      
      const totalCashRequired = property.depositRequired + acquisitionCosts.total;
      
      // Calculate test results
      const depositTestSurplus = availableFundsUsed - totalCashRequired;
      const depositTestPass = depositTestSurplus >= 0;
      
      // Enhanced serviceability test with rental income contribution
      const baseCapacity = profile.borrowingCapacity * 0.10;
      const rentalContribution = grossRentalIncome * 0.70; // 70% of rental income counts
      const enhancedCapacity = baseCapacity + rentalContribution;
      const maxAnnualInterest = enhancedCapacity;
      const serviceabilityTestSurplus = maxAnnualInterest - loanInterest;
      const serviceabilityTestPass = serviceabilityTestSurplus >= 0;
      
      // Initialize funds breakdown variables with defaults
      let cumulativeSavings = 0;
      let baseDeposit = 0;
      let equityRelease = 0;
      let cashflowReinvestment = 0;
      
      // Calculate available funds breakdown only if property is affordable
      if (result.period !== Infinity) {
        const purchasePeriod = result.period;
        const fundsBreakdownFinal = calculateAvailableFunds(purchasePeriod, purchaseHistory);
        cumulativeSavings = fundsBreakdownFinal.cumulativeSavings;
        baseDeposit = fundsBreakdownFinal.baseDeposit; // Rolling amount based on deposits used
        
        // Calculate equity release (continuous, 88% LVR cap)
        purchaseHistory.forEach(purchase => {
          if (purchase.period <= purchasePeriod) {
            const periodsOwned = purchasePeriod - purchase.period;
            const propertyData = getPropertyData(purchase.title);
            if (propertyData) {
              const currentValue = calculatePropertyGrowth(purchase.cost, periodsOwned, propertyData);
              const usableEquity = Math.max(0, currentValue * 0.88 - purchase.loanAmount);
              equityRelease += usableEquity;
            }
          }
        });
        
        // Fix: Display accumulated reinvestment correctly
        cashflowReinvestment = Math.max(0, netCashflow);
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
        cost: property.cost,
        depositRequired: property.depositRequired,
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
        
        // Portfolio state before purchase
        portfolioValueBefore: portfolioValueAfter - property.cost,
        totalEquityBefore: totalEquityAfter - (property.cost - loanAmount),
        totalDebtBefore: totalDebtAfter - loanAmount,
        
        // Available funds breakdown
        baseDeposit,
        cumulativeSavings,
        cashflowReinvestment,
        equityRelease,
        
        // Acquisition costs (NEW)
        state: property.state,
        acquisitionCosts: {
          stampDuty: acquisitionCosts.stampDuty,
          lmi: acquisitionCosts.lmi,
          legalFees: acquisitionCosts.legalFees,
          inspectionFees: acquisitionCosts.inspectionFees,
          otherFees: acquisitionCosts.otherFees,
          total: acquisitionCosts.total,
        },
        totalCashRequired: totalCashRequired,
      };
      
      timelineProperties.push(timelineProperty);
      
      // Add to purchase history if affordable
      if (result.period !== Infinity) {
        purchaseHistory.push({
          period: result.period,
          cost: property.cost,
          depositRequired: property.depositRequired,
          loanAmount: loanAmount,
          title: property.title,
          instanceId: instanceId,
          loanType: instanceLoanType
        });
        
        // Sort purchase history by period to maintain chronological order
        purchaseHistory.sort((a, b) => a.period - b.period);
      }
    });
    
    // Sort by period for display
    return timelineProperties.sort((a, b) => a.period - b.period);
  }, [
    // Only re-calculate when these specific values change
    selectionsHash,
    propertyTypes.length,
    profile.timelineYears,
    profile.borrowingCapacity,
    profile.depositPool,
    profile.annualSavings,
    calculatedValues.availableDeposit,
    globalFactors.interestRate,
    getPropertyData,
    propertyAssumptions,
    pauseBlocks,
    timelineLoanTypes,
    createInstance,
    getInstance
  ]);

  // Function to calculate affordability for any period and property
  const calculateAffordabilityForPeriod = useCallback((
    period: number,
    property: any,
    previousPurchases: Array<{ period: number; cost: number; depositRequired: number; loanAmount: number; title: string; instanceId: string; loanType?: 'IO' | 'PI' }>
  ) => {
    const availableFunds = calculateAvailableFunds(period, previousPurchases);
    const affordabilityResult = checkAffordability(property, availableFunds.total, previousPurchases, period);
    
    // Calculate acquisition costs
    const newLoanAmount = property.cost - property.depositRequired;
    const lvr = (newLoanAmount / property.cost) * 100;
    
    // Get lmiWaiver from property instance (if available)
    const affordabilityPropertyInstance = getInstance(property.instanceId);
    const affordabilityLmiWaiver = affordabilityPropertyInstance?.lmiWaiver ?? false;
    
    const acquisitionCosts = calculateAcquisitionCosts({
      propertyPrice: property.cost,
      loanAmount: newLoanAmount,
      lvr: lvr,
      isFirstHomeBuyer: false,
      lmiWaiver: affordabilityLmiWaiver,
    });
    
    const totalCashRequired = property.depositRequired + acquisitionCosts.total;
    
    // Calculate test results even if affordability fails
    const depositTestSurplus = availableFunds.total - totalCashRequired;
    const depositTestPass = depositTestSurplus >= 0;
    
    // Calculate rental income for enhanced serviceability test
    let totalRentalIncome = 0;
    previousPurchases.forEach(purchase => {
      if (purchase.period <= period) {
        const periodsOwned = period - purchase.period;
        const propertyData = getPropertyData(purchase.title);
        if (propertyData) {
          const currentValue = calculatePropertyGrowth(purchase.cost, periodsOwned, propertyData);
          const yieldRate = parseFloat(propertyData.yield) / 100;
          const portfolioSize = previousPurchases.filter(p => p.period <= period).length;
          const recognitionRate = calculateRentalRecognitionRate(portfolioSize);
          totalRentalIncome += currentValue * yieldRate * recognitionRate;
        }
      }
    });
    
    // Add new property rental income
    const propertyData = getPropertyData(property.title);
    if (propertyData) {
      const yieldRate = parseFloat(propertyData.yield) / 100;
      const portfolioSize = previousPurchases.filter(p => p.period <= period).length;
      const recognitionRate = calculateRentalRecognitionRate(portfolioSize);
      totalRentalIncome += property.cost * yieldRate * recognitionRate;
    }
    
    // Calculate total loan payment for serviceability test
    let totalAnnualLoanPayment = 0;
    
    // Existing debt payment (use template default interest rate of 6.5%)
    if (profile.currentDebt > 0) {
      const existingInterestRate = 0.065; // Assume 6.5% for existing debt
      totalAnnualLoanPayment += calculateAnnualLoanPayment(profile.currentDebt, existingInterestRate, 'IO');
    }
    
    // Previous purchases loan payments (use their instance interest rates)
    previousPurchases.forEach(purchase => {
      if (purchase.period <= period) {
        const purchaseInstance = getInstance(purchase.instanceId);
        const purchaseInterestRate = purchaseInstance ? (purchaseInstance.interestRate / 100) : 0.065;
        const purchaseLoanType = purchase.loanType || 'IO';
        totalAnnualLoanPayment += calculateAnnualLoanPayment(purchase.loanAmount, purchaseInterestRate, purchaseLoanType);
      }
    });
    
    // Add new property loan payment (use property instance interest rate, newLoanAmount already declared above)
    const propertyInstance = getInstance(property.instanceId);
    const propertyInterestRate = propertyInstance ? (propertyInstance.interestRate / 100) : 0.065;
    const newPropertyLoanType = property.loanType || 'IO';
    const newPropertyLoanPayment = calculateAnnualLoanPayment(newLoanAmount, propertyInterestRate, newPropertyLoanType);
    totalAnnualLoanPayment += newPropertyLoanPayment;
    
    // Enhanced serviceability test with rental income contribution
    const baseCapacity = profile.borrowingCapacity * 0.10;
    const rentalContribution = totalRentalIncome * 0.70; // 70% of rental income counts
    const enhancedCapacity = baseCapacity + rentalContribution;
    const maxAnnualPayment = enhancedCapacity;
    const serviceabilityTestSurplus = maxAnnualPayment - totalAnnualLoanPayment;
    const serviceabilityTestPass = serviceabilityTestSurplus >= 0;
    
    return {
      canAfford: affordabilityResult.canAfford,
      depositTestSurplus,
      depositTestPass,
      serviceabilityTestSurplus,
      serviceabilityTestPass,
      availableFunds: availableFunds.total
    };
  }, [profile, globalFactors, calculatedValues, getPropertyData]);

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
            period: 1 // Default period
          });
        }
      }
    });
    
    // Create all missing instances
    if (instancesToCreate.length > 0) {
      console.log(`Auto-creating ${instancesToCreate.length} missing property instances`);
      instancesToCreate.forEach(({ instanceId, propertyType, period }) => {
        console.log(`Creating instance: ${instanceId} for ${propertyType}`);
        createInstance(instanceId, propertyType, period);
      });
    }
  }, [calculateTimelineProperties, getInstance, createInstance]);

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

  // Only expose the memoized result
  return {
    timelineProperties: calculateTimelineProperties,
    isCalculating: false, // Could add state tracking if needed
    calculateAffordabilityForProperty: calculateAffordabilityForPeriod,
    updateTimelinePropertyLoanType,
    isRecalculating,
  };
};