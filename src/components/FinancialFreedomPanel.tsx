import React, { useState } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useChartDataGenerator } from '../hooks/useChartDataGenerator';
import { useInvestmentProfile } from '../hooks/useInvestmentProfile';
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator';
import { useFinancialFreedomProjection } from '../hooks/useFinancialFreedomProjection';
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
    <div className="bg-white p-3 border border-slate-200 shadow-sm rounded-md">
      <p className="text-xs font-medium text-slate-900 mb-2">Year {label}</p>
      <p className="text-xs text-slate-600">Rental Income: {formatK(data?.rentalIncome || 0)}</p>
      <p className="text-xs text-slate-600">Expenses: {formatK(data?.totalExpenses || 0)}</p>
      <p className="text-xs text-slate-600">Loan Payments: {formatK(data?.loanPayments || 0)}</p>
      <p className={`text-xs font-medium ${(data?.netCashflow || 0) >= 0 ? 'text-green-600' : 'text-rose-500'}`}>
        Net Cashflow: {formatK(data?.netCashflow || 0)}
      </p>
      <p className="text-xs text-slate-400 mt-1">Debt: {formatK(data?.totalDebt || 0)}</p>
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
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-6 flex items-center justify-center h-full">
        <p className="text-sm text-slate-400">Add properties to see freedom projection</p>
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
    freedom: 'bg-green-100 text-green-700',
    'debt-free': 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-4">
      {/* Hero — Freedom Year */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-slate-700">Financial Freedom</h3>
          {projection.freedomYear ? (
            <div className="mt-1">
              <span className="text-2xl font-bold text-green-600">{projection.freedomYear}</span>
              <span className="text-xs text-slate-400 ml-2">
                (Year {projection.freedomYearIndex})
              </span>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-1">
              Not reached within 30-year projection
            </p>
          )}
        </div>

        {/* Target slider */}
        <div className="text-right">
          <label className="text-[10px] text-slate-400 block">Target Income</label>
          <span className="text-xs font-medium text-slate-700">{formatK(profile.targetPassiveIncome)}/yr</span>
          {!scenarioData && (
            <input
              type="range"
              min={20000}
              max={200000}
              step={5000}
              value={profile.targetPassiveIncome}
              onChange={handleTargetChange}
              className="w-24 h-1 mt-1 block accent-green-600"
            />
          )}
        </div>
      </div>

      {/* Mini Chart — cashflow bars + debt line */}
      <ResponsiveContainer width="100%" height={150}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
          <XAxis dataKey="year" tick={{ fontSize: 9, fill: '#94a3b8' }} />
          <YAxis
            yAxisId="cashflow"
            tickFormatter={formatK}
            tick={{ fontSize: 9, fill: '#94a3b8' }}
            width={45}
          />
          <YAxis
            yAxisId="debt"
            orientation="right"
            tickFormatter={formatK}
            tick={{ fontSize: 9, fill: '#94a3b8' }}
            width={45}
            hide
          />
          <Tooltip content={<FreedomTooltip />} />

          {/* Target income reference line */}
          <ReferenceLine
            yAxisId="cashflow"
            y={profile.targetPassiveIncome}
            stroke="#22C55E"
            strokeDasharray="4 4"
            strokeWidth={1}
          />

          {/* Cashflow bars */}
          <Bar
            yAxisId="cashflow"
            dataKey="netCashflow"
            fill="rgba(135, 181, 250, 0.5)"
            radius={[2, 2, 0, 0]}
            name="Net Cashflow"
          />

          {/* Debt line */}
          <Line
            yAxisId="debt"
            type="monotone"
            dataKey="totalDebt"
            stroke="#EF4444"
            strokeWidth={1.5}
            dot={false}
            name="Total Debt"
          />

          {/* Rental income line */}
          <Line
            yAxisId="cashflow"
            type="monotone"
            dataKey="rentalIncome"
            stroke="#22C55E"
            strokeWidth={1}
            strokeDasharray="3 3"
            dot={false}
            name="Rental Income"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Milestones */}
      {projection.milestones.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {projection.milestones.map((m, i) => (
            <span
              key={i}
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${milestoneTypeColors[m.type] || 'bg-slate-100 text-slate-600'}`}
            >
              {m.year}: {m.label}
            </span>
          ))}
        </div>
      )}

      {/* Expandable breakdown */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 mt-3 transition-colors"
      >
        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {isExpanded ? 'Hide' : 'Show'} yearly breakdown
      </button>

      {isExpanded && (
        <div className="mt-2 max-h-[200px] overflow-y-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100">
                <th className="text-left py-1 font-medium">Year</th>
                <th className="text-right py-1 font-medium">Income</th>
                <th className="text-right py-1 font-medium">Expenses</th>
                <th className="text-right py-1 font-medium">Loan</th>
                <th className="text-right py-1 font-medium">Net</th>
                <th className="text-right py-1 font-medium">Debt</th>
              </tr>
            </thead>
            <tbody>
              {projection.yearlyData.map((d) => (
                <tr
                  key={d.year}
                  className={`border-b border-slate-50 ${
                    d.year === projection.freedomYear ? 'bg-green-50' : ''
                  } ${d.isPiPhase ? '' : 'text-slate-400'}`}
                >
                  <td className="py-1 text-slate-600">{d.year}</td>
                  <td className="text-right text-slate-600">{formatK(d.rentalIncome)}</td>
                  <td className="text-right text-rose-400">{formatK(d.totalExpenses)}</td>
                  <td className="text-right text-slate-500">{formatK(d.loanPayments)}</td>
                  <td className={`text-right font-medium ${d.netCashflow >= 0 ? 'text-green-600' : 'text-rose-500'}`}>
                    {formatK(d.netCashflow)}
                  </td>
                  <td className="text-right text-slate-400">{formatK(d.totalDebt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
