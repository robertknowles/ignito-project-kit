import React from 'react';
import {
  AreaChart,
  Area,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
} from 'recharts';
import type { YearRow } from '../hooks/usePortfolioProjection';
import { BASE_YEAR } from '../constants/financialParams';

const UUI = {
  brand700: '#6941C6',
  brand600: '#7F56D9',
  brand500: '#9E77ED',
  brand200: '#E9D7FE',
  neutral900: '#171717',
  neutral500: '#737373',
  neutral200: '#E5E5E5',
  neutral100: '#F5F5F5',
  white: '#FFFFFF',
  fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

const formatCompact = (v: number): string => {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${Math.round(v)}`;
};

const MiniTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-lg" style={{ fontFamily: UUI.fontFamily }}>
      <p className="text-xs font-semibold text-neutral-900 mb-1">Year {label}</p>
      {payload
        .filter((e: any) => !e.dataKey.endsWith('Scaled'))
        .map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs text-neutral-600">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span>{entry.name}:</span>
          <span className="font-medium text-neutral-900">
            {entry.dataKey === 'lvr' ? `${entry.value}%` : formatCompact(entry.value)}
          </span>
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
  interval: 'preserveStartEnd' as const,
  padding: { left: 10, right: 10 },
};

interface BriefChartProps {
  yearRows: YearRow[];
}

export const BriefCashflowChart: React.FC<BriefChartProps> = ({ yearRows }) => {
  const data = yearRows.filter(r => r.year >= 1 && r.year <= 10).map(r => ({
    year: String(BASE_YEAR + r.year - 1),
    netCashflow: Math.round(r.netCashflow),
  }));

  if (!data.length) return null;

  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 16, left: 16, bottom: 0 }}>
          <defs>
            <linearGradient id="briefCfGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={UUI.brand600} stopOpacity={0.08} />
              <stop offset="95%" stopColor={UUI.brand600} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={UUI.neutral100} />
          <XAxis dataKey="year" {...sharedXAxis} />
          <Tooltip content={<MiniTooltip />} cursor={{ stroke: UUI.brand600, strokeWidth: 1.5 }} />
          <Area
            type="monotone"
            dataKey="netCashflow"
            name="Net Cashflow"
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

export const BriefEquityChart: React.FC<BriefChartProps> = ({ yearRows }) => {
  const data = yearRows.filter(r => r.year >= 1 && r.year <= 10).map(r => ({
    year: String(BASE_YEAR + r.year - 1),
    equity: Math.round(r.equity),
  }));

  if (!data.length) return null;

  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 16, left: 16, bottom: 0 }}>
          <defs>
            <linearGradient id="briefEqGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={UUI.brand600} stopOpacity={0.15} />
              <stop offset="95%" stopColor={UUI.brand600} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={UUI.neutral100} />
          <XAxis dataKey="year" {...sharedXAxis} />
          <Tooltip content={<MiniTooltip />} cursor={{ stroke: UUI.brand600, strokeWidth: 1.5 }} />
          <Area
            type="monotone"
            dataKey="equity"
            name="Equity"
            stroke={UUI.brand600}
            strokeWidth={2}
            fill="url(#briefEqGradient)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const BriefLoanChart: React.FC<BriefChartProps> = ({ yearRows }) => {
  const data = yearRows.filter(r => r.year >= 1 && r.year <= 10).map(r => ({
    year: String(BASE_YEAR + r.year - 1),
    propertyValue: Math.round(r.propertyValue),
    loanBalance: Math.round(r.loanBalance),
    lvr: r.propertyValue > 0 ? Math.round((r.loanBalance / r.propertyValue) * 100) : 0,
  }));

  if (!data.length) return null;

  const maxValue = Math.max(...data.map(d => d.propertyValue));

  const scaledData = data.map(d => ({
    ...d,
    lvrScaled: (d.lvr / 100) * maxValue,
  }));

  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={scaledData} margin={{ top: 8, right: 16, left: 16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={UUI.neutral100} />
          <XAxis dataKey="year" {...sharedXAxis} />
          <Tooltip content={<MiniTooltip />} cursor={{ stroke: UUI.brand600, strokeWidth: 1.5 }} />
          <Line
            type="monotone"
            dataKey="propertyValue"
            name="Property Value"
            stroke={UUI.brand600}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="loanBalance"
            name="Loan Balance"
            stroke={UUI.brand200}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="lvrScaled"
            name="LVR"
            stroke={UUI.neutral500}
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export const BriefHoldingCostChart: React.FC<BriefChartProps> = ({ yearRows }) => {
  const data = yearRows.filter(r => r.year >= 1 && r.year <= 10).map(r => ({
    year: String(BASE_YEAR + r.year - 1),
    mortgage: Math.round(r.interestExpense),
    expenses: Math.round(r.operatingExpenses),
    rent: Math.round(r.grossIncome),
  }));

  if (!data.length) return null;

  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, left: 16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={UUI.neutral100} />
          <XAxis dataKey="year" {...sharedXAxis} />
          <Tooltip content={<MiniTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
          <Bar dataKey="mortgage" name="Mortgage" stackId="costs" fill={UUI.brand700} maxBarSize={24} isAnimationActive={false} />
          <Bar dataKey="expenses" name="Operating Expenses" stackId="costs" fill={UUI.brand500} maxBarSize={24} isAnimationActive={false} />
          <Bar dataKey="rent" name="Rental Income" stackId="costs" fill={UUI.neutral200} maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
