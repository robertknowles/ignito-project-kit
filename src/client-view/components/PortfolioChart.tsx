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
import { CHART_COLORS, CHART_STYLE, CHART_GRADIENTS } from '../../constants/chartColors';

const COLORS = {
  portfolio: CHART_COLORS.primary,
  portfolioStroke: CHART_COLORS.primary,
  equity: CHART_COLORS.tertiary,
  equityStroke: CHART_COLORS.secondary,
  goal: CHART_COLORS.goal,
  goalStroke: CHART_COLORS.goal,
  propertyMarker: CHART_COLORS.primary,
  text: CHART_COLORS.labelText,
  grid: CHART_COLORS.grid,
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
      <div className="bg-white p-3 border border-gray-100 shadow-sm rounded-lg">
        <p className="text-xs font-semibold text-gray-900 mb-2">
          Year: {label}
        </p>
        <p className="text-xs" style={{ color: COLORS.portfolioStroke }}>
          Portfolio: {formatCurrency(data?.portfolio || 0)}
        </p>
        <p className="text-xs" style={{ color: COLORS.equityStroke }}>
          Equity: {formatCurrency(data?.equity || 0)}
        </p>
        {data?.propertyTitle && (
          <p className="text-xs text-sky-600 mt-1 pt-1 border-t border-gray-100">
            🏡 {data.propertyTitle}
          </p>
        )}
      </div>
    );
  }
  return null;
};

// Goal Achievement Label component (empty - we only show the yellow dot)
const GoalAchievedLabel = () => {
  return null;
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
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      {/* Title inside the box */}
      <div className="flex items-center gap-2 mb-5">
        <Home className="w-4 h-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-800">
          Portfolio Value & Equity Growth
        </h3>
      </div>
      
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart 
          data={normalizedData}
          margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
        >
          {/* Gradient Definitions */}
          <defs>
            <linearGradient id="portfolioGradientSoft" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_GRADIENTS.primary.startColor} stopOpacity={CHART_GRADIENTS.primary.startOpacity} />
              <stop offset="95%" stopColor={CHART_GRADIENTS.primary.endColor} stopOpacity={CHART_GRADIENTS.primary.endOpacity} />
            </linearGradient>
            <linearGradient id="equityGradientSoft" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_GRADIENTS.secondary.startColor} stopOpacity={CHART_GRADIENTS.secondary.startOpacity} />
              <stop offset="95%" stopColor={CHART_GRADIENTS.secondary.endColor} stopOpacity={CHART_GRADIENTS.secondary.endOpacity} />
            </linearGradient>
          </defs>
          
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
          
          {/* Goal Achievement Marker - yellow dot only */}
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
            <span className="text-gray-500">Portfolio Value</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.equity }}></div>
            <span className="text-gray-500">Equity</span>
          </div>
        </div>
        <div className="flex gap-4 text-xs">
          <div>
            <span className="text-gray-400">Portfolio: </span>
            <span className="font-semibold text-gray-700">
              {formatCurrency(finalPortfolio)}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Equity: </span>
            <span className="font-semibold text-gray-700">
              {formatCurrency(finalEquity)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
