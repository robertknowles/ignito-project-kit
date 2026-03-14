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
import { useRoadmapData, YearData } from '../hooks/useRoadmapData';
import { useChartDataGenerator } from '../hooks/useChartDataGenerator';
import { useInvestmentProfile } from '../hooks/useInvestmentProfile';
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator';
import { MiniPurchaseCard } from './MiniPurchaseCard';
import { Info } from 'lucide-react';
import { PropertyDetailsModal } from './PropertyDetailsModal';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { TimelineProperty } from '../types/property';
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext';
import { CHART_COLORS, CHART_STYLE } from '../constants/chartColors';

// Column dimension constants
// IMPORTANT: LABEL_COLUMN_WIDTH and Y_AXIS_WIDTH must stay equal for chart/table alignment
const LABEL_COLUMN_WIDTH = 65;
const MIN_YEAR_COLUMN_WIDTH = 50;
const MAX_YEAR_COLUMN_WIDTH = 120;
const Y_AXIS_WIDTH = 65;

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
      <div className="bg-white p-3 border border-gray-200 shadow-sm rounded-md">
        <p className="text-xs font-medium text-gray-900 mb-2">Year: {label}</p>
        <p className="text-xs text-gray-700">
          Net Cashflow: {cashflow >= 0 ? '+' : '-'}{formattedValue}
        </p>
        <p className="text-xs text-gray-500">
          Rental Income: {formatCurrency(data?.rentalIncome || 0)}
        </p>
        <p className="text-xs text-gray-500">
          Expenses: {formatCurrency(data?.expenses || 0)}
        </p>
        <p className="text-xs text-gray-500">
          Loan Interest: {formatCurrency(data?.loanRepayments || 0)}
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
      fill={CHART_COLORS.annotationText}
      fontSize={10}
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

// Chart data point type for the merged data
interface ChartDataPoint {
  year: number;
  cashflow: number;
  rentalIncome: number;
  expenses: number;
  loanRepayments: number;
  purchaseInYear: boolean;
  purchaseDetails?: YearData['purchaseDetails'];
}

interface CashflowRoadmapProps {
  scenarioData?: {
    timelineProperties: TimelineProperty[];
    profile: InvestmentProfileData;
  };
}

