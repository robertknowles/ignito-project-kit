import { useMemo } from 'react';
import { useInvestmentProfile } from './useInvestmentProfile';
import { useAffordabilityCalculator } from './useAffordabilityCalculator';
import type { YearBreakdownData } from '@/types/property';

// Period conversion constants
const PERIODS_PER_YEAR = 2;
const BASE_YEAR = 2025;
// Force HMR update

// Currency formatter helper
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Convert annual rate to per-period rate using compound interest formula
const annualRateToPeriodRate = (annualRate: number): number => {
  return Math.pow(1 + annualRate, 1 / PERIODS_PER_YEAR) - 1;
};

// Tiered growth function matching useAffordabilityCalculator pattern
const calculatePropertyGrowth = (
  initialValue: number, 
  periods: number, 
  growthCurve: { year1: number; years2to3: number; year4: number; year5plus: number }
): number => {
  let currentValue = initialValue;
  
  const year1Rate = annualRateToPeriodRate(growthCurve.year1 / 100);
  const years2to3Rate = annualRateToPeriodRate(growthCurve.years2to3 / 100);
  const year4Rate = annualRateToPeriodRate(growthCurve.year4 / 100);
  const year5plusRate = annualRateToPeriodRate(growthCurve.year5plus / 100);
  
  for (let period = 1; period <= periods; period++) {
    let periodRate;
    
    if (period <= 2) {
      // Year 1 (periods 1-2)
      periodRate = year1Rate;
    } else if (period <= 6) {
      // Years 2-3 (periods 3-6)
      periodRate = years2to3Rate;
    } else if (period <= 8) {
      // Year 4 (periods 7-8)
      periodRate = year4Rate;
    } else {
      // Year 5+ (period 9+)
      periodRate = year5plusRate;
    }
    
    currentValue *= (1 + periodRate);
  }
  
  return currentValue;
};

// Progressive rental recognition rates based on portfolio size
const calculateRentalRecognitionRate = (portfolioSize: number): number => {
  if (portfolioSize <= 2) return 0.75;      // Properties 1-2: 75%
  if (portfolioSize <= 4) return 0.70;      // Properties 3-4: 70%
  return 0.65;                              // Properties 5+: 65%
};

export interface YearData {
  year: number;
  depositStatus: 'pass' | 'fail' | 'na';
  borrowingStatus: 'pass' | 'fail' | 'na';
  serviceabilityStatus: 'pass' | 'fail' | 'na';
  portfolioValue: string;
  totalEquity: string;
  availableFunds: string;
  // Raw numeric values for calculations
  portfolioValueRaw: number;
  totalEquityRaw: number;
  availableFundsRaw: number;
  totalDebt: number;
  propertyCount: number;
  annualCashflow: number;
  // Cashflow breakdown metrics
  grossRentalIncome: number;
  totalExpenses: number;
  totalLoanInterest: number;
  // Purchase info for this year
  purchaseInYear: boolean;
  purchaseDetails?: {
    propertyTitle: string;
    cost: number;
    depositRequired: number;
    loanAmount: number;
    instanceId: string;
    propertyType: string;
  };
  // Full breakdown data for funnel components (only for years with purchases)
  yearBreakdownData?: YearBreakdownData;
}

export interface RoadmapData {
  years: YearData[];
  startYear: number;
  endYear: number;
}

