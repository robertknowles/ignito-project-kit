import React from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useChartDataGenerator } from '../hooks/useChartDataGenerator';
import { CHART_COLORS, CHART_STYLE } from '../constants/chartColors';
import type { TimelineProperty } from '../types/property';
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext';

// Net Worth chart uses a distinct 3-color palette: blue, purple, aqua
const NW_COLORS = {
  totalAssets: '#3B82F6',   // Blue
  netWorth: '#8B5CF6',      // Purple
  totalDebt: '#22D3EE',     // Light blue / aqua
} as const;

interface NetWorthChartProps {
  scenarioData?: {
    timelineProperties: TimelineProperty[];
    profile: InvestmentProfileData;
  };
}

const NetWorthTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  const formatK = (v: number) => {
    const abs = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(1)}M`;
    if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(0)}k`;
    return `${sign}$${abs.toFixed(0)}`;
  };
  return (
    <div className="bg-white p-3 border border-gray-100 shadow-sm rounded-lg">
      <p className="text-xs font-medium text-gray-900 mb-2">Year: {label}</p>
      <p className="text-xs" style={{ color: NW_COLORS.totalAssets }}>Total Assets: {formatK(data?.totalAssets || 0)}</p>
      <p className="text-xs" style={{ color: NW_COLORS.totalDebt }}>Total Debt: {formatK(data?.totalDebt || 0)}</p>
      <p className="text-xs font-medium" style={{ color: NW_COLORS.netWorth }}>Net Worth: {formatK(data?.netWorth || 0)}</p>
    </div>
  );
};

export const NetWorthChart: React.FC<NetWorthChartProps> = ({ scenarioData }) => {
  const { netWorthData } = useChartDataGenerator(scenarioData);

  if (!netWorthData || netWorthData.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 flex items-center justify-center h-full">
        <p className="body-secondary">Add properties to see net worth projection</p>
      </div>
    );
  }

  const formatYAxis = (v: number) => {
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`;
    return `$${v}`;
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-10 pt-6 pb-10">
      <h3 className="text-sm font-semibold text-gray-900 mb-5">Net Worth Trajectory</h3>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={netWorthData} margin={{ top: 10, right: 24, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="assetsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={NW_COLORS.totalAssets} stopOpacity={0.08} />
              <stop offset="100%" stopColor={NW_COLORS.totalAssets} stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="debtGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={NW_COLORS.totalDebt} stopOpacity={0.06} />
              <stop offset="100%" stopColor={NW_COLORS.totalDebt} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid {...CHART_STYLE.grid} />
          <XAxis dataKey="year" {...CHART_STYLE.xAxis} />
          <YAxis tickFormatter={formatYAxis} {...CHART_STYLE.yAxis} width={80} />
          <Tooltip content={<NetWorthTooltip />} />

          {/* Total assets — blue area */}
          <Area
            type="monotone"
            dataKey="totalAssets"
            fill="url(#assetsGradient)"
            stroke={NW_COLORS.totalAssets}
            strokeWidth={1.5}
            name="Total Assets"
            dot={false}
          />

          {/* Total debt — aqua area */}
          <Area
            type="monotone"
            dataKey="totalDebt"
            fill="url(#debtGradient)"
            stroke={NW_COLORS.totalDebt}
            strokeWidth={1.5}
            name="Total Debt"
            dot={false}
          />

          {/* Net worth — purple line */}
          <Line
            type="monotone"
            dataKey="netWorth"
            stroke={NW_COLORS.netWorth}
            strokeWidth={2}
            dot={false}
            name="Net Worth"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: NW_COLORS.totalAssets }} />
          <span className="text-xs text-gray-500">Total Assets</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: NW_COLORS.netWorth }} />
          <span className="text-xs text-gray-500">Net Worth</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: NW_COLORS.totalDebt }} />
          <span className="text-xs text-gray-500">Total Debt</span>
        </div>
      </div>
    </div>
  );
};
