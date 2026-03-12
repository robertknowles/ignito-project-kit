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
}

export const SummaryBar: React.FC<SummaryBarProps> = ({ scenarioData }) => {
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
    <div id="summary-bar-container" className="grid grid-cols-3 gap-3">
      {/* Portfolio Value */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <span className="metric-label">Portfolio Value</span>
        <div className="mt-1">
          <span className="stat-number">
            {formatCurrency(kpis.finalPortfolioValue)}
          </span>
        </div>
      </div>

      {/* Net Equity */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <span className="metric-label">Net Equity</span>
        <div className="mt-1">
          <span className="stat-number">
            {formatCurrency(kpis.totalEquity)}
          </span>
          {equityProgress >= 100 && <span className="ml-1.5 text-blue-600 text-sm">✓</span>}
        </div>
        <span className="meta mt-1 block">/ {formatCurrency(profile.equityGoal)}</span>
      </div>

      {/* Monthly Holding Cost */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <span className="metric-label">Monthly Holding Cost</span>
        <div className="mt-1">
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <span className="stat-number cursor-help">
                  {formatCurrency(Math.round(monthlyHoldingCost.total))}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[250px] p-3">
                {monthlyHoldingCost.byProperty.length > 0 ? (
                  monthlyHoldingCost.byProperty.map(p => (
                    <div key={p.instanceId} className="flex justify-between text-xs gap-4">
                      <span className="text-gray-600">{p.propertyTitle}</span>
                      <span className="text-gray-700">
                        {formatCurrency(Math.round(p.monthlyCost))}/mo
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-400">Add properties to see breakdown</p>
                )}
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>
        <span className="meta mt-1 block">/mo</span>
      </div>
    </div>
    </TourStep>
  )
}
