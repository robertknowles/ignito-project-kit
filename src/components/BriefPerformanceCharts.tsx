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

// §3.11 axis type — 11px/400 #A1A1AA (the prototype's chart-axis grey)
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
 * which are equally spaced on a category axis — so the labels are always
 * visually evenly distributed, stepping up sequentially by a constant number
 * of years rather than squeezing in extras.
 */
const evenTickInterval = (count: number): number => {
  if (count <= 11) return 0; // few enough points — show every year
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
}

/**
 * Total Performance Projections — the hero multi-series chart.
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
          {/* Capital growth — violet ink */}
          <Line type="monotone" dataKey="capitalGrowth" name="Capital growth" stroke="#7C3AED" strokeWidth={2.75} dot={false} isAnimationActive={false} hide={hiddenKeys.includes('capitalGrowth')}>
            {!hiddenKeys.includes('capitalGrowth') && <LabelList dataKey="capitalGrowth" content={makeLabel('#7C3AED')} />}
          </Line>
          {/* Net cashflow — violet fill */}
          <Line type="monotone" dataKey="netCashflow" name="Net cashflow" stroke="#8B5CF6" strokeWidth={2.75} dot={false} isAnimationActive={false} hide={hiddenKeys.includes('netCashflow')}>
            {!hiddenKeys.includes('netCashflow') && <LabelList dataKey="netCashflow" content={makeLabel('#8B5CF6')} />}
          </Line>
          {/* Principal paid down — muted grey */}
          <Line type="monotone" dataKey="principalPaid" name="Principal paid down" stroke="#98A2B3" strokeWidth={2.5} dot={false} isAnimationActive={false} hide={hiddenKeys.includes('principalPaid')}>
            {!hiddenKeys.includes('principalPaid') && <LabelList dataKey="principalPaid" content={makeLabel('#98A2B3')} />}
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// ── Shared single-series area chart for the two standalone projections ──────
// Same chart language as the hero: 11px/400 #A1A1AA axes, #F0F1F4 grid,
// #D5D5DB zero line, round Y ticks (half-step below zero), 5-year X ticks +
// last, and mid/end value labels on the line.
const BriefAreaChart: React.FC<{
  data: { year: string; value: number }[];
  name: string;
  color: string;
  gradientId: string;
  /** 'fade' = plan growth-chart gradient (10%→0); 'signed' = plan Net
      Cashflow flat ~14% wash above and below $0 (§3.3). */
  fillStyle?: 'fade' | 'signed';
}> = ({ data, name, color, gradientId, fillStyle = 'fade' }) => {
  if (!data.length) return null;

  const vals = data.map(d => d.value);
  const maxV = Math.max(0, ...vals);
  const minV = Math.min(0, ...vals);
  const niceCeil = (v: number) => {
    if (v <= 0) return 1_000;
    const pow = Math.pow(10, Math.floor(Math.log10(v)));
    for (const s of [1, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (v <= s * pow) return s * pow;
    return 10 * pow;
  };
  const step = niceCeil(maxV) / 4;
  const below = minV < 0 ? Math.ceil(Math.abs(minV) / (step / 2)) : 0;
  const yTicks = [
    ...Array.from({ length: below }, (_, i) => -(below - i) * (step / 2)),
    ...Array.from({ length: 5 }, (_, i) => i * step),
  ];
  const xTicks = data
    .map(d => d.year)
    .filter((y, i, arr) => i % 5 === 0 || i === arr.length - 1);

  const lastIdx = data.length - 1;
  const midIdx = Math.max(0, Math.round(lastIdx / 2));
  const label = (props: any) => {
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
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 48, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              {fillStyle === 'signed' ? (
                <>
                  <stop offset="0%" stopColor={color} stopOpacity={0.14} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.14} />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor={color} stopOpacity={0.1} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </>
              )}
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#F0F1F4" />
          <XAxis dataKey="year" {...sharedXAxis} ticks={xTicks} interval={0} />
          <YAxis {...sharedYAxis} domain={[yTicks[0], yTicks[yTicks.length - 1]]} ticks={yTicks} />
          <Tooltip content={<MiniTooltip />} cursor={{ stroke: UUI.brand600, strokeWidth: 1.5 }} />
          {minV < 0 && <ReferenceLine y={0} stroke="#D5D5DB" />}
          <Area
            type="monotone"
            dataKey="value"
            name={name}
            stroke={color}
            strokeWidth={2.75}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
          >
            <LabelList dataKey="value" content={label} />
          </Area>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

/** Cashflow Projections — net annual cashflow over the selected horizon. */
export const BriefCashflowChart: React.FC<BriefChartProps> = ({ yearRows, horizon }) => {
  const data = yearRows.filter(r => r.year >= 1 && r.year <= horizon).map(r => ({
    year: calYear(r.year),
    value: Math.round(r.netCashflow),
  }));
  return <BriefAreaChart data={data} name="Net cashflow" color="#8B5CF6" gradientId="briefCfGradient" fillStyle="signed" />;
};

/** Growth Projections — equity from purchase over the selected horizon. */
export const BriefGrowthChart: React.FC<BriefChartProps> = ({ yearRows, horizon }) => {
  const data = yearRows
    .filter(r => r.year >= 1 && r.year <= horizon)
    .map(r => ({
      year: calYear(r.year),
      value: Math.round(r.equity),
    }));
  return <BriefAreaChart data={data} name="Equity" color="#7C3AED" gradientId="briefGrowthGradient" />;
};
