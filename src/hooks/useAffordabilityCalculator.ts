import { useMemo } from 'react';
import { useInvestmentProfile } from './useInvestmentProfile';
import { usePropertySelection } from '../contexts/PropertySelectionContext';
import { useDataAssumptions } from '../contexts/DataAssumptionsContext';
import { calculateUpdatedBorrowingCapacity, calculatePortfolioMetrics, calculateExistingPortfolioMetrics, combineMetrics } from '../utils/metricsCalculator';
import type { TimelineProperty, PropertyPurchase } from '../types/property';

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

  const calculatePortfolioGrowth = useMemo(() => {
    const growthRate = parseFloat(globalFactors.growthRate) / 100;
    
    return (initialValue: number, years: number) => {
      return initialValue * Math.pow(1 + growthRate, years);
    };
  }, [globalFactors.growthRate]);

  const calculatePropertyGrowth = (initialValue: number, years: number) => {
    const growthRate = parseFloat(globalFactors.growthRate) / 100;
    return initialValue * Math.pow(1 + growthRate, years);
  };

  const calculateAvailableFunds = (
    currentYear: number, 
    previousPurchases: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number; title: string }>,
    investmentProfile: typeof profile
  ) => {
    // Calculate accumulated cash savings
    const accumulatedSavings = currentYear > 1 ? investmentProfile.annualSavings * (currentYear - 1) : 0;
    let availableCash = calculatedValues.availableDeposit + accumulatedSavings;
    
    // Subtract deposits used for previous purchases
    previousPurchases.forEach(purchase => {
      if (purchase.year <= currentYear) {
        availableCash -= purchase.depositRequired;
      }
    });

    // Calculate usable equity from existing portfolio (grown)
    let existingPortfolioEquity = 0;
    if (investmentProfile.portfolioValue > 0) {
      const grownPortfolioValue = calculatePropertyGrowth(investmentProfile.portfolioValue, currentYear - 1);
      existingPortfolioEquity = Math.max(0, (grownPortfolioValue * 0.8) - investmentProfile.currentDebt);
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
    console.log('🔴 DEBUG - Timeline Years:', profile.timelineYears, 'Deposit:', profile.depositPool);
    for (let year = 1; year <= profile.timelineYears; year++) {
      const availableFunds = calculateAvailableFunds(year, previousPurchases, profile);
      const canAfford = checkAffordability(property, availableFunds, previousPurchases, year);
      if (canAfford) {
        return year + 2025 - 1; // Convert to absolute year
      }
    }
    return Infinity; // Cannot afford within timeline
  };

  const calculateAffordabilityForProperty = (
    property: any,
    propertyIndex: number,
    previousPurchases: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number; title: string }>
  ): AffordabilityResult => {
    const baseYear = 2025;
    
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
    const availableFunds = calculateAvailableFunds(relativeYear, previousPurchases, profile);
    
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

  const calculateTimelineProperties = useMemo((): TimelineProperty[] => {
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

  return {
    timelineProperties: calculateTimelineProperties,
    calculateAffordabilityForProperty
  };
};
