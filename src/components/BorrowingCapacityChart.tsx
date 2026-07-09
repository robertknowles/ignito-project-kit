import React, { useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  ResponsiveContainer,
} from 'recharts';
import {
  usePortfolioProjection,
  type PortfolioGrowthDataPoint,
  type CashflowDataPoint,
} from '../hooks/usePortfolioProjection';
import { useInvestmentProfile } from '../hooks/useInvestmentProfile';
import { usePropertySelection, type EventBlock } from '../contexts/PropertySelectionContext';
import {
  BASE_YEAR,
  ANNUAL_WAGE_GROWTH_RATE,
  PERIODS_PER_YEAR,
} from '../constants/financialParams';
import { calculateBorrowingCeiling } from '../utils/borrowingCapacityCeiling';
import type { TimelineProperty } from '../types/property';
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext';

interface BorrowingCapacityChartProps {
  scenarioData?: {
    timelineProperties: TimelineProperty[];
    profile: InvestmentProfileData;
  };
  /** Precomputed projection (Compare). When supplied, the chart plots these
   *  numbers directly instead of recomputing from the live contexts — so a
   *  saved plan or an AI-remodel draft charts its own borrowing picture in
   *  isolation, rather than inheriting the active dashboard scenario's
   *  instances via getInstance. */
  projection?: {
    portfolioGrowthData: PortfolioGrowthDataPoint[];
    cashflowData: CashflowDataPoint[];
  };
  /** Event blocks for the ceiling's rental-serviceability contribution.
   *  Compare passes [] to match the headless runner (which doesn't persist
   *  them); omit on the dashboard to use the live selection. */
  eventBlocksOverride?: EventBlock[];
}

const UUI = {
  brand600: '#7C3AED',
  ink: '#7C3AED',        // pin outlines / goal glyph
  fill: '#8B5CF6',       // capacity hero line + headroom band + anchor dots
  reference: '#A1A1AA',  // Debt-not-Offset line (band's lower edge)
  axis: '#A1A1AA',       // axis tick labels
  gridline: '#F0F1F4',   // faint gridlines
  brand200: '#EDE9FE',
  brand300: '#DDD6FE',
  neutral900: '#181D27',
  neutral700: '#404040',
  neutral500: '#717680',
  neutral200: '#E9EAEB',
  neutral100: '#F5F5F5',
  white: '#FFFFFF',
  success: '#17B26A',
  fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

const CAPACITY_STROKE = UUI.fill;
const DEBT_STROKE = '#414651';
const OFFSET_STROKE = UUI.reference;

// Purchase markers — violet house-pins on stems, anchored on the Capacity line (§3.1)
const PurchaseDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!cx || !cy || isNaN(cx) || isNaN(cy)) return null;
  if (!payload?.properties?.length) return null;

  const baseLift = 26;   // gap from the line to the lowest pin head
  const stemGap = 22;    // vertical gap between stacked pin heads
  const n = payload.properties.length;
  const topPinY = cy - baseLift - (n - 1) * stemGap;

  return (
    <g style={{ pointerEvents: 'none' }}>
      <circle cx={cx} cy={cy} r={3} fill={UUI.fill} />
      <line x1={cx} y1={cy} x2={cx} y2={topPinY} stroke={UUI.fill} strokeWidth={1.5} />
      {payload.properties.map((_title: string, idx: number) => {
        const pinY = cy - baseLift - idx * stemGap;
        return (
          <g key={`${payload.year}-${idx}`}>
            {/* Inverted house pin — accent disc, white ring, solid white house + door */}
            <circle cx={cx} cy={pinY} r={8.5} fill={UUI.ink} stroke={UUI.white} strokeWidth={1.5} />
            <path
              transform={`translate(${cx}, ${pinY})`}
              d="M 0 -4.3 L 4.1 -0.9 L 4.1 4.1 L -4.1 4.1 L -4.1 -0.9 Z"
              fill={UUI.white}
            />
            <rect x={cx - 1.1} y={pinY + 1.5} width={2.2} height={2.8} rx={0.5} fill={UUI.ink} />
          </g>
        );
      })}
    </g>
  );
};

// Debt-free milestone — target pin on a stem (replaces the pill)
const debtFreePin = (cx: number, cy: number) => {
  const pinY = cy - 30;
  return (
    <g style={{ pointerEvents: 'none' }}>
      <line x1={cx} y1={cy} x2={cx} y2={pinY} stroke={UUI.fill} strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={3} fill={UUI.fill} />
      <g transform={`translate(${cx}, ${pinY})`}>
        <circle cx={0} cy={0} r={8.5} fill={UUI.white} stroke={UUI.ink} strokeWidth={1.4} />
        <circle cx={0} cy={0.2} r={3.1} fill="none" stroke={UUI.ink} strokeWidth={1.1} />
        <circle cx={0} cy={0.2} r={1} fill={UUI.ink} />
        <text x={0} y={-12} textAnchor="middle" fontFamily={UUI.fontFamily} fontSize={9} fontWeight={600} fill={UUI.ink}>Debt free</text>
      </g>
    </g>
  );
};

