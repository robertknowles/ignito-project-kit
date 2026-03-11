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
      <div className="rounded-lg border border-gray-200 bg-white p-6 flex items-center justify-center h-full">
        <p className="text-sm text-gray-400">Add properties to see net worth projection</p>
      </div>
    );
  }

  const formatYAxis = (v: number) => {
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`;
    return `$${v}`;
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Net Worth Trajectory</h3>
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={netWorthData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="assetsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity={0.08} />
              <stop offset="100%" stopColor="#2563EB" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="debtGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" stopOpacity={0.06} />
              <stop offset="100%" stopColor="#EF4444" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="0" stroke="#F3F4F6" strokeOpacity={0.7} vertical={false} />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={55} />
          <Tooltip content={<NetWorthTooltip />} />

          {/* Total assets — subtle blue area */}
          <Area
            type="monotone"
            dataKey="totalAssets"
            fill="url(#assetsGradient)"
            stroke="#93C5FD"
            strokeWidth={1.5}
            name="Total Assets"
            dot={false}
          />

          {/* Total debt — subtle red area */}
          <Area
            type="monotone"
            dataKey="totalDebt"
            fill="url(#debtGradient)"
            stroke="#FCA5A5"
            strokeWidth={1.5}
            name="Total Debt"
            dot={false}
          />

          {/* Net worth — clean green line */}
          <Line
            type="monotone"
            dataKey="netWorth"
            stroke="#22C55E"
            strokeWidth={2}
            dot={false}
            name="Net Worth"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
