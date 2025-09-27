import React from 'react'
import { usePropertySelection } from '../contexts/PropertySelectionContext'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { useSimulationEngine } from '../hooks/useSimulationEngine'
import { useDataAssumptions } from '../contexts/DataAssumptionsContext'

export const SummaryBar = () => {
  const { calculations } = usePropertySelection()
  const { calculatedValues, profile } = useInvestmentProfile()
  const { simulationResults, isSimulationComplete } = useSimulationEngine()
  const { globalFactors } = useDataAssumptions()

  // Calculate final KPIs from simulation results
  const calculateFinalKPIs = () => {
    if (!isSimulationComplete || simulationResults.yearlyData.length === 0) {
      // Return zeros when no simulation data
      return {
        finalPortfolioValue: 0,
        totalEquity: 0,
        annualCashflow: 0,
        propertiesCount: 0,
        cashRequired: 0,
      }
    }

    const finalYear = simulationResults.yearlyData[simulationResults.yearlyData.length - 1]
    const ownedProperties = simulationResults.finalState.ownedProperties
    const interestRate = parseFloat(globalFactors.interestRate) / 100

    // Final Portfolio Value: sum of all owned property values at end of timeline
    const finalPortfolioValue = ownedProperties.reduce((total, property) => {
      return total + property.currentValue
    }, 0)

    // Total Equity: Final Portfolio Value - Total Debt
    const totalEquity = finalPortfolioValue - simulationResults.finalState.totalDebt

    // Annual Cashflow: Total annual rental income - Total annual loan repayments
    const totalRentalIncome = ownedProperties.reduce((total, property) => {
      return total + (property.currentValue * property.yieldPercent / 100)
    }, 0)
    
    const totalLoanRepayments = ownedProperties.reduce((total, property) => {
      return total + (property.loanAmount * interestRate)
    }, 0)
    
    const annualCashflow = totalRentalIncome - totalLoanRepayments

    // Properties Count: number of properties in ownedProperties array
    const propertiesCount = ownedProperties.length

    // Cash Required: total deposits used throughout simulation
    const cashRequired = ownedProperties.reduce((total, property) => {
      return total + property.depositPaid
    }, 0)

    return {
      finalPortfolioValue,
      totalEquity,
      annualCashflow,
      propertiesCount,
      cashRequired,
    }
  }

  const kpis = calculateFinalKPIs()

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
          <p className="text-[#111827] font-medium">{kpis.propertiesCount}</p>
        </div>
        <div className="text-center">
          <h4 className="text-xs text-[#6b7280] mb-2">Annual Cashflow</h4>
          <p className={`font-medium ${kpis.annualCashflow >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
            {kpis.annualCashflow >= 0 ? '+' : ''}{formatCurrency(kpis.annualCashflow)}
          </p>
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