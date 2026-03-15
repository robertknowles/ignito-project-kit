import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { useChartDataGenerator } from '../hooks/useChartDataGenerator';
import { useInvestmentProfile } from '../hooks/useInvestmentProfile';
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator';
import { useFinancialFreedomProjection } from '../hooks/useFinancialFreedomProjection';
import { CHART_COLORS, CHART_STYLE } from '../constants/chartColors';
import { BASE_YEAR } from '../constants/financialParams';

/**
 * Extended Cashflow Projection
 *
 * Merges accumulation-phase cashflow bars with the 30-year freedom projection
 * into one continuous chart, capped at the investment timeline end year.
 * Milestones shown as text summary below the chart (not vertical lines).
 *
 * NO new calculations — purely consumes existing hook data.
 */

interface MergedDataPoint {
  year: string;
  cashflow: number;
  isProjection: boolean;
}

const formatK = (v: number) => {
  if (v === 0) return '$0';
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(0)}k`;
  return `${sign}$${abs.toFixed(0)}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  const isProjection = payload[0].payload?.isProjection;
  return (
    <div className="bg-white p-3 border border-gray-100 shadow-sm rounded-lg">
      <p className="text-xs font-medium text-gray-900">Year {label}</p>
      <p className="text-xs text-gray-600">
        Net Cashflow: {formatK(value)}
      </p>
      {isProjection && (
        <p className="text-[10px] text-gray-400 mt-1">Projected</p>
      )}
    </div>
  );
};

export const ExtendedCashflowChart: React.FC = () => {
  const { portfolioGrowthData, cashflowData } = useChartDataGenerator();
  const { profile } = useInvestmentProfile();
  const { timelineProperties } = useAffordabilityCalculator();

  const projection = useFinancialFreedomProjection({
    portfolioGrowthData,
    cashflowData,
    profile,
    timelineProperties,
  });

  // Cap at investment timeline end year
  const endYear = BASE_YEAR + (profile.timelineYears || 15);

  // Merge accumulation + projection data, deduplicating overlap years, capped at endYear
  const { mergedData, yAxisDomain, yAxisTicks } = useMemo(() => {
    const accumulationYears = new Set(cashflowData.map(d => d.year));

    // Accumulation phase
    const accum: MergedDataPoint[] = cashflowData
      .filter(d => Number(d.year) <= endYear)
      .map(d => ({
        year: d.year,
        cashflow: d.cashflow,
        isProjection: false,
      }));

    // Projection phase — only years not already in accumulation and within timeline
    const proj: MergedDataPoint[] = projection.yearlyData
      .filter(d => !accumulationYears.has(String(d.year)) && d.year <= endYear)
      .map(d => ({
        year: String(d.year),
        cashflow: d.netCashflow,
        isProjection: true,
      }));

    const merged = [...accum, ...proj];

    // Y-axis calculation
    const values = merged.map(d => d.cashflow);
    const goalValue = profile.targetPassiveIncome || 0;
    const dataMin = Math.min(...values, 0);
    const dataMax = Math.max(...values, goalValue);
    const range = dataMax - dataMin;

    let interval: number;
    if (range <= 50000) interval = 10000;
    else if (range <= 100000) interval = 20000;
    else if (range <= 200000) interval = 50000;
    else interval = 100000;

    const niceMin = Math.floor(dataMin / interval) * interval;
    const niceMax = Math.ceil(dataMax / interval) * interval;
    const ticks: number[] = [];
    for (let t = niceMin; t <= niceMax; t += interval) ticks.push(t);

    return {
      mergedData: merged,
      yAxisDomain: [niceMin, niceMax],
      yAxisTicks: ticks,
    };
  }, [cashflowData, projection.yearlyData, profile.targetPassiveIncome, endYear]);

  // Filter milestones to those within timeline
  const milestones = useMemo(() =>
    projection.milestones
      .filter(m => m.year <= endYear)
      .map(m => ({ year: m.year, label: m.label })),
    [projection.milestones, endYear],
  );

  if (mergedData.length === 0) return null;

  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={mergedData}
          margin={{ top: 20, right: 24, left: 0, bottom: 5 }}
        >
          <CartesianGrid {...CHART_STYLE.grid} />
          <XAxis
            dataKey="year"
            {...CHART_STYLE.xAxis}
          />
          <YAxis
            tickFormatter={formatK}
            {...CHART_STYLE.yAxis}
            width={80}
            domain={yAxisDomain}
            ticks={yAxisTicks}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Target income reference line */}
          {profile.targetPassiveIncome > 0 && (
            <ReferenceLine
              y={profile.targetPassiveIncome}
              {...CHART_STYLE.goalLine}
            />
          )}

          <Bar dataKey="cashflow" radius={[2, 2, 0, 0]}>
            {mergedData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.cashflow >= 0 ? CHART_COLORS.barPositive : CHART_COLORS.barNegative}
                fillOpacity={entry.isProjection ? 0.65 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Milestones as text summary below chart */}
      {milestones.length > 0 && (
        <div className="mt-1 px-4 flex gap-x-5 gap-y-1 flex-wrap">
          {milestones.map(m => (
            <span key={m.label} className="text-[11px] text-gray-400">
              <span className="font-medium text-gray-500">{m.year}</span>: {m.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
