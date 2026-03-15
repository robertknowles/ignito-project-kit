import React, { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
  Label,
} from 'recharts';
import { useAffordabilityCalculator } from '../../hooks/useAffordabilityCalculator';
import { useInvestmentProfile } from '../../hooks/useInvestmentProfile';
import { useEquityUnlockTimeline } from './useEquityUnlockTimeline';
import { CHART_COLORS, CHART_STYLE } from '../../constants/chartColors';
import { MIN_EXTRACTABLE_EQUITY_THRESHOLD } from '../../constants/financialParams';

/**
 * Equity Unlock Chart — Per-property extractable equity over time
 *
 * Multi-line chart (blue/purple/aqua) with subtle area fills.
 * $50K threshold dashed line. Refinance-ready & extraction markers.
 * Legend + trigger text below chart.
 */

const fmt = (v: number) => {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${Math.round(v / 1000)}k`;
  return `$${v}`;
};

interface MergedYearPoint {
  year: number;
  [key: string]: number;
}

const AREA_OPACITIES = [0.08, 0.06, 0.10, 0.07, 0.05, 0.09];

const EquityTooltip = ({ active, payload, label, propertyNames }: any) => {
  if (!active || !payload?.length) return null;

  const sorted = [...payload]
    .filter((p: any) => p.value != null && p.value > 0 && p.dataKey && !String(p.dataKey).startsWith('area-'))
    .sort((a: any, b: any) => b.value - a.value);
  if (sorted.length === 0) return null;

  return (
    <div className="bg-white p-3 border border-gray-100 shadow-sm rounded-lg">
      <p className="text-xs font-medium text-gray-600 mb-1.5">Year {label}</p>
      {sorted.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-1.5 mb-0.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.stroke || entry.color }} />
          <p className="text-xs text-gray-600">
            {propertyNames[entry.dataKey] || entry.dataKey}: {fmt(entry.value)}
          </p>
        </div>
      ))}
    </div>
  );
};

export const EquityUnlockChart: React.FC = () => {
  const { timelineProperties } = useAffordabilityCalculator();
  const { profile } = useInvestmentProfile();
  const { propertyTimelines } = useEquityUnlockTimeline(timelineProperties, profile);

  // Build merged data and property name map
  const { chartData, propertyNames } = useMemo(() => {
    if (propertyTimelines.length === 0) return { chartData: [], propertyNames: {} };

    const yearSet = new Set<number>();
    propertyTimelines.forEach(p => p.timeline.forEach(t => yearSet.add(t.year)));
    const years = Array.from(yearSet).sort((a, b) => a - b);

    const lookups = propertyTimelines.map(p => {
      const map = new Map<number, number>();
      p.timeline.forEach(t => map.set(t.year, t.extractableEquity));
      return { id: p.instanceId, map };
    });

    const names: Record<string, string> = {};
    propertyTimelines.forEach(p => { names[p.instanceId] = p.title; });

    const data: MergedYearPoint[] = years.map(year => {
      const point: MergedYearPoint = { year };
      lookups.forEach(l => {
        const val = l.map.get(year);
        if (val !== undefined) point[l.id] = val;
      });
      return point;
    });

    return { chartData: data, propertyNames: names };
  }, [propertyTimelines]);

  // Deduplicated refinance triggers
  const triggers = useMemo(() => {
    const seen = new Set<string>();
    return propertyTimelines
      .filter(p => p.refinanceReadyYear !== null)
      .map(p => ({
        key: `${p.title}-${p.refinanceReadyYear}`,
        title: p.title,
        year: p.refinanceReadyYear!,
        extracted: p.extractionEvent,
      }))
      .filter(t => {
        if (seen.has(t.key)) return false;
        seen.add(t.key);
        return true;
      })
      .sort((a, b) => a.year - b.year);
  }, [propertyTimelines]);

  if (propertyTimelines.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-8 text-center">
        Add properties to see equity unlock timeline
      </p>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart
          data={chartData}
          margin={{ top: 16, right: 24, left: 0, bottom: 5 }}
        >
          {/* Gradient defs for area fills */}
          <defs>
            {propertyTimelines.map((prop, i) => (
              <linearGradient key={`grad-${prop.instanceId}`} id={`equity-fill-${prop.instanceId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={prop.color} stopOpacity={AREA_OPACITIES[i % AREA_OPACITIES.length]} />
                <stop offset="100%" stopColor={prop.color} stopOpacity={0.01} />
              </linearGradient>
            ))}
          </defs>

          <CartesianGrid {...CHART_STYLE.grid} />
          <XAxis
            dataKey="year"
            {...CHART_STYLE.xAxis}
            type="number"
            domain={['dataMin', 'dataMax']}
            tickCount={Math.min(chartData.length, 12)}
          />
          <YAxis
            tickFormatter={fmt}
            {...CHART_STYLE.yAxis}
            width={65}
          />
          <Tooltip content={<EquityTooltip propertyNames={propertyNames} />} />

          {/* $50K threshold — dashed line only, label is in legend */}
          <ReferenceLine
            y={MIN_EXTRACTABLE_EQUITY_THRESHOLD}
            {...CHART_STYLE.goalLine}
          />

          {/* Per-property area fills (render before lines so lines sit on top) */}
          {propertyTimelines.map(prop => (
            <Area
              key={`area-${prop.instanceId}`}
              type="monotone"
              dataKey={prop.instanceId}
              stroke="none"
              fill={`url(#equity-fill-${prop.instanceId})`}
              connectNulls={false}
              isAnimationActive={false}
              legendType="none"
              tooltipType="none"
            />
          ))}

          {/* Per-property lines */}
          {propertyTimelines.map(prop => (
            <Line
              key={prop.instanceId}
              type="monotone"
              dataKey={prop.instanceId}
              stroke={prop.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: prop.color, fill: 'white', strokeWidth: 2 }}
              connectNulls={false}
              name={prop.title}
            />
          ))}

          {/* Refinance-ready markers */}
          {propertyTimelines.map(prop => {
            if (!prop.refinanceReadyYear) return null;
            const pt = prop.timeline.find(t => t.year === prop.refinanceReadyYear);
            if (!pt) return null;
            return (
              <ReferenceDot
                key={`ready-${prop.instanceId}`}
                x={prop.refinanceReadyYear}
                y={pt.extractableEquity}
                r={5}
                fill="white"
                stroke={prop.color}
                strokeWidth={2}
              />
            );
          })}

          {/* Extraction event markers */}
          {propertyTimelines.map(prop => {
            if (!prop.extractionEvent) return null;
            const pt = prop.timeline.find(t => t.year === prop.extractionEvent!.year);
            if (!pt) return null;
            return (
              <ReferenceDot
                key={`extract-${prop.instanceId}`}
                x={prop.extractionEvent.year}
                y={pt.extractableEquity}
                r={4}
                fill={prop.color}
                stroke="white"
                strokeWidth={2}
              >
                <Label
                  value={fmt(prop.extractionEvent.amount)}
                  position="top"
                  offset={12}
                  style={{
                    fontSize: 9,
                    fill: CHART_COLORS.labelText,
                    fontWeight: 500,
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}
                />
              </ReferenceDot>
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Per-property legend + trigger summary */}
      <div className="mt-1 px-4">
        {/* Legend */}
        <div className="flex items-center gap-5 flex-wrap">
          {propertyTimelines.map(prop => (
            <div key={prop.instanceId} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: prop.color }} />
              <span className="text-[11px] text-gray-400">{prop.title}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-4 border-t border-dashed" style={{ borderColor: CHART_COLORS.goal }} />
            <span className="text-[11px] text-gray-400">Min $50k Threshold</span>
          </div>
        </div>

        {/* Triggers */}
        {triggers.length > 0 && (
          <div className="mt-1.5 flex gap-x-5 gap-y-1 flex-wrap">
            {triggers.map(t => (
              <span key={t.key} className="text-[11px] text-gray-400">
                <span className="font-medium text-gray-500">{t.year}</span>: {t.title} — refinance ready
                {t.extracted && (
                  <span className="text-gray-500"> · {fmt(t.extracted.amount)} extracted</span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
