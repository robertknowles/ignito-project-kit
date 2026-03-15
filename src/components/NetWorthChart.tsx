import React from 'react';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useChartDataGenerator } from '../hooks/useChartDataGenerator';
import { CHART_COLORS, CHART_STYLE } from '../constants/chartColors';
import type { TimelineProperty } from '../types/property';
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext';

// Net Worth chart uses the centralized tri-color line palette
export const NW_COLORS = {
  totalAssets: CHART_COLORS.lineBlue,
  netWorth: CHART_COLORS.linePurple,
  totalDebt: CHART_COLORS.lineAqua,
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
      <p className="text-xs font-medium text-gray-600 mb-2">Year: {label}</p>
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
      <p className="body-secondary text-center py-10">Add properties to see net worth projection</p>
    );
  }

  const formatYAxis = (v: number) => {
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`;
    return `$${v}`;
  };

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={netWorthData} margin={{ top: 20, right: 24, left: 0, bottom: 5 }}>
        <CartesianGrid {...CHART_STYLE.grid} />
        <XAxis dataKey="year" {...CHART_STYLE.xAxis} />
        <YAxis tickFormatter={formatYAxis} {...CHART_STYLE.yAxis} width={80} />
        <Tooltip content={<NetWorthTooltip />} />

        {/* Total assets — blue line */}
        <Line
          type="monotone"
          dataKey="totalAssets"
          stroke={NW_COLORS.totalAssets}
          strokeWidth={1.5}
          dot={false}
          name="Total Assets"
        />

        {/* Total debt — aqua line */}
        <Line
          type="monotone"
          dataKey="totalDebt"
          stroke={NW_COLORS.totalDebt}
          strokeWidth={1.5}
          dot={false}
          name="Total Debt"
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
  );
};
