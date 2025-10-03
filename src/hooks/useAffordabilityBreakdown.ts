import { useMemo, useRef, useEffect, useState } from 'react';
import { useInvestmentProfile } from './useInvestmentProfile';
import { usePropertySelection } from '../contexts/PropertySelectionContext';
import { useDataAssumptions } from '../contexts/DataAssumptionsContext';

export interface PropertyPurchaseBreakdown {
  propertyId: string;
  propertyType: string;
  cost: number;
  deposit: number;
  loanAmount: number;
  year: number;
}

export interface YearBreakdownData {
  year: number;
  displayYear: number;
  status: 'initial' | 'purchased' | 'blocked' | 'waiting' | 'consolidated';
  propertyNumber: number | null;
  propertyType: string | null;
  
  // Portfolio metrics
  portfolioValue: number;
  totalEquity: number;
  totalDebt: number;
  
  // Cash engine
  availableDeposit: number;
  annualCashFlow: number;
  
  // Available funds breakdown
  baseDeposit: number;
  cumulativeSavings: number;
  cashflowReinvestment: number;
  equityRelease: number;
  
  // Cashflow components
  grossRental: number;
  loanRepayments: number;
  expenses: number;
  
  // Requirements
  requiredDeposit: number;
  requiredLoan: number;
  propertyCost: number;
  
  // Capacity
  availableBorrowingCapacity: number;
  borrowingCapacity: number;
  
  // Assumptions
  interestRate: number;
  rentalRecognition: number;
  
  // Tests
  depositTest: {
    pass: boolean;
    surplus: number;
    available: number;
    required: number;
  };
  
  serviceabilityTest: {
    pass: boolean;
    surplus: number;
    available: number;
    required: number;
  };
  
  // Flags
  gapRule: boolean;
  equityReleaseYear: boolean;
  
  // Consolidation
  consolidation?: {
    triggered: boolean;
    eligible: boolean;
    consecutiveFailures: number;
    propertiesSold?: number;
    equityFreed?: number;
    debtReduced?: number;
    newLvr?: number;
  };
  
  // Strategy metrics
  portfolioScaling: number;
  selfFundingEfficiency: number;
  equityRecyclingImpact: number;
  dsr: number; // Debt service ratio
  lvr: number; // Loan to value ratio
  
  // Breakdown details (legacy)
  purchases: PropertyPurchaseBreakdown[];
}

// Deep comparison utility
const useDeepCompare = (value: any) => {
  const ref = useRef<any>();
  
  if (!deepEqual(value, ref.current)) {
    ref.current = value;
  }
  
  return ref.current;
};

const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => deepEqual(a[key], b[key]));
};

