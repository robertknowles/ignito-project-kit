import React from 'react';
import type { PropertyYearSnapshot } from '../../utils/metricsCalculator';

interface HoldingCostSparklineProps {
  data: PropertyYearSnapshot[];
  color: string;
  currentYear: number;
  width?: number;
  height?: number;
}

/**
 * Inline SVG sparkline showing net cost trajectory for a property's hold period.
 * A dot marks the current snapshot year.
 */
export const HoldingCostSparkline: React.FC<HoldingCostSparklineProps> = ({
  data,
  color,
  currentYear,
  width = 200,
  height = 24,
}) => {
  if (data.length < 2) return null;

  const nets = data.map(d => d.monthlyNetCost);
  const minNet = Math.min(...nets);
  const maxNet = Math.max(...nets);
  const range = maxNet - minNet || 1;
  const minYr = data[0].year;
  const maxYr = data[data.length - 1].year;
  const yrRange = maxYr - minYr || 1;

  const toX = (yr: number) => ((yr - minYr) / yrRange) * width;
  const toY = (v: number) => 2 + (height - 4) * (1 - (v - minNet) / range);

  const pathD = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(d.year)} ${toY(d.monthlyNetCost)}`)
    .join(' ');

  // Zero line if data crosses zero
  const showZero = minNet < 0 && maxNet > 0;
  const zeroY = showZero ? toY(0) : null;

  // Current year dot
  const curPoint = data.find(d => d.year === currentYear);

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      {zeroY !== null && (
        <line x1={0} x2={width} y1={zeroY} y2={zeroY} stroke="#F1F3F5" strokeWidth={0.75} />
      )}
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      {curPoint && (
        <circle
          cx={toX(curPoint.year)}
          cy={toY(curPoint.monthlyNetCost)}
          r={3}
          fill={color}
        />
      )}
    </svg>
  );
};
