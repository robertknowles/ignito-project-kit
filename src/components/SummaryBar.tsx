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
        cashRequired: 0
      }
    }

    const timelineEnd = 2025 + profile.timelineYears
    const growthRate = parseFloat(globalFactors.growthRate) / 100
    const interestRate = parseFloat(globalFactors.interestRate) / 100
    
    // Convert feasible properties to PropertyPurchase format
    const purchases: PropertyPurchase[] = feasibleProperties.map(property => {
      const propertyData = getPropertyData(property.title)
      return {
        year: property.affordableYear,
        cost: property.cost,
        loanAmount: property.loanAmount,
        depositRequired: property.depositRequired,
        title: property.title,
        rentalYield: propertyData ? parseFloat(propertyData.yield) / 100 : 0.04, // Default 4% if no data
        growthRate: propertyData ? parseFloat(propertyData.growth) / 100 : growthRate,
        interestRate: interestRate
      }
    })

    // Calculate metrics for existing portfolio
    const existingMetrics = calculateExistingPortfolioMetrics(
      profile.portfolioValue,
      profile.currentDebt,
      timelineEnd - 2025,
      growthRate,
      interestRate
    )

    // Calculate metrics for new purchases with detailed expense analysis
    const newPurchasesMetrics = calculatePortfolioMetrics(
      purchases,
      timelineEnd,
      growthRate,
      interestRate,
      DEFAULT_PROPERTY_EXPENSES
    )

    // Combine metrics
    const totalMetrics = combineMetrics(existingMetrics, newPurchasesMetrics)

    // Calculate cash required
    const cashRequired = feasibleProperties.reduce((sum, property) => sum + property.depositRequired, 0)

    return {
      finalPortfolioValue: Math.round(totalMetrics.portfolioValue),
      totalProperties: feasibleProperties.length,
      annualCashflow: Math.round(totalMetrics.annualCashflow),
      totalEquity: Math.round(totalMetrics.totalEquity),
      cashRequired: Math.round(cashRequired)
    }
  }

  const kpis = calculateSummaryKPIs()

  // Format currency values
  const formatCurrency = (value: number) => {
    if (value === 0) return '$0'
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${Math.round(value / 1000)}k`
    return `$${Math.round(value).toLocaleString()}`
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-5 gap-6">
        <div className="text-center">
          <h4 className="text-xs text-[#6b7280] mb-2">Final Portfolio Value</h4>
          <p className="text-[#111827] font-medium">{formatCurrency(kpis.finalPortfolioValue)}</p>
        </div>
        <div className="text-center">
          <h4 className="text-xs text-[#6b7280] mb-2">Properties</h4>
          <p className="text-[#111827] font-medium">{kpis.totalProperties}</p>
        </div>
        <div className="text-center">
          <h4 className="text-xs text-[#6b7280] mb-2">Annual Cashflow</h4>
          <p className="text-[#111827] font-medium">{formatCurrency(kpis.annualCashflow)}</p>
        </div>
        <div className="text-center">
          <h4 className="text-xs text-[#6b7280] mb-2">Total Equity</h4>
          <p className="text-[#111827] font-medium">{formatCurrency(kpis.totalEquity)}</p>
        </div>
        <div className="text-center">
          <h4 className="text-xs text-[#6b7280] mb-2">Cash Required</h4>
          <p className="text-[#111827] font-medium">{formatCurrency(kpis.cashRequired)}</p>
        </div>
      </div>
    </div>
  )
}