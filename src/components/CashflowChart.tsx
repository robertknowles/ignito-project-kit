import React, { useMemo } from 'react'
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
  ResponsiveContainer,
} from 'recharts'
import { usePortfolioProjection } from '../hooks/usePortfolioProjection'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator'
import { BASE_YEAR } from '../constants/financialParams'
import type { TimelineProperty } from '../types/property';
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext';

// ── UUI Design Tokens (from live DOM inspection of Dashboard 03) ────────────
const UUI = {
  brand600: '#7C3AED',
  ink: '#7C3AED',   // pin outlines / goal glyph
  fill: '#8B5CF6',  // anchor dots / stems
  neutral900: '#181D27',
  neutral700: '#404040',
  neutral600: '#535862',
  neutral500: '#717680',
  neutral200: '#E9EAEB',
  neutral100: '#F5F5F5',
  neutral50: '#FAFAFA',
  white: '#FFFFFF',
  success: '#17B26A',
  error600: '#F04438',
  gridline: '#F0F1F4',  // §3.9 value gridlines
  zeroLine: '#D5D5DB',  // §3.3 signed-fill zero line
  axis: '#A1A1AA',      // §3.5 axis ticks
  fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

interface CashflowChartProps {
  scenarioData?: {
    timelineProperties: TimelineProperty[];
    profile: InvestmentProfileData;
  };
}

/** Milestone marker - target pin on a stem (PropPath §3.3, replaces the pill) */
const cashGoalPin = (cx: number, cy: number, label: string) => {
  const pinY = cy - 30;
  return (
    <g style={{ pointerEvents: 'none' }}>
      <line x1={cx} y1={cy} x2={cx} y2={pinY} stroke={UUI.fill} strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={3} fill={UUI.fill} />
      <g transform={`translate(${cx}, ${pinY})`}>
        <circle cx={0} cy={0} r={8.5} fill={UUI.white} stroke={UUI.ink} strokeWidth={1.4} />
        <circle cx={0} cy={0.2} r={3.1} fill="none" stroke={UUI.ink} strokeWidth={1.1} />
        <circle cx={0} cy={0.2} r={1} fill={UUI.ink} />
        <text x={0} y={-12} textAnchor="middle" fontFamily={UUI.fontFamily} fontSize={9} fontWeight={600} fill={UUI.ink}>{label}</text>
      </g>
    </g>
  );
};

/**
 * Cashflow Projection - UUI Dashboard 03 "Sales" chart style
 *
 * Area chart with striped vertical-line fill pattern (matching UUI's SVG pattern technique).
 * Net cashflow as single visible line. Income/expenses available in tooltip.
 */
export const CashflowChart: React.FC<CashflowChartProps> = ({ scenarioData }) => {
  const { cashflowData } = usePortfolioProjection(scenarioData)
  const { profile: contextProfile } = useInvestmentProfile()
  const profile = scenarioData?.profile ?? contextProfile

  // Transform data for dual-line format: monthly income vs monthly expenses
  // Cap at timeline end year to match all other dashboard charts
  const data = useMemo(() => {
    const rawData = cashflowData.length > 0 ? cashflowData : [{
      year: String(BASE_YEAR),
      cashflow: 0,
      rentalIncome: 0,
      expenses: 0,
      loanRepayments: 0,
    }];

    const endYear = BASE_YEAR + profile.timelineYears - 1;
    const capped = rawData.filter(d => Number(d.year) <= endYear);

    // Savings floor mirrors the client's stated annual savings below zero - the
    // deepest sustained shortfall they can hold. Raw input, no deployment scaling.
    const annualSavings = Math.max(0, Math.round(profile.annualSavings ?? 0));

    return capped.map(d => ({
      year: d.year,
      income: Math.round(d.rentalIncome),
      expenses: Math.round(d.expenses + d.loanRepayments),
      netCashflow: Math.round(d.cashflow),
      savingsFloor: annualSavings > 0 ? -annualSavings : null,
    }));
  }, [cashflowData, profile.timelineYears, profile.annualSavings]);

  const hasSavingsFloor = data.length > 0 && data[0].savingsFloor != null;

  // Full-height labelled Y axis (§3.9): round-number ticks on the true scale,
  // with $0 always present so the signed-fill zero line reads as a value.
  const { yDomain, yTicks } = useMemo(() => {
    const vals = data.map(d => d.netCashflow);
    const floors = data.map(d => d.savingsFloor).filter((v): v is number => v != null);
    const lo = Math.min(0, ...vals, ...floors);
    const hi = Math.max(0, ...vals);
    const rawStep = Math.max(1, (hi - lo) / 4);
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const norm = rawStep / mag;
    const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
    const niceLo = Math.floor(lo / step) * step;
    const niceHi = Math.ceil(hi / step) * step;
    const ticks: number[] = [];
    for (let v = niceLo; v <= niceHi + step / 2; v += step) ticks.push(Math.round(v));
    return { yDomain: [niceLo, niceHi] as [number, number], yTicks: ticks };
  }, [data]);

  const fmtTick = (v: number) => {
    const a = Math.abs(v);
    const s = v < 0 ? '-' : '';
    if (a >= 1_000_000) return `${s}$${(a / 1_000_000).toFixed(a % 1_000_000 ? 1 : 0)}M`;
    if (a >= 1_000) return `${s}$${Math.round(a / 1_000)}k`;
    return `${s}$${a}`;
  };

  // Sparse X ticks (§3.5) - every 5 years + the last year
  const xTicks = useMemo(() => {
    const yrs = data.map(d => Number(d.year));
    const first = yrs[0], last = yrs[yrs.length - 1];
    const xt = data.map(d => d.year).filter((_, i) => (yrs[i] - first) % 5 === 0);
    if (last != null && Number(xt[xt.length - 1]) !== last) xt.push(data[data.length - 1].year);
    return xt;
  }, [data]);

  // Milestone pin. Primary: the year net cashflow first reaches the client's
  // cash goal and stays there ("Cash goal"). When the goal isn't reached in
  // the window, fall back to durable break-even ("Cashflow positive") so the
  // pin never claims a goal the curve doesn't show.
  const milestonePoint = useMemo(() => {
    const durablyReaches = (threshold: number) => {
      if (!data.some(d => d.netCashflow < threshold)) return null;
      let lastBelow = -1;
      for (let i = data.length - 1; i >= 0; i--) {
        if (data[i].netCashflow < threshold) {
          lastBelow = i;
          break;
        }
      }
      if (lastBelow < 0 || lastBelow >= data.length - 1) return null;
      return data[lastBelow + 1];
    };

    const cashGoal = profile?.cashflowGoal ?? 0;
    if (cashGoal > 0) {
      const goalPoint = durablyReaches(cashGoal);
      if (goalPoint) return { point: goalPoint, label: 'Cash goal' };
    }
    const breakEven = durablyReaches(0);
    return breakEven ? { point: breakEven, label: 'Cashflow positive' } : null;
  }, [data, profile?.cashflowGoal]);

  // ── UUI-style tooltip ─────────────────────────────────────────────────────
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const income = payload.find((p: any) => p.dataKey === 'income')?.value ?? 0;
    const expenses = payload.find((p: any) => p.dataKey === 'expenses')?.value ?? 0;
    const point = data.find(d => d.year === label);
    const net = point?.netCashflow ?? (income - expenses);
    const headroom = point?.savingsFloor != null ? net - point.savingsFloor : null;

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
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 4 }}>
          <span style={{ color: UUI.neutral500 }}>Income</span>
          <span style={{ fontWeight: 500, color: UUI.neutral700 }}>${income.toLocaleString()}/yr</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 4 }}>
          <span style={{ color: UUI.neutral500 }}>Expenses</span>
          <span style={{ fontWeight: 500, color: UUI.neutral700 }}>${expenses.toLocaleString()}/yr</span>
        </div>
        <div
          style={{
            paddingTop: 8,
            marginTop: 4,
            borderTop: `1px solid ${UUI.neutral100}`,
          }}
        >
          {([
            { key: 'net', label: 'Net Cashflow', value: net, dashed: false, bold: true, display: `${net >= 0 ? '+' : '-'}$${Math.abs(net).toLocaleString()}/yr`, valueColor: net >= 0 ? UUI.success : UUI.neutral500 },
            ...(point?.savingsFloor != null ? [{ key: 'savings', label: 'Client Savings Rate', value: point.savingsFloor, dashed: true, bold: false, display: `$${Math.abs(point.savingsFloor).toLocaleString()}/yr`, valueColor: UUI.neutral700 }] : []),
          ] as const)
            .slice()
            .sort((a, b) => b.value - a.value)
            .map(line => (
              <div key={line.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 4 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: line.bold ? 600 : 400, color: line.bold ? UUI.neutral900 : UUI.neutral500 }}>
                  {line.dashed ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                      <span style={{ width: 3, height: 3, borderRadius: '50%', background: UUI.neutral500 }} />
                      <span style={{ width: 3, height: 3, borderRadius: '50%', background: UUI.neutral500 }} />
                    </span>
                  ) : (
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: UUI.brand600, flexShrink: 0 }} />
                  )}
                  {line.label}
                </span>
                <span style={{ fontWeight: line.bold ? 600 : 500, color: line.valueColor }}>{line.display}</span>
              </div>
            ))}
        </div>
        {headroom != null && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginTop: 4 }}>
            <span style={{ color: UUI.neutral500 }}>Headroom</span>
            <span style={{ fontWeight: 500, color: headroom >= 0 ? UUI.neutral700 : UUI.error600 }}>
              {headroom >= 0 ? '+' : '-'}${Math.abs(headroom).toLocaleString()}/yr
            </span>
          </div>
        )}
        {headroom != null && headroom < 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
            <span
              style={{
                background: UUI.error600,
                color: UUI.white,
                fontSize: 10,
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: 11,
              }}
            >
              Exceeds savings
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    // Fills the card (ChartCard content is a flex column); minHeight guards
    // against collapse when the card isn't stretched by a taller sibling.
    <div style={{ flex: 1, minHeight: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            {/* Signed violet fill (§3.3) - ~12% opacity, above and below $0 */}
            <linearGradient id="cashflowSignedFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={UUI.brand600} stopOpacity={0.14} />
              <stop offset="100%" stopColor={UUI.brand600} stopOpacity={0.14} />
            </linearGradient>
          </defs>

          {/* Faint horizontal value gridlines (§3.9) */}
          <CartesianGrid
            strokeDasharray="0"
            stroke={UUI.gridline}
            vertical={false}
          />

          {/* X-axis - sparse grey year ticks (§3.5) */}
          <XAxis
            dataKey="year"
            ticks={xTicks}
            interval={0}
            tick={{
              fontSize: 9,
              fill: UUI.axis,
              fontFamily: UUI.fontFamily,
            }}
            axisLine={false}
            tickLine={false}
            tickMargin={10}
            padding={{ left: 12, right: 10 }}
          />

          {/* Full-height labelled Y axis (§3.9) - round $ ticks, $0 on the zero line */}
          <YAxis
            domain={yDomain}
            ticks={yTicks}
            tickFormatter={fmtTick}
            tick={{ fontSize: 9, fill: UUI.axis, fontFamily: UUI.fontFamily }}
            axisLine={false}
            tickLine={false}
            width={42}
          />
          {/* Hidden axis for tooltip-only series - keeps income/expenses OUT of
              the visible Y scale (they grow far beyond net cashflow and were
              silently stretching the domain, squashing the plot). */}
          <YAxis yAxisId="tooltipOnly" hide />

          <Tooltip content={<CustomTooltip />} />
          {/* Signed-fill zero line (§3.3) - quiet grey baseline */}
          <ReferenceLine y={0} stroke={UUI.zeroLine} strokeWidth={1} />

          {/* Hidden series so income/expenses data is available in the tooltip payload */}
          <Line yAxisId="tooltipOnly" dataKey="income" name="Rental income" stroke="transparent" dot={false} activeDot={false} isAnimationActive={false} />
          <Line yAxisId="tooltipOnly" dataKey="expenses" name="Expenses" stroke="transparent" dot={false} activeDot={false} isAnimationActive={false} />

          {/* Client savings rate - dashed floor mirrored below zero; cashflow must stay above it */}
          {hasSavingsFloor && (
            <Line
              dataKey="savingsFloor"
              name="Client Savings Rate"
              stroke={UUI.neutral500}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          )}

          {/* Net Cashflow - solid violet line + signed fill straddling $0 (§3.3) */}
          <Area
            type="monotone"
            dataKey="netCashflow"
            name="Net Cashflow"
            stroke={UUI.brand600}
            strokeWidth={2.5}
            fill="url(#cashflowSignedFill)"
            baseValue={0}
            dot={false}
            isAnimationActive={false}
          />

          {/* Cashflow milestone - target pin on a stem (§3.3) */}
          {milestonePoint && (
            <ReferenceDot
              x={milestonePoint.point.year}
              y={milestonePoint.point.netCashflow}
              r={0}
              shape={(props: any) => cashGoalPin(props.cx, props.cy, milestonePoint.label)}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
