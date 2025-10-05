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
  console.log('DEBUGGING: useAffordabilityCalculator function called - REBUILD FORCED');
  const { profile, calculatedValues } = useInvestmentProfile();
  const { selections, propertyTypes } = usePropertySelection();
  const { globalFactors, getPropertyData } = useDataAssumptions();

  // Simplified consolidation - only trigger on consecutive failures

  // Debug flag - set to true to enable detailed debugging
  const DEBUG_MODE = false; // Disabled for performance
  console.log('useAffordabilityCalculator loaded - no dynamic capacity');

  // Move helper functions outside useMemo so they can be accessed by other functions
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
              // Calculate current property value with growth
              const propertyGrowthRate = parseFloat(propertyData.growth) / 100;
              const currentValue = purchase.cost * Math.pow(1 + propertyGrowthRate, yearsOwned);
              
              // Calculate rental income with progressive recognition rates
              const yieldRate = parseFloat(propertyData.yield) / 100;
              // Fix: Portfolio size should exclude current property for non-purchase years
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
      
      // CONTINUOUS EQUITY RECYCLING: Release equity whenever available (80% release rate)
      let existingPortfolioEquity = 0;
      let totalUsableEquity = 0;
      
      // Calculate existing portfolio equity with 80% release rate
      if (profile.portfolioValue > 0) {
        const grownPortfolioValue = calculatePropertyGrowth(profile.portfolioValue, currentYear - 1);
        existingPortfolioEquity = Math.max(0, (grownPortfolioValue * 0.8 - profile.currentDebt) * 0.8);
      }

      // Calculate usable equity from previous purchases - with 80% equity release rate
      totalUsableEquity = previousPurchases.reduce((acc, purchase) => {
        if (purchase.year <= currentYear) {
          const propertyCurrentValue = calculatePropertyGrowth(purchase.cost, currentYear - purchase.year);
          const usableEquity = Math.max(0, (propertyCurrentValue * 0.8 - purchase.loanAmount) * 0.8);
          return acc + usableEquity;
        }
        return acc;
      }, existingPortfolioEquity);
      
      // Calculate final funds
      const finalFunds = calculatedValues.availableDeposit + totalEnhancedSavings + additionalEquity + totalUsableEquity - totalDepositsUsed;
      
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
      
      // Trigger 2: Portfolio LVR > 80%
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
    previousPurchases: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number; title: string }>,
    consolidationState?: { consecutiveDebtTestFailures: number }
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
        if (consolidationState) {
          consolidationState.consecutiveDebtTestFailures = 0;
        }
      
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
    additionalEquity: number = 0,
    consolidationState?: { consecutiveDebtTestFailures: number }
  ): { canAfford: boolean; consolidationTriggered?: boolean; consolidationDetails?: any } => {
      // Create a default consolidation state if not provided
      const localConsolidationState = consolidationState || { consecutiveDebtTestFailures: 0 };
      
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
            // Fix: Portfolio size should exclude current property for non-purchase years
            const portfolioSize = previousPurchases.filter(p => p.year < currentYear).length;
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
          
          // Continuous equity release - 80% release rate, no time constraint
          const portfolioEquity = Math.max(0, (grownPortfolioValue * 0.8 - profile.currentDebt) * 0.8);
          usableEquityPerProperty.push(portfolioEquity);
        }
        
        previousPurchases.forEach(purchase => {
          if (purchase.year <= currentYear) {
            const yearsOwned = currentYear - purchase.year;
            const currentValue = calculatePropertyGrowth(purchase.cost, yearsOwned);
            totalPortfolioValue += currentValue;
            propertyValues.push(currentValue);
            
            // Continuous equity release - 80% release rate, no time constraint
            const usableEquity = Math.max(0, (currentValue * 0.8 - purchase.loanAmount) * 0.8);
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
      
      // Capacity-based serviceability test (restored from previous logic)
      const serviceabilityFactor = 0.10;
      const maxAnnualInterest = profile.borrowingCapacity * serviceabilityFactor;
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
        const equityFreed = 0; // Initialize to 0, will be updated if consolidation occurs
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
        const consolidationTriggered = false;

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
          `   └─ Continuous Equity Access: £${continuousEquityAccess.toLocaleString()} (80% of usable equity)`
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
          `   └─ Expenses: -£${expenses.toLocaleString()} (30% of rental income)`
        );

        // === SERVICEABILITY TEST ===
        const annualLoanInterest = totalAnnualLoanInterest;
        const maxAnnualInterestValue = maxAnnualInterest;
        const serviceabilitySurplus = serviceabilityTestSurplus;
        
        console.log(
          `📊 Serviceability Test: ${serviceabilityPass ? "PASS" : "FAIL"} (via Capacity)`
        );
        console.log(
          `   ├─ Loan Interest: £${annualLoanInterest.toLocaleString()}`
        );
        console.log(
          `   ├─ Max Annual Interest: £${maxAnnualInterestValue.toLocaleString()} (10% of £${profile.borrowingCapacity.toLocaleString()} capacity)`
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

        // === ENHANCED CONSOLIDATION STATUS ===
        // Hardcoded consolidation limits
        const maxConsolidations = 3;
        const minConsolidationGap = 5; // years
        
        const consecutiveFailuresCount = localConsolidationState.consecutiveDebtTestFailures;
        const yearsSinceLastConsolidation = currentYear - profile.lastConsolidationYear;
        const totalConsolidationsSoFar = 3 - profile.consolidationsRemaining;
        const consolidationEligible = yearsSinceLastConsolidation >= minConsolidationGap && totalConsolidationsSoFar < maxConsolidations;
        const shouldConsolidateDebug = localConsolidationState.consecutiveDebtTestFailures >= 2 && consolidationEligible;
        
        console.log(
          `🔄 Enhanced Consolidation Status:`
        );
        console.log(
          `   ├─ Consecutive Dual Failures: ${consecutiveFailuresCount}/2 (deposit AND serviceability) - reduced threshold`
        );
        console.log(
          `   ├─ Years Since Last: ${yearsSinceLastConsolidation}/${minConsolidationGap} - increased gap requirement`
        );
        console.log(
          `   ├─ Total Used: ${totalConsolidationsSoFar}/${maxConsolidations} - reduced max consolidations`
        );
        console.log(
          `   ├─ Eligible: ${consolidationEligible ? 'YES' : 'NO'}`
        );
        console.log(
          `   └─ Trigger: ${shouldConsolidateDebug ? 'YES (all conditions met)' : 'NO'}`
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
        // Reset failure count on success
        localConsolidationState.consecutiveDebtTestFailures = 0;
        return { canAfford: true };
      }
      
       // UPDATED CONSOLIDATION LOGIC - trigger after 2 consecutive failures (serviceability OR borrowing capacity)
       if (!canAffordServiceability || !canAffordBorrowingCapacity) {
         localConsolidationState.consecutiveDebtTestFailures++;
       } else {
         localConsolidationState.consecutiveDebtTestFailures = 0; // Reset when both pass
       }
       
       // Hardcoded consolidation limits
       const maxConsolidations = 3;
       const minConsolidationGap = 5; // years
       
       // Enhanced consolidation logic: check eligibility and caps
       const yearsSinceLastConsolidation = currentYear - profile.lastConsolidationYear;
       const totalConsolidationsSoFar = 3 - profile.consolidationsRemaining; // Calculate from remaining
       const consolidationEligible = yearsSinceLastConsolidation >= minConsolidationGap && totalConsolidationsSoFar < maxConsolidations;
       const shouldConsolidate = localConsolidationState.consecutiveDebtTestFailures >= 2 && consolidationEligible;
      
      if (shouldConsolidate && previousPurchases.length > 0) {
        
        const consolidationResult = executeConsolidation(currentYear, previousPurchases, localConsolidationState);
        
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
          
          const equityFreed = consolidationResult.equityFreed;

          // === DYNAMIC CONSOLIDATION EXECUTION ===
          const newLVR = portfolioValue > 0 ? (newDebt / portfolioValue * 100) : 0;
          const propertiesSoldCount = consolidationResult.propertiesSold;
          const debtReduced = consolidationResult.debtReduced;
          
           console.log(
             `🔄 Consolidation Executed (${localConsolidationState.consecutiveDebtTestFailures} consecutive dual failures):`
           );
          console.log(
            `   ├─ Properties Sold: ${propertiesSoldCount} (${JSON.stringify(propertiesSoldList)})`
          );
          console.log(
            `   ├─ Equity Freed: £${equityFreed.toLocaleString()}`
          );
          console.log(
            `   ├─ Debt Reduced: £${debtReduced.toLocaleString()}`
          );
          console.log(
            `   ├─ New Portfolio LVR: ${newLVR.toFixed(1)}% (target: ≤80%)`
          );
           console.log(
             `   └─ Static Borrowing Capacity: £${profile.borrowingCapacity.toLocaleString()}`
           );
          
           console.log(
             `🎯 Updated Consolidation: "Trigger after 2 consecutive dual failures (deposit AND serviceability)"`
           );
          console.log(
            `   └─ Consecutive Failures Reset: 0 (was ${localConsolidationState.consecutiveDebtTestFailures})`
          );
        }
        
        // Recheck affordability with freed equity and reduced debt
        const newAvailableFunds = calculateAvailableFunds(currentYear, consolidationResult.updatedPurchases, consolidationResult.equityFreed);
        const recheck = checkAffordability(property, newAvailableFunds.total, consolidationResult.updatedPurchases, currentYear, consolidationResult.equityFreed, localConsolidationState);
        
        return { 
          canAfford: recheck.canAfford, 
          consolidationTriggered: true, 
          consolidationDetails: consolidationResult 
        };
      }
      
      return { canAfford: false };
    };

  const calculateTimelineProperties = useMemo((): TimelineProperty[] => {
    const startTime = performance.now();
    console.log('[PERF] Starting calculateTimelineProperties');
    
    // Track consolidation state - simplified to only consecutive failures
    let consolidationState = {
      consecutiveDebtTestFailures: 0 // Count consecutive serviceability failures
    };

    const determineNextPurchaseYear = (
      property: any,
      previousPurchases: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number; title: string }>
    ): { year: number; consolidation?: any; updatedPurchases?: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number; title: string }> } => {
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
        const affordabilityResult = checkAffordability(property, availableFunds.total, currentPurchases, year, 0, consolidationState);
        
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
      
      // Capacity-based serviceability test (restored from previous logic)
      const serviceabilityFactor = 0.10;
      const maxAnnualInterest = profile.borrowingCapacity * serviceabilityFactor;
      const serviceabilityTestSurplus = maxAnnualInterest - loanInterest;
      const serviceabilityTestPass = serviceabilityTestSurplus >= 0;
      
      // Calculate available funds breakdown - USE CALCULATED VALUES
      const fundsBreakdownFinal = calculateAvailableFunds(purchaseYear, purchaseHistory);
      const annualSavings = profile.annualSavings;
      const cumulativeSavings = fundsBreakdownFinal.cumulativeSavings;
      const baseDeposit = fundsBreakdownFinal.baseDeposit; // Rolling amount based on deposits used
      
      // Calculate equity release (continuous, 80% release rate)
      let equityRelease = 0;
      
      purchaseHistory.forEach(purchase => {
        if (purchase.year <= purchaseYear) {
          const yearsOwned = purchaseYear - purchase.year;
          const currentValue = calculatePropertyGrowth(purchase.cost, yearsOwned);
          const usableEquity = Math.max(0, (currentValue * 0.8 - purchase.loanAmount) * 0.8);
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
        status: result.year === Infinity ? 'challenging' : (result.consolidation ? 'consolidation' : 'feasible'),
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
    
    // Sort by affordable year for display
    const sortedProperties = timelineProperties.sort((a, b) => a.affordableYear - b.affordableYear);
    
    const endTime = performance.now();
    console.log(`[PERF] calculateTimelineProperties completed in ${(endTime - startTime).toFixed(2)}ms`);
    console.log(`[PERF] Processed ${allPropertiesToPurchase.length} properties, generated ${sortedProperties.length} timeline entries`);
    
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
    
    // Serviceability test
    const serviceabilityFactor = 0.10;
    const maxAnnualInterest = profile.borrowingCapacity * serviceabilityFactor;
    
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
    
    const serviceabilityTestSurplus = maxAnnualInterest - totalAnnualLoanInterest;
    const serviceabilityTestPass = serviceabilityTestSurplus >= 0;
    
    return {
      canAfford: affordabilityResult.canAfford,
      depositTestSurplus,
      depositTestPass,
      serviceabilityTestSurplus,
      serviceabilityTestPass,
      availableFunds: availableFunds.total,
      consolidationTriggered: affordabilityResult.consolidationTriggered,
      consolidationDetails: affordabilityResult.consolidationDetails
    };
  }, [profile, globalFactors, calculatedValues, getPropertyData]);

  // Only expose the memoized result
  return {
    timelineProperties: calculateTimelineProperties,
    isCalculating: false, // Could add state tracking if needed
    calculateAffordabilityForProperty: calculateAffordabilityForYear
  };
};