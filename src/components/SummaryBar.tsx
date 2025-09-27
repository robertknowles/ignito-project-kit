import React from 'react'
import { usePropertySelection } from '../contexts/PropertySelectionContext'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'

export const SummaryBar = () => {
  const { calculations } = usePropertySelection()
  const { calculatedValues, profile } = useInvestmentProfile()

  // Calculate estimated values based on selections
  const estimatedPortfolioValue = calculations.totalCost > 0 ? calculations.totalCost * 1.5 : 0 // Rough growth estimate
  const estimatedAnnualCashflow = calculations.totalProperties * 8400 // Average $8,400 per property
  const estimatedTotalEquity = estimatedPortfolioValue * 0.3 // Assume 30% equity after growth
  const cashRequired = calculations.totalDepositRequired

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
          <p className="text-[#111827] font-medium">{formatCurrency(estimatedPortfolioValue)}</p>
        </div>
        <div className="text-center">
          <h4 className="text-xs text-[#6b7280] mb-2">Properties</h4>
          <p className="text-[#111827] font-medium">{calculations.totalProperties}</p>
        </div>
        <div className="text-center">
          <h4 className="text-xs text-[#6b7280] mb-2">Annual Cashflow</h4>
          <p className="text-[#111827] font-medium">{formatCurrency(estimatedAnnualCashflow)}</p>
        </div>
        <div className="text-center">
          <h4 className="text-xs text-[#6b7280] mb-2">Total Equity</h4>
          <p className="text-[#111827] font-medium">{formatCurrency(estimatedTotalEquity)}</p>
        </div>
        <div className="text-center">
          <h4 className="text-xs text-[#6b7280] mb-2">Cash Required</h4>
          <p className="text-[#111827] font-medium">{formatCurrency(cashRequired)}</p>
        </div>
      </div>
    </div>
  )
}