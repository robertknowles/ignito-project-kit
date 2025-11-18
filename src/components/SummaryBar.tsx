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

    const timelineEnd = 2025 + profile.timelineYears
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

    // Calculate metrics for existing portfolio
    const existingMetrics = calculateExistingPortfolioMetrics(
      profile.portfolioValue,
      profile.currentDebt,
      timelineEnd - 2025,
      defaultGrowthRate,
      profile.growthCurve,
      defaultInterestRate
    )

    // Calculate metrics for new purchases with detailed expense analysis
    const newPurchasesMetrics = calculatePortfolioMetrics(
      purchases,
      timelineEnd,
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

  // Format currency values
  const formatCurrency = (value: number) => {
    if (value === 0) return '$0'
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${Math.round(value / 1000)}k`
    return `$${Math.round(value).toLocaleString()}`
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-6 gap-6">
        <div className="text-center">
          <h4 className="text-xs text-[#6b7280] mb-2">Final Portfolio Value</h4>
          <p className="text-[#111827] font-medium">{formatCurrency(kpis.finalPortfolioValue)}</p>
        </div>
        <div className="text-center">
          <h4 className="text-xs text-[#6b7280] mb-2">Properties</h4>
          <p className="text-[#111827] font-medium">{kpis.totalProperties}</p>
        </div>
        <div className="text-center">
          <h4 className="text-xs text-[#6b7280] mb-2">Cashflow Goal</h4>
          <p className="text-[#111827] font-medium">
            {formatCurrency(kpis.annualCashflow)} / {formatCurrency(profile.cashflowGoal)}
          </p>
        </div>
        <div className="text-center">
          <h4 className="text-xs text-[#6b7280] mb-2">Equity Goal</h4>
          <p className="text-[#111827] font-medium">
            {formatCurrency(kpis.totalEquity)} / {formatCurrency(profile.equityGoal)}
          </p>
        </div>
        <div className="text-center">
          <h4 className="text-xs text-[#6b7280] mb-2">Total Debt</h4>
          <p className="text-[#111827] font-medium">{formatCurrency(kpis.totalDebt)}</p>
        </div>
        <div className="text-center">
          <h4 className="text-xs text-[#6b7280] mb-2">Timeline Progress</h4>
          <p className="text-[#111827] font-medium">
            Year {yearProgress.currentYear} / {yearProgress.totalYears}
          </p>
        </div>
      </div>
    </div>
  )
}