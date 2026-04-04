/**
 * QUICK REFERENCE: Chart Colours & Styling
 * Copy-paste this when building new chart components
 * Last updated: March 15, 2026
 */

// ============================================================================
// IMPORT THESE IN EVERY CHART
// ============================================================================

import { CHART_COLORS, CHART_STYLE } from '@/constants/chartColors';

// CHART_COLORS object contents:
/*
{
  primary: '#3B6CF4',           // Main blue for primary lines/bars
  secondary: '#6B9CF7',         // Lighter blue for secondary
  tertiary: '#A3C1FA',          // Light blue for debt/background
  positive: '#3B6CF4',          // Green-equivalent (still blue)
  negative: '#A3C1FA',          // Red-equivalent (light blue)
  net: '#3B6CF4',
  goal: '#6B9CF7',              // Reference line colour
  goalMarker: '#3B6CF4',        // Dot colour for goal achievement
  goalMarkerStroke: '#FFFFFF',
  primaryFillStart: 'rgba(59, 108, 244, 0.08)',
  primaryFillEnd: 'rgba(59, 108, 244, 0.01)',
  secondaryFillStart: 'rgba(107, 156, 247, 0.06)',
  secondaryFillEnd: 'rgba(107, 156, 247, 0.01)',
  grid: '#F1F3F5',              // Light grey grid
  axisText: '#9CA3AF',          // Grey axis labels
  labelText: '#6B7280',
  tooltipBorder: '#F1F3F5',
  referenceLine: '#CBD5E1',
  annotationText: '#9CA3AF',
  series: [                     // 6 blue shades for multi-series
    '#3B6CF4', '#1E4FD0', '#6B9CF7', '#5080E8', '#A3C1FA', '#8AB0F8'
  ],
  barPositive: 'rgba(59, 108, 244, 0.55)',
  barNegative: 'rgba(163, 193, 250, 0.50)',
  barPrimary: 'rgba(59, 108, 244, 0.55)',
}
*/

// CHART_STYLE object contents:
/*
{
  grid: {
    strokeDasharray: '0',
    stroke: '#F1F3F5',
    strokeOpacity: 1,
    vertical: false,
  },
  xAxis: {
    tick: { fontSize: 11, fill: '#9CA3AF', fontFamily: 'Inter, system-ui, sans-serif' },
    axisLine: false,
    tickLine: false,
  },
  yAxis: {
    tick: { fontSize: 11, fill: '#9CA3AF', fontFamily: 'Inter, system-ui, sans-serif' },
    axisLine: false,
    tickLine: false,
    width: 55,
  },
  lineStrokeWidth: 2,
  lineStrokeWidthLight: 1.5,
  dashedPattern: '4 4',
  referenceLine: { stroke: '#CBD5E1', strokeDasharray: '4 4', strokeWidth: 1 },
  goalLine: { stroke: '#6B9CF7', strokeDasharray: '5 5', strokeWidth: 1.5 },
}
*/

// ============================================================================
// MINIMAL CHART TEMPLATE
// ============================================================================

