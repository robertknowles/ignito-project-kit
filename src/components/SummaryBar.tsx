import React from 'react'
import { usePropertySelection } from '../contexts/PropertySelectionContext'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator'
import { useDataAssumptions } from '../contexts/DataAssumptionsContext'
import { calculatePortfolioMetrics, calculateExistingPortfolioMetrics, combineMetrics, DEFAULT_PROPERTY_EXPENSES } from '../utils/metricsCalculator'
import type { PropertyPurchase, TimelineProperty } from '../types/property'
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext'
import { TourStep } from '@/components/TourManager'

interface SummaryBarProps {
  scenarioData?: {
    timelineProperties: TimelineProperty[];
    profile: InvestmentProfileData;
  };
  noBorder?: boolean;
}

export const SummaryBar: React.FC<SummaryBarProps> = ({ scenarioData, noBorder }) => {
  const { calculations } = usePropertySelection()
  const { calculatedValues, profile: contextProfile } = useInvestmentProfile()
  const { timelineProperties: contextTimelineProperties } = useAffordabilityCalculator()
  const { globalFactors, getPropertyData } = useDataAssumptions()
  
  // Use scenarioData if provided (multi-scenario mode), otherwise use context
  const timelineProperties = scenarioData?.timelineProperties ?? contextTimelineProperties
  const profile = scenarioData?.profile ?? contextProfile

  // Calculate actual KPIs based on timeline results using new metrics calculator
  const calculateSummaryKPIs = () => {
    const feasibleProperties = timelineProperties.filter(prop => prop.status === 'feasible')
    
    if (feasibleProperties.length === 0) {
      return {
        finalPortfolioValue: 0,
        totalProperties: 0,
        annualCashflow: 0,
        totalEquity: 0,
        totalDebt: 0
      }
    }

    // Calculate as of the END of the timeline
    const startYear = 2025;
    const currentYear = startYear + (profile.timelineYears || 15);
    
    // DEPRECATED: No longer using globalFactors - each property uses its own template values
    const defaultGrowthRate = 0.06; // Default 6% for summary calculations only
    const defaultInterestRate = 0.065; // Default 6.5% for summary calculations only
    
    // Convert feasible properties to PropertyPurchase format
    const purchases: PropertyPurchase[] = feasibleProperties.map(property => {
      const propertyData = getPropertyData(property.title)
      
      // Extract property-specific growth curve
      const propertyGrowthCurve = propertyData ? {
        year1: parseFloat(propertyData.growthYear1),
        years2to3: parseFloat(propertyData.growthYears2to3),
        year4: parseFloat(propertyData.growthYear4),
        year5plus: parseFloat(propertyData.growthYear5plus)
      } : profile.growthCurve; // Fallback to profile growth curve if no data
      
      return {
        year: property.affordableYear,
        cost: property.cost,
        loanAmount: property.loanAmount,
        depositRequired: property.depositRequired,
        title: property.title,
        rentalYield: propertyData ? parseFloat(propertyData.yield) / 100 : 0.04, // Default 4% if no data
        growthRate: defaultGrowthRate, // DEPRECATED: kept for backward compatibility
        growthCurve: propertyGrowthCurve, // Use property-specific tiered growth rates
        interestRate: defaultInterestRate // NOTE: In reality, each property has its own interest rate from its instance
      }
    })

    // Calculate metrics for existing portfolio (growth up to current year)
    const existingMetrics = calculateExistingPortfolioMetrics(
      profile.portfolioValue,
      profile.currentDebt,
      currentYear - 2025,
      defaultGrowthRate,
      profile.growthCurve,
      defaultInterestRate
    )

    // Calculate metrics for new purchases with detailed expense analysis (as of current year)
    const newPurchasesMetrics = calculatePortfolioMetrics(
      purchases,
      currentYear,
      defaultGrowthRate,
      profile.growthCurve,
      defaultInterestRate,
      DEFAULT_PROPERTY_EXPENSES
    )

    // Combine metrics
    const totalMetrics = combineMetrics(existingMetrics, newPurchasesMetrics)

    return {
      finalPortfolioValue: Math.round(totalMetrics.portfolioValue),
      totalProperties: feasibleProperties.length,
      annualCashflow: Math.round(totalMetrics.annualCashflow),
      totalEquity: Math.round(totalMetrics.totalEquity),
      totalDebt: Math.round(totalMetrics.totalDebt)
    }
  }

  const kpis = calculateSummaryKPIs()

  // Calculate progress towards goals
  const portfolioValueProgress = profile.portfolioValueGoal > 0
    ? Math.min((kpis.finalPortfolioValue / profile.portfolioValueGoal) * 100, 100)
    : 0
  const equityProgress = profile.equityGoal > 0 
    ? Math.min((kpis.totalEquity / profile.equityGoal) * 100, 100) 
    : 0
  const cashflowProgress = profile.cashflowGoal > 0 
    ? Math.min((kpis.annualCashflow / profile.cashflowGoal) * 100, 100) 
    : 0

  // Format currency values (always abbreviated with 1 decimal for k values)
  const formatCurrency = (value: number) => {
    const absValue = Math.abs(value)
    const sign = value < 0 ? '-' : ''
    
    if (absValue === 0) return '$0'
    if (absValue >= 1000000) return `${sign}$${(absValue / 1000000).toFixed(1)}M`
    if (absValue >= 1000) return `${sign}$${(absValue / 1000).toFixed(1)}k`
    return `${sign}$${Math.round(absValue)}`
  }

  return (
    <TourStep
      id="summary-bar"
      title="Portfolio Scoreboard"
      content="Your at-a-glance KPIs: Portfolio Value, Cashflow, and Equity with progress towards goals. These update in real-time as you modify the strategy."
      order={8}
      position="top"
    >
    <div id="summary-bar-container" className={`bg-white overflow-hidden ${noBorder ? 'border-b border-gray-200' : 'rounded-lg border border-gray-200'}`}>
      <div className="flex">
        {/* Timeline context - fixed width column aligned with chart Y-axis (65px) */}
        <div className="flex flex-col items-center justify-center border-r border-gray-100 py-2 bg-white" style={{ width: 65, minWidth: 65 }}>
          <span className="text-[8px] text-slate-400 leading-tight">Projection</span>
          <span className="text-[8px] text-slate-400 leading-tight">Summary:</span>
          <span className="text-[10px] text-slate-500 font-medium">Year {profile.timelineYears}</span>
        </div>
        
        {/* Main metrics grid */}
        <div className="flex-1 grid grid-cols-3">
          {/* Portfolio Value with Progress Bar */}
          <div className="flex flex-col items-center justify-center border-r border-gray-100 py-2 px-4">
            <span className="metric-label mb-0.5">Portfolio Value</span>
            <span className="metric-value-sm whitespace-nowrap text-slate-900 font-semibold">
              {formatCurrency(kpis.finalPortfolioValue)}
              <span className="text-[10px] text-slate-400 font-normal ml-1">/ {formatCurrency(profile.portfolioValueGoal)}</span>
              {portfolioValueProgress >= 100 && <span className="ml-1 text-green-600 font-medium">✓</span>}
            </span>
            <div className="w-full mt-1.5 h-1 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  portfolioValueProgress >= 100 ? 'bg-green-500' : 'bg-slate-900'
                }`}
                style={{ width: `${portfolioValueProgress}%` }}
              />
            </div>
          </div>
          
          {/* Equity with Progress Bar */}
          <div className="flex flex-col items-center justify-center border-r border-gray-100 py-2 px-4">
            <span className="metric-label mb-0.5">Total Equity</span>
            <span className="metric-value-sm whitespace-nowrap text-slate-900 font-semibold">
              {formatCurrency(kpis.totalEquity)}
              <span className="text-[10px] text-slate-400 font-normal ml-1">/ {formatCurrency(profile.equityGoal)}</span>
              {equityProgress >= 100 && <span className="ml-1 text-green-600 font-medium">✓</span>}
            </span>
            <div className="w-full mt-1.5 h-1 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  equityProgress >= 100 ? 'bg-green-500' : 'bg-slate-900'
                }`}
                style={{ width: `${equityProgress}%` }}
              />
            </div>
          </div>
          
          {/* Cashflow with Progress Bar */}
          <div className="flex flex-col items-center justify-center py-2 px-4">
            <span className="metric-label mb-0.5">Annual Cashflow</span>
            <span className={`metric-value-sm whitespace-nowrap font-semibold ${kpis.annualCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(kpis.annualCashflow)}
              <span className="text-[10px] text-slate-400 font-normal ml-1">/ {formatCurrency(profile.cashflowGoal)}</span>
              {cashflowProgress >= 100 && <span className="ml-1 text-green-600 font-medium">✓</span>}
            </span>
            <div className="w-full mt-1.5 h-1 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  cashflowProgress >= 100 ? 'bg-green-500' : 'bg-slate-900'
                }`}
                style={{ width: `${Math.max(0, cashflowProgress)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    </TourStep>
  )
}