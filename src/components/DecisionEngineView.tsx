import React, { useMemo } from 'react';
import { useAffordabilityCalculator } from '@/hooks/useAffordabilityCalculator';
import { useInvestmentProfile } from '@/hooks/useInvestmentProfile';
import { useDataAssumptions } from '@/contexts/DataAssumptionsContext';
import { usePropertySelection } from '@/contexts/PropertySelectionContext';
import { AffordabilityBreakdownTable } from './AffordabilityBreakdownTable';
import type { YearBreakdownData } from '@/types/property';

// Tiered growth function: 10% for years 1-2, 6% for years 3+
const calculatePropertyGrowth = (initialValue: number, years: number): number => {
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

export const DecisionEngineView: React.FC = () => {
  const { timelineProperties, calculateAffordabilityForProperty } = useAffordabilityCalculator();
  const { profile } = useInvestmentProfile();
  const { globalFactors } = useDataAssumptions();
  const { selections, propertyTypes } = usePropertySelection();

  // Generate ALL years (2025-2050) by interpolating between purchase events
  const yearBreakdownData = useMemo((): YearBreakdownData[] => {
    const baseYear = 2025;
    const endYear = baseYear + profile.timelineYears - 1; // e.g., 2025 + 15 - 1 = 2039
    const interestRate = parseFloat(globalFactors.interestRate) / 100;
    const growthRate = parseFloat(globalFactors.growthRate) / 100;
    
    // Create a map of years to properties for quick lookup
    const propertyByYear = new Map<number, typeof timelineProperties[0]>();
    timelineProperties.forEach(prop => {
      propertyByYear.set(prop.affordableYear, prop);
    });

    // Generate ALL years from 2025 to endYear
    const years: YearBreakdownData[] = [];
    
    for (let year = baseYear; year <= endYear; year++) {
      const yearIndex = year - baseYear;
      const property = propertyByYear.get(year);
      
      if (property) {
        // This is a purchase/consolidation year - use calculator data directly
        const propertyIndex = property.propertyIndex + 1;
        
        const lvr = property.portfolioValueAfter > 0 
          ? (property.totalDebtAfter / property.portfolioValueAfter) * 100 
          : 0;
        const dsr = property.grossRentalIncome > 0 
          ? (property.loanInterest / property.grossRentalIncome) * 100 
          : 0;

        // Calculate new fields for pure presentation
        const extractableEquity = Math.max(0, (property.portfolioValueAfter * 0.80) - property.totalDebtAfter);
        const existingDebt = property.totalDebtAfter - property.loanAmount;
        const newDebt = property.loanAmount;
        const existingLoanInterest = existingDebt * interestRate;
        const newLoanInterest = newDebt * interestRate;
        const annualSavingsRate = profile.annualSavings;
        const totalAnnualCapacity = annualSavingsRate + property.cashflowReinvestment;
        
        // Calculate enhanced serviceability values
        const baseServiceabilityCapacity = profile.borrowingCapacity * 0.10;
        const rentalServiceabilityContribution = property.grossRentalIncome * 0.70;
        
        // Build all portfolio properties array
        const allPortfolioProperties = timelineProperties
          .filter(p => p.affordableYear <= year)
          .map(p => {
            const yearsOwned = year - p.affordableYear;
            // Use tiered growth (10% years 1-2, 6% years 3+)
            const currentValue = calculatePropertyGrowth(p.cost, yearsOwned);
            const equity = currentValue - p.loanAmount;
            const extractable = Math.max(0, (currentValue * 0.80) - p.loanAmount);
            
            return {
              propertyId: p.id,
              propertyType: p.title,
              purchaseYear: p.affordableYear,
              originalCost: p.cost,
              currentValue,
              loanAmount: p.loanAmount,
              equity,
              extractableEquity: extractable,
            };
          });

        const yearData: YearBreakdownData = {
          year,
          displayYear: yearIndex,
          status: property.isConsolidationPhase ? 'consolidated' : 'purchased',
          propertyNumber: propertyIndex,
          propertyType: property.title,
          
          // Portfolio metrics (from calculator)
          portfolioValue: property.portfolioValueAfter,
          totalEquity: property.totalEquityAfter,
          totalDebt: property.totalDebtAfter,
          extractableEquity,
          
          // Cash engine (from calculator)
          availableDeposit: property.availableFundsUsed,
          annualCashFlow: property.netCashflow,
          
          // Available funds breakdown (from calculator)
          baseDeposit: property.baseDeposit,
          cumulativeSavings: property.cumulativeSavings,
          cashflowReinvestment: property.cashflowReinvestment,
          equityRelease: property.equityRelease,
          annualSavingsRate,
          totalAnnualCapacity,
          
          // Cashflow components (from calculator)
          grossRental: property.grossRentalIncome,
          loanRepayments: property.loanInterest,
          expenses: property.expenses,
          
          // Requirements
          requiredDeposit: property.depositRequired,
          requiredLoan: property.loanAmount,
          propertyCost: property.cost,
          
          // Capacity (from calculator)
          availableBorrowingCapacity: property.borrowingCapacityRemaining,
          borrowingCapacity: profile.borrowingCapacity,
          
          // Debt breakdown
          existingDebt,
          newDebt,
          existingLoanInterest,
          newLoanInterest,
          
          // Enhanced serviceability breakdown
          baseServiceabilityCapacity,
          rentalServiceabilityContribution,
          
          // Assumptions (from calculator)
          interestRate: interestRate * 100,
          rentalRecognition: property.rentalRecognitionRate * 100,
          
          // Tests (from calculator)
          depositTest: {
            pass: property.depositTestPass,
            surplus: property.depositTestSurplus,
            available: property.availableFundsUsed,
            required: property.depositRequired,
          },
          
          borrowingCapacityTest: {
            pass: property.totalDebtAfter <= profile.borrowingCapacity,
            surplus: profile.borrowingCapacity - property.totalDebtAfter,
            available: profile.borrowingCapacity,
            required: property.totalDebtAfter,
          },
          
          serviceabilityTest: {
            pass: property.serviceabilityTestPass,
            surplus: property.serviceabilityTestSurplus,
            available: baseServiceabilityCapacity + rentalServiceabilityContribution,
            required: property.loanAmount,
          },
          
          // Flags (from calculator)
          gapRule: property.isGapRuleBlocked,
          equityReleaseYear: property.equityRelease > 0,
          
          // Consolidation
          consolidation: property.consolidationDetails ? {
            triggered: true,
            eligible: true,
            consecutiveFailures: 0,
            propertiesSold: property.consolidationDetails.propertiesSold,
            equityFreed: property.consolidationDetails.equityFreed,
            debtReduced: property.consolidationDetails.debtReduced,
            newLvr: lvr,
          } : undefined,
          
          // Strategy metrics
          portfolioScaling: propertyIndex,
          selfFundingEfficiency: property.cost > 0 ? (property.netCashflow / property.cost) * 100 : 0,
          equityRecyclingImpact: property.portfolioValueAfter > 0 ? (property.totalEquityAfter / property.portfolioValueAfter) * 100 : 0,
          dsr,
          lvr,
          
          // Breakdown details - Enhanced with equity calculations
          purchases: [{
            propertyId: property.id,
            propertyType: property.title,
            cost: property.cost,
            deposit: property.depositRequired,
            loanAmount: property.loanAmount,
            year,
            currentValue: property.cost,
            equity: property.cost - property.loanAmount,
            extractableEquity: Math.max(0, (property.cost * 0.80) - property.loanAmount),
          }],
          
          // All portfolio properties
          allPortfolioProperties,
        };

        years.push(yearData);
      } else {
        // This is a non-purchase year - interpolate portfolio state with real affordability tests
        const yearData = interpolateYearData(year, yearIndex, timelineProperties, profile, globalFactors, interestRate, growthRate, selections, propertyTypes, calculateAffordabilityForProperty);
        years.push(yearData);
      }
    }

    return years;
  }, [timelineProperties, profile.timelineYears, globalFactors.interestRate, globalFactors.growthRate]);

  return (
    <div>
      <AffordabilityBreakdownTable 
        data={yearBreakdownData} 
        isCalculating={false}
        hasChanges={false}
      />
    </div>
  );
};

// Helper function to interpolate portfolio state for non-purchase years
function interpolateYearData(
  year: number,
  yearIndex: number,
  timelineProperties: any[],
  profile: any,
  globalFactors: any,
  interestRate: number,
  growthRate: number,
  selections: any,
  propertyTypes: any[],
  calculateAffordabilityForProperty: any
): YearBreakdownData {
  // Find the most recent purchase before this year
  const previousPurchases = timelineProperties
    .filter(prop => prop.affordableYear < year)
    .sort((a, b) => b.affordableYear - a.affordableYear);
  
  const lastPurchase = previousPurchases[0];
  
  if (!lastPurchase) {
    // No previous purchases - return initial state
    return createInitialYearData(year, yearIndex, profile, interestRate);
  }
  
  // Calculate years since last purchase
  const yearsSinceLastPurchase = year - lastPurchase.affordableYear;
  
  // Interpolate portfolio growth with tiered rates (10% years 1-2, 6% years 3+)
  const portfolioValue = calculatePropertyGrowth(lastPurchase.portfolioValueAfter, yearsSinceLastPurchase);
  const totalDebt = lastPurchase.totalDebtAfter; // Debt stays constant (interest-only loans)
  const totalEquity = portfolioValue - totalDebt;
  
  // Calculate cumulative savings growth
  const cumulativeSavings = profile.annualSavings * (year - 2025);
  
  // Calculate cashflow from existing properties
  let grossRental = 0;
  let loanInterest = 0;
  let expenses = 0;
  
  previousPurchases.forEach(purchase => {
    const yearsOwned = year - purchase.affordableYear;
    if (yearsOwned > 0) {
      // Use tiered growth (10% years 1-2, 6% years 3+)
      const propertyValue = calculatePropertyGrowth(purchase.cost, yearsOwned);
      const yieldRate = 0.05; // Assume 5% yield
      const rentalIncome = propertyValue * yieldRate;
      const propertyLoanInterest = purchase.loanAmount * interestRate;
      const propertyExpenses = rentalIncome * 0.30 * Math.pow(1.03, yearsOwned);
      
      grossRental += rentalIncome;
      loanInterest += propertyLoanInterest;
      expenses += propertyExpenses;
    }
  });
  
  const netCashflow = grossRental - loanInterest - expenses;
  const availableDeposit = profile.depositPool + cumulativeSavings + Math.max(0, netCashflow);
  
  // Calculate LVR and DSR
  const lvr = portfolioValue > 0 ? (totalDebt / portfolioValue) * 100 : 0;
  const dsr = grossRental > 0 ? (loanInterest / grossRental) * 100 : 0;
  
  // Run affordability tests for the next property that should be purchased
  let depositTestSurplus = 0;
  let depositTestPass = true;
  let serviceabilityTestSurplus = 0;
  let serviceabilityTestPass = true;
  let requiredDeposit = 0;
  let requiredLoan = 0;
  let propertyCost = 0;
  let status: 'initial' | 'purchased' | 'blocked' | 'waiting' | 'consolidated' = 'waiting';
  
  if (year === 2025) {
    status = 'initial';
  } else {
    // Find the next property that should be purchased
    const nextProperty = findNextPropertyToPurchase(selections, propertyTypes, timelineProperties, year);
    
    if (nextProperty) {
      // Convert timelineProperties to purchase history format
      const purchaseHistory = timelineProperties
        .filter(prop => prop.affordableYear < year)
        .map(prop => ({
          year: prop.affordableYear - 2025 + 1, // Convert to relative year
          cost: prop.cost,
          depositRequired: prop.depositRequired,
          loanAmount: prop.loanAmount,
          title: prop.title
        }));
      
      // Run affordability tests
      const affordabilityResult = calculateAffordabilityForProperty(year - 2025 + 1, nextProperty, purchaseHistory);
      
      depositTestSurplus = affordabilityResult.depositTestSurplus;
      depositTestPass = affordabilityResult.depositTestPass;
      serviceabilityTestSurplus = affordabilityResult.serviceabilityTestSurplus;
      serviceabilityTestPass = affordabilityResult.serviceabilityTestPass;
      requiredDeposit = nextProperty.depositRequired;
      requiredLoan = nextProperty.cost - nextProperty.depositRequired;
      propertyCost = nextProperty.cost;
      
      // Determine status based on test results
      if (!depositTestPass || !serviceabilityTestPass) {
        status = 'blocked';
      } else {
        status = 'waiting';
      }
    }
  }
  
  // Calculate new fields for pure presentation
  const extractableEquity = Math.max(0, (portfolioValue * 0.80) - totalDebt);
  const existingDebt = totalDebt;
  const newDebt = requiredLoan;
  const existingLoanInterest = existingDebt * interestRate;
  const newLoanInterest = newDebt * interestRate;
  const annualSavingsRate = profile.annualSavings;
  const totalAnnualCapacity = annualSavingsRate + Math.max(0, netCashflow);
  
  // Calculate base deposit remaining (after previous purchases)
  const totalDepositsUsed = timelineProperties
    .filter(p => p.affordableYear < year)
    .reduce((sum, p) => sum + p.depositRequired, 0);
  const baseDepositRemaining = Math.max(0, profile.depositPool - totalDepositsUsed);
  
  // Build all portfolio properties array
  const allPortfolioProperties = timelineProperties
    .filter(p => p.affordableYear < year)
    .map(p => {
      const yearsOwned = year - p.affordableYear;
      // Use tiered growth (10% years 1-2, 6% years 3+)
      const currentValue = calculatePropertyGrowth(p.cost, yearsOwned);
      const equity = currentValue - p.loanAmount;
      const extractable = Math.max(0, (currentValue * 0.80) - p.loanAmount);
      
      return {
        propertyId: p.id,
        propertyType: p.title,
        purchaseYear: p.affordableYear,
        originalCost: p.cost,
        currentValue,
        loanAmount: p.loanAmount,
        equity,
        extractableEquity: extractable,
      };
    });

  return {
    year,
    displayYear: yearIndex,
    status,
    propertyNumber: null,
    propertyType: null,
    
    // Portfolio metrics (interpolated)
    portfolioValue,
    totalEquity,
    totalDebt,
    extractableEquity,
    
    // Cash engine (interpolated)
    availableDeposit,
    annualCashFlow: netCashflow,
    
    // Available funds breakdown (interpolated)
    baseDeposit: baseDepositRemaining, // Rolling amount based on deposits used
    cumulativeSavings,
    cashflowReinvestment: Math.max(0, netCashflow),
    equityRelease: 0, // No equity release in non-purchase years
    annualSavingsRate,
    totalAnnualCapacity,
    
    // Cashflow components (interpolated)
    grossRental,
    loanRepayments: loanInterest,
    expenses,
    
    // Requirements (from affordability tests)
    requiredDeposit,
    requiredLoan,
    propertyCost,
    
    // Capacity
    availableBorrowingCapacity: Math.max(0, profile.borrowingCapacity - totalDebt),
    borrowingCapacity: profile.borrowingCapacity,
    
    // Debt breakdown
    existingDebt,
    newDebt,
    existingLoanInterest,
    newLoanInterest,
    
    // Enhanced serviceability breakdown
    baseServiceabilityCapacity: profile.borrowingCapacity * 0.10,
    rentalServiceabilityContribution: grossRental * 0.70,
    
    // Assumptions
    interestRate: interestRate * 100,
    rentalRecognition: 75, // Default recognition rate
    
    // Tests (from real affordability calculations)
    depositTest: {
      pass: depositTestPass,
      surplus: depositTestSurplus,
      available: availableDeposit,
      required: requiredDeposit,
    },
    
    borrowingCapacityTest: {
      pass: totalDebt <= profile.borrowingCapacity,
      surplus: profile.borrowingCapacity - totalDebt,
      available: profile.borrowingCapacity,
      required: totalDebt,
    },
    
    serviceabilityTest: {
      pass: serviceabilityTestPass,
      surplus: serviceabilityTestSurplus,
      available: profile.borrowingCapacity * 0.10 + grossRental * 0.70,
      required: requiredLoan,
    },
    
    // Flags
    gapRule: false,
    equityReleaseYear: false,
    
    // Consolidation (not applicable)
    consolidation: undefined,
    
    // Strategy metrics
    portfolioScaling: previousPurchases.length,
    selfFundingEfficiency: 0,
    equityRecyclingImpact: 0,
    dsr,
    lvr,
    
    // Breakdown details
    purchases: [],
    
    // All portfolio properties
    allPortfolioProperties,
  };
}

// Helper function to find the next property that should be purchased
function findNextPropertyToPurchase(
  selections: any,
  propertyTypes: any[],
  timelineProperties: any[],
  currentYear: number
): any | null {
  // Get all properties that should be purchased
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

  // Find the first property that hasn't been purchased yet
  for (const { property, index } of allPropertiesToPurchase) {
    const propertyId = `${property.id}_${index}`;
    const existingProperty = timelineProperties.find(prop => prop.id === propertyId);
    
    if (!existingProperty || existingProperty.affordableYear > currentYear) {
      return property;
    }
  }
  
  return null;
}

// Helper function to create initial year data
function createInitialYearData(year: number, yearIndex: number, profile: any, interestRate: number): YearBreakdownData {
  const portfolioValue = profile.portfolioValue;
  const totalDebt = profile.currentDebt;
  const extractableEquity = Math.max(0, (portfolioValue * 0.80) - totalDebt);
  const annualSavingsRate = profile.annualSavings;
  
  return {
    year,
    displayYear: yearIndex,
    status: 'initial',
    propertyNumber: null,
    propertyType: null,
    
    // Portfolio metrics (initial state)
    portfolioValue,
    totalEquity: portfolioValue - totalDebt,
    totalDebt,
    extractableEquity,
    
    // Cash engine (initial state)
    availableDeposit: profile.depositPool,
    annualCashFlow: 0,
    
    // Available funds breakdown (initial state)
    baseDeposit: profile.depositPool,
    cumulativeSavings: 0,
    cashflowReinvestment: 0,
    equityRelease: 0,
    annualSavingsRate,
    totalAnnualCapacity: annualSavingsRate,
    
    // Cashflow components (initial state)
    grossRental: 0,
    loanRepayments: 0,
    expenses: 0,
    
    // Requirements (not applicable)
    requiredDeposit: 0,
    requiredLoan: 0,
    propertyCost: 0,
    
    // Capacity
    availableBorrowingCapacity: profile.borrowingCapacity,
    borrowingCapacity: profile.borrowingCapacity,
    
    // Debt breakdown
    existingDebt: totalDebt,
    newDebt: 0,
    existingLoanInterest: totalDebt * interestRate,
    newLoanInterest: 0,
    
    // Enhanced serviceability breakdown
    baseServiceabilityCapacity: profile.borrowingCapacity * 0.10,
    rentalServiceabilityContribution: 0,
    
    // Assumptions
    interestRate: interestRate * 100,
    rentalRecognition: 75,
    
    // Tests (not applicable)
    depositTest: {
      pass: true,
      surplus: 0,
      available: profile.depositPool,
      required: 0,
    },
    
    borrowingCapacityTest: {
      pass: true,
      surplus: profile.borrowingCapacity - totalDebt,
      available: profile.borrowingCapacity,
      required: totalDebt,
    },
    
    serviceabilityTest: {
      pass: true,
      surplus: 0,
      available: profile.borrowingCapacity,
      required: 0,
    },
    
    // Flags
    gapRule: false,
    equityReleaseYear: false,
    
    // Consolidation (not applicable)
    consolidation: undefined,
    
    // Strategy metrics
    portfolioScaling: 0,
    selfFundingEfficiency: 0,
    equityRecyclingImpact: 0,
    dsr: 0,
    lvr: portfolioValue > 0 ? (totalDebt / portfolioValue) * 100 : 0,
    
    // Breakdown details
    purchases: [],
    
    // All portfolio properties (empty initially)
    allPortfolioProperties: [],
  };
}
