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
import { CHART_COLORS, CHART_STYLE } from '../../constants/chartColors';
import type { ComparisonCashflowDataPoint } from '../../hooks/useChartDataGenerator';

const COLORS = {
  positiveA: CHART_COLORS.barPositive,
  negativeA: CHART_COLORS.barNegative,
  lineA: CHART_COLORS.scenarioA,
  positiveB: CHART_COLORS.barPrimary,
  negativeB: CHART_COLORS.barNegative,
  lineB: CHART_COLORS.scenarioB,
  goal: CHART_COLORS.goalMarker,
  goalStroke: CHART_COLORS.goal,
  breakEven: CHART_COLORS.referenceLine,
  text: CHART_COLORS.labelText,
  grid: CHART_COLORS.grid,
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
      <div className="bg-white p-3 border border-gray-100 shadow-sm rounded-lg min-w-[160px]">
        <p className="text-xs font-semibold text-gray-900 mb-2 border-b border-gray-100 pb-1">
          Year: {label}
        </p>
        
        {/* Scenario A */}
        <div className="mb-2">
          <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Scenario A</p>
          <p className={`text-xs ${(data?.cashflowA || 0) >= 0 ? 'text-gray-700' : 'text-gray-500'}`}>
            Cashflow: {(data?.cashflowA || 0) >= 0 ? '+' : ''}{formatCurrency(data?.cashflowA || 0)}
          </p>
        </div>
        
        {/* Scenario B */}
        <div>
          <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Scenario B</p>
          <p className={`text-xs ${(data?.cashflowB || 0) >= 0 ? 'text-sky-600' : 'text-gray-500'}`}>
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
    >
      Break-even
    </text>
  );
};

// Goal Achievement Label component (empty - we only show the yellow dot)
const GoalAchievedLabel = () => {
  return null;
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

  // Calculate Y-axis domain with nice round intervals
  const { yAxisDomain, yAxisTicks } = useMemo(() => {
    const valuesA = chartData.map(d => d.cashflowA);
    const valuesB = chartData.map(d => d.cashflowB);
    const allValues = [...valuesA, ...valuesB];
    const dataMin = Math.min(...allValues, 0);
    const dataMax = Math.max(...allValues, incomeGoal || 0);
    
    // Determine a nice interval based on the range
    const range = dataMax - dataMin;
    let interval: number;
    
    if (range <= 50000) {
      interval = 10000; // 10K intervals for small ranges
    } else if (range <= 100000) {
      interval = 20000; // 20K intervals
    } else if (range <= 200000) {
      interval = 50000; // 50K intervals
    } else {
      interval = 100000; // 100K intervals for large ranges
    }
    
    // Round min down and max up to nearest interval
    const niceMin = Math.floor(dataMin / interval) * interval;
    const niceMax = Math.ceil(dataMax / interval) * interval;
    
    // Generate tick values
    const ticks: number[] = [];
    for (let tick = niceMin; tick <= niceMax; tick += interval) {
      ticks.push(tick);
    }
    
    return {
      yAxisDomain: [niceMin, niceMax],
      yAxisTicks: ticks,
    };
  }, [chartData, incomeGoal]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Title inside the box */}
      <div className="flex items-center gap-2 mb-5">
        <TrendingUp className="w-4 h-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-800">
          Cashflow Analysis Comparison
        </h3>
      </div>
      
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart 
          data={chartData}
          margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid {...CHART_STYLE.grid} />

          <XAxis
            dataKey="year"
            {...CHART_STYLE.xAxis}
            tick={{ ...CHART_STYLE.xAxis.tick, fontSize: 10 }}
          />

          <YAxis
            tickFormatter={formatCurrency}
            {...CHART_STYLE.yAxis}
            tick={{ ...CHART_STYLE.yAxis.tick, fontSize: 10 }}
            width={50}
            domain={yAxisDomain}
            ticks={yAxisTicks}
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
          
          {/* Goal Achievement Markers - Gold dots when cashflow goal is reached */}
          {goalDataA && (
            <ReferenceDot
              x={goalDataA.year}
              y={goalDataA.cashflowA}
              r={8}
              fill={COLORS.goal}
              stroke={COLORS.goalStroke}
              strokeWidth={2}
            >
              <Label content={<GoalAchievedLabel scenario="A" year={goalDataA.year} />} />
            </ReferenceDot>
          )}
          
          {goalDataB && (
            <ReferenceDot
              x={goalDataB.year}
              y={goalDataB.cashflowB}
              r={8}
              fill={COLORS.goal}
              stroke={COLORS.goalStroke}
              strokeWidth={2}
            >
              <Label content={<GoalAchievedLabel scenario="B" year={goalDataB.year} />} />
            </ReferenceDot>
          )}
        </ComposedChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="mt-3 border-t border-gray-100 pt-3">
        <div className="grid grid-cols-2 gap-4 text-[11px]">
          {/* Scenario A Legend */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{scenarioAName}</p>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 rounded" style={{ backgroundColor: COLORS.lineA }}></div>
              <span className="text-gray-500">
                Final: <span className={`font-medium ${finalCashflowA >= 0 ? 'text-gray-700' : 'text-gray-500'}`}>
                  {finalCashflowA >= 0 ? '+' : ''}{formatCurrency(finalCashflowA)}/yr
                </span>
              </span>
            </div>
            {breakEvenYearA && (
              <div className="text-gray-400 text-[10px]">
                Break-even: <span className="text-gray-600">{breakEvenYearA}</span>
              </div>
            )}
          </div>
          
          {/* Scenario B Legend */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{scenarioBName}</p>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 rounded border-dashed border-t-2" style={{ borderColor: COLORS.lineB }}></div>
              <span className="text-gray-500">
                Final: <span className={`font-medium ${finalCashflowB >= 0 ? 'text-sky-600' : 'text-gray-500'}`}>
                  {finalCashflowB >= 0 ? '+' : ''}{formatCurrency(finalCashflowB)}/yr
                </span>
              </span>
            </div>
            {breakEvenYearB && (
              <div className="text-gray-400 text-[10px]">
                Break-even: <span className="text-gray-600">{breakEvenYearB}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
