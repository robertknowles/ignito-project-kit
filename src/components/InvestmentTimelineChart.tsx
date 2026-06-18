import React, { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  Label,
  ResponsiveContainer,
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import { usePortfolioProjection } from '../hooks/usePortfolioProjection'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator'
import { usePropertyInstance } from '../contexts/PropertyInstanceContext'
import { BASE_YEAR } from '../constants/financialParams'
import { getPropertyIconPath } from './icons/PropertyIconPaths'
import type { TimelineProperty } from '../types/property'
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext'

// ── UUI Design Tokens (from UUI charts-base source + DOM inspection) ────────
const UUI = {
  brand600: '#7F56D9',
  neutral900: '#171717',
  neutral700: '#404040',
  neutral600: '#525252',
  neutral500: '#737373',
  neutral400: '#A3A3A3',
  neutral200: '#E5E5E5',
  neutral100: '#F5F5F5',
  white: '#FFFFFF',
  success: '#00A63E',
  fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

interface InvestmentTimelineChartProps {
  scenarioData?: {
    timelineProperties: TimelineProperty[];
    profile: InvestmentProfileData;
  };
}

/** Equity goal reached marker — badge pinned to top of chart */
const EquityGoalMarker = ({ viewBox }: any) => {
  if (!viewBox) return null;
  const cx = viewBox.x + (viewBox.width ?? 0) / 2;
  const cy = viewBox.y + (viewBox.height ?? 0) / 2;
  const badgeY = 4;
  return (
    <g>
      <line x1={cx} y1={badgeY + 22} x2={cx} y2={cy - 6} stroke={UUI.brand600} strokeWidth={1.5} strokeDasharray="3 2" />
      <rect x={cx - 32} y={badgeY} width={64} height={22} rx={11} fill={UUI.brand600} />
      <text x={cx} y={badgeY + 14.5} textAnchor="middle" fill="white" fontSize={10} fontWeight={600} fontFamily={UUI.fontFamily}>
        Goal ✓
      </text>
    </g>
  );
};

/**
 * InvestmentTimelineChart — UUI charts-base style
 *
 * Three series following UUI's multi-series Area pattern:
 *   Portfolio Value — brand-600 line + gradient fill (primary)
 *   Total Equity   — brand-400 line, no fill (secondary)
 *   Savings Only   — brand-700 dashed line, no fill (tertiary)
 *
 * Gradient uses brand-700 at 70%→0% opacity (matching UUI source).
 * Active dots: white fill + brand-600 stroke.
 */
export const InvestmentTimelineChart: React.FC<InvestmentTimelineChartProps> = ({ scenarioData }) => {
  const navigate = useNavigate()
  const { profile: contextProfile } = useInvestmentProfile()
  const { timelineProperties: contextTimelineProps } = useAffordabilityCalculator()
  const { instances } = usePropertyInstance()

  const profile = scenarioData?.profile ?? contextProfile
  const timelineProperties = scenarioData?.timelineProperties ?? contextTimelineProps

  const { roadmapData: { years } } = usePortfolioProjection(scenarioData)

  const data = useMemo(() => {
    if (years.length === 0) {
      return [{ year: BASE_YEAR, portfolioValue: 0, totalEquity: 0, doNothingBalance: 0, purchaseInYear: false, purchaseLabel: '' }]
    }
    return years.map((y) => ({
      year: y.year,
      portfolioValue: y.portfolioValueRaw,
      totalEquity: y.totalEquityRaw,
      doNothingBalance: y.doNothingBalance ?? 0,
      purchaseInYear: y.purchaseInYear,
      purchaseLabel: y.purchaseDetails?.map(p => p.propertyTitle).join(', ') ?? '',
      purchasePropertyTypes: y.purchaseDetails?.map(p => p.propertyType) ?? [],
      purchaseInstanceIds: y.purchaseDetails?.map(p => p.instanceId) ?? [],
    }))
  }, [years])

  const purchasePoints = useMemo(() =>
    data.filter(d => d.purchaseInYear),
  [data])

  const equityGoalPoint = useMemo(() => {
    if (!profile.equityGoal || profile.equityGoal <= 0) return null;
    return data.find(d => d.totalEquity >= profile.equityGoal) ?? null;
  }, [data, profile.equityGoal])

  const formatYAxis = (value: number): string => {
    if (value === 0) return '$0'
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value.toFixed(0)}`
  }

  // ── UUI-style tooltip ─────────────────────────────────────────────────────
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null

    const portfolio = payload.find((p: any) => p.dataKey === 'portfolioValue')?.value ?? 0
    const equity = payload.find((p: any) => p.dataKey === 'totalEquity')?.value ?? 0
    const dataPoint = data.find(d => d.year === label)

    const fmt = (v: number) => {
      if (v >= 1000000) return `$${(v / 1000000).toFixed(2)}M`
      if (v >= 1000) return `$${Math.round(v / 1000).toLocaleString()}K`
      return `$${Math.round(v).toLocaleString()}`
    }

    // Order rows to match each line's vertical position at this point (top line first).
    const lines = [
      { key: 'equity', label: 'Total Equity', value: equity, color: UUI.brand600, dashed: false },
      { key: 'portfolio', label: 'Portfolio Value', value: portfolio, color: UUI.neutral500, dashed: true },
    ].sort((a, b) => b.value - a.value)

    return (
      <div
        style={{
          background: UUI.white,
          border: `1px solid ${UUI.neutral200}`,
          borderRadius: 8,
          padding: '12px 16px',
          fontFamily: UUI.fontFamily,
          fontSize: 14,
          boxShadow: '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -2px rgba(0, 0, 0, 0.06)',
        }}
      >
        <p style={{ fontWeight: 600, color: UUI.neutral900, marginBottom: 8, fontSize: 14 }}>{label}</p>
        {dataPoint?.purchaseInYear && (
          <p style={{ fontSize: 12, color: UUI.brand600, fontWeight: 500, marginBottom: 8 }}>
            Purchase: {dataPoint.purchaseLabel}
          </p>
        )}
        {lines.map(line => (
          <div key={line.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {line.dashed ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                  <div style={{ width: 3, height: 3, borderRadius: '50%', background: line.color }} />
                  <div style={{ width: 3, height: 3, borderRadius: '50%', background: line.color }} />
                </div>
              ) : (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: line.color, flexShrink: 0 }} />
              )}
              <span style={{ color: UUI.neutral500 }}>{line.label}</span>
            </div>
            <span style={{ fontWeight: 500, color: UUI.neutral700 }}>{fmt(line.value)}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart
          data={data}
          margin={{ top: 12, right: 16, left: 16, bottom: 0 }}
        >
          <defs>
            {/* UUI LineChart04 gradient: brand-600 at 70% → 0% opacity */}
            <linearGradient id="timelineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={UUI.brand600} stopOpacity={0.7} />
              <stop offset="95%" stopColor={UUI.brand600} stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* UUI grid: horizontal only, neutral-100, very faint */}
          <CartesianGrid
            vertical={false}
            stroke={UUI.neutral100}
            strokeOpacity={1}
          />

          {/* X-axis — UUI text-tertiary = neutral-600, text-xs = 12px */}
          <XAxis
            dataKey="year"
            tick={{
              fontSize: 12,
              fontWeight: 600,
              fill: UUI.neutral500,
              fontFamily: UUI.fontFamily,
            }}
            axisLine={false}
            tickLine={false}
            tickMargin={10}
            interval="preserveStartEnd"
            padding={{ left: 10, right: 10 }}
          />

          {/* No Y-axis */}

          <Tooltip
            content={<CustomTooltip />}
            cursor={{
              stroke: UUI.brand600,
              strokeWidth: 2,
            }}
          />

          {/* Portfolio Value — neutral-500 dashed line, no fill (secondary context) */}
          <Area
            type="monotone"
            dataKey="portfolioValue"
            name="Portfolio Value"
            stroke={UUI.neutral500}
            strokeDasharray="6 4"
            strokeWidth={2}
            fill="none"
            dot={false}
            isAnimationActive={false}
            activeDot={{
              fill: UUI.white,
              stroke: UUI.brand600,
              strokeWidth: 2,
              r: 4,
            }}
          />

          {/* Total Equity — brand-600 solid line + gradient fill (primary, hero line) */}
          <Area
            type="monotone"
            dataKey="totalEquity"
            name="Total Equity"
            stroke={UUI.brand600}
            strokeWidth={2}
            fill="url(#timelineGradient)"
            fillOpacity={0.1}
            dot={false}
            isAnimationActive={false}
            activeDot={{
              fill: UUI.white,
              stroke: UUI.brand600,
              strokeWidth: 2,
              r: 4,
            }}
          />

          {/* Equity goal milestone marker */}
          {equityGoalPoint && (
            <ReferenceDot
              x={equityGoalPoint.year}
              y={equityGoalPoint.totalEquity}
              r={6}
              fill={UUI.brand600}
              stroke="white"
              strokeWidth={2.5}
            >
              <Label content={<EquityGoalMarker />} />
            </ReferenceDot>
          )}

          {/* Purchase markers — property type icons on portfolio line */}
          {purchasePoints.map((pt) => (
            <ReferenceDot
              key={`purchase-${pt.year}`}
              x={pt.year}
              y={pt.portfolioValue}
              r={0}
              shape={(props: any) => {
                const { cx, cy } = props
                const iconSize = 14
                const bgSize = 26
                const stackGap = 2
                const propertyTypes = pt.purchasePropertyTypes ?? []
                const instanceIds = pt.purchaseInstanceIds ?? []
                const labels = pt.purchaseLabel ? pt.purchaseLabel.split(', ') : []
                const renderCount = Math.max(1, propertyTypes.length)

                return (
                  <g>
                    {Array.from({ length: renderCount }).map((_, idx) => {
                      const propertyType = propertyTypes[idx] ?? ''
                      const iconPath = getPropertyIconPath(propertyType)
                      const instanceId = instanceIds[idx]
                      const label = labels[idx] || pt.purchaseLabel || 'property'
                      const iconCy = cy - idx * (bgSize + stackGap)
                      const tlProp = instanceId ? timelineProperties.find(p => p.instanceId === instanceId) : undefined
                      const isChallenging = tlProp?.status === 'challenging' && !(instanceId && instances[instanceId]?.alertDismissed)
                      const handleClick = () => {
                        if (instanceId) {
                          navigate('/portfolio', { state: { propertyInstanceId: instanceId } })
                        } else {
                          navigate('/portfolio')
                        }
                      }
                      return (
                        <g
                          key={instanceId || `${pt.year}-${idx}`}
                          onClick={handleClick}
                          style={{ cursor: 'pointer' }}
                          role="button"
                          aria-label={`Open ${label} in Per-Property view`}
                        >
                          <title>{`Open ${label}`}</title>
                          <circle cx={cx} cy={iconCy} r={bgSize / 2} fill={UUI.white} stroke={isChallenging ? '#EF4444' : UUI.neutral200} strokeWidth={isChallenging ? 2 : 1} />
                          <svg
                            x={cx - iconSize / 2}
                            y={iconCy - iconSize / 2}
                            width={iconSize}
                            height={iconSize}
                            viewBox="0 0 24 24"
                            fill="none"
                            style={{ pointerEvents: 'none' }}
                          >
                            <path d={iconPath} stroke={isChallenging ? '#EF4444' : UUI.neutral900} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </g>
                      )
                    })}
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
