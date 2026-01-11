import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
  Label,
  Cell,
} from 'recharts';
import { Sparkles } from 'lucide-react';
import { useRoadmapData, YearData } from '../hooks/useRoadmapData';
import { useChartDataGenerator } from '../hooks/useChartDataGenerator';
import { useInvestmentProfile } from '../hooks/useInvestmentProfile';
import { MiniPurchaseCard } from './MiniPurchaseCard';

// Column dimension constants
const LABEL_COLUMN_WIDTH = 50;
const MIN_YEAR_COLUMN_WIDTH = 50;
const MAX_YEAR_COLUMN_WIDTH = 120;
const Y_AXIS_WIDTH = 50;

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

// Format compact currency for table cells (always abbreviated with 1 decimal)
const formatCompactCurrency = (value: number): string => {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1000000) {
    return `${sign}$${(absValue / 1000000).toFixed(1)}M`;
  }
  if (absValue >= 1000) {
    return `${sign}$${(absValue / 1000).toFixed(1)}k`;
  }
  return `${sign}$${absValue.toFixed(0)}`;
};

// Custom tooltip component for cashflow
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    const cashflow = data?.cashflow || 0;
    const formattedValue = formatCurrency(Math.abs(cashflow));
    return (
      <div className="bg-white p-3 border border-slate-200 shadow-sm rounded-md">
        <p className="text-xs font-medium text-slate-900 mb-2">Year: {label}</p>
        <p className={`text-xs ${cashflow >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
          Net Cashflow: {cashflow >= 0 ? '+' : '-'}{formattedValue}
        </p>
        <p className="text-xs text-slate-500">
          Rental Income: {formatCurrency(data?.rentalIncome || 0)}
        </p>
        <p className="text-xs text-slate-500">
          Loan Repayments: {formatCurrency(data?.loanRepayments || 0)}
        </p>
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
      fill="#9ca3af"
      fontSize={10}
      fontWeight={500}
      textAnchor="start"
      fontFamily="Inter, system-ui, sans-serif"
    >
      Break-even
    </text>
  );
};

// Cashflow Goal Label component
const CashflowGoalLabel = (props: any) => {
  const { viewBox, cashflowGoal } = props;
  if (!viewBox) return null;
  return (
    <text
      x={viewBox.x + viewBox.width - 10}
      y={viewBox.y - 5}
      fill="rgba(253, 186, 116, 1)"
      fontSize={10}
      fontWeight={500}
      textAnchor="end"
      fontFamily="Inter, system-ui, sans-serif"
    >
      Income Goal: {formatCurrency(cashflowGoal)}/yr
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

// Chart data point type for the merged data
interface ChartDataPoint {
  year: number;
  cashflow: number;
  rentalIncome: number;
  loanRepayments: number;
  purchaseInYear: boolean;
  purchaseDetails?: YearData['purchaseDetails'];
}

// Generate cashflow-specific AI summary
const generateCashflowSummary = (
  chartData: ChartDataPoint[], 
  cashflowGoal: number,
  cashflowGoalYear: number | null,
  breakEvenYear: number | null
): string => {
  const purchaseYears = chartData.filter(y => y.purchaseInYear);
  const totalProperties = purchaseYears.length;
  const finalData = chartData[chartData.length - 1];
  
  if (totalProperties === 0) {
    return "Add properties to your strategy to see a cashflow projection analysis.";
  }
  
  const finalCashflow = finalData.cashflow;
  const cashflowStatus = finalCashflow >= 0 ? 'positive' : 'negative';
  
  let summaryParts: string[] = [];
  
  summaryParts.push(`This ${totalProperties}-property strategy projects ${cashflowStatus} cashflow of ${formatCurrency(Math.abs(finalCashflow))}/year by ${finalData.year}.`);
  
  if (breakEvenYear) {
    summaryParts.push(`The portfolio reaches break-even in ${breakEvenYear}.`);
  }
  
  if (cashflowGoalYear) {
    summaryParts.push(`Your ${formatCurrency(cashflowGoal)}/year income goal is achieved by ${cashflowGoalYear}.`);
  } else if (cashflowGoal > 0) {
    summaryParts.push(`Continue building toward your ${formatCurrency(cashflowGoal)}/year income goal.`);
  }
  
  return summaryParts.join(' ');
};

export const CashflowRoadmap: React.FC = () => {
  const { years } = useRoadmapData();
  const { cashflowData } = useChartDataGenerator();
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
    const timer = setTimeout(scrollToEnd, 100);
    return () => clearTimeout(timer);
  }, [scrollToEnd, years]);

  // Transform data for the chart - use cashflowData from useChartDataGenerator for accurate values
  // but merge with years data for purchase info
  const chartData = useMemo(() => {
    // Create a map of cashflow data by year for quick lookup
    const cashflowByYear = new Map(cashflowData.map(d => [parseInt(d.year), d]));
    
    return years.map((yearData) => {
      const cfData = cashflowByYear.get(yearData.year);
      return {
        year: yearData.year,
        // Use cashflow values from useChartDataGenerator (more accurate)
        cashflow: cfData?.cashflow ?? 0,
        rentalIncome: cfData?.rentalIncome ?? 0,
        loanRepayments: cfData?.loanRepayments ?? 0,
        // Keep purchase info from useRoadmapData
        purchaseInYear: yearData.purchaseInYear,
        purchaseDetails: yearData.purchaseDetails,
      };
    });
  }, [years, cashflowData]);

  // Find break-even year (first year with positive cashflow)
  const breakEvenYear = useMemo(() => {
    const firstPositive = chartData.find(d => d.cashflow > 0);
    return firstPositive ? firstPositive.year : null;
  }, [chartData]);

  // Find the year when cashflow goal is first reached
  const cashflowGoalReached = useMemo(() => {
    return chartData.find(d => d.cashflow >= profile.cashflowGoal);
  }, [chartData, profile.cashflowGoal]);

  // Generate AI summary
  const aiSummary = useMemo(() => {
    return generateCashflowSummary(
      chartData, 
      profile.cashflowGoal, 
      cashflowGoalReached?.year || null,
      breakEvenYear
    );
  }, [chartData, profile.cashflowGoal, cashflowGoalReached, breakEvenYear]);

  // XAxis padding to center data points in columns
  const xAxisPadding = yearColumnWidth / 2;

  // Calculate Y-axis domain based on data
  const yAxisDomain = useMemo(() => {
    const values = chartData.map(d => d.cashflow);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, profile.cashflowGoal || 0);
    const padding = Math.abs(max - min) * 0.1;
    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [chartData, profile.cashflowGoal]);

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
            
            {/* Chart container */}
            <div style={{ width: chartWidth + Y_AXIS_WIDTH }} className="relative z-10">
              <BarChart
                width={chartWidth + Y_AXIS_WIDTH}
                height={220}
                data={chartData}
                margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
              >
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
                  domain={yAxisDomain}
                />
                
                <Tooltip content={<CustomTooltip />} />
                
                {/* Break-even Reference Line */}
                <ReferenceLine
                  y={0}
                  stroke="#9ca3af"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                >
                  <Label content={<BreakEvenLabel />} />
                </ReferenceLine>
                
                {/* Cashflow Goal Reference Line */}
                {profile.cashflowGoal > 0 && (
                  <ReferenceLine
                    y={profile.cashflowGoal}
                    stroke="rgba(253, 186, 116, 0.7)"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                  >
                    <Label content={<CashflowGoalLabel cashflowGoal={profile.cashflowGoal} />} />
                  </ReferenceLine>
                )}
                
                {/* Cashflow Bars with conditional coloring */}
                <Bar 
                  dataKey="cashflow" 
                  radius={[2, 2, 0, 0]}
                  barSize={yearColumnWidth * 0.6}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.cashflow >= 0 ? "rgba(134, 239, 172, 0.7)" : "rgba(252, 165, 165, 0.7)"}
                    />
                  ))}
                </Bar>
                
                {/* Goal Achievement Marker */}
                {cashflowGoalReached && (
                  <ReferenceDot
                    x={cashflowGoalReached.year}
                    y={cashflowGoalReached.cashflow}
                    r={8}
                    fill="rgba(253, 186, 116, 0.9)"
                    stroke="white"
                    strokeWidth={2}
                  >
                    <Label content={<GoalAchievedLabel year={cashflowGoalReached.year} />} />
                  </ReferenceDot>
                )}
              </BarChart>
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

            {/* RENTAL INCOME Row */}
            <div style={gridStyle} className="border-b border-slate-200/40">
              <div className="sticky left-0 bg-slate-50/70 z-10 px-1 py-1.5 flex items-center justify-end border-r border-slate-200/40">
                <span className="text-[8px] font-medium text-slate-500 uppercase tracking-wide">
                  Income
                </span>
              </div>
              {chartData.map((data, index) => (
                <div 
                  key={`income-${data.year}`}
                  className={`px-0.5 py-1.5 flex items-center justify-center ${index < chartData.length - 1 ? 'border-r border-slate-300/40' : ''}`}
                >
                  <span className="text-[9px] text-slate-600">
                    {data.rentalIncome > 0 ? formatCompactCurrency(data.rentalIncome) : '–'}
                  </span>
                </div>
              ))}
            </div>

            {/* LOAN REPAYMENTS Row */}
            <div style={gridStyle} className="border-b border-slate-200/40">
              <div className="sticky left-0 bg-slate-50/70 z-10 px-1 py-1.5 flex items-center justify-end border-r border-slate-200/40">
                <span className="text-[8px] font-medium text-slate-500 uppercase tracking-wide">
                  Loans
                </span>
              </div>
              {chartData.map((data, index) => (
                <div 
                  key={`loans-${data.year}`}
                  className={`px-0.5 py-1.5 flex items-center justify-center ${index < chartData.length - 1 ? 'border-r border-slate-300/40' : ''}`}
                >
                  <span className="text-[9px] text-slate-600">
                    {data.loanRepayments > 0 ? formatCompactCurrency(data.loanRepayments) : '–'}
                  </span>
                </div>
              ))}
            </div>

            {/* NET CASHFLOW Row */}
            <div style={gridStyle} className="border-b border-slate-200/40">
              <div className="sticky left-0 bg-slate-50/70 z-10 px-1 py-1.5 flex items-center justify-end border-r border-slate-200/40">
                <span className="text-[8px] font-medium text-slate-500 uppercase tracking-wide">
                  Net
                </span>
              </div>
              {chartData.map((data, index) => {
                const cashflow = data.cashflow;
                const isPositive = cashflow >= 0;
                const hasValue = data.rentalIncome > 0 || data.loanRepayments > 0;
                return (
                  <div 
                    key={`cashflow-${data.year}`}
                    className={`px-0.5 py-1.5 flex items-center justify-center ${index < chartData.length - 1 ? 'border-r border-slate-300/40' : ''}`}
                  >
                    <span className={`text-[9px] font-medium ${hasValue ? (isPositive ? 'text-green-600' : 'text-rose-600') : 'text-slate-600'}`}>
                      {hasValue ? formatCompactCurrency(cashflow) : '–'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Strategy Analysis Footer */}
          <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border-t border-slate-200/40 p-4">
            <div className="flex items-start gap-3">
              <Sparkles size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
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

