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
    console.log('🏠 Starting affordability calculations');
    console.log('💰 Available deposit:', calculatedValues.availableDeposit);
    console.log('🏦 Borrowing capacity:', profile.borrowingCapacity);
    console.log('📊 Selected properties:', Object.entries(selections).filter(([_, qty]) => qty > 0));

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
      console.log(`💰 Year ${currentYear}: Base deposit £${calculatedValues.availableDeposit} + savings £${accumulatedSavings} = £${availableCash}`);
      
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
      
      const finalFunds = availableCash + totalUsableEquity;
      console.log(`🏦 Year ${currentYear}: Cash £${availableCash} + Equity £${totalUsableEquity} = Total £${finalFunds}`);
      return finalFunds;
    };

    const calculateDynamicBorrowingCapacity = (
      currentYear: number,
      previousPurchases: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number; title: string }>
    ): number => {
      const baseCapacity = profile.borrowingCapacity;
      
      // Calculate rental income from all purchased properties
      let totalRentalIncome = 0;
      previousPurchases.forEach(purchase => {
        if (purchase.year <= currentYear) {
          const yearsOwned = currentYear - purchase.year;
          // Find the property data to get rental yield
          const propertyData = getPropertyData(purchase.title);
          if (propertyData) {
            // Calculate current property value with growth
            const propertyGrowthRate = parseFloat(propertyData.growth) / 100;
            const currentValue = purchase.cost * Math.pow(1 + propertyGrowthRate, yearsOwned);
            const yieldRate = parseFloat(propertyData.yield) / 100;
            const annualRent = currentValue * yieldRate;
            totalRentalIncome += annualRent;
          }
        }
      });
      
      // Apply serviceability factor (70%)
      const serviceabilityFactor = 0.7;
      const rentalCapacityBoost = totalRentalIncome * serviceabilityFactor;
      const adjustedCapacity = baseCapacity + rentalCapacityBoost;
      
      console.log(`🏦 Year ${currentYear}: Base capacity £${baseCapacity.toLocaleString()} + rental boost £${rentalCapacityBoost.toLocaleString()} (£${totalRentalIncome.toLocaleString()} × 0.7) = £${adjustedCapacity.toLocaleString()}`);
      
      return adjustedCapacity;
    };

    const checkAffordability = (
      property: any,
      availableFunds: number,
      previousPurchases: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number; title: string }>,
      currentYear: number
    ): boolean => {
      // Simple affordability check: (1) Can afford deposit, (2) Total debt under capacity limit
      const canAffordDeposit = availableFunds >= property.depositRequired;
      console.log(`🧮 ${property.title} Year ${currentYear}: 💵${availableFunds} vs 🏠${property.depositRequired} = ${canAffordDeposit ? '✅' : '❌'}`);
      
      if (!canAffordDeposit) {
        return false;
      }
      
      // Calculate total existing debt
      let totalExistingDebt = profile.currentDebt;
      previousPurchases.forEach(purchase => {
        if (purchase.year <= currentYear) {
          totalExistingDebt += purchase.loanAmount;
        }
      });
      
      // Use dynamic borrowing capacity instead of static capacity
      const dynamicCapacity = calculateDynamicBorrowingCapacity(currentYear, previousPurchases);
      const newLoanAmount = property.cost - property.depositRequired;
      const totalDebtAfterPurchase = totalExistingDebt + newLoanAmount;
      const canAffordBorrowing = totalDebtAfterPurchase <= dynamicCapacity;
      
      console.log(`🏦 Debt check: £${totalExistingDebt} + £${newLoanAmount} = £${totalDebtAfterPurchase} vs dynamic capacity £${dynamicCapacity.toLocaleString()} = ${canAffordBorrowing ? '✅' : '❌'}`);
      const result = canAffordDeposit && canAffordBorrowing;
      console.log(`📊 Final decision: ${result ? '✅ AFFORDABLE' : '❌ NOT AFFORDABLE'}`);
      
      return result;
    };

    const determineNextPurchaseYear = (
      property: any,
      previousPurchases: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number; title: string }>
    ): number => {
      console.log(`🔍 Finding purchase year for ${property.title} (£${property.cost})`);
      for (let year = 1; year <= profile.timelineYears; year++) {
        console.log(`📅 Testing year ${year}:`);
        const availableFunds = calculateAvailableFunds(year, previousPurchases);
        const canAfford = checkAffordability(property, availableFunds, previousPurchases, year);
        
        if (canAfford) {
          const absoluteYear = year + 2025 - 1;
          console.log(`🎯 ${property.title} can be purchased in year ${absoluteYear}!`);
          return absoluteYear; // Convert to absolute year
        }
      }
      
      console.log(`⏰ ${property.title} cannot be afforded within ${profile.timelineYears} years`);
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
          for (let i = 0; i < quantity; i++) {
            allPropertiesToPurchase.push({ property, index: i });
          }
        }
      }
    });

    const timelineProperties: TimelineProperty[] = [];
    const purchaseHistory: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number; title: string }> = [];
    
    // Process properties sequentially, determining purchase year for each
    console.log('🔄 Processing', allPropertiesToPurchase.length, 'properties');
    allPropertiesToPurchase.forEach(({ property, index }, globalIndex) => {
      console.log(`🏘️ Property ${globalIndex + 1}: ${property.title} (£${property.cost})`);
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
    console.log('📅 Final timeline:', sortedProperties.map(p => `${p.title}: ${p.affordableYear} (${p.status})`));
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
