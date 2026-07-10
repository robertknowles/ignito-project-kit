import React, { useMemo } from 'react'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { usePortfolioProjection } from '../hooks/usePortfolioProjection'
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator'
import type { TimelineProperty } from '../types/property'
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext'
import { TourStep } from '@/components/TourManager'
import { TrendUp01Icon, BarChartSquare02Icon, Wallet02Icon, CalendarCheck01Icon } from '@/components/icons/PropertyIcons'

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

  const { portfolioGrowthData, cashflowData } = usePortfolioProjection(scenarioData)

  // Final year values from charts
  const kpis = useMemo(() => {
    const finalPortfolioData = portfolioGrowthData[portfolioGrowthData.length - 1]

    if (!finalPortfolioData) {
      return {
        portfolioValue: 0,
        propertyEquity: 0,
        totalEquity: 0,
        cashFromSales: 0,
        terminalYear: null as number | null,
      }
    }

    const parsedYear = parseInt(String(finalPortfolioData.year), 10)
    return {
      portfolioValue: finalPortfolioData.portfolioValue,
      propertyEquity: finalPortfolioData.propertyEquity,
      totalEquity: finalPortfolioData.equity,
      cashFromSales: finalPortfolioData.cashFromSales ?? 0,
      terminalYear: Number.isFinite(parsedYear) ? parsedYear : null,
    }
  }, [portfolioGrowthData])

  // Monthly net cashflow from the most recent year's data.
  // Computed from components (rentalIncome − expenses − loanRepayments) rather
  // than reading the `cashflow` field directly. This guarantees the KPI matches
  // what the CashflowChart displays in its Net tooltip - both now use identical
  // arithmetic on the same fields. Defensive against any upstream cashflow-field
  // aggregation drift.
  const monthlyCashflow = useMemo(() => {
    const finalData = cashflowData[cashflowData.length - 1]
    if (!finalData) return 0
    const rentalIncome = finalData.rentalIncome ?? 0
    const expenses = finalData.expenses ?? 0
    const loanRepayments = finalData.loanRepayments ?? 0
    const annualNet = rentalIncome - expenses - loanRepayments
    return Math.round(annualNet / 12)
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

    // Calculate readiness - how much of deposit is funded now
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
    <div id="summary-bar-container" className="grid grid-cols-4 gap-3">
      {/* Portfolio Value */}
      <div className="bg-white rounded-lg border border-[#E9EAEB] px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#717680]">Portfolio Value</span>
          <TrendUp01Icon size={14} color="#A4A7AE" />
        </div>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <span className="text-lg font-medium text-[#181D27] tracking-tight">
            {formatCurrency(kpis.portfolioValue)}
          </span>
          {kpis.terminalYear && (
            <span className="text-xs text-[#A4A7AE]">by {kpis.terminalYear}</span>
          )}
        </div>
      </div>

      {/* Total Equity */}
      <div className="bg-white rounded-lg border border-[#E9EAEB] px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#717680]">Total Equity</span>
          <BarChartSquare02Icon size={14} color="#A4A7AE" />
        </div>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <span
            className="text-lg font-medium text-[#181D27] tracking-tight"
            title={kpis.cashFromSales > 0 ? `Property equity ${formatCurrency(kpis.propertyEquity)} + cash from sales ${formatCurrency(kpis.cashFromSales)}` : undefined}
          >
            {formatCurrency(kpis.totalEquity)}
          </span>
          {kpis.terminalYear && (
            <span className="text-xs text-[#A4A7AE]">by {kpis.terminalYear}</span>
          )}
        </div>
      </div>

      {/* Net Cashflow */}
      <div className="bg-white rounded-lg border border-[#E9EAEB] px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#717680]">Net Cashflow</span>
          <Wallet02Icon size={14} color="#A4A7AE" />
        </div>
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="text-lg font-medium text-[#181D27] tracking-tight">
            {formatMonthlyCashflow(monthlyCashflow)}
          </span>
          <span className="text-xs text-[#A4A7AE]">/mo</span>
          {kpis.terminalYear && (
            <span className="text-xs text-[#A4A7AE]">by {kpis.terminalYear}</span>
          )}
        </div>
      </div>

      {/* Next Purchase */}
      <div className="bg-white rounded-lg border border-[#E9EAEB] px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#717680]">Next Purchase</span>
          <CalendarCheck01Icon size={14} color="#A4A7AE" />
        </div>
        <div className="mt-0.5">
          {nextPurchase ? (
            <span className="text-lg font-medium text-[#181D27] tracking-tight">
              {nextPurchase.year}
            </span>
          ) : (
            <span className="text-lg font-medium text-[#181D27] tracking-tight">-</span>
          )}
        </div>
      </div>
    </div>
    </TourStep>
  )
}
