import React, { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  ResponsiveContainer,
} from 'recharts';
import { useAffordabilityCalculator } from '../../hooks/useAffordabilityCalculator';
import { useInvestmentProfile } from '../../hooks/useInvestmentProfile';
import { usePropertyInstance } from '../../contexts/PropertyInstanceContext';
import { useEquityUnlockTimeline } from './useEquityUnlockTimeline';
import { PROPERTY_COLORS } from '../../constants/chartColors';
import { CHART_STYLE } from '../../constants/chartColors';
import { BASE_YEAR } from '../../constants/financialParams';

const fmt = (v: number) => {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${Math.round(v / 1000)}K`;
  return `$${v}`;
};

/**
 * Equity Unlock Timeline — Unstacked line chart
 *
 * Each property gets an independent line showing its extractable equity over time.
 * Lines are NOT stacked — each reads at its true value.
 * Refinance events shown as open circle dots on the source property's line.
 * Full equity release narrative lives in the tooltip on hover.
 */
export const EquityUnlockChart: React.FC = () => {
  const { timelineProperties } = useAffordabilityCalculator();
  const { profile } = useInvestmentProfile();
  const { getInstance } = usePropertyInstance();
  const { propertyTimelines } = useEquityUnlockTimeline(timelineProperties, profile, getInstance);

  // Build chart data: one row per year, with a key per property
  const { chartData, refinanceEvents, propertyKeys, yAxisDomain, yTicks } = useMemo(() => {
    if (propertyTimelines.length === 0) {
      return { chartData: [], refinanceEvents: [], propertyKeys: [], yAxisDomain: [0, 100] as [number, number], yTicks: [0] };
    }

    // Collect all years across all properties, starting from BASE_YEAR to align with Investment Timeline
    const yearSet = new Set<number>();
    yearSet.add(BASE_YEAR);
    propertyTimelines.forEach(p => p.timeline.forEach(t => yearSet.add(t.year)));
    const years = Array.from(yearSet).sort((a, b) => a - b);

    // Build data points: { year, p0: equity, p1: equity, ... }
    const chartData = years.map(year => {
      const point: Record<string, number> = { year };
      propertyTimelines.forEach((prop, idx) => {
        const snap = prop.timeline.find(t => t.year === year);
        point[`p${idx}`] = snap?.extractableEquity ?? 0;
      });
      return point;
    });

    // Build refinance events for ReferenceDot rendering
    const refinanceEvents: {
      year: number;
      sourceIdx: number;
      sourceColor: string;
      amount: number;
      sourceTitle: string;
      destinationTitle: string | null;
    }[] = [];

    propertyTimelines.forEach((prop, propIdx) => {
      prop.extractionEvents.forEach(evt => {
        // Find which property was bought with this equity
        const buyer = propertyTimelines.find(p => Math.floor(p.buyYear) === evt.year && p !== prop);
        refinanceEvents.push({
          year: evt.year,
          sourceIdx: propIdx,
          sourceColor: prop.color,
          amount: evt.amount,
          sourceTitle: prop.title,
          destinationTitle: buyer?.title ?? null,
        });
      });
    });

    const propertyKeys = propertyTimelines.map((_, idx) => `p${idx}`);

    // Calculate y-axis domain with clean even tick intervals
    let maxVal = 0;
    chartData.forEach(d => {
      propertyKeys.forEach(key => {
        if ((d[key] as number) > maxVal) maxVal = d[key] as number;
      });
    });

    // Pick a clean step size that produces round labels ($100K, $200K, etc.)
    // Then compute how many ticks fit. Max should be just above the data.
    const cleanSteps = [25000, 50000, 100000, 200000, 250000, 500000, 1000000];
    // Find smallest step where we need <= 6 ticks to cover maxVal
    const step = cleanSteps.find(s => Math.ceil(maxVal / s) <= 6) ?? 1000000;
    const tickCount = Math.ceil(maxVal / step);
    const niceMax = step * tickCount;

    const yTicks: number[] = [];
    for (let i = 0; i <= tickCount; i++) yTicks.push(i * step);

    return {
      chartData,
      refinanceEvents,
      propertyKeys,
      yAxisDomain: [0, niceMax || 100000] as [number, number],
      yTicks,
    };
  }, [propertyTimelines]);

  if (propertyTimelines.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-8 text-center">
        Add properties to see equity unlock timeline
      </p>
    );
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const year = label as number;
    const eventsThisYear = refinanceEvents.filter(e => e.year === year);

    return (
      <div
        className="bg-white border rounded-lg shadow-sm"
        style={{
          borderColor: '#E5E7EB',
          padding: '12px 16px',
          fontSize: 13,
          maxWidth: 260,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        }}
      >
        <p className="font-semibold text-gray-900 mb-2">{year}</p>

        {/* Per-property equity values */}
        {propertyTimelines.map((prop, idx) => {
          const dataKey = `p${idx}`;
          const entry = payload.find((p: any) => p.dataKey === dataKey);
          const value = entry?.value ?? 0;
          if (value <= 0) return null;

          return (
            <div key={idx} className="flex items-center gap-2 mb-1">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: prop.color }}
              />
              <span className="text-gray-500">{prop.title}</span>
              <span className="ml-auto font-medium text-gray-700">{fmt(value)}</span>
            </div>
          );
        })}

        {/* Total */}
        {propertyTimelines.length > 1 && (
          <div
            className="flex justify-between mt-2 pt-2 font-semibold text-gray-900"
            style={{ borderTop: '1px solid #F3F4F6' }}
          >
            <span>Total</span>
            <span>
              {fmt(
                propertyTimelines.reduce((sum, _, idx) => {
                  const entry = payload.find((p: any) => p.dataKey === `p${idx}`);
                  return sum + (entry?.value ?? 0);
                }, 0)
              )}
            </span>
          </div>
        )}

        {/* Equity released events */}
        {eventsThisYear.length > 0 && (
          <div className="mt-2 pt-2" style={{ borderTop: '1px solid #F3F4F6' }}>
            <p
              className="text-gray-400 mb-1"
              style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}
            >
              Equity released
            </p>
            {eventsThisYear.map((evt, ei) => (
              <p key={ei} className="text-sm mb-0.5">
                <span className="font-medium text-gray-700">{fmt(evt.amount)}</span>
                <span className="text-gray-500"> from {evt.sourceTitle}</span>
                {evt.destinationTitle && (
                  <>
                    <span className="text-gray-400"> → </span>
                    <span className="font-medium text-blue-600">{evt.destinationTitle}</span>
                  </>
                )}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  };

  const formatYAxis = (v: number) => {
    if (v === 0) return '$0';
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    return `$${Math.round(v / 1000)}K`;
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 0, left: -10, bottom: 0 }}
        >
          <defs>
            {/* Only P1 gets a gradient fill */}
            <linearGradient id="equityFillP0" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PROPERTY_COLORS[0]} stopOpacity={0.08} />
              <stop offset="100%" stopColor={PROPERTY_COLORS[0]} stopOpacity={0.01} />
            </linearGradient>
          </defs>

          <CartesianGrid {...CHART_STYLE.grid} />
          <XAxis dataKey="year" {...CHART_STYLE.xAxis} padding={{ left: 20, right: 10 }} />
          <YAxis
            tickFormatter={formatYAxis}
            {...CHART_STYLE.yAxis}
            domain={yAxisDomain}
            ticks={yTicks}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Property lines — NOT stacked */}
          {propertyTimelines.map((prop, idx) => (
            <Area
              key={prop.instanceId}
              type="monotone"
              dataKey={`p${idx}`}
              name={prop.title}
              stroke={prop.color}
              strokeWidth={2}
              fill={idx === 0 ? 'url(#equityFillP0)' : 'none'}
              dot={false}
            />
          ))}

          {/* Refinance event dots — open circles on the source property's line */}
          {refinanceEvents.map((evt, ei) => {
            const dataPoint = chartData.find(d => d.year === evt.year);
            if (!dataPoint) return null;
            const yValue = dataPoint[`p${evt.sourceIdx}`] as number;

            return (
              <ReferenceDot
                key={`refi-${ei}`}
                x={evt.year}
                y={yValue}
                r={6}
                fill="white"
                stroke={evt.sourceColor}
                strokeWidth={2.5}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>

    </div>
  );
};

/** Small component for ChartCard action slot — shows total extractable */
export const EquityUnlockSummary: React.FC = () => {
  const { timelineProperties } = useAffordabilityCalculator();
  const { profile } = useInvestmentProfile();
  const { getInstance } = usePropertyInstance();
  const { propertyTimelines } = useEquityUnlockTimeline(timelineProperties, profile, getInstance);

  const { totalFinalEquity, lastYear } = useMemo(() => {
    if (propertyTimelines.length === 0) return { totalFinalEquity: 0, lastYear: 0 };
    const yearSet = new Set<number>();
    propertyTimelines.forEach(p => p.timeline.forEach(t => yearSet.add(t.year)));
    const lastYear = Math.max(...Array.from(yearSet));
    const totalFinalEquity = propertyTimelines.reduce((s, p) => {
      const last = p.timeline[p.timeline.length - 1];
      return s + (last?.equity ?? 0);
    }, 0);
    return { totalFinalEquity, lastYear };
  }, [propertyTimelines]);

  if (totalFinalEquity === 0) return null;

  return (
    <div className="text-right">
      <p className="text-[10px] text-gray-400 uppercase tracking-wider leading-tight">
        Extractable by {lastYear}
      </p>
      <p className="text-sm font-semibold text-gray-600">{fmt(totalFinalEquity)}</p>
    </div>
  );
};

/** Returns legend items for ChartCard's legend prop */
export const useEquityUnlockLegend = () => {
  const { timelineProperties } = useAffordabilityCalculator();
  const { profile } = useInvestmentProfile();
  const { getInstance } = usePropertyInstance();
  const { propertyTimelines } = useEquityUnlockTimeline(timelineProperties, profile, getInstance);

  return useMemo(() => {
    const items = propertyTimelines.map(p => ({
      color: p.color,
      label: p.title,
    }));
    items.push({ color: '#2563EB', label: 'Refinance event', variant: 'ring' as const });
    return items;
  }, [propertyTimelines]);
};
