import React, { useMemo, useState, useCallback, useRef } from 'react';
import {
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Customized,
  ResponsiveContainer,
} from 'recharts';
import { useAffordabilityCalculator } from '../../hooks/useAffordabilityCalculator';
import { useInvestmentProfile } from '../../hooks/useInvestmentProfile';
import { usePropertyInstance } from '../../contexts/PropertyInstanceContext';
import { usePropertySelection } from '../../contexts/PropertySelectionContext';
import { usePropertyRoadmapData, type PropertyRoadmapBar, type RoadmapEvent } from './usePropertyRoadmapData';
import { getPropertyIconPath } from '../icons/PropertyIconPaths';
import { BASE_YEAR } from '../../constants/financialParams';

const UUI = {
  brand600: '#7C3AED',
  neutral900: '#181D27',
  neutral700: '#404040',
  neutral500: '#717680',
  neutral200: '#E9EAEB',
  neutral100: '#F5F5F5',
  white: '#FFFFFF',
  success: '#17B26A',
  fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

const EVENT_COLORS: Record<RoadmapEvent['type'], string> = {
  purchase: UUI.brand600,
  equity_unlock: UUI.success,
  equity_pull: '#06B6D4',
  refinance: '#F59E0B',
};

const EVENT_LABELS: Record<RoadmapEvent['type'], string> = {
  purchase: 'Purchase',
  equity_unlock: 'Equity Unlock',
  equity_pull: 'Equity Pull',
  refinance: 'Refinance',
};

const fmt = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${v}`;
};

const ROW_HEIGHT = 44;

interface PropertyRoadmapChartProps {
  displayYears?: number;
}

export const PropertyRoadmapChart: React.FC<PropertyRoadmapChartProps> = ({ displayYears }) => {
  const { timelineProperties } = useAffordabilityCalculator();
  const { profile: baseProfile } = useInvestmentProfile();
  const { getInstance } = usePropertyInstance();
  const { eventBlocks } = usePropertySelection();
  const profile = displayYears ? { ...baseProfile, timelineYears: displayYears } : baseProfile;
  const { properties, startYear, endYear } = usePropertyRoadmapData(
    timelineProperties, profile, eventBlocks, getInstance,
  );

  const [tooltip, setTooltip] = useState<{
    event: RoadmapEvent; prop: PropertyRoadmapBar; x: number; y: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const chartData = useMemo(() => {
    const data: { year: number }[] = [];
    for (let y = startYear; y <= endYear; y++) data.push({ year: y });
    return data;
  }, [startYear, endYear]);

  const xTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let y = startYear; y <= endYear; y++) ticks.push(y);
    return ticks;
  }, [startYear, endYear]);

  const handleEventEnter = useCallback((prop: PropertyRoadmapBar, evt: RoadmapEvent, e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setTooltip({ event: evt, prop, x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  }, []);

  const handleEventLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  if (properties.length === 0) {
    return (
      <p className="text-sm text-neutral-400 py-8 text-center">
        Add properties to see the roadmap
      </p>
    );
  }

  const chartHeight = 220;

  // Gantt bars rendered inside the Recharts coordinate system
  const GanttBars = (props: any) => {
    const { xAxisMap, yAxisMap, offset } = props;
    if (!xAxisMap || !Object.keys(xAxisMap).length) return null;

    const xAxis = xAxisMap[Object.keys(xAxisMap)[0]];
    if (!xAxis?.scale) return null;

    const scale = xAxis.scale;
    const plotTop = offset?.top ?? 10;
    const plotBottom = (offset?.top ?? 10) + (offset?.height ?? 200);

    return (
      <g>
        {/* Current year indicator — subtle dashed line */}
        {BASE_YEAR >= startYear && BASE_YEAR <= endYear && (() => {
          const cx = scale(BASE_YEAR);
          if (cx == null || isNaN(cx)) return null;
          return (
            <line
              x1={cx}
              y1={plotTop}
              x2={cx}
              y2={plotBottom}
              stroke={UUI.neutral200}
              strokeWidth={1}
              strokeDasharray="4 3"
            />
          );
        })()}

        {/* Property rows */}
        {properties.map((prop, propIdx) => {
          const rowY = plotTop + propIdx * ROW_HEIGHT;
          const barY = rowY + ROW_HEIGHT / 2 - 1.5;
          const barH = 3;

          const iconPath = getPropertyIconPath(prop.title);

          return (
            <g key={prop.instanceId}>
              {/* Bar segments */}
              {prop.segments.map((seg, segIdx) => {
                const x1 = scale(seg.startYear);
                const x2 = scale(seg.endYear);
                if (x1 == null || x2 == null || isNaN(x1) || isNaN(x2)) return null;
                const w = x2 - x1;
                const isPostUnlock = seg.phase === 'post-unlock';

                return (
                  <rect
                    key={`seg-${segIdx}`}
                    x={x1}
                    y={barY}
                    width={Math.max(0, w)}
                    height={barH}
                    rx={1.5}
                    fill={prop.color}
                    fillOpacity={isPostUnlock ? 0.8 : 0.3}
                    pointerEvents="none"
                  />
                );
              })}

              {/* Event markers — each with its own hover */}
              {prop.events.map((evt, evtIdx) => {
                const cx = scale(evt.year);
                if (cx == null || isNaN(cx)) return null;

                if (evt.type === 'purchase') {
                  const iconSize = 14;
                  const bgSize = 26;
                  return (
                    <g
                      key={`evt-${evtIdx}`}
                      onMouseEnter={(e) => handleEventEnter(prop, evt, e)}
                      onMouseLeave={handleEventLeave}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Larger hit area for small icon */}
                      <circle
                        cx={cx}
                        cy={rowY + ROW_HEIGHT / 2}
                        r={bgSize / 2 + 4}
                        fill="transparent"
                      />
                      <circle
                        cx={cx}
                        cy={rowY + ROW_HEIGHT / 2}
                        r={bgSize / 2}
                        fill={UUI.white}
                        stroke="#E9EAEB"
                        strokeWidth={1}
                        pointerEvents="none"
                      />
                      <svg
                        x={cx - iconSize / 2}
                        y={rowY + ROW_HEIGHT / 2 - iconSize / 2}
                        width={iconSize}
                        height={iconSize}
                        viewBox="0 0 24 24"
                        fill="none"
                        style={{ pointerEvents: 'none' }}
                      >
                        <path
                          d={iconPath}
                          stroke={UUI.neutral700}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </g>
                  );
                }

                return (
                  <g
                    key={`evt-${evtIdx}`}
                    onMouseEnter={(e) => handleEventEnter(prop, evt, e)}
                    onMouseLeave={handleEventLeave}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Larger hit area for small circle */}
                    <circle
                      cx={cx}
                      cy={rowY + ROW_HEIGHT / 2}
                      r={12}
                      fill="transparent"
                    />
                    <circle
                      cx={cx}
                      cy={rowY + ROW_HEIGHT / 2}
                      r={6}
                      fill={EVENT_COLORS[evt.type]}
                      stroke={UUI.white}
                      strokeWidth={2}
                      pointerEvents="none"
                    />
                  </g>
                );
              })}
            </g>
          );
        })}
      </g>
    );
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }} onMouseLeave={() => setTooltip(null)}>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 16, left: 16, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="0"
            stroke={UUI.neutral100}
            strokeOpacity={0.8}
            vertical={false}
          />

          <XAxis
            dataKey="year"
            type="number"
            domain={[startYear, endYear]}
            ticks={xTicks}
            tick={{
              fontSize: 12,
              fontWeight: 600,
              fill: UUI.neutral500,
              fontFamily: UUI.fontFamily,
            }}
            axisLine={false}
            tickLine={false}
            tickMargin={10}
            padding={{ left: 20, right: 10 }}
          />

          <YAxis
            hide
            type="number"
            domain={[0, properties.length * ROW_HEIGHT]}
          />

          <Tooltip content={() => null} />

          <Customized component={GanttBars} />
        </ComposedChart>
      </ResponsiveContainer>

      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(tooltip.x + 16, (containerRef.current?.offsetWidth ?? 400) - 280),
            top: tooltip.y - 20,
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <EventTooltip event={tooltip.event} prop={tooltip.prop} />
        </div>
      )}
    </div>
  );
};

const tooltipBox: React.CSSProperties = {
  background: UUI.white,
  border: `1px solid ${UUI.neutral200}`,
  borderRadius: 8,
  padding: '12px 16px',
  fontFamily: UUI.fontFamily,
  fontSize: 13,
  maxWidth: 300,
  boxShadow: '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -2px rgba(0, 0, 0, 0.06)',
};

const EventTooltip: React.FC<{ event: RoadmapEvent; prop: PropertyRoadmapBar }> = ({ event, prop }) => {
  const propLabel = `${prop.purchaseYear} Property`;

  const detail = (() => {
    switch (event.type) {
      case 'purchase':
        return event.amount != null ? `Purchased for ${fmt(event.amount)}` : null;
      case 'equity_unlock':
        return event.amount != null ? `${fmt(event.amount)} now extractable` : 'Equity threshold reached';
      case 'equity_pull':
        return event.amount != null
          ? `${fmt(event.amount)} pulled${event.destinationYear ? ` → ${event.destinationYear} Property` : ''}`
          : null;
      case 'refinance':
        return event.amount != null ? `New rate: ${event.amount}%` : 'Refinanced';
    }
  })();

  return (
    <div style={tooltipBox}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: EVENT_COLORS[event.type],
            flexShrink: 0,
          }}
        />
        <span style={{ fontWeight: 600, color: UUI.neutral900 }}>
          {EVENT_LABELS[event.type]}
        </span>
      </div>
      <p style={{ color: UUI.neutral500, fontSize: 12, marginBottom: 2 }}>
        {propLabel} · {event.year}
      </p>
      {detail && (
        <p style={{ color: UUI.neutral700, fontWeight: 500, fontSize: 13 }}>
          {detail}
        </p>
      )}
    </div>
  );
};

/** KPI summary — "Releasable Now" value for ChartCard action slot */
export const PropertyRoadmapSummary: React.FC = () => {
  const { timelineProperties } = useAffordabilityCalculator();
  const { profile } = useInvestmentProfile();
  const { getInstance } = usePropertyInstance();
  const { eventBlocks } = usePropertySelection();
  const { releasableNow } = usePropertyRoadmapData(
    timelineProperties, profile, eventBlocks, getInstance,
  );

  if (releasableNow <= 0) return null;

  return (
    <div className="text-right">
      <p
        className="uppercase tracking-wider leading-tight"
        style={{ fontSize: 10, color: UUI.neutral500 }}
      >
        Releasable now
      </p>
      <p className="text-sm font-semibold" style={{ color: UUI.neutral700 }}>
        {fmt(releasableNow)}
      </p>
    </div>
  );
};

/** Legend items for ChartCard */
export const ROADMAP_LEGEND = [
  { color: '#404040', label: 'Purchase', variant: 'ring' as const },
  { color: EVENT_COLORS.equity_unlock, label: 'Equity Unlock' },
  { color: EVENT_COLORS.equity_pull, label: 'Equity Pull' },
  { color: EVENT_COLORS.refinance, label: 'Refinance' },
] as const;
