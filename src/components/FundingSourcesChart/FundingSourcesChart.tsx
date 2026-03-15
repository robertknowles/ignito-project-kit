import React, { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Customized,
} from 'recharts';
import { useAffordabilityCalculator } from '../../hooks/useAffordabilityCalculator';
import { CHART_COLORS, CHART_STYLE } from '../../constants/chartColors';
import { getPropertyTypeIcon } from '../../utils/propertyTypeIcon';

/**
 * Funding Sources Chart — Per-Purchase Accumulation Mountains
 *
 * Groups properties by purchase year. Each purchase-group gets its own
 * "mountain" growing from $0 to combined deposit, then resets.
 * House icons (matching Investment Timeline) are stacked at each peak.
 *
 * Colors: same two blues as cashflow chart + soft grey for savings.
 */

const AREA_COLORS = {
  cash: CHART_COLORS.barPositive,
  equity: CHART_COLORS.barNegative,
  savings: 'rgba(156, 163, 175, 0.35)',
};

const fmt = (v: number) => {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${Math.round(v / 1000)}k`;
  return `$${v}`;
};

const formatYAxis = (value: number) => {
  if (value === 0) return '$0';
  if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `$${Math.round(value / 1000)}k`;
  return `$${value}`;
};

interface ChartDataPoint {
  year: number;
  cash: number;
  equity: number;
  savings: number;
  total: number;
  isPurchase: boolean;
}

/** One icon to render — multiple per year if stacked */
interface IconEntry {
  year: number;
  total: number; // y-value (combined deposit for that year)
  title: string;
  stackIndex: number; // 0 = bottom icon, 1 = above, etc.
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload as ChartDataPoint;
  if (data.total === 0) return null;
  return (
    <div className="bg-white p-3 border border-gray-100 shadow-sm rounded-lg">
      <p className="text-xs font-medium text-gray-600 mb-1.5">Year {Math.floor(label)}</p>
      {data.cash > 0 && (
        <div className="flex items-center gap-1.5 mb-0.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: AREA_COLORS.cash }} />
          <span className="text-xs text-gray-500">Cash Deposit: {fmt(Math.round(data.cash))}</span>
        </div>
      )}
      {data.equity > 0 && (
        <div className="flex items-center gap-1.5 mb-0.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: AREA_COLORS.equity }} />
          <span className="text-xs text-gray-500">Equity Extraction: {fmt(Math.round(data.equity))}</span>
        </div>
      )}
      {data.savings > 0 && (
        <div className="flex items-center gap-1.5 mb-0.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: AREA_COLORS.savings }} />
          <span className="text-xs text-gray-500">Accumulated Savings: {fmt(Math.round(data.savings))}</span>
        </div>
      )}
      <div className="border-t border-gray-100 mt-1 pt-1">
        <span className="text-xs font-medium text-gray-600">Total Deposit: {fmt(Math.round(data.total))}</span>
      </div>
    </div>
  );
};

const ICON_SIZE = 34;
const ICON_STACK_GAP = 30;

/** Renders house icons at purchase peaks, stacked for same-year purchases */
const PurchaseIcons: React.FC<{
  icons: IconEntry[];
  xAxisMap?: any;
  yAxisMap?: any;
}> = ({ icons, xAxisMap, yAxisMap }) => {
  if (!xAxisMap || !yAxisMap) return null;

  const xAxis = Object.values(xAxisMap)[0] as any;
  const yAxis = Object.values(yAxisMap)[0] as any;
  if (!xAxis?.scale || !yAxis?.scale) return null;

  return (
    <g>
      {icons.map((icon, idx) => {
        const cx = xAxis.scale(icon.year);
        const cy = yAxis.scale(icon.total);
        if (cx == null || cy == null || isNaN(cx) || isNaN(cy)) return null;

        // Center on peak, sit above the peak point, stack upward
        const x = cx - ICON_SIZE / 2;
        const y = cy - ICON_SIZE - 4 - (icon.stackIndex * ICON_STACK_GAP);

        return (
          <foreignObject
            key={`icon-${idx}`}
            x={x}
            y={y}
            width={ICON_SIZE}
            height={ICON_SIZE}
          >
            <div
              className="bg-white rounded-full flex items-center justify-center shadow-sm overflow-hidden"
              style={{
                width: ICON_SIZE,
                height: ICON_SIZE,
                border: `1px solid ${CHART_COLORS.annotationText}`,
              }}
            >
              <div style={{ transform: 'scale(1.4) translateY(-1px)' }}>
                {getPropertyTypeIcon(icon.title, ICON_SIZE)}
              </div>
            </div>
          </foreignObject>
        );
      })}
    </g>
  );
};

export const FundingSourcesChart: React.FC = () => {
  const { timelineProperties } = useAffordabilityCalculator();

  const { chartData, icons, refLineYears, yearTicks, minYear, maxYear } = useMemo(() => {
    const feasible = timelineProperties.filter(p => p.status === 'feasible');

    if (feasible.length === 0) {
      return { chartData: [] as ChartDataPoint[], icons: [] as IconEntry[], refLineYears: [] as number[], yearTicks: [] as number[], minYear: 0, maxYear: 0 };
    }

    // Group properties by buy year
    interface PropInfo { title: string; cash: number; equity: number; savings: number; }
    const yearGroups = new Map<number, PropInfo[]>();

    feasible.forEach(prop => {
      const buyYear = Math.floor(prop.affordableYear);
      const fb = prop.fundingBreakdown;
      const info: PropInfo = {
        title: prop.title,
        cash: fb.cash || 0,
        equity: fb.equity || 0,
        savings: fb.savings || 0,
      };
      if (!yearGroups.has(buyYear)) yearGroups.set(buyYear, []);
      yearGroups.get(buyYear)!.push(info);
    });

    // Sort by year and build waves
    const sortedYears = [...yearGroups.keys()].sort((a, b) => a - b);

    interface Wave {
      startYear: number;
      buyYear: number;
      cash: number;
      equity: number;
      savings: number;
      total: number;
      titles: string[];
    }

    const waves: Wave[] = sortedYears.map((yr, i) => {
      const props = yearGroups.get(yr)!;
      const startYear = i === 0 ? yr : sortedYears[i - 1];
      const cash = props.reduce((s, p) => s + p.cash, 0);
      const equity = props.reduce((s, p) => s + p.equity, 0);
      const savings = props.reduce((s, p) => s + p.savings, 0);
      return {
        startYear, buyYear: yr,
        cash, equity, savings,
        total: cash + equity + savings,
        titles: props.map(p => p.title),
      };
    });

    // Build chart data and icons
    const data: ChartDataPoint[] = [];
    const allIcons: IconEntry[] = [];
    const rLines: number[] = [];
    const zero: Omit<ChartDataPoint, 'year'> = { cash: 0, equity: 0, savings: 0, total: 0, isPurchase: false };

    waves.forEach((w, i) => {
      const span = w.buyYear - w.startYear;
      rLines.push(w.buyYear);

      if (span === 0) {
        // Instant purchase — narrow rectangular block so the area is visible
        const halfWidth = 0.15;
        const peak = { cash: w.cash, equity: w.equity, savings: w.savings, total: w.total };
        data.push({ ...zero, year: w.buyYear - halfWidth - 0.01 });
        data.push({ ...peak, year: w.buyYear - halfWidth, isPurchase: false });
        data.push({ ...peak, year: w.buyYear, isPurchase: true });
        data.push({ ...peak, year: w.buyYear + halfWidth, isPurchase: false });
        if (i < waves.length - 1) {
          data.push({ ...zero, year: w.buyYear + halfWidth + 0.01 });
        }
      } else {
        // Zero at start of wave
        data.push({ ...zero, year: w.startYear + 0.01 });

        // Intermediate years
        for (let yr = w.startYear + 1; yr < w.buyYear; yr++) {
          const fraction = (yr - w.startYear) / span;
          data.push({
            year: yr,
            cash: w.cash * fraction, equity: w.equity * fraction,
            savings: w.savings * fraction, total: w.total * fraction,
            isPurchase: false,
          });
        }

        // Peak
        data.push({
          year: w.buyYear, cash: w.cash, equity: w.equity,
          savings: w.savings, total: w.total, isPurchase: true,
        });

        // Reset after
        if (i < waves.length - 1) {
          data.push({ ...zero, year: w.buyYear + 0.01 });
        }
      }

      // Icons — one per property, stacked
      w.titles.forEach((title, si) => {
        allIcons.push({ year: w.buyYear, total: w.total, title, stackIndex: si });
      });
    });

    // Generate explicit integer year ticks from first to last purchase year
    const minYear = sortedYears[0];
    const maxYear = sortedYears[sortedYears.length - 1];
    const yearTicks: number[] = [];
    for (let y = minYear; y <= maxYear; y++) yearTicks.push(y);

    return { chartData: data, icons: allIcons, refLineYears: rLines, yearTicks, minYear, maxYear };
  }, [timelineProperties]);

  if (chartData.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-8 text-center">
        Add properties to see funding sources
      </p>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 44, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid {...CHART_STYLE.grid} />
          <XAxis
            dataKey="year"
            type="number"
            domain={[minYear - 0.5, maxYear + 0.5]}
            ticks={yearTicks}
            tickFormatter={(v: number) => String(v)}
            allowDecimals={false}
            {...CHART_STYLE.xAxis}
          />
          <YAxis
            tickFormatter={formatYAxis}
            {...CHART_STYLE.yAxis}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Stacked areas — each mountain grows then resets */}
          <Area
            type="linear"
            dataKey="cash"
            stackId="funding"
            fill={AREA_COLORS.cash}
            stroke="none"
            name="Cash Deposit"
          />
          <Area
            type="linear"
            dataKey="equity"
            stackId="funding"
            fill={AREA_COLORS.equity}
            stroke="none"
            name="Equity Extraction"
          />
          <Area
            type="linear"
            dataKey="savings"
            stackId="funding"
            fill={AREA_COLORS.savings}
            stroke="none"
            name="Accumulated Savings"
          />

          {/* Purchase year reference lines */}
          {refLineYears.map(yr => (
            <ReferenceLine
              key={`ref-${yr}`}
              x={yr}
              stroke={CHART_COLORS.referenceLine}
              strokeDasharray="4 4"
              strokeWidth={1}
            />
          ))}

          {/* House icons at purchase peaks — stacked for same-year */}
          <Customized
            component={(props: any) => (
              <PurchaseIcons
                icons={icons}
                xAxisMap={props.xAxisMap}
                yAxisMap={props.yAxisMap}
              />
            )}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
