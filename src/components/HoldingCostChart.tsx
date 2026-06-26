import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useHoldingCostTimeline } from './HoldingCostPanel/useHoldingCostTimeline';
import { useInvestmentProfile } from '../hooks/useInvestmentProfile';
import { usePropertySelection } from '../contexts/PropertySelectionContext';
import { usePropertyInstance } from '../contexts/PropertyInstanceContext';
import { BASE_YEAR } from '../constants/financialParams';
import type { TimelineProperty } from '../types/property';
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext';

const UUI = {
  brand700: '#6D28D9',
  brand500: '#8B5CF6',
  neutral900: '#181D27',
  neutral500: '#717680',
  neutral200: '#E9EAEB',
  neutral100: '#F5F5F5',
  fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

interface HoldingCostChartProps {
  scenarioData?: {
    timelineProperties: TimelineProperty[];
    profile: InvestmentProfileData;
  };
}

const formatCompact = (v: number): string => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${Math.round(v)}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-lg"
      style={{ fontFamily: UUI.fontFamily }}
    >
      <p className="text-xs font-semibold text-neutral-900 mb-1">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs text-neutral-600">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span>{entry.name}:</span>
          <span className="font-medium text-neutral-900">{formatCompact(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

export const HoldingCostChart: React.FC<HoldingCostChartProps> = ({ scenarioData }) => {
  const { profile: contextProfile } = useInvestmentProfile();
  const { timelineProperties: contextTimeline } = usePropertySelection();
  const { getInstance } = usePropertyInstance();

  const timelineProperties = scenarioData?.timelineProperties ?? contextTimeline;
  const profile = scenarioData?.profile ?? contextProfile;

  const { properties } = useHoldingCostTimeline(timelineProperties, profile, getInstance);

  const data = useMemo(() => {
    if (!properties.length) return [];

    const endYear = BASE_YEAR + profile.timelineYears - 1;
    const yearMap = new Map<number, { mortgage: number; expenses: number; rent: number }>();

    for (const prop of properties) {
      for (const snap of prop.snapshots) {
        if (snap.year > endYear) continue;
        const existing = yearMap.get(snap.year) ?? { mortgage: 0, expenses: 0, rent: 0 };
        existing.mortgage += snap.monthlyMortgage * 12;
        existing.expenses += (snap.monthlyManagement + snap.monthlyCouncil +
          snap.monthlyInsurance + snap.monthlyMaintenance + snap.monthlyVacancy + snap.monthlyStrata) * 12;
        existing.rent += snap.monthlyRent * 12;
        yearMap.set(snap.year, existing);
      }
    }

    return Array.from(yearMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, d]) => ({
        year: String(year),
        mortgage: Math.round(d.mortgage),
        expenses: Math.round(d.expenses),
        rent: Math.round(d.rent),
      }));
  }, [properties, profile.timelineYears]);

  if (!data.length) return null;

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 12, right: 16, left: 16, bottom: 0 }}
          className="[&_.recharts-text]:text-xs"
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
            dataKey="mortgage"
            name="Mortgage"
            stackId="costs"
            fill={UUI.brand700}
            maxBarSize={32}
            isAnimationActive={false}
          />
          <Bar
            dataKey="expenses"
            name="Operating Expenses"
            stackId="costs"
            fill={UUI.brand500}
            maxBarSize={32}
            isAnimationActive={false}
          />
          <Bar
            dataKey="rent"
            name="Rental Income"
            stackId="costs"
            fill={UUI.neutral200}
            maxBarSize={32}
            radius={[6, 6, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
