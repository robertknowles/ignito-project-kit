import React from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useChartDataGenerator } from '../hooks/useChartDataGenerator';
import type { TimelineProperty } from '../types/property';
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext';

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
    <div className="bg-white p-3 border border-slate-200 shadow-sm rounded-md">
      <p className="text-xs font-medium text-slate-900 mb-2">Year: {label}</p>
      <p className="text-xs text-slate-600">Total Assets: {formatK(data?.totalAssets || 0)}</p>
      <p className="text-xs text-rose-500">Total Debt: {formatK(data?.totalDebt || 0)}</p>
      <p className="text-xs text-green-600 font-medium">Net Worth: {formatK(data?.netWorth || 0)}</p>
    </div>
  );
};

export const NetWorthChart: React.FC<NetWorthChartProps> = ({ scenarioData }) => {
  const { netWorthData } = useChartDataGenerator(scenarioData);

  if (!netWorthData || netWorthData.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-6 flex items-center justify-center h-full">
        <p className="text-sm text-slate-400">Add properties to see net worth projection</p>
      </div>
    );
  }

  const formatYAxis = (v: number) => {
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`;
    return `$${v}`;
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-4">
      <h3 className="text-sm font-medium text-slate-700 mb-3">Net Worth Trajectory</h3>
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={netWorthData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
          <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#64748b' }} />
          <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 10, fill: '#64748b' }} width={55} />
          <Tooltip content={<NetWorthTooltip />} />

          {/* Total assets — light blue area */}
          <Area
            type="monotone"
            dataKey="totalAssets"
            fill="rgba(135, 181, 250, 0.15)"
            stroke="rgba(135, 181, 250, 0.4)"
            strokeWidth={1}
            name="Total Assets"
          />

          {/* Total debt — red area */}
          <Area
            type="monotone"
            dataKey="totalDebt"
            fill="rgba(252, 165, 165, 0.2)"
            stroke="rgba(252, 165, 165, 0.5)"
            strokeWidth={1}
            name="Total Debt"
          />

          {/* Net worth — bold green line */}
          <Line
            type="monotone"
            dataKey="netWorth"
            stroke="#22C55E"
            strokeWidth={2.5}
            dot={false}
            name="Net Worth"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
