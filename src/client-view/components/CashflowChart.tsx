import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
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

// Softer color palette
const COLORS = {
  positive: '#a7dfc4', // Softer green
  negative: '#f5c4c4', // Softer red
  goal: '#f5d0a9', // Softer amber
  goalStroke: '#e9b97a',
  breakEven: '#b8c5d3',
  propertyMarker: '#7eb8e0', // Soft blue
  text: '#64748b',
  grid: 'rgba(148, 163, 184, 0.2)',
};

// Format currency for display (always abbreviated with 1 decimal)
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

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    const cashflow = data?.cashflow || 0;
    return (
      <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg">
        <p className="text-xs font-semibold text-slate-800 mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
          Year: {label}
        </p>
        <p className={`text-xs ${cashflow >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
          Net Cashflow: {cashflow >= 0 ? '+' : ''}{formatCurrency(cashflow)}
        </p>
        {data?.propertyTitle && (
          <p className="text-xs text-sky-600 mt-1 pt-1 border-t border-slate-100">
            🏡 {data.propertyTitle}
          </p>
        )}
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
  const { cx, cy, year } = props;
  if (typeof cx !== 'number' || typeof cy !== 'number' || isNaN(cx) || isNaN(cy)) {
    return null;
  }
  return (
    <text
      x={cx}
      y={cy - 16}
      fill={COLORS.goalStroke}
      fontSize={9}
      fontWeight={500}
      textAnchor="middle"
      fontFamily="Inter, system-ui, sans-serif"
    >
      Goal: {year}
    </text>
  );
};

interface PropertyPurchase {
  year: number;
  title: string;
  cost: number;
}

interface CashflowChartProps {
  data?: Array<{
    year: number | string;
    cashflow: number;
  }>;
  incomeGoal?: number;
  incomeGoalYear?: number | null;
  propertyPurchases?: PropertyPurchase[];
}

export function CashflowChart({ 
  data: propData,
  incomeGoal = 0,
  incomeGoalYear = null,
  propertyPurchases = []
}: CashflowChartProps) {
  // Use provided data or fallback to placeholder data
  const data = propData || [{
    year: 2025,
    cashflow: -32497
  }, {
    year: 2026,
    cashflow: -28000
  }, {
    year: 2027,
    cashflow: -22000
  }, {
    year: 2028,
    cashflow: -15000
  }, {
    year: 2029,
    cashflow: -8000
  }, {
    year: 2030,
    cashflow: 2000
  }, {
    year: 2031,
    cashflow: 12000
  }, {
    year: 2032,
    cashflow: 18000
  }, {
    year: 2033,
    cashflow: 25000
  }, {
    year: 2034,
    cashflow: 32000
  }, {
    year: 2035,
    cashflow: 38000
  }, {
    year: 2036,
    cashflow: 45000
  }, {
    year: 2037,
    cashflow: 52000
  }, {
    year: 2038,
    cashflow: 60000
  }, {
    year: 2039,
    cashflow: 70000
  }, {
    year: 2040,
    cashflow: 80000
  }];

  // Normalize data and add property purchase info
  const normalizedData = useMemo(() => {
    const purchaseYearMap = new Map(propertyPurchases.map(p => [p.year, p]));
    
    return data.map(d => {
      const year = typeof d.year === 'string' ? parseInt(d.year, 10) : d.year;
      const purchase = purchaseYearMap.get(year);
      return {
        year,
        cashflow: d.cashflow,
        hasPurchase: !!purchase,
        propertyTitle: purchase?.title,
      };
    });
  }, [data, propertyPurchases]);

  // Get final cashflow value for display
  const finalCashflow = normalizedData[normalizedData.length - 1]?.cashflow || 0;
  const isPositive = finalCashflow >= 0;

  // Find break-even year (first year with positive cashflow)
  const breakEvenYear = useMemo(() => {
    const firstPositive = normalizedData.find(d => d.cashflow > 0);
    return firstPositive ? firstPositive.year : null;
  }, [normalizedData]);

  // Find the data point where income goal is reached
  const incomeGoalReachedData = useMemo(() => {
    if (!incomeGoalYear) return null;
    return normalizedData.find(d => d.year === incomeGoalYear);
  }, [normalizedData, incomeGoalYear]);

  // Calculate Y-axis domain based on data
  const yAxisDomain = useMemo(() => {
    const values = normalizedData.map(d => d.cashflow);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, incomeGoal || 0);
    const padding = Math.abs(max - min) * 0.1;
    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [normalizedData, incomeGoal]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      {/* Title inside the box */}
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-800" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
          Cashflow Analysis
        </h3>
      </div>
      
      <ResponsiveContainer width="100%" height={240}>
        <BarChart 
          data={normalizedData}
          margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
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
          
          <Tooltip content={<CustomTooltip />} />
          
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
              strokeDasharray="5 5"
              strokeWidth={2}
            >
              <Label content={<IncomeGoalLabel incomeGoal={incomeGoal} />} />
            </ReferenceLine>
          )}
          
          {/* Cashflow Bars with conditional coloring and property markers */}
          <Bar 
            dataKey="cashflow" 
            radius={[3, 3, 0, 0]}
            maxBarSize={35}
          >
            {normalizedData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.cashflow >= 0 ? COLORS.positive : COLORS.negative}
                stroke={entry.hasPurchase ? COLORS.propertyMarker : 'transparent'}
                strokeWidth={entry.hasPurchase ? 2 : 0}
              />
            ))}
          </Bar>
          
          {/* Goal Achievement Marker */}
          {incomeGoalReachedData && (
            <ReferenceDot
              x={incomeGoalReachedData.year}
              y={incomeGoalReachedData.cashflow}
              r={7}
              fill={COLORS.goal}
              stroke="white"
              strokeWidth={2}
            >
              <Label content={<GoalAchievedLabel year={incomeGoalReachedData.year} />} />
            </ReferenceDot>
          )}
        </BarChart>
      </ResponsiveContainer>
      
      {/* Legend and Final Values */}
      <div className="mt-3 flex justify-between items-center">
        <div className="flex gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS.positive }}></div>
            <span className="text-slate-500">Positive</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS.negative }}></div>
            <span className="text-slate-500">Negative</span>
          </div>
        </div>
        <div className="flex gap-4 text-xs">
          {breakEvenYear && (
            <div>
              <span className="text-slate-400">Break-even: </span>
              <span className="font-semibold text-slate-700">{breakEvenYear}</span>
            </div>
          )}
          <div>
            <span className="text-slate-400">Final: </span>
            <span className={`font-semibold ${isPositive ? 'text-emerald-600' : 'text-rose-500'}`}>
              {isPositive ? '+' : ''}{formatCurrency(finalCashflow)}/yr
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
