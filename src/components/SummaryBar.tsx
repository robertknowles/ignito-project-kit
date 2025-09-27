import React from 'react'
import { usePropertySelection } from '../contexts/PropertySelectionContext'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator'
import { useDataAssumptions } from '../contexts/DataAssumptionsContext'

export const SummaryBar = () => {
  const { calculations } = usePropertySelection()
  const { calculatedValues, profile } = useInvestmentProfile()
  const { timelineProperties } = useAffordabilityCalculator()
  const { globalFactors, getPropertyData } = useDataAssumptions()

  // Calculate actual KPIs based on timeline results
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
    
    let finalPortfolioValue = profile.portfolioValue
    let totalDebt = profile.currentDebt
    let annualRentalIncome = 0
    let annualLoanRepayments = 0
    let cashRequired = 0

    // Add existing portfolio growth
    if (profile.portfolioValue > 0) {
      const yearsGrowth = timelineEnd - 2025
      finalPortfolioValue = profile.portfolioValue * Math.pow(1 + growthRate, yearsGrowth)
    }

    feasibleProperties.forEach(property => {
      const yearsOwned = timelineEnd - property.affordableYear
      const propertyData = getPropertyData(property.title)
      
      if (propertyData && yearsOwned >= 0) {
        // Calculate final property value with growth
        const propertyGrowthRate = parseFloat(propertyData.growth) / 100
        const finalPropertyValue = property.cost * Math.pow(1 + propertyGrowthRate, yearsOwned)
        finalPortfolioValue += finalPropertyValue
        
        // Add to debt
        totalDebt += property.loanAmount
        
        // Calculate annual rental income (yield on final value)
        const yieldRate = parseFloat(propertyData.yield) / 100
        annualRentalIncome += finalPropertyValue * yieldRate
        
        // Calculate annual loan repayments (interest only)
        annualLoanRepayments += property.loanAmount * interestRate
        
        // Add to cash required
        cashRequired += property.depositRequired
      }
    })

    const totalEquity = Math.max(0, finalPortfolioValue - totalDebt)
    const annualCashflow = annualRentalIncome - annualLoanRepayments

    return {
      finalPortfolioValue: Math.round(finalPortfolioValue),
      totalProperties: feasibleProperties.length,
      annualCashflow: Math.round(annualCashflow),
      totalEquity: Math.round(totalEquity),
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