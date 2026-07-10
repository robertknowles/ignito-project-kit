import React, { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import { usePortfolioProjection } from '../hooks/usePortfolioProjection'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator'
import { usePropertyInstance } from '../contexts/PropertyInstanceContext'
import { BASE_YEAR } from '../constants/financialParams'
import { getCategoryLabel } from '../utils/propertyCells'
import type { TimelineProperty } from '../types/property'
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext'

// ── PropPath chart tokens (prototype-exact - PropPath Design System §3) ──────
const UUI = {
  brand600: '#7C3AED',
  ink: '#7C3AED',        // pin outlines / goal glyph
  fill: '#8B5CF6',       // hero line + anchor dots + area fill
  reference: '#C4C4CC',  // dashed Portfolio Value reference line
  axis: '#A1A1AA',       // axis tick labels
  gridline: '#F0F1F4',   // faint horizontal gridlines
  negative: '#F04438',   // challenging / breach (sign only)
  neutral900: '#181D27',
  neutral700: '#404040',
  neutral600: '#535862',
  neutral500: '#717680',
  neutral400: '#A3A3A3',
  neutral200: '#E9EAEB',
  neutral100: '#F5F5F5',
  white: '#FFFFFF',
  success: '#17B26A',
  fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

interface InvestmentTimelineChartProps {
  scenarioData?: {
    timelineProperties: TimelineProperty[];
    profile: InvestmentProfileData;
  };
}

/** Equity-goal marker - target pin on a stem (PropPath §3.9, replaces the pill) */
const goalPin = (cx: number, cy: number) => {
  const pinY = cy - 30;
  return (
    <g style={{ pointerEvents: 'none' }}>
      <line x1={cx} y1={cy} x2={cx} y2={pinY} stroke={UUI.fill} strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={3} fill={UUI.fill} />
      <g transform={`translate(${cx}, ${pinY})`}>
        <circle cx={0} cy={0} r={8.5} fill={UUI.white} stroke={UUI.ink} strokeWidth={1.4} />
        <circle cx={0} cy={0.2} r={3.1} fill="none" stroke={UUI.ink} strokeWidth={1.1} />
        <circle cx={0} cy={0.2} r={1} fill={UUI.ink} />
        <text x={0} y={-12} textAnchor="middle" fontFamily={UUI.fontFamily} fontSize={9} fontWeight={600} fill={UUI.ink}>Goal</text>
      </g>
    </g>
  );
};

/**
 * InvestmentTimelineChart - UUI charts-base style
 *
 * Three series following UUI's multi-series Area pattern:
 *   Portfolio Value - brand-600 line + gradient fill (primary)
 *   Total Equity   - brand-400 line, no fill (secondary)
 *   Savings Only   - brand-700 dashed line, no fill (tertiary)
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
      purchaseLabel: [...new Set(y.purchaseDetails?.map(p => getCategoryLabel(p.propertyType || p.propertyTitle)) ?? [])].join(', '),
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

  // ── Round-number Y frame (§3.9a) + sparse X ticks (§3.5) ──────────────────
  const { yCeil, yTicks, xTicks } = useMemo(() => {
    const max = Math.max(0, ...data.map(d => Math.max(d.totalEquity ?? 0, d.portfolioValue ?? 0)))
    const niceCeil = (v: number) => {
      if (v <= 0) return 1_000_000
      const pow = Math.pow(10, Math.floor(Math.log10(v)))
      for (const s of [1, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (v <= s * pow) return s * pow
      return 10 * pow
    }
    const ceil = niceCeil(max)
    const ticks = [0, 1, 2, 3, 4].map(i => (ceil * i) / 4)
    const yrs = data.map(d => d.year)
    const first = yrs[0], last = yrs[yrs.length - 1]
    const xt = yrs.filter(y => (y - first) % 5 === 0)
    if (last != null && xt[xt.length - 1] !== last) xt.push(last)
    return { yCeil: ceil, yTicks: ticks, xTicks: xt }
  }, [data])

  // Axis-tick format (§1.4 - compact, round increments)
  const fmtTick = (v: number) => {
    if (v === 0) return '$0'
    if (v >= 1e6) { const m = v / 1e6; return `$${Number.isInteger(m) ? m : m.toFixed(1)}M` }
    return `$${Math.round(v / 1e3)}k`
  }

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
          margin={{ top: 20, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            {/* Subtle violet area fill under the hero line (§3.9) */}
            <linearGradient id="timelineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={UUI.fill} stopOpacity={0.1} />
              <stop offset="100%" stopColor={UUI.fill} stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* Faint horizontal gridlines on the round-number frame (§3.9) */}
          <CartesianGrid
            vertical={false}
            stroke={UUI.gridline}
            strokeOpacity={1}
          />

          {/* X-axis - sparse year ticks (§3.5), first point inset clear of labels */}
          <XAxis
            dataKey="year"
            ticks={xTicks}
            interval={0}
            tick={{ fontSize: 9, fill: UUI.axis, fontFamily: UUI.fontFamily }}
            axisLine={false}
            tickLine={false}
            tickMargin={10}
            padding={{ left: 12, right: 10 }}
          />

          {/* Full-height labelled $ Y axis - round ceiling, 50px gutter (§3.9a) */}
          <YAxis
            domain={[0, yCeil]}
            ticks={yTicks}
            tickFormatter={fmtTick}
            tick={{ fontSize: 9, fill: UUI.axis, fontFamily: UUI.fontFamily }}
            axisLine={false}
            tickLine={false}
            width={42}
          />
          {/* $0 baseline - one step stronger than the gridlines (§3.9) */}
          <ReferenceLine y={0} stroke="#E4E7EC" strokeWidth={1} />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{
              stroke: UUI.brand600,
              strokeWidth: 2,
            }}
          />

          {/* Portfolio Value - dashed reference-grey line, no fill (secondary) */}
          <Area
            type="monotone"
            dataKey="portfolioValue"
            name="Portfolio Value"
            stroke={UUI.reference}
            strokeDasharray="5 5"
            strokeWidth={2}
            fill="none"
            dot={false}
            isAnimationActive={false}
            activeDot={{
              fill: UUI.white,
              stroke: UUI.ink,
              strokeWidth: 2,
              r: 4,
            }}
          />

          {/* Total Equity - violet hero line + subtle fill (primary) */}
          <Area
            type="monotone"
            dataKey="totalEquity"
            name="Total Equity"
            stroke={UUI.fill}
            strokeWidth={2.5}
            fill="url(#timelineGradient)"
            dot={false}
            isAnimationActive={false}
            activeDot={{
              fill: UUI.white,
              stroke: UUI.ink,
              strokeWidth: 2,
              r: 4,
            }}
          />

          {/* Equity-goal milestone - target pin on a stem (§3.9) */}
          {equityGoalPoint && (
            <ReferenceDot
              x={equityGoalPoint.year}
              y={equityGoalPoint.totalEquity}
              r={0}
              shape={(props: any) => goalPin(props.cx, props.cy)}
            />
          )}

          {/* Purchase markers - violet house-pins on stems (§3.1/§3.9) */}
          {purchasePoints.map((pt) => (
            <ReferenceDot
              key={`purchase-${pt.year}`}
              x={pt.year}
              y={pt.portfolioValue}
              r={0}
              shape={(props: any) => {
                const { cx, cy } = props
                const baseLift = 26   // gap from the line to the lowest pin head
                const stemGap = 22    // vertical gap between stacked pin heads
                const propertyTypes = pt.purchasePropertyTypes ?? []
                const instanceIds = pt.purchaseInstanceIds ?? []
                const labels = pt.purchaseLabel ? pt.purchaseLabel.split(', ') : []
                const renderCount = Math.max(1, propertyTypes.length)
                const topPinY = cy - baseLift - (renderCount - 1) * stemGap

                return (
                  <g>
                    {/* anchor dot on the line + stem up to the topmost pin */}
                    <circle cx={cx} cy={cy} r={3} fill={UUI.fill} />
                    <line x1={cx} y1={cy} x2={cx} y2={topPinY} stroke={UUI.fill} strokeWidth={1.5} />
                    {Array.from({ length: renderCount }).map((_, idx) => {
                      const instanceId = instanceIds[idx]
                      const label = labels[idx] || pt.purchaseLabel || 'property'
                      const pinY = cy - baseLift - idx * stemGap
                      const tlProp = instanceId ? timelineProperties.find(p => p.instanceId === instanceId) : undefined
                      const isChallenging = tlProp?.status === 'challenging' && !(instanceId && instances[instanceId]?.alertDismissed)
                      const strokeCol = isChallenging ? UUI.negative : UUI.ink
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
                          {/* Inverted house pin - accent disc, white ring, solid
                              white house silhouette + door (reads as a house,
                              not a tree, at 17px). */}
                          <circle cx={cx} cy={pinY} r={8.5} fill={strokeCol} stroke={UUI.white} strokeWidth={1.5} />
                          <path
                            transform={`translate(${cx}, ${pinY})`}
                            d="M 0 -4.3 L 4.1 -0.9 L 4.1 4.1 L -4.1 4.1 L -4.1 -0.9 Z"
                            fill={UUI.white}
                            style={{ pointerEvents: 'none' }}
                          />
                          <rect
                            x={cx - 1.1} y={pinY + 1.5} width={2.2} height={2.8} rx={0.5}
                            fill={strokeCol}
                            style={{ pointerEvents: 'none' }}
                          />
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
