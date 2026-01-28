import React, { useMemo } from 'react';
import { Target, TrendingUp, Trophy, CheckCircle, Clock, Building2, Download, Share2 } from 'lucide-react';
import { PortfolioChart } from './components/PortfolioChart';
import { CashflowChart } from './components/CashflowChart';
import { TimelineCard } from './components/TimelineCard';
import { MilestoneCard } from './components/MilestoneCard';
import { OverlayPortfolioChart } from './components/OverlayPortfolioChart';
import { OverlayCashflowChart } from './components/OverlayCashflowChart';
import { ComparisonKPICards } from './components/ComparisonKPICards';
import { TabbedTimeline } from './components/TabbedTimeline';
import { generateTimelineData, generateSummaryData, TimelineItem } from './utils/timelineGenerator';
import { 
  calculateExistingPortfolioMetrics, 
  calculatePortfolioMetrics, 
  combineMetrics, 
  DEFAULT_PROPERTY_EXPENSES 
} from '../utils/metricsCalculator';
import { generateComparisonChartData, ComparisonChartData } from '../hooks/useChartDataGenerator';
import type { ComparisonMetrics } from '../utils/comparisonCalculator';
import type { PropertyPurchase, GrowthCurve } from '../types/property';

interface ChartData {
  portfolioGrowthData: Array<{
    year: string;
    portfolioValue: number;
    equity: number;
    properties?: string[];
  }>;
  cashflowData: Array<{
    year: string;
    cashflow: number;
    rentalIncome: number;
    loanRepayments: number;
  }>;
  equityGoalYear: number | null;
  incomeGoalYear: number | null;
}

// Scenario data for comparison mode
interface ScenarioData {
  name: string;
  investmentProfile: any;
  propertySelections: any[];
  chartData?: ChartData;
}

interface ClientDashboardProps {
  investmentProfile: any;
  propertySelections: any[];
  chartData?: ChartData;
  clientDisplayName?: string;
  agentDisplayName?: string;
  companyDisplayName?: string;
  onPrint?: () => void;
  // Comparison mode props
  comparisonMode?: boolean;
  scenarioA?: ScenarioData;
  scenarioB?: ScenarioData;
  comparisonMetrics?: ComparisonMetrics;
}

