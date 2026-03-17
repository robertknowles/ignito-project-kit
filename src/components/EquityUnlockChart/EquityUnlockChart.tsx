import React, { useMemo } from 'react';
import { useAffordabilityCalculator } from '../../hooks/useAffordabilityCalculator';
import { useInvestmentProfile } from '../../hooks/useInvestmentProfile';
import { usePropertyInstance } from '../../contexts/PropertyInstanceContext';
import { useEquityUnlockTimeline } from './useEquityUnlockTimeline';
import { MIN_EXTRACTABLE_EQUITY_THRESHOLD } from '../../constants/financialParams';

/**
 * Equity Unlock Timeline — Gantt-style horizontal bars
 *
 * Each property gets a continuous bar spanning from buy year to end of timeline.
 * Bar transitions from light blue (below $50K threshold) to darker blue
 * (refinanceable) via CSS gradient. Vertical pin markers show extraction events.
 * Final equity on the right. Total extractable in top-right header.
 */

const COLORS = {
  building: 'rgba(163, 193, 250, 0.35)',  // below threshold — soft light blue
  refinanceable: 'rgba(59, 108, 244, 0.50)', // above threshold — medium blue
  extraction: 'rgba(59, 108, 244, 0.70)',  // extraction event pin
};

const fmt = (v: number) => {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${Math.round(v / 1000)}K`;
  return `$${v}`;
};

export const EquityUnlockChart: React.FC = () => {
  const { timelineProperties } = useAffordabilityCalculator();
  const { profile } = useInvestmentProfile();
  const { getInstance } = usePropertyInstance();
  const { propertyTimelines } = useEquityUnlockTimeline(timelineProperties, profile, getInstance);

  const { years, rows, totalFinalEquity, lastYear } = useMemo(() => {
    if (propertyTimelines.length === 0) {
      return { years: [] as number[], rows: [] as any[], totalFinalEquity: 0, lastYear: 0 };
    }

    // Collect all years
    const yearSet = new Set<number>();
    propertyTimelines.forEach(p => p.timeline.forEach(t => yearSet.add(t.year)));
    const years = Array.from(yearSet).sort((a, b) => a - b);
    const firstYear = years[0];
    const lastYear = years[years.length - 1];
    const totalSpan = lastYear - firstYear;

    const rows = propertyTimelines.map((prop, idx) => {
      // Find first year with equity > 0
      const firstEquityPoint = prop.timeline.find(t => t.extractableEquity > 0);
      const barStart = firstEquityPoint ? firstEquityPoint.year : prop.buyYear;

      // Find the year it crosses $50K threshold
      const thresholdPoint = prop.timeline.find(
        t => t.extractableEquity >= MIN_EXTRACTABLE_EQUITY_THRESHOLD
      );
      const thresholdYear = thresholdPoint ? thresholdPoint.year : null;

      const finalEquity = prop.timeline.length > 0
        ? prop.timeline[prop.timeline.length - 1].extractableEquity
        : 0;

      // Bar positioning as percentages of the timeline
      const barStartPct = totalSpan > 0 ? ((barStart - firstYear) / totalSpan) * 100 : 0;
      const barEndPct = 100; // bars go to end of timeline
      const barWidthPct = barEndPct - barStartPct;

      // Threshold position within the bar (for gradient transition)
      let gradientTransitionPct: number | null = null;
      if (thresholdYear && totalSpan > 0) {
        const thresholdPosInBar = (thresholdYear - barStart) / (lastYear - barStart);
        gradientTransitionPct = Math.max(0, Math.min(100, thresholdPosInBar * 100));
      }

      return {
        label: `P${idx + 1}`,
        subtitle: prop.title,
        readyYear: prop.refinanceReadyYear,
        barStartPct,
        barWidthPct,
        gradientTransitionPct,
        finalEquity,
        extractionEvent: prop.extractionEvent,
        firstYear,
        lastYear,
      };
    });

    const totalFinalEquity = rows.reduce((s, r) => s + r.finalEquity, 0);
    return { years, rows, totalFinalEquity, lastYear };
  }, [propertyTimelines]);

  if (propertyTimelines.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-8 text-center">
        Add properties to see equity unlock timeline
      </p>
    );
  }

  const LABEL_WIDTH = 100;
  const FINAL_WIDTH = 55;
  const firstYear = years[0];
  const totalSpan = lastYear - firstYear;

  return (
    <div>
      {/* Header with subtitle + total */}
      <div className="flex items-start justify-between mb-5">
        <p className="text-xs text-gray-400">
          When each property crosses the $50K refinance threshold
        </p>
        <div className="text-right flex-shrink-0 ml-4">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider leading-tight">
            Total extractable by {lastYear}
          </p>
          <p className="text-lg font-semibold text-gray-600">{fmt(totalFinalEquity)}</p>
        </div>
      </div>

      {/* Year axis */}
      <div className="relative" style={{ marginLeft: LABEL_WIDTH, marginRight: FINAL_WIDTH }}>
        <div className="flex justify-between">
          {years.filter((_, i) => {
            // Show every year if <= 10, otherwise every 2nd
            return years.length <= 12 || i % 2 === 0 || i === years.length - 1;
          }).map(y => {
            const leftPct = totalSpan > 0 ? ((y - firstYear) / totalSpan) * 100 : 0;
            return (
              <span
                key={y}
                className="text-[11px] text-gray-400 absolute"
                style={{ left: `${leftPct}%`, transform: 'translateX(-50%)' }}
              >
                {y}
              </span>
            );
          })}
        </div>
      </div>

      {/* Property rows */}
      <div className="flex flex-col gap-3 mt-6">
        {rows.map((row, idx) => (
          <div key={idx} className="flex items-center">
            {/* Label */}
            <div className="flex-shrink-0" style={{ width: LABEL_WIDTH }}>
              <p className="text-xs font-semibold text-gray-600 leading-tight">{row.label}</p>
              <p className="text-[11px] text-gray-400 truncate">{row.subtitle}</p>
            </div>

            {/* Gantt bar area */}
            <div className="flex-1 relative" style={{ height: 20 }}>
              {/* The bar */}
              <div
                className="absolute top-0 rounded-md"
                style={{
                  left: `${row.barStartPct}%`,
                  width: `${row.barWidthPct}%`,
                  height: '100%',
                  background: row.gradientTransitionPct != null
                    ? `linear-gradient(to right, ${COLORS.building} 0%, ${COLORS.building} ${row.gradientTransitionPct}%, ${COLORS.refinanceable} ${row.gradientTransitionPct}%, ${COLORS.refinanceable} 100%)`
                    : COLORS.building,
                }}
              />

              {/* Extraction event pin */}
              {row.extractionEvent && totalSpan > 0 && (
                <div
                  className="absolute flex flex-col items-center"
                  style={{
                    left: `${((row.extractionEvent.year - firstYear) / totalSpan) * 100}%`,
                    top: -20,
                    transform: 'translateX(-50%)',
                  }}
                >
                  {/* Pin label */}
                  <div
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white whitespace-nowrap"
                    style={{ backgroundColor: COLORS.extraction }}
                  >
                    {row.extractionEvent.year} · {fmt(row.extractionEvent.amount)} extracted
                  </div>
                  {/* Pin line */}
                  <div
                    className="w-px"
                    style={{
                      height: 30,
                      backgroundColor: COLORS.extraction,
                    }}
                  />
                </div>
              )}
            </div>

            {/* Final equity amount */}
            <div className="flex-shrink-0 text-right" style={{ width: FINAL_WIDTH }}>
              <span className="text-xs font-medium text-gray-500">{fmt(row.finalEquity)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-5" style={{ paddingLeft: LABEL_WIDTH }}>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: COLORS.building }} />
          <span className="text-[11px] text-gray-400">Building equity</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: COLORS.refinanceable }} />
          <span className="text-[11px] text-gray-400">Refinanceable equity</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: COLORS.extraction }} />
          <span className="text-[11px] text-gray-400">Refinance event</span>
        </div>
      </div>
    </div>
  );
};
