import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
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
} from 'recharts';
import { Sparkles } from 'lucide-react';
import { useRoadmapData, YearData } from '../hooks/useRoadmapData';
import { useInvestmentProfile } from '../hooks/useInvestmentProfile';
import { getPropertyTypeIcon } from '../utils/propertyTypeIcon';
import { MiniPurchaseCard } from './MiniPurchaseCard';

// Column dimension constants
const LABEL_COLUMN_WIDTH = 50; // Reduced from 70px
const MIN_YEAR_COLUMN_WIDTH = 50; // Minimum readable width
const MAX_YEAR_COLUMN_WIDTH = 120; // Maximum comfortable width
const Y_AXIS_WIDTH = 50; // Width for the chart Y-axis

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

// Format compact currency for table cells
const formatCompactCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`;
  }
  return `$${value.toFixed(0)}`;
};

// Determine if property is a house type (for color coding)
const isHouseType = (propertyTitle: string): boolean => {
  const normalized = propertyTitle.toLowerCase();
  return normalized.includes('house') || 
         normalized.includes('villa') || 
         normalized.includes('townhouse') ||
         normalized.includes('duplex');
};

// Inline StatusPill component
const StatusPill: React.FC<{ status: 'pass' | 'fail' | 'na' }> = ({ status }) => {
  if (status === 'pass') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-medium bg-green-100 text-green-700">
        ✓
      </span>
    );
  }
  if (status === 'fail') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-medium bg-red-100 text-red-700">
        ✗
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-medium bg-slate-100 text-slate-400">
      –
    </span>
  );
};

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    return (
      <div className="bg-white p-3 border border-slate-200 shadow-sm rounded-md">
        <p className="text-xs font-medium text-slate-900 mb-2">Year: {label}</p>
        <p className="text-xs text-teal-600">
          Portfolio: {formatCurrency(data?.portfolioValue || 0)}
        </p>
        <p className="text-xs text-slate-500">
          Equity: {formatCurrency(data?.totalEquity || 0)}
        </p>
        {data?.purchaseInYear && data?.purchaseDetails && (
          <div className="mt-2 pt-2 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-700">
              🏠 {data.purchaseDetails.propertyTitle}
            </p>
          </div>
        )}
      </div>
    );
  }
  return null;
};

// Custom dot component for property markers
const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  
  // Protect against invalid coordinates
  if (!cx || !cy || isNaN(cx) || isNaN(cy)) return null;
  
  // Only show marker if there's a purchase this year
  if (!payload.purchaseInYear || !payload.purchaseDetails) {
    return null;
  }
  
  const propertyTitle = payload.purchaseDetails.propertyTitle;
  const isHouse = isHouseType(propertyTitle);
  const borderColor = isHouse ? '#22c55e' : '#3b82f6'; // Green for houses, blue for units
  
  return (
    <foreignObject x={cx - 12} y={cy - 12} width={24} height={24}>
      <div 
        className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm"
        style={{ border: `2px solid ${borderColor}` }}
      >
        {getPropertyTypeIcon(propertyTitle, 14, isHouse ? 'text-green-600' : 'text-blue-600')}
      </div>
    </foreignObject>
  );
};

// Equity Goal Label component
const EquityGoalLabel = (props: any) => {
  const { viewBox, equityGoal } = props;
  if (!viewBox) return null;
  return (
    <text
      x={viewBox.x + viewBox.width - 10}
      y={viewBox.y - 5}
      fill="#d97706"
      fontSize={11}
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
      y={cy - 18}
      fill="rgba(253, 186, 116, 1)"
      fontSize={10}
      fontWeight={500}
      textAnchor="middle"
      fontFamily="Inter, system-ui, sans-serif"
    >
      Goal: {year}
    </text>
  );
};

// Progress Label component - marks most recent purchase
const ProgressLabel = (props: any) => {
  const { viewBox } = props;
  if (!viewBox) return null;
  return (
    <g>
      <text
        x={viewBox.x}
        y={12}
        fill="#7c3aed"
        fontSize={9}
        fontWeight={600}
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
      >
        Progress
      </text>
      {/* Small triangle pointer */}
      <polygon
        points={`${viewBox.x - 4},18 ${viewBox.x + 4},18 ${viewBox.x},24`}
        fill="#7c3aed"
      />
    </g>
  );
};

// Generate roadmap-specific AI summary
const generateRoadmapSummary = (
  years: YearData[], 
  equityGoal: number,
  equityGoalYear: number | null
): string => {
  const purchaseYears = years.filter(y => y.purchaseInYear);
  const totalProperties = purchaseYears.length;
  const finalYear = years[years.length - 1];
  
  if (totalProperties === 0) {
    return "Add properties to your strategy to see a wealth projection analysis.";
  }
  
  // Find key bottlenecks
  const depositFailures = years.filter(y => y.depositStatus === 'fail').length;
  const borrowingFailures = years.filter(y => y.borrowingStatus === 'fail').length;
  const serviceabilityFailures = years.filter(y => y.serviceabilityStatus === 'fail').length;
  
  let bottleneckText = '';
  if (depositFailures > borrowingFailures && depositFailures > serviceabilityFailures) {
    bottleneckText = 'deposit accumulation is the primary constraint';
  } else if (borrowingFailures > serviceabilityFailures) {
    bottleneckText = 'borrowing capacity limits the expansion pace';
  } else if (serviceabilityFailures > 0) {
    bottleneckText = 'serviceability requirements shape the acquisition timing';
  } else {
    bottleneckText = 'the strategy progresses smoothly across all tests';
  }
  
  const goalText = equityGoalYear 
    ? `reaching your ${formatCurrency(equityGoal)} equity goal by ${equityGoalYear}`
    : `building toward your ${formatCurrency(equityGoal)} equity goal`;
  
  return `This ${totalProperties}-property strategy projects a portfolio value of ${formatCurrency(finalYear.portfolioValueRaw)} by ${finalYear.year}, ${goalText}. Analysis shows ${bottleneckText}.`;
};

export const ChartWithRoadmap: React.FC = () => {
  const { years } = useRoadmapData();
  const { profile } = useInvestmentProfile();
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Measure container width and update on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Calculate dynamic column widths based on container size
  const yearCount = years.length;
  const availableWidth = containerWidth - LABEL_COLUMN_WIDTH;
  const calculatedColumnWidth = yearCount > 0 ? availableWidth / yearCount : MAX_YEAR_COLUMN_WIDTH;
  const yearColumnWidth = Math.max(MIN_YEAR_COLUMN_WIDTH, Math.min(MAX_YEAR_COLUMN_WIDTH, calculatedColumnWidth));
  const needsScroll = yearColumnWidth === MIN_YEAR_COLUMN_WIDTH && availableWidth < yearCount * MIN_YEAR_COLUMN_WIDTH;
  
  // Chart width calculation
  const chartWidth = yearCount * yearColumnWidth;
  const totalWidth = LABEL_COLUMN_WIDTH + chartWidth;

  // Dynamic grid style
  const gridStyle = useMemo(() => ({
    display: 'grid',
    gridTemplateColumns: `${LABEL_COLUMN_WIDTH}px repeat(${yearCount}, ${yearColumnWidth}px)`,
  }), [yearCount, yearColumnWidth]);

  // Auto-scroll to show final year when horizontal scroll is needed
  const scrollToEnd = useCallback(() => {
    if (scrollContainerRef.current && needsScroll) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [needsScroll]);

  useEffect(() => {
    // Small delay to ensure content is rendered
    const timer = setTimeout(scrollToEnd, 100);
    return () => clearTimeout(timer);
  }, [scrollToEnd, years]);

  // Transform data for the chart - include purchase info
  const chartData = useMemo(() => years.map((yearData) => ({
    year: yearData.year,
    portfolioValue: yearData.portfolioValueRaw,
    totalEquity: yearData.totalEquityRaw,
    purchaseInYear: yearData.purchaseInYear,
    purchaseDetails: yearData.purchaseDetails,
  })), [years]);

  // Find the year when equity goal is first reached
  const equityGoalReached = useMemo(() => {
    return chartData.find(d => d.totalEquity >= profile.equityGoal);
  }, [chartData, profile.equityGoal]);

  // Find the most recent purchase year (last property purchased)
  const mostRecentPurchase = useMemo(() => {
    const purchaseYears = chartData.filter(d => d.purchaseInYear);
    return purchaseYears.length > 0 ? purchaseYears[purchaseYears.length - 1] : null;
  }, [chartData]);

  // Generate AI summary
  const aiSummary = useMemo(() => {
    return generateRoadmapSummary(
      years, 
      profile.equityGoal, 
      equityGoalReached?.year || null
    );
  }, [years, profile.equityGoal, equityGoalReached]);

  // XAxis padding to center data points in columns
  const xAxisPadding = yearColumnWidth / 2;

  return (
    <div ref={containerRef} className="w-full h-full">
      <div ref={scrollContainerRef} className="overflow-x-auto h-full">
        {/* Scrollable container with dynamic total width */}
        <div style={{ minWidth: totalWidth }}>
          {/* Chart Section with grid overlay */}
          <div className="flex relative">
            {/* Label column - spacer for alignment with rows below */}
            <div 
              className="flex-shrink-0"
              style={{ width: LABEL_COLUMN_WIDTH - Y_AXIS_WIDTH }}
            />
            
            {/* Vertical grid lines overlay - positioned to align with table columns */}
            <div 
              className="absolute inset-0 pointer-events-none z-0"
              style={{ left: 0 }}
            >
              {/* Grid extends from left border through Y-axis and all year columns */}
              <div className="h-full flex">
                <div 
                  className="h-full border-r border-slate-300/40"
                  style={{ width: LABEL_COLUMN_WIDTH }}
                />
                <div className="h-full flex" style={{ width: chartWidth }}>
                  {years.map((_, index) => (
                    <div 
                      key={`grid-line-${index}`}
                      className="h-full border-r border-slate-300/40"
                      style={{ width: yearColumnWidth }}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            {/* Chart container - YAxis + plotting area with data points centered in year columns */}
            <div style={{ width: chartWidth + Y_AXIS_WIDTH }} className="relative z-10">
              <AreaChart
                width={chartWidth + Y_AXIS_WIDTH}
                height={220}
                data={chartData}
                margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
              >
              {/* Gradient Definitions */}
              <defs>
                <linearGradient id="tealGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5eead4" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#5eead4" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="greyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              
              <CartesianGrid 
                strokeDasharray="0" 
                stroke="rgba(148, 163, 184, 0.25)" 
                vertical={false}
                horizontal={true}
              />
              
              <XAxis 
                dataKey="year" 
                tick={false}
                axisLine={false}
                tickLine={false}
                padding={{ left: xAxisPadding, right: xAxisPadding }}
              />
              
              <YAxis 
                tickFormatter={formatCurrency}
                tick={{ 
                  fontSize: 11, 
                  fill: '#64748b',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              {/* "You Are Here" - marks most recent purchase */}
              {mostRecentPurchase && (
                <ReferenceLine
                  x={mostRecentPurchase.year}
                  stroke="#7c3aed"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                >
                  <Label content={<ProgressLabel />} position="top" />
                </ReferenceLine>
              )}
              
              {/* Portfolio Value Area - Teal */}
              <Area
                type="monotone"
                dataKey="portfolioValue"
                name="Portfolio Value"
                stroke="#5eead4"
                strokeWidth={2}
                fill="url(#tealGradient)"
                dot={<CustomDot />}
                activeDot={{
                  r: 6,
                  stroke: '#5eead4',
                  strokeWidth: 2,
                  fill: 'white',
                }}
              />
              
              {/* Total Equity Area - Grey */}
              <Area
                type="monotone"
                dataKey="totalEquity"
                name="Total Equity"
                stroke="#94a3b8"
                strokeWidth={2}
                fill="url(#greyGradient)"
                dot={false}
              />
              
              {/* Equity Goal Reference Line - Rendered after Areas to appear on top */}
              {profile.equityGoal > 0 && (
                <ReferenceLine
                  y={profile.equityGoal}
                  stroke="rgba(253, 186, 116, 0.7)"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                >
                  <Label content={<EquityGoalLabel equityGoal={profile.equityGoal} />} />
                </ReferenceLine>
              )}
              
              {/* Goal Achievement Marker */}
              {equityGoalReached && (
                <ReferenceDot
                  x={equityGoalReached.year}
                  y={equityGoalReached.totalEquity}
                  r={8}
                  fill="rgba(253, 186, 116, 0.9)"
                  stroke="white"
                  strokeWidth={2}
                >
                  <Label content={<GoalAchievedLabel year={equityGoalReached.year} />} />
                </ReferenceDot>
              )}
            </AreaChart>
          </div>
        </div>

        {/* Table Section with light grey background */}
        <div className="bg-slate-50/70 -mt-5">
          {/* YEAR Header Row */}
          <div style={gridStyle} className="border-b border-slate-200/40">
            <div className="sticky left-0 bg-slate-50/70 z-10 px-1 py-1.5 border-r border-slate-200/40" />
            {years.map((yearData, index) => (
              <div 
                key={yearData.year}
                className={`px-1 py-1.5 flex items-center justify-center ${index < years.length - 1 ? 'border-r border-slate-300/40' : ''}`}
              >
                <span className="text-[10px] font-medium text-slate-600 uppercase tracking-wide">
                  {yearData.year}
                </span>
              </div>
            ))}
          </div>

          {/* PURCHASE Row - Same height as other rows */}
          <div style={gridStyle} className="border-b border-slate-200/40">
            <div className="sticky left-0 bg-slate-50/70 z-10 px-1 py-1.5 flex items-center justify-end border-r border-slate-200/40">
              <span className="text-[8px] font-medium text-slate-500 uppercase tracking-wide">
                Buy
              </span>
            </div>
            {years.map((yearData, index) => (
              <div 
                key={`purchase-${yearData.year}`}
                className={`px-0.5 py-1.5 flex items-center justify-center ${index < years.length - 1 ? 'border-r border-slate-300/40' : ''}`}
              >
                {yearData.purchaseInYear && yearData.purchaseDetails ? (
                  <MiniPurchaseCard
                    propertyTitle={yearData.purchaseDetails.propertyTitle}
                    cost={yearData.purchaseDetails.cost}
                    loanAmount={yearData.purchaseDetails.loanAmount}
                    depositRequired={yearData.purchaseDetails.depositRequired}
                  />
                ) : (
                  <span className="text-[8px] text-slate-400 self-center">–</span>
                )}
              </div>
            ))}
          </div>

          {/* DEPOSIT Status Row */}
          <div style={gridStyle} className="border-b border-slate-200/40">
            <div className="sticky left-0 bg-slate-50/70 z-10 px-1 py-1.5 flex items-center justify-end border-r border-slate-200/40">
              <span className="text-[8px] font-medium text-slate-500 uppercase tracking-wide">
                Deposit
              </span>
            </div>
            {years.map((yearData, index) => (
              <div 
                key={`deposit-${yearData.year}`}
                className={`px-0.5 py-1.5 flex items-center justify-center ${index < years.length - 1 ? 'border-r border-slate-300/40' : ''}`}
              >
                <StatusPill status={yearData.depositStatus} />
              </div>
            ))}
          </div>

          {/* BORROWING Status Row */}
          <div style={gridStyle} className="border-b border-slate-200/40">
            <div className="sticky left-0 bg-slate-50/70 z-10 px-1 py-1.5 flex items-center justify-end border-r border-slate-200/40">
              <span className="text-[8px] font-medium text-slate-500 uppercase tracking-wide">
                Borrow
              </span>
            </div>
            {years.map((yearData, index) => (
              <div 
                key={`borrowing-${yearData.year}`}
                className={`px-0.5 py-1.5 flex items-center justify-center ${index < years.length - 1 ? 'border-r border-slate-300/40' : ''}`}
              >
                <StatusPill status={yearData.borrowingStatus} />
              </div>
            ))}
          </div>

          {/* SERVICEABILITY Status Row */}
          <div style={gridStyle} className="border-b border-slate-200/40">
            <div className="sticky left-0 bg-slate-50/70 z-10 px-1 py-1.5 flex items-center justify-end border-r border-slate-200/40">
              <span className="text-[8px] font-medium text-slate-500 uppercase tracking-wide">
                Service
              </span>
            </div>
            {years.map((yearData, index) => (
              <div 
                key={`service-${yearData.year}`}
                className={`px-0.5 py-1.5 flex items-center justify-center ${index < years.length - 1 ? 'border-r border-slate-300/40' : ''}`}
              >
                <StatusPill status={yearData.serviceabilityStatus} />
              </div>
            ))}
          </div>

          {/* AVAILABLE Funds Row */}
          <div style={gridStyle} className="border-b border-slate-200/40">
            <div className="sticky left-0 bg-slate-50/70 z-10 px-1 py-1.5 flex items-center justify-end border-r border-slate-200/40">
              <span className="text-[8px] font-medium text-slate-500 uppercase tracking-wide">
                Avail
              </span>
            </div>
            {years.map((yearData, index) => (
              <div 
                key={`available-${yearData.year}`}
                className={`px-0.5 py-1.5 flex items-center justify-center ${index < years.length - 1 ? 'border-r border-slate-300/40' : ''}`}
              >
                <span className="text-[8px] font-light text-slate-600">
                  {formatCompactCurrency(yearData.availableFundsRaw)}
                </span>
              </div>
            ))}
          </div>

          {/* LVR Row */}
          <div style={gridStyle} className="border-b border-slate-200/40">
            <div className="sticky left-0 bg-slate-50/70 z-10 px-1 py-1.5 flex items-center justify-end border-r border-slate-200/40">
              <span className="text-[8px] font-medium text-slate-500 uppercase tracking-wide">
                LVR
              </span>
            </div>
            {years.map((yearData, index) => {
              const lvr = yearData.portfolioValueRaw > 0 
                ? (yearData.totalDebt / yearData.portfolioValueRaw) * 100 
                : 0;
              return (
                <div 
                  key={`lvr-${yearData.year}`}
                  className={`px-0.5 py-1.5 flex items-center justify-center ${index < years.length - 1 ? 'border-r border-slate-300/40' : ''}`}
                >
                  <span className="text-[8px] font-light text-slate-600">
                    {lvr > 0 ? `${lvr.toFixed(0)}%` : '–'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* EQUITY Row */}
          <div style={gridStyle} className="border-b border-slate-200/40">
            <div className="sticky left-0 bg-slate-50/70 z-10 px-1 py-1.5 flex items-center justify-end border-r border-slate-200/40">
              <span className="text-[8px] font-medium text-slate-500 uppercase tracking-wide">
                Equity
              </span>
            </div>
            {years.map((yearData, index) => (
              <div 
                key={`equity-${yearData.year}`}
                className={`px-0.5 py-1.5 flex items-center justify-center ${index < years.length - 1 ? 'border-r border-slate-300/40' : ''}`}
              >
                <span className="text-[8px] font-light text-slate-600">
                  {yearData.totalEquityRaw > 0 ? formatCompactCurrency(yearData.totalEquityRaw) : '–'}
                </span>
              </div>
            ))}
          </div>
        </div>


        {/* AI Strategy Analysis Footer */}
        <div className="bg-gradient-to-r from-teal-50 via-sky-50 to-violet-50 border-t border-slate-200/40 p-4">
          <div className="flex items-start gap-3">
            <Sparkles size={16} className="text-violet-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-700 leading-relaxed">
              {aiSummary}
            </p>
          </div>
        </div>
        </div>
      </div>
      
    </div>
  );
};
