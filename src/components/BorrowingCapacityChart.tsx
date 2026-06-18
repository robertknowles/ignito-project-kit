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
  Label,
  ResponsiveContainer,
} from 'recharts';
import { usePortfolioProjection } from '../hooks/usePortfolioProjection';
import { useInvestmentProfile } from '../hooks/useInvestmentProfile';
import { usePropertySelection } from '../contexts/PropertySelectionContext';
import {
  BASE_YEAR,
  ANNUAL_WAGE_GROWTH_RATE,
  PERIODS_PER_YEAR,
} from '../constants/financialParams';
import { calculateBorrowingCeiling } from '../utils/borrowingCapacityCeiling';
import { getPropertyIconPath } from './icons/PropertyIconPaths';
import type { TimelineProperty } from '../types/property';
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext';

interface BorrowingCapacityChartProps {
  scenarioData?: {
    timelineProperties: TimelineProperty[];
    profile: InvestmentProfileData;
  };
}

const UUI = {
  brand600: '#7F56D9',
  brand200: '#E9D7FE',
  brand300: '#D6BBFB',
  neutral900: '#171717',
  neutral700: '#404040',
  neutral500: '#737373',
  neutral200: '#E5E5E5',
  neutral100: '#F5F5F5',
  white: '#FFFFFF',
  success: '#00A63E',
  fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

const CAPACITY_STROKE = UUI.brand600;
const DEBT_STROKE = '#414651';
const OFFSET_STROKE = '#9E77ED';

const PurchaseDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!cx || !cy || isNaN(cx) || isNaN(cy)) return null;
  if (!payload?.properties?.length) return null;

  const iconSize = 14;
  const bgSize = 26;
  const stackGap = 2;

  return (
    <g>
      {payload.properties.map((title: string, idx: number) => {
        const iconPath = getPropertyIconPath(title);
        const iconCy = cy - idx * (bgSize + stackGap);
        return (
          <g key={`${payload.year}-${idx}`}>
            <circle cx={cx} cy={iconCy} r={bgSize / 2} fill="#FFFFFF" stroke="#E5E5E5" strokeWidth={1} />
            <svg
              x={cx - iconSize / 2}
              y={iconCy - iconSize / 2}
              width={iconSize}
              height={iconSize}
              viewBox="0 0 24 24"
              fill="none"
              style={{ pointerEvents: 'none' }}
            >
              <path d={iconPath} stroke="#171717" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </g>
        );
      })}
    </g>
  );
};

const DebtFreeMarker = ({ viewBox }: any) => {
  if (!viewBox) return null;
  const cx = viewBox.x + (viewBox.width ?? 0) / 2;
  const cy = viewBox.y + (viewBox.height ?? 0) / 2;
  const badgeY = 4;
  return (
    <g>
      <line x1={cx} y1={badgeY + 22} x2={cx} y2={cy - 6} stroke={UUI.brand600} strokeWidth={1.5} strokeDasharray="3 2" />
      <rect x={cx - 42} y={badgeY} width={84} height={22} rx={11} fill={UUI.brand600} />
      <text x={cx} y={badgeY + 14.5} textAnchor="middle" fill="white" fontSize={10} fontWeight={600} fontFamily={UUI.fontFamily}>
        Debt Free ✓
      </text>
    </g>
  );
};

export const BorrowingCapacityChart: React.FC<BorrowingCapacityChartProps> = ({ scenarioData }) => {
  const { portfolioGrowthData, cashflowData } = usePortfolioProjection(scenarioData);
  const { profile: contextProfile } = useInvestmentProfile();
  const { eventBlocks } = usePropertySelection();
  const profile = scenarioData?.profile ?? contextProfile;

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
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 16, left: 16, bottom: 0 }}
        >
          <defs>
            <linearGradient id="bcCapacityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={UUI.brand200} stopOpacity={0.35} />
              <stop offset="100%" stopColor={UUI.brand200} stopOpacity={0.02} />
            </linearGradient>
            <pattern id="bcOffsetStripes" width="8" height="100%" patternUnits="userSpaceOnUse">
              <line x1="4" y1="0" x2="4" y2="100%" stroke={OFFSET_STROKE} strokeWidth="1" strokeOpacity="0.3" />
            </pattern>
          </defs>

          <CartesianGrid
            strokeDasharray="0"
            stroke={UUI.neutral100}
            strokeOpacity={0.8}
            vertical={false}
          />

          <XAxis
            dataKey="year"
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
          <YAxis hide />
          <Tooltip content={<CustomTooltip />} />

          {/* Capacity envelope — solid line + soft gradient */}
          <Area
            type="monotone"
            dataKey="borrowingCeiling"
            name="Borrowing Capacity"
            stroke={CAPACITY_STROKE}
            strokeWidth={2}
            fill="url(#bcCapacityGradient)"
            dot={<PurchaseDot />}
            activeDot={false}
            isAnimationActive={false}
          />

          {/* Total Liabilities — dashed line, no area fill */}
          <Line
            type="monotone"
            dataKey="totalDebt"
            name="Total Liabilities"
            stroke={DEBT_STROKE}
            strokeWidth={1.5}
            strokeDasharray="6 4"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />

          {/* Offset Debt — vertical stripe pattern (real exposure) */}
          <Area
            type="monotone"
            dataKey="offsetDebt"
            name="Offset Debt"
            stroke={OFFSET_STROKE}
            strokeWidth={1.5}
            fill="url(#bcOffsetStripes)"
            dot={false}
            isAnimationActive={false}
          />

          {/* Debt Free milestone */}
          {debtFreePoint && (
            <ReferenceDot
              x={debtFreePoint.year}
              y={debtFreePoint.offsetDebt}
              r={6}
              fill={UUI.brand600}
              stroke="white"
              strokeWidth={2.5}
            >
              <Label content={<DebtFreeMarker />} />
            </ReferenceDot>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
