import React, { useMemo } from 'react'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { useChartDataGenerator } from '../hooks/useChartDataGenerator'
import type { TimelineProperty } from '../types/property'
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext'
import { TourStep } from '@/components/TourManager'
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface SummaryBarProps {
  scenarioData?: {
    timelineProperties: TimelineProperty[];
    profile: InvestmentProfileData;
  };
  noBorder?: boolean;
}

export const SummaryBar: React.FC<SummaryBarProps> = ({ scenarioData, noBorder }) => {
  const { profile: contextProfile } = useInvestmentProfile()

  // Use scenarioData if provided (multi-scenario mode), otherwise use context
  const profile = scenarioData?.profile ?? contextProfile

  // Use the same data source as the charts for consistency
  // This ensures the summary bar shows the exact same values as the final year on the charts
  const { portfolioGrowthData, monthlyHoldingCost } = useChartDataGenerator(scenarioData)

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

  // Calculate progress towards goals
  const equityProgress = profile.equityGoal > 0
    ? Math.min((kpis.totalEquity / profile.equityGoal) * 100, 100)
    : 0

  // Holding cost progress: how close to cashflow neutral ($0/mo)
  // Positive cashflow = 100%, negative = scaled toward 0%
  const holdingCostProgress = monthlyHoldingCost.total >= 0
    ? 100
    : Math.max(0, 100 - Math.abs(monthlyHoldingCost.total) / 20) // -$2000/mo = 0%, $0 = 100%

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
          {/* Portfolio Value (no progress bar) */}
          <div className="flex flex-col items-center justify-center border-r border-gray-100 py-2 px-4">
            <span className="metric-label mb-0.5">Portfolio Value</span>
            <span className="metric-value-sm whitespace-nowrap text-slate-900 font-semibold">
              {formatCurrency(kpis.finalPortfolioValue)}
            </span>
          </div>

          {/* Equity with Progress Bar */}
          <div className="flex flex-col items-center justify-center border-r border-gray-100 py-2 px-4">
            <span className="metric-label mb-0.5">Net Equity</span>
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

          {/* Monthly Holding Cost with per-property tooltip */}
          <div className="flex flex-col items-center justify-center py-2 px-4">
            <span className="metric-label mb-0.5">Monthly Holding Cost</span>
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <span className={`metric-value-sm whitespace-nowrap font-semibold cursor-help ${monthlyHoldingCost.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(Math.round(monthlyHoldingCost.total))}
                    <span className="text-[10px] text-slate-400 font-normal ml-1">/mo</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[250px] p-3">
                  {monthlyHoldingCost.byProperty.length > 0 ? (
                    monthlyHoldingCost.byProperty.map(p => (
                      <div key={p.instanceId} className="flex justify-between text-xs gap-4">
                        <span className="text-slate-600">{p.propertyTitle}</span>
                        <span className={p.monthlyCost >= 0 ? 'text-green-600' : 'text-rose-600'}>
                          {formatCurrency(Math.round(p.monthlyCost))}/mo
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400">Add properties to see breakdown</p>
                  )}
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
            <div className="w-full mt-1.5 h-1 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  holdingCostProgress >= 100 ? 'bg-green-500' : 'bg-slate-900'
                }`}
                style={{ width: `${Math.max(0, holdingCostProgress)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    </TourStep>
  )
}
