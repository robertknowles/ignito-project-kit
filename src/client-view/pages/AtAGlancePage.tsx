import React, { useMemo } from 'react'

import { PortfolioChart } from '../components/PortfolioChart'
import { CashflowChart } from '../components/CashflowChart'
import { Target, TrendingUp } from 'lucide-react'
import { 
  calculateExistingPortfolioMetrics, 
  calculatePortfolioMetrics, 
  combineMetrics, 
  DEFAULT_PROPERTY_EXPENSES 
} from '../../utils/metricsCalculator';
import type { PropertyPurchase, GrowthCurve } from '../../types/property';

interface AtAGlancePageProps {
  investmentProfile: any;
  propertySelections: any[];
}

export function AtAGlancePage({ investmentProfile, propertySelections }: AtAGlancePageProps) {
  // Format currency helper
  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return `$${value.toLocaleString()}`;
  };

  // Extract investment goals with defaults
  const equityGoal = investmentProfile?.equityGoal || 1000000;
  const incomeGoal = investmentProfile?.cashflowGoal || 50000;
  const targetYear = investmentProfile?.targetYear || 2040;

  // Default assumptions
  const startYear = 2025;
  const timelineYears = investmentProfile?.timelineYears || 15;
  const endYear = startYear + timelineYears;
  const defaultGrowthRate = 0.06; // 6% annual growth
  const defaultInterestRate = investmentProfile?.interestRate || 0.065; // 6.5% interest
  
  // Default growth curve for tiered growth
  const defaultGrowthCurve: GrowthCurve = {
    year1: 12.5,
    years2to3: 10,
    year4: 7.5,
    year5plus: 6
  };

  // Existing portfolio values from investment profile
  const existingPortfolioValue = investmentProfile?.existingPortfolioValue || 0;
  const existingDebt = investmentProfile?.existingDebt || 0;
  const existingRentalYield = investmentProfile?.existingRentalYield || 0.04; // 4% default

  // Calculate chart data using useMemo
  const { portfolioData, cashflowData, equityGoalYear, incomeGoalYear } = useMemo(() => {
    const portfolioDataArr: Array<{ year: number; portfolioValue: number; equity: number }> = [];
    const cashflowDataArr: Array<{ year: number; cashflow: number }> = [];
    
    // Convert propertySelections to PropertyPurchase format
    const purchases: PropertyPurchase[] = (propertySelections || []).map((p: any) => {
      const cost = p.cost || 500000;
      // Parse rental yield - handle both number and string formats
      let rentalYield = 0.04; // Default 4%
      if (typeof p.rentalYield === 'number') {
        rentalYield = p.rentalYield > 1 ? p.rentalYield / 100 : p.rentalYield;
      } else if (typeof p.yield === 'string') {
        rentalYield = parseFloat(p.yield) / 100 || 0.04;
      }
      
      // Estimate loan amount as 90% LVR if not provided
      const loanAmount = p.loanAmount || cost * 0.90;
      
      return {
        year: p.purchaseYear || p.affordableYear || startYear + 1,
        cost,
        loanAmount,
        depositRequired: cost - loanAmount,
        title: p.title || p.id || 'Property',
        rentalYield,
        growthRate: parseFloat(p.growth) / 100 || defaultGrowthRate,
        interestRate: p.interestRate || defaultInterestRate,
      };
    });

    // Track when goals are achieved
    let foundEquityGoalYear: number | null = null;
    let foundIncomeGoalYear: number | null = null;

    // Iterate through each year
    for (let year = startYear; year <= endYear; year++) {
      const yearsGrown = year - startYear;
      
      // Calculate existing portfolio metrics
      const existingMetrics = calculateExistingPortfolioMetrics(
        existingPortfolioValue,
        existingDebt,
        yearsGrown,
        defaultGrowthRate,
        defaultGrowthCurve,
        defaultInterestRate,
        existingRentalYield,
        DEFAULT_PROPERTY_EXPENSES
      );
      
      // Get properties purchased by this year
      const purchasesByThisYear = purchases.filter(p => p.year <= year);
      
      // Calculate new purchases metrics
      const newPurchasesMetrics = calculatePortfolioMetrics(
        purchasesByThisYear,
        year,
        defaultGrowthRate,
        defaultGrowthCurve,
        defaultInterestRate,
        DEFAULT_PROPERTY_EXPENSES
      );
      
      // Combine metrics
      const combined = combineMetrics(existingMetrics, newPurchasesMetrics);
      
      // Push to portfolio data
      portfolioDataArr.push({
        year,
        portfolioValue: Math.round(combined.portfolioValue),
        equity: Math.round(combined.totalEquity),
      });
      
      // Push to cashflow data
      cashflowDataArr.push({
        year,
        cashflow: Math.round(combined.annualCashflow),
      });

      // Check if goals are achieved
      if (foundEquityGoalYear === null && combined.totalEquity >= equityGoal) {
        foundEquityGoalYear = year;
      }
      if (foundIncomeGoalYear === null && combined.annualCashflow >= incomeGoal) {
        foundIncomeGoalYear = year;
      }
    }
    
    return {
      portfolioData: portfolioDataArr,
      cashflowData: cashflowDataArr,
      equityGoalYear: foundEquityGoalYear,
      incomeGoalYear: foundIncomeGoalYear,
    };
  }, [
    investmentProfile, 
    propertySelections, 
    equityGoal, 
    incomeGoal, 
    existingPortfolioValue, 
    existingDebt, 
    existingRentalYield,
    timelineYears,
    endYear,
    defaultInterestRate
  ]);

  // Calculate years ahead/behind for each goal
  const equityYearsAhead = equityGoalYear !== null ? targetYear - equityGoalYear : null;
  const incomeYearsAhead = incomeGoalYear !== null ? targetYear - incomeGoalYear : null;

  // Helper to format goal year display
  const formatGoalYear = (year: number | null): string => {
    if (year === null) return `> ${endYear}`;
    return String(year);
  };

  // Helper to format years ahead/behind message
  const formatYearsMessage = (yearsAhead: number | null): string => {
    if (yearsAhead === null) return 'Not achieved within timeline';
    if (yearsAhead > 0) return `${yearsAhead} years ahead of target`;
    if (yearsAhead < 0) return `${Math.abs(yearsAhead)} years behind target`;
    return 'On target';
  };

  return (
    <div className="w-full min-h-[297mm] bg-[#f9fafb] p-16">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-gray-500 mb-2">Year-End Financial Report</p>
        <h1
          className="text-4xl font-semibold text-gray-900"
          style={{
            fontFamily: 'Figtree, sans-serif',
          }}
        >
          Investment Strategy At A Glance
        </h1>
      </div>
      {/* Goals Section */}
      <div className="grid grid-cols-2 gap-4 mb-12">
        {/* Investment Goals Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-blue-500" />
            <h2
              className="text-lg font-semibold text-gray-900"
              style={{
                fontFamily: 'Figtree, sans-serif',
              }}
            >
              Investment Goals
            </h2>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Equity Goal
              </p>
              <p className="text-xl font-semibold text-gray-900">{formatCurrency(equityGoal)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Passive Income Goal
              </p>
              <p className="text-xl font-semibold text-gray-900">{formatCurrency(incomeGoal)}/year</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Target Year
              </p>
              <p className="text-xl font-semibold text-blue-600">{targetYear}</p>
            </div>
          </div>
        </div>
        {/* Goal Achieved Card */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <h2
              className="text-lg font-semibold text-gray-900"
              style={{
                fontFamily: 'Figtree, sans-serif',
              }}
            >
              Goal Achieved
            </h2>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Equity Goal
              </p>
              <p className={`text-xl font-semibold ${equityGoalYear !== null ? 'text-green-600' : 'text-amber-600'}`}>
                {formatGoalYear(equityGoalYear)}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {formatYearsMessage(equityYearsAhead)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Cashflow Goal
              </p>
              <p className={`text-xl font-semibold ${incomeGoalYear !== null ? 'text-green-600' : 'text-amber-600'}`}>
                {formatGoalYear(incomeGoalYear)}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {formatYearsMessage(incomeYearsAhead)}
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Charts */}
      <div className="space-y-6">
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <PortfolioChart data={portfolioData} />
        </div>
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <CashflowChart data={cashflowData} />
        </div>
      </div>
      {/* Footer */}
      <div className="mt-12 flex justify-between items-center">
        <div className="text-sm font-semibold text-gray-900">IGNITO</div>
        <div className="text-sm text-gray-500">Page 2</div>
      </div>
    </div>
  )
}

