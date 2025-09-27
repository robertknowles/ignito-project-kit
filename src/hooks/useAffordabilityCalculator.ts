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
  affordableYear: number;
  status: 'feasible' | 'challenging';
  propertyIndex: number;
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

  const calculateAffordabilityForProperty = (
    property: any,
    propertyIndex: number,
    previousPurchases: Array<{ year: number; cost: number; depositRequired: number }>
  ): AffordabilityResult => {
    const baseYear = 2025;
    const growthRate = parseFloat(globalFactors.growthRate) / 100;
    
    for (let year = 1; year <= profile.timelineYears; year++) {
      // Calculate accumulated cash savings
      const accumulatedSavings = year > 1 ? profile.annualSavings * (year - 1) : 0;
      let availableCash = calculatedValues.availableDeposit + accumulatedSavings;
      
      // Calculate portfolio value and debt from previous purchases
      let totalPortfolioValue = profile.portfolioValue;
      let totalDebt = profile.currentDebt;
      
      // Account for previous purchases and their growth
      previousPurchases.forEach(purchase => {
        const yearsOwned = year - purchase.year;
        if (yearsOwned >= 0) {
          // Property value has grown
          const currentValue = calculatePortfolioGrowth(purchase.cost, yearsOwned);
          totalPortfolioValue += currentValue;
          
          // Debt remains the same (simplified - no principal payments in this model)
          const loanAmount = purchase.cost - purchase.depositRequired;
          totalDebt += loanAmount;
          
          // Reduce available cash by the deposit used
          availableCash -= purchase.depositRequired;
        }
      });
      
      // Apply growth to existing portfolio
      if (profile.portfolioValue > 0) {
        totalPortfolioValue = profile.portfolioValue * Math.pow(1 + growthRate, year - 1) + 
                             (totalPortfolioValue - profile.portfolioValue);
      }
      
      // Calculate usable equity (80% LVR)
      const usableEquity = Math.max(0, totalPortfolioValue * 0.8 - totalDebt);
      const totalAvailableFunds = availableCash + usableEquity;
      
      // Check affordability
      const canAffordDeposit = totalAvailableFunds >= property.depositRequired;
      const newLoanAmount = property.cost - property.depositRequired;
      const canAffordBorrowing = (totalDebt + newLoanAmount) <= profile.borrowingCapacity;
      
      if (canAffordDeposit && canAffordBorrowing) {
        return {
          year: baseYear + year - 1,
          canAfford: true,
          availableFunds: totalAvailableFunds,
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
    const purchaseHistory: Array<{ year: number; cost: number; depositRequired: number }> = [];
    
    // Process each selected property type
    Object.entries(selections).forEach(([propertyId, quantity]) => {
      if (quantity > 0) {
        const property = propertyTypes.find(p => p.id === propertyId);
        if (property) {
          for (let i = 0; i < quantity; i++) {
            const result = calculateAffordabilityForProperty(property, i, purchaseHistory);
            
            timelineProperties.push({
              id: `${propertyId}_${i}`,
              title: property.title,
              cost: property.cost,
              depositRequired: property.depositRequired,
              affordableYear: result.year,
              status: result.canAfford ? 'feasible' : 'challenging',
              propertyIndex: i
            });
            
            // Add to purchase history if affordable
            if (result.canAfford) {
              purchaseHistory.push({
                year: result.year - 2025 + 1, // Convert back to relative year
                cost: property.cost,
                depositRequired: property.depositRequired
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
