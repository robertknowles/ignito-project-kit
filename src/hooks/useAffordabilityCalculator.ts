import React, { useMemo, useCallback } from 'react';
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

  // Create stable selections hash to avoid expensive JSON.stringify on every render
  const selectionsHash = useMemo(() => {
    return Object.entries(selections)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, qty]) => `${id}:${qty}`)
      .join('|');
  }, [selections]);

  // Debug flag - set to true to enable detailed debugging
  const DEBUG_MODE = false; // Disabled for performance

  // Move helper functions outside useMemo so they can be accessed by other functions
  const calculatePropertyGrowth = (initialValue: number, years: number) => {
    let currentValue = initialValue;
    
    for (let year = 1; year <= years; year++) {
      let growthRate;
      if (year <= 2) {
        growthRate = 0.10; // 10% for years 1-2
      } else {
        growthRate = 0.06; // 6% for years 3+
      }
      currentValue *= (1 + growthRate);
    }
    
    return currentValue;
  };

  // Helper function to get the growth rate for a specific year
  const getGrowthRateForYear = (yearsOwned: number): number => {
    if (yearsOwned <= 2) {
      return 0.10; // 10% for years 1-2
    } else {
      return 0.06; // 6% for years 3+
    }
  };

  // Progressive rental recognition rates based on portfolio size
  const calculateRentalRecognitionRate = (portfolioSize: number): number => {
    if (portfolioSize <= 2) return 0.75;      // Properties 1-2: 75%
    if (portfolioSize <= 4) return 0.70;      // Properties 3-4: 70%
    return 0.65;                              // Properties 5+: 65%
  };

  const calculateAvailableFunds = (
      currentYear: number, 
      previousPurchases: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number; title: string }>
    ): {
      total: number;
      baseDeposit: number;
      cumulativeSavings: number;
      cashflowReinvestment: number;
      equityRelease: number;
      depositsUsed: number;
    } => {
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
              // Calculate current property value with tiered growth (10% years 1-2, 6% years 3+)
              const currentValue = calculatePropertyGrowth(purchase.cost, yearsOwned);
              
              // Calculate rental income with progressive recognition rates
              const yieldRate = parseFloat(propertyData.yield) / 100;
              // Fix: Portfolio size should exclude current property for non-purchase years
              const portfolioSize = previousPurchases.filter(p => p.year < year).length;
              const recognitionRate = calculateRentalRecognitionRate(portfolioSize);
              const rentalIncome = currentValue * yieldRate * recognitionRate;
              
              // Interest-only loans - principal does not reduce
              const interestRate = parseFloat(globalFactors.interestRate) / 100;
              const loanInterest = purchase.loanAmount * interestRate;
              
              // Calculate expenses (30% of rental income + 3% annual inflation)
              const expenses = rentalIncome * 0.30 * Math.pow(1.03, yearsOwned);
              
              // Net cashflow for this property
              const propertyCashflow = rentalIncome - loanInterest - expenses;
              netCashflow += propertyCashflow;
            }
          }
        });
        
        // Total savings for this year = base savings + net cashflow
        const totalYearSavings = yearSavings + netCashflow;
        totalEnhancedSavings += totalYearSavings;
      }
      
      // Calculate deposits used for previous purchases
      const totalDepositsUsed = previousPurchases.reduce((sum, purchase) => {
        if (purchase.year <= currentYear) {
          return sum + purchase.depositRequired;
        }
        return sum;
      }, 0);

      // Calculate base savings (without cashflow)
      const baseSavings = profile.annualSavings * currentYear;
      
      // Calculate net cashflow reinvestment - fix for non-purchase years
      const netCashflow = totalEnhancedSavings - baseSavings;
      
      // CONTINUOUS EQUITY RECYCLING: Release equity whenever available (88% LVR cap)
      let existingPortfolioEquity = 0;
      let totalUsableEquity = 0;
      
      // Calculate existing portfolio equity with 88% LVR cap
      if (profile.portfolioValue > 0) {
        const grownPortfolioValue = calculatePropertyGrowth(profile.portfolioValue, currentYear - 1);
        existingPortfolioEquity = Math.max(0, grownPortfolioValue * 0.88 - profile.currentDebt);
      }

      // Calculate usable equity from previous purchases - with 88% LVR cap
      totalUsableEquity = previousPurchases.reduce((acc, purchase) => {
        if (purchase.year <= currentYear) {
          const propertyCurrentValue = calculatePropertyGrowth(purchase.cost, currentYear - purchase.year);
          const usableEquity = Math.max(0, propertyCurrentValue * 0.88 - purchase.loanAmount);
          return acc + usableEquity;
        }
        return acc;
      }, existingPortfolioEquity);
      
      // Calculate final funds
      const finalFunds = calculatedValues.availableDeposit + totalEnhancedSavings + totalUsableEquity - totalDepositsUsed;
      
      return {
        total: finalFunds,
        baseDeposit: Math.max(0, calculatedValues.availableDeposit - totalDepositsUsed),
        cumulativeSavings: baseSavings,
        cashflowReinvestment: netCashflow,
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
    
    // Calculate current property value with tiered growth (10% years 1-2, 6% years 3+)
    const currentValue = calculatePropertyGrowth(purchase.cost, yearsOwned);
    
    // Cashflow Score (rental income - loan payments - expenses)
    const yieldRate = parseFloat(propertyData.yield) / 100;
    const rentalIncome = currentValue * yieldRate;
    // Interest-only loans - principal does not reduce
    const interestRate = parseFloat(globalFactors.interestRate) / 100;
    const loanInterest = purchase.loanAmount * interestRate;
    // Calculate expenses (30% of rental income + 3% annual inflation)
    const expenses = rentalIncome * 0.30 * Math.pow(1.03, yearsOwned);
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

  const checkAffordability = (
    property: any,
    availableFunds: number,
    previousPurchases: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number; title: string }>,
    currentYear: number
  ): { canAfford: boolean } => {
      
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
          // Calculate current property value with tiered growth (10% years 1-2, 6% years 3+)
          const currentValue = calculatePropertyGrowth(purchase.cost, yearsOwned);
            const yieldRate = parseFloat(propertyData.yield) / 100;
            // Apply progressive rental recognition based on portfolio size at time of evaluation
            // Fix: Portfolio size should exclude current property for non-purchase years
            const portfolioSize = previousPurchases.filter(p => p.year < currentYear).length;
            const recognitionRate = calculateRentalRecognitionRate(portfolioSize);
            const rentalIncome = currentValue * yieldRate * recognitionRate;
            // Interest-only loans - principal does not reduce
            const interestRate = parseFloat(globalFactors.interestRate) / 100;
            const propertyLoanInterest = purchase.loanAmount * interestRate;
            // Calculate expenses (30% of rental income + 3% annual inflation)
            const propertyExpenses = rentalIncome * 0.30 * Math.pow(1.03, yearsOwned);
            
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
          
          // Continuous equity release - 88% LVR cap, no time constraint
          const portfolioEquity = Math.max(0, grownPortfolioValue * 0.88 - profile.currentDebt);
          usableEquityPerProperty.push(portfolioEquity);
        }
        
        previousPurchases.forEach(purchase => {
          if (purchase.year <= currentYear) {
            const yearsOwned = currentYear - purchase.year;
            const currentValue = calculatePropertyGrowth(purchase.cost, yearsOwned);
            totalPortfolioValue += currentValue;
            propertyValues.push(currentValue);
            
            // Continuous equity release - 88% LVR cap, no time constraint
            const usableEquity = Math.max(0, currentValue * 0.88 - purchase.loanAmount);
            usableEquityPerProperty.push(usableEquity);
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
      
      // Calculate rental income from new property for DSR calculation
      const propertyData = getPropertyData(property.title);
      let newPropertyRentalIncome = 0;
      if (propertyData) {
        const yieldRate = parseFloat(propertyData.yield) / 100;
        const portfolioSize = previousPurchases.filter(p => p.year <= currentYear).length;
        const recognitionRate = calculateRentalRecognitionRate(portfolioSize);
        newPropertyRentalIncome = property.cost * yieldRate * recognitionRate;
      }
      
      // Total rental income including new property
      const totalRentalIncome = grossRentalIncome + newPropertyRentalIncome;
      
      // Hardcoded values for consistency
      const depositBuffer = 40000; // £40,000 deposit buffer
      
      // Enhanced serviceability test with rental income contribution
      const baseCapacity = profile.borrowingCapacity * 0.10;
      const rentalContribution = totalRentalIncome * 0.70; // 70% of rental income counts
      const enhancedCapacity = baseCapacity + rentalContribution;
      const maxAnnualInterest = enhancedCapacity;
      const serviceabilityTestSurplus = maxAnnualInterest - totalAnnualLoanInterest;
      const serviceabilityTestPass = serviceabilityTestSurplus >= 0;
      
      // BORROWING CAPACITY TEST: Total debt cannot exceed borrowing capacity
      const borrowingCapacityTestPass = totalDebtAfterPurchase <= profile.borrowingCapacity;
      const borrowingCapacityTestSurplus = profile.borrowingCapacity - totalDebtAfterPurchase;
      
      // SERVICEABILITY TEST: Capacity-based (10% of borrowing capacity)
      const canAffordDeposit = (availableFunds - depositBuffer) >= property.depositRequired;
      const canAffordServiceability = serviceabilityTestPass;
      const canAffordBorrowingCapacity = borrowingCapacityTestPass;
      
      // Debug trace output
      if (DEBUG_MODE) {
        const timelineYear = currentYear + 2025 - 1;
        const depositPool = availableFunds;
        const equityFreed = 0;
        const rentalIncome = grossRentalIncome;
        const adjustedCapacity = profile.borrowingCapacity;
        const serviceabilityMethod = 'borrowing-capacity';
        const existingDebt = totalExistingDebt;
        const newLoan = newLoanAmount;
        const totalDebt = totalDebtAfterPurchase;
        const depositPass = canAffordDeposit;
        const serviceabilityPass = canAffordServiceability;
        const purchaseDecision = canAffordServiceability && canAffordDeposit ? timelineYear : '❌';
        const requiredDeposit = property.depositRequired;

        console.log(`\n--- Year ${timelineYear} Debug Trace ---`);

        // === AVAILABLE FUNDS BREAKDOWN ===
        const cumulativeSavings = annualSavings * (currentYear - 1);
        const continuousEquityAccess = totalUsableEquity;
        const totalAnnualSavings = profile.annualSavings + netCashflow; // Self-funding flywheel
        
        console.log(
          `💰 Available Funds: Total = ${depositPool.toLocaleString()}`
        );
        console.log(
          `   ├─ Base Deposit Pool: £${baseDeposit.toLocaleString()}`
        );
        console.log(
          `   ├─ Cumulative Savings: £${cumulativeSavings.toLocaleString()} (${currentYear-1} years × £${profile.annualSavings.toLocaleString()})`
        );
        console.log(
          `   ├─ Net Cashflow Reinvestment: £${netCashflow.toLocaleString()}`
        );
        console.log(
          `   └─ Continuous Equity Access: £${continuousEquityAccess.toLocaleString()} (88% LVR cap)`
        );

        // === SELF-FUNDING FLYWHEEL ===
        console.log(
          `🔄 Self-Funding Flywheel: AnnualSavings = BaseSavings(£${profile.annualSavings.toLocaleString()}) + NetCashflowReinvestment(£${netCashflow.toLocaleString()}) = £${totalAnnualSavings.toLocaleString()}`
        );

        // === EQUITY BREAKDOWN ===
        console.log(
          `🏠 Equity Breakdown: Total Usable = £${totalUsableEquity.toLocaleString()}`
        );
        propertyValues.forEach((value, i) => {
          const equity = usableEquityPerProperty[i];
          console.log(
            `   Property ${i+1}: Value £${value.toLocaleString()} → Usable Equity £${equity.toLocaleString()}`
          );
        });

        // === CASHFLOW BREAKDOWN ===
        console.log(
          `💵 Cashflow: Net = £${netCashflow.toLocaleString()}/year`
        );
        console.log(
          `   ├─ Gross Rental: £${rentalIncome.toLocaleString()}`
        );
        console.log(
          `   ├─ Loan Interest: -£${loanInterest.toLocaleString()}`
        );
        console.log(
          `   └─ Expenses: -£${expenses.toLocaleString()} (30% + 3% annual inflation)`
        );

        // === SERVICEABILITY TEST ===
        const annualLoanInterest = totalAnnualLoanInterest;
        const maxAnnualInterestValue = maxAnnualInterest;
        const serviceabilitySurplus = serviceabilityTestSurplus;
        
        console.log(
          `📊 Serviceability Test: ${serviceabilityPass ? "PASS" : "FAIL"} (Enhanced with Rental)`
        );
        console.log(
          `   ├─ Loan Interest: £${annualLoanInterest.toLocaleString()}`
        );
        console.log(
          `   ├─ Base Capacity: £${baseCapacity.toLocaleString()} (10% of £${profile.borrowingCapacity.toLocaleString()})`
        );
        console.log(
          `   ├─ Rental Contribution: £${rentalContribution.toLocaleString()} (70% of £${totalRentalIncome.toLocaleString()})`
        );
        console.log(
          `   ├─ Max Annual Interest: £${maxAnnualInterestValue.toLocaleString()} (base + rental)`
        );
        console.log(
          `   └─ Surplus: £${serviceabilitySurplus.toLocaleString()}`
        );
        const depositBufferDisplay = 40000;
        console.log(
          `   └─ Deposit Test: £${availableFunds.toLocaleString()} - £${depositBufferDisplay.toLocaleString()} buffer ≥ £${property.depositRequired.toLocaleString()} required`
        );
        
        console.log(
          `📈 Static Capacity: £${adjustedCapacity.toLocaleString()}`
        );

        // === DEBT POSITION ===
        console.log(
          `💳 Debt Position: Total After Purchase = £${totalDebt.toLocaleString()}`
        );
        console.log(
          `   ├─ Existing Debt: £${existingDebt.toLocaleString()}`
        );
        console.log(
          `   └─ New Loan Required: £${newLoan.toLocaleString()}`
        );
        
        // === BORROWING CAPACITY CHECK ===
        console.log(
          `🏦 Borrowing Capacity Check: ${borrowingCapacityTestPass ? "PASS" : "FAIL"}`
        );
        console.log(
          `   ├─ Total Debt After Purchase: £${totalDebtAfterPurchase.toLocaleString()}`
        );
        console.log(
          `   ├─ Borrowing Capacity Limit: £${profile.borrowingCapacity.toLocaleString()}`
        );
        console.log(
          `   └─ Remaining Capacity: £${borrowingCapacityTestSurplus.toLocaleString()}`
        );

        // === STRATEGY INSIGHTS ===
        const portfolioScalingVelocity = previousPurchases.filter(p => p.year <= currentYear).length;
        const selfFundingEfficiency = netCashflow > 0 ? (netCashflow / totalAnnualSavings * 100) : 0;
        const equityRecyclingImpact = continuousEquityAccess > 0 ? (continuousEquityAccess / depositPool * 100) : 0;
        
        console.log(
          `📈 Strategy Insights:`
        );
        console.log(
          `   ├─ Portfolio Scaling: ${portfolioScalingVelocity} properties acquired so far`
        );
        console.log(
          `   ├─ Self-Funding Efficiency: ${selfFundingEfficiency.toFixed(1)}% (cashflow contribution to annual savings)`
        );
        console.log(
          `   └─ Equity Recycling Impact: ${equityRecyclingImpact.toFixed(1)}% (equity as % of available funds)`
        );

        // === FINAL DECISION ===
        console.log(
          `✅ Final Decision: DepositTest = ${depositPass ? "PASS" : "FAIL"} | BorrowingCapacity = ${borrowingCapacityTestPass ? "PASS" : "FAIL"} | ServiceabilityTest = ${serviceabilityPass ? "PASS" : "FAIL"} | Purchase = ${purchaseDecision}`
        );
      }
      
      if (!canAffordDeposit) {
        return { canAfford: false };
      }
      
      // Check if all tests pass
      if (canAffordServiceability && canAffordBorrowingCapacity) {
        return { canAfford: true };
      }
      
      return { canAfford: false };
    };

  const calculateTimelineProperties = useMemo((): TimelineProperty[] => {
    const determineNextPurchaseYear = (
      property: any,
      previousPurchases: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number; title: string }>
    ): { year: number } => {
      let currentPurchases = [...previousPurchases];
      let iterationCount = 0;
      const maxIterations = profile.timelineYears * 2; // Safety limit
      
      for (let year = 1; year <= profile.timelineYears; year++) {
        iterationCount++;
        if (iterationCount > maxIterations) {
          console.error('[SAFETY] Max iterations exceeded in determineNextPurchaseYear');
          return { year: Infinity };
        }
        // 6-MONTH PURCHASE GAP: Enforce minimum gap between purchases
        const lastPurchaseYear = currentPurchases.length > 0 
          ? Math.max(...currentPurchases.map(p => p.year)) 
          : 0;
        
        // Skip years that don't meet the 6-month gap requirement
        // 6 months = 0.5 years, so we allow purchases in the same year or next year
        // Only block if trying to purchase in the exact same year
        const isGapBlocked = lastPurchaseYear > 0 && year <= lastPurchaseYear;
        if (isGapBlocked) {
          if (DEBUG_MODE) {
            console.log(`[GAP CHECK] Year ${year + 2025 - 1}: Skipped due to 6-month gap rule (last purchase: ${lastPurchaseYear + 2025 - 1})`);
          }
          continue;
        }
        
        const availableFunds = calculateAvailableFunds(year, currentPurchases);
        const affordabilityResult = checkAffordability(property, availableFunds.total, currentPurchases, year);
        
        if (affordabilityResult.canAfford) {
          const absoluteYear = year + 2025 - 1;
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
        // CRITICAL FIX: Only include purchases made by or before the current purchase year
        purchaseHistory.forEach(purchase => {
          if (purchase.year <= purchaseYear) {
            const yearsOwned = purchaseYear - purchase.year;
            portfolioValueAfter += calculatePropertyGrowth(purchase.cost, yearsOwned);
            totalDebtAfter += purchase.loanAmount;
          }
        });
        
        // Add the current property being purchased
        portfolioValueAfter += property.cost;
        totalDebtAfter += loanAmount;
        
        // Calculate equity
        totalEquityAfter = portfolioValueAfter - totalDebtAfter;
        
        // Calculate available funds used
        const fundsBreakdown = calculateAvailableFunds(purchaseYear, purchaseHistory);
        availableFundsUsed = fundsBreakdown.total;
      }
      
      // Calculate cashflow breakdown for this property
      const purchaseYear = result.year - 2025 + 1;
      let grossRentalIncome = 0;
      let loanInterest = 0;
      let expenses = 0;
      let netCashflow = 0;
      
      // Calculate portfolio size for rental recognition
      // Fix: For purchase years, include the current property; for non-purchase years, exclude it
      const portfolioSize = purchaseHistory.filter(p => p.year <= purchaseYear).length + 1;
      const rentalRecognitionRate = calculateRentalRecognitionRate(portfolioSize);
      
      // Calculate cashflow from all properties including this one
      [...purchaseHistory, { year: purchaseYear, cost: property.cost, depositRequired: property.depositRequired, loanAmount: loanAmount, title: property.title }].forEach(purchase => {
        const yearsOwned = purchaseYear - purchase.year;
        const propertyData = getPropertyData(purchase.title);
        
        if (propertyData && purchase.year <= purchaseYear) {
          // Calculate current property value with tiered growth (10% years 1-2, 6% years 3+)
          const currentValue = calculatePropertyGrowth(purchase.cost, yearsOwned);
          const yieldRate = parseFloat(propertyData.yield) / 100;
          const rentalIncome = currentValue * yieldRate * rentalRecognitionRate;
          const interestRate = parseFloat(globalFactors.interestRate) / 100;
          const propertyLoanInterest = purchase.loanAmount * interestRate;
          const propertyExpenses = rentalIncome * 0.30 * Math.pow(1.03, yearsOwned);
          
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
      
      // Enhanced serviceability test with rental income contribution
      const baseCapacity = profile.borrowingCapacity * 0.10;
      const rentalContribution = grossRentalIncome * 0.70; // 70% of rental income counts
      const enhancedCapacity = baseCapacity + rentalContribution;
      const maxAnnualInterest = enhancedCapacity;
      const serviceabilityTestSurplus = maxAnnualInterest - loanInterest;
      const serviceabilityTestPass = serviceabilityTestSurplus >= 0;
      
      // Calculate available funds breakdown - USE CALCULATED VALUES
      const fundsBreakdownFinal = calculateAvailableFunds(purchaseYear, purchaseHistory);
      const annualSavings = profile.annualSavings;
      const cumulativeSavings = fundsBreakdownFinal.cumulativeSavings;
      const baseDeposit = fundsBreakdownFinal.baseDeposit; // Rolling amount based on deposits used
      
      // Calculate equity release (continuous, 88% LVR cap)
      let equityRelease = 0;
      
      purchaseHistory.forEach(purchase => {
        if (purchase.year <= purchaseYear) {
          const yearsOwned = purchaseYear - purchase.year;
          const currentValue = calculatePropertyGrowth(purchase.cost, yearsOwned);
          const usableEquity = Math.max(0, currentValue * 0.88 - purchase.loanAmount);
          equityRelease += usableEquity;
        }
      });
      
      // Fix: Display accumulated reinvestment correctly for non-purchase years
      const cashflowReinvestment = Math.max(0, netCashflow);
      
      const timelineProperty: TimelineProperty = {
        id: `${property.id}_${index}`,
        title: property.title,
        cost: property.cost,
        depositRequired: property.depositRequired,
        loanAmount: loanAmount,
        affordableYear: result.year,
        status: result.year === Infinity ? 'challenging' : 'feasible',
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
        // CRITICAL: This calculation MUST match the borrowing capacity test in checkAffordability
        // Both use: borrowingCapacity - totalDebt (where totalDebt is filtered by year)
        borrowingCapacityRemaining: Math.max(0, profile.borrowingCapacity - totalDebtAfter),
        
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
    return timelineProperties.sort((a, b) => a.affordableYear - b.affordableYear);
  }, [
    // Only re-calculate when these specific values change
    selectionsHash,
    propertyTypes.length,
    profile.timelineYears,
    profile.borrowingCapacity,
    profile.depositPool,
    profile.annualSavings,
    calculatedValues.availableDeposit,
    globalFactors.growthRate,
    globalFactors.interestRate,
    getPropertyData
  ]);

  // Function to calculate affordability for any year and property
  const calculateAffordabilityForYear = useCallback((
    year: number,
    property: any,
    previousPurchases: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number; title: string }>
  ) => {
    const availableFunds = calculateAvailableFunds(year, previousPurchases);
    const affordabilityResult = checkAffordability(property, availableFunds.total, previousPurchases, year);
    
    // Calculate test results even if affordability fails
    const depositBuffer = 40000;
    const depositTestSurplus = availableFunds.total - depositBuffer - property.depositRequired;
    const depositTestPass = depositTestSurplus >= 0;
    
    // Calculate rental income for enhanced serviceability test
    let totalRentalIncome = 0;
    previousPurchases.forEach(purchase => {
      if (purchase.year <= year) {
        const yearsOwned = year - purchase.year;
        const propertyData = getPropertyData(purchase.title);
        if (propertyData) {
          const currentValue = calculatePropertyGrowth(purchase.cost, yearsOwned);
          const yieldRate = parseFloat(propertyData.yield) / 100;
          const portfolioSize = previousPurchases.filter(p => p.year <= year).length;
          const recognitionRate = calculateRentalRecognitionRate(portfolioSize);
          totalRentalIncome += currentValue * yieldRate * recognitionRate;
        }
      }
    });
    
    // Add new property rental income
    const propertyData = getPropertyData(property.title);
    if (propertyData) {
      const yieldRate = parseFloat(propertyData.yield) / 100;
      const portfolioSize = previousPurchases.filter(p => p.year <= year).length;
      const recognitionRate = calculateRentalRecognitionRate(portfolioSize);
      totalRentalIncome += property.cost * yieldRate * recognitionRate;
    }
    
    // Calculate total loan interest for serviceability test
    let totalAnnualLoanInterest = 0;
    const interestRate = parseFloat(globalFactors.interestRate) / 100;
    
    // Existing debt interest
    if (profile.currentDebt > 0) {
      totalAnnualLoanInterest += profile.currentDebt * interestRate;
    }
    
    // Previous purchases loan interest
    previousPurchases.forEach(purchase => {
      if (purchase.year <= year) {
        totalAnnualLoanInterest += purchase.loanAmount * interestRate;
      }
    });
    
    // Add new property loan interest
    const newLoanAmount = property.cost - property.depositRequired;
    const newPropertyLoanInterest = newLoanAmount * interestRate;
    totalAnnualLoanInterest += newPropertyLoanInterest;
    
    // Enhanced serviceability test with rental income contribution
    const baseCapacity = profile.borrowingCapacity * 0.10;
    const rentalContribution = totalRentalIncome * 0.70; // 70% of rental income counts
    const enhancedCapacity = baseCapacity + rentalContribution;
    const maxAnnualInterest = enhancedCapacity;
    const serviceabilityTestSurplus = maxAnnualInterest - totalAnnualLoanInterest;
    const serviceabilityTestPass = serviceabilityTestSurplus >= 0;
    
    return {
      canAfford: affordabilityResult.canAfford,
      depositTestSurplus,
      depositTestPass,
      serviceabilityTestSurplus,
      serviceabilityTestPass,
      availableFunds: availableFunds.total
    };
  }, [profile, globalFactors, calculatedValues, getPropertyData]);

  // Only expose the memoized result
  return {
    timelineProperties: calculateTimelineProperties,
    isCalculating: false, // Could add state tracking if needed
    calculateAffordabilityForProperty: calculateAffordabilityForYear
  };
};