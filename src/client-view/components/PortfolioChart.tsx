import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
  Label,
  ResponsiveContainer,
} from 'recharts';
import { Home } from 'lucide-react';

// Softer color palette
const COLORS = {
  portfolio: '#7dd3c2', // Softer teal
  portfolioStroke: '#4db6a0',
  equity: '#b8c5d3', // Softer slate
  equityStroke: '#94a3b8',
  goal: '#f5d0a9', // Softer amber
  goalStroke: '#e9b97a',
  propertyMarker: '#7eb8e0', // Soft blue
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

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    return (
      <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg">
        <p className="text-xs font-semibold text-slate-800 mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
          Year: {label}
        </p>
        <p className="text-xs" style={{ color: COLORS.portfolioStroke }}>
          Portfolio: {formatCurrency(data?.portfolio || 0)}
        </p>
        <p className="text-xs" style={{ color: COLORS.equityStroke }}>
          Equity: {formatCurrency(data?.equity || 0)}
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

interface PortfolioChartProps {
  data?: Array<{
    year: number | string;
    portfolio?: number;
    portfolioValue?: number;
    equity: number;
  }>;
  equityGoal?: number;
  equityGoalYear?: number | null;
  propertyPurchases?: PropertyPurchase[];
}

export function PortfolioChart({ 
  data: propData, 
  equityGoal = 0,
  equityGoalYear = null,
  propertyPurchases = []
}: PortfolioChartProps) {
  // Use provided data or fallback to placeholder data
  const data = propData || [{
    year: 2025,
    portfolio: 1050000,
    equity: 158000
  }, {
    year: 2026,
    portfolio: 1100000,
    equity: 200000
  }, {
    year: 2027,
    portfolio: 1200000,
    equity: 280000
  }, {
    year: 2028,
    portfolio: 1350000,
    equity: 380000
  }, {
    year: 2029,
    portfolio: 1500000,
    equity: 500000
  }, {
    year: 2030,
    portfolio: 1700000,
    equity: 650000
  }, {
    year: 2031,
    portfolio: 2000000,
    equity: 800000
  }, {
    year: 2032,
    portfolio: 2300000,
    equity: 950000
  }, {
    year: 2033,
    portfolio: 2650000,
    equity: 1100000
  }, {
    year: 2034,
    portfolio: 3050000,
    equity: 1280000
  }, {
    year: 2035,
    portfolio: 3500000,
    equity: 1500000
  }, {
    year: 2036,
    portfolio: 4000000,
    equity: 1750000
  }, {
    year: 2037,
    portfolio: 4550000,
    equity: 2050000
  }, {
    year: 2038,
    portfolio: 5150000,
    equity: 2400000
  }, {
    year: 2039,
    portfolio: 5800000,
    equity: 2800000
  }, {
    year: 2040,
    portfolio: 6500000,
    equity: 3250000
  }];

  // Normalize data and add property purchase info
  const normalizedData = useMemo(() => {
    const purchaseYearMap = new Map(propertyPurchases.map(p => [p.year, p]));
    
    return data.map(d => {
      const year = typeof d.year === 'string' ? parseInt(d.year, 10) : d.year;
      const purchase = purchaseYearMap.get(year);
      return {
        year,
        portfolio: d.portfolio || d.portfolioValue || 0,
        equity: d.equity || 0,
        hasPurchase: !!purchase,
        propertyTitle: purchase?.title,
        propertyCost: purchase?.cost,
      };
    });
  }, [data, propertyPurchases]);

  // Get final values for display
  const finalData = normalizedData[normalizedData.length - 1];
  const finalPortfolio = finalData?.portfolio || 0;
  const finalEquity = finalData?.equity || 0;

  // Find the data point where equity goal is reached
  const equityGoalReachedData = useMemo(() => {
    if (!equityGoalYear) return null;
    return normalizedData.find(d => d.year === equityGoalYear);
  }, [normalizedData, equityGoalYear]);

  // Find property purchase data points for markers
  const purchaseDataPoints = useMemo(() => {
    return normalizedData.filter(d => d.hasPurchase);
  }, [normalizedData]);

  // Custom dot renderer for property purchases
  const renderDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload?.hasPurchase || !cx || !cy) return null;
    
    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={10}
          fill="white"
          stroke={COLORS.propertyMarker}
          strokeWidth={2}
        />
        <text
          x={cx}
          y={cy + 3}
          textAnchor="middle"
          fontSize={10}
        >
          🏡
        </text>
      </g>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      {/* Title inside the box */}
      <div className="flex items-center gap-2 mb-4">
        <Home className="w-4 h-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-800" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
          Portfolio Value & Equity Growth
        </h3>
      </div>
      
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart 
          data={normalizedData}
          margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
        >
          {/* Gradient Definitions - softer colors */}
          <defs>
            <linearGradient id="portfolioGradientSoft" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.portfolio} stopOpacity={0.6} />
              <stop offset="95%" stopColor={COLORS.portfolio} stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="equityGradientSoft" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.equity} stopOpacity={0.6} />
              <stop offset="95%" stopColor={COLORS.equity} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          
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
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* Portfolio Value Area */}
          <Area
            type="monotone"
            dataKey="portfolio"
            name="Portfolio Value"
            stroke={COLORS.portfolioStroke}
            strokeWidth={2}
            fill="url(#portfolioGradientSoft)"
            dot={renderDot}
            activeDot={{
              r: 5,
              stroke: COLORS.portfolioStroke,
              strokeWidth: 2,
              fill: 'white',
            }}
          />
          
          {/* Total Equity Area */}
          <Area
            type="monotone"
            dataKey="equity"
            name="Equity"
            stroke={COLORS.equityStroke}
            strokeWidth={2}
            fill="url(#equityGradientSoft)"
            dot={false}
          />
          
          {/* Equity Goal Reference Line */}
          {equityGoal > 0 && (
            <ReferenceLine
              y={equityGoal}
              stroke={COLORS.goal}
              strokeDasharray="5 5"
              strokeWidth={2}
            >
              <Label content={<EquityGoalLabel equityGoal={equityGoal} />} />
            </ReferenceLine>
          )}
          
          {/* Goal Achievement Marker */}
          {equityGoalReachedData && (
            <ReferenceDot
              x={equityGoalReachedData.year}
              y={equityGoalReachedData.equity}
              r={7}
              fill={COLORS.goal}
              stroke="white"
              strokeWidth={2}
            >
              <Label content={<GoalAchievedLabel year={equityGoalReachedData.year} />} />
            </ReferenceDot>
          )}
        </AreaChart>
      </ResponsiveContainer>
      
      {/* Legend and Final Values */}
      <div className="mt-3 flex justify-between items-center">
        <div className="flex gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.portfolio }}></div>
            <span className="text-slate-500">Portfolio Value</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.equity }}></div>
            <span className="text-slate-500">Equity</span>
          </div>
        </div>
        <div className="flex gap-4 text-xs">
          <div>
            <span className="text-slate-400">Portfolio: </span>
            <span className="font-semibold text-slate-700">
              {formatCurrency(finalPortfolio)}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Equity: </span>
            <span className="font-semibold text-slate-700">
              {formatCurrency(finalEquity)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
