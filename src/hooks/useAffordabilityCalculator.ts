import { useMemo } from 'react';
import { useInvestmentProfile } from './useInvestmentProfile';
import { usePropertySelection } from '../contexts/PropertySelectionContext';
import { useDataAssumptions } from '../contexts/DataAssumptionsContext';
import { calculateUpdatedBorrowingCapacity } from '../utils/metricsCalculator';
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
  
  // Add this debug line
  console.log('🎯 useAffordabilityCalculator received profile:', profile);
  
  const { selections, propertyTypes } = usePropertySelection();
  const { globalFactors, getPropertyData } = useDataAssumptions();

  const calculateTimelineProperties = useMemo((): TimelineProperty[] => {
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

      return availableCash + totalUsableEquity;
    };

    const checkAffordability = (
      property: any,
      availableFunds: number,
      previousPurchases: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number; title: string }>,
      currentYear: number
    ): boolean => {
      // Check if we have enough funds for deposit
      const canAffordDeposit = availableFunds >= property.depositRequired;
      
      // Calculate total existing debt
      let totalExistingDebt = profile.currentDebt;
      previousPurchases.forEach(purchase => {
        if (purchase.year <= currentYear) {
          totalExistingDebt += purchase.loanAmount;
        }
      });

      // Calculate current rental income from existing properties
      const currentRentalIncome = calculateCurrentRentalIncome(previousPurchases, currentYear);
      
      // Calculate updated borrowing capacity considering rental income
      const updatedBorrowingCapacity = calculateUpdatedBorrowingCapacity(
        profile.borrowingCapacity,
        totalExistingDebt,
        currentRentalIncome
      );
      
      const newLoanAmount = property.cost - property.depositRequired;
      const canAffordBorrowing = (totalExistingDebt + newLoanAmount) <= updatedBorrowingCapacity;
      
      return canAffordDeposit && canAffordBorrowing;
    };

    const determineNextPurchaseYear = (
      property: any,
      previousPurchases: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number; title: string }>
    ): number => {
      // Use the current profile values from the memo dependencies
      console.log('🔍 Determining purchase year for:', property.title);
      console.log('📊 Profile:', { 
        timelineYears: profile.timelineYears, 
        deposit: profile.depositPool,
        borrowingCapacity: profile.borrowingCapacity,
        annualSavings: profile.annualSavings
      });
      console.log('💰 Property needs:', {
        cost: property.cost,
        deposit: property.depositRequired,
        loan: property.cost - property.depositRequired
      });
      console.log('📈 Previous purchases:', previousPurchases);
      
      for (let year = 1; year <= profile.timelineYears; year++) {
        const availableFunds = calculateAvailableFunds(year, previousPurchases);
        const canAfford = checkAffordability(property, availableFunds, previousPurchases, year);
        
        // Enhanced debugging for each year
        console.log(`\n--- YEAR ${year + 2024} (Timeline Year ${year}) ---`);
        console.log('💵 Available funds:', Math.round(availableFunds));
        console.log('🏠 Property deposit needed:', property.depositRequired);
        console.log('✅ Can afford deposit:', availableFunds >= property.depositRequired);
        
        // Let's also check the borrowing capacity calculation
        let totalExistingDebt = profile.currentDebt;
        previousPurchases.forEach(purchase => {
          if (purchase.year <= year) {
            totalExistingDebt += purchase.loanAmount;
          }
        });
        
        const currentRentalIncome = calculateCurrentRentalIncome(previousPurchases, year);
        const newLoanAmount = property.cost - property.depositRequired;
        const totalDebtAfterPurchase = totalExistingDebt + newLoanAmount;
        
        console.log('🏦 Borrowing analysis:');
        console.log('  - Current total debt:', Math.round(totalExistingDebt));
        console.log('  - New loan needed:', Math.round(newLoanAmount));
        console.log('  - Total debt after purchase:', Math.round(totalDebtAfterPurchase));
        console.log('  - Borrowing capacity:', Math.round(profile.borrowingCapacity));
        console.log('  - Rental income boost:', Math.round(currentRentalIncome));
        console.log('  - Can afford borrowing:', totalDebtAfterPurchase <= profile.borrowingCapacity);
        console.log('🎯 Overall can afford:', canAfford);
        
        if (canAfford) {
          console.log('🎉 PROPERTY AFFORDABLE IN YEAR:', year + 2024);
          return year + 2025 - 1; // Convert to absolute year
        }
      }
      
      console.log('❌ PROPERTY NOT AFFORDABLE IN ANY YEAR OF TIMELINE');
      console.log('📅 Timeline spans years 2025 to', 2025 + profile.timelineYears - 1);
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

    // Main calculation logic
    console.log('🚀 Recalculating timeline with profile:', profile);
    
    // Create a list of all properties to purchase
    const allPropertiesToPurchase: Array<{ property: any; index: number }> = [];
    
    Object.entries(selections).forEach(([propertyId, quantity]) => {
      if (quantity > 0) {
        const property = propertyTypes.find(p => p.id === propertyId);
        if (property) {
          for (let i = 0; i < quantity; i++) {
            allPropertiesToPurchase.push({ property, index: i });
          }
        }
      }
    });

    const timelineProperties: TimelineProperty[] = [];
    const purchaseHistory: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number; title: string }> = [];
    
    // Process properties sequentially, determining purchase year for each
    allPropertiesToPurchase.forEach(({ property, index }, globalIndex) => {
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
    return timelineProperties.sort((a, b) => a.affordableYear - b.affordableYear);
  }, [selections, propertyTypes, profile, calculatedValues, globalFactors, getPropertyData]);

  // Only expose the memoized result
  return {
    timelineProperties: calculateTimelineProperties,
    calculateAffordabilityForProperty: () => {} // Placeholder since this is now internal
  };
};