export function ClientDashboard({ 
  investmentProfile, 
  propertySelections, 
  chartData,
  clientDisplayName = 'Client',
  agentDisplayName = 'Agent',
  companyDisplayName = 'PropPath',
  onPrint,
  // Comparison mode props
  comparisonMode = false,
  scenarioA,
  scenarioB,
  comparisonMetrics,
}: ClientDashboardProps) {
  
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
  const endYear = startYear + timelineYears - 1;
  const defaultGrowthRate = 0.06;
  const defaultInterestRate = investmentProfile?.interestRate || 0.065;
  
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
  const existingRentalYield = investmentProfile?.existingRentalYield || 0.04;

  // Calculate chart data
  const { portfolioData, cashflowData, equityGoalYear, incomeGoalYear } = useMemo(() => {
    // If we have pre-calculated chart data from the dashboard, use it directly
    if (chartData && chartData.portfolioGrowthData && chartData.portfolioGrowthData.length > 0) {
      const portfolioDataArr = chartData.portfolioGrowthData.map(d => ({
        year: parseInt(d.year, 10),
        portfolioValue: d.portfolioValue,
        equity: d.equity,
      }));
      
      const cashflowDataArr = chartData.cashflowData.map(d => ({
        year: parseInt(d.year, 10),
        cashflow: d.cashflow,
      }));
      
      return {
        portfolioData: portfolioDataArr,
        cashflowData: cashflowDataArr,
        equityGoalYear: chartData.equityGoalYear,
        incomeGoalYear: chartData.incomeGoalYear,
      };
    }

    // Fallback: Calculate from propertySelections
    const portfolioDataArr: Array<{ year: number; portfolioValue: number; equity: number }> = [];
    const cashflowDataArr: Array<{ year: number; cashflow: number }> = [];
    
    // Convert propertySelections to PropertyPurchase format
    const purchases: PropertyPurchase[] = (propertySelections || []).map((p: any) => {
      const cost = p.cost || 500000;
      let rentalYield = 0.04;
      if (typeof p.rentalYield === 'number') {
        rentalYield = p.rentalYield > 1 ? p.rentalYield / 100 : p.rentalYield;
      } else if (typeof p.rentalYield === 'string') {
        rentalYield = parseFloat(p.rentalYield) / 100 || 0.04;
      } else if (typeof p.yield === 'string') {
        rentalYield = parseFloat(p.yield) / 100 || 0.04;
      } else if (typeof p.yield === 'number') {
        rentalYield = p.yield > 1 ? p.yield / 100 : p.yield;
      }
      
      const loanAmount = p.loanAmount || cost * 0.90;
      
      let growthRate = defaultGrowthRate;
      if (typeof p.growth === 'number') {
        growthRate = p.growth > 1 ? p.growth / 100 : p.growth;
      } else if (typeof p.growth === 'string') {
        const parsed = parseFloat(p.growth);
        if (!isNaN(parsed)) {
          growthRate = parsed > 1 ? parsed / 100 : parsed;
        }
      } else if (typeof p.growthRate === 'number') {
        growthRate = p.growthRate > 1 ? p.growthRate / 100 : p.growthRate;
      }

      return {
        year: p.purchaseYear || p.affordableYear || startYear + 1,
        cost,
        loanAmount,
        depositRequired: cost - loanAmount,
        title: p.title || p.id || 'Property',
        rentalYield,
        growthRate,
        interestRate: p.interestRate || defaultInterestRate,
      };
    });

    let foundEquityGoalYear: number | null = null;
    let foundIncomeGoalYear: number | null = null;

    for (let year = startYear; year <= endYear; year++) {
      const yearsGrown = year - startYear;
      
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
      
      const purchasesByThisYear = purchases.filter(p => p.year <= year);
      
      const newPurchasesMetrics = calculatePortfolioMetrics(
        purchasesByThisYear,
        year,
        defaultGrowthRate,
        defaultGrowthCurve,
        defaultInterestRate,
        DEFAULT_PROPERTY_EXPENSES
      );
      
      const combined = combineMetrics(existingMetrics, newPurchasesMetrics);
      
      portfolioDataArr.push({
        year,
        portfolioValue: Math.round(combined.portfolioValue),
        equity: Math.round(combined.totalEquity),
      });
      
      cashflowDataArr.push({
        year,
        cashflow: Math.round(combined.annualCashflow),
      });

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
    chartData,
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

  // Generate timeline data
  const timelineData = useMemo(() => {
    return generateTimelineData(propertySelections, investmentProfile);
  }, [propertySelections, investmentProfile]);

  // Generate summary data for starting position
  const summaryData = useMemo(() => {
    return generateSummaryData(investmentProfile);
  }, [investmentProfile]);

  // Get final portfolio values for achievement banner
  const finalPortfolioData = portfolioData[portfolioData.length - 1];
  const finalCashflowData = cashflowData[cashflowData.length - 1];
  
  // Check if goals are achieved
  const goalsAchieved = equityGoalYear !== null && incomeGoalYear !== null;

  // Create property purchases data for chart markers
  const propertyPurchases = useMemo(() => {
    return (propertySelections || []).map((p: any) => ({
      year: p.purchaseYear || p.affordableYear || startYear + 1,
      title: p.title || p.id || 'Property',
      cost: p.cost || 500000,
    }));
  }, [propertySelections, startYear]);

  // ============================================
  // COMPARISON MODE DATA COMPUTATION
  // ============================================
  
  // Generate timeline and summary data for Scenario A
  const timelineDataA = useMemo((): TimelineItem[] => {
    if (!comparisonMode || !scenarioA) return [];
    return generateTimelineData(scenarioA.propertySelections, scenarioA.investmentProfile);
  }, [comparisonMode, scenarioA]);

  const summaryDataA = useMemo(() => {
    if (!comparisonMode || !scenarioA) return { startingCash: '', borrowingCapacity: '', annualSavings: '', goal: '' };
    return generateSummaryData(scenarioA.investmentProfile);
  }, [comparisonMode, scenarioA]);

  // Generate timeline and summary data for Scenario B
  const timelineDataB = useMemo((): TimelineItem[] => {
    if (!comparisonMode || !scenarioB) return [];
    return generateTimelineData(scenarioB.propertySelections, scenarioB.investmentProfile);
  }, [comparisonMode, scenarioB]);

  const summaryDataB = useMemo(() => {
    if (!comparisonMode || !scenarioB) return { startingCash: '', borrowingCapacity: '', annualSavings: '', goal: '' };
    return generateSummaryData(scenarioB.investmentProfile);
  }, [comparisonMode, scenarioB]);

  // Helper function to generate chart data from property selections
  const generateChartDataFromSelections = (
    selections: any[],
    profile: any
  ): { portfolioGrowthData: any[]; cashflowData: any[] } => {
    const portfolioGrowthData: any[] = [];
    const cashflowDataArr: any[] = [];
    
    const scenarioStartYear = 2025;
    const scenarioTimelineYears = profile?.timelineYears || timelineYears;
    const scenarioEndYear = scenarioStartYear + scenarioTimelineYears - 1;
    const scenarioExistingValue = profile?.existingPortfolioValue || 0;
    const scenarioExistingDebt = profile?.existingDebt || 0;
    const scenarioExistingYield = profile?.existingRentalYield || 0.04;
    const scenarioGrowthCurve = profile?.growthCurve || defaultGrowthCurve;
    
    // Convert selections to purchases
    const purchases: PropertyPurchase[] = (selections || []).map((p: any) => {
      const cost = p.cost || 500000;
      let rentalYield = 0.04;
      if (typeof p.rentalYield === 'number') {
        rentalYield = p.rentalYield > 1 ? p.rentalYield / 100 : p.rentalYield;
      } else if (typeof p.yield === 'string') {
        rentalYield = parseFloat(p.yield) / 100 || 0.04;
      }
      
      const loanAmount = p.loanAmount || cost * 0.90;
      
      return {
        year: p.purchaseYear || p.affordableYear || scenarioStartYear + 1,
        cost,
        loanAmount,
        depositRequired: p.depositRequired || cost - loanAmount,
        title: p.title || 'Property',
        rentalYield,
        growthCurve: scenarioGrowthCurve,
      };
    });
    
    // Generate data for each year
    for (let year = scenarioStartYear; year <= scenarioEndYear; year++) {
      const yearsSinceStart = year - scenarioStartYear;
      
      // Existing portfolio metrics
      const existingMetrics = calculateExistingPortfolioMetrics(
        scenarioExistingValue,
        scenarioExistingDebt,
        scenarioExistingYield,
        profile?.currentDebt || 0,
        yearsSinceStart,
        defaultGrowthRate,
        scenarioGrowthCurve,
        defaultInterestRate
      );
      
      // New purchases metrics
      const relevantPurchases = purchases.filter(p => p.year <= year);
      const newMetrics = calculatePortfolioMetrics(
        relevantPurchases,
        year,
        defaultGrowthRate,
        scenarioGrowthCurve,
        defaultInterestRate,
        DEFAULT_PROPERTY_EXPENSES
      );
      
      const totalMetrics = combineMetrics(existingMetrics, newMetrics);
      
      portfolioGrowthData.push({
        year: year.toString(),
        portfolioValue: Math.round(totalMetrics.portfolioValue),
        equity: Math.round(totalMetrics.totalEquity),
      });
      
      cashflowDataArr.push({
        year: year.toString(),
        cashflow: Math.round(totalMetrics.annualCashflow),
        rentalIncome: Math.round(totalMetrics.annualCashflow + totalMetrics.annualLoanRepayments),
        loanRepayments: Math.round(totalMetrics.annualLoanRepayments),
      });
    }
    
    return { portfolioGrowthData, cashflowData: cashflowDataArr };
  };

  // Generate comparison chart data
  const comparisonChartData = useMemo((): ComparisonChartData | null => {
    if (!comparisonMode || !scenarioA || !scenarioB) return null;
    
    // Use provided chartData or generate from propertySelections
    const chartDataA = scenarioA.chartData?.portfolioGrowthData?.length 
      ? scenarioA.chartData 
      : generateChartDataFromSelections(scenarioA.propertySelections, scenarioA.investmentProfile);
    
    const chartDataB = scenarioB.chartData?.portfolioGrowthData?.length 
      ? scenarioB.chartData 
      : generateChartDataFromSelections(scenarioB.propertySelections, scenarioB.investmentProfile);
    
    return generateComparisonChartData(
      {
        portfolioGrowthData: chartDataA.portfolioGrowthData,
        cashflowData: chartDataA.cashflowData,
      },
      {
        portfolioGrowthData: chartDataB.portfolioGrowthData,
        cashflowData: chartDataB.cashflowData,
      },
      equityGoal,
      incomeGoal
    );
  }, [comparisonMode, scenarioA, scenarioB, equityGoal, incomeGoal, timelineYears, defaultGrowthCurve, defaultInterestRate]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 lg:px-10 py-4 sm:py-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs sm:text-sm text-slate-500 mb-1">
              {comparisonMode ? 'Strategy Comparison Report' : 'Investment Strategy Dashboard'}
            </p>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              {clientDisplayName}'s Portfolio Plan
              {comparisonMode && (
                <span className="ml-2 text-sm font-normal text-slate-500">
                  — Comparing {scenarioA?.name || 'A'} vs {scenarioB?.name || 'B'}
                </span>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Prepared by {agentDisplayName} • {companyDisplayName}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {/* TODO: Implement share functionality */}}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Share Dashboard</span>
              <span className="sm:hidden">Share</span>
            </button>
            {onPrint && (
              <button
                onClick={onPrint}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download PDF</span>
                <span className="sm:hidden">PDF</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-10 py-4 sm:py-6">
        {/* Hero Cards - Investment Goals (Conditional: Comparison vs Single Scenario) */}
        {comparisonMode && comparisonMetrics ? (
          // COMPARISON MODE: Side-by-side KPI cards
          <ComparisonKPICards
            comparison={comparisonMetrics}
            equityGoal={equityGoal}
            incomeGoal={incomeGoal}
            targetYear={targetYear}
            scenarioAName={scenarioA?.name || 'Scenario A'}
            scenarioBName={scenarioB?.name || 'Scenario B'}
          />
        ) : (
          // SINGLE SCENARIO MODE: Standard KPI cards
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 lg:mb-8">
            {/* Equity Goal Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-sky-500" />
                  <span className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">Equity Goal</span>
                </div>
                {equityGoalYear !== null ? (
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Clock className="w-5 h-5 text-amber-400" />
                )}
              </div>
              <p className="text-xl sm:text-2xl font-bold text-slate-800 mb-1">{formatCurrency(equityGoal)}</p>
              <p className={`text-sm ${equityGoalYear !== null ? 'text-emerald-600' : 'text-amber-500'}`}>
                {equityGoalYear !== null 
                  ? `Achieved by ${equityGoalYear}` 
                  : `Target: ${targetYear}`}
              </p>
              {equityYearsAhead !== null && equityYearsAhead > 0 && (
                <p className="text-xs text-emerald-600 mt-1">{equityYearsAhead} years ahead</p>
              )}
            </div>

            {/* Passive Income Goal Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">Passive Income</span>
                </div>
                {incomeGoalYear !== null ? (
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Clock className="w-5 h-5 text-amber-400" />
                )}
              </div>
              <p className="text-xl sm:text-2xl font-bold text-slate-800 mb-1">{formatCurrency(incomeGoal)}/yr</p>
              <p className={`text-sm ${incomeGoalYear !== null ? 'text-emerald-600' : 'text-amber-500'}`}>
                {incomeGoalYear !== null 
                  ? `Achieved by ${incomeGoalYear}` 
                  : `Target: ${targetYear}`}
              </p>
              {incomeYearsAhead !== null && incomeYearsAhead > 0 && (
                <p className="text-xs text-emerald-600 mt-1">{incomeYearsAhead} years ahead</p>
              )}
            </div>

            {/* Target Year Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-sky-500" />
                <span className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">Target Year</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-sky-600 mb-1">{targetYear}</p>
              <p className="text-sm text-slate-600">
                {timelineYears} year journey
              </p>
              <p className="text-xs text-slate-500 mt-1">{propertySelections.length} properties planned</p>
            </div>
          </div>
        )}

        {/* Main Content - 50/50 Split Layout (Conditional: Comparison vs Single Scenario) */}
        {comparisonMode && comparisonChartData ? (
          // COMPARISON MODE: Tabbed timeline + Overlay charts
          <div className="flex flex-col lg:flex-row gap-6 mb-8">
            {/* Left Panel - Tabbed Timeline (50%) */}
            <div className="w-full lg:w-1/2">
              <TabbedTimeline
                timelineDataA={timelineDataA}
                timelineDataB={timelineDataB}
                summaryDataA={summaryDataA}
                summaryDataB={summaryDataB}
                scenarioAName={scenarioA?.name || 'Scenario A'}
                scenarioBName={scenarioB?.name || 'Scenario B'}
              />
            </div>

            {/* Right Panel - Overlay Charts (50%) */}
            <div className="w-full lg:w-1/2 flex flex-col gap-6">
              {/* Overlay Portfolio Value Chart */}
              <div>
                <OverlayPortfolioChart 
                  data={comparisonChartData.portfolioData}
                  equityGoal={equityGoal}
                  equityGoalYearA={comparisonChartData.equityGoalYearA}
                  equityGoalYearB={comparisonChartData.equityGoalYearB}
                  scenarioAName={scenarioA?.name || 'Scenario A'}
                  scenarioBName={scenarioB?.name || 'Scenario B'}
                />
              </div>
              
              {/* Overlay Cashflow Chart */}
              <div>
                <OverlayCashflowChart 
                  data={comparisonChartData.cashflowData}
                  incomeGoal={incomeGoal}
                  incomeGoalYearA={comparisonChartData.incomeGoalYearA}
                  incomeGoalYearB={comparisonChartData.incomeGoalYearB}
                  scenarioAName={scenarioA?.name || 'Scenario A'}
                  scenarioBName={scenarioB?.name || 'Scenario B'}
                />
              </div>

              {/* Comparison Winner Summary */}
              {comparisonMetrics && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-semibold text-slate-800" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                      Recommendation
                    </h3>
                  </div>
                  
                  <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/60 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-slate-800">
                        {comparisonMetrics.winner === 'tie' 
                          ? 'Both scenarios perform similarly' 
                          : `Scenario ${comparisonMetrics.winner} recommended`}
                      </p>
                      {comparisonMetrics.winner !== 'tie' && (
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          comparisonMetrics.winner === 'A' 
                            ? 'bg-teal-100 text-teal-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {comparisonMetrics.winner === 'A' 
                            ? scenarioA?.name || 'Scenario A' 
                            : scenarioB?.name || 'Scenario B'}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-slate-600 mb-3">{comparisonMetrics.winnerReason}</p>
                    
                    {/* Key Insights */}
                    {comparisonMetrics.insights.length > 0 && (
                      <div className="border-t border-amber-200/60 pt-3">
                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-2">Key Insights</p>
                        <ul className="space-y-1">
                          {comparisonMetrics.insights.slice(0, 3).map((insight, index) => (
                            <li key={index} className="text-xs text-slate-600 flex items-start gap-2">
                              <span className="text-amber-500 mt-0.5">•</span>
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          // SINGLE SCENARIO MODE: Standard layout
          <div className="flex flex-col lg:flex-row gap-6 mb-8">
            {/* Left Panel - Property Timeline (50%) */}
            <div className="w-full lg:w-1/2">
              {/* White container with title inside */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-4 h-4 text-slate-500" />
                  <h2 className="text-sm font-semibold text-slate-800" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    Property Investment Timeline
                  </h2>
                </div>
                
                {/* Starting Position Card */}
                <div className="bg-slate-50 rounded-lg p-3 mb-3">
                  <div className="flex items-center gap-3 mb-3 pb-2 border-b border-slate-200/60">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-100 text-sky-600 text-[10px] font-bold">A</div>
                    <div>
                      <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Starting Position</h3>
                      <p className="text-[10px] text-slate-500">Initial capital & borrowing power</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white rounded-md p-2">
                      <p className="text-[10px] text-slate-500 mb-0.5">Starting Cash</p>
                      <p className="text-xs font-semibold text-slate-800">{summaryData.startingCash}</p>
                    </div>
                    <div className="bg-white rounded-md p-2">
                      <p className="text-[10px] text-slate-500 mb-0.5">Borrowing</p>
                      <p className="text-xs font-semibold text-slate-800">{summaryData.borrowingCapacity}</p>
                    </div>
                    <div className="bg-white rounded-md p-2">
                      <p className="text-[10px] text-slate-500 mb-0.5">Annual Savings</p>
                      <p className="text-xs font-semibold text-slate-800">{summaryData.annualSavings}</p>
                    </div>
                  </div>
                </div>

                {/* Goal Banner */}
                <div className="bg-sky-50 rounded-lg p-3 mb-3 flex items-center gap-3">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-500 text-white text-[10px] font-bold">B</div>
                  <div>
                    <p className="text-[10px] text-sky-600 font-medium uppercase tracking-wide">Your Goal</p>
                    <p className="text-xs font-semibold text-sky-700">{summaryData.goal}</p>
                  </div>
                </div>

                {/* Property Timeline */}
                {timelineData.length > 0 && (
                  <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200"></div>
                    
                    {/* Timeline items */}
                    {timelineData.map((item, index) => {
                      if (item.type === 'milestone') {
                        return (
                          <MilestoneCard
                            key={`milestone-${index}`}
                            year={item.year}
                            title={item.title}
                            description={item.description}
                            isLast={item.isLast}
                          />
                        );
                      } else {
                        return (
                          <TimelineCard
                            key={`property-${index}`}
                            propertyNumber={item.propertyNumber}
                            title={item.title}
                            year={item.year}
                            purchasePrice={item.purchasePrice}
                            equity={item.equity}
                            yield={item.yield}
                            cashflow={item.cashflow}
                            milestone={item.milestone}
                            nextMove={item.nextMove}
                            isLast={item.isLast}
                            savedAmount={item.savedAmount}
                            equityReleased={item.equityReleased}
                            totalDeposit={item.totalDeposit}
                            monthsToSave={item.monthsToSave}
                          />
                        );
                      }
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Charts (50%) */}
            <div className="w-full lg:w-1/2 flex flex-col gap-6">
              {/* Portfolio Value Chart */}
              <div>
                <PortfolioChart 
                  data={portfolioData} 
                  equityGoal={equityGoal}
                  equityGoalYear={equityGoalYear}
                  propertyPurchases={propertyPurchases}
                />
              </div>
              
              {/* Cashflow Chart */}
              <div>
                <CashflowChart 
                  data={cashflowData}
                  incomeGoal={incomeGoal}
                  incomeGoalYear={incomeGoalYear}
                  propertyPurchases={propertyPurchases}
                />
              </div>

              {/* Goal Achievement Banner - under charts */}
              {goalsAchieved && finalPortfolioData && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  {/* Title inside the box */}
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-semibold text-slate-800" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                      Goals Achieved
                    </h3>
                    <span className="text-xs text-emerald-600 font-medium">
                      — {Math.min(equityYearsAhead || 0, incomeYearsAhead || 0)} years ahead
                    </span>
                  </div>
                  
                  {/* Content */}
                  <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/60 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] text-slate-600">Final position by {endYear}</p>
                      <p className="text-[10px] font-medium text-slate-700">{propertySelections.length} properties in portfolio</p>
                    </div>
                    
                    {/* Key Outcomes */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-white/70 rounded-md p-2.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[9px] text-slate-500">Final Portfolio</p>
                          <p className="text-xs font-semibold text-slate-800">{formatCurrency(finalPortfolioData.portfolioValue)}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] text-slate-500">Total Equity</p>
                          <p className="text-xs font-semibold text-slate-800">{formatCurrency(finalPortfolioData.equity)}</p>
                        </div>
                      </div>
                      <div className="bg-white/70 rounded-md p-2.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[9px] text-slate-500">Passive Income</p>
                          <p className="text-xs font-semibold text-emerald-600">{formatCurrency(finalCashflowData?.cashflow || 0)}/yr</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] text-slate-500">Monthly</p>
                          <p className="text-xs font-semibold text-emerald-600">{formatCurrency(Math.round((finalCashflowData?.cashflow || 0) / 12))}/mo</p>
                        </div>
                      </div>
                    </div>

                    {/* Progress Summary */}
                    <div className="bg-white/60 rounded-md p-2.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-600">
                          <span className="font-medium text-emerald-600">Equity goal</span> ({formatCurrency(equityGoal)}) achieved in {equityGoalYear}
                        </span>
                        <span className="text-emerald-600 font-medium">✓</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] mt-1.5">
                        <span className="text-slate-600">
                          <span className="font-medium text-emerald-600">Income goal</span> ({formatCurrency(incomeGoal)}/yr) achieved in {incomeGoalYear}
                        </span>
                        <span className="text-emerald-600 font-medium">✓</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 sm:pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="text-xs sm:text-sm font-semibold text-slate-900">{companyDisplayName.toUpperCase()}</p>
          <p className="text-xs sm:text-sm text-slate-500">Generated {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
