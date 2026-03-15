import React, { useMemo } from 'react';
import { useAffordabilityCalculator } from '../../hooks/useAffordabilityCalculator';
import { CHART_COLORS } from '../../constants/chartColors';

/**
 * Funding Sources Chart — Horizontal Timeline Bars
 *
 * Each property is a row. The bar spans from the previous purchase year
 * to this property's purchase year (the accumulation window). Colour
 * segments within each bar show funding sources (cash, equity, savings)
 * proportionally, with dollar amounts labelled inside.
 *
 * Built with CSS divs for natural page-width sizing.
 * Data: consumes timelineProperties[].fundingBreakdown directly.
 * NO new calculations.
 */

const SEGMENT_COLORS: Record<string, string> = {
  cash: CHART_COLORS.series[0],
  equity: CHART_COLORS.series[1],
  savings: CHART_COLORS.series[2],
};

const fmt = (v: number) => {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${Math.round(v / 1000)}k`;
  return `$${v}`;
};

interface FundingSegment {
  type: string;
  value: number;
  pct: number;
}

interface FundingRow {
  title: string;
  buyYear: number;
  startYear: number;
  deposit: number;
  segments: FundingSegment[];
}

export const FundingSourcesChart: React.FC = () => {
  const { timelineProperties } = useAffordabilityCalculator();

  const { rows, minYear, maxYear, yearLabels } = useMemo(() => {
    const feasible = timelineProperties.filter(p => p.status === 'feasible');

    if (feasible.length === 0) {
      return { rows: [] as FundingRow[], minYear: 2025, maxYear: 2030, yearLabels: [] as number[] };
    }

    const builtRows: FundingRow[] = feasible.map((prop, i) => {
      const buyYear = Math.floor(prop.affordableYear);
      const startYear = i === 0 ? buyYear : Math.floor(feasible[i - 1].affordableYear);
      const fb = prop.fundingBreakdown;
      const total = fb.total || 1;

      const segments: FundingSegment[] = [];
      if (fb.cash > 0) segments.push({ type: 'cash', value: fb.cash, pct: fb.cash / total });
      if (fb.equity > 0) segments.push({ type: 'equity', value: fb.equity, pct: fb.equity / total });
      if (fb.savings > 0) segments.push({ type: 'savings', value: fb.savings, pct: fb.savings / total });

      return { title: prop.title, buyYear, startYear, deposit: Math.round(total), segments };
    });

    const min = Math.min(...builtRows.map(r => r.startYear));
    const max = Math.max(...builtRows.map(r => r.buyYear)) + 1;
    const labels: number[] = [];
    for (let y = min; y <= max; y++) labels.push(y);

    return { rows: builtRows, minYear: min, maxYear: max, yearLabels: labels };
  }, [timelineProperties]);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-8 text-center">
        Add properties to see funding sources
      </p>
    );
  }

  const yearRange = maxYear - minYear || 1;
  const yearToPct = (y: number) => ((y - minYear) / yearRange) * 100;

  return (
    <div>
      {/* Year axis labels */}
      <div className="relative h-5 ml-[140px] mr-4 mb-1">
        {yearLabels.map(yr => (
          <span
            key={yr}
            className="absolute text-[11px] -translate-x-1/2"
            style={{ left: `${yearToPct(yr)}%`, color: CHART_COLORS.axisText, fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            {yr}
          </span>
        ))}
      </div>

      {/* Property rows */}
      <div className="flex flex-col">
        {rows.map((row, ri) => {
          const barLeftPct = yearToPct(row.startYear);
          const barWidthPct = Math.max(yearToPct(row.buyYear) - barLeftPct, 2); // min 2% for instant buys

          return (
            <div
              key={`${row.title}-${ri}`}
              className="flex items-center gap-0"
              style={{
                borderTop: ri > 0 ? `1px solid ${CHART_COLORS.grid}` : undefined,
              }}
            >
              {/* Label */}
              <div className="w-[140px] flex-shrink-0 py-3 pl-4">
                <div className="text-[12px] font-semibold text-gray-900 leading-tight">{row.title}</div>
                <div className="text-[10px] text-gray-400">{fmt(row.deposit)} deposit</div>
              </div>

              {/* Timeline area */}
              <div className="flex-1 relative py-3 pr-4">
                {/* Funding bar */}
                <div
                  className="relative flex h-7 rounded overflow-hidden"
                  style={{
                    marginLeft: `${barLeftPct}%`,
                    width: `${barWidthPct}%`,
                  }}
                >
                  {row.segments.map((seg, si) => {
                    return (
                      <div
                        key={seg.type}
                        className="relative flex items-center justify-center overflow-hidden"
                        style={{
                          width: `${seg.pct * 100}%`,
                          backgroundColor: SEGMENT_COLORS[seg.type],
                        }}
                        title={`${seg.type}: ${fmt(seg.value)} (${Math.round(seg.pct * 100)}%)`}
                      >
                        {/* Label inside segment — only show if wide enough */}
                        <span className="text-[9px] font-medium text-white whitespace-nowrap px-1 truncate">
                          {fmt(seg.value)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Purchase dot at end of bar */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white border-2"
                  style={{
                    left: `${barLeftPct + barWidthPct}%`,
                    borderColor: CHART_COLORS.primary,
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
