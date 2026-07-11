import React from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import type { YearRow } from '../hooks/usePortfolioProjection';
import { BASE_YEAR } from '../constants/financialParams';

const UUI = {
  brand700: '#6D28D9',
  brand600: '#7C3AED',
  brand500: '#8B5CF6',
  brand300: '#A78BFA',
  brand200: '#EDE9FE',
  growth500: '#17B26A',
  reference: '#A1A1AA',   // grey (Principal line, §3.11)
  neutral900: '#181D27',
  neutral500: '#717680',
  neutral200: '#E9EAEB',
  neutral100: '#F5F5F5',
  white: '#FFFFFF',
  fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

export type PerfHorizon = 10 | 20 | 30;

const formatCompact = (v: number): string => {
  const sign = v < 0 ? '-' : '';
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${sign}$${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `${sign}$${Math.round(a / 1_000)}K`;
  return `${sign}$${Math.round(a)}`;
};

const MiniTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-lg" style={{ fontFamily: UUI.fontFamily }}>
      <p className="text-xs font-semibold text-neutral-900 mb-1">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs text-neutral-600">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span>{entry.name}:</span>
          <span className="font-medium text-neutral-900">{formatCompact(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

// §3.11 axis type - 11px/400 #A1A1AA (the prototype's chart-axis grey)
const sharedXAxis = {
  axisLine: false as const,
  tickLine: false as const,
  tickMargin: 8,
  tick: { fontSize: 11, fontWeight: 400, fill: '#A1A1AA' },
  padding: { left: 10, right: 10 },
};

/**
 * Even-index tick spacing for the categorical year axis.
 *
 * Recharts' 'preserveStartEnd' thins labels with an algorithm that can leave
 * uneven gaps (e.g. 2030 2031 2032 clustered then a wide jump). Returning a
 * fixed integer interval makes Recharts render ticks at indices 0, N, 2N, …,
 * which are equally spaced on a category axis - so the labels are always
 * visually evenly distributed, stepping up sequentially by a constant number
 * of years rather than squeezing in extras.
 */
const evenTickInterval = (count: number): number => {
  if (count <= 11) return 0; // few enough points - show every year
  return Math.ceil(count / 10) - 1; // ~10 evenly spaced labels
};

const sharedYAxis = {
  axisLine: false as const,
  tickLine: false as const,
  width: 48,
  tick: { fontSize: 11, fontWeight: 400, fill: '#A1A1AA' },
  tickFormatter: (v: number) => formatCompact(v),
};

const calYear = (year: number) => String(BASE_YEAR + year - 1);

interface BriefChartProps {
  yearRows: YearRow[];
  horizon: PerfHorizon;
  /**
   * Purchase-moment anchor (year 0). The engine only emits rows from
   * yearsOwned >= 1 (one full year after purchase), so without this the first
   * plotted point already includes a year of growth. When provided, the growth
   * chart starts from the deposit-level equity at the purchase year and the
   * cashflow chart starts from the real year-1 net cashflow, then both track the
   * true calendar years (`yearLabel = purchaseYear + yearsOwned`).
   */
  purchase?: { year: number; propertyValue: number; equity: number };
}

/**
 * Total Performance Projections - the hero multi-series chart.
 * Plots cumulative principal paid, cumulative net cashflow, cumulative capital
 * growth, and total performance including principal, over the selected horizon.
 */
export const BriefTotalPerformanceChart: React.FC<BriefChartProps & { hiddenKeys?: string[] }> = ({ yearRows, horizon, hiddenKeys = [] }) => {
  const rows = yearRows.filter(r => r.year >= 1 && r.year <= horizon);
  if (!rows.length) return null;

  // Loan at purchase: year-0 balance if present, else the largest balance seen.
  const purchaseRow = yearRows.find(r => r.year === 0);
  const loanAtPurchase = purchaseRow
    ? purchaseRow.loanBalance
    : Math.max(...yearRows.map(r => r.loanBalance));

  const data = rows.map(r => {
    const principalPaid = Math.max(0, Math.round(loanAtPurchase - r.loanBalance));
    return {
      year: calYear(r.year),
      principalPaid,
      netCashflow: Math.round(r.netCashflowCumulative),
      capitalGrowth: Math.round(r.capitalGrowthCumulative),
      totalIncPrincipal: Math.round(r.totalPerformance + principalPaid),
    };
  });

  // Round-number Y frame + sparse 5-year X ticks incl. the last year
  // (same §3.9a/§3.5 system as the plan charts; prototype shows
  // 2026/2031/2036/2041/2045 and $300K-step Y ticks).
  const allVals = data.flatMap(d => [d.principalPaid, d.netCashflow, d.capitalGrowth]);
  const maxV = Math.max(0, ...allVals);
  const minV = Math.min(0, ...allVals);
  const niceCeil = (v: number) => {
    if (v <= 0) return 1_000_000;
    const pow = Math.pow(10, Math.floor(Math.log10(v)));
    for (const s of [1, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (v <= s * pow) return s * pow;
    return 10 * pow;
  };
  // Half-step ticks below zero (prototype: −$150K under $300K steps) so the
  // negative region only takes the room it needs.
  const step = niceCeil(maxV) / 4;
  const below = minV < 0 ? Math.ceil(Math.abs(minV) / (step / 2)) : 0;
  const yTicks = [
    ...Array.from({ length: below }, (_, i) => -(below - i) * (step / 2)),
    ...Array.from({ length: 5 }, (_, i) => i * step),
  ];
  const xTicks = data
    .map(d => d.year)
    .filter((y, i, arr) => i % 5 === 0 || i === arr.length - 1);

  // Mid (Yr 10-ish) + end value labels overlaid on each line (§3.11).
  const lastIdx = data.length - 1;
  const midIdx = Math.max(0, Math.round(lastIdx / 2));
  const makeLabel = (color: string) => (props: any) => {
    const { x, y, value, index } = props;
    if (index !== midIdx && index !== lastIdx) return null;
    const isEnd = index === lastIdx;
    return (
      <text
        x={isEnd ? x + 6 : x}
        y={isEnd ? y + 3 : y - 8}
        fill={color}
        fontSize={11}
        fontWeight={600}
        textAnchor={isEnd ? 'start' : 'middle'}
        fontFamily={UUI.fontFamily}
      >
        {formatCompact(value)}
      </text>
    );
  };

  return (
    <div className="h-full min-h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 48, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#F0F1F4" />
          <XAxis dataKey="year" {...sharedXAxis} ticks={xTicks} interval={0} />
          <YAxis {...sharedYAxis} domain={[yTicks[0], yTicks[yTicks.length - 1]]} ticks={yTicks} />
          <Tooltip content={<MiniTooltip />} cursor={{ stroke: UUI.brand600, strokeWidth: 1.5 }} />
          <ReferenceLine y={0} stroke="#D5D5DB" />
          {/* Capital growth - violet ink */}
          <Line type="monotone" dataKey="capitalGrowth" name="Capital growth" stroke="#7C3AED" strokeWidth={2.75} dot={false} isAnimationActive={false} hide={hiddenKeys.includes('capitalGrowth')}>
            {!hiddenKeys.includes('capitalGrowth') && <LabelList dataKey="capitalGrowth" content={makeLabel('#7C3AED')} />}
          </Line>
          {/* Net cashflow - violet fill */}
          <Line type="monotone" dataKey="netCashflow" name="Net cashflow" stroke="#8B5CF6" strokeWidth={2.75} dot={false} isAnimationActive={false} hide={hiddenKeys.includes('netCashflow')}>
            {!hiddenKeys.includes('netCashflow') && <LabelList dataKey="netCashflow" content={makeLabel('#8B5CF6')} />}
          </Line>
          {/* Principal paid down - muted grey */}
          <Line type="monotone" dataKey="principalPaid" name="Principal paid down" stroke="#98A2B3" strokeWidth={2.5} dot={false} isAnimationActive={false} hide={hiddenKeys.includes('principalPaid')}>
            {!hiddenKeys.includes('principalPaid') && <LabelList dataKey="principalPaid" content={makeLabel('#98A2B3')} />}
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// ── Dashboard-matched projection charts ─────────────────────────────────────
// These reproduce the main dashboard's chart language exactly so the Next
// Purchase Brief reads with the same clarity as Dashboard → Total Equity and
// Net Cashflow. The data stays scoped to this single next purchase (yearRows),
// but every visual token - fills, gridlines, axes, $0 baseline, tooltip - is
// copied from CashflowChart.tsx / InvestmentTimelineChart.tsx.

const CHART = {
  brand600: '#7C3AED',   // cashflow line + tooltip dot
  fill: '#8B5CF6',       // equity line + area fill
  reference: '#C4C4CC',  // dashed Portfolio Value reference line
  axis: '#A1A1AA',       // §3.5 axis ticks
  gridline: '#F0F1F4',   // §3.9 value gridlines
  cashZero: '#D5D5DB',   // §3.3 signed-fill zero line
  equityZero: '#E4E7EC', // §3.9 equity $0 baseline
  neutral900: '#181D27',
  neutral700: '#404040',
  neutral500: '#717680',
  neutral200: '#E9EAEB',
  success: '#17B26A',
  white: '#FFFFFF',
  fontFamily: UUI.fontFamily,
} as const;

// Round $ axis tick - matches CashflowChart.fmtTick ($0 / $Xk / $X.XM, signed).
const axisTick = (v: number) => {
  const a = Math.abs(v);
  const s = v < 0 ? '-' : '';
  if (a >= 1_000_000) return `${s}$${(a / 1_000_000).toFixed(a % 1_000_000 ? 1 : 0)}M`;
  if (a >= 1_000) return `${s}$${Math.round(a / 1_000)}k`;
  return `${s}$${a}`;
};

// Sparse X ticks - every 5 years + the last year (§3.5).
const sparseYearTicks = (years: string[]): string[] => {
  if (years.length === 0) return [];
  const nums = years.map(Number);
  const first = nums[0];
  const last = nums[nums.length - 1];
  const xt = years.filter((_, i) => (nums[i] - first) % 5 === 0);
  if (Number(xt[xt.length - 1]) !== last) xt.push(years[years.length - 1]);
  return xt;
};

// Shared dashboard-style tooltip card (§ CashflowChart / InvestmentTimelineChart).
const DashTooltip: React.FC<{
  active?: boolean;
  label?: string;
  rows: { key: string; label: string; display: string; color: string; valueColor: string; dashed?: boolean }[];
}> = ({ active, label, rows }) => {
  if (!active) return null;
  return (
    <div
      style={{
        background: CHART.white,
        border: `1px solid ${CHART.neutral200}`,
        borderRadius: 8,
        padding: '12px 16px',
        fontFamily: CHART.fontFamily,
        fontSize: 14,
        boxShadow: '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -2px rgba(0, 0, 0, 0.06)',
      }}
    >
      <p style={{ fontWeight: 600, color: CHART.neutral900, marginBottom: 8, fontSize: 14 }}>{label}</p>
      {rows.map(row => (
        <div key={row.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 4 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: CHART.neutral500 }}>
            {row.dashed ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                <span style={{ width: 3, height: 3, borderRadius: '50%', background: row.color }} />
                <span style={{ width: 3, height: 3, borderRadius: '50%', background: row.color }} />
              </span>
            ) : (
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: row.color, flexShrink: 0 }} />
            )}
            {row.label}
          </span>
          <span style={{ fontWeight: 600, color: row.valueColor }}>{row.display}</span>
        </div>
      ))}
    </div>
  );
};

/**
 * Cashflow projection - mirrors Dashboard → Net Cashflow (CashflowChart.tsx).
 * Solid violet line + signed ~14% fill straddling the $0 baseline, round $
 * ticks with $0 present, sparse year axis.
 */
export const BriefCashflowChart: React.FC<BriefChartProps> = ({ yearRows, horizon, purchase }) => {
  // Real rows use the engine's true calendar year (yearLabel = purchaseYear +
  // yearsOwned), not a BASE_YEAR offset.
  const realRows = yearRows
    .filter(r => r.year >= 1 && r.year <= horizon)
    .map(r => ({ year: r.yearLabel, netCashflow: Math.round(r.netCashflow) }));

  // The purchase moment anchors the series so the axis aligns with the growth
  // chart, but it starts at the real net cashflow you carry from day one (year 1)
  // rather than an artificial $0.
  const data = [
    ...(purchase && realRows.length > 0
      ? [{ year: String(purchase.year), netCashflow: realRows[0].netCashflow }]
      : []),
    ...realRows,
  ];

  if (!data.length) return null;

  // Signed round-number Y frame with $0 always present (§3.9).
  const vals = data.map(d => d.netCashflow);
  const lo = Math.min(0, ...vals);
  const hi = Math.max(0, ...vals);
  const rawStep = Math.max(1, (hi - lo) / 4);
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const niceLo = Math.floor(lo / step) * step;
  const niceHi = Math.ceil(hi / step) * step;
  const yTicks: number[] = [];
  for (let v = niceLo; v <= niceHi + step / 2; v += step) yTicks.push(Math.round(v));
  const xTicks = sparseYearTicks(data.map(d => d.year));

  const CashflowTooltip = ({ active, payload, label }: any) => {
    const net = payload?.[0]?.value ?? 0;
    return (
      <DashTooltip
        active={active && payload?.length}
        label={label}
        rows={[{
          key: 'net',
          label: 'Net Cashflow',
          display: `${net >= 0 ? '+' : '-'}$${Math.abs(net).toLocaleString()}/yr`,
          color: CHART.brand600,
          valueColor: net >= 0 ? CHART.success : CHART.neutral500,
        }]}
      />
    );
  };

  return (
    <div style={{ flex: 1, minHeight: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="briefCashflowSignedFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.brand600} stopOpacity={0.14} />
              <stop offset="100%" stopColor={CHART.brand600} stopOpacity={0.14} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={CHART.gridline} />
          <XAxis
            dataKey="year"
            ticks={xTicks}
            interval={0}
            tick={{ fontSize: 9, fill: CHART.axis, fontFamily: CHART.fontFamily }}
            axisLine={false}
            tickLine={false}
            tickMargin={10}
            padding={{ left: 12, right: 10 }}
          />
          <YAxis
            domain={[niceLo, niceHi]}
            ticks={yTicks}
            tickFormatter={axisTick}
            tick={{ fontSize: 9, fill: CHART.axis, fontFamily: CHART.fontFamily }}
            axisLine={false}
            tickLine={false}
            width={42}
          />
          <ReferenceLine y={0} stroke={CHART.cashZero} strokeWidth={1} />
          <Tooltip content={<CashflowTooltip />} cursor={{ stroke: CHART.brand600, strokeWidth: 2 }} />
          <Area
            type="monotone"
            dataKey="netCashflow"
            name="Net Cashflow"
            stroke={CHART.brand600}
            strokeWidth={2.5}
            fill="url(#briefCashflowSignedFill)"
            baseValue={0}
            dot={false}
            isAnimationActive={false}
            activeDot={{ fill: CHART.white, stroke: CHART.brand600, strokeWidth: 2, r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * Growth projection - mirrors Dashboard → Total Equity (InvestmentTimelineChart).
 * Violet hero line + subtle 10%→0 gradient fill, round-number Y ceiling, sparse
 * year axis, $0 baseline one step stronger than the gridlines.
 */
export const BriefGrowthChart: React.FC<BriefChartProps> = ({ yearRows, horizon, purchase }) => {
  // Real rows use the engine's true calendar year (yearLabel = purchaseYear +
  // yearsOwned). The purchase moment (year 0) anchors the series at the
  // deposit-level equity + purchase price, so growth reads from what you own on
  // day one rather than jumping in a year ahead already grown.
  const data = [
    ...(purchase
      ? [{
          year: String(purchase.year),
          totalEquity: Math.round(purchase.equity),
          portfolioValue: Math.round(purchase.propertyValue),
        }]
      : []),
    ...yearRows
      .filter(r => r.year >= 1 && r.year <= horizon)
      .map(r => ({
        year: r.yearLabel,
        totalEquity: Math.round(r.equity),
        portfolioValue: Math.round(r.propertyValue),
      })),
  ];

  if (!data.length) return null;

  // Round-number Y frame - 4 even ticks up to a nice ceiling (§3.9a).
  // Portfolio Value sits above equity, so the ceiling keys off it.
  const max = Math.max(0, ...data.map(d => Math.max(d.totalEquity, d.portfolioValue)));
  const niceCeil = (v: number) => {
    if (v <= 0) return 1_000_000;
    const pow = Math.pow(10, Math.floor(Math.log10(v)));
    for (const s of [1, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (v <= s * pow) return s * pow;
    return 10 * pow;
  };
  const yCeil = niceCeil(max);
  const yTicks = [0, 1, 2, 3, 4].map(i => (yCeil * i) / 4);
  const xTicks = sparseYearTicks(data.map(d => d.year));

  const EquityTooltip = ({ active, payload, label }: any) => {
    const equity = payload?.find((p: any) => p.dataKey === 'totalEquity')?.value ?? 0;
    const portfolio = payload?.find((p: any) => p.dataKey === 'portfolioValue')?.value ?? 0;
    const rows = [
      {
        key: 'equity',
        label: 'Total Equity',
        display: formatCompact(equity),
        color: CHART.fill,
        valueColor: CHART.neutral700,
        dashed: false,
        sortValue: equity,
      },
      {
        key: 'portfolio',
        label: 'Portfolio Value',
        display: formatCompact(portfolio),
        color: CHART.reference,
        valueColor: CHART.neutral500,
        dashed: true,
        sortValue: portfolio,
      },
    ].sort((a, b) => b.sortValue - a.sortValue);
    return <DashTooltip active={active && payload?.length} label={label} rows={rows} />;
  };

  return (
    <div style={{ flex: 1, minHeight: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="briefEquityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.fill} stopOpacity={0.1} />
              <stop offset="100%" stopColor={CHART.fill} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={CHART.gridline} />
          <XAxis
            dataKey="year"
            ticks={xTicks}
            interval={0}
            tick={{ fontSize: 9, fill: CHART.axis, fontFamily: CHART.fontFamily }}
            axisLine={false}
            tickLine={false}
            tickMargin={10}
            padding={{ left: 12, right: 10 }}
          />
          <YAxis
            domain={[0, yCeil]}
            ticks={yTicks}
            tickFormatter={axisTick}
            tick={{ fontSize: 9, fill: CHART.axis, fontFamily: CHART.fontFamily }}
            axisLine={false}
            tickLine={false}
            width={42}
          />
          <ReferenceLine y={0} stroke={CHART.equityZero} strokeWidth={1} />
          <Tooltip content={<EquityTooltip />} cursor={{ stroke: CHART.brand600, strokeWidth: 2 }} />
          {/* Portfolio Value - dashed reference line (no fill), drawn first so
              the equity hero line sits on top (mirrors InvestmentTimelineChart). */}
          <Area
            type="monotone"
            dataKey="portfolioValue"
            name="Portfolio Value"
            stroke={CHART.reference}
            strokeWidth={2}
            strokeDasharray="5 5"
            fill="none"
            dot={false}
            isAnimationActive={false}
            activeDot={{ fill: CHART.white, stroke: CHART.reference, strokeWidth: 2, r: 4 }}
          />
          <Area
            type="monotone"
            dataKey="totalEquity"
            name="Total Equity"
            stroke={CHART.fill}
            strokeWidth={2.5}
            fill="url(#briefEquityGradient)"
            dot={false}
            isAnimationActive={false}
            activeDot={{ fill: CHART.white, stroke: CHART.brand600, strokeWidth: 2, r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