export const CashflowRoadmap: React.FC<CashflowRoadmapProps> = ({ scenarioData }) => {
  const { profile: contextProfile } = useInvestmentProfile();
  const { timelineProperties: contextTimelineProperties } = useAffordabilityCalculator();
  
  // Use scenarioData if provided (multi-scenario mode), otherwise use context
  const profile = scenarioData?.profile ?? contextProfile;
  const timelineProperties = scenarioData?.timelineProperties ?? contextTimelineProperties;
  
  // Pass scenario data to hooks so they use the correct data source
  const { years } = useRoadmapData(scenarioData ? { profile, timelineProperties } : undefined);
  const { cashflowData } = useChartDataGenerator(scenarioData ? { profile, timelineProperties } : undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  
  // Modal state for property details
  const [selectedProperty, setSelectedProperty] = useState<TimelineProperty | null>(null);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  
  // Expandable state for the table rows (excluding year header)
  const [isTableExpanded, setIsTableExpanded] = useState(true);
  
  // Handler to open property details modal
  const handlePropertyClick = useCallback((instanceId: string) => {
    const property = timelineProperties.find(p => p.instanceId === instanceId);
    if (property) {
      setSelectedProperty(property);
      setIsPropertyModalOpen(true);
    }
  }, [timelineProperties]);
  
  // Handler to close property details modal
  const handlePropertyModalClose = useCallback(() => {
    setIsPropertyModalOpen(false);
    setSelectedProperty(null);
  }, []);

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
  
  // Chart width calculation - use full available width to eliminate whitespace
  const minChartWidth = yearCount * yearColumnWidth;
  const chartWidth = Math.max(minChartWidth, availableWidth);
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
        expenses: cfData?.expenses ?? 0,
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

  // XAxis padding to center data points in columns
  const xAxisPadding = yearColumnWidth / 2;

  // Calculate Y-axis domain with nice round intervals
  const { yAxisDomain, yAxisTicks } = useMemo(() => {
    const values = chartData.map(d => d.cashflow);
    const dataMin = Math.min(...values, 0);
    const dataMax = Math.max(...values, profile.cashflowGoal || 0);
    
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
                  className="h-full border-r border-gray-300/40"
                  style={{ width: LABEL_COLUMN_WIDTH }}
                />
                <div className="h-full flex" style={{ width: chartWidth }}>
                  {years.map((_, index) => (
                    <div 
                      key={`grid-line-${index}`}
                      className="h-full border-r border-gray-300/40"
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
                <CartesianGrid {...CHART_STYLE.grid} />
                
                <XAxis 
                  dataKey="year" 
                  tick={false}
                  axisLine={false}
                  tickLine={false}
                />
                
                <YAxis
                  tickFormatter={formatCurrency}
                  {...CHART_STYLE.yAxis}
                  tick={{ ...CHART_STYLE.yAxis.tick, fontSize: 11 }}
                  width={Y_AXIS_WIDTH}
                  domain={yAxisDomain}
                  ticks={yAxisTicks}
                />
                
                <Tooltip content={<CustomTooltip />} />
                
                {/* Break-even Reference Line */}
                <ReferenceLine
                  y={0}
                  stroke={CHART_COLORS.referenceLine}
                  strokeDasharray={CHART_STYLE.referenceLine.strokeDasharray}
                  strokeWidth={1}
                >
                  <Label content={<BreakEvenLabel />} />
                </ReferenceLine>
                
                {/* Cashflow Bars with conditional coloring */}
                <Bar 
                  dataKey="cashflow" 
                  radius={[2, 2, 0, 0]}
                  barSize={yearColumnWidth * 0.6}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.cashflow >= 0 ? CHART_COLORS.barPositive : CHART_COLORS.barNegative}
                    />
                  ))}
                </Bar>
                
                {/* Goal Achievement Marker - Gold dot when cashflow goal is reached */}
                {cashflowGoalReached && (
                  <ReferenceDot
                    x={cashflowGoalReached.year}
                    y={cashflowGoalReached.cashflow}
                    r={8}
                    fill={CHART_COLORS.goalMarker}
                    stroke={CHART_COLORS.goal}
                    strokeWidth={2}
                  >
                    <Label content={<GoalAchievedLabel year={cashflowGoalReached.year} />} />
                  </ReferenceDot>
                )}
              </BarChart>
            </div>
          </div>

          {/* Table Section with light grey background */}
          <div className="bg-gray-50/50 -mt-5">
            {/* YEAR Header Row - Always visible, clickable to expand/collapse table */}
            <div 
              style={gridStyle} 
              className="border-b border-gray-200/40 cursor-pointer hover:bg-gray-100/50 transition-colors"
              onClick={() => setIsTableExpanded(!isTableExpanded)}
            >
              <div className="sticky left-0 bg-gray-50/50 z-10 px-1.5 py-2.5 border-r border-gray-200/50 flex items-center justify-end">
                <span className={`text-[9px] text-gray-400 transition-transform duration-200 ${isTableExpanded ? 'rotate-90' : ''}`}>▶</span>
              </div>
              {years.map((yearData, index) => (
                <div
                  key={yearData.year}
                  className={`px-1 py-2.5 flex items-center justify-center ${index < years.length - 1 ? 'border-r border-gray-200/40' : ''}`}
                >
                  <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                    {yearData.year}
                  </span>
                </div>
              ))}
            </div>

            {/* Expandable Table Content */}
            {isTableExpanded && (
            <>
            {/* PURCHASE Row - Same height as other rows */}
            <div style={gridStyle} className="border-b border-gray-200/50">
              <div className="sticky left-0 bg-gray-50/50 z-10 px-1.5 py-2 flex items-center justify-end gap-0.5 border-r border-gray-200/50">
                <span className="text-[9px] font-medium text-gray-500 uppercase tracking-wide">
                  Buy
                </span>
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="inline-flex items-center justify-center">
                        <Info className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[200px] z-50 p-2">
                      <p className="text-[10px] font-medium text-gray-700 mb-1">Scheduled property purchases</p>
                      <ul className="text-[9px] text-gray-500 space-y-0.5">
                        <li>• Click property to view details</li>
                        <li>• Timing based on 3 affordability tests</li>
                      </ul>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </div>
              {years.map((yearData, index) => (
                <div
                  key={`purchase-${yearData.year}`}
                  className={`px-0.5 py-2 flex flex-col items-center justify-center gap-0.5 ${index < years.length - 1 ? 'border-r border-gray-200/40' : ''}`}
                >
                  {yearData.purchaseInYear && yearData.purchaseDetails && yearData.purchaseDetails.length > 0 ? (
                    // Render a MiniPurchaseCard for each property in this year
                    yearData.purchaseDetails.map((purchase, purchaseIndex) => (
                      <MiniPurchaseCard
                        key={`${purchase.instanceId}-${purchaseIndex}`}
                        propertyTitle={purchase.propertyTitle}
                        cost={purchase.cost}
                        loanAmount={purchase.loanAmount}
                        depositRequired={purchase.depositRequired}
                        onClick={() => handlePropertyClick(purchase.instanceId)}
                      />
                    ))
                  ) : (
                    <span className="text-[9px] text-gray-400 self-center">–</span>
                  )}
                </div>
              ))}
            </div>

            {/* RENTAL INCOME Row */}
            <div style={gridStyle} className="border-b border-gray-200/50">
              <div className="sticky left-0 bg-gray-50/50 z-10 px-1.5 py-2 flex items-center justify-end gap-0.5 border-r border-gray-200/50">
                <span className="text-[9px] font-medium text-gray-500 uppercase tracking-wide">
                  Income
                </span>
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="inline-flex items-center justify-center">
                        <Info className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[200px] z-50 p-2">
                      <p className="text-[10px] font-medium text-gray-700 mb-1">= (Rent/week × 52) − Vacancy</p>
                      <ul className="text-[9px] text-gray-500 space-y-0.5">
                        <li>• Rent/week: From property settings</li>
                        <li>• Vacancy: Rent × vacancy rate %</li>
                        <li>• Growth: Increases with property value</li>
                      </ul>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </div>
              {chartData.map((data, index) => (
                <div
                  key={`income-${data.year}`}
                  className={`px-0.5 py-2 flex items-center justify-center ${index < chartData.length - 1 ? 'border-r border-gray-200/40' : ''}`}
                >
                  <span className="text-[10px] text-gray-600">
                    {data.rentalIncome > 0 ? formatCompactCurrency(data.rentalIncome) : '–'}
                  </span>
                </div>
              ))}
            </div>

            {/* EXPENSES Row */}
            <div style={gridStyle} className="border-b border-gray-200/50">
              <div className="sticky left-0 bg-gray-50/50 z-10 px-1.5 py-2 flex items-center justify-end gap-0.5 border-r border-gray-200/50">
                <span className="text-[9px] font-medium text-gray-500 uppercase tracking-wide">
                  Expen
                </span>
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="inline-flex items-center justify-center">
                        <Info className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[220px] z-50 p-2">
                      <p className="text-[10px] font-medium text-gray-700 mb-1">= Mgmt + Insurance + Council + Strata + Maintenance + Land Tax − Deductions</p>
                      <ul className="text-[9px] text-gray-500 space-y-0.5">
                        <li>• Management: % of rent (grows with rent)</li>
                        <li>• Other costs: +3% inflation per year</li>
                        <li>• Deductions: From Annual Expenses settings</li>
                      </ul>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </div>
              {chartData.map((data, index) => (
                <div
                  key={`expenses-${data.year}`}
                  className={`px-0.5 py-2 flex items-center justify-center ${index < chartData.length - 1 ? 'border-r border-gray-200/40' : ''}`}
                >
                  <span className="text-[10px] text-gray-600">
                    {data.expenses > 0 ? formatCompactCurrency(data.expenses) : '–'}
                  </span>
                </div>
              ))}
            </div>

            {/* LOAN REPAYMENTS Row */}
            <div style={gridStyle} className="border-b border-gray-200/50">
              <div className="sticky left-0 bg-gray-50/50 z-10 px-1.5 py-2 flex items-center justify-end gap-0.5 border-r border-gray-200/50">
                <span className="text-[9px] font-medium text-gray-500 uppercase tracking-wide">
                  Loans
                </span>
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="inline-flex items-center justify-center">
                        <Info className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[200px] z-50 p-2">
                      <p className="text-[10px] font-medium text-gray-700 mb-1">= (Loan − Offset) × Interest Rate</p>
                      <ul className="text-[9px] text-gray-500 space-y-0.5">
                        <li>• Loan: Purchase price × LVR %</li>
                        <li>• Offset: Reduces interest (if set)</li>
                        <li>• Rate: From property loan settings</li>
                      </ul>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </div>
              {chartData.map((data, index) => (
                <div
                  key={`loans-${data.year}`}
                  className={`px-0.5 py-2 flex items-center justify-center ${index < chartData.length - 1 ? 'border-r border-gray-200/40' : ''}`}
                >
                  <span className="text-[10px] text-gray-600">
                    {data.loanRepayments > 0 ? formatCompactCurrency(data.loanRepayments) : '–'}
                  </span>
                </div>
              ))}
            </div>

            {/* NET CASHFLOW Row */}
            <div style={gridStyle} className="border-b border-gray-200/50">
              <div className="sticky left-0 bg-gray-50/50 z-10 px-1.5 py-2 flex items-center justify-end gap-0.5 border-r border-gray-200/50">
                <span className="text-[9px] font-medium text-gray-500 uppercase tracking-wide">
                  Net
                </span>
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="inline-flex items-center justify-center">
                        <Info className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[200px] z-50 p-2">
                      <p className="text-[10px] font-medium text-gray-700 mb-1">= Income − Expenses − Loans</p>
                      <ul className="text-[9px] text-gray-500 space-y-0.5">
                        <li>• <span className="font-medium">Positive</span>: Cash in your pocket</li>
                        <li>• <span className="font-medium">Negative</span>: Out-of-pocket cost</li>
                        <li>• Year 1 matches property inputs</li>
                      </ul>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </div>
              {chartData.map((data, index) => {
                const cashflow = data.cashflow;
                const isPositive = cashflow >= 0;
                const hasValue = data.rentalIncome > 0 || data.loanRepayments > 0;
                return (
                  <div
                    key={`cashflow-${data.year}`}
                    className={`px-0.5 py-2 flex items-center justify-center ${index < chartData.length - 1 ? 'border-r border-gray-200/40' : ''}`}
                  >
                    <span className={`text-[10px] font-medium ${hasValue ? 'text-gray-700' : 'text-gray-400'}`}>
                      {hasValue ? formatCompactCurrency(cashflow) : '–'}
                    </span>
                  </div>
                );
              })}
            </div>
            </>
            )}
          </div>

        </div>
      </div>
      
      {/* Property Details Modal */}
      <PropertyDetailsModal
        property={selectedProperty}
        isOpen={isPropertyModalOpen}
        onClose={handlePropertyModalClose}
      />
    </div>
  );
};

