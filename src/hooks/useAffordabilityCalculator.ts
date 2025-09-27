import { useMemo } from 'react';
import { useInvestmentProfile } from './useInvestmentProfile';
import { usePropertySelection } from '../contexts/PropertySelectionContext';
import { useDataAssumptions } from '../contexts/DataAssumptionsContext';

export interface AffordabilityResult {
  year: number;
  canAfford: boolean;
  availableFunds: number;
  usableEquity: number;
  totalPortfolioValue: number;
  totalDebt: number;
}

export interface TimelineProperty {
  id: string;
  title: string;
  cost: number;
  depositRequired: number;
  loanAmount: number;
  affordableYear: number;
  status: 'feasible' | 'challenging';
  propertyIndex: number;
  portfolioValueAfter: number;
  totalEquityAfter: number;
  availableFundsUsed: number;
}

export const useAffordabilityCalculator = () => {
  const { profile, calculatedValues } = useInvestmentProfile();
  const { selections, propertyTypes } = usePropertySelection();
  const { globalFactors } = useDataAssumptions();

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
    previousPurchases: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number }>,
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

  const calculateAffordabilityForProperty = (
    property: any,
    propertyIndex: number,
    previousPurchases: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number }>
  ): AffordabilityResult => {
    const baseYear = 2025;
    
    for (let year = 1; year <= profile.timelineYears; year++) {
      const availableFunds = calculateAvailableFunds(year, previousPurchases, profile);
      
      // Calculate total debt at this year
      let totalDebt = profile.currentDebt;
      previousPurchases.forEach(purchase => {
        if (purchase.year <= year) {
          totalDebt += purchase.loanAmount;
        }
      });
      
      // Check affordability
      const canAffordDeposit = availableFunds >= property.depositRequired;
      const newLoanAmount = property.cost - property.depositRequired;
      const canAffordBorrowing = (totalDebt + newLoanAmount) <= profile.borrowingCapacity;
      
      if (canAffordDeposit && canAffordBorrowing) {
        // Calculate portfolio values for return
        let totalPortfolioValue = profile.portfolioValue;
        if (profile.portfolioValue > 0) {
          totalPortfolioValue = calculatePropertyGrowth(profile.portfolioValue, year - 1);
        }
        
        previousPurchases.forEach(purchase => {
          if (purchase.year <= year) {
            const yearsOwned = year - purchase.year;
            totalPortfolioValue += calculatePropertyGrowth(purchase.cost, yearsOwned);
          }
        });

        const usableEquity = Math.max(0, totalPortfolioValue * 0.8 - totalDebt);
        
        return {
          year: baseYear + year - 1,
          canAfford: true,
          availableFunds,
          usableEquity,
          totalPortfolioValue,
          totalDebt
        };
      }
    }
    
    // Not affordable within timeline
    return {
      year: baseYear + profile.timelineYears + propertyIndex,
      canAfford: false,
      availableFunds: 0,
      usableEquity: 0,
      totalPortfolioValue: 0,
      totalDebt: 0
    };
  };

  const calculateTimelineProperties = useMemo((): TimelineProperty[] => {
    const timelineProperties: TimelineProperty[] = [];
    const purchaseHistory: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number }> = [];
    
    // Process each selected property type
    Object.entries(selections).forEach(([propertyId, quantity]) => {
      if (quantity > 0) {
        const property = propertyTypes.find(p => p.id === propertyId);
        if (property) {
          for (let i = 0; i < quantity; i++) {
            const result = calculateAffordabilityForProperty(property, i, purchaseHistory);
            const loanAmount = property.cost - property.depositRequired;
            
            timelineProperties.push({
              id: `${propertyId}_${i}`,
              title: property.title,
              cost: property.cost,
              depositRequired: property.depositRequired,
              loanAmount: loanAmount,
              affordableYear: result.year,
              status: result.canAfford ? 'feasible' : 'challenging',
              propertyIndex: i,
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
                loanAmount: loanAmount
              });
            }
          }
        }
      }
    });
    
    // Sort by affordable year
    return timelineProperties.sort((a, b) => a.affordableYear - b.affordableYear);
  }, [selections, propertyTypes, profile, calculatedValues, globalFactors, calculateAffordabilityForProperty]);

  return {
    timelineProperties: calculateTimelineProperties,
    calculateAffordabilityForProperty
  };
};
