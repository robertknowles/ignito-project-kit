import React, { useMemo } from 'react';
import { useAffordabilityCalculator } from '@/hooks/useAffordabilityCalculator';
import { useInvestmentProfile } from '@/hooks/useInvestmentProfile';
import { useDataAssumptions } from '@/contexts/DataAssumptionsContext';
import { usePropertySelection } from '@/contexts/PropertySelectionContext';
import { AffordabilityBreakdownTable } from './AffordabilityBreakdownTable';
import type { YearBreakdownData } from '@/types/property';

export const DecisionEngineView: React.FC = () => {
  console.log('DecisionEngineView: Component starting to render');
  
  const { timelineProperties, calculateAffordabilityForProperty } = useAffordabilityCalculator();
  console.log('DecisionEngineView: useAffordabilityCalculator loaded');
  
  const { profile } = useInvestmentProfile();
  console.log('DecisionEngineView: useInvestmentProfile loaded');
  
  const { globalFactors } = useDataAssumptions();
  console.log('DecisionEngineView: useDataAssumptions loaded');
  
  const { selections, propertyTypes } = usePropertySelection();
  console.log('DecisionEngineView: usePropertySelection loaded');

  // Debug logging
  console.log('DecisionEngineView: All hooks loaded successfully');
  console.log('timelineProperties:', timelineProperties);
  console.log('profile:', profile);
  console.log('globalFactors:', globalFactors);
  console.log('selections:', selections);
  console.log('propertyTypes:', propertyTypes);

  // Generate ALL years (2025-2050) by interpolating between purchase events
  const yearBreakdownData = useMemo((): YearBreakdownData[] => {
    console.log('DecisionEngineView: Starting yearBreakdownData calculation');
    console.log('DecisionEngineView: profile.timelineYears:', profile.timelineYears);
    console.log('DecisionEngineView: globalFactors:', globalFactors);
    
    const baseYear = 2025;
    const endYear = baseYear + profile.timelineYears - 1; // e.g., 2025 + 15 - 1 = 2039
    const interestRate = parseFloat(globalFactors.interestRate) / 100;
    const growthRate = parseFloat(globalFactors.growthRate) / 100;
    
    console.log('DecisionEngineView: Calculated values - baseYear:', baseYear, 'endYear:', endYear, 'interestRate:', interestRate, 'growthRate:', growthRate);
    
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
          
          // Cash engine (from calculator)
          availableDeposit: property.availableFundsUsed,
          annualCashFlow: property.netCashflow,
          
          // Available funds breakdown (from calculator)
          baseDeposit: property.baseDeposit,
          cumulativeSavings: property.cumulativeSavings,
          cashflowReinvestment: property.cashflowReinvestment,
          equityRelease: property.equityRelease,
          
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
          
          serviceabilityTest: {
            pass: property.serviceabilityTestPass,
            surplus: property.serviceabilityTestSurplus,
            available: profile.borrowingCapacity,
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
          
          // Breakdown details
          purchases: [{
            propertyId: property.id,
            propertyType: property.title,
            cost: property.cost,
            deposit: property.depositRequired,
            loanAmount: property.loanAmount,
            year,
          }],
        };

        years.push(yearData);
      } else {
        // This is a non-purchase year - interpolate portfolio state with real affordability tests
        const yearData = interpolateYearData(year, yearIndex, timelineProperties, profile, globalFactors, interestRate, growthRate, selections, propertyTypes, calculateAffordabilityForProperty);
        years.push(yearData);
      }
    }

    return years;
  }, [timelineProperties, profile, globalFactors, selections, propertyTypes]);

  // Debug: Check if we have data
  console.log('yearBreakdownData length:', yearBreakdownData.length);
  console.log('yearBreakdownData sample:', yearBreakdownData.slice(0, 2));

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
  
  // Interpolate portfolio growth
  const portfolioValue = lastPurchase.portfolioValueAfter * Math.pow(1 + growthRate, yearsSinceLastPurchase);
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
      const propertyValue = purchase.cost * Math.pow(1 + growthRate, yearsOwned);
      const yieldRate = 0.05; // Assume 5% yield
      const rentalIncome = propertyValue * yieldRate;
      const propertyLoanInterest = purchase.loanAmount * interestRate;
      const propertyExpenses = rentalIncome * 0.30;
      
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
    
    // Cash engine (interpolated)
    availableDeposit,
    annualCashFlow: netCashflow,
    
    // Available funds breakdown (interpolated)
    baseDeposit: profile.depositPool,
    cumulativeSavings,
    cashflowReinvestment: Math.max(0, netCashflow),
    equityRelease: 0, // No equity release in non-purchase years
    
    // Cashflow components (interpolated)
    grossRental,
    loanRepayments: loanInterest,
    expenses,
    
    // Requirements (from affordability tests)
    requiredDeposit,
    requiredLoan,
    propertyCost,
    
    // Capacity
    availableBorrowingCapacity: profile.borrowingCapacity - totalDebt,
    borrowingCapacity: profile.borrowingCapacity,
    
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
    
    serviceabilityTest: {
      pass: serviceabilityTestPass,
      surplus: serviceabilityTestSurplus,
      available: profile.borrowingCapacity,
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
  return {
    year,
    displayYear: yearIndex,
    status: 'initial',
    propertyNumber: null,
    propertyType: null,
    
    // Portfolio metrics (initial state)
    portfolioValue: profile.portfolioValue,
    totalEquity: profile.portfolioValue - profile.currentDebt,
    totalDebt: profile.currentDebt,
    
    // Cash engine (initial state)
    availableDeposit: profile.depositPool,
    annualCashFlow: 0,
    
    // Available funds breakdown (initial state)
    baseDeposit: profile.depositPool,
    cumulativeSavings: 0,
    cashflowReinvestment: 0,
    equityRelease: 0,
    
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
    lvr: profile.portfolioValue > 0 ? (profile.currentDebt / profile.portfolioValue) * 100 : 0,
    
    // Breakdown details
    purchases: [],
  };
}