export const useAffordabilityBreakdown = (): {
  data: YearBreakdownData[];
  isCalculating: boolean;
  hasChanges: boolean;
} => {
  const { profile, calculatedValues } = useInvestmentProfile();
  const { selections, propertyTypes } = usePropertySelection();
  const { globalFactors, getPropertyData } = useDataAssumptions();
  
  // Track calculation state for smooth loading
  const [isCalculating, setIsCalculating] = useState(false);
  const previousDataRef = useRef<YearBreakdownData[]>([]);
  const calculationTimerRef = useRef<NodeJS.Timeout>();
  
  // Use deep comparison for selections to avoid unnecessary recalculations
  const stableSelections = useDeepCompare(selections);
  const stableProfile = useDeepCompare({
    timelineYears: profile.timelineYears,
    borrowingCapacity: profile.borrowingCapacity,
    annualSavings: profile.annualSavings,
    portfolioValue: profile.portfolioValue,
    currentDebt: profile.currentDebt,
    depositBuffer: profile.depositBuffer,
    equityReleaseFactor: profile.equityReleaseFactor,
    depositPool: profile.depositPool
  });
  
  // Log when key values change
  useEffect(() => {
    console.log('Hook dependencies updated:', {
      selections: stableSelections,
      profile: stableProfile,
      globalFactors,
      currentUsableEquity: calculatedValues.currentUsableEquity
    });
  }, [stableSelections, stableProfile, globalFactors, calculatedValues.currentUsableEquity]);
  
  // Stage 1: Calculate purchase schedule (only when selections change)
  const purchaseSchedule = useMemo(() => {
    const schedule: Array<{ propertyId: string; quantity: number }> = [];
    
    if (stableSelections && typeof stableSelections === 'object') {
      Object.entries(stableSelections as Record<string, number>).forEach(([propertyId, quantity]) => {
        if (typeof quantity === 'number' && quantity > 0) {
          schedule.push({ propertyId, quantity });
        }
      });
    }
    
    console.log('Purchase schedule calculated:', schedule);
    return schedule;
  }, [stableSelections]);
  
  // Stage 2: Calculate timeline (main computation)
  const yearlyBreakdown = useMemo(() => {
    // Set calculating flag with a small delay to prevent flash
    if (calculationTimerRef.current) {
      clearTimeout(calculationTimerRef.current);
    }
    calculationTimerRef.current = setTimeout(() => setIsCalculating(true), 100);
    
    try {
      const data: YearBreakdownData[] = [];
      const startYear = 2025;
      const endYear = startYear + stableProfile.timelineYears;
      
      const growthRate = parseFloat(globalFactors.growthRate) / 100;
      const interestRate = parseFloat(globalFactors.interestRate) / 100;
      const lvr = parseFloat(globalFactors.loanToValueRatio) / 100;
      
      // Validate we have property data before proceeding
      if (!purchaseSchedule.length) {
        console.log('No properties in purchase schedule, returning empty timeline');
        if (calculationTimerRef.current) {
          clearTimeout(calculationTimerRef.current);
        }
        setIsCalculating(false);
        return [];
      }
      
      console.log('Starting timeline calculation', {
        purchaseSchedule,
        startYear,
        endYear,
        growthRate,
        interestRate,
        lvr
      });
      
      // Track portfolio state
      let cumulativeEquity = calculatedValues.currentUsableEquity || 0;
      let cumulativeDebt = stableProfile.currentDebt;
      let cumulativeValue = stableProfile.portfolioValue;
      let propertyCount = 0;
      const allPurchases: PropertyPurchaseBreakdown[] = [];
      let lastPurchaseYear = 0;
      let consecutiveFailures = 0;
      
      for (let year = startYear; year < endYear; year++) {
        const yearIndex = year - startYear + 1;
        const yearsSinceStart = year - startYear;
        
        // Calculate available funds components
        const baseDeposit = stableProfile.depositPool;
        const accumulatedSavings = stableProfile.annualSavings * yearsSinceStart;
        const equityGrowth = cumulativeValue * Math.pow(1 + growthRate, 1) - cumulativeValue;
        const isEquityYear = yearIndex % 3 === 0;
        const equityRelease = isEquityYear ? (cumulativeEquity + equityGrowth) * (stableProfile.equityReleaseFactor / 100) : 0;
        
        // Calculate rental income and expenses from previous purchases
        let grossRentalIncome = 0;
        let totalExpenses = 0;
        
        allPurchases.forEach(purchase => {
          const yearsOwned = year - purchase.year;
          if (yearsOwned > 0) {
            const propertyData = getPropertyData(purchase.propertyId);
            const currentValue = purchase.cost * Math.pow(1 + parseFloat(propertyData.growth) / 100, yearsOwned);
            const yieldRate = parseFloat(propertyData.yield) / 100;
            grossRentalIncome += currentValue * yieldRate;
            // Estimate expenses at 30% of rental income
            totalExpenses += currentValue * yieldRate * 0.3;
          }
        });
        
        const rentalRecognitionRate = 75; // 75% recognition by banks
        const recognizedRental = grossRentalIncome * (rentalRecognitionRate / 100);
        const annualDebtService = cumulativeDebt * interestRate;
        const annualCashFlow = recognizedRental + stableProfile.annualSavings - annualDebtService - totalExpenses;
        
        // Cashflow reinvestment (cumulative positive cashflow from previous years)
        let cumulativeCashflow = 0;
        for (let i = 0; i < yearsSinceStart; i++) {
          // Simplified - actual calculation would track year by year
          cumulativeCashflow += annualCashFlow > 0 ? annualCashFlow * 0.5 : 0;
        }
        
        const availableDeposit = baseDeposit + accumulatedSavings + cumulativeCashflow + equityRelease;
        
        // Check 12-month gap rule
        const isWithinGapPeriod = (year - lastPurchaseYear) < 1 && lastPurchaseYear > 0;
        
        // Check if we can afford the next property in the schedule
        let yearStatus: 'initial' | 'purchased' | 'blocked' | 'waiting' | 'consolidated' = 
          yearIndex === 1 ? 'initial' : 'waiting';
        let purchaseData: PropertyPurchaseBreakdown | null = null;
        let requiredDeposit = 0;
        let requiredLoan = 0;
        let propertyCost = 0;
        let propertyTypeStr: string | null = null;
        
        // Test results
        let depositTest = {
          pass: true,
          surplus: availableDeposit,
          available: availableDeposit,
          required: 0
        };
        
        let serviceabilityTest = {
          pass: true,
          surplus: stableProfile.borrowingCapacity - cumulativeDebt,
          available: stableProfile.borrowingCapacity - cumulativeDebt,
          required: 0
        };
        
        if (propertyCount < purchaseSchedule.length && !isWithinGapPeriod) {
          const nextProperty = purchaseSchedule[propertyCount];
          const propertyData = getPropertyData(nextProperty.propertyId);
          
          // Skip if property data not found
          if (!propertyData || !propertyData.averageCost) {
            console.warn(`Property data not found for ID: ${nextProperty.propertyId}`);
            
            const lvr = cumulativeValue > 0 ? (cumulativeDebt / cumulativeValue) * 100 : 0;
            const dsr = stableProfile.borrowingCapacity > 0 ? (annualDebtService / stableProfile.borrowingCapacity) * 100 : 0;
            
            data.push({
              year: yearIndex,
              displayYear: year,
              status: 'blocked',
              propertyNumber: null,
              propertyType: null,
              baseDeposit,
              cumulativeSavings: accumulatedSavings,
              cashflowReinvestment: cumulativeCashflow,
              equityRelease,
              availableDeposit,
              requiredDeposit: 0,
              availableBorrowingCapacity: stableProfile.borrowingCapacity - cumulativeDebt,
              borrowingCapacity: stableProfile.borrowingCapacity,
              requiredLoan: 0,
              propertyCost: 0,
              grossRental: grossRentalIncome,
              loanRepayments: annualDebtService,
              expenses: totalExpenses,
              totalEquity: cumulativeEquity,
              totalDebt: cumulativeDebt,
              annualCashFlow,
              portfolioValue: cumulativeValue,
              interestRate: interestRate * 100,
              rentalRecognition: rentalRecognitionRate,
              depositTest,
              serviceabilityTest,
              gapRule: isWithinGapPeriod,
              equityReleaseYear: isEquityYear,
              portfolioScaling: propertyCount,
              selfFundingEfficiency: 0,
              equityRecyclingImpact: 0,
              dsr,
              lvr,
              purchases: []
            });
            continue;
          }
          
          propertyCost = parseFloat(propertyData.averageCost);
          requiredDeposit = propertyCost * (1 - lvr);
          requiredLoan = propertyCost * lvr;
          propertyTypeStr = propertyData.type;
          
          // Update test results
          depositTest = {
            pass: availableDeposit >= requiredDeposit + stableProfile.depositBuffer,
            surplus: availableDeposit - (requiredDeposit + stableProfile.depositBuffer),
            available: availableDeposit,
            required: requiredDeposit + stableProfile.depositBuffer
          };
          
          const availableBorrowing = stableProfile.borrowingCapacity - cumulativeDebt;
          serviceabilityTest = {
            pass: availableBorrowing >= requiredLoan && annualCashFlow >= 0,
            surplus: availableBorrowing - requiredLoan,
            available: availableBorrowing,
            required: requiredLoan
          };
          
          // Check affordability
          if (depositTest.pass && serviceabilityTest.pass) {
            yearStatus = 'purchased';
            propertyCount++;
            lastPurchaseYear = year;
            consecutiveFailures = 0;
            
            purchaseData = {
              propertyId: nextProperty.propertyId,
              propertyType: propertyData.type,
              cost: propertyCost,
              deposit: requiredDeposit,
              loanAmount: requiredLoan,
              year: year
            };
            
            allPurchases.push(purchaseData);
            
            // Update portfolio metrics
            cumulativeDebt += requiredLoan;
            cumulativeValue += propertyCost;
            cumulativeEquity += requiredDeposit;
          } else {
            yearStatus = 'blocked';
            consecutiveFailures++;
          }
        } else if (isWithinGapPeriod) {
          yearStatus = 'waiting';
        }
        
        // Calculate strategy metrics
        const currentLvr = cumulativeValue > 0 ? (cumulativeDebt / cumulativeValue) * 100 : 0;
        const currentDsr = stableProfile.borrowingCapacity > 0 ? (annualDebtService / stableProfile.borrowingCapacity) * 100 : 0;
        const totalAnnualSavings = stableProfile.annualSavings;
        const selfFundingEff = totalAnnualSavings > 0 && annualCashFlow > 0 ? (annualCashFlow / totalAnnualSavings) * 100 : 0;
        const equityRecyclingImp = availableDeposit > 0 && equityRelease > 0 ? (equityRelease / availableDeposit) * 100 : 0;
        
        // Consolidation logic (placeholder for future implementation)
        const consolidation = consecutiveFailures >= 3 ? {
          triggered: false,
          eligible: true,
          consecutiveFailures,
          propertiesSold: 0,
          equityFreed: 0,
          debtReduced: 0,
          newLvr: currentLvr
        } : undefined;
        
        data.push({
          year: yearIndex,
          displayYear: year,
          status: yearStatus,
          propertyNumber: yearStatus === 'purchased' ? propertyCount : null,
          propertyType: propertyTypeStr,
          baseDeposit,
          cumulativeSavings: accumulatedSavings,
          cashflowReinvestment: cumulativeCashflow,
          equityRelease,
          availableDeposit,
          requiredDeposit,
          availableBorrowingCapacity: stableProfile.borrowingCapacity - cumulativeDebt,
          borrowingCapacity: stableProfile.borrowingCapacity,
          requiredLoan,
          propertyCost,
          grossRental: grossRentalIncome,
          loanRepayments: annualDebtService,
          expenses: totalExpenses,
          totalEquity: cumulativeEquity,
          totalDebt: cumulativeDebt,
          annualCashFlow,
          portfolioValue: cumulativeValue,
          interestRate: interestRate * 100,
          rentalRecognition: rentalRecognitionRate,
          depositTest,
          serviceabilityTest,
          gapRule: isWithinGapPeriod,
          equityReleaseYear: isEquityYear,
          consolidation,
          portfolioScaling: propertyCount,
          selfFundingEfficiency: selfFundingEff,
          equityRecyclingImpact: equityRecyclingImp,
          dsr: currentDsr,
          lvr: currentLvr,
          purchases: yearStatus === 'purchased' && purchaseData ? [purchaseData] : []
        });
      }
      
      // Clear the calculating flag
      if (calculationTimerRef.current) {
        clearTimeout(calculationTimerRef.current);
      }
      setIsCalculating(false);
      
      return data;
    } catch (error) {
      if (calculationTimerRef.current) {
        clearTimeout(calculationTimerRef.current);
      }
      setIsCalculating(false);
      console.error('Error calculating affordability breakdown:', error);
      return previousDataRef.current;
    }
  }, [
    purchaseSchedule,
    stableProfile,
    globalFactors.growthRate,
    globalFactors.interestRate,
    globalFactors.loanToValueRatio,
    calculatedValues.currentUsableEquity,
    getPropertyData
  ]);
  
  // Detect meaningful changes
  const hasChanges = useMemo(() => {
    if (previousDataRef.current.length !== yearlyBreakdown.length) return true;
    
    // Check if any purchase years or statuses changed
    return yearlyBreakdown.some((year, index) => {
      const prevYear = previousDataRef.current[index];
      return !prevYear || 
             year.status !== prevYear.status || 
             year.propertyNumber !== prevYear.propertyNumber;
    });
  }, [yearlyBreakdown]);
  
  // Update previous data reference
  useEffect(() => {
    if (hasChanges) {
      previousDataRef.current = yearlyBreakdown;
    }
  }, [yearlyBreakdown, hasChanges]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (calculationTimerRef.current) {
        clearTimeout(calculationTimerRef.current);
      }
    };
  }, []);
  
  return {
    data: yearlyBreakdown,
    isCalculating,
    hasChanges
  };
};
