import React, { useMemo } from 'react'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { useChartDataGenerator } from '../hooks/useChartDataGenerator'
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator'
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
  const { timelineProperties: contextTimelineProps } = useAffordabilityCalculator()

  const profile = scenarioData?.profile ?? contextProfile
  const timelineProperties = scenarioData?.timelineProperties ?? contextTimelineProps

  const { portfolioGrowthData, cashflowData } = useChartDataGenerator(scenarioData)

  // Final year values from charts
  const kpis = useMemo(() => {
    const finalPortfolioData = portfolioGrowthData[portfolioGrowthData.length - 1]

    if (!finalPortfolioData) {
      return {
        portfolioValue: 0,
        totalEquity: 0,
      }
    }

    return {
      portfolioValue: finalPortfolioData.portfolioValue,
      totalEquity: finalPortfolioData.equity,
    }
  }, [portfolioGrowthData])

  // Monthly net cashflow from the most recent year's data
  const monthlyCashflow = useMemo(() => {
    const finalCashflow = cashflowData[cashflowData.length - 1]
    const annual = finalCashflow?.cashflow ?? 0
    return Math.round(annual / 12)
  }, [cashflowData])

  // Next purchase info
  const nextPurchase = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const feasible = timelineProperties.filter(p => p.status === 'feasible')
    const future = feasible.filter(p => Math.floor(p.affordableYear) > currentYear)

    if (future.length === 0) return null

    // Sort by affordable year to find the next one
    future.sort((a, b) => a.affordableYear - b.affordableYear)
    const next = future[0]
    const buyYear = Math.floor(next.affordableYear)

    // Calculate readiness — how much of deposit is funded now
    const fb = next.fundingBreakdown
    const total = (fb.cash || 0) + (fb.equity || 0) + (fb.savings || 0)
    // Simple readiness: cash portion is ready now, rest is future
    const readyNow = fb.cash || 0
    const readinessPct = total > 0 ? Math.min(100, Math.round((readyNow / total) * 100)) : 0

    return {
      year: buyYear,
      title: next.title,
      readinessPct,
    }
  }, [timelineProperties])

  // Format currency values
  const formatCurrency = (value: number) => {
    const absValue = Math.abs(value)
    const sign = value < 0 ? '-' : ''

    if (absValue === 0) return '$0'
    if (absValue >= 1000000) return `${sign}$${(absValue / 1000000).toFixed(2)}M`
    if (absValue >= 1000) return `${sign}$${Math.round(absValue / 1000).toLocaleString()}K`
    return `${sign}$${Math.round(absValue).toLocaleString()}`
  }

  const formatMonthlyCashflow = (value: number) => {
    const absValue = Math.abs(value)
    const sign = value < 0 ? '-' : ''
    return `${sign}$${absValue.toLocaleString()}`
  }

  return (
    <TourStep
      id="summary-bar"
      title="Portfolio Scoreboard"
      content="Your at-a-glance KPIs: Portfolio Value, Equity, Cashflow, and Next Purchase. These update in real-time as you modify the strategy."
      order={8}
      position="top"
    >
    <div id="summary-bar-container" className="grid grid-cols-4 gap-4">
      {/* Portfolio Value */}
      <div className="bg-white rounded-xl border border-[#E9EAEB] p-6">
        <span className="text-sm font-medium text-[#535862]">Portfolio Value</span>
        <div className="mt-2">
          <span className="text-[30px] font-semibold text-[#181D27] tracking-tight leading-tight">
            {formatCurrency(kpis.portfolioValue)}
          </span>
        </div>
      </div>

      {/* Total Equity */}
      <div className="bg-white rounded-xl border border-[#E9EAEB] p-6">
        <span className="text-sm font-medium text-[#535862]">Total Equity</span>
        <div className="mt-2">
          <span className="text-[30px] font-semibold text-[#181D27] tracking-tight leading-tight">
            {formatCurrency(kpis.totalEquity)}
          </span>
        </div>
      </div>

      {/* Net Cashflow */}
      <div className="bg-white rounded-xl border border-[#E9EAEB] p-6">
        <span className="text-sm font-medium text-[#535862]">Net Cashflow</span>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-[30px] font-semibold text-[#181D27] tracking-tight leading-tight">
            {formatMonthlyCashflow(monthlyCashflow)}
          </span>
          <span className="text-sm text-[#717680]">/mo</span>
        </div>
      </div>

      {/* Next Purchase */}
      <div className="bg-white rounded-xl border border-[#E9EAEB] p-6">
        <span className="text-sm font-medium text-[#535862]">Next Purchase</span>
        <div className="mt-2">
          {nextPurchase ? (
            <span className="text-[30px] font-semibold text-[#181D27] tracking-tight leading-tight">
              {nextPurchase.year}
            </span>
          ) : (
            <span className="text-[30px] font-semibold text-[#181D27] tracking-tight leading-tight">—</span>
          )}
        </div>
      </div>
    </div>
    </TourStep>
  )
}
