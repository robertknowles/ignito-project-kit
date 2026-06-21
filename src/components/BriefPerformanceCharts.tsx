import React from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
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
  brand700: '#6941C6',
  brand600: '#7F56D9',
  brand500: '#9E77ED',
  brand300: '#B692F6',
  brand200: '#E9D7FE',
  growth500: '#17B26A',
  neutral900: '#171717',
  neutral500: '#737373',
  neutral200: '#E5E5E5',
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

const sharedXAxis = {
  axisLine: false as const,
  tickLine: false as const,
  tickMargin: 8,
  tick: { fontSize: 11, fontWeight: 600, fill: UUI.neutral500 },
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
  tick: { fontSize: 11, fontWeight: 600, fill: UUI.neutral500 },
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

  return (
    <div className="h-full min-h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={UUI.neutral100} />
          <XAxis dataKey="year" {...sharedXAxis} interval={evenTickInterval(data.length)} />
          <YAxis {...sharedYAxis} />
          <Tooltip content={<MiniTooltip />} cursor={{ stroke: UUI.brand600, strokeWidth: 1.5 }} />
          <ReferenceLine y={0} stroke={UUI.neutral200} />
          <Line type="monotone" dataKey="totalIncPrincipal" name="Total performance inc. principal" stroke={UUI.brand700} strokeWidth={2.5} dot={false} isAnimationActive={false} hide={hiddenKeys.includes('totalIncPrincipal')} />
          <Line type="monotone" dataKey="capitalGrowth" name="Capital growth (cumulative)" stroke={UUI.growth500} strokeWidth={2} dot={false} isAnimationActive={false} hide={hiddenKeys.includes('capitalGrowth')} />
          <Line type="monotone" dataKey="netCashflow" name="Net cashflow (cumulative)" stroke={UUI.brand600} strokeWidth={2} dot={false} isAnimationActive={false} hide={hiddenKeys.includes('netCashflow')} />
          <Line type="monotone" dataKey="principalPaid" name="Principal payments (cumulative)" stroke={UUI.brand300} strokeWidth={2} dot={false} isAnimationActive={false} hide={hiddenKeys.includes('principalPaid')} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

/** Cashflow Projections — net annual cashflow over the selected horizon. */
export const BriefCashflowChart: React.FC<BriefChartProps> = ({ yearRows, horizon }) => {
  const data = yearRows.filter(r => r.year >= 1 && r.year <= horizon).map(r => ({
    year: calYear(r.year),
    netCashflow: Math.round(r.netCashflow),
  }));

  if (!data.length) return null;

  return (
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="briefCfGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={UUI.brand600} stopOpacity={0.12} />
              <stop offset="95%" stopColor={UUI.brand600} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={UUI.neutral100} />
          <XAxis dataKey="year" {...sharedXAxis} interval={evenTickInterval(data.length)} />
          <YAxis {...sharedYAxis} />
          <Tooltip content={<MiniTooltip />} cursor={{ stroke: UUI.brand600, strokeWidth: 1.5 }} />
          <ReferenceLine y={0} stroke={UUI.neutral200} />
          <Area
            type="monotone"
            dataKey="netCashflow"
            name="Net cashflow"
            stroke={UUI.brand600}
            strokeWidth={2}
            fill="url(#briefCfGradient)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

/** Growth Projections — equity from purchase over the selected horizon. */
export const BriefGrowthChart: React.FC<BriefChartProps> = ({ yearRows, horizon }) => {
  const data = yearRows
    .filter(r => r.year >= 0 && r.year <= horizon)
    .map(r => ({
      year: r.year === 0 ? 'At purchase' : calYear(r.year),
      equity: Math.round(r.equity),
    }));

  if (!data.length) return null;

  return (
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="briefGrowthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={UUI.growth500} stopOpacity={0.15} />
              <stop offset="95%" stopColor={UUI.growth500} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={UUI.neutral100} />
          <XAxis dataKey="year" {...sharedXAxis} interval={evenTickInterval(data.length)} />
          <YAxis {...sharedYAxis} />
          <Tooltip content={<MiniTooltip />} cursor={{ stroke: UUI.growth500, strokeWidth: 1.5 }} />
          <Area
            type="monotone"
            dataKey="equity"
            name="Equity"
            stroke={UUI.growth500}
            strokeWidth={2}
            fill="url(#briefGrowthGradient)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
