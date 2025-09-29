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

  // Simplified consolidation - only trigger on consecutive failures

  // Debug flag - set to true to enable detailed debugging
  const DEBUG_MODE = true;

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
          const propertyData = getPropertyData(purchase.title);
          if (propertyData) {
            const propertyGrowthRate = parseFloat(propertyData.growth) / 100;
            const currentValue = purchase.cost * Math.pow(1 + propertyGrowthRate, yearsOwned);
            const yieldRate = parseFloat(propertyData.yield) / 100;
            const annualRent = currentValue * yieldRate;
            totalRentalIncome += annualRent;
          }
        }
      });
      
      // Calculate total usable equity for enhanced borrowing capacity - 3-year cycle
      let totalUsableEquity = 0;
      
      if (currentYear % 3 === 0) {
        // Only release equity every 3 years
        // Existing portfolio equity (with equity release factor)
        if (profile.portfolioValue > 0) {
          const grownPortfolioValue = calculatePropertyGrowth(profile.portfolioValue, currentYear - 1);
          totalUsableEquity += Math.max(0, (grownPortfolioValue * 0.8 - profile.currentDebt) * profile.equityReleaseFactor);
        }
        
        // Equity from previous purchases (with equity release factor)
        previousPurchases.forEach(purchase => {
          if (purchase.year <= currentYear) {
            const yearsOwned = currentYear - purchase.year;
            const currentValue = calculatePropertyGrowth(purchase.cost, yearsOwned);
            const usableEquity = Math.max(0, (currentValue * 0.8 - purchase.loanAmount) * profile.equityReleaseFactor);
            totalUsableEquity += usableEquity;
          }
        });
      }
      
      // Enhanced capacity formula: scales naturally with rental income growth (tempered by rent factor)
      const rentalCapacityBoost = totalRentalIncome * profile.serviceabilityRatio * profile.rentFactor;
      const equityCapacityBoost = totalUsableEquity * profile.equityFactor;
      const adjustedCapacity = baseCapacity + rentalCapacityBoost + equityCapacityBoost;
      
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
      
      // Use dynamic borrowing capacity
      const baseCapacity = profile.borrowingCapacity;
      const dynamicCapacity = calculateDynamicBorrowingCapacity(currentYear, previousPurchases);
      const rentalUplift = dynamicCapacity - baseCapacity;
      const newLoanAmount = property.cost - property.depositRequired;
      const totalDebtAfterPurchase = totalExistingDebt + newLoanAmount;
      
      // NEW SERVICEABILITY-BASED DEBT TEST
      // Calculate annual loan repayments for all properties
      let totalAnnualLoanRepayments = 0;
      const interestRate = parseFloat(globalFactors.interestRate) / 100;
      
      // Existing debt repayments
      if (profile.currentDebt > 0) {
        totalAnnualLoanRepayments += profile.currentDebt * interestRate;
      }
      
      // Previous purchases loan repayments
      previousPurchases.forEach(purchase => {
        if (purchase.year <= currentYear) {
          totalAnnualLoanRepayments += purchase.loanAmount * interestRate;
        }
      });
      
      // Add new property loan repayment
      const newPropertyLoanRepayment = newLoanAmount * interestRate;
      totalAnnualLoanRepayments += newPropertyLoanRepayment;
      
      // Simple serviceability test using borrowing capacity  
      const maxAnnualRepayments = profile.borrowingCapacity * interestRate;
      
      // SERVICEABILITY TEST: Annual Repayments <= Borrowing Capacity × Interest Rate
      const canAffordDeposit = (availableFunds - profile.depositBuffer) >= property.depositRequired;
      const canAffordServiceability = totalAnnualLoanRepayments <= maxAnnualRepayments;
      
      // Debug trace output
      if (DEBUG_MODE) {
        const timelineYear = currentYear + 2025 - 1;
        const depositPool = availableFunds;
        const equityFreed = 0; // Initialize to 0, will be updated if consolidation occurs
        const rentalIncome = grossRentalIncome;
        const adjustedCapacity = dynamicCapacity;
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
          `   ├─ Loan Repayments: -£${loanRepayments.toLocaleString()}`
        );
        console.log(
          `   └─ Expenses: -£${expenses.toLocaleString()}`
        );

        // === SERVICEABILITY TEST ===
        const annualLoanRepayments = totalAnnualLoanRepayments;
        const maxAnnualCapacity = maxAnnualRepayments;
        
        console.log(
          `📊 Serviceability Test: ${serviceabilityPass ? "PASS" : "FAIL"} (via ${serviceabilityMethod})`
        );
        console.log(
          `   ├─ Annual Loan Repayments: £${annualLoanRepayments.toLocaleString()}`
        );
        console.log(
          `   ├─ Max Annual Capacity: £${maxAnnualCapacity.toLocaleString()} (£${profile.borrowingCapacity.toLocaleString()} × ${(interestRate * 100).toFixed(1)}%)`
        );
        console.log(
          `   └─ Deposit Test: £${availableFunds.toLocaleString()} - £${profile.depositBuffer.toLocaleString()} buffer ≥ £${property.depositRequired.toLocaleString()} required`
        );
        
        // === DYNAMIC BORROWING CAPACITY (for equity boost only) ===
        const equityBoost = totalUsableEquity * profile.equityFactor;
        const rentalUpliftDetailed = grossRentalIncome * profile.serviceabilityRatio * profile.rentFactor;
        
        console.log(
          `📈 Enhanced Capacity: Total = £${adjustedCapacity.toLocaleString()}`
        );
        console.log(
          `   ├─ Base Capacity: £${baseCapacity.toLocaleString()}`
        );
        console.log(
          `   ├─ Tempered Rental Boost: £${rentalUplift.toLocaleString()} (${grossRentalIncome.toLocaleString()} × ${profile.serviceabilityRatio} × ${profile.rentFactor})`
        );
        console.log(
          `   └─ Equity Factor Boost: £${equityBoost.toLocaleString()}`
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
        const consecutiveFailuresCount = consolidationState.consecutiveDebtTestFailures;
        const yearsSinceLastConsolidation = currentYear - profile.lastConsolidationYear;
        const totalConsolidationsSoFar = 3 - profile.consolidationsRemaining;
        const consolidationEligible = yearsSinceLastConsolidation >= profile.minConsolidationGap && totalConsolidationsSoFar < profile.maxConsolidations;
        const shouldConsolidateDebug = consolidationState.consecutiveDebtTestFailures >= 2 && consolidationEligible;
        
        console.log(
          `🔄 Enhanced Consolidation Status:`
        );
        console.log(
          `   ├─ Consecutive Dual Failures: ${consecutiveFailuresCount}/2 (deposit AND serviceability) - reduced threshold`
        );
        console.log(
          `   ├─ Years Since Last: ${yearsSinceLastConsolidation}/${profile.minConsolidationGap} - increased gap requirement`
        );
        console.log(
          `   ├─ Total Used: ${totalConsolidationsSoFar}/${profile.maxConsolidations} - reduced max consolidations`
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
      
       // UPDATED CONSOLIDATION LOGIC - trigger after 2 consecutive dual failures (deposit AND serviceability)
       if (!canAffordDeposit && !canAffordServiceability) {
         consolidationState.consecutiveDebtTestFailures++;
       } else {
         consolidationState.consecutiveDebtTestFailures = 0; // Reset on any success
       }
       
       // Enhanced consolidation logic: check eligibility and caps
       const yearsSinceLastConsolidation = currentYear - profile.lastConsolidationYear;
       const totalConsolidationsSoFar = 3 - profile.consolidationsRemaining; // Calculate from remaining
       const consolidationEligible = yearsSinceLastConsolidation >= profile.minConsolidationGap && totalConsolidationsSoFar < profile.maxConsolidations;
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
          const newBorrowingCapacity = calculateDynamicBorrowingCapacity(currentYear, consolidationResult.updatedPurchases);
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
            `   └─ New Serviceability Capacity: £${newBorrowingCapacity.toLocaleString()}`
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