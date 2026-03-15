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

const SEGMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  equity: 'Equity',
  savings: 'Savings',
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
            className="absolute text-[11px] text-gray-400 -translate-x-1/2"
            style={{ left: `${yearToPct(yr)}%`, fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            {yr}
          </span>
        ))}
      </div>

      {/* Property rows */}
      <div className="flex flex-col gap-2">
        {rows.map((row, ri) => {
          const barLeftPct = yearToPct(row.startYear);
          const barWidthPct = Math.max(yearToPct(row.buyYear) - barLeftPct, 2); // min 2% for instant buys

          return (
            <div
              key={`${row.title}-${ri}`}
              className="flex items-center gap-0 rounded-lg"
              style={{ backgroundColor: ri % 2 === 0 ? '#F8FAFC' : 'white' }}
            >
              {/* Label */}
              <div className="w-[140px] flex-shrink-0 py-3 pl-4">
                <div className="text-[12px] font-semibold text-gray-900 leading-tight">{row.title}</div>
                <div className="text-[10px] text-gray-500">{fmt(row.deposit)} deposit</div>
              </div>

              {/* Timeline area */}
              <div className="flex-1 relative py-3 pr-4">
                {/* Year grid lines */}
                {yearLabels.map(yr => (
                  <div
                    key={yr}
                    className="absolute top-0 bottom-0 border-l"
                    style={{
                      left: `${yearToPct(yr)}%`,
                      borderColor: CHART_COLORS.grid,
                    }}
                  />
                ))}

                {/* Funding bar */}
                <div
                  className="relative flex h-9 rounded-md overflow-hidden"
                  style={{
                    marginLeft: `${barLeftPct}%`,
                    width: `${barWidthPct}%`,
                  }}
                >
                  {row.segments.map((seg, si) => {
                    const isFirst = si === 0;
                    const isLast = si === row.segments.length - 1;
                    return (
                      <div
                        key={seg.type}
                        className="relative flex items-center justify-center overflow-hidden"
                        style={{
                          width: `${seg.pct * 100}%`,
                          backgroundColor: SEGMENT_COLORS[seg.type],
                          opacity: 0.85,
                          borderTopLeftRadius: isFirst ? 4 : 0,
                          borderBottomLeftRadius: isFirst ? 4 : 0,
                          borderTopRightRadius: isLast ? 4 : 0,
                          borderBottomRightRadius: isLast ? 4 : 0,
                        }}
                        title={`${SEGMENT_LABELS[seg.type]}: ${fmt(seg.value)} (${Math.round(seg.pct * 100)}%)`}
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
