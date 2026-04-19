import React, { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useChartDataGenerator } from '../hooks/useChartDataGenerator'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator'
import { CHART_STYLE } from '../constants/chartColors'
import { BASE_YEAR } from '../constants/financialParams'
import type { TimelineProperty } from '../types/property';
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext';

interface CashflowChartProps {
  scenarioData?: {
    timelineProperties: TimelineProperty[];
    profile: InvestmentProfileData;
  };
}

/**
 * Cashflow Projection — Dual-line area chart
 *
 * Rental income (solid blue line with gradient fill) vs Expenses (dashed grey line).
 * Replaces the previous bar chart for visual uniformity across the dashboard.
 */
export const CashflowChart: React.FC<CashflowChartProps> = ({ scenarioData }) => {
  const { cashflowData } = useChartDataGenerator(scenarioData)
  const { profile: contextProfile } = useInvestmentProfile()
  const profile = scenarioData?.profile ?? contextProfile

  // Transform data for dual-line format: monthly income vs monthly expenses
  // Cap at timeline end year to match all other dashboard charts
  const data = useMemo(() => {
    const rawData = cashflowData.length > 0 ? cashflowData : [{
      year: '2025',
      cashflow: 0,
      rentalIncome: 0,
      expenses: 0,
      loanRepayments: 0,
    }];

    const endYear = BASE_YEAR + profile.timelineYears - 1;
    const capped = rawData.filter(d => Number(d.year) <= endYear);

    return capped.map(d => ({
      year: d.year,
      income: Math.round(d.rentalIncome / 12),   // monthly
      expenses: Math.round(d.expenses / 12),       // monthly
    }));
  }, [cashflowData, profile.timelineYears]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const income = payload.find((p: any) => p.dataKey === 'income')?.value ?? 0;
    const expenses = payload.find((p: any) => p.dataKey === 'expenses')?.value ?? 0;
    const net = income - expenses;

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
          <span className="text-gray-500">Income</span>
          <span className="font-medium text-gray-700">${income.toLocaleString()}/mo</span>
        </div>
        <div className="flex justify-between gap-6 mb-1">
          <span className="text-gray-500">Expenses</span>
          <span className="font-medium text-gray-700">${expenses.toLocaleString()}/mo</span>
        </div>
        <div
          className="flex justify-between gap-6 pt-2 mt-1"
          style={{ borderTop: '1px solid #F3F4F6' }}
        >
          <span className="font-semibold text-gray-900">Net</span>
          <span className={`font-semibold ${net >= 0 ? 'text-gray-900' : 'text-gray-500'}`}>
            {net >= 0 ? '+' : '-'}${Math.abs(net).toLocaleString()}/mo
          </span>
        </div>
      </div>
    );
  };

  const formatYAxis = (value: number) => {
    if (value === 0) return '$0';
    return `$${(value / 1000).toFixed(0)}K`;
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 0, left: -10, bottom: 0 }}
        >
          <defs>
            <linearGradient id="cashflowIncomeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#2563EB" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="cashflowExpensesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9CA3AF" stopOpacity={0.08} />
              <stop offset="100%" stopColor="#9CA3AF" stopOpacity={0.01} />
            </linearGradient>
          </defs>

          <CartesianGrid {...CHART_STYLE.grid} />
          <XAxis dataKey="year" {...CHART_STYLE.xAxis} padding={{ left: 20, right: 10 }} />
          <YAxis
            tickFormatter={formatYAxis}
            {...CHART_STYLE.yAxis}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Income line — solid blue with gradient fill */}
          <Area
            type="monotone"
            dataKey="income"
            name="Rental income"
            stroke="#2563EB"
            strokeWidth={2}
            fill="url(#cashflowIncomeFill)"
            dot={false}
            isAnimationActive={false}
          />

          {/* Expenses line — dashed grey with subtle fill */}
          <Area
            type="monotone"
            dataKey="expenses"
            name="Expenses"
            stroke="#9CA3AF"
            strokeWidth={2}
            strokeDasharray="6 3"
            fill="url(#cashflowExpensesFill)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>

    </div>
  )
}
