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
  status: 'purchased' | 'affordable' | 'not-affordable';
  propertyNumber?: number;
  propertyType?: string;
  
  // Financial metrics
  availableDeposit: number;
  requiredDeposit: number;
  availableBorrowingCapacity: number;
  requiredLoan: number;
  propertyCost: number;
  
  // Portfolio metrics
  totalEquity: number;
  totalDebt: number;
  annualCashFlow: number;
  portfolioValue: number;
  
  // Breakdown details
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
      
      for (let year = startYear; year < endYear; year++) {
        const yearIndex = year - startYear + 1;
        
        // Calculate available funds for this year
        const yearsSinceStart = year - startYear;
        const accumulatedSavings = stableProfile.annualSavings * yearsSinceStart;
        const equityGrowth = cumulativeValue * Math.pow(1 + growthRate, 1) - cumulativeValue;
        const availableEquity = cumulativeEquity + (equityGrowth * (stableProfile.equityReleaseFactor / 100));
        const availableDeposit = stableProfile.depositPool + accumulatedSavings + availableEquity;
        
        // Calculate rental income from previous purchases
        let totalRentalIncome = 0;
        allPurchases.forEach(purchase => {
          const yearsOwned = year - purchase.year;
          if (yearsOwned > 0) {
            const propertyData = getPropertyData(purchase.propertyId);
            const currentValue = purchase.cost * Math.pow(1 + parseFloat(propertyData.growth) / 100, yearsOwned);
            const yieldRate = parseFloat(propertyData.yield) / 100;
            totalRentalIncome += currentValue * yieldRate * 0.75; // 75% recognition
          }
        });
        
        const annualDebtService = cumulativeDebt * interestRate;
        const annualCashFlow = totalRentalIncome + stableProfile.annualSavings - annualDebtService;
        
        // Check if we can afford the next property in the schedule
        let yearStatus: 'purchased' | 'affordable' | 'not-affordable' = 'not-affordable';
        let purchaseData: PropertyPurchaseBreakdown | null = null;
        
        if (propertyCount < purchaseSchedule.length) {
          const nextProperty = purchaseSchedule[propertyCount];
          const propertyData = getPropertyData(nextProperty.propertyId);
          
          // Skip if property data not found
          if (!propertyData || !propertyData.averageCost) {
            console.warn(`Property data not found for ID: ${nextProperty.propertyId}`);
            data.push({
              year: yearIndex,
              displayYear: year,
              status: 'not-affordable',
              availableDeposit,
              requiredDeposit: 0,
              availableBorrowingCapacity: stableProfile.borrowingCapacity - cumulativeDebt,
              requiredLoan: 0,
              propertyCost: 0,
              totalEquity: cumulativeEquity,
              totalDebt: cumulativeDebt,
              annualCashFlow,
              portfolioValue: cumulativeValue,
              purchases: []
            });
            continue;
          }
          
          const propertyCost = parseFloat(propertyData.averageCost);
          const requiredDeposit = propertyCost * (1 - lvr);
          const requiredLoan = propertyCost * lvr;
          
          // Check affordability
          const hasDeposit = availableDeposit >= requiredDeposit + stableProfile.depositBuffer;
          const hasBorrowingCapacity = stableProfile.borrowingCapacity >= (cumulativeDebt + requiredLoan);
          const hasServiceability = annualCashFlow >= 0;
          
          if (hasDeposit && hasBorrowingCapacity && hasServiceability) {
            yearStatus = 'purchased';
            propertyCount++;
            
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
          } else if (hasDeposit && hasBorrowingCapacity) {
            yearStatus = 'affordable';
          }
        }
        
        data.push({
          year: yearIndex,
          displayYear: year,
          status: yearStatus,
          propertyNumber: yearStatus === 'purchased' ? propertyCount : undefined,
          propertyType: purchaseData?.propertyType,
          availableDeposit,
          requiredDeposit: purchaseData?.deposit || 0,
          availableBorrowingCapacity: stableProfile.borrowingCapacity - cumulativeDebt,
          requiredLoan: purchaseData?.loanAmount || 0,
          propertyCost: purchaseData?.cost || 0,
          totalEquity: cumulativeEquity,
          totalDebt: cumulativeDebt,
          annualCashFlow,
          portfolioValue: cumulativeValue,
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
