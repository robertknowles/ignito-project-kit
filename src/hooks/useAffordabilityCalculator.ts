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
  console.log('DEBUGGING: useAffordabilityCalculator function called - REBUILD FORCED');
  const { profile, calculatedValues } = useInvestmentProfile();
  const { selections, propertyTypes } = usePropertySelection();
  const { globalFactors, getPropertyData } = useDataAssumptions();

  // Simplified consolidation - only trigger on consecutive failures

  // Debug flag - set to true to enable detailed debugging
  const DEBUG_MODE = true;
  console.log('useAffordabilityCalculator loaded - no dynamic capacity');

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
              const portfolioSize = previousPurchases.filter(p => p.year < year).length + 1; // Count properties purchased before current year + this one
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
      
      // Calculate available cash: base deposit + accumulated enhanced savings + additional equity from consolidations
      let availableCash = calculatedValues.availableDeposit + (currentYear > 1 ? totalEnhancedSavings : 0) + additionalEquity;
      
      // Subtract deposits used for previous purchases
      previousPurchases.forEach(purchase => {
        if (purchase.year <= currentYear) {
          availableCash -= purchase.depositRequired;
        }
      });

      // 3-YEAR EQUITY RECYCLING CYCLE: Only release equity every 3 years
      let existingPortfolioEquity = 0;
      let totalUsableEquity = 0;
      
      if (currentYear % 3 === 0) {
        // Only in 3-year cycle years (year 3, 6, 9, etc.)
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
      // No consolidation dependency - immediate equity release simulation
      const finalFunds = availableCash + totalUsableEquity;
      return finalFunds;
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
          
          // 3-year equity cycle
          if (currentYear % 3 === 0) {
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
            
            // 3-year equity cycle
            if (currentYear % 3 === 0) {
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
      const serviceabilityFactor = 0.10; // 10% serviceability factor
      
      // Simple serviceability test using borrowing capacity  
      const maxAnnualInterest = profile.borrowingCapacity * serviceabilityFactor;
      
      // SERVICEABILITY TEST: Annual Interest <= Borrowing Capacity × 10%
      const canAffordDeposit = (availableFunds - depositBuffer) >= property.depositRequired;
      const canAffordServiceability = totalAnnualLoanInterest <= maxAnnualInterest;
      
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
          `   └─ 3-Year Equity Access: £${currentYear % 3 === 0 ? continuousEquityAccess.toLocaleString() : '0 (off-cycle year)'} (40% of usable equity)`
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
        const maxAnnualCapacity = maxAnnualInterest;
        
        console.log(
          `📊 Serviceability Test: ${serviceabilityPass ? "PASS" : "FAIL"} (via ${serviceabilityMethod})`
        );
        console.log(
          `   ├─ Annual Loan Interest: £${annualLoanInterest.toLocaleString()}`
        );
        console.log(
          `   ├─ Max Annual Capacity: £${maxAnnualCapacity.toLocaleString()} (£${profile.borrowingCapacity.toLocaleString()} × 10%)`
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

        // === ENHANCED CONSOLIDATION STATUS ===
        // Hardcoded consolidation limits
        const maxConsolidations = 3;
        const minConsolidationGap = 5; // years
        
        const consecutiveFailuresCount = consolidationState.consecutiveDebtTestFailures;
        const yearsSinceLastConsolidation = currentYear - profile.lastConsolidationYear;
        const totalConsolidationsSoFar = 3 - profile.consolidationsRemaining;
        const consolidationEligible = yearsSinceLastConsolidation >= minConsolidationGap && totalConsolidationsSoFar < maxConsolidations;
        const shouldConsolidateDebug = consolidationState.consecutiveDebtTestFailures >= 2 && consolidationEligible;
        
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
          `✅ Final Decision: DepositTest = ${depositPass ? "PASS" : "FAIL"} | ServiceabilityTest = ${serviceabilityPass ? "PASS" : "FAIL"} | Purchase = ${purchaseDecision}`
        );
      }
      
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
             `🔄 Consolidation Executed (${consolidationState.consecutiveDebtTestFailures} consecutive dual failures):`
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
            `   └─ Consecutive Failures Reset: 0 (was ${consolidationState.consecutiveDebtTestFailures})`
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
    ): { year: number; consolidation?: any; updatedPurchases?: Array<{ year: number; cost: number; depositRequired: number; loanAmount: number; title: string }> } => {
      let currentPurchases = [...previousPurchases];
      
      for (let year = 1; year <= profile.timelineYears; year++) {
        // 12-MONTH PURCHASE GAP: Enforce minimum gap between purchases
        const lastPurchaseYear = currentPurchases.length > 0 
          ? Math.max(...currentPurchases.map(p => p.year)) 
          : 0;
        
        // Skip years that don't meet the 12-month gap requirement
        if (year <= lastPurchaseYear + 1) {
          if (DEBUG_MODE) {
            console.log(`[GAP CHECK] Year ${year + 2025 - 1}: Skipped due to 12-month gap rule (last purchase: ${lastPurchaseYear + 2025 - 1})`);
          }
          continue;
        }
        
        const availableFunds = calculateAvailableFunds(year, currentPurchases);
        const affordabilityResult = checkAffordability(property, availableFunds, currentPurchases, year);
        
        if (affordabilityResult.canAfford) {
          const absoluteYear = year + 2025 - 1;
          
          // REALISTIC CASH ACCUMULATION VALIDATION
          // Ensure enough time has passed for funds to build up realistically
          const depositBuffer = 40000;
          const requiredFunds = property.depositRequired + depositBuffer;
          
          // Calculate realistic fund accumulation without equity (baseline check)
          const baseDeposit = calculatedValues.availableDeposit;
          const annualSavings = profile.annualSavings;
          const yearsSinceStart = year - 1;
          const accumulatedSavings = baseDeposit + (annualSavings * yearsSinceStart);
          
          // Calculate years needed to save this deposit from scratch
          const yearsToSave = requiredFunds > baseDeposit 
            ? Math.ceil((requiredFunds - baseDeposit) / annualSavings) 
            : 0;
          
          // If this is not the first property, check time since last purchase
          if (lastPurchaseYear > 0) {
            const yearsSinceLastPurchase = year - lastPurchaseYear;
            const minimumYearsRequired = Math.max(2, Math.min(yearsToSave, 4)); // At least 2 years, max 4 years between purchases
            
            if (yearsSinceLastPurchase < minimumYearsRequired) {
              if (DEBUG_MODE) {
                console.log(`[CASH ACCUMULATION] Year ${year + 2025 - 1}: Insufficient time to accumulate funds. Only ${yearsSinceLastPurchase} years since last purchase, need ${minimumYearsRequired} years`);
              }
              continue; // Skip this year, funds haven't accumulated enough
            }
          }
          
          // Verify deposit test surplus is meaningful (not barely passing)
          const depositTestSurplus = availableFunds - depositBuffer - property.depositRequired;
          const minimumSurplus = property.depositRequired * 0.1; // At least 10% surplus
          
          if (depositTestSurplus < minimumSurplus && !affordabilityResult.consolidationTriggered) {
            if (DEBUG_MODE) {
              console.log(`[DEPOSIT SURPLUS] Year ${year + 2025 - 1}: Insufficient deposit surplus (£${depositTestSurplus.toLocaleString()}). Need at least £${minimumSurplus.toLocaleString()}`);
            }
            continue; // Barely passing - wait for more accumulation
          }
          
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
    const gapBlockedYears = new Set<number>();
    
    // Process properties sequentially, determining purchase year for each
    allPropertiesToPurchase.forEach(({ property, index }, globalIndex) => {
      const result = determineNextPurchaseYear(property, purchaseHistory);
      
      // STOP PROCESSING if this property cannot be afforded within timeline
      if (result.year === Infinity) {
        if (DEBUG_MODE) {
          console.log(`[TIMELINE END] Property ${globalIndex + 1} (${property.title}) cannot be afforded within ${profile.timelineYears} year timeline. Stopping further property scheduling.`);
        }
        // Continue to create the entry but don't process remaining properties after this one
      }
      
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
        availableFundsUsed = calculateAvailableFunds(purchaseYear, purchaseHistory);
      }
      
      // Calculate cashflow breakdown for this property
      const purchaseYear = result.year - 2025 + 1;
      let grossRentalIncome = 0;
      let loanInterest = 0;
      let expenses = 0;
      let netCashflow = 0;
      
      // Calculate portfolio size for rental recognition
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
      
      const serviceabilityFactor = 0.10;
      const maxAnnualInterest = profile.borrowingCapacity * serviceabilityFactor;
      const serviceabilityTestSurplus = maxAnnualInterest - loanInterest;
      const serviceabilityTestPass = serviceabilityTestSurplus >= 0;
      
      // Calculate available funds breakdown
      const annualSavings = profile.annualSavings;
      const cumulativeSavings = annualSavings * (purchaseYear - 1);
      const baseDeposit = calculatedValues.availableDeposit;
      
      // Calculate equity release (3-year cycle)
      let equityRelease = 0;
      if (purchaseYear % 3 === 0) {
        purchaseHistory.forEach(purchase => {
          if (purchase.year <= purchaseYear) {
            const yearsOwned = purchaseYear - purchase.year;
            const currentValue = calculatePropertyGrowth(purchase.cost, yearsOwned);
            const usableEquity = Math.max(0, (currentValue * 0.8 - purchase.loanAmount) * profile.equityReleaseFactor);
            equityRelease += usableEquity;
          }
        });
      }
      
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
        borrowingCapacityRemaining: profile.borrowingCapacity - totalDebtAfter,
        
        // Flags and rates
        isGapRuleBlocked: false, // Will be updated when we generate all-year data
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
    
    // Now generate all-year data - fill in missing years with portfolio state
    const allYearData: TimelineProperty[] = [];
    let currentPurchaseIndex = 0;
    
    for (let year = 1; year <= profile.timelineYears; year++) {
      const absoluteYear = year + 2025 - 1;
      
      // Check if there's a purchase in this year
      const purchaseInYear = timelineProperties.find(p => p.affordableYear === absoluteYear);
      
      if (purchaseInYear) {
        // Mark gap-blocked years (next year after this purchase)
        gapBlockedYears.add(year + 1);
        allYearData.push(purchaseInYear);
        currentPurchaseIndex++;
      } else {
        // No purchase - generate portfolio state for this year
        const purchasesUpToThisYear = purchaseHistory.filter(p => p.year < year);
        
        // Calculate portfolio metrics
        let portfolioValue = profile.portfolioValue > 0 ? calculatePropertyGrowth(profile.portfolioValue, year - 1) : 0;
        let totalDebt = profile.currentDebt;
        let grossRentalIncome = 0;
        let loanInterest = 0;
        let expenses = 0;
        
        const portfolioSize = purchasesUpToThisYear.length;
        const rentalRecognitionRate = calculateRentalRecognitionRate(portfolioSize);
        
        purchasesUpToThisYear.forEach(purchase => {
          const yearsOwned = year - purchase.year;
          const currentValue = calculatePropertyGrowth(purchase.cost, yearsOwned);
          portfolioValue += currentValue;
          totalDebt += purchase.loanAmount;
          
          // Calculate cashflow
          const propertyData = getPropertyData(purchase.title);
          if (propertyData) {
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
        
        const netCashflow = grossRentalIncome - loanInterest - expenses;
        const totalEquity = portfolioValue - totalDebt;
        
        // Calculate available funds
        const availableFunds = calculateAvailableFunds(year, purchasesUpToThisYear);
        
        // Determine blocking reason
        const isGapBlocked = gapBlockedYears.has(year);
        
        // Calculate what would be needed for next property (if we know what's next)
        const nextProperty = allPropertiesToPurchase[currentPurchaseIndex]?.property;
        let depositTestPass = false;
        let serviceabilityTestPass = false;
        let depositTestSurplus = 0;
        let serviceabilityTestSurplus = 0;
        
        if (nextProperty) {
          const depositBuffer = 40000;
          depositTestSurplus = availableFunds - depositBuffer - nextProperty.depositRequired;
          depositTestPass = depositTestSurplus >= 0;
          
          const serviceabilityFactor = 0.10;
          const maxAnnualInterest = profile.borrowingCapacity * serviceabilityFactor;
          serviceabilityTestSurplus = maxAnnualInterest - loanInterest - (nextProperty.cost - nextProperty.depositRequired) * (parseFloat(globalFactors.interestRate) / 100);
          serviceabilityTestPass = serviceabilityTestSurplus >= 0;
        }
        
        // Calculate available funds breakdown
        const annualSavings = profile.annualSavings;
        const cumulativeSavings = annualSavings * (year - 1);
        const baseDeposit = calculatedValues.availableDeposit;
        
        let equityRelease = 0;
        if (year % 3 === 0) {
          purchasesUpToThisYear.forEach(purchase => {
            const yearsOwned = year - purchase.year;
            const currentValue = calculatePropertyGrowth(purchase.cost, yearsOwned);
            const usableEquity = Math.max(0, (currentValue * 0.8 - purchase.loanAmount) * profile.equityReleaseFactor);
            equityRelease += usableEquity;
          });
        }
        
        const cashflowReinvestment = Math.max(0, netCashflow);
        
        // Create non-purchase year entry
        allYearData.push({
          id: `year_${year}`,
          title: '', // No property purchased
          cost: 0,
          depositRequired: 0,
          loanAmount: 0,
          affordableYear: absoluteYear,
          status: isGapBlocked ? 'waiting' : (!depositTestPass || !serviceabilityTestPass ? 'blocked' : 'waiting'),
          propertyIndex: -1,
          portfolioValueAfter: portfolioValue,
          totalEquityAfter: totalEquity,
          totalDebtAfter: totalDebt,
          availableFundsUsed: availableFunds,
          
          // Cashflow breakdown - current portfolio
          grossRentalIncome,
          loanInterest,
          expenses,
          netCashflow,
          
          // Test details
          depositTestSurplus,
          depositTestPass,
          serviceabilityTestSurplus,
          serviceabilityTestPass,
          borrowingCapacityUsed: 0,
          borrowingCapacityRemaining: profile.borrowingCapacity - totalDebt,
          
          // Flags and rates
          isGapRuleBlocked: isGapBlocked,
          rentalRecognitionRate,
          
          // Portfolio state (same as after since no purchase)
          portfolioValueBefore: portfolioValue,
          totalEquityBefore: totalEquity,
          totalDebtBefore: totalDebt,
          
          // Available funds breakdown
          baseDeposit,
          cumulativeSavings,
          cashflowReinvestment,
          equityRelease
        });
      }
    }
    
    return allYearData;
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
    isCalculating: false, // Could add state tracking if needed
    calculateAffordabilityForProperty: () => {} // Placeholder since this is now internal
  };
};