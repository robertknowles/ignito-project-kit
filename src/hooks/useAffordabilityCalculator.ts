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

  // Add debounced selections state
  const [debouncedSelections, setDebouncedSelections] = React.useState(selections);
  const [isCalculating, setIsCalculating] = React.useState(false);

  // Debounce selections changes (300ms delay)
  React.useEffect(() => {
    setIsCalculating(true); // Show loading state immediately
    
    const timer = setTimeout(() => {
      setDebouncedSelections(selections);
      setIsCalculating(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [selections]);

  const calculateTimelineProperties = useMemo((): TimelineProperty[] => {

    // Track consolidation state - simplified to only consecutive failures
    let consolidationState = {
      consecutiveDebtTestFailures: 0 // Count consecutive serviceability failures
    };

    // Move ALL helper functions inside useMemo to avoid closure issues
    
    const calculatePropertyGrowth = (initialValue: number, years: number) => {
      const growthRate = parseFloat(globalFactors.growthRate) / 100;
      return initialValue * Math.pow(1 + growthRate, years);
    };

    // Progressive rental recognition rates based on portfolio size
    const calculateRentalRecognitionRate = (portfolioSize: number): number => {
      if (portfolioSize <= 2) return 0.75;      // Properties 1-2: 75%
      if (portfolioSize <= 4) return 0.70;      // Properties 3-4: 70%
      return 0.65;                              // Properties 5+: 65%
    };

    const calculateAvailableFunds = (
      currentYear: number, 
      previousPurchases: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number; title: string }>,
      additionalEquity: number = 0
    ) => {
      // FIX 2-3: Return detailed breakdown object instead of single number
      // Calculate enhanced annual savings with cashflow feedback
      let totalEnhancedSavings = 0;
      let totalCashflowReinvestment = 0;
      let totalDepositsUsed = 0;
      
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
              
              // Calculate rental income with progressive recognition rates
              const yieldRate = parseFloat(propertyData.yield) / 100;
              const portfolioSize = previousPurchases.filter(p => p.year < year).length;
              const recognitionRate = calculateRentalRecognitionRate(portfolioSize);
              const rentalIncome = currentValue * yieldRate * recognitionRate;
              
              // Interest-only loans - principal does not reduce
              const interestRate = parseFloat(globalFactors.interestRate) / 100;
              const loanInterest = purchase.loanAmount * interestRate;
              
              // Calculate expenses (30% of rental income for management, maintenance, vacancy, insurance)
              const expenses = rentalIncome * 0.30;
              
              // Net cashflow for this property
              const propertyCashflow = rentalIncome - loanInterest - expenses;
              netCashflow += propertyCashflow;
            }
          }
        });
        
        // Total savings for this year = base savings + net cashflow
        const totalYearSavings = yearSavings + netCashflow;
        totalEnhancedSavings += totalYearSavings;
        totalCashflowReinvestment += netCashflow;
      }
      
      // Track deposits used
      previousPurchases.forEach(purchase => {
        if (purchase.year <= currentYear) {
          totalDepositsUsed += purchase.depositRequired;
        }
      });
      
      // Calculate available cash: base deposit + accumulated enhanced savings + additional equity from consolidations
      let availableCash = calculatedValues.availableDeposit + (currentYear > 1 ? totalEnhancedSavings : 0) + additionalEquity;
      
      // Subtract deposits used for previous purchases
      availableCash -= totalDepositsUsed;

      // FIX 4: 3-YEAR EQUITY RECYCLING CYCLE from first purchase year
      let existingPortfolioEquity = 0;
      let totalUsableEquity = 0;
      
      const firstPurchaseYear = previousPurchases.length > 0 
        ? Math.min(...previousPurchases.map(p => p.year))
        : currentYear;
      const yearsSinceFirstPurchase = currentYear - firstPurchaseYear;
      
      if (yearsSinceFirstPurchase > 0 && yearsSinceFirstPurchase % 3 === 0) {
        // Only in 3-year cycle years from first purchase
        if (profile.portfolioValue > 0) {
          const grownPortfolioValue = calculatePropertyGrowth(profile.portfolioValue, currentYear - 1);
          existingPortfolioEquity = Math.max(0, (grownPortfolioValue * 0.8 - profile.currentDebt) * profile.equityReleaseFactor);
        }

        // Calculate usable equity from previous purchases - with equity release factor
        totalUsableEquity = previousPurchases.reduce((acc, purchase) => {
          if (purchase.year <= currentYear) {
            const propertyCurrentValue = calculatePropertyGrowth(purchase.cost, currentYear - purchase.year);
            const usableEquity = Math.max(0, (propertyCurrentValue * 0.8 - purchase.loanAmount) * profile.equityReleaseFactor);
            return acc + usableEquity;
          }
          return acc;
        }, existingPortfolioEquity);
      }
      
      // NEW AGGRESSIVE FORMULA: AvailableFunds = DepositPool + CumulativeSavings + NetCashflowReinvestment + UsableEquity
      const finalFunds = availableCash + totalUsableEquity;
      
      // FIX 2-3: Return detailed breakdown
      return {
        total: finalFunds,
        baseDeposit: Math.max(0, calculatedValues.availableDeposit - totalDepositsUsed),
        cumulativeSavings: profile.annualSavings * (currentYear - 1),
        cashflowReinvestment: totalCashflowReinvestment,
        equityRelease: totalUsableEquity,
        depositsUsed: totalDepositsUsed
      };
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
      // Interest-only loans - principal does not reduce
      const interestRate = parseFloat(globalFactors.interestRate) / 100;
      const loanInterest = purchase.loanAmount * interestRate;
      // Calculate expenses (30% of rental income for management, maintenance, vacancy, insurance)
      const expenses = rentalIncome * 0.30;
      const netCashflow = rentalIncome - loanInterest - expenses;
      
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

    const checkConsolidationTriggers = (
      currentYear: number,
      previousPurchases: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number; title: string }>,
      totalPortfolioValue: number,
      totalDebt: number,
      property: any
    ): { shouldConsolidate: boolean; reasons: string[] } => {
      const reasons: string[] = [];
      
      // Trigger 1: Borrowing capacity reached
      const newLoanAmount = property.cost - property.depositRequired;
      const futureDebt = totalDebt + newLoanAmount;
      if (futureDebt > profile.borrowingCapacity) {
        reasons.push('Borrowing capacity reached');
      }
      
      // FIX 6: Trigger 2: Portfolio LVR > 80% (was 85%)
      const currentLVR = totalPortfolioValue > 0 ? (totalDebt / totalPortfolioValue) * 100 : 0;
      if (currentLVR > 80) {
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
      // Safety check: prevent consolidation on empty portfolio
      if (previousPurchases.length === 0) {
        console.warn(`[CONSOLIDATION] Warning: Attempted consolidation with empty portfolio in year ${currentYear + 2025 - 1}`);
        return {
          updatedPurchases: [],
          equityFreed: 0,
          debtReduced: 0,
          propertiesSold: 0,
        };
      }
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
      
      // Sell lowest-scoring properties until conditions are met:
      // - LVR <= 80%
      // - Net Cashflow >= 0
      // - Affordability test for new purchase passes
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
          
          // Calculate net cashflow for remaining properties
          let netCashflow = 0;
          updatedPurchases.forEach(p => {
            const score = calculatePropertyScore(p, currentYear);
            netCashflow += score.cashflowScore;
          });
          
          const newLVR = remainingValue > 0 ? (remainingDebt / remainingValue) * 100 : 0;
          
          // Stop when all conditions are met:
          // 1. LVR <= 80%
          // 2. Net cashflow >= 0
          // 3. At least one property sold
          if (newLVR <= 80 && netCashflow >= 0 && propertiesSold >= 1) {
            break;
          }
        }
      }
      
        // Reset failure count after consolidation - simplified tracking
        consolidationState.consecutiveDebtTestFailures = 0;
      
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
      let loanInterest = 0;
      let expenses = 0;
      
      previousPurchases.forEach(purchase => {
        if (purchase.year <= currentYear) {
          const yearsOwned = currentYear - purchase.year;
          const propertyData = getPropertyData(purchase.title);
          
          if (propertyData) {
            const propertyGrowthRate = parseFloat(propertyData.growth) / 100;
            const currentValue = purchase.cost * Math.pow(1 + propertyGrowthRate, yearsOwned);
            const yieldRate = parseFloat(propertyData.yield) / 100;
            // Apply progressive rental recognition based on portfolio size at time of evaluation
            const portfolioSize = previousPurchases.filter(p => p.year <= currentYear).length;
            const recognitionRate = calculateRentalRecognitionRate(portfolioSize);
            const rentalIncome = currentValue * yieldRate * recognitionRate;
            // Interest-only loans - principal does not reduce
            const interestRate = parseFloat(globalFactors.interestRate) / 100;
            const propertyLoanInterest = purchase.loanAmount * interestRate;
            // Calculate expenses (30% of rental income for management, maintenance, vacancy, insurance)
            const propertyExpenses = rentalIncome * 0.30;
            
            grossRentalIncome += rentalIncome;
            loanInterest += propertyLoanInterest;
            expenses += propertyExpenses;
            netCashflow += (rentalIncome - propertyLoanInterest - propertyExpenses);
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
          
          // FIX 4: 3-year equity cycle from first purchase
          const firstPurchaseYear = previousPurchases.length > 0 
            ? Math.min(...previousPurchases.map(p => p.year))
            : currentYear;
          const yearsSinceFirstPurchase = currentYear - firstPurchaseYear;
          
          if (yearsSinceFirstPurchase > 0 && yearsSinceFirstPurchase % 3 === 0) {
            const portfolioEquity = Math.max(0, (grownPortfolioValue * 0.8 - profile.currentDebt) * profile.equityReleaseFactor);
            usableEquityPerProperty.push(portfolioEquity);
          } else {
            usableEquityPerProperty.push(0);
          }
        }
        
        previousPurchases.forEach(purchase => {
          if (purchase.year <= currentYear) {
            const yearsOwned = currentYear - purchase.year;
            const currentValue = calculatePropertyGrowth(purchase.cost, yearsOwned);
            totalPortfolioValue += currentValue;
            propertyValues.push(currentValue);
            
            // FIX 4: 3-year equity cycle from first purchase
            const firstPurchaseYear = previousPurchases.length > 0 
              ? Math.min(...previousPurchases.map(p => p.year))
              : currentYear;
            const yearsSinceFirstPurchase = currentYear - firstPurchaseYear;
            
            if (yearsSinceFirstPurchase > 0 && yearsSinceFirstPurchase % 3 === 0) {
              const usableEquity = Math.max(0, (currentValue * 0.8 - purchase.loanAmount) * profile.equityReleaseFactor);
              usableEquityPerProperty.push(usableEquity);
            } else {
              usableEquityPerProperty.push(0);
            }
          }
        });
      
      const totalUsableEquity = usableEquityPerProperty.reduce((sum, equity) => sum + equity, 0);
      
      // Use static borrowing capacity
      const newLoanAmount = property.cost - property.depositRequired;
      const totalDebtAfterPurchase = totalExistingDebt + newLoanAmount;
      
      // NEW SERVICEABILITY-BASED DEBT TEST
      // Interest-only loans - principal does not reduce
      // Calculate annual loan interest for all properties
      let totalAnnualLoanInterest = 0;
      const interestRate = parseFloat(globalFactors.interestRate) / 100;
      
      // Existing debt interest
      if (profile.currentDebt > 0) {
        totalAnnualLoanInterest += profile.currentDebt * interestRate;
      }
      
      // Previous purchases loan interest
      previousPurchases.forEach(purchase => {
        if (purchase.year <= currentYear) {
          totalAnnualLoanInterest += purchase.loanAmount * interestRate;
        }
      });
      
      // Add new property loan interest
      const newPropertyLoanInterest = newLoanAmount * interestRate;
      totalAnnualLoanInterest += newPropertyLoanInterest;
      
      // Hardcoded values for consistency
      const depositBuffer = 40000; // £40,000 deposit buffer
      
      // FIX 7: Actual DSR calculation instead of borrowing capacity method
      const dsr = grossRentalIncome > 0 ? (loanInterest / grossRentalIncome) * 100 : 999;
      const maxDSR = 80; // 80% DSR limit
      
      // SERVICEABILITY TEST: DSR <= 80%
      const canAffordDeposit = (availableFunds - depositBuffer) >= property.depositRequired;
      const canAffordServiceability = dsr <= maxDSR;
      
      
      if (!canAffordDeposit) {
        return { canAfford: false };
      }
      
      if (canAffordServiceability) {
        // Reset failure count on success
        consolidationState.consecutiveDebtTestFailures = 0;
        return { canAfford: true };
      }
      
       // UPDATED CONSOLIDATION LOGIC - trigger after 2 consecutive serviceability failures
       if (!canAffordServiceability) {
         consolidationState.consecutiveDebtTestFailures++;
       } else {
         consolidationState.consecutiveDebtTestFailures = 0; // Reset when serviceability passes
       }
       
       // Hardcoded consolidation limits
       const maxConsolidations = 3;
       const minConsolidationGap = 5; // years
       
       // Enhanced consolidation logic: check eligibility and caps
       const yearsSinceLastConsolidation = currentYear - profile.lastConsolidationYear;
       const totalConsolidationsSoFar = 3 - profile.consolidationsRemaining; // Calculate from remaining
       const consolidationEligible = yearsSinceLastConsolidation >= minConsolidationGap && totalConsolidationsSoFar < maxConsolidations;
       const shouldConsolidate = consolidationState.consecutiveDebtTestFailures >= 2 && consolidationEligible;
      
      if (shouldConsolidate && previousPurchases.length > 0) {
        
        const consolidationResult = executeConsolidation(currentYear, previousPurchases);
        
        // Recheck affordability with freed equity and reduced debt
        const newAvailableFundsResult = calculateAvailableFunds(currentYear, consolidationResult.updatedPurchases, consolidationResult.equityFreed);
        const recheck = checkAffordability(property, newAvailableFundsResult.total, consolidationResult.updatedPurchases, currentYear, consolidationResult.equityFreed);
        
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
    ): { year: number; consolidation?: any; updatedPurchases?: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number; title: string }> } => {
      let currentPurchases = [...previousPurchases];
      
      for (let year = 1; year <= profile.timelineYears; year++) {
        // FIX 1: 12-MONTH PURCHASE GAP - don't block year 1
        const lastPurchaseYear = currentPurchases.length > 0 
          ? Math.max(...currentPurchases.map(p => p.year)) 
          : 0;
        
        // Skip years that don't meet the 12-month gap requirement
        if (lastPurchaseYear > 0 && year <= lastPurchaseYear + 1) {
          continue;
        }
        
        const availableFundsResult = calculateAvailableFunds(year, currentPurchases);
        const affordabilityResult = checkAffordability(property, availableFundsResult.total, currentPurchases, year);
        
        if (affordabilityResult.canAfford) {
          const absoluteYear = year + 2025 - 1;
          
          if (affordabilityResult.consolidationTriggered) {
            // Update the purchase history to reflect consolidation
            currentPurchases = affordabilityResult.consolidationDetails.updatedPurchases;
            
            // Add the new property to the consolidated purchase history
            const newPurchase = {
              year: year, // Use relative year
              cost: property.cost,
              depositRequired: property.depositRequired,
              loanAmount: property.cost - property.depositRequired,
              title: property.title
            };
            currentPurchases.push(newPurchase);
            
            return { 
              year: absoluteYear, 
              consolidation: affordabilityResult.consolidationDetails,
              updatedPurchases: currentPurchases
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
    let purchaseHistory: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number; title: string }> = [];
    
    // Process properties sequentially, determining purchase year for each
    allPropertiesToPurchase.forEach(({ property, index }, globalIndex) => {
      const result = determineNextPurchaseYear(property, purchaseHistory);
      const loanAmount = property.cost - property.depositRequired;
      
      // Calculate portfolio metrics at time of purchase
      let portfolioValueAfter = 0;
      let totalEquityAfter = 0;
      let availableFundsUsed = 0;
      let totalDebtAfter = 0;
      
      if (result.year !== Infinity) {
        const purchaseYear = result.year - 2025 + 1; // Convert to relative year
        
        // Calculate existing portfolio value (with growth)
        if (profile.portfolioValue > 0) {
          portfolioValueAfter += calculatePropertyGrowth(profile.portfolioValue, purchaseYear - 1);
        }
        
        // Calculate total debt from existing portfolio
        totalDebtAfter = profile.currentDebt;
        
        // Add all previous purchases (with growth based on years owned)
        purchaseHistory.forEach(purchase => {
          const yearsOwned = purchaseYear - purchase.year;
          portfolioValueAfter += calculatePropertyGrowth(purchase.cost, yearsOwned);
          totalDebtAfter += purchase.loanAmount;
        });
        
        // Add the current property being purchased
        portfolioValueAfter += property.cost;
        totalDebtAfter += loanAmount;
        
        // Calculate equity
        totalEquityAfter = portfolioValueAfter - totalDebtAfter;
        
        // Calculate available funds used
        const availableFundsResult = calculateAvailableFunds(purchaseYear, purchaseHistory);
        availableFundsUsed = availableFundsResult.total;
      }
      
      // Calculate cashflow breakdown for this property
      const purchaseYear = result.year - 2025 + 1;
      let grossRentalIncome = 0;
      let loanInterest = 0;
      let expenses = 0;
      let netCashflow = 0;
      
      // FIX 5: Calculate portfolio size for rental recognition AFTER this purchase
      const portfolioSize = purchaseHistory.filter(p => p.year <= purchaseYear).length + 1;
      const rentalRecognitionRate = calculateRentalRecognitionRate(portfolioSize);
      
      // Calculate cashflow from all properties including this one
      [...purchaseHistory, { year: purchaseYear, cost: property.cost, depositRequired: property.depositRequired, loanAmount: loanAmount, title: property.title }].forEach(purchase => {
        const yearsOwned = purchaseYear - purchase.year;
        const propertyData = getPropertyData(purchase.title);
        
        if (propertyData && purchase.year <= purchaseYear) {
          const propertyGrowthRate = parseFloat(propertyData.growth) / 100;
          const currentValue = purchase.cost * Math.pow(1 + propertyGrowthRate, yearsOwned);
          const yieldRate = parseFloat(propertyData.yield) / 100;
          const rentalIncome = currentValue * yieldRate * rentalRecognitionRate;
          const interestRate = parseFloat(globalFactors.interestRate) / 100;
          const propertyLoanInterest = purchase.loanAmount * interestRate;
          const propertyExpenses = rentalIncome * 0.30;
          
          grossRentalIncome += rentalIncome;
          loanInterest += propertyLoanInterest;
          expenses += propertyExpenses;
        }
      });
      
      netCashflow = grossRentalIncome - loanInterest - expenses;
      
      // Calculate test results
      const depositBuffer = 40000;
      const depositTestSurplus = availableFundsUsed - depositBuffer - property.depositRequired;
      const depositTestPass = depositTestSurplus >= 0;
      
      // FIX 7: Use actual DSR calculation
      const dsr = grossRentalIncome > 0 ? (loanInterest / grossRentalIncome) * 100 : 999;
      const maxDSR = 80;
      const serviceabilityTestSurplus = (grossRentalIncome * (maxDSR / 100)) - loanInterest;
      const serviceabilityTestPass = dsr <= maxDSR;
      
      // FIX 2-3, 4, 9: Get detailed breakdown from calculateAvailableFunds
      const fundsBreakdown = calculateAvailableFunds(purchaseYear, purchaseHistory);
      const baseDeposit = fundsBreakdown.baseDeposit;
      const cumulativeSavings = fundsBreakdown.cumulativeSavings;
      const cashflowReinvestment = fundsBreakdown.cashflowReinvestment;
      const equityRelease = fundsBreakdown.equityRelease;
      
      const timelineProperty: TimelineProperty = {
        id: `${property.id}_${index}`,
        title: property.title,
        cost: property.cost,
        depositRequired: property.depositRequired,
        loanAmount: loanAmount,
        affordableYear: result.year,
        status: result.year === Infinity ? 'challenging' : (result.consolidation ? 'consolidation' : 'feasible'),
        isConsolidationEvent: !!result.consolidation, // FIX 10: Flag consolidation events
        propertyIndex: index,
        portfolioValueAfter: portfolioValueAfter,
        totalEquityAfter: totalEquityAfter,
        totalDebtAfter: totalDebtAfter,
        availableFundsUsed: availableFundsUsed,
        
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
        borrowingCapacityRemaining: profile.borrowingCapacity - totalDebtAfter,
        
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
        equityRelease
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
        if (result.consolidation && result.updatedPurchases) {
          // If consolidation occurred, replace entire purchase history with consolidated results
          purchaseHistory = [...result.updatedPurchases];
        } else {
          // Normal property addition
          purchaseHistory.push({
            year: result.year - 2025 + 1, // Convert back to relative year
            cost: property.cost,
            depositRequired: property.depositRequired,
            loanAmount: loanAmount,
            title: property.title
          });
        }
        
        // Sort purchase history by year to maintain chronological order
        purchaseHistory.sort((a, b) => a.year - b.year);
      }
    });
    
    // PHASE 2: Generate complete year-by-year breakdown
    const completeTimeline: TimelineProperty[] = [];
    const purchaseMap = new Map<number, TimelineProperty>();
    
    // Index purchases by absolute year for quick lookup
    timelineProperties.forEach(prop => {
      purchaseMap.set(prop.affordableYear, prop);
    });
    
    // Generate entry for each year
    for (let relativeYear = 1; relativeYear <= profile.timelineYears; relativeYear++) {
      const absoluteYear = relativeYear + 2024; // 2025, 2026, etc.
      
      // Check if this is a purchase year
      if (purchaseMap.has(absoluteYear)) {
        completeTimeline.push(purchaseMap.get(absoluteYear)!);
        continue;
      }
      
      // This is a non-purchase year - calculate portfolio state
      const purchasesUpToThisYear = purchaseHistory.filter(p => p.year < relativeYear);
      
      // Calculate portfolio value with growth
      let portfolioValue = profile.portfolioValue > 0 
        ? calculatePropertyGrowth(profile.portfolioValue, relativeYear - 1)
        : 0;
        
      let totalDebt = profile.currentDebt;
      let grossRentalIncome = 0;
      let loanInterest = 0;
      let expenses = 0;
      
      purchasesUpToThisYear.forEach(purchase => {
        const yearsOwned = relativeYear - purchase.year;
        portfolioValue += calculatePropertyGrowth(purchase.cost, yearsOwned);
        totalDebt += purchase.loanAmount;
        
        // Calculate cashflow from this property
        const propertyData = getPropertyData(purchase.title);
        if (propertyData) {
          const propertyGrowthRate = parseFloat(propertyData.growth) / 100;
          const currentValue = purchase.cost * Math.pow(1 + propertyGrowthRate, yearsOwned);
          const yieldRate = parseFloat(propertyData.yield) / 100;
          const portfolioSize = purchasesUpToThisYear.length;
          const recognitionRate = calculateRentalRecognitionRate(portfolioSize);
          const rentalIncome = currentValue * yieldRate * recognitionRate;
          const interestRate = parseFloat(globalFactors.interestRate) / 100;
          const propertyLoanInterest = purchase.loanAmount * interestRate;
          const propertyExpenses = rentalIncome * 0.30;
          
          grossRentalIncome += rentalIncome;
          loanInterest += propertyLoanInterest;
          expenses += propertyExpenses;
        }
      });
      
      const totalEquity = portfolioValue - totalDebt;
      const netCashflow = grossRentalIncome - loanInterest - expenses;
      
      // Calculate available funds
      const availableFundsResult = calculateAvailableFunds(relativeYear, purchasesUpToThisYear);
      const availableFunds = availableFundsResult.total;
      
      // FIX 1: Determine blocking reason - don't block year 1
      const lastPurchaseYear = purchasesUpToThisYear.length > 0 
        ? Math.max(...purchasesUpToThisYear.map(p => p.year))
        : 0;
      const isGapBlocked = lastPurchaseYear > 0 && relativeYear <= lastPurchaseYear + 1;
      
      // Try to determine if deposit or serviceability would fail
      const nextPropertyInQueue = allPropertiesToPurchase.find((_, idx) => 
        idx >= timelineProperties.length
      );
      
      let depositTestPass = true;
      let serviceabilityTestPass = true;
      let depositTestSurplus = 0;
      let serviceabilityTestSurplus = 0;
      
      if (nextPropertyInQueue && !isGapBlocked) {
        const property = nextPropertyInQueue.property;
        const depositBuffer = 40000;
        const requiredFunds = property.depositRequired + depositBuffer;
        depositTestPass = availableFunds >= requiredFunds;
        depositTestSurplus = availableFunds - requiredFunds;
        
        // Simplified serviceability check
        const loanAmount = property.cost - property.depositRequired;
        const totalDebtAfter = totalDebt + loanAmount;
        serviceabilityTestPass = profile.borrowingCapacity >= totalDebtAfter;
        serviceabilityTestSurplus = profile.borrowingCapacity - totalDebtAfter;
      }
      
      // Determine status
      let status: 'feasible' | 'challenging' | 'consolidation' | 'waiting' | 'blocked';
      if (isGapBlocked) {
        status = 'waiting';
      } else if (!depositTestPass || !serviceabilityTestPass) {
        status = 'blocked';
      } else {
        status = 'waiting';
      }
      
      // Create non-purchase year entry
      const nonPurchaseYear: TimelineProperty = {
        id: `year_${relativeYear}`,
        title: '', // No property
        cost: 0,
        depositRequired: 0,
        loanAmount: 0,
        affordableYear: absoluteYear,
        status,
        propertyIndex: -1, // No property purchased
        portfolioValueAfter: portfolioValue,
        totalEquityAfter: totalEquity,
        totalDebtAfter: totalDebt,
        availableFundsUsed: availableFunds,
        
        // Cashflow from existing properties
        grossRentalIncome,
        loanInterest,
        expenses,
        netCashflow,
        
        depositTestSurplus,
        depositTestPass,
        serviceabilityTestSurplus,
        serviceabilityTestPass,
        borrowingCapacityUsed: totalDebt,
        borrowingCapacityRemaining: profile.borrowingCapacity - totalDebt,
        
        isGapRuleBlocked: isGapBlocked,
        rentalRecognitionRate: calculateRentalRecognitionRate(purchasesUpToThisYear.length),
        
        portfolioValueBefore: portfolioValue,
        totalEquityBefore: totalEquity,
        totalDebtBefore: totalDebt,
        
        // FIX 2-3, 9: Use breakdown from calculateAvailableFunds
        baseDeposit: availableFundsResult.baseDeposit,
        cumulativeSavings: availableFundsResult.cumulativeSavings,
        cashflowReinvestment: availableFundsResult.cashflowReinvestment,
        equityRelease: availableFundsResult.equityRelease
      };
      
      completeTimeline.push(nonPurchaseYear);
    }
    
    // Sort by year for display
    const sortedTimeline = completeTimeline.sort((a, b) => a.affordableYear - b.affordableYear);
    
    // Release UI thread after calculation
    setTimeout(() => setIsCalculating(false), 0);
    
    return sortedTimeline;
  }, [
    debouncedSelections,
    propertyTypes,
    profile.timelineYears,
    profile.borrowingCapacity,
    profile.depositPool,
    profile.annualSavings,
    profile.portfolioValue,
    profile.currentDebt,
    profile.equityFactor,
    profile.consecutiveFailureThreshold,
    profile.equityReleaseFactor,
    profile.consolidationsRemaining,
    profile.lastConsolidationYear,
    calculatedValues.availableDeposit,
    globalFactors.growthRate,
    globalFactors.interestRate
  ]);

  // Only expose the memoized result
  return {
    timelineProperties: calculateTimelineProperties,
    isCalculating,
    calculateAffordabilityForProperty: () => {} // Placeholder since this is now internal
  };
};