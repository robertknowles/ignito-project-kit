import React, { useMemo } from 'react';
import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useChartDataGenerator } from '../hooks/useChartDataGenerator';
import { useInvestmentProfile } from '../hooks/useInvestmentProfile';
import { CHART_STYLE } from '../constants/chartColors';
import {
  BASE_YEAR,
  ANNUAL_WAGE_GROWTH_RATE,
  RENTAL_RECOGNITION_RATE,
} from '../constants/financialParams';
import type { TimelineProperty } from '../types/property';
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext';

interface BorrowingCapacityChartProps {
  scenarioData?: {
    timelineProperties: TimelineProperty[];
    profile: InvestmentProfileData;
  };
}

const CAPACITY_STROKE = '#2563EB';
const DEBT_STROKE = '#8B5CF6';
const OFFSET_STROKE = '#06B6D4';

export const BorrowingCapacityChart: React.FC<BorrowingCapacityChartProps> = ({ scenarioData }) => {
  const { portfolioGrowthData, cashflowData } = useChartDataGenerator(scenarioData);
  const { profile: contextProfile } = useInvestmentProfile();
  const profile = scenarioData?.profile ?? contextProfile;

  const data = useMemo(() => {
    const endYear = BASE_YEAR + profile.timelineYears - 1;
    const wageGrowth = profile.wageGrowthRate ?? ANNUAL_WAGE_GROWTH_RATE;
    const multiplier = profile.salaryServiceabilityMultiplier ?? 6.0;
    const baseSalary = profile.baseSalary ?? 60000;

    return portfolioGrowthData
      .filter(d => Number(d.year) <= endYear)
      .map(d => {
        const year = Number(d.year);
        const yearsElapsed = year - BASE_YEAR;

        const employmentIncome = baseSalary * Math.pow(1 + wageGrowth, yearsElapsed);

        const cfPoint = cashflowData.find(c => c.year === d.year);
        const grossRentalIncome = cfPoint?.rentalIncome ?? 0;
        const capturedRental = grossRentalIncome * RENTAL_RECOGNITION_RATE;

        const borrowingCeiling = Math.round(
          (employmentIncome + capturedRental) * multiplier
        );

        const totalDebt = d.totalDebt ?? 0;

        // Offset debt: cash savings that could sit in an offset account
        // Uses availableFunds minus usable equity (we only want pure cash, not equity)
        // availableFunds = depositPool + cumulativeSavings + usableEquity - depositsUsed
        // We approximate offset as: availableFunds data point, capped at totalDebt
        // (can't offset more than you owe)
        const offsetDebt = Math.round(Math.min(d.availableFunds ?? 0, totalDebt));

        return {
          year: d.year,
          borrowingCeiling,
          totalDebt,
          offsetDebt,
        };
      });
  }, [portfolioGrowthData, cashflowData, profile]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const ceiling = payload.find((p: any) => p.dataKey === 'borrowingCeiling')?.value ?? 0;
    const debt = payload.find((p: any) => p.dataKey === 'totalDebt')?.value ?? 0;
    const offset = payload.find((p: any) => p.dataKey === 'offsetDebt')?.value ?? 0;
    const netDebt = debt - offset;
    const headroom = ceiling - debt;

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
        <div className="flex justify-between gap-6 mb-1">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: CAPACITY_STROKE }} />
            <span className="text-gray-500">Capacity</span>
          </span>
          <span className="font-medium text-gray-700">${ceiling.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-6 mb-1">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: DEBT_STROKE }} />
            <span className="text-gray-500">Total Liabilities</span>
          </span>
          <span className="font-medium text-gray-700">${debt.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-6 mb-1">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: OFFSET_STROKE }} />
            <span className="text-gray-500">Offset Debt</span>
          </span>
          <span className="font-medium text-gray-700">${offset.toLocaleString()}</span>
        </div>
        <div
          className="flex justify-between gap-6 pt-2 mt-1"
          style={{ borderTop: '1px solid #F3F4F6' }}
        >
          <span className="font-semibold text-gray-900">Headroom</span>
          <span className={`font-semibold ${headroom > 0 ? 'text-gray-900' : 'text-red-500'}`}>
            ${Math.abs(headroom).toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between gap-6 mt-0.5">
          <span className="text-gray-400 text-xs">Net Debt</span>
          <span className="text-gray-400 text-xs">${netDebt.toLocaleString()}</span>
        </div>
      </div>
    );
  };

  const formatYAxis = (value: number) => {
    if (value === 0) return '$0';
    if (Math.abs(value) >= 1_000_000) {
      const m = value / 1_000_000;
      return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 0, left: -10, bottom: 0 }}
        >
          <defs>
            <linearGradient id="bcCapacityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity={0.10} />
              <stop offset="100%" stopColor="#2563EB" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="bcDebtFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.03} />
            </linearGradient>
            <linearGradient id="bcOffsetFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.14} />
              <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.03} />
            </linearGradient>
          </defs>

          <CartesianGrid {...CHART_STYLE.grid} />
          <XAxis dataKey="year" {...CHART_STYLE.xAxis} padding={{ left: 20, right: 10 }} />
          <YAxis tickFormatter={formatYAxis} {...CHART_STYLE.yAxis} />
          <Tooltip content={<CustomTooltip />} />

          {/* Capacity filled area — the ceiling */}
          <Area
            type="monotone"
            dataKey="borrowingCeiling"
            name="Borrowing Capacity"
            stroke={CAPACITY_STROKE}
            strokeWidth={2.5}
            fill="url(#bcCapacityFill)"
            dot={false}
            isAnimationActive={false}
          />

          {/* Total liabilities filled area */}
          <Area
            type="monotone"
            dataKey="totalDebt"
            name="Total Liabilities"
            stroke={DEBT_STROKE}
            strokeWidth={2}
            fill="url(#bcDebtFill)"
            dot={false}
            isAnimationActive={false}
          />

          {/* Offset debt — savings reducing net debt */}
          <Area
            type="monotone"
            dataKey="offsetDebt"
            name="Offset Debt"
            stroke={OFFSET_STROKE}
            strokeWidth={2}
            fill="url(#bcOffsetFill)"
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
