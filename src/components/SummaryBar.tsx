import React from 'react'
import { usePropertySelection } from '../contexts/PropertySelectionContext'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator'
import { useDataAssumptions } from '../contexts/DataAssumptionsContext'
import { calculatePortfolioMetrics, calculateExistingPortfolioMetrics, combineMetrics, DEFAULT_PROPERTY_EXPENSES } from '../utils/metricsCalculator'
import type { PropertyPurchase } from '../types/property'

export const SummaryBar = () => {
  const { calculations } = usePropertySelection()
  const { calculatedValues, profile } = useInvestmentProfile()
  const { timelineProperties } = useAffordabilityCalculator()
  const { globalFactors, getPropertyData } = useDataAssumptions()

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

    // Calculate as of the LATEST PURCHASE YEAR instead of timeline end
    // This shows "where you are now" not "where you'll be in 30 years"
    const latestPurchaseYear = feasibleProperties.length > 0
      ? Math.max(...feasibleProperties.map(p => Math.round(p.affordableYear)))
      : 2025;
    const currentYear = latestPurchaseYear;
    
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

  // Calculate current year progress
  const calculateYearProgress = () => {
    const feasibleProperties = timelineProperties.filter(p => p.status === 'feasible' && p.affordableYear !== Infinity)
    if (feasibleProperties.length === 0) {
      return { currentYear: 1, totalYears: profile.timelineYears || 15 }
    }
    
    // Find the latest purchase year
    const latestPurchaseYear = Math.max(...feasibleProperties.map(p => Math.round(p.affordableYear)))
    const startYear = 2025
    const currentYear = latestPurchaseYear - startYear + 1
    
    return {
      currentYear: Math.max(1, currentYear),
      totalYears: profile.timelineYears || 15
    }
  }

  const yearProgress = calculateYearProgress()

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
    <div className="bg-white rounded-t-xl border border-gray-200 overflow-hidden">
      <div className="grid grid-cols-6">
        {/* Portfolio Value Card */}
        <div className="flex flex-col justify-center border-r border-gray-200 p-3">
          <span className="metric-label mb-0.5">Portfolio Value</span>
          <span className="metric-value-sm whitespace-nowrap">{formatCurrency(kpis.finalPortfolioValue)}</span>
        </div>
        
        {/* Properties Card */}
        <div className="flex flex-col justify-center border-r border-gray-200 p-3">
          <span className="metric-label mb-0.5">Properties</span>
          <span className="metric-value-sm whitespace-nowrap">{kpis.totalProperties}</span>
        </div>
        
        {/* Cashflow Goal Card */}
        <div className="flex flex-col justify-center border-r border-gray-200 p-3">
          <span className="metric-label mb-0.5">Cashflow Goal</span>
          <span className="metric-value-sm whitespace-nowrap">
            {formatCurrency(kpis.annualCashflow)} / {formatCurrency(profile.cashflowGoal)}
          </span>
        </div>
        
        {/* Equity Goal Card */}
        <div className="flex flex-col justify-center border-r border-gray-200 p-3">
          <span className="metric-label mb-0.5">Equity Goal</span>
          <span className="metric-value-sm whitespace-nowrap">
            {formatCurrency(kpis.totalEquity)} / {formatCurrency(profile.equityGoal)}
          </span>
        </div>
        
        {/* Total Debt Card */}
        <div className="flex flex-col justify-center border-r border-gray-200 p-3">
          <span className="metric-label mb-0.5">Total Debt</span>
          <span className="metric-value-sm whitespace-nowrap">{formatCurrency(kpis.totalDebt)}</span>
        </div>
        
        {/* Timeline Progress Card */}
        <div className="flex flex-col justify-center p-3">
          <span className="metric-label mb-0.5">Timeline Progress</span>
          <span className="metric-value-sm whitespace-nowrap">
            Year {yearProgress.currentYear} / {yearProgress.totalYears}
          </span>
        </div>
      </div>
    </div>
  )
}