export const BorrowingCapacityChart: React.FC<BorrowingCapacityChartProps> = ({
  scenarioData,
  projection,
  eventBlocksOverride,
}) => {
  const internal = usePortfolioProjection(scenarioData);
  const { profile: contextProfile } = useInvestmentProfile();
  const { eventBlocks: contextEventBlocks } = usePropertySelection();
  const profile = scenarioData?.profile ?? contextProfile;
  const portfolioGrowthData = projection?.portfolioGrowthData ?? internal.portfolioGrowthData;
  const cashflowData = projection?.cashflowData ?? internal.cashflowData;
  const eventBlocks = eventBlocksOverride ?? contextEventBlocks;

  const data = useMemo(() => {
    const endYear = BASE_YEAR + profile.timelineYears - 1;
    const wageGrowth = profile.wageGrowthRate ?? ANNUAL_WAGE_GROWTH_RATE;

    return portfolioGrowthData
      .filter(d => Number(d.year) <= endYear)
      .map(d => {
        const year = Number(d.year);
        const yearsElapsed = year - BASE_YEAR;
        const period = yearsElapsed * PERIODS_PER_YEAR + 1;

        const cfPoint = cashflowData.find(c => c.year === d.year);
        const grossRentalIncome = cfPoint?.rentalIncome ?? 0;

        const totalDebt = d.totalDebt ?? 0;

        // SINGLE SOURCE OF TRUTH: same function used by the affordability calculator.
        // Display-only new-build uplift (retained negative-gearing add-back) is
        // layered on top — gating uses the un-uplifted ceiling.
        const borrowingCeiling = calculateBorrowingCeiling(period, {
          statedBC: profile.borrowingCapacity ?? 0,
          baseSalary: profile.baseSalary ?? 60000,
          salaryMultiplier: profile.salaryServiceabilityMultiplier ?? 6.0,
          wageGrowth,
          grossRentalIncome,
          eventBlocks,
        }) + (d.newBuildBcUplift ?? 0);

        // "Offset Debt" = what lenders count against your capacity.
        // Entity-discounted (trust=25%, SMSF=0%) minus cash reserves.
        // This ensures offset debt never exceeds the borrowing ceiling for feasible properties.
        const lenderDebt = d.entityDiscountedDebt ?? totalDebt;
        const cashOffset = Math.min(d.cashOffset ?? 0, lenderDebt);
        const offsetDebt = Math.round(Math.max(0, lenderDebt - cashOffset));

        return {
          year: d.year,
          borrowingCeiling,
          totalDebt,
          offsetDebt,
          // Derived plotting value: the violet band = available borrowing power,
          // stacked on top of offsetDebt so its top edge lands on the ceiling.
          headroomBand: Math.max(0, borrowingCeiling - offsetDebt),
          properties: d.properties,
        };
      });
  }, [portfolioGrowthData, cashflowData, profile, eventBlocks]);

  const debtFreePoint = useMemo(() => {
    const hasDebt = data.some(d => d.offsetDebt > 0);
    if (!hasDebt) return null;

    let lastDebtIndex = -1;
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].offsetDebt > 0) {
        lastDebtIndex = i;
        break;
      }
    }
    if (lastDebtIndex < 0 || lastDebtIndex >= data.length - 1) return null;
    return data[lastDebtIndex + 1];
  }, [data]);

  // ── Round-number Y frame (§3.9a) + sparse X ticks (§3.5) ──────────────────
  const { yCeil, yTicks, xTicks } = useMemo(() => {
    const max = Math.max(0, ...data.map(d => d.borrowingCeiling ?? 0));
    const niceCeil = (v: number) => {
      if (v <= 0) return 1_000_000;
      const pow = Math.pow(10, Math.floor(Math.log10(v)));
      for (const s of [1, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (v <= s * pow) return s * pow;
      return 10 * pow;
    };
    const ceil = niceCeil(max);
    const ticks = [0, 1, 2, 3, 4].map(i => (ceil * i) / 4);
    const yrs = data.map(d => Number(d.year));
    const first = yrs[0], last = yrs[yrs.length - 1];
    const xt = data.map(d => d.year).filter((_, i) => (yrs[i] - first) % 5 === 0);
    if (last != null && Number(xt[xt.length - 1]) !== last) xt.push(data[data.length - 1].year);
    return { yCeil: ceil, yTicks: ticks, xTicks: xt };
  }, [data]);

  const fmtTick = (v: number) => {
    if (v === 0) return '$0';
    if (v >= 1e6) { const m = v / 1e6; return `$${Number.isInteger(m) ? m : m.toFixed(1)}M`; }
    return `$${Math.round(v / 1e3)}k`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const ceiling = payload.find((p: any) => p.dataKey === 'borrowingCeiling')?.value ?? 0;
    const debt = payload.find((p: any) => p.dataKey === 'totalDebt')?.value ?? 0;
    const netExposure = payload.find((p: any) => p.dataKey === 'offsetDebt')?.value ?? 0;
    const entityDiscount = debt - netExposure;
    const headroom = ceiling - netExposure;

    // Order rows to match each line's vertical position at this point (top line first).
    const lines = [
      { key: 'capacity', label: 'Capacity', value: ceiling, color: CAPACITY_STROKE, dashed: false },
      { key: 'debt', label: 'Total Liabilities', value: debt, color: DEBT_STROKE, dashed: true },
      { key: 'offset', label: 'Debt not Offset', value: netExposure, color: OFFSET_STROKE, dashed: false },
    ].sort((a, b) => b.value - a.value);

    return (
      <div
        className="bg-white border rounded-xl"
        style={{
          borderColor: '#E9EAEB',
          padding: '12px 16px',
          fontSize: 13,
          boxShadow: '0px 12px 16px -4px rgba(0, 0, 0, 0.08), 0px 4px 6px -2px rgba(0, 0, 0, 0.03)',
        }}
      >
        <p className="font-semibold text-[#181D27] mb-2">{label}</p>
        {lines.map(line => (
          <div key={line.key} className="flex justify-between gap-6 mb-1">
            <span className="flex items-center gap-1.5">
              {line.dashed ? (
                <span className="inline-flex items-center gap-0.5">
                  <span className="inline-block w-[3px] h-[3px] rounded-full" style={{ background: line.color }} />
                  <span className="inline-block w-[3px] h-[3px] rounded-full" style={{ background: line.color }} />
                </span>
              ) : (
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: line.color }} />
              )}
              <span className="text-gray-500">{line.label}</span>
            </span>
            <span className="font-medium text-gray-700">${line.value.toLocaleString()}</span>
          </div>
        ))}
        <div
          className="flex justify-between gap-6 pt-2 mt-1"
          style={{ borderTop: '1px solid #F3F4F6' }}
        >
          <span className="font-semibold text-gray-900">Headroom</span>
          <span className={`font-semibold ${headroom > 0 ? 'text-gray-900' : 'text-red-500'}`}>
            ${Math.abs(headroom).toLocaleString()}
          </span>
        </div>
        {entityDiscount > 0 && (
        <div className="flex justify-between gap-6 mt-0.5">
          <span className="text-gray-400 text-xs">Entity + Cash Offset</span>
          <span className="text-gray-400 text-xs">${entityDiscount.toLocaleString()}</span>
        </div>
        )}
      </div>
    );
  };

  return (
    // Fills the card (ChartCard content is a flex column); minHeight guards
    // against collapse when the card isn't stretched by a taller sibling.
    <div style={{ flex: 1, minHeight: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="0"
            stroke={UUI.gridline}
            strokeOpacity={1}
            vertical={false}
          />

          <XAxis
            dataKey="year"
            ticks={xTicks}
            interval={0}
            tick={{
              fontSize: 9,
              fill: UUI.axis,
              fontFamily: UUI.fontFamily,
            }}
            axisLine={false}
            tickLine={false}
            tickMargin={10}
            padding={{ left: 12, right: 10 }}
          />
          {/* Full-height labelled $ Y axis — round ceiling, 50px gutter (§3.9a) */}
          <YAxis
            domain={[0, yCeil]}
            ticks={yTicks}
            tickFormatter={fmtTick}
            tick={{ fontSize: 9, fill: UUI.axis, fontFamily: UUI.fontFamily }}
            axisLine={false}
            tickLine={false}
            width={42}
          />
          {/* Hidden axis for tooltip-only series — keeps them OUT of the visible
              Y scale (Total Liabilities can exceed the ceiling and was silently
              stretching the domain, squashing the band into the bottom). */}
          <YAxis yAxisId="tooltipOnly" hide />
          <Tooltip content={<CustomTooltip />} />

          {/* Hidden series so Capacity + Total Liabilities stay in the tooltip payload */}
          <Line yAxisId="tooltipOnly" dataKey="borrowingCeiling" name="Borrowing Capacity" stroke="transparent" dot={false} activeDot={false} isAnimationActive={false} />
          <Line yAxisId="tooltipOnly" dataKey="totalDebt" name="Total Liabilities" stroke="transparent" dot={false} activeDot={false} isAnimationActive={false} />

          {/* Debt not Offset — grey line = lower edge of the headroom band */}
          <Area
            type="monotone"
            dataKey="offsetDebt"
            name="Debt not Offset"
            stackId="bcBand"
            stroke={OFFSET_STROKE}
            strokeWidth={1.75}
            fill="transparent"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />

          {/* Headroom band — violet tint from Debt-not-Offset up to Capacity;
              its top edge (stacked to the ceiling) draws the violet Capacity line */}
          <Area
            type="monotone"
            dataKey="headroomBand"
            name="Headroom"
            stackId="bcBand"
            stroke={CAPACITY_STROKE}
            strokeWidth={2.5}
            fill={CAPACITY_STROKE}
            fillOpacity={0.16}
            dot={<PurchaseDot />}
            activeDot={false}
            isAnimationActive={false}
          />

          {/* Debt-free milestone — target pin on a stem */}
          {debtFreePoint && (
            <ReferenceDot
              x={debtFreePoint.year}
              y={debtFreePoint.offsetDebt}
              r={0}
              shape={(props: any) => debtFreePin(props.cx, props.cy)}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
