import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
  Label,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Home } from 'lucide-react';
import { CHART_COLORS, CHART_STYLE } from '../../constants/chartColors';
import type { ComparisonPortfolioDataPoint } from '../../hooks/useChartDataGenerator';

const COLORS = {
  portfolioStrokeA: CHART_COLORS.scenarioA,
  equityStrokeA: CHART_COLORS.scenarioALight,
  portfolioStrokeB: CHART_COLORS.scenarioB,
  equityStrokeB: CHART_COLORS.scenarioBLight,
  goal: CHART_COLORS.goal,
  goalStroke: CHART_COLORS.goal,
  text: CHART_COLORS.labelText,
  grid: CHART_COLORS.grid,
  // Keep these for legend dots
  portfolioA: CHART_COLORS.scenarioA,
  equityA: CHART_COLORS.scenarioALight,
  portfolioB: CHART_COLORS.scenarioB,
  equityB: CHART_COLORS.scenarioBLight,
};

// Format currency for display
const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
};

// Custom tooltip component for comparison
const ComparisonTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    return (
      <div className="bg-white p-3 border border-gray-100 shadow-sm rounded-lg min-w-[180px]">
        <p className="text-xs font-semibold text-gray-900 mb-2 border-b border-gray-100 pb-1">
          Year: {label}
        </p>
        
        {/* Scenario A */}
        <div className="mb-2">
          <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Scenario A</p>
          <p className="text-xs" style={{ color: COLORS.portfolioStrokeA }}>
            Portfolio: {formatCurrency(data?.portfolioValueA || 0)}
          </p>
          <p className="text-xs" style={{ color: COLORS.equityStrokeA }}>
            Equity: {formatCurrency(data?.equityA || 0)}
          </p>
        </div>
        
        {/* Scenario B */}
        <div>
          <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Scenario B</p>
          <p className="text-xs" style={{ color: COLORS.portfolioStrokeB }}>
            Portfolio: {formatCurrency(data?.portfolioValueB || 0)}
          </p>
          <p className="text-xs" style={{ color: COLORS.equityStrokeB }}>
            Equity: {formatCurrency(data?.equityB || 0)}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

// Goal Achievement Label component (empty - we only show the yellow dot)
const GoalAchievedLabel = () => {
  return null;
};

interface OverlayPortfolioChartProps {
  data: ComparisonPortfolioDataPoint[];
  equityGoal?: number;
  equityGoalYearA?: number | null;
  equityGoalYearB?: number | null;
  scenarioAName?: string;
  scenarioBName?: string;
}

export function OverlayPortfolioChart({ 
  data,
  equityGoal = 0,
  equityGoalYearA = null,
  equityGoalYearB = null,
  scenarioAName = 'Scenario A',
  scenarioBName = 'Scenario B',
}: OverlayPortfolioChartProps) {
  // Convert year strings to numbers for chart
  const chartData = useMemo(() => {
    return data.map(d => ({
      ...d,
      year: parseInt(d.year, 10),
    }));
  }, [data]);

  // Get final values for display
  const finalData = chartData[chartData.length - 1];
  const finalPortfolioA = finalData?.portfolioValueA || 0;
  const finalPortfolioB = finalData?.portfolioValueB || 0;
  const finalEquityA = finalData?.equityA || 0;
  const finalEquityB = finalData?.equityB || 0;

  // Find goal achievement data points
  const goalDataA = useMemo(() => {
    if (!equityGoalYearA) return null;
    return chartData.find(d => d.year === equityGoalYearA);
  }, [chartData, equityGoalYearA]);

  const goalDataB = useMemo(() => {
    if (!equityGoalYearB) return null;
    return chartData.find(d => d.year === equityGoalYearB);
  }, [chartData, equityGoalYearB]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      {/* Title inside the box */}
      <div className="flex items-center gap-2 mb-5">
        <Home className="w-4 h-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-800">
          Portfolio Value & Equity Growth Comparison
        </h3>
      </div>
      
      <ResponsiveContainer width="100%" height={280}>
        <LineChart 
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
          />
          
          <Tooltip content={<ComparisonTooltip />} />
          
          {/* Scenario A - Portfolio Value (Solid) */}
          <Line
            type="monotone"
            dataKey="portfolioValueA"
            name={`${scenarioAName} Portfolio`}
            stroke={COLORS.portfolioStrokeA}
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 5,
              stroke: COLORS.portfolioStrokeA,
              strokeWidth: 2,
              fill: 'white',
            }}
          />
          
          {/* Scenario A - Equity (Solid) */}
          <Line
            type="monotone"
            dataKey="equityA"
            name={`${scenarioAName} Equity`}
            stroke={COLORS.equityStrokeA}
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 4,
              stroke: COLORS.equityStrokeA,
              strokeWidth: 2,
              fill: 'white',
            }}
          />
          
          {/* Scenario B - Portfolio Value (Dashed) */}
          <Line
            type="monotone"
            dataKey="portfolioValueB"
            name={`${scenarioBName} Portfolio`}
            stroke={COLORS.portfolioStrokeB}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            activeDot={{
              r: 5,
              stroke: COLORS.portfolioStrokeB,
              strokeWidth: 2,
              fill: 'white',
            }}
          />
          
          {/* Scenario B - Equity (Dashed) */}
          <Line
            type="monotone"
            dataKey="equityB"
            name={`${scenarioBName} Equity`}
            stroke={COLORS.equityStrokeB}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            activeDot={{
              r: 4,
              stroke: COLORS.equityStrokeB,
              strokeWidth: 2,
              fill: 'white',
            }}
          />
          
          {/* Goal Achievement Markers - yellow dots only */}
          {goalDataA && (
            <ReferenceDot
              x={goalDataA.year}
              y={goalDataA.equityA}
              r={7}
              fill={COLORS.portfolioA}
              stroke="white"
              strokeWidth={2}
            >
              <Label content={<GoalAchievedLabel scenario="A" year={goalDataA.year} />} />
            </ReferenceDot>
          )}
          
          {goalDataB && (
            <ReferenceDot
              x={goalDataB.year}
              y={goalDataB.equityB}
              r={7}
              fill={COLORS.portfolioB}
              stroke="white"
              strokeWidth={2}
            >
              <Label content={<GoalAchievedLabel scenario="B" year={goalDataB.year} />} />
            </ReferenceDot>
          )}
        </LineChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="mt-3 border-t border-gray-100 pt-3">
        <div className="grid grid-cols-2 gap-4 text-[11px]">
          {/* Scenario A Legend */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{scenarioAName}</p>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 rounded" style={{ backgroundColor: COLORS.portfolioStrokeA }}></div>
              <span className="text-gray-500">Portfolio: <span className="font-medium text-gray-700">{formatCurrency(finalPortfolioA)}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 rounded" style={{ backgroundColor: COLORS.equityStrokeA }}></div>
              <span className="text-gray-500">Equity: <span className="font-medium text-gray-700">{formatCurrency(finalEquityA)}</span></span>
            </div>
          </div>
          
          {/* Scenario B Legend */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{scenarioBName}</p>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 rounded border-dashed border-t-2" style={{ borderColor: COLORS.portfolioStrokeB }}></div>
              <span className="text-gray-500">Portfolio: <span className="font-medium text-gray-700">{formatCurrency(finalPortfolioB)}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 rounded border-dashed border-t-2" style={{ borderColor: COLORS.equityStrokeB }}></div>
              <span className="text-gray-500">Equity: <span className="font-medium text-gray-700">{formatCurrency(finalEquityB)}</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