import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export const MyNewChart = () => {
  const data = [
    { year: 2025, value: 100000 },
    { year: 2026, value: 200000 },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const value = payload[0].value;
    const formatted = value >= 1000000
      ? `$${(value / 1000000).toFixed(1)}M`
      : `$${(value / 1000).toFixed(0)}K`;
    return (
      <div className="bg-white p-3 border border-gray-200 shadow-sm rounded-lg">
        <p className="text-xs font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-600">{formatted}</p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 20, right: 24, left: 0, bottom: 5 }}>
        <CartesianGrid {...CHART_STYLE.grid} vertical={false} />
        <XAxis dataKey="year" {...CHART_STYLE.xAxis} />
        <YAxis {...CHART_STYLE.yAxis} width={80} />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={CHART_COLORS.primary}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

// ============================================================================
// CARD WRAPPER TEMPLATE
// ============================================================================

/*
import { ChartCard } from '@/components/ui/ChartCard';

<ChartCard
  title="Your Chart Title"
  legend={[
    { color: CHART_COLORS.primary, label: 'Series 1' },
    { color: CHART_COLORS.secondary, label: 'Series 2' },
  ]}
>
  <MyNewChart />
</ChartCard>
*/

// ============================================================================
// EXACT PIXEL/HEX VALUES (NO ESTIMATES)
// ============================================================================

// COLOURS
const COLOURS_EXACT = {
  // Primary series
  BLUE_PRIMARY: '#3B6CF4',      // rgb(59, 108, 244) — main lines
  BLUE_SECONDARY: '#6B9CF7',    // rgb(107, 156, 247) — equity, secondary
  BLUE_LIGHT: '#A3C1FA',        // rgb(163, 193, 250) — debt, light series
  BLUE_DARKER: '#1E4FD0',       // rgb(30, 79, 208) — for multi-series depth

  // Chrome & UI
  GREY_GRID: '#F1F3F5',         // Grid lines, very light
  GREY_LABEL: '#9CA3AF',        // Axis label text
  GREY_ANNOTATION: '#9CA3AF',   // Small text, hints
  GREY_BORDER: '#CBD5E1',       // Reference lines
  WHITE: '#FFFFFF',             // Card backgrounds, strokes
};

// CARD STYLING
const CARD_STYLING = {
  background: 'bg-white',
  border: 'border border-gray-200',
  borderRadius: 'rounded-lg',
  titlePadding: 'px-6 pt-5',
  contentPadding: 'pl-2 pr-2 pt-5 pb-4',
  legendPadding: 'pl-12 pr-6 pb-6 pt-2',
  titleFontSize: 'text-sm',
  titleFontWeight: 'font-semibold',
  titleColour: 'text-gray-900',
};

// CHART DIMENSIONS
const DIMENSIONS = {
  CHART_HEIGHT_STANDARD: 260,   // px (CashflowChart, NetWorthChart)
  CHART_HEIGHT_ROADMAP: 276,    // px (ChartWithRoadmap)
  CHART_HEIGHT_GROWTH: 320,     // px (PortfolioGrowthChart, h-80 container)
  Y_AXIS_WIDTH: 80,             // px
  MARGIN_TOP: 20,               // px
  MARGIN_RIGHT: 24,             // px
  MARGIN_BOTTOM: 5,             // px
  MARGIN_LEFT: 0,               // px
  TOOLTIP_MIN_WIDTH: 128,       // px (min-w-[8rem])
  TOOLTIP_PADDING: 10,          // px (px-2.5 py-1.5)
};

// FONT SIZES (chart context only)
const FONT_SIZES = {
  AXIS_LABEL: 11,               // px
  TOOLTIP_TEXT: 12,             // px
  TOOLTIP_LABEL: 12,            // px (font-medium)
  LEGEND_LABEL: 12,             // px
  ANNOTATION: 9,                // px (phase labels)
  SECTION_HEADING: 14,          // px (card titles)
};

// STROKE WIDTHS
const STROKES = {
  LINE_PRIMARY: 2,              // px (main series)
  LINE_SECONDARY: 1.5,          // px (secondary series)
  LINE_DASHED: 1.5,             // px (reference, savings-only)
  GRID: 1,                      // px (implicit)
  DOT_MARKER: 8,               // px radius (goal dots)
  DOT_MARKER_STROKE: 2,        // px (white border)
  BAR_RADIUS: [2, 2, 0, 0],    // [top-l, top-r, bottom-r, bottom-l]
};

// DASH PATTERNS
const DASH_PATTERNS = {
  SOLID: '0',                   // No dashes
  GOAL: '5 5',                  // 5px dash, 5px gap
  SAVINGS: '6 4',               // 6px dash, 4px gap
  REFERENCE: '4 4',             // 4px dash, 4px gap
};

// OPACITIES
const OPACITIES = {
  GRID: 1,                      // 100%
  AREA_FILL_START: 0.08,        // 8%
  AREA_FILL_END: 0.01,          // 1%
  BAR_POSITIVE: 0.55,           // 55%
  BAR_NEGATIVE: 0.50,           // 50%
  BORDER_MUTED: 0.5,            // 50% (border-border/50)
};

// ============================================================================
// COMMON FORMATTERS (Copy & Paste)
// ============================================================================

const formatCurrency = (value: number): string => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

const formatCurrencyWithSign = (value: number): string => {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (absValue >= 1000000) return `${sign}$${(absValue / 1000000).toFixed(1)}M`;
  if (absValue >= 1000) return `${sign}$${(absValue / 1000).toFixed(0)}K`;
  return `${sign}$${absValue.toFixed(0)}`;
};

const formatMillions = (value: number): string => {
  return `$${(value / 1000000).toFixed(1)}M`;
};

// ============================================================================
// CLASS NAME PATTERNS
// ============================================================================

// Chart wrapper
const chartWrapperClasses = 'bg-white rounded-lg border border-gray-200';

// Chart title
const chartTitleClasses = 'text-sm font-semibold text-gray-900';

// Tooltip wrapper
const tooltipClasses = 'bg-white p-3 border border-gray-200 shadow-sm rounded-lg';

// Tooltip paragraph
const tooltipTextClasses = 'text-xs text-gray-600';

// Legend item
const legendItemClasses = 'flex items-center gap-1.5';

// Legend dot
const legendDotClasses = 'w-2 h-2 rounded-full flex-shrink-0';

// Legend text
const legendTextClasses = 'text-[11px] text-gray-400';

// ============================================================================
// NETWORTH CHART EXCEPTION (Non-blue Palette)
// ============================================================================

const NW_COLORS = {
  totalAssets: '#3B82F6',       // Blue
  netWorth: '#8B5CF6',          // Purple
  totalDebt: '#22D3EE',         // Aqua/Cyan
} as const;

// ============================================================================
// RECHARTS ELEMENT PROPS (Common Patterns)
// ============================================================================

// Line (primary)
const linePrimaryProps = {
  type: 'monotone' as const,
  stroke: CHART_COLORS.primary,
  strokeWidth: 2,
  dot: false,
  activeDot: { r: 6, stroke: CHART_COLORS.primary, strokeWidth: 2, fill: 'white' },
};

// Line (secondary)
const lineSecondaryProps = {
  type: 'monotone' as const,
  stroke: CHART_COLORS.secondary,
  strokeWidth: 1.5,
  dot: false,
  activeDot: { r: 6, stroke: CHART_COLORS.secondary, strokeWidth: 1, fill: 'white' },
};

// Line (dashed reference)
const lineDashedProps = {
  type: 'monotone' as const,
  stroke: CHART_COLORS.annotationText,
  strokeDasharray: '6 4',
  strokeWidth: 1.5,
  dot: false,
  connectNulls: true,
};

// Bar (positive/negative colouring)
const barConditionalProps = {
  fill: CHART_COLORS.barPositive,
  radius: [2, 2, 0, 0] as const,
};

// Goal marker dot
const goalDotProps = {
  r: 8,
  fill: CHART_COLORS.goalMarker,
  stroke: 'white',
  strokeWidth: 2,
};

// Goal reference line
const goalLineProps = {
  stroke: CHART_COLORS.goal,
  strokeDasharray: '5 5',
  strokeWidth: 1.5,
};

// ============================================================================
// END OF QUICK REFERENCE
// ============================================================================
