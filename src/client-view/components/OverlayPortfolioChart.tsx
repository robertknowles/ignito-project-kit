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
import type { ComparisonPortfolioDataPoint } from '../../hooks/useChartDataGenerator';

// Color palette for comparison charts
const COLORS = {
  // Scenario A - Solid colors
  portfolioA: '#7dd3c2',
  portfolioStrokeA: '#4db6a0',
  equityA: '#94a3b8',
  equityStrokeA: '#64748b',
  // Scenario B - Complementary colors with dashed lines
  portfolioB: '#87B5FA',
  portfolioStrokeB: '#5a9cf5',
  equityB: '#f0abfc',
  equityStrokeB: '#d946ef',
  // Shared
  goal: '#f5d0a9',
  goalStroke: '#e9b97a',
  text: '#64748b',
  grid: 'rgba(148, 163, 184, 0.2)',
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
      <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg min-w-[180px]">
        <p className="text-xs font-semibold text-slate-800 mb-2 border-b border-slate-100 pb-1" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
          Year: {label}
        </p>
        
        {/* Scenario A */}
        <div className="mb-2">
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1">Scenario A</p>
          <p className="text-xs" style={{ color: COLORS.portfolioStrokeA }}>
            Portfolio: {formatCurrency(data?.portfolioValueA || 0)}
          </p>
          <p className="text-xs" style={{ color: COLORS.equityStrokeA }}>
            Equity: {formatCurrency(data?.equityA || 0)}
          </p>
        </div>
        
        {/* Scenario B */}
        <div>
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1">Scenario B</p>
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

// Equity Goal Label component
const EquityGoalLabel = (props: any) => {
  const { viewBox, equityGoal } = props;
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
      Equity Goal: {formatCurrency(equityGoal)}
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
      fill={scenario === 'A' ? COLORS.portfolioStrokeA : COLORS.portfolioStrokeB}
      fontSize={9}
      fontWeight={500}
      textAnchor="middle"
      fontFamily="Inter, system-ui, sans-serif"
    >
      {scenario}: {year}
    </text>
  );
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
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      {/* Title inside the box */}
      <div className="flex items-center gap-2 mb-4">
        <Home className="w-4 h-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-800" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
          Portfolio Value & Equity Growth Comparison
        </h3>
      </div>
      
      <ResponsiveContainer width="100%" height={280}>
        <LineChart 
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
          
          {/* Equity Goal Reference Line */}
          {equityGoal > 0 && (
            <ReferenceLine
              y={equityGoal}
              stroke={COLORS.goal}
              strokeDasharray="8 4"
              strokeWidth={2}
            >
              <Label content={<EquityGoalLabel equityGoal={equityGoal} />} />
            </ReferenceLine>
          )}
          
          {/* Goal Achievement Markers */}
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
      <div className="mt-3 border-t border-slate-100 pt-3">
        <div className="grid grid-cols-2 gap-4 text-[11px]">
          {/* Scenario A Legend */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{scenarioAName}</p>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 rounded" style={{ backgroundColor: COLORS.portfolioStrokeA }}></div>
              <span className="text-slate-500">Portfolio: <span className="font-medium text-slate-700">{formatCurrency(finalPortfolioA)}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 rounded" style={{ backgroundColor: COLORS.equityStrokeA }}></div>
              <span className="text-slate-500">Equity: <span className="font-medium text-slate-700">{formatCurrency(finalEquityA)}</span></span>
            </div>
          </div>
          
          {/* Scenario B Legend */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{scenarioBName}</p>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 rounded border-dashed border-t-2" style={{ borderColor: COLORS.portfolioStrokeB }}></div>
              <span className="text-slate-500">Portfolio: <span className="font-medium text-slate-700">{formatCurrency(finalPortfolioB)}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 rounded border-dashed border-t-2" style={{ borderColor: COLORS.equityStrokeB }}></div>
              <span className="text-slate-500">Equity: <span className="font-medium text-slate-700">{formatCurrency(finalEquityB)}</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
