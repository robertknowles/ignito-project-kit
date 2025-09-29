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

  // Consolidation constants
  const MAX_CONSOLIDATIONS = 2;
  const MIN_YEARS_BETWEEN_CONSOLIDATIONS = 3;

  // Debug flag - set to true to enable detailed debugging
  const DEBUG_MODE = true;

  const calculateTimelineProperties = useMemo((): TimelineProperty[] => {

    // Track consolidation state
    let consolidationState = {
      consolidationsRemaining: profile.consolidationsRemaining || MAX_CONSOLIDATIONS,
      lastConsolidationYear: profile.lastConsolidationYear || 0
    };

    // Move ALL helper functions inside useMemo to avoid closure issues
    
    const calculatePropertyGrowth = (initialValue: number, years: number) => {
      const growthRate = parseFloat(globalFactors.growthRate) / 100;
      return initialValue * Math.pow(1 + growthRate, years);
    };

    const calculateAvailableFunds = (
      currentYear: number, 
      previousPurchases: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number; title: string }>,
      additionalEquity: number = 0
    ) => {
      // Calculate enhanced annual savings with cashflow feedback
      let totalEnhancedSavings = 0;
      
      for (let year = 1; year <= currentYear; year++) {
        // Base annual savings
        let yearSavings = profile.annualSavings;
        
        // Calculate net cashflow from all properties purchased before this year
        let netCashflow = 0;
        previousPurchases.forEach(purchase => {
          if (purchase.year < year) { // Only properties purchased in previous years generate cashflow
            const yearsOwned = year - purchase.year;
            const propertyData = getPropertyData(purchase.title);
            
            if (propertyData) {
              // Calculate current property value with growth
              const propertyGrowthRate = parseFloat(propertyData.growth) / 100;
              const currentValue = purchase.cost * Math.pow(1 + propertyGrowthRate, yearsOwned);
              
              // Calculate rental income
              const yieldRate = parseFloat(propertyData.yield) / 100;
              const rentalIncome = currentValue * yieldRate;
              
              // Calculate loan repayments (interest only for simplicity)
              const interestRate = parseFloat(globalFactors.interestRate) / 100;
              const loanRepayments = purchase.loanAmount * interestRate;
              
              // Calculate expenses (simplified - 1% of property value annually)
              const expenses = currentValue * 0.01; // 1% for maintenance, management, etc.
              
              // Net cashflow for this property
              const propertyCashflow = rentalIncome - loanRepayments - expenses;
              netCashflow += propertyCashflow;
            }
          }
        });
        
        // Total savings for this year = base savings + net cashflow
        const totalYearSavings = yearSavings + netCashflow;
        totalEnhancedSavings += totalYearSavings;
      }
      
      // Calculate available cash: base deposit + accumulated enhanced savings + additional equity from consolidations
      let availableCash = calculatedValues.availableDeposit + (currentYear > 1 ? totalEnhancedSavings : 0) + additionalEquity;
      
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
      
      return adjustedCapacity;
    };

    const calculatePropertyScore = (
      purchase: { year: number; cost: number; depositRequired: number; loanAmount: number; title: string },
      currentYear: number
    ): { cashflowScore: number; equityScore: number; totalScore: number } => {
      const yearsOwned = currentYear - purchase.year;
      const propertyData = getPropertyData(purchase.title);
      
      if (!propertyData) {
        return { cashflowScore: 0, equityScore: 0, totalScore: 0 };
      }
      
      // Calculate current property value
      const propertyGrowthRate = parseFloat(propertyData.growth) / 100;
      const currentValue = purchase.cost * Math.pow(1 + propertyGrowthRate, yearsOwned);
      
      // Cashflow Score (rental income - loan payments - expenses)
      const yieldRate = parseFloat(propertyData.yield) / 100;
      const rentalIncome = currentValue * yieldRate;
      const interestRate = parseFloat(globalFactors.interestRate) / 100;
      const loanRepayments = purchase.loanAmount * interestRate;
      const expenses = currentValue * 0.01; // 1% for maintenance, etc.
      const netCashflow = rentalIncome - loanRepayments - expenses;
      
      // Equity Score (current equity in property)
      const currentEquity = currentValue - purchase.loanAmount;
      
      return {
        cashflowScore: netCashflow,
        equityScore: currentEquity,
        totalScore: netCashflow + (currentEquity * 0.1) // Weight cashflow more heavily
      };
    };

    const checkConsolidationTriggers = (
      currentYear: number,
      previousPurchases: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number; title: string }>,
      totalPortfolioValue: number,
      totalDebt: number,
      dynamicCapacity: number,
      property: any
    ): { shouldConsolidate: boolean; reasons: string[] } => {
      const reasons: string[] = [];
      
      // Trigger 1: Borrowing capacity reached
      const newLoanAmount = property.cost - property.depositRequired;
      const futureDebt = totalDebt + newLoanAmount;
      if (futureDebt > dynamicCapacity) {
        reasons.push('Borrowing capacity reached');
      }
      
      // Trigger 2: Portfolio LVR > 85%
      const currentLVR = totalPortfolioValue > 0 ? (totalDebt / totalPortfolioValue) * 100 : 0;
      if (currentLVR > 85) {
        reasons.push(`Portfolio LVR too high (${currentLVR.toFixed(1)}%)`);
      }
      
      // Trigger 3: Net cashflow < 0
      let totalNetCashflow = 0;
      previousPurchases.forEach(purchase => {
        if (purchase.year <= currentYear) {
          const score = calculatePropertyScore(purchase, currentYear);
          totalNetCashflow += score.cashflowScore;
        }
      });
      
      if (totalNetCashflow < 0) {
        reasons.push(`Negative net cashflow (£${totalNetCashflow.toLocaleString()})`);
      }
      
      return {
        shouldConsolidate: reasons.length > 0,
        reasons
      };
    };

    const executeConsolidation = (
      currentYear: number,
      previousPurchases: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number; title: string }>
    ): { 
      updatedPurchases: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number; title: string }>;
      equityFreed: number;
      debtReduced: number;
      propertiesSold: number;
    } => {
      // Rank properties by score (lowest first)
      const rankedProperties = previousPurchases
        .filter(purchase => purchase.year <= currentYear)
        .map(purchase => ({
          ...purchase,
          score: calculatePropertyScore(purchase, currentYear)
        }))
        .sort((a, b) => a.score.totalScore - b.score.totalScore);
      
      let updatedPurchases = [...previousPurchases];
      let totalEquityFreed = 0;
      let totalDebtReduced = 0;
      let propertiesSold = 0;
      
      // Sell properties until conditions are met
      for (const property of rankedProperties) {
        const yearsOwned = currentYear - property.year;
        const propertyData = getPropertyData(property.title);
        
        if (propertyData) {
          const propertyGrowthRate = parseFloat(propertyData.growth) / 100;
          const currentValue = property.cost * Math.pow(1 + propertyGrowthRate, yearsOwned);
          const equity = currentValue - property.loanAmount;
          
          // Remove property from purchases
          updatedPurchases = updatedPurchases.filter(p => 
            !(p.year === property.year && p.title === property.title && p.cost === property.cost)
          );
          
          totalEquityFreed += equity;
          totalDebtReduced += property.loanAmount;
          propertiesSold++;
          
          // Check if conditions are now met
          const remainingDebt = previousPurchases.reduce((sum, p) => {
            const stillOwned = updatedPurchases.some(up => 
              up.year === p.year && up.title === p.title && up.cost === p.cost
            );
            return stillOwned ? sum + p.loanAmount : sum;
          }, profile.currentDebt);
          
          const remainingValue = updatedPurchases.reduce((sum, p) => {
            const yearsOwned = currentYear - p.year;
            const propData = getPropertyData(p.title);
            if (propData) {
              const growth = parseFloat(propData.growth) / 100;
              return sum + (p.cost * Math.pow(1 + growth, yearsOwned));
            }
            return sum;
          }, profile.portfolioValue);
          
          const newLVR = remainingValue > 0 ? (remainingDebt / remainingValue) * 100 : 0;
          
          // Stop if LVR <= 80% and we've sold at least one property
          if (newLVR <= 80 && propertiesSold >= 1) {
            break;
          }
        }
      }
      
      // Update consolidation state
      consolidationState.consolidationsRemaining--;
      consolidationState.lastConsolidationYear = currentYear;
      
      return {
        updatedPurchases,
        equityFreed: totalEquityFreed,
        debtReduced: totalDebtReduced,
        propertiesSold
      };
    };

    const checkAffordability = (
      property: any,
      availableFunds: number,
      previousPurchases: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number; title: string }>,
      currentYear: number,
      additionalEquity: number = 0
    ): { canAfford: boolean; consolidationTriggered?: boolean; consolidationDetails?: any } => {
      
      // Calculate key financial metrics for debugging
      const baseDeposit = calculatedValues.availableDeposit;
      const annualSavings = profile.annualSavings;
      
      // Calculate net cashflow from all current properties
      let netCashflow = 0;
      let grossRentalIncome = 0;
      let loanRepayments = 0;
      let expenses = 0;
      
      previousPurchases.forEach(purchase => {
        if (purchase.year <= currentYear) {
          const yearsOwned = currentYear - purchase.year;
          const propertyData = getPropertyData(purchase.title);
          
          if (propertyData) {
            const propertyGrowthRate = parseFloat(propertyData.growth) / 100;
            const currentValue = purchase.cost * Math.pow(1 + propertyGrowthRate, yearsOwned);
            const yieldRate = parseFloat(propertyData.yield) / 100;
            const rentalIncome = currentValue * yieldRate;
            const interestRate = parseFloat(globalFactors.interestRate) / 100;
            const propertyLoanRepayments = purchase.loanAmount * interestRate;
            const propertyExpenses = currentValue * 0.01;
            
            grossRentalIncome += rentalIncome;
            loanRepayments += propertyLoanRepayments;
            expenses += propertyExpenses;
            netCashflow += (rentalIncome - propertyLoanRepayments - propertyExpenses);
          }
        }
      });
      
      // Calculate total existing debt
      let totalExistingDebt = profile.currentDebt;
      previousPurchases.forEach(purchase => {
        if (purchase.year <= currentYear) {
          totalExistingDebt += purchase.loanAmount;
        }
      });
      
      // Calculate portfolio value
      let totalPortfolioValue = profile.portfolioValue;
      let propertyValues: number[] = [];
      let usableEquityPerProperty: number[] = [];
      
      if (profile.portfolioValue > 0) {
        const grownPortfolioValue = calculatePropertyGrowth(profile.portfolioValue, currentYear - 1);
        propertyValues.push(grownPortfolioValue);
        const portfolioEquity = Math.max(0, (grownPortfolioValue * 0.8) - profile.currentDebt);
        usableEquityPerProperty.push(portfolioEquity);
      }
      
      previousPurchases.forEach(purchase => {
        if (purchase.year <= currentYear) {
          const yearsOwned = currentYear - purchase.year;
          const currentValue = calculatePropertyGrowth(purchase.cost, yearsOwned);
          totalPortfolioValue += currentValue;
          propertyValues.push(currentValue);
          
          const usableEquity = Math.max(0, (currentValue * 0.8) - purchase.loanAmount);
          usableEquityPerProperty.push(usableEquity);
        }
      });
      
      const totalUsableEquity = usableEquityPerProperty.reduce((sum, equity) => sum + equity, 0);
      
      // Use dynamic borrowing capacity
      const baseCapacity = profile.borrowingCapacity;
      const dynamicCapacity = calculateDynamicBorrowingCapacity(currentYear, previousPurchases);
      const rentalUplift = dynamicCapacity - baseCapacity;
      const newLoanAmount = property.cost - property.depositRequired;
      const totalDebtAfterPurchase = totalExistingDebt + newLoanAmount;
      
      // Check affordability
      const canAffordDeposit = availableFunds >= property.depositRequired;
      const canAffordBorrowing = totalDebtAfterPurchase <= dynamicCapacity;
      
      // Debug trace output
      if (DEBUG_MODE) {
        const timelineYear = currentYear + 2025 - 1;
        const depositPool = availableFunds;
        const equityFreed = 0; // Initialize to 0, will be updated if consolidation occurs
        const rentalIncome = grossRentalIncome;
        const adjustedCapacity = dynamicCapacity;
        const existingDebt = totalExistingDebt;
        const newLoan = newLoanAmount;
        const totalDebt = totalDebtAfterPurchase;
        const depositPass = canAffordDeposit;
        const debtPass = canAffordBorrowing;
        const purchaseDecision = canAffordBorrowing && canAffordDeposit ? timelineYear : '❌';
        const requiredDeposit = property.depositRequired;
        const consolidationTriggered = false;

        console.log(`\n--- Year ${timelineYear} Debug Trace ---`);

        // Deposits
        console.log(
          `Deposits: depositPool = baseDeposit(${baseDeposit}) + annualSavings(${annualSavings}) + netCashflow(${netCashflow}) + equityFreed(${equityFreed}) = ${depositPool}`
        );

        // Equity
        console.log(
          `Equity: totalEquity = Σ((propertyValue * 0.8) - loan) = ${totalUsableEquity} | Breakdown: ${JSON.stringify(usableEquityPerProperty)} from values ${JSON.stringify(propertyValues)}`
        );

        // Cashflow
        console.log(
          `Cashflow: netCashflow = rentalIncome(${rentalIncome}) - loanRepayments(${loanRepayments}) - expenses(${expenses}) = ${netCashflow}`
        );

        // Borrowing Capacity
        console.log(
          `Borrowing Capacity: adjustedCapacity = baseCapacity(${baseCapacity}) + rentalUplift(${rentalUplift}) = ${adjustedCapacity}`
        );

        // Debt Position
        console.log(
          `Debt: totalDebt = existingDebt(${existingDebt}) + newLoan(${newLoan}) = ${totalDebt}`
        );

        // Final Decision
        console.log(
          `Final Decision: DepositTest = ${depositPass ? "PASS" : "FAIL"} (availableDeposit=${depositPool}, requiredDeposit=${requiredDeposit}) | DebtTest = ${debtPass ? "PASS" : "FAIL"} (totalDebt=${totalDebt}, capacity=${adjustedCapacity}) | PurchaseDecision = ${purchaseDecision}`
        );
      }
      
      if (!canAffordDeposit) {
        return { canAfford: false };
      }
      
      if (canAffordBorrowing) {
        return { canAfford: true };
      }
      
      // Check if consolidation is possible
      const triggers = checkConsolidationTriggers(currentYear, previousPurchases, totalPortfolioValue, totalExistingDebt, dynamicCapacity, property);
      
      if (triggers.shouldConsolidate && 
          consolidationState.consolidationsRemaining > 0 && 
          (currentYear - consolidationState.lastConsolidationYear) >= MIN_YEARS_BETWEEN_CONSOLIDATIONS) {
        
        const consolidationResult = executeConsolidation(currentYear, previousPurchases);
        
        // Debug trace for consolidation
        if (DEBUG_MODE) {
          const timelineYear = currentYear + 2025 - 1;
          const propertiesSoldList = previousPurchases
            .filter(p => !consolidationResult.updatedPurchases.some(up => 
              up.year === p.year && up.title === p.title && up.cost === p.cost
            ))
            .map(p => p.title);
          
          const newDebt = consolidationResult.updatedPurchases.reduce((sum, p) => sum + p.loanAmount, profile.currentDebt);
          const portfolioValue = consolidationResult.updatedPurchases.reduce((sum, p) => {
            const yearsOwned = currentYear - p.year;
            const propData = getPropertyData(p.title);
            if (propData) {
              const growth = parseFloat(propData.growth) / 100;
              return sum + (p.cost * Math.pow(1 + growth, yearsOwned));
            }
            return sum;
          }, profile.portfolioValue);
          const newBorrowingCapacity = calculateDynamicBorrowingCapacity(currentYear, consolidationResult.updatedPurchases);
          const triggerReason = triggers.reasons.join(' | ');
          const consolidationsRemaining = consolidationState.consolidationsRemaining;
          const lastConsolidationYear = consolidationState.lastConsolidationYear;
          const equityFreed = consolidationResult.equityFreed;

          // Consolidation (if triggered)
          console.log(
            `Consolidation: Sold ${JSON.stringify(propertiesSoldList)} | EquityFreed(${equityFreed}) | DebtAfterSales(${newDebt}) | PortfolioValue(${portfolioValue}) | NewLVR = ${
              portfolioValue > 0 ? (newDebt / portfolioValue).toFixed(2) : "—"
            } | NewBorrowingCapacity(${newBorrowingCapacity}) | TriggerReason(${triggerReason})`
          );
          console.log(
            `Consolidation State: consolidationsRemaining(${consolidationsRemaining}), lastConsolidationYear(${lastConsolidationYear})`
          );
        }
        
        // Recheck affordability with freed equity and reduced debt
        const newAvailableFunds = calculateAvailableFunds(currentYear, consolidationResult.updatedPurchases, consolidationResult.equityFreed);
        const recheck = checkAffordability(property, newAvailableFunds, consolidationResult.updatedPurchases, currentYear, consolidationResult.equityFreed);
        
        return { 
          canAfford: recheck.canAfford, 
          consolidationTriggered: true, 
          consolidationDetails: consolidationResult 
        };
      }
      
      return { canAfford: false };
    };

    const determineNextPurchaseYear = (
      property: any,
      previousPurchases: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number; title: string }>
    ): { year: number; consolidation?: any } => {
      let currentPurchases = [...previousPurchases];
      
      for (let year = 1; year <= profile.timelineYears; year++) {
        const availableFunds = calculateAvailableFunds(year, currentPurchases);
        const affordabilityResult = checkAffordability(property, availableFunds, currentPurchases, year);
        
        if (affordabilityResult.canAfford) {
          const absoluteYear = year + 2025 - 1;
          
          if (affordabilityResult.consolidationTriggered) {
            // Update the purchase history to reflect consolidation
            currentPurchases = affordabilityResult.consolidationDetails.updatedPurchases;
            return { 
              year: absoluteYear, 
              consolidation: affordabilityResult.consolidationDetails 
            };
          }
          
          return { year: absoluteYear };
        }
      }
      
      return { year: Infinity };
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
    allPropertiesToPurchase.forEach(({ property, index }, globalIndex) => {
      const result = determineNextPurchaseYear(property, purchaseHistory);
      const loanAmount = property.cost - property.depositRequired;
      
      const timelineProperty: TimelineProperty = {
        id: `${property.id}_${index}`,
        title: property.title,
        cost: property.cost,
        depositRequired: property.depositRequired,
        loanAmount: loanAmount,
        affordableYear: result.year,
        status: result.year === Infinity ? 'challenging' : (result.consolidation ? 'consolidation' : 'feasible'),
        propertyIndex: index,
        portfolioValueAfter: 0, // Will be calculated properly
        totalEquityAfter: 0, // Will be calculated properly
        availableFundsUsed: 0 // Will be calculated properly
      };
      
      // Add consolidation details if present
      if (result.consolidation) {
        timelineProperty.isConsolidationPhase = true;
        timelineProperty.consolidationDetails = {
          propertiesSold: result.consolidation.propertiesSold,
          equityFreed: result.consolidation.equityFreed,
          debtReduced: result.consolidation.debtReduced
        };
      }
      
      timelineProperties.push(timelineProperty);
      
      // Add to purchase history if affordable
      if (result.year !== Infinity) {
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
    return sortedProperties;
  }, [
    // Only re-calculate when these specific values change
    JSON.stringify(selections),
    propertyTypes.length,
    profile.timelineYears,
    profile.borrowingCapacity,
    profile.depositPool,
    profile.annualSavings,
    profile.consolidationsRemaining,
    profile.lastConsolidationYear,
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