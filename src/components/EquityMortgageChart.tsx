import React, { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useChartDataGenerator } from '../hooks/useChartDataGenerator';
import { useInvestmentProfile } from '../hooks/useInvestmentProfile';
import { BASE_YEAR } from '../constants/financialParams';
import type { TimelineProperty } from '../types/property';
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext';

const UUI = {
  brand600: '#7F56D9',
  brand200: '#E9D7FE',
  neutral900: '#171717',
  neutral500: '#737373',
  neutral200: '#E5E5E5',
  neutral100: '#F5F5F5',
  fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

interface EquityMortgageChartProps {
  scenarioData?: {
    timelineProperties: TimelineProperty[];
    profile: InvestmentProfileData;
  };
}

const formatCompact = (v: number): string => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${v}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-lg"
      style={{ fontFamily: UUI.fontFamily }}
    >
      <p className="text-xs font-semibold text-neutral-900 mb-1">{label}</p>
      {payload
        .filter((entry: any) => entry.dataKey !== 'lvrScaled')
        .map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs text-neutral-600">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span>{entry.name}:</span>
          <span className="font-medium text-neutral-900">
            {entry.dataKey === 'lvr' ? `${entry.value}%` : formatCompact(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

export const EquityMortgageChart: React.FC<EquityMortgageChartProps> = ({ scenarioData }) => {
  const { portfolioGrowthData } = useChartDataGenerator(scenarioData);
  const { profile: contextProfile } = useInvestmentProfile();
  const profile = scenarioData?.profile ?? contextProfile;

  const data = useMemo(() => {
    if (!portfolioGrowthData.length) return [];

    const endYear = BASE_YEAR + profile.timelineYears - 1;
    const filtered = portfolioGrowthData.filter(d => Number(d.year) <= endYear);

    const maxValue = Math.max(...filtered.map(d => d.portfolioValue));

    return filtered.map(d => {
      const value = d.portfolioValue;
      const debt = d.totalDebt ?? 0;
      const lvr = value > 0 ? Math.round((debt / value) * 100) : 0;
      return {
        year: d.year,
        marketValue: Math.round(value),
        loanBalance: Math.round(debt),
        lvr,
        lvrScaled: (lvr / 100) * maxValue,
      };
    });
  }, [portfolioGrowthData, profile.timelineYears]);

  if (!data.length) return null;

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 12, right: 16, left: 16, bottom: 0 }}
          className="[&_.recharts-text]:text-xs"
          barGap={2}
          barCategoryGap="20%"
        >
          <CartesianGrid vertical={false} stroke={UUI.neutral100} />

          <XAxis
            dataKey="year"
            axisLine={false}
            tickLine={false}
            tickMargin={10}
            tick={{ fontSize: 12, fontWeight: 600, fill: UUI.neutral500, fontFamily: UUI.fontFamily }}
            interval="preserveStartEnd"
            padding={{ left: 10, right: 10 }}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />

          <Bar
            dataKey="marketValue"
            name="Market Value"
            fill={UUI.brand600}
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
            isAnimationActive={false}
          />
          <Bar
            dataKey="loanBalance"
            name="Loan Balance"
            fill={UUI.brand200}
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
            isAnimationActive={false}
          />
          <Line
            dataKey="lvrScaled"
            name="LVR"
            type="monotone"
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
