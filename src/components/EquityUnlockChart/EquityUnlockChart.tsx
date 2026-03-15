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
 * Multi-line chart with subtle area fills per property. $50K threshold line.
 * Refinance-ready markers with year labels. Extraction event markers.
 * Property name labels at line endpoints for clarity.
 * BA triggers panel below.
 */

const fmt = (v: number) => {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${Math.round(v / 1000)}k`;
  return `$${v}`;
};

// Build a merged dataset keyed by year with one column per property
interface MergedYearPoint {
  year: number;
  [key: string]: number; // instanceId -> extractableEquity
}

// Area fill opacity per series index (subtle, staggered to aid distinction)
const AREA_OPACITIES = [0.08, 0.06, 0.10, 0.07, 0.05, 0.09];

const EquityTooltip = ({ active, payload, label, propertyNames }: any) => {
  if (!active || !payload?.length) return null;

  const sorted = [...payload]
    .filter((p: any) => p.value != null && p.value > 0 && p.dataKey && !String(p.dataKey).startsWith('area-'))
    .sort((a: any, b: any) => b.value - a.value);
  if (sorted.length === 0) return null;

  return (
    <div className="bg-white p-3 border border-gray-100 shadow-sm rounded-lg">
      <p className="text-xs font-medium text-gray-900 mb-1.5">Year {label}</p>
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

// Custom label rendered at the last data point of each property line
const EndLabel = ({ viewBox, value, color }: any) => {
  if (!viewBox) return null;
  return (
    <text
      x={viewBox.x + 8}
      y={viewBox.y + 4}
      fill={color}
      fontSize={10}
      fontWeight={600}
      fontFamily="Inter, system-ui, sans-serif"
    >
      {value}
    </text>
  );
};

// Custom label for refinance-ready markers
const MarkerLabel = ({ viewBox, value }: any) => {
  if (!viewBox) return null;
  return (
    <text
      x={viewBox.cx}
      y={viewBox.cy - 12}
      textAnchor="middle"
      fill={CHART_COLORS.primary}
      fontSize={9}
      fontWeight={600}
      fontFamily="Inter, system-ui, sans-serif"
    >
      {value}
    </text>
  );
};

export const EquityUnlockChart: React.FC = () => {
  const { timelineProperties } = useAffordabilityCalculator();
  const { profile } = useInvestmentProfile();
  const { propertyTimelines } = useEquityUnlockTimeline(timelineProperties, profile);

  // Build merged data and property name map
  const { chartData, propertyNames, maxLabelWidth } = useMemo(() => {
    if (propertyTimelines.length === 0) return { chartData: [], propertyNames: {}, maxLabelWidth: 80 };

    // Collect all years
    const yearSet = new Set<number>();
    propertyTimelines.forEach(p => p.timeline.forEach(t => yearSet.add(t.year)));
    const years = Array.from(yearSet).sort((a, b) => a - b);

    // Build lookup per property
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

    // Estimate right margin needed for end labels
    const longestName = Math.max(...propertyTimelines.map(p => p.title.length));
    const labelW = Math.min(longestName * 6 + 16, 120);

    return { chartData: data, propertyNames: names, maxLabelWidth: labelW };
  }, [propertyTimelines]);

  // BA triggers
  const triggers = useMemo(() =>
    propertyTimelines
      .filter(p => p.refinanceReadyYear !== null)
      .map(p => ({
        title: p.title,
        year: p.refinanceReadyYear!,
        extracted: p.extractionEvent,
        color: p.color,
      }))
      .sort((a, b) => a.year - b.year),
    [propertyTimelines],
  );

  if (propertyTimelines.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-8 text-center">
        Add properties to see equity unlock timeline
      </p>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart
          data={chartData}
          margin={{ top: 16, right: maxLabelWidth, left: 0, bottom: 5 }}
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

          {/* $50K threshold */}
          <ReferenceLine
            y={MIN_EXTRACTABLE_EQUITY_THRESHOLD}
            stroke={CHART_COLORS.secondary}
            strokeDasharray="5 3"
            strokeWidth={1.5}
          >
            <Label
              value={`Min ${fmt(MIN_EXTRACTABLE_EQUITY_THRESHOLD)} to refinance`}
              position="insideTopLeft"
              offset={8}
              style={{
                fontSize: 10,
                fill: CHART_COLORS.secondary,
                fontWeight: 600,
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            />
          </ReferenceLine>

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
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, stroke: prop.color, fill: 'white', strokeWidth: 2 }}
              connectNulls={false}
              name={prop.title}
            />
          ))}

          {/* Property name labels at last data point */}
          {propertyTimelines.map(prop => {
            const lastPoint = prop.timeline[prop.timeline.length - 1];
            if (!lastPoint) return null;
            return (
              <ReferenceDot
                key={`label-${prop.instanceId}`}
                x={lastPoint.year}
                y={lastPoint.extractableEquity}
                r={0}
                strokeWidth={0}
                fillOpacity={0}
              >
                <Label
                  content={<EndLabel value={prop.title} color={prop.color} />}
                />
              </ReferenceDot>
            );
          })}

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
                r={6}
                fill="white"
                stroke={CHART_COLORS.primary}
                strokeWidth={2.5}
              >
                <Label
                  content={<MarkerLabel value={`${prop.refinanceReadyYear}`} />}
                />
              </ReferenceDot>
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
                r={5}
                fill={prop.color}
                stroke="white"
                strokeWidth={2}
              >
                <Label
                  value={fmt(prop.extractionEvent.amount)}
                  position="top"
                  offset={14}
                  style={{
                    fontSize: 9,
                    fill: prop.color,
                    fontWeight: 700,
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}
                />
              </ReferenceDot>
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>

      {/* BA Triggers Panel */}
      {triggers.length > 0 && (
        <div
          className="mt-3 mx-2 px-4 py-3 rounded-lg border"
          style={{
            backgroundColor: 'rgba(59, 108, 244, 0.04)',
            borderColor: 'rgba(59, 108, 244, 0.15)',
          }}
        >
          <div className="text-[11px] font-bold mb-2" style={{ color: CHART_COLORS.primary }}>
            REFINANCE CONVERSATION TRIGGERS
          </div>
          <div className="flex gap-4 flex-wrap">
            {triggers.map(t => (
              <div key={`${t.title}-${t.year}`} className="text-[11px]" style={{ color: CHART_COLORS.primary }}>
                <span className="font-semibold">{t.year}</span>: {t.title} — refinance ready
                {t.extracted && (
                  <span className="font-semibold" style={{ color: t.color }}>
                    {' '}→ {fmt(t.extracted.amount)} extracted
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
