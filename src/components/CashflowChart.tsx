import React, { useMemo } from 'react'
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
  Label,
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
  brand600: '#7F56D9',
  neutral900: '#171717',
  neutral700: '#404040',
  neutral600: '#525252',
  neutral500: '#737373',
  neutral200: '#E5E5E5',
  neutral100: '#F5F5F5',
  neutral50: '#FAFAFA',
  white: '#FFFFFF',
  success: '#00A63E',
  fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

interface CashflowChartProps {
  scenarioData?: {
    timelineProperties: TimelineProperty[];
    profile: InvestmentProfileData;
  };
}

/** Cashflow positive marker — badge pinned to top of chart */
const CashflowPositiveMarker = ({ viewBox }: any) => {
  if (!viewBox) return null;
  const cx = viewBox.x + (viewBox.width ?? 0) / 2;
  const cy = viewBox.y + (viewBox.height ?? 0) / 2;
  const badgeY = 4;
  return (
    <g>
      <line x1={cx} y1={badgeY + 22} x2={cx} y2={cy - 6} stroke={UUI.brand600} strokeWidth={1.5} strokeDasharray="3 2" />
      <rect x={cx - 42} y={badgeY} width={84} height={22} rx={11} fill={UUI.brand600} />
      <text x={cx} y={badgeY + 14.5} textAnchor="middle" fill="white" fontSize={10} fontWeight={600} fontFamily={UUI.fontFamily}>
        CF Positive ✓
      </text>
    </g>
  );
};

/**
 * Cashflow Projection — UUI Dashboard 03 "Sales" chart style
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

    return capped.map(d => ({
      year: d.year,
      income: Math.round(d.rentalIncome),
      expenses: Math.round(d.expenses + d.loanRepayments),
      netCashflow: Math.round(d.cashflow),
    }));
  }, [cashflowData, profile.timelineYears]);

  // Find where net cashflow goes positive and STAYS positive (no dips back below zero)
  const cashflowPositivePoint = useMemo(() => {
    const hasNegative = data.some(d => d.netCashflow < 0);
    if (!hasNegative) return null;

    let lastNegativeIndex = -1;
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].netCashflow < 0) {
        lastNegativeIndex = i;
        break;
      }
    }
    if (lastNegativeIndex < 0 || lastNegativeIndex >= data.length - 1) return null;
    return data[lastNegativeIndex + 1];
  }, [data]);

  // ── UUI-style tooltip ─────────────────────────────────────────────────────
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const income = payload.find((p: any) => p.dataKey === 'income')?.value ?? 0;
    const expenses = payload.find((p: any) => p.dataKey === 'expenses')?.value ?? 0;
    const net = data.find(d => d.year === label)?.netCashflow ?? (income - expenses);

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
            display: 'flex',
            justifyContent: 'space-between',
            gap: 24,
            paddingTop: 8,
            marginTop: 4,
            borderTop: `1px solid ${UUI.neutral100}`,
          }}
        >
          <span style={{ fontWeight: 600, color: UUI.neutral900 }}>Net</span>
          <span style={{ fontWeight: 600, color: net >= 0 ? UUI.success : UUI.neutral500 }}>
            {net >= 0 ? '+' : '-'}${Math.abs(net).toLocaleString()}/yr
          </span>
        </div>
      </div>
    );
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 16, left: 16, bottom: 0 }}
        >
          <defs>
            {/* UUI striped vertical-line fill pattern */}
            <pattern id="cashflowVerticalLines" width="8" height="100%" patternUnits="userSpaceOnUse">
              <line x1="4" y1="0" x2="4" y2="100%" stroke={UUI.brand600} strokeWidth="1" strokeOpacity="0.35" />
            </pattern>
          </defs>

          {/* Faint horizontal grid — UUI uses ~#F5F5F5 (nearly invisible) */}
          <CartesianGrid
            strokeDasharray="0"
            stroke={UUI.neutral100}
            strokeOpacity={0.8}
            vertical={false}
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
            padding={{ left: 20, right: 10 }}
          />

          {/* No Y-axis — matches UUI Sales chart exactly */}

          {/* Secondary axis keeps hidden series out of the primary Y domain */}
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke={UUI.neutral200} strokeWidth={1} />

          {/* Hidden series so income/expenses data is available in the tooltip payload */}
          <Line dataKey="income" name="Rental income" stroke="transparent" dot={false} activeDot={false} isAnimationActive={false} />
          <Line dataKey="expenses" name="Expenses" stroke="transparent" dot={false} activeDot={false} isAnimationActive={false} />

          {/* Net Cashflow — striped area fill + solid line (UUI pattern) */}
          <Area
            type="monotone"
            dataKey="netCashflow"
            name="Net Cashflow"
            stroke={UUI.brand600}
            strokeWidth={2}
            fill="url(#cashflowVerticalLines)"
            dot={false}
            isAnimationActive={false}
          />

          {/* Cashflow positive milestone marker */}
          {cashflowPositivePoint && (
            <ReferenceDot
              x={cashflowPositivePoint.year}
              y={cashflowPositivePoint.netCashflow}
              r={6}
              fill={UUI.brand600}
              stroke="white"
              strokeWidth={2.5}
            >
              <Label content={<CashflowPositiveMarker />} />
            </ReferenceDot>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
