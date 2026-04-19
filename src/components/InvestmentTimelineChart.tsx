import React, { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  ResponsiveContainer,
} from 'recharts'
import { useRoadmapData } from '../hooks/useRoadmapData'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator'
import { CHART_COLORS, CHART_STYLE, PROPERTY_COLORS } from '../constants/chartColors'
import { getPropertyIconPath } from './icons/PropertyIconPaths'
import type { TimelineProperty } from '../types/property'
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext'

interface InvestmentTimelineChartProps {
  scenarioData?: {
    timelineProperties: TimelineProperty[];
    profile: InvestmentProfileData;
  };
}

/**
 * InvestmentTimelineChart — Standard AreaChart replacement for ChartWithRoadmap
 *
 * Three lines: Portfolio Value (blue), Total Equity (purple), Do Nothing (dashed grey).
 * Uses identical Recharts config as CashflowChart for visual uniformity.
 */
export const InvestmentTimelineChart: React.FC<InvestmentTimelineChartProps> = ({ scenarioData }) => {
  const { profile: contextProfile } = useInvestmentProfile()
  const { timelineProperties: contextTimelineProps } = useAffordabilityCalculator()

  const profile = scenarioData?.profile ?? contextProfile
  const timelineProperties = scenarioData?.timelineProperties ?? contextTimelineProps

  const { years } = useRoadmapData(scenarioData ? { profile, timelineProperties } : undefined)

  const data = useMemo(() => {
    if (years.length === 0) {
      return [{ year: 2025, portfolioValue: 0, totalEquity: 0, doNothingBalance: 0, purchaseInYear: false, purchaseLabel: '' }]
    }
    return years.map((y) => ({
      year: y.year,
      portfolioValue: y.portfolioValueRaw,
      totalEquity: y.totalEquityRaw,
      doNothingBalance: y.doNothingBalance ?? 0,
      purchaseInYear: y.purchaseInYear,
      purchaseLabel: y.purchaseDetails?.map(p => p.propertyTitle).join(', ') ?? '',
      purchasePropertyTypes: y.purchaseDetails?.map(p => p.propertyType) ?? [],
    }))
  }, [years])

  // Extract purchase points for ReferenceDot markers
  const purchasePoints = useMemo(() =>
    data.filter(d => d.purchaseInYear),
  [data])

  const formatYAxis = (value: number): string => {
    if (value === 0) return '$0'
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value.toFixed(0)}`
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null

    const portfolio = payload.find((p: any) => p.dataKey === 'portfolioValue')?.value ?? 0
    const equity = payload.find((p: any) => p.dataKey === 'totalEquity')?.value ?? 0
    const doNothing = payload.find((p: any) => p.dataKey === 'doNothingBalance')?.value ?? 0
    const dataPoint = data.find(d => d.year === label)

    const fmt = (v: number) => {
      if (v >= 1000000) return `$${(v / 1000000).toFixed(2)}M`
      if (v >= 1000) return `$${Math.round(v / 1000).toLocaleString()}K`
      return `$${Math.round(v).toLocaleString()}`
    }

    return (
      <div
        className="bg-white border rounded-xl"
        style={{
          borderColor: '#E9EAEB',
          padding: '12px 16px',
          fontSize: 13,
          boxShadow: '0px 12px 16px -4px rgba(0, 0, 0, 0.08), 0px 4px 6px -2px rgba(0, 0, 0, 0.03)',
        }}
      >
        <p className="font-semibold text-[#181D27] mb-2">{label}</p>
        {dataPoint?.purchaseInYear && (
          <p className="text-xs text-blue-600 font-medium mb-2">Purchase: {dataPoint.purchaseLabel}</p>
        )}
        <div className="flex justify-between gap-6 mb-1">
          <span className="text-gray-500">Portfolio Value</span>
          <span className="font-medium text-gray-700">{fmt(portfolio)}</span>
        </div>
        <div className="flex justify-between gap-6 mb-1">
          <span className="text-gray-500">Total Equity</span>
          <span className="font-medium text-gray-700">{fmt(equity)}</span>
        </div>
        <div
          className="flex justify-between gap-6 pt-2 mt-1"
          style={{ borderTop: '1px solid #F3F4F6' }}
        >
          <span className="text-gray-500">Savings Only</span>
          <span className="font-medium text-gray-700">{fmt(doNothing)}</span>
        </div>
      </div>
    )
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 0, left: -10, bottom: 0 }}
        >
          <defs>
            <linearGradient id="timelinePortfolioFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#2563EB" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="timelineEquityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.10} />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.01} />
            </linearGradient>
          </defs>

          <CartesianGrid {...CHART_STYLE.grid} />
          <XAxis dataKey="year" {...CHART_STYLE.xAxis} padding={{ left: 20, right: 10 }} />
          <YAxis
            tickFormatter={formatYAxis}
            {...CHART_STYLE.yAxis}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Portfolio Value — solid blue with gradient fill */}
          <Area
            type="monotone"
            dataKey="portfolioValue"
            name="Portfolio Value"
            stroke="#2563EB"
            strokeWidth={2.5}
            fill="url(#timelinePortfolioFill)"
            dot={false}
          />

          {/* Total Equity — solid purple with gradient fill */}
          <Area
            type="monotone"
            dataKey="totalEquity"
            name="Total Equity"
            stroke="#8B5CF6"
            strokeWidth={2}
            fill="url(#timelineEquityFill)"
            dot={false}
          />

          {/* Do Nothing Baseline — dashed grey, no fill */}
          <Area
            type="monotone"
            dataKey="doNothingBalance"
            name="Savings Only"
            stroke={CHART_COLORS.annotationText}
            strokeDasharray="6 4"
            strokeWidth={1.5}
            fill="none"
            dot={false}
            connectNulls
          />

          {/* Purchase markers — property type icons on portfolio line */}
          {purchasePoints.map((pt) => (
            <ReferenceDot
              key={`purchase-${pt.year}`}
              x={pt.year}
              y={pt.portfolioValue}
              r={0}
              shape={(props: any) => {
                const { cx, cy } = props
                const iconPath = getPropertyIconPath(pt.purchasePropertyTypes?.[0] || '')
                const iconSize = 14
                const bgSize = 26
                return (
                  <g>
                    <circle cx={cx} cy={cy} r={bgSize / 2} fill="white" stroke="#E9EAEB" strokeWidth={1} />
                    <svg
                      x={cx - iconSize / 2}
                      y={cy - iconSize / 2}
                      width={iconSize}
                      height={iconSize}
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path d={iconPath} stroke="#181D27" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </g>
                )
              }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
