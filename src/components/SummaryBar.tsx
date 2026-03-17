import React, { useMemo } from 'react'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { useChartDataGenerator } from '../hooks/useChartDataGenerator'
import type { TimelineProperty } from '../types/property'
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext'
import { TourStep } from '@/components/TourManager'

interface SummaryBarProps {
  scenarioData?: {
    timelineProperties: TimelineProperty[];
    profile: InvestmentProfileData;
  };
}

export const SummaryBar: React.FC<SummaryBarProps> = ({ scenarioData }) => {
  const { profile: contextProfile } = useInvestmentProfile()

  // Use scenarioData if provided (multi-scenario mode), otherwise use context
  const profile = scenarioData?.profile ?? contextProfile

  // Use the same data source as the charts for consistency
  // This ensures the summary bar shows the exact same values as the final year on the charts
  const { portfolioGrowthData, cashflowData } = useChartDataGenerator(scenarioData)

  // Get the final year's data from the charts (same source the charts display)
  const kpis = useMemo(() => {
    const finalPortfolioData = portfolioGrowthData[portfolioGrowthData.length - 1]

    if (!finalPortfolioData) {
      return {
        finalPortfolioValue: 0,
        totalEquity: 0,
      }
    }

    return {
      finalPortfolioValue: finalPortfolioData.portfolioValue,
      totalEquity: finalPortfolioData.equity,
    }
  }, [portfolioGrowthData])

  // Get the final year's annual cashflow
  const annualCashflow = useMemo(() => {
    const finalCashflow = cashflowData[cashflowData.length - 1]
    return finalCashflow?.cashflow ?? 0
  }, [cashflowData])

  // Calculate progress towards goals
  const equityProgress = profile.equityGoal > 0
    ? Math.min((kpis.totalEquity / profile.equityGoal) * 100, 100)
    : 0

  const cashflowProgress = profile.cashflowGoal > 0
    ? Math.min((annualCashflow / profile.cashflowGoal) * 100, 100)
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
      content="Your at-a-glance KPIs: Portfolio Value, Equity, and Monthly Holding Cost with progress towards goals. These update in real-time as you modify the strategy."
      order={8}
      position="top"
    >
    <div id="summary-bar-container" className="grid grid-cols-3 gap-4">
      {/* Portfolio Value */}
      <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
        <span className="metric-label">Portfolio Value</span>
        <div className="mt-1.5">
          <span className="stat-number">
            {formatCurrency(kpis.finalPortfolioValue)}
          </span>
        </div>
      </div>

      {/* Net Equity */}
      <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
        <span className="metric-label">Net Equity</span>
        <div className="mt-1.5">
          <span className="stat-number">
            {formatCurrency(kpis.totalEquity)}
          </span>
          {equityProgress >= 100 && <span className="ml-1.5 text-blue-600 text-sm">✓</span>}
        </div>
        <span className="meta mt-1 block">/ {formatCurrency(profile.equityGoal)}</span>
      </div>

      {/* Annual Cashflow */}
      <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
        <span className="metric-label">Annual Cashflow</span>
        <div className="mt-1.5">
          <span className="stat-number">
            {formatCurrency(Math.round(annualCashflow))}
          </span>
          {cashflowProgress >= 100 && <span className="ml-1.5 text-blue-600 text-sm">✓</span>}
        </div>
        <span className="meta mt-1 block">/ {formatCurrency(profile.cashflowGoal)}</span>
      </div>
    </div>
    </TourStep>
  )
}
