import React, { useMemo } from 'react';
import { useInvestmentProfile } from './useInvestmentProfile';
import { usePropertySelection } from '../contexts/PropertySelectionContext';
import { useDataAssumptions } from '../contexts/DataAssumptionsContext';
import type { TimelineProperty } from '../types/property';

export interface AffordabilityResult {
  year: number;
  canAfford: boolean;
  availableFunds: number;
  usableEquity: number;
  totalPortfolioValue: number;
  totalDebt: number;
}

export const useAffordabilityCalculator = () => {
  const { profile, calculatedValues } = useInvestmentProfile();
  const { selections, propertyTypes } = usePropertySelection();
  const { globalFactors, getPropertyData } = useDataAssumptions();

  const calculateTimelineProperties = useMemo((): TimelineProperty[] => {
    const startTime = performance.now();
    console.log('[AFFORDABILITY] ========== CALCULATION START ==========');
    console.log('[AFFORDABILITY] Input Data:', {
      profile: {
        timelineYears: profile.timelineYears,
        borrowingCapacity: profile.borrowingCapacity,
        annualSavings: profile.annualSavings,
        portfolioValue: profile.portfolioValue,
        currentDebt: profile.currentDebt
      },
      calculatedValues: {
        availableDeposit: calculatedValues.availableDeposit
      },
      selections,
      globalFactors: {
        growthRate: globalFactors.growthRate,
        interestRate: globalFactors.interestRate
      },
      propertyTypesCount: propertyTypes.length
    });

    // Move ALL helper functions inside useMemo to avoid closure issues
    
    const calculatePropertyGrowth = (initialValue: number, years: number) => {
      const growthRate = parseFloat(globalFactors.growthRate) / 100;
      return initialValue * Math.pow(1 + growthRate, years);
    };

    const calculateCurrentRentalIncome = (
      previousPurchases: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number; title: string }>,
      currentYear: number
    ): number => {
      return previousPurchases.reduce((totalIncome, purchase) => {
        if (purchase.year <= currentYear) {
          const yearsOwned = currentYear - purchase.year;
          const propertyData = getPropertyData(purchase.title);
          
          if (propertyData) {
            const propertyGrowthRate = parseFloat(propertyData.growth) / 100;
            const currentValue = purchase.cost * Math.pow(1 + propertyGrowthRate, yearsOwned);
            const yieldRate = parseFloat(propertyData.yield) / 100;
            return totalIncome + (currentValue * yieldRate);
          }
        }
        return totalIncome;
      }, 0);
    };

    const calculateAvailableFunds = (
      currentYear: number, 
      previousPurchases: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number; title: string }>
    ) => {
      // Calculate accumulated cash savings
      const accumulatedSavings = currentYear > 1 ? profile.annualSavings * (currentYear - 1) : 0;
      let availableCash = calculatedValues.availableDeposit + accumulatedSavings;
      
      // Subtract deposits used for previous purchases
      previousPurchases.forEach(purchase => {
        if (purchase.year <= currentYear) {
          availableCash -= purchase.depositRequired;
        }
      });

      // Calculate usable equity from existing portfolio (grown)
      let existingPortfolioEquity = 0;
      if (profile.portfolioValue > 0) {
        const grownPortfolioValue = calculatePropertyGrowth(profile.portfolioValue, currentYear - 1);
        existingPortfolioEquity = Math.max(0, (grownPortfolioValue * 0.8) - profile.currentDebt);
      }

      // Calculate usable equity from previous purchases
      let totalUsableEquity = previousPurchases.reduce((acc, purchase) => {
        if (purchase.year <= currentYear) {
          const propertyCurrentValue = calculatePropertyGrowth(purchase.cost, currentYear - purchase.year);
          const usableEquity = (propertyCurrentValue * 0.8) - purchase.loanAmount;
          return acc + Math.max(0, usableEquity);
        }
        return acc;
      }, existingPortfolioEquity);

      const totalAvailableFunds = availableCash + totalUsableEquity;
      
      console.log('[AFFORDABILITY] Available Funds Calculation for Year', currentYear, {
        accumulatedSavings,
        availableCash: availableCash - accumulatedSavings + accumulatedSavings,
        existingPortfolioEquity,
        totalUsableEquity,
        totalAvailableFunds,
        previousPurchasesCount: previousPurchases.filter(p => p.year <= currentYear).length
      });

      return totalAvailableFunds;
    };

    const checkAffordability = (
      property: any,
      availableFunds: number,
      previousPurchases: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number; title: string }>,
      currentYear: number
    ): boolean => {
      // Simple affordability check: (1) Can afford deposit, (2) Total debt under capacity limit
      const canAffordDeposit = availableFunds >= property.depositRequired;
      
      // Calculate total existing debt
      let totalExistingDebt = profile.currentDebt;
      previousPurchases.forEach(purchase => {
        if (purchase.year <= currentYear) {
          totalExistingDebt += purchase.loanAmount;
        }
      });
      
      // Simple borrowing check: total debt after purchase must be under borrowing capacity
      const newLoanAmount = property.cost - property.depositRequired;
      const totalDebtAfterPurchase = totalExistingDebt + newLoanAmount;
      const canAffordBorrowing = totalDebtAfterPurchase <= profile.borrowingCapacity;
      
      const isAffordable = canAffordDeposit && canAffordBorrowing;
      
      console.log('[AFFORDABILITY] Affordability Check for', property.title, 'in Year', currentYear, {
        propertyDetails: {
          cost: property.cost,
          depositRequired: property.depositRequired,
          newLoanAmount
        },
        checks: {
          canAffordDeposit,
          canAffordBorrowing,
          isAffordable
        },
        financials: {
          availableFunds,
          totalExistingDebt,
          totalDebtAfterPurchase,
          borrowingCapacity: profile.borrowingCapacity,
          remainingCapacity: profile.borrowingCapacity - totalDebtAfterPurchase
        }
      });
      
      return isAffordable;
    };

    const determineNextPurchaseYear = (
      property: any,
      previousPurchases: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number; title: string }>
    ): number => {
      console.log('[AFFORDABILITY] Determining purchase year for', property.title, {
        timelineYears: profile.timelineYears,
        previousPurchasesCount: previousPurchases.length
      });
      
      for (let year = 1; year <= profile.timelineYears; year++) {
        const availableFunds = calculateAvailableFunds(year, previousPurchases);
        const canAfford = checkAffordability(property, availableFunds, previousPurchases, year);
        
        if (canAfford) {
          const absoluteYear = year + 2025 - 1;
          console.log('[AFFORDABILITY] ✅ Found affordable year for', property.title, ':', absoluteYear);
          return absoluteYear; // Convert to absolute year
        }
      }
      
      console.log('[AFFORDABILITY] ❌ Cannot afford', property.title, 'within timeline');
      return Infinity; // Cannot afford within timeline
    };

    const calculateAffordabilityForProperty = (
      property: any,
      propertyIndex: number,
      previousPurchases: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number; title: string }>
    ): AffordabilityResult => {
      const purchaseYear = determineNextPurchaseYear(property, previousPurchases);
      
      if (purchaseYear === Infinity) {
        // Not affordable within timeline
        return {
          year: 2025 + profile.timelineYears + propertyIndex,
          canAfford: false,
          availableFunds: 0,
          usableEquity: 0,
          totalPortfolioValue: 0,
          totalDebt: 0
        };
      }
      
      // Calculate values at the purchase year
      const relativeYear = purchaseYear - 2025 + 1;
      const availableFunds = calculateAvailableFunds(relativeYear, previousPurchases);
      
      // Calculate portfolio values for return
      let totalPortfolioValue = profile.portfolioValue;
      if (profile.portfolioValue > 0) {
        totalPortfolioValue = calculatePropertyGrowth(profile.portfolioValue, relativeYear - 1);
      }
      
      let totalDebt = profile.currentDebt;
      previousPurchases.forEach(purchase => {
        if (purchase.year <= relativeYear) {
          const yearsOwned = relativeYear - purchase.year;
          totalPortfolioValue += calculatePropertyGrowth(purchase.cost, yearsOwned);
          totalDebt += purchase.loanAmount;
        }
      });

      const usableEquity = Math.max(0, totalPortfolioValue * 0.8 - totalDebt);
      
      return {
        year: purchaseYear,
        canAfford: true,
        availableFunds,
        usableEquity,
        totalPortfolioValue,
        totalDebt
      };
    };

    // Main calculation logic - Create a list of all properties to purchase
    const allPropertiesToPurchase: Array<{ property: any; index: number }> = [];
    
    Object.entries(selections).forEach(([propertyId, quantity]) => {
      if (quantity > 0) {
        const property = propertyTypes.find(p => p.id === propertyId);
        if (property) {
          console.log('[AFFORDABILITY] Adding property to purchase list:', {
            title: property.title,
            quantity,
            cost: property.cost,
            depositRequired: property.depositRequired
          });
          for (let i = 0; i < quantity; i++) {
            allPropertiesToPurchase.push({ property, index: i });
          }
        }
      }
    });

    console.log('[AFFORDABILITY] Total properties to process:', allPropertiesToPurchase.length);

    const timelineProperties: TimelineProperty[] = [];
    const purchaseHistory: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number; title: string }> = [];
    
    // Process properties sequentially, determining purchase year for each
    allPropertiesToPurchase.forEach(({ property, index }, globalIndex) => {
      console.log(`[AFFORDABILITY] Processing property ${globalIndex + 1}/${allPropertiesToPurchase.length}:`, property.title);
      const result = calculateAffordabilityForProperty(property, globalIndex, purchaseHistory);
      const loanAmount = property.cost - property.depositRequired;
      
      timelineProperties.push({
        id: `${property.id}_${index}`,
        title: property.title,
        cost: property.cost,
        depositRequired: property.depositRequired,
        loanAmount: loanAmount,
        affordableYear: result.year,
        status: result.canAfford ? 'feasible' : 'challenging',
        propertyIndex: index,
        portfolioValueAfter: result.totalPortfolioValue + (result.canAfford ? property.cost : 0),
        totalEquityAfter: result.canAfford ? 
          (result.totalPortfolioValue + property.cost) - (result.totalDebt + loanAmount) : 
          result.totalPortfolioValue - result.totalDebt,
        availableFundsUsed: result.availableFunds
      });
      
      // Add to purchase history if affordable
      if (result.canAfford) {
        purchaseHistory.push({
          year: result.year - 2025 + 1, // Convert back to relative year
          cost: property.cost,
          depositRequired: property.depositRequired,
          loanAmount: loanAmount,
          title: property.title
        });
        
        // Sort purchase history by year to maintain chronological order
        purchaseHistory.sort((a, b) => a.year - b.year);
      }
    });
    
    // Sort by affordable year for display
    const sortedProperties = timelineProperties.sort((a, b) => a.affordableYear - b.affordableYear);
    
    const endTime = performance.now();
    console.log('[AFFORDABILITY] ========== CALCULATION COMPLETE ==========');
    console.log('[AFFORDABILITY] Final Timeline Properties:', sortedProperties);
    console.log('[AFFORDABILITY] Performance:', {
      calculationTime: `${(endTime - startTime).toFixed(2)}ms`,
      propertiesProcessed: allPropertiesToPurchase.length,
      feasibleProperties: sortedProperties.filter(p => p.status === 'feasible').length,
      challengingProperties: sortedProperties.filter(p => p.status === 'challenging').length
    });
    console.log('[AFFORDABILITY] Purchase Timeline Summary:', 
      sortedProperties.map(p => ({
        title: p.title,
        affordableYear: p.affordableYear,
        status: p.status,
        cost: p.cost
      }))
    );
    
    return sortedProperties;
  }, [
    // Only re-calculate when these specific values change
    JSON.stringify(selections),
    propertyTypes.length,
    profile.timelineYears,
    profile.borrowingCapacity,
    profile.depositPool,
    profile.annualSavings,
    calculatedValues.availableDeposit,
    globalFactors.growthRate,
    globalFactors.interestRate
  ]);

  // Only expose the memoized result
  return {
    timelineProperties: calculateTimelineProperties,
    calculateAffordabilityForProperty: () => {} // Placeholder since this is now internal
  };
};
