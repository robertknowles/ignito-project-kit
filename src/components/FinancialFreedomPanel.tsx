import React, { useState } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useChartDataGenerator } from '../hooks/useChartDataGenerator';
import { useInvestmentProfile } from '../hooks/useInvestmentProfile';
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator';
import { useFinancialFreedomProjection } from '../hooks/useFinancialFreedomProjection';
import { CHART_COLORS, CHART_STYLE } from '../constants/chartColors';
import type { TimelineProperty } from '../types/property';
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FinancialFreedomPanelProps {
  scenarioData?: {
    timelineProperties: TimelineProperty[];
    profile: InvestmentProfileData;
  };
}

const formatK = (v: number) => {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(0)}k`;
  return `${sign}$${abs.toFixed(0)}`;
};

const FreedomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  return (
    <div className="bg-white p-3 border border-gray-100 shadow-sm rounded-lg">
      <p className="text-xs font-medium text-gray-900 mb-2">Year {label}</p>
      <p className="text-xs text-gray-500">Rental Income: {formatK(data?.rentalIncome || 0)}</p>
      <p className="text-xs text-gray-500">Expenses: {formatK(data?.totalExpenses || 0)}</p>
      <p className="text-xs text-gray-500">Loan Payments: {formatK(data?.loanPayments || 0)}</p>
      <p className="text-xs font-medium text-gray-700">
        Net Cashflow: {formatK(data?.netCashflow || 0)}
      </p>
      <p className="text-xs text-gray-400 mt-1">Debt: {formatK(data?.totalDebt || 0)}</p>
    </div>
  );
};

export const FinancialFreedomPanel: React.FC<FinancialFreedomPanelProps> = ({ scenarioData }) => {
  const { profile: contextProfile, updateProfile } = useInvestmentProfile();
  const { timelineProperties: contextTimeline } = useAffordabilityCalculator();
  const [isExpanded, setIsExpanded] = useState(false);

  const profile = scenarioData?.profile ?? contextProfile;
  const timelineProperties = scenarioData?.timelineProperties ?? contextTimeline;

  const { portfolioGrowthData, cashflowData } = useChartDataGenerator(scenarioData);

  const projection = useFinancialFreedomProjection({
    portfolioGrowthData,
    cashflowData,
    profile,
    timelineProperties,
  });

  // Empty state
  if (projection.yearlyData.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm px-10 pt-6 pb-10 flex items-center justify-center h-full">
        <p className="body-secondary">Add properties to see freedom projection</p>
      </div>
    );
  }

  const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      updateProfile({ targetPassiveIncome: value });
    }
  };

  // Chart data — show every other year for readability
  const chartData = projection.yearlyData.filter((_, i) => i % 2 === 0 || i === projection.yearlyData.length - 1);

  const milestoneTypeColors: Record<string, string> = {
    transition: 'bg-amber-100 text-amber-700',
    positive: 'bg-blue-100 text-blue-700',
    freedom: 'bg-blue-100 text-blue-700',
    'debt-free': 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm px-10 pt-6 pb-10">
      {/* Hero — Freedom Year */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Financial Freedom</h3>
          {projection.freedomYear ? (
            <div className="mt-1">
              <span className="text-2xl font-bold text-blue-600">{projection.freedomYear}</span>
              <span className="meta ml-2">
                (Year {projection.freedomYearIndex})
              </span>
            </div>
          ) : (
            <p className="meta mt-1">
              Not reached within 30-year projection
            </p>
          )}
        </div>

        {/* Target slider */}
        <div className="text-right">
          <label className="meta block">Target Income</label>
          <span className="metric-label">{formatK(profile.targetPassiveIncome)}/yr</span>
          {!scenarioData && (
            <input
              type="range"
              min={20000}
              max={200000}
              step={5000}
              value={profile.targetPassiveIncome}
              onChange={handleTargetChange}
              className="w-24 h-1 mt-1 block accent-blue-600"
            />
          )}
        </div>
      </div>

      {/* Mini Chart — cashflow bars + debt line */}
      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 5, bottom: 5 }}>
          <CartesianGrid {...CHART_STYLE.grid} />
          <XAxis dataKey="year" {...CHART_STYLE.xAxis} tick={{ ...CHART_STYLE.xAxis.tick, fontSize: 9 }} />
          <YAxis
            yAxisId="cashflow"
            tickFormatter={formatK}
            {...CHART_STYLE.yAxis}
            tick={{ ...CHART_STYLE.yAxis.tick, fontSize: 9 }}
            width={45}
          />
          <YAxis
            yAxisId="debt"
            orientation="right"
            tickFormatter={formatK}
            {...CHART_STYLE.yAxis}
            tick={{ ...CHART_STYLE.yAxis.tick, fontSize: 9 }}
            width={45}
            hide
          />
          <Tooltip content={<FreedomTooltip />} />

          {/* Target income reference line */}
          <ReferenceLine
            yAxisId="cashflow"
            y={profile.targetPassiveIncome}
            stroke={CHART_COLORS.positive}
            strokeDasharray="4 4"
            strokeWidth={1}
          />

          {/* Cashflow bars */}
          <Bar
            yAxisId="cashflow"
            dataKey="netCashflow"
            fill={CHART_COLORS.barPrimary}
            radius={[2, 2, 0, 0]}
            name="Net Cashflow"
          />

          {/* Debt line */}
          <Line
            yAxisId="debt"
            type="monotone"
            dataKey="totalDebt"
            stroke={CHART_COLORS.negative}
            strokeWidth={1.5}
            dot={false}
            name="Total Debt"
          />

          {/* Rental income line */}
          <Line
            yAxisId="cashflow"
            type="monotone"
            dataKey="rentalIncome"
            stroke={CHART_COLORS.positive}
            strokeWidth={1}
            strokeDasharray="3 3"
            dot={false}
            name="Rental Income"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Milestones */}
      {projection.milestones.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4">
          {projection.milestones.map((m, i) => (
            <span
              key={i}
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${milestoneTypeColors[m.type] || 'bg-gray-100 text-gray-600'}`}
            >
              {m.year}: {m.label}
            </span>
          ))}
        </div>
      )}

      {/* Expandable breakdown */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 mt-4 transition-colors"
      >
        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {isExpanded ? 'Hide' : 'Show'} yearly breakdown
      </button>

      {isExpanded && (
        <div className="mt-3 max-h-[220px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-gray-400 border-b border-gray-200">
                <th className="text-left py-2 font-medium">Year</th>
                <th className="text-right py-2 font-medium">Income</th>
                <th className="text-right py-2 font-medium">Expenses</th>
                <th className="text-right py-2 font-medium">Loan</th>
                <th className="text-right py-2 font-medium">Net</th>
                <th className="text-right py-2 font-medium">Debt</th>
              </tr>
            </thead>
            <tbody>
              {projection.yearlyData.map((d) => (
                <tr
                  key={d.year}
                  className={`border-b border-gray-100 ${
                    d.year === projection.freedomYear ? 'bg-blue-50/60' : ''
                  } ${d.isPiPhase ? '' : 'text-gray-400'}`}
                >
                  <td className="py-1.5 text-gray-600">{d.year}</td>
                  <td className="text-right text-gray-600">{formatK(d.rentalIncome)}</td>
                  <td className="text-right text-gray-500">{formatK(d.totalExpenses)}</td>
                  <td className="text-right text-gray-500">{formatK(d.loanPayments)}</td>
                  <td className="text-right font-medium text-gray-700">
                    {formatK(d.netCashflow)}
                  </td>
                  <td className="text-right text-gray-400">{formatK(d.totalDebt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