export const useRoadmapData = (): RoadmapData => {
  const { profile } = useInvestmentProfile();
  const { timelineProperties } = useAffordabilityCalculator();
  
  const roadmapData = useMemo((): RoadmapData => {
    const years: YearData[] = [];
    
    // Calculate end year based on user's timeline setting (max 20 years)
    const endYear = BASE_YEAR + (profile.timelineYears || 15) - 1;
    
    // Default interest rate for calculations
    const defaultInterestRate = 0.065; // 6.5%
    
    // Build a map of years to purchases
    const purchasesByYear = new Map<number, typeof timelineProperties>();
    timelineProperties
      .filter(p => p.affordableYear !== Infinity)
      .forEach(prop => {
        const year = Math.floor(prop.affordableYear);
        if (!purchasesByYear.has(year)) {
          purchasesByYear.set(year, []);
        }
        purchasesByYear.get(year)!.push(prop);
      });
    
    // Generate data for each year from BASE_YEAR to user's timeline end
    for (let year = BASE_YEAR; year <= endYear; year++) {
      const yearIndex = year - BASE_YEAR;
      const periodsElapsed = yearIndex * PERIODS_PER_YEAR;
      
      // Get all properties purchased by this year
      const propertiesPurchasedByYear = timelineProperties.filter(
        p => p.affordableYear !== Infinity && Math.floor(p.affordableYear) <= year
      );
      
      const propertyCount = propertiesPurchasedByYear.length;
      
      // Calculate portfolio value with growth
      let portfolioValue = profile.portfolioValue > 0 
        ? calculatePropertyGrowth(profile.portfolioValue, periodsElapsed, profile.growthCurve)
        : 0;
      
      let totalDebt = profile.currentDebt;
      let grossRentalIncome = 0;
      let totalLoanInterest = 0;
      let totalExpenses = 0;
      
      // Add each property's contribution using pre-calculated values from timeline properties
      // These values already use the detailed cashflow calculator with all 39 property inputs
      propertiesPurchasedByYear.forEach(prop => {
        const purchaseYear = Math.floor(prop.affordableYear);
        const yearsOwned = year - purchaseYear;
        const periodsOwned = yearsOwned * PERIODS_PER_YEAR;
        
        // Calculate current property value with tiered growth
        const currentValue = calculatePropertyGrowth(prop.cost, periodsOwned, profile.growthCurve);
        portfolioValue += currentValue;
        totalDebt += prop.loanAmount;
        
        // Use pre-calculated values from the timeline property (already computed via detailed cashflow)
        // These include all 39 property inputs like management fees, strata, insurance, etc.
        // Apply growth factor for properties owned longer than at purchase
        const growthFactor = yearsOwned > 0 ? currentValue / prop.cost : 1;
        const inflationFactor = Math.pow(1.03, periodsOwned / PERIODS_PER_YEAR);
        const combinedFactor = growthFactor * inflationFactor;
        
        // Scale the pre-calculated values for time elapsed since purchase
        grossRentalIncome += prop.grossRentalIncome * combinedFactor;
        totalLoanInterest += prop.loanInterest; // Interest doesn't scale with growth
        totalExpenses += prop.expenses * combinedFactor;
      });
      
      const totalEquity = portfolioValue - totalDebt;
      const extractableEquity = Math.max(0, (portfolioValue * 0.80) - totalDebt);
      const netCashflow = grossRentalIncome - totalLoanInterest - totalExpenses;
      
      // Calculate cumulative savings
      const cumulativeSavings = profile.annualSavings * yearIndex;
      
      // Calculate cashflow reinvestment (cumulative positive cashflow)
      let cashflowReinvestment = 0;
      if (propertyCount > 0) {
        cashflowReinvestment = Math.max(0, netCashflow * yearIndex);
      }
      
      // Calculate deposits used
      const depositsUsed = propertiesPurchasedByYear.reduce(
        (sum, p) => sum + p.depositRequired, 
        0
      );
      
      // Available funds = base deposit + savings + cashflow + equity - deposits used
      const availableFunds = Math.max(0,
        profile.depositPool + 
        cumulativeSavings + 
        cashflowReinvestment + 
        extractableEquity - 
        depositsUsed
      );
      
      // Determine test statuses
      // For years with purchases, use the actual test results
      // For years without purchases, calculate if a hypothetical purchase could be made
      const purchasesThisYear = purchasesByYear.get(year);
      let depositStatus: 'pass' | 'fail' | 'na' = 'na';
      let borrowingStatus: 'pass' | 'fail' | 'na' = 'na';
      let serviceabilityStatus: 'pass' | 'fail' | 'na' = 'na';
      let purchaseInYear = false;
      let purchaseDetails: YearData['purchaseDetails'] = undefined;
      
      // Compute yearBreakdownData for years with purchases
      let yearBreakdownData: YearBreakdownData | undefined = undefined;
      
      if (purchasesThisYear && purchasesThisYear.length > 0) {
        purchaseInYear = true;
        const firstPurchase = purchasesThisYear[0];
        
        // Use actual test results from the timeline property
        depositStatus = firstPurchase.depositTestPass ? 'pass' : 'fail';
        serviceabilityStatus = firstPurchase.serviceabilityTestPass ? 'pass' : 'fail';
        borrowingStatus = firstPurchase.borrowingCapacityRemaining >= 0 ? 'pass' : 'fail';
        
        purchaseDetails = {
          propertyTitle: firstPurchase.title,
          cost: firstPurchase.cost,
          depositRequired: firstPurchase.depositRequired,
          loanAmount: firstPurchase.loanAmount,
          instanceId: firstPurchase.instanceId,
          propertyType: firstPurchase.title,
        };
        
        // Calculate values needed for YearBreakdownData
        const existingDebt = totalDebt - firstPurchase.loanAmount;
        const newDebt = firstPurchase.loanAmount;
        const existingLoanInterest = existingDebt * defaultInterestRate;
        const newLoanInterest = newDebt * defaultInterestRate;
        const baseServiceabilityCapacity = profile.borrowingCapacity * 0.10;
        const rentalServiceabilityContribution = grossRentalIncome * 0.70;
        const equityBoost = extractableEquity * profile.equityFactor;
        const effectiveCapacity = profile.borrowingCapacity + equityBoost;
        const lvr = portfolioValue > 0 ? (totalDebt / portfolioValue) * 100 : 0;
        const dsr = (baseServiceabilityCapacity + rentalServiceabilityContribution) > 0 
          ? ((existingLoanInterest + newLoanInterest) / (baseServiceabilityCapacity + rentalServiceabilityContribution)) * 100 
          : 0;
        
        // Build all portfolio properties array
        const allPortfolioProperties = propertiesPurchasedByYear.map((prop, idx) => {
          const propPurchaseYear = Math.floor(prop.affordableYear);
          const propYearsOwned = year - propPurchaseYear;
          const propPeriodsOwned = propYearsOwned * PERIODS_PER_YEAR;
          const propCurrentValue = calculatePropertyGrowth(prop.cost, propPeriodsOwned, profile.growthCurve);
          const halfYear = prop.affordableYear % 1 >= 0.5 ? 'H2' : 'H1';
          
          return {
            propertyId: prop.instanceId,
            propertyType: prop.title,
            purchaseYear: propPurchaseYear,
            displayPeriod: `${propPurchaseYear} ${halfYear}`,
            originalCost: prop.cost,
            currentValue: propCurrentValue,
            loanAmount: prop.loanAmount,
            equity: propCurrentValue - prop.loanAmount,
            extractableEquity: Math.max(0, (propCurrentValue * 0.80) - prop.loanAmount),
          };
        });
        
        // Build YearBreakdownData
        yearBreakdownData = {
          period: yearIndex * PERIODS_PER_YEAR + 1,
          year,
          displayYear: yearIndex,
          displayPeriod: `${year} H1`,
          status: 'purchased',
          propertyNumber: propertyCount,
          propertyType: firstPurchase.title,
          
          // Portfolio metrics
          portfolioValue,
          totalEquity,
          totalDebt,
          extractableEquity,
          
          // Cash engine
          availableDeposit: availableFunds,
          annualCashFlow: netCashflow,
          
          // Available funds breakdown
          baseDeposit: profile.depositPool,
          cumulativeSavings,
          cashflowReinvestment,
          equityRelease: extractableEquity,
          annualSavingsRate: profile.annualSavings,
          totalAnnualCapacity: profile.annualSavings + Math.max(0, netCashflow),
          
          // Cashflow components
          grossRental: grossRentalIncome,
          loanRepayments: totalLoanInterest,
          expenses: totalExpenses,
          
          // Expense breakdown
          expenseBreakdown: {
            councilRatesWater: totalExpenses * 0.15,
            strataFees: totalExpenses * 0.20,
            insurance: totalExpenses * 0.10,
            managementFees: totalExpenses * 0.35,
            repairsMaintenance: totalExpenses * 0.15,
            landTax: totalExpenses * 0.05,
            other: 0,
          },
          
          // Requirements
          requiredDeposit: firstPurchase.depositRequired,
          requiredLoan: firstPurchase.loanAmount,
          propertyCost: firstPurchase.cost,
          
          // Capacity
          availableBorrowingCapacity: Math.max(0, effectiveCapacity - totalDebt),
          borrowingCapacity: profile.borrowingCapacity,
          
          // Borrowing Capacity Breakdown
          equityBoost,
          effectiveCapacity,
          equityFactor: profile.equityFactor,
          
          // Debt breakdown
          existingDebt,
          newDebt,
          existingLoanInterest,
          newLoanInterest,
          
          // Enhanced serviceability breakdown
          baseServiceabilityCapacity,
          rentalServiceabilityContribution,
          
          // Assumptions
          interestRate: defaultInterestRate * 100,
          rentalRecognition: 75,
          
          // Tests
          depositTest: {
            pass: firstPurchase.depositTestPass,
            surplus: firstPurchase.depositTestSurplus,
            available: firstPurchase.availableFundsUsed,
            required: firstPurchase.depositRequired,
          },
          
          borrowingCapacityTest: {
            pass: firstPurchase.borrowingCapacityRemaining >= 0,
            surplus: firstPurchase.borrowingCapacityRemaining,
            available: effectiveCapacity,
            required: totalDebt,
          },
          
          serviceabilityTest: {
            pass: firstPurchase.serviceabilityTestPass,
            surplus: firstPurchase.serviceabilityTestSurplus,
            available: baseServiceabilityCapacity + rentalServiceabilityContribution,
            required: existingLoanInterest + newLoanInterest,
          },
          
          // Flags
          gapRule: firstPurchase.isGapRuleBlocked || false,
          equityReleaseYear: extractableEquity > 0,
          
          // Strategy metrics
          portfolioScaling: propertyCount,
          selfFundingEfficiency: firstPurchase.cost > 0 ? (netCashflow / firstPurchase.cost) * 100 : 0,
          equityRecyclingImpact: portfolioValue > 0 ? (totalEquity / portfolioValue) * 100 : 0,
          dsr,
          lvr,
          
          // Breakdown details
          purchases: [{
            propertyId: firstPurchase.instanceId,
            propertyType: firstPurchase.title,
            cost: firstPurchase.cost,
            deposit: firstPurchase.depositRequired,
            loanAmount: firstPurchase.loanAmount,
            loanType: 'IO',
            year,
            displayPeriod: `${year} H1`,
            currentValue: firstPurchase.cost,
            equity: firstPurchase.cost - firstPurchase.loanAmount,
            extractableEquity: Math.max(0, (firstPurchase.cost * 0.80) - firstPurchase.loanAmount),
          }],
          
          // All portfolio properties
          allPortfolioProperties,
        };
      } else if (year > BASE_YEAR) {
        // For non-purchase years, calculate hypothetical capacity
        // Using dynamic borrowing capacity with equity boost
        const equityBoost = extractableEquity * profile.equityFactor;
        const effectiveBorrowingCapacity = profile.borrowingCapacity + equityBoost;
        const remainingBorrowingCapacity = Math.max(0, effectiveBorrowingCapacity - totalDebt);
        
        // Enhanced serviceability with rental income contribution
        const baseCapacity = profile.borrowingCapacity * 0.10;
        const rentalContribution = grossRentalIncome * 0.70;
        const enhancedServiceabilityCapacity = baseCapacity + rentalContribution;
        
        // Assume a hypothetical $500k property to test capacity
        const hypotheticalPropertyCost = 500000;
        const hypotheticalDeposit = hypotheticalPropertyCost * 0.20;
        const hypotheticalLoan = hypotheticalPropertyCost * 0.80;
        const hypotheticalLoanPayment = hypotheticalLoan * defaultInterestRate;
        
        // Check deposit capacity
        const depositTestPass = availableFunds >= hypotheticalDeposit;
        const depositTestSurplus = availableFunds - hypotheticalDeposit;
        depositStatus = depositTestPass ? 'pass' : 'fail';
        
        // Check borrowing capacity
        const borrowingTestPass = remainingBorrowingCapacity >= hypotheticalLoan;
        const borrowingTestSurplus = remainingBorrowingCapacity - hypotheticalLoan;
        borrowingStatus = borrowingTestPass ? 'pass' : 'fail';
        
        // Check serviceability
        const totalPaymentsWithNew = totalLoanInterest + hypotheticalLoanPayment;
        const serviceabilityTestPass = enhancedServiceabilityCapacity >= totalPaymentsWithNew;
        const serviceabilityTestSurplus = enhancedServiceabilityCapacity - totalPaymentsWithNew;
        serviceabilityStatus = serviceabilityTestPass ? 'pass' : 'fail';
        
        // Calculate additional values for YearBreakdownData
        const existingLoanInterest = totalDebt * defaultInterestRate;
        const lvr = portfolioValue > 0 ? (totalDebt / portfolioValue) * 100 : 0;
        const dsr = enhancedServiceabilityCapacity > 0 
          ? (totalLoanInterest / enhancedServiceabilityCapacity) * 100 
          : 0;
        
        // Build all portfolio properties array for non-purchase years
        const allPortfolioProperties = propertiesPurchasedByYear.map((prop) => {
          const propPurchaseYear = Math.floor(prop.affordableYear);
          const propYearsOwned = year - propPurchaseYear;
          const propPeriodsOwned = propYearsOwned * PERIODS_PER_YEAR;
          const propCurrentValue = calculatePropertyGrowth(prop.cost, propPeriodsOwned, profile.growthCurve);
          const halfYear = prop.affordableYear % 1 >= 0.5 ? 'H2' : 'H1';
          
          return {
            propertyId: prop.instanceId,
            propertyType: prop.title,
            purchaseYear: propPurchaseYear,
            displayPeriod: `${propPurchaseYear} ${halfYear}`,
            originalCost: prop.cost,
            currentValue: propCurrentValue,
            loanAmount: prop.loanAmount,
            equity: propCurrentValue - prop.loanAmount,
            extractableEquity: Math.max(0, (propCurrentValue * 0.80) - prop.loanAmount),
          };
        });
        
        // Build YearBreakdownData for non-purchase years (hypothetical analysis)
        yearBreakdownData = {
          period: yearIndex * PERIODS_PER_YEAR + 1,
          year,
          displayYear: yearIndex,
          displayPeriod: `${year} H1`,
          status: 'waiting',
          propertyNumber: null,
          propertyType: 'Hypothetical Property',
          
          // Portfolio metrics
          portfolioValue,
          totalEquity,
          totalDebt,
          extractableEquity,
          
          // Cash engine
          availableDeposit: availableFunds,
          annualCashFlow: netCashflow,
          
          // Available funds breakdown
          baseDeposit: profile.depositPool,
          cumulativeSavings,
          cashflowReinvestment,
          equityRelease: extractableEquity,
          annualSavingsRate: profile.annualSavings,
          totalAnnualCapacity: profile.annualSavings + Math.max(0, netCashflow),
          
          // Cashflow components
          grossRental: grossRentalIncome,
          loanRepayments: totalLoanInterest,
          expenses: totalExpenses,
          
          // Expense breakdown
          expenseBreakdown: {
            councilRatesWater: totalExpenses * 0.15,
            strataFees: totalExpenses * 0.20,
            insurance: totalExpenses * 0.10,
            managementFees: totalExpenses * 0.35,
            repairsMaintenance: totalExpenses * 0.15,
            landTax: totalExpenses * 0.05,
            other: 0,
          },
          
          // Requirements (hypothetical $500k property)
          requiredDeposit: hypotheticalDeposit,
          requiredLoan: hypotheticalLoan,
          propertyCost: hypotheticalPropertyCost,
          
          // Capacity
          availableBorrowingCapacity: remainingBorrowingCapacity,
          borrowingCapacity: profile.borrowingCapacity,
          
          // Borrowing Capacity Breakdown
          equityBoost,
          effectiveCapacity: effectiveBorrowingCapacity,
          equityFactor: profile.equityFactor,
          
          // Debt breakdown
          existingDebt: totalDebt,
          newDebt: hypotheticalLoan,
          existingLoanInterest,
          newLoanInterest: hypotheticalLoanPayment,
          
          // Enhanced serviceability breakdown
          baseServiceabilityCapacity: baseCapacity,
          rentalServiceabilityContribution: rentalContribution,
          
          // Assumptions
          interestRate: defaultInterestRate * 100,
          rentalRecognition: 75,
          
          // Tests (hypothetical)
          depositTest: {
            pass: depositTestPass,
            surplus: depositTestSurplus,
            available: availableFunds,
            required: hypotheticalDeposit,
          },
          
          borrowingCapacityTest: {
            pass: borrowingTestPass,
            surplus: borrowingTestSurplus,
            available: effectiveBorrowingCapacity,
            required: totalDebt + hypotheticalLoan,
          },
          
          serviceabilityTest: {
            pass: serviceabilityTestPass,
            surplus: serviceabilityTestSurplus,
            available: enhancedServiceabilityCapacity,
            required: totalPaymentsWithNew,
          },
          
          // Flags
          gapRule: false,
          equityReleaseYear: extractableEquity > 0,
          
          // Strategy metrics
          portfolioScaling: propertyCount,
          selfFundingEfficiency: 0,
          equityRecyclingImpact: portfolioValue > 0 ? (totalEquity / portfolioValue) * 100 : 0,
          dsr,
          lvr,
          
          // Breakdown details (empty for non-purchase years)
          purchases: [],
          
          // All portfolio properties
          allPortfolioProperties,
        };
      }
      
      years.push({
        year,
        depositStatus,
        borrowingStatus,
        serviceabilityStatus,
        portfolioValue: formatCurrency(portfolioValue),
        totalEquity: formatCurrency(totalEquity),
        availableFunds: formatCurrency(availableFunds),
        portfolioValueRaw: portfolioValue,
        totalEquityRaw: totalEquity,
        availableFundsRaw: availableFunds,
        totalDebt,
        propertyCount,
        annualCashflow: netCashflow,
        grossRentalIncome,
        totalExpenses,
        totalLoanInterest,
        purchaseInYear,
        purchaseDetails,
        yearBreakdownData,
      });
    }
    
    return {
      years,
      startYear: BASE_YEAR,
      endYear,
    };
  }, [profile, timelineProperties]);
  
  return roadmapData;
};

