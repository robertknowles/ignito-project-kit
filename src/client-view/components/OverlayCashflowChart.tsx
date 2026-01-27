import React, { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
  Label,
  Cell,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { ComparisonCashflowDataPoint } from '../../hooks/useChartDataGenerator';

// Color palette for comparison charts
const COLORS = {
  // Scenario A 
  positiveA: '#a7dfc4',
  negativeA: '#f5c4c4',
  lineA: '#4db6a0',
  // Scenario B
  positiveB: '#93c5fd',
  negativeB: '#fda4af',
  lineB: '#3b82f6',
  // Shared
  goal: '#f5d0a9',
  goalStroke: '#e9b97a',
  breakEven: '#b8c5d3',
  text: '#64748b',
  grid: 'rgba(148, 163, 184, 0.2)',
};

// Format currency for display
const formatCurrency = (value: number): string => {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1000000) {
    return `${sign}$${(absValue / 1000000).toFixed(1)}M`;
  }
  if (absValue >= 1000) {
    return `${sign}$${(absValue / 1000).toFixed(1)}K`;
  }
  return `${sign}$${absValue.toFixed(0)}`;
};

// Custom tooltip component for comparison
const ComparisonTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    return (
      <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg min-w-[160px]">
        <p className="text-xs font-semibold text-slate-800 mb-2 border-b border-slate-100 pb-1" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
          Year: {label}
        </p>
        
        {/* Scenario A */}
        <div className="mb-2">
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1">Scenario A</p>
          <p className={`text-xs ${(data?.cashflowA || 0) >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
            Cashflow: {(data?.cashflowA || 0) >= 0 ? '+' : ''}{formatCurrency(data?.cashflowA || 0)}
          </p>
        </div>
        
        {/* Scenario B */}
        <div>
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1">Scenario B</p>
          <p className={`text-xs ${(data?.cashflowB || 0) >= 0 ? 'text-sky-600' : 'text-rose-500'}`}>
            Cashflow: {(data?.cashflowB || 0) >= 0 ? '+' : ''}{formatCurrency(data?.cashflowB || 0)}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

// Break-even Label component
const BreakEvenLabel = (props: any) => {
  const { viewBox } = props;
  if (!viewBox) return null;
  return (
    <text
      x={viewBox.x + 10}
      y={viewBox.y - 5}
      fill={COLORS.breakEven}
      fontSize={9}
      fontWeight={500}
      textAnchor="start"
      fontFamily="Inter, system-ui, sans-serif"
    >
      Break-even
    </text>
  );
};

// Income Goal Label component
const IncomeGoalLabel = (props: any) => {
  const { viewBox, incomeGoal } = props;
  if (!viewBox) return null;
  return (
    <text
      x={viewBox.x + viewBox.width - 10}
      y={viewBox.y - 5}
      fill={COLORS.goalStroke}
      fontSize={10}
      fontWeight={600}
      textAnchor="end"
      fontFamily="Inter, system-ui, sans-serif"
    >
      Income Goal: {formatCurrency(incomeGoal)}/yr
    </text>
  );
};

// Goal Achievement Label component
const GoalAchievedLabel = (props: any) => {
  const { cx, cy, scenario, year } = props;
  if (typeof cx !== 'number' || typeof cy !== 'number' || isNaN(cx) || isNaN(cy)) {
    return null;
  }
  return (
    <text
      x={cx}
      y={cy - 16}
      fill={scenario === 'A' ? COLORS.lineA : COLORS.lineB}
      fontSize={9}
      fontWeight={500}
      textAnchor="middle"
      fontFamily="Inter, system-ui, sans-serif"
    >
      {scenario}: {year}
    </text>
  );
};

interface OverlayCashflowChartProps {
  data: ComparisonCashflowDataPoint[];
  incomeGoal?: number;
  incomeGoalYearA?: number | null;
  incomeGoalYearB?: number | null;
  scenarioAName?: string;
  scenarioBName?: string;
}

export function OverlayCashflowChart({ 
  data,
  incomeGoal = 0,
  incomeGoalYearA = null,
  incomeGoalYearB = null,
  scenarioAName = 'Scenario A',
  scenarioBName = 'Scenario B',
}: OverlayCashflowChartProps) {
  // Convert year strings to numbers for chart
  const chartData = useMemo(() => {
    return data.map(d => ({
      ...d,
      year: parseInt(d.year, 10),
    }));
  }, [data]);

  // Get final values for display
  const finalData = chartData[chartData.length - 1];
  const finalCashflowA = finalData?.cashflowA || 0;
  const finalCashflowB = finalData?.cashflowB || 0;

  // Find break-even years
  const breakEvenYearA = useMemo(() => {
    const firstPositive = chartData.find(d => d.cashflowA > 0);
    return firstPositive ? firstPositive.year : null;
  }, [chartData]);

  const breakEvenYearB = useMemo(() => {
    const firstPositive = chartData.find(d => d.cashflowB > 0);
    return firstPositive ? firstPositive.year : null;
  }, [chartData]);

  // Find goal achievement data points
  const goalDataA = useMemo(() => {
    if (!incomeGoalYearA) return null;
    return chartData.find(d => d.year === incomeGoalYearA);
  }, [chartData, incomeGoalYearA]);

  const goalDataB = useMemo(() => {
    if (!incomeGoalYearB) return null;
    return chartData.find(d => d.year === incomeGoalYearB);
  }, [chartData, incomeGoalYearB]);

  // Calculate Y-axis domain based on data
  const yAxisDomain = useMemo(() => {
    const valuesA = chartData.map(d => d.cashflowA);
    const valuesB = chartData.map(d => d.cashflowB);
    const allValues = [...valuesA, ...valuesB];
    const min = Math.min(...allValues, 0);
    const max = Math.max(...allValues, incomeGoal || 0);
    const padding = Math.abs(max - min) * 0.1;
    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [chartData, incomeGoal]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      {/* Title inside the box */}
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-800" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
          Cashflow Analysis Comparison
        </h3>
      </div>
      
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart 
          data={chartData}
          margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid 
            strokeDasharray="0" 
            stroke={COLORS.grid}
            vertical={false}
            horizontal={true}
          />
          
          <XAxis 
            dataKey="year" 
            tick={{ 
              fontSize: 10, 
              fill: COLORS.text,
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
          />
          
          <YAxis 
            tickFormatter={formatCurrency}
            tick={{ 
              fontSize: 10, 
              fill: COLORS.text,
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
            axisLine={false}
            tickLine={false}
            width={50}
            domain={yAxisDomain}
          />
          
          <Tooltip content={<ComparisonTooltip />} />
          
          {/* Break-even Reference Line */}
          <ReferenceLine
            y={0}
            stroke={COLORS.breakEven}
            strokeDasharray="3 3"
            strokeWidth={1}
          >
            <Label content={<BreakEvenLabel />} />
          </ReferenceLine>
          
          {/* Income Goal Reference Line */}
          {incomeGoal > 0 && (
            <ReferenceLine
              y={incomeGoal}
              stroke={COLORS.goal}
              strokeDasharray="8 4"
              strokeWidth={2}
            >
              <Label content={<IncomeGoalLabel incomeGoal={incomeGoal} />} />
            </ReferenceLine>
          )}
          
          {/* Scenario A - Line */}
          <Line
            type="monotone"
            dataKey="cashflowA"
            name={`${scenarioAName} Cashflow`}
            stroke={COLORS.lineA}
            strokeWidth={2.5}
            dot={false}
            activeDot={{
              r: 5,
              stroke: COLORS.lineA,
              strokeWidth: 2,
              fill: 'white',
            }}
          />
          
          {/* Scenario B - Dashed Line */}
          <Line
            type="monotone"
            dataKey="cashflowB"
            name={`${scenarioBName} Cashflow`}
            stroke={COLORS.lineB}
            strokeWidth={2.5}
            strokeDasharray="5 5"
            dot={false}
            activeDot={{
              r: 5,
              stroke: COLORS.lineB,
              strokeWidth: 2,
              fill: 'white',
            }}
          />
          
          {/* Goal Achievement Markers */}
          {goalDataA && (
            <ReferenceDot
              x={goalDataA.year}
              y={goalDataA.cashflowA}
              r={7}
              fill={COLORS.lineA}
              stroke="white"
              strokeWidth={2}
            >
              <Label content={<GoalAchievedLabel scenario="A" year={goalDataA.year} />} />
            </ReferenceDot>
          )}
          
          {goalDataB && (
            <ReferenceDot
              x={goalDataB.year}
              y={goalDataB.cashflowB}
              r={7}
              fill={COLORS.lineB}
              stroke="white"
              strokeWidth={2}
            >
              <Label content={<GoalAchievedLabel scenario="B" year={goalDataB.year} />} />
            </ReferenceDot>
          )}
        </ComposedChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="mt-3 border-t border-slate-100 pt-3">
        <div className="grid grid-cols-2 gap-4 text-[11px]">
          {/* Scenario A Legend */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{scenarioAName}</p>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 rounded" style={{ backgroundColor: COLORS.lineA }}></div>
              <span className="text-slate-500">
                Final: <span className={`font-medium ${finalCashflowA >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {finalCashflowA >= 0 ? '+' : ''}{formatCurrency(finalCashflowA)}/yr
                </span>
              </span>
            </div>
            {breakEvenYearA && (
              <div className="text-slate-400 text-[10px]">
                Break-even: <span className="text-slate-600">{breakEvenYearA}</span>
              </div>
            )}
          </div>
          
          {/* Scenario B Legend */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{scenarioBName}</p>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 rounded border-dashed border-t-2" style={{ borderColor: COLORS.lineB }}></div>
              <span className="text-slate-500">
                Final: <span className={`font-medium ${finalCashflowB >= 0 ? 'text-sky-600' : 'text-rose-500'}`}>
                  {finalCashflowB >= 0 ? '+' : ''}{formatCurrency(finalCashflowB)}/yr
                </span>
              </span>
            </div>
            {breakEvenYearB && (
              <div className="text-slate-400 text-[10px]">
                Break-even: <span className="text-slate-600">{breakEvenYearB}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
