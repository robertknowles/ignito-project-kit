# PropPath Chart & Dashboard Design System

**Last Updated:** March 15, 2026

This document is the single source of truth for all visual styling used in PropPath's dashboard charts and components. Use these exact values when creating new components to maintain design consistency.

---

## 1. Colour Palette

### 1.1 Core Chart Colours (All Blues)

The design system uses an **all-blue colour palette** exclusively. No greens, reds, purples, or other hues are used in main chart series.

**File:** `/src/constants/chartColors.ts` (CHART_COLORS object)

#### Primary Series Colours
| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| `primary` | `#3B6CF4` | rgb(59, 108, 244) | Portfolio Value, main line, primary bars |
| `secondary` | `#6B9CF7` | rgb(107, 156, 247) | Total Equity, secondary line |
| `tertiary` | `#A3C1FA` | rgb(163, 193, 250) | Debt, dashed line, light reference series |

#### Semantic Colours (Blue Family)
| Name | Hex | Usage |
|------|-----|-------|
| `positive` | `#3B6CF4` | Income, gains, positive values |
| `negative` | `#A3C1FA` | Expenses, debt, losses, negative bars |
| `net` | `#3B6CF4` | Net result values |

#### Goal & Milestone Markers
| Name | Hex | Usage |
|------|-----|-------|
| `goal` | `#6B9CF7` | Goal/target reference lines (dashed) |
| `goalMarker` | `#3B6CF4` | Goal achievement dots/markers (yellow in visuals) |
| `goalMarkerStroke` | `#FFFFFF` | White stroke around goal marker dots |

#### Multi-Series Palette (for >3 series)
Six shades of blue used in order:
```javascript
series: [
  '#3B6CF4',  // darkest
  '#1E4FD0',  // very dark
  '#6B9CF7',  // medium
  '#5080E8',  // medium-dark
  '#A3C1FA',  // light
  '#8AB0F8',  // light-medium
]
```

#### Scenario Comparison Colours
| Name | Hex | Usage |
|------|-----|-------|
| `scenarioA` | `#3B6CF4` | Scenario A (primary) |
| `scenarioALight` | `#6B9CF7` | Scenario A secondary/light |
| `scenarioB` | `#1E4FD0` | Scenario B (darker blue) |
| `scenarioBLight` | `#5080E8` | Scenario B light |

### 1.2 Area Fill & Gradient Colours

All area fills use low-opacity blues to maintain a clean, professional look.

| Name | Value | Opacity | Usage |
|------|-------|---------|-------|
| `primaryFillStart` | rgba(59, 108, 244, 0.08) | 8% | Primary area start |
| `primaryFillEnd` | rgba(59, 108, 244, 0.01) | 1% | Primary area fade |
| `secondaryFillStart` | rgba(107, 156, 247, 0.06) | 6% | Secondary area start |
| `secondaryFillEnd` | rgba(107, 156, 247, 0.01) | 1% | Secondary area fade |
| `positiveFillStart` | rgba(59, 108, 244, 0.07) | 7% | Positive area start |
| `positiveFillEnd` | rgba(59, 108, 244, 0.01) | 1% | Positive area fade |
| `negativeFillStart` | rgba(163, 193, 250, 0.06) | 6% | Negative area start |
| `negativeFillEnd` | rgba(163, 193, 250, 0.01) | 1% | Negative area fade |

### 1.3 Bar Chart Fills

| Name | Value | Usage |
|------|-------|-------|
| `barPositive` | rgba(59, 108, 244, 0.55) | Positive bar fill |
| `barNegative` | rgba(163, 193, 250, 0.50) | Negative bar fill |
| `barPrimary` | rgba(59, 108, 244, 0.55) | Default bar fill |

### 1.4 Grid, Axes, & Chrome

| Name | Hex | Usage |
|------|-----|-------|
| `grid` | `#F1F3F5` | Grid lines, light grey |
| `axisText` | `#9CA3AF` | X/Y axis label text colour |
| `labelText` | `#6B7280` | General label text colour |
| `tooltipBorder` | `#F1F3F5` | Tooltip border colour |
| `referenceLine` | `#CBD5E1` | Reference/goal lines stroke |
| `annotationText` | `#9CA3AF` | Annotations, small text, hints |

### 1.5 NetWorthChart Custom Colours

The NetWorthChart uses a distinct **3-colour palette** (not all blue):

**File:** `/src/components/NetWorthChart.tsx` (NW_COLORS object)

| Name | Hex | Usage |
|------|-----|-------|
| `totalAssets` | `#3B82F6` | Blue (Total Assets line) |
| `netWorth` | `#8B5CF6` | Purple (Net Worth line) |
| `totalDebt` | `#22D3EE` | Light blue/aqua (Total Debt line) |

---

## 2. Chart Library

### 2.1 Library Details
- **Library:** Recharts
- **Version:** `^2.15.4` (from package.json)
- **Installation:** `npm install recharts@^2.15.4`
- **Documentation:** https://recharts.org

### 2.2 Chart Components Used in Codebase

| Component | File | Purpose |
|-----------|------|---------|
| `ComposedChart` | ChartWithRoadmap.tsx | Multi-line chart with portfolio and equity tracking |
| `AreaChart` | (not currently used) | Could be used for area fills |
| `LineChart` | PortfolioGrowthChart.tsx, NetWorthChart.tsx | Single/multi-line charts |
| `BarChart` | CashflowChart.tsx | Bar chart for cashflow visualization |
| `XAxis` | All charts | X-axis (years) |
| `YAxis` | All charts | Y-axis (currency amounts) |
| `CartesianGrid` | All charts | Grid background |
| `Tooltip` | All charts | Interactive tooltips on hover |
| `Legend` | PortfolioGrowthChart.tsx | Legend showing series names |
| `ReferenceLine` | ChartWithRoadmap.tsx, PortfolioGrowthChart.tsx | Goal lines, phase boundaries |
| `ReferenceDot` | ChartWithRoadmap.tsx, CashflowChart.tsx | Goal achievement markers |
| `ReferenceArea` | ChartWithRoadmap.tsx | Phase background areas |
| `Line` | All line/composed charts | Line series |
| `Bar` | CashflowChart.tsx | Bar series |
| `Label` | All charts with labels | Text annotations |
| `Cell` | CashflowChart.tsx | Per-bar colouring |

---

## 3. Chart Styling Patterns

### 3.1 Container & Wrapper Styling

All charts are wrapped in card containers with consistent styling:

**File:** `/src/components/ui/ChartCard.tsx`

```tsx
<div className="bg-white rounded-lg border border-gray-200">
  {/* Title section */}
  <div className="px-6 pt-5 flex items-center justify-between">
    <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
  </div>

  {/* Content section */}
  <div className="pl-2 pr-2 pt-5 pb-4">
    {/* Chart here */}
  </div>

  {/* Legend (optional) */}
  {legend && (
    <div className="pl-12 pr-6 pb-6 pt-2 flex items-center gap-5">
      {/* Legend items */}
    </div>
  )}
</div>
```

#### Card Container Values
| Property | Value | Notes |
|----------|-------|-------|
| Background | `bg-white` | Pure white |
| Border | `border border-gray-200` | 1px solid #E5E7EB |
| Border Radius | `rounded-lg` | 0.5rem (8px) |
| Title Padding | `px-6 pt-5` | 24px left/right, 20px top |
| Title Font Size | `text-sm` | 14px |
| Title Font Weight | `font-semibold` | 600 |
| Title Colour | `text-gray-900` | #111827 |
| Content Padding | `pl-2 pr-2 pt-5 pb-4` | 8px left/right, 20px top, 16px bottom |
| Legend Padding | `pl-12 pr-6 pb-6 pt-2` | 48px left, 24px right, 24px bottom, 8px top |
| Legend Gap | `gap-5` | 20px between items |
| Legend Dot Size | `w-2 h-2` | 8px × 8px |
| Legend Dot Radius | `rounded-full` | Circular |
| Legend Text Size | `text-[11px]` | 11px |
| Legend Text Colour | `text-gray-400` | #9CA3AF |

### 3.2 ResponsiveContainer & Chart Dimensions

Charts use Recharts' `ResponsiveContainer` with fixed heights:

#### CashflowChart
```tsx
<ResponsiveContainer width="100%" height={260}>
  <BarChart data={data} margin={{ top: 20, right: 24, left: 0, bottom: 5 }}>
```
- **Height:** 260px
- **Margins:** top: 20, right: 24, left: 0, bottom: 5

#### NetWorthChart
```tsx
<ResponsiveContainer width="100%" height={260}>
  <ComposedChart data={netWorthData} margin={{ top: 20, right: 24, left: 0, bottom: 5 }}>
```
- **Height:** 260px
- **Margins:** top: 20, right: 24, left: 0, bottom: 5

#### PortfolioGrowthChart
```tsx
<ResponsiveContainer width="100%" height="100%">
  <LineChart data={data} margin={{ top: 30, right: 120, left: 14, bottom: 5 }}>
```
- **Height:** 100% (h-80 = 320px container)
- **Margins:** top: 30, right: 120, left: 14, bottom: 5
- **Note:** Larger right margin (120px) for end-state annotations

#### ChartWithRoadmap
```tsx
<ComposedChart
  width={chartWidth + Y_AXIS_WIDTH}
  height={276}
  data={chartData}
  margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
>
```
- **Height:** 276px (CHART_HEIGHT constant)
- **Margins:** top: 20, others: 0
- **Note:** Custom width calculation for responsive column layout

### 3.3 Grid Styling

**File:** `/src/constants/chartColors.ts` (CHART_STYLE.grid)

```javascript
grid: {
  strokeDasharray: '0',        // Solid, no dashes
  stroke: '#F1F3F5',           // Light grey
  strokeOpacity: 1,            // 100% opacity
  vertical: false,             // Horizontal lines only
}
```

Applied to all charts:
```tsx
<CartesianGrid {...CHART_STYLE.grid} vertical={false} horizontal={true} />
```

#### Grid Visual
- **Colour:** `#F1F3F5` (very light grey)
- **Pattern:** Solid horizontal lines only
- **Opacity:** 100%
- **Spacing:** Default Recharts spacing (5-10 lines based on data range)

### 3.4 X-Axis Styling

**File:** `/src/constants/chartColors.ts` (CHART_STYLE.xAxis)

```javascript
xAxis: {
  tick: {
    fontSize: 11,
    fill: '#9CA3AF',                    // Grey
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  axisLine: false,                      // No line below labels
  tickLine: false,                      // No tick marks
}
```

#### X-Axis Visual
| Property | Value |
|----------|-------|
| Label Font Size | 11px |
| Label Colour | `#9CA3AF` (grey) |
| Label Font | Inter, system-ui, sans-serif |
| Axis Line | Hidden (false) |
| Tick Marks | Hidden (false) |
| Data Key | Usually "year" for timeline, month/period labels |
| Padding | Varies (see specific chart) |

### 3.5 Y-Axis Styling

**File:** `/src/constants/chartColors.ts` (CHART_STYLE.yAxis) & individual charts

Default from CHART_STYLE:
```javascript
yAxis: {
  tick: {
    fontSize: 11,
    fill: '#9CA3AF',                    // Grey
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  axisLine: false,                      // No line
  tickLine: false,                      // No tick marks
  width: 55,                            // Default width
}
```

#### Y-Axis Overrides by Chart
| Chart | Width | Formatter | Notes |
|-------|-------|-----------|-------|
| ChartWithRoadmap | 80px | formatCurrency (e.g., "$1.2M") | Custom, handles large numbers |
| CashflowChart | 80px | formatYAxis with K suffix (e.g., "$50K") | Handles negative values |
| NetWorthChart | 80px | formatYAxis with M suffix (e.g., "$1.5M") | Millions format |
| PortfolioGrowthChart | 55px | formatYAxis with M suffix | Default width |

**Currency Formatters:**
```javascript
// ChartWithRoadmap
formatCurrency = (value: number): string => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

// CashflowChart / NetWorthChart
formatYAxis = (value: number) => {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (absValue >= 1000) return `${sign}$${absValue / 1000}K`;
  return `${sign}$${absValue}`;
};
```

### 3.6 Line Styling

All line charts use consistent stroke styling:

| Property | Value | Notes |
|----------|-------|-------|
| Type | `monotone` | Smooth curves |
| Stroke Width (primary) | `2` | Bold lines |
| Stroke Width (secondary) | `1.5` | Lighter secondary series |
| Stroke Width (dashed) | `1.5` | Dashed reference lines |
| Dot | `false` | No circle markers (except at goals) |
| Active Dot Radius | `6` | When hovering |
| Active Dot Stroke Width | `2` | Highlight circle |

**Example ChartWithRoadmap Portfolio Value line:**
```tsx
<Line
  type="monotone"
  dataKey="portfolioValue"
  name="Portfolio Value"
  stroke={CHART_COLORS.primary}        // #3B6CF4
  strokeWidth={2}
  dot={false}
  activeDot={{
    r: 6,
    stroke: CHART_COLORS.primary,
    strokeWidth: 2,
    fill: 'white',
  }}
/>
```

**Dashed reference line (Savings Only):**
```tsx
<Line
  type="monotone"
  dataKey="doNothingBalance"
  name="Savings Only"
  stroke={CHART_COLORS.annotationText}  // #9CA3AF
  strokeDasharray="6 4"                 // 6px dash, 4px gap
  strokeWidth={1.5}
  dot={false}
/>
```

### 3.7 Bar Chart Styling

**File:** CashflowChart.tsx

```tsx
<Bar dataKey="cashflow" fill={CHART_COLORS.barPositive} radius={[2, 2, 0, 0]}>
  {data.map((entry, index) => (
    <Cell
      key={`cell-${index}`}
      fill={entry.cashflow >= 0 ? CHART_COLORS.barPositive : CHART_COLORS.barNegative}
    />
  ))}
</Bar>
```

| Property | Value | Notes |
|----------|-------|-------|
| Default Fill | `rgba(59, 108, 244, 0.55)` | Blue for positive |
| Negative Fill | `rgba(163, 193, 250, 0.50)` | Light blue for negative |
| Border Radius | `[2, 2, 0, 0]` | Rounded top, square bottom |
| Conditional Colour | Per-cell based on value sign | Dynamic colouring |

### 3.8 Tooltip Styling

**File:** `/src/components/ui/chart.tsx` (ChartTooltipContent)

```tsx
<div
  className="grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl"
>
  {/* Tooltip content */}
</div>
```

#### Tooltip Container
| Property | Value | CSS |
|----------|-------|-----|
| Background | CSS Variable | `bg-background` |
| Border | 1px, 50% opacity | `border border-border/50` |
| Border Radius | 8px | `rounded-lg` |
| Padding | 10px × 10px | `px-2.5 py-1.5` |
| Font Size | 12px | `text-xs` |
| Shadow | Large shadow | `shadow-xl` |
| Min Width | 128px | `min-w-[8rem]` |
| Gap | 6px vertical | `gap-1.5` |

#### Tooltip Label Text
- **Font Weight:** Medium (500)
- **Font Size:** 12px

#### Tooltip Data Values
- **Font Weight:** Medium (500)
- **Font Family:** Monospace (tabular-nums for alignment)
- **Colour:** `text-foreground`

**Custom Tooltips Example (ChartWithRoadmap):**
```javascript
<div className="bg-white p-3 border border-gray-200 shadow-sm rounded-md">
  <p className="text-xs font-medium text-gray-900 mb-2">Year: {label}</p>
  <p className="text-xs text-teal-600">Portfolio: {formatCurrency(data?.portfolioValue)}</p>
  <p className="text-xs text-gray-500">Equity: {formatCurrency(data?.totalEquity)}</p>
</div>
```

### 3.9 Goal & Milestone Markers

#### Goal Achievement Dots
```tsx
<ReferenceDot
  x={equityGoalReached.year}
  y={equityGoalReached.totalEquity}
  r={8}                                 // Radius: 8px
  fill={CHART_COLORS.goalMarker}       // #3B6CF4 (blue)
  stroke="white"
  strokeWidth={2}
>
  <Label content={<GoalAchievedLabel />} />
</ReferenceDot>
```

| Property | Value | Notes |
|----------|-------|-------|
| Radius | 8px | Goal achievement marker size |
| Fill | `#3B6CF4` | Blue (goalMarker colour) |
| Stroke | `white` | 2px white border |
| Label | Custom component | Often empty (just shows dot) |

#### Goal Reference Lines
```tsx
<ReferenceLine
  y={profile.equityGoal}
  stroke={CHART_COLORS.goal}           // #6B9CF7
  strokeDasharray="5 5"                // 5px dash, 5px gap
  strokeWidth={1.5}
>
  <Label content={<GoalLineLabel />} />
</ReferenceLine>
```

| Property | Value | Notes |
|----------|-------|-------|
| Stroke | `#6B9CF7` | Secondary blue |
| Pattern | `5 5` | 5px dash, 5px gap |
| Stroke Width | 1.5px | Medium weight |
| Label | Positioned right/top | "Equity Goal: $X.XM" |

### 3.10 Legend Styling

**Used in:** PortfolioGrowthChart.tsx, ChartCard.tsx

```tsx
<Legend
  verticalAlign="top"
  height={36}
  iconType="line"
  formatter={(value) => (
    <span className="text-xs text-gray-600">{value}</span>
  )}
/>
```

| Property | Value |
|----------|-------|
| Vertical Align | top (top of chart) |
| Height | 36px |
| Icon Type | line (line icons, not dots) |
| Label Font Size | 12px (xs) |
| Label Colour | `text-gray-600` (#4B5563) |

**ChartCard Legend Items:**
```tsx
<div className="flex items-center gap-1.5">
  <div
    className="w-2 h-2 rounded-full flex-shrink-0"
    style={{ backgroundColor: item.color }}
  />
  <span className="text-[11px] text-gray-400">{item.label}</span>
</div>
```

| Property | Value |
|----------|-------|
| Dot Size | 8px × 8px (w-2 h-2) |
| Dot Shape | Circle (rounded-full) |
| Gap | 6px (gap-1.5) |
| Label Font Size | 11px |
| Label Colour | `#9CA3AF` (grey) |

### 3.11 Phase Background Areas (ChartWithRoadmap)

```tsx
<ReferenceArea
  x1={phase.startYear}
  x2={phase.endYear}
  fill="transparent"
  fillOpacity={0}
  stroke="none"
  label={{
    value: phase.label,                 // "Accumulation" or "Consolidation"
    position: 'insideTopLeft',
    fontSize: 9,
    fill: '#D1D5DB',                    // Light grey
    fontWeight: 400
  }}
/>
```

**Accumulation Phase:**
```javascript
{
  label: 'Accumulation',
  startYear: firstYear,
  endYear: lastPurchaseYear,
  fill: 'rgba(59, 130, 246, 0.03)',   // Very light blue
}
```

**Consolidation Phase:**
```javascript
{
  label: 'Consolidation',
  startYear: lastPurchaseYear,
  endYear: finalYear,
  fill: 'rgba(34, 197, 94, 0.03)',    // Very light green
}
```

| Property | Value | Notes |
|----------|-------|-------|
| Fill Opacity | 0% (transparent) | No visible background |
| Stroke | none | No border |
| Label Font Size | 9px | Small, subtle |
| Label Colour | `#D1D5DB` | Light grey |
| Label Font Weight | 400 | Normal |
| Label Position | insideTopLeft | Top-left corner of phase |

---

## 4. Responsive Containers & Layout

### 4.1 ChartWithRoadmap Layout

**File:** ChartWithRoadmap.tsx (lines 42-48)

Complex custom layout with horizontal scrolling and dynamic column widths:

```javascript
// Constants
const LABEL_COLUMN_WIDTH = 80;          // Left label column
const MIN_YEAR_COLUMN_WIDTH = 50;       // Minimum readable width
const MAX_YEAR_COLUMN_WIDTH = 120;      // Maximum comfortable width
const Y_AXIS_WIDTH = 80;                // Must equal LABEL_COLUMN_WIDTH
const CHART_HEIGHT = 276;               // Total chart height

// Column width calculation
const availableWidth = containerWidth - LABEL_COLUMN_WIDTH;
const calculatedColumnWidth = availableWidth / yearCount;
const yearColumnWidth = Math.max(
  MIN_YEAR_COLUMN_WIDTH,
  Math.min(MAX_YEAR_COLUMN_WIDTH, calculatedColumnWidth)
);

// Grid layout
const gridStyle = {
  display: 'grid',
  gridTemplateColumns: `${LABEL_COLUMN_WIDTH}px repeat(${yearCount}, ${yearColumnWidth}px)`,
};
```

#### Visual Hierarchy
1. **Label column** (80px) - Property titles, row labels
2. **Chart area** (dynamic width) - Recharts ComposedChart
3. **Y-axis** (80px, inside chart) - Currency labels
4. **Year columns** (50-120px each) - One per timeline year

#### Scrolling Behaviour
- Horizontal scroll if total width exceeds container
- Auto-scrolls to show final year
- ResizeObserver watches container width changes

### 4.2 Other Chart Containers

All other charts use standard `ResponsiveContainer`:
```tsx
<ResponsiveContainer width="100%" height={260}>
  <ChartComponent>
    {/* content */}
  </ChartComponent>
</ResponsiveContainer>
```

These automatically adapt to parent width and have fixed heights.

---

## 5. Font Sizes & Weights (Chart Context)

### 5.1 Chart-Specific Typography

| Element | Font Size | Weight | Colour | File |
|---------|-----------|--------|--------|------|
| X-Axis Labels | 11px | 400 | `#9CA3AF` | CHART_STYLE |
| Y-Axis Labels | 11px | 400 | `#9CA3AF` | CHART_STYLE |
| Tooltip Text | 12px | 400 | `#111827` | ChartTooltipContent |
| Tooltip Label | 12px | 500 | `#111827` | ChartTooltipContent |
| Legend Labels | 12px | 400 | `#4B5563` | PortfolioGrowthChart |
| ChartCard Legend | 11px | 400 | `#9CA3AF` | ChartCard |
| ChartCard Title | 14px | 600 | `#111827` | ChartCard |
| Annotation Labels | 9-12px | 400-500 | `#9CA3AF` | Various |
| Phase Labels | 9px | 400 | `#D1D5DB` | ChartWithRoadmap |

### 5.2 App-Wide Typography System

**File:** `/src/index.css` (lines 129-225)

The design system defines 7 canonical typography tokens used throughout the app:

| Token | Font Size | Weight | Colour | Usage |
|-------|-----------|--------|--------|-------|
| `.page-title` | 24px | 700 | #111827 | Main page headings |
| `.section-heading` | 14px | 600 | #374151 | Card titles, section headers |
| `.stat-number` | 32px | 700 | #111827 | Large KPI numbers |
| `.metric-label` | 12px | 500 | #6B7280 | Labels above metrics |
| `.body-dark` | 14px | 400 | #111827 | Primary body text |
| `.body-secondary` | 14px | 400 | #6B7280 | Secondary text |
| `.meta` | 12px | 400 | #9CA3AF | Timestamps, axis labels, footnotes |

---

## 6. Shared Chart Components & Utilities

### 6.1 ChartContainer & ChartTooltipContent

**File:** `/src/components/ui/chart.tsx`

Shadcn Chart components providing:
- Theme-aware colour rendering
- Responsive container management
- Standardized tooltip UI
- Legend formatting

**Key Classes:**
```tsx
<ChartContainer config={chartConfig}>
  <ResponsiveContainer>
    {/* Recharts component */}
  </ResponsiveContainer>
</ChartContainer>
```

### 6.2 Custom Tooltip Components

Each chart implements its own custom `<Tooltip />` component for specific data formatting:

| Chart | File | Custom Tooltip |
|-------|------|-----------------|
| ChartWithRoadmap | Line 145-184 | `createCustomTooltip()` factory function |
| CashflowChart | Line 43-62 | Inline `CustomTooltip` component |
| NetWorthChart | Line 22-40 | `NetWorthTooltip` component |
| PortfolioGrowthChart | Line 35-56 | Inline `CustomTooltip` component |

### 6.3 Format Utility Functions

Located inline in charts (no shared utility file):

```javascript
// ChartWithRoadmap
formatCurrency(value) → "$1.2M" | "$500K" | "$1000"
formatCompactCurrency(value) → "$1M" | "$500k" (with negative sign)

// CashflowChart
formatYAxis(value) → "-$50K" | "$100K"

// NetWorthChart
formatK(value) → "$1.5M" | "$500k" | "$100"

// PortfolioGrowthChart
formatYAxis(value) → "$1.5M"
```

### 6.4 Custom Dot Components (Property Icons)

**ChartWithRoadmap:**
- `CustomDot` (line 194-234) - Property markers on the chart
- `DraggablePropertyIcon` (line 247-322) - Drag-and-drop property icons

**PortfolioGrowthChart:**
- `CustomizedDot` (line 59-100) - Property icons with vertical stacking

All use:
- 34px or 20px circles
- `bg-white rounded-full` wrapper
- `border border-gray-200` (grey) or `border-red-300` (violations)
- Property type icon inside (from `getPropertyTypeIcon()`)

### 6.5 Reference Elements

**ReferenceDot** (goal achievement):
- Radius: 8px
- Fill: `#3B6CF4` (goalMarker)
- Stroke: white, 2px

**ReferenceLine** (phase boundaries, goal lines):
- Stroke: `#6B9CF7` (goal) or `#9CA3AF` (reference)
- Pattern: `5 5` or `6 4` dashes
- Stroke Width: 1.5px

---

## 7. Tailwind CSS Variables & Theme

### 7.1 CSS Variables (Root Theme)

**File:** `/src/index.css` (lines 9-55)

Light mode (`:root`):
```css
--background: 210 20% 98%;              /* #F9FAFB - very light grey */
--foreground: 222.2 84% 4.9%;           /* Near black */
--card: 0 0% 100%;                      /* Pure white */
--card-foreground: 222.2 84% 4.9%;
--primary: 222.2 47.4% 11.2%;           /* Dark blue-grey */
--primary-foreground: 210 40% 98%;      /* Light */
--secondary: 210 40% 95%;               /* Very light grey */
--secondary-foreground: 222.2 47.4% 11.2%;
--muted: 210 40% 95%;                   /* Light grey */
--muted-foreground: 215.4 16.3% 46.9%;  /* Medium grey */
--accent: 210 40% 95%;                  /* Light grey */
--accent-foreground: 222.2 47.4% 11.2%;
--destructive: 0 84.2% 60.2%;           /* Red */
--destructive-foreground: 210 40% 98%;
--border: 214.3 31.8% 91.4%;            /* Light grey */
--input: 214.3 31.8% 91.4%;
--ring: 222.2 84% 4.9%;
--radius: 0.5rem;                       /* 8px */
```

Dark mode (`.dark`):
```css
--background: 222.2 84% 4.9%;           /* Very dark */
--foreground: 210 40% 98%;              /* Very light */
--card: 222.2 84% 4.9%;
--card-foreground: 210 40% 98%;
--border: 217.2 32.6% 17.5%;            /* Dark grey */
```

### 7.2 Brand Colours

**File:** tailwind.config.ts (line 62-65)

```javascript
brand: {
  primary: "var(--brand-primary, #2563EB)",    // Default blue
  secondary: "var(--brand-secondary, #6366f1)", // Indigo
}
```

### 7.3 Additional Custom Colours

```javascript
offwhite: '#fafafa',      // Off-white background
charcoal: '#1a1a1a',      // Very dark text
```

### 7.4 Border Radius

All chart cards use Tailwind's radius system:
```javascript
borderRadius: {
  lg: "var(--radius)",              /* 8px (0.5rem) */
  md: "calc(var(--radius) - 2px)",  /* 6px */
  sm: "calc(var(--radius) - 4px)",  /* 4px */
}
```

**Applied:** `rounded-lg` on all ChartCard wrappers

---

## 8. Component API & Props

### 8.1 ChartCard Component

**File:** `/src/components/ui/ChartCard.tsx`

```typescript
interface ChartCardProps {
  title: string;                    // Card heading
  action?: React.ReactNode;         // Optional action button/icon (top-right)
  legend?: LegendItem[];           // Optional legend items
  contentClassName?: string;        // Override content padding
  children: React.ReactNode;        // Chart content (Recharts component)
}

interface LegendItem {
  color: string;                    // Hex colour for dot
  label: string;                    // Legend item text
}
```

**Usage Example:**
```tsx
<ChartCard
  title="Portfolio Growth"
  legend={[
    { color: '#3B6CF4', label: 'Portfolio Value' },
    { color: '#6B9CF7', label: 'Equity' }
  ]}
>
  <ResponsiveContainer width="100%" height={260}>
    <LineChart data={data}>
      {/* chart elements */}
    </LineChart>
  </ResponsiveContainer>
</ChartCard>
```

### 8.2 ChartContainer (Shadcn)

**File:** `/src/components/ui/chart.tsx`

```typescript
interface ChartConfig {
  [key: string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    { color?: string; theme?: never } |
    { color?: never; theme: Record<'light' | 'dark', string> }
  );
}

<ChartContainer config={config}>
  <ResponsiveContainer>
    {/* Recharts children */}
  </ResponsiveContainer>
</ChartContainer>
```

**Config Example:**
```typescript
const config: ChartConfig = {
  portfolioValue: {
    label: "Portfolio Value",
    color: "#3B6CF4",
  },
  equity: {
    label: "Equity",
    color: "#6B9CF7",
  },
};
```

---

## 9. Animation & Interaction

### 9.1 Hover Effects

**Chart Elements:**
- **Active Dot on hover:** Radius increases to 6px, white fill
- **Property Icons on hover:** `scale-110`, `shadow-md`, smooth transition (150ms)
- **Legend items on hover:** No explicit hover state in current design
- **Card on hover:** No explicit hover state (cards are static)

**CSS Classes:**
```tailwind
.hover:scale-110          /* 110% scale */
.hover:shadow-md          /* Medium shadow */
.transition-all           /* Smooth all properties */
.duration-150             /* 150ms timing */
```

### 9.2 Animations

**Recharts Animations:**
- Line/Bar charts: Default Recharts easing (ease-in-out, ~400ms)
- Property icons: `isAnimationActive={false}` in most custom dot components

**Drag-and-Drop Feedback (ChartWithRoadmap):**
```javascript
// Droppable column highlights on drag
backgroundColor: isOver && isValid ? 'rgba(34, 197, 94, 0.15)' : 'transparent';
borderColor: isOver && isValid ? '#22c55e' : 'transparent';
transition: 'all 150ms ease-in-out';
```

Green highlight for valid drops, red for invalid.

---

## 10. Data-Driven Styling Examples

### 10.1 Conditional Bar Colours (CashflowChart)

```tsx
{data.map((entry, index) => (
  <Cell
    key={`cell-${index}`}
    fill={entry.cashflow >= 0
      ? CHART_COLORS.barPositive      // Blue for positive
      : CHART_COLORS.barNegative}     // Light blue for negative
  />
))}
```

### 10.2 Conditional Property Icon Borders (ChartWithRoadmap)

```javascript
const borderColor = hasViolations
  ? '#ef4444'                          // Red for constraint violations
  : CHART_COLORS.annotationText;       // Grey for valid
const borderWidth = hasViolations ? 2 : 1;
```

### 10.3 Multi-series Colour Assignment

```javascript
const colours = CHART_COLORS.series; // Array of 6 blue shades
data.series.forEach((series, i) => {
  series.stroke = colours[i % colours.length];
});
```

---

## 11. Common Patterns & Best Practices

### 11.1 When Creating a New Chart

1. **Wrap in ChartCard:**
   ```tsx
   <ChartCard title="Your Chart Title">
     <ResponsiveContainer width="100%" height={260}>
       {/* Your chart */}
     </ResponsiveContainer>
   </ChartCard>
   ```

2. **Use CHART_STYLE for grid, axes:**
   ```tsx
   <CartesianGrid {...CHART_STYLE.grid} />
   <XAxis {...CHART_STYLE.xAxis} />
   <YAxis {...CHART_STYLE.yAxis} width={80} />
   ```

3. **Use CHART_COLORS for line/bar colours:**
   ```tsx
   <Line stroke={CHART_COLORS.primary} strokeWidth={2} />
   <Bar fill={CHART_COLORS.barPositive} />
   ```

4. **Create custom tooltip for data formatting:**
   ```tsx
   const CustomTooltip = ({ active, payload, label }) => {
     if (!active || !payload?.length) return null;
     return (
       <div className="bg-white p-3 border border-gray-200 shadow-sm rounded-lg">
         <p className="text-xs font-medium text-gray-900">{label}</p>
         <p className="text-xs text-gray-600">{payload[0].value}</p>
       </div>
     );
   };
   <Tooltip content={<CustomTooltip />} />
   ```

5. **For large numbers, use M/K suffixes:**
   ```typescript
   const format = (v: number) => {
     if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
     if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
     return `$${v}`;
   };
   <YAxis tickFormatter={format} />
   ```

6. **All heights fixed (no %height):**
   - CashflowChart: 260px
   - NetWorthChart: 260px
   - PortfolioGrowthChart: 320px (h-80 container)
   - ChartWithRoadmap: 276px

### 11.2 Accessibility Considerations

- **Contrast:** All text colours meet WCAG AA standards
- **Axis Labels:** Always visible, never hidden
- **Tooltips:** Appear on hover, include formatted values
- **Colours:** All blue palette reduces colour-blindness issues
- **Icons:** Used with text labels, not alone for critical info

### 11.3 Performance Notes

- `dot={false}` on lines to reduce DOM nodes
- Custom `CustomizedDot` components for sparse icons only
- ResizeObserver in ChartWithRoadmap for responsive updates
- Memoized calculations (`useMemo`) for chart data transforms

---

## 12. Dark Mode Considerations

The app supports dark mode (`.dark` class on root), but current charts use **light-only styling**.

To add dark mode support to a new chart:
1. Use CSS variables from theme (`var(--foreground)`, `var(--border)`, etc.)
2. Create separate colour mappings for dark mode
3. Test with `.dark` class applied

Example:
```tsx
<CartesianGrid
  stroke={isDarkMode ? '#2D3748' : '#F1F3F5'}
  strokeOpacity={isDarkMode ? 0.5 : 1}
/>
```

---

## 13. Testing & Validation

### 13.1 Visual Regression Testing
- All chart dimensions are fixed (no % heights)
- Tailwind classes should never change responsive behaviour for charts
- Test at 1440px, 1920px, 2560px widths

### 13.2 Data Validation
- Empty state: Show "Add properties to see projection" message
- NaN values: Filter from data before rendering
- Negative values: Format with minus sign
- Large numbers: Always use M/K formatting

### 13.3 Accessibility Testing
- Tab order through interactive elements
- Tooltip content readable by screen readers
- Colour alone doesn't convey meaning (use labels)

---

## File Reference Guide

| File | Purpose | Contains |
|------|---------|----------|
| `/src/constants/chartColors.ts` | Colour palette & style objects | CHART_COLORS, CHART_STYLE, CHART_GRADIENTS |
| `/src/components/ui/chart.tsx` | Shadcn chart wrapper components | ChartContainer, ChartTooltipContent, ChartLegendContent |
| `/src/components/ui/ChartCard.tsx` | Card container for charts | ChartCard component, border/padding values |
| `/src/components/ChartWithRoadmap.tsx` | Complex roadmap chart | Layout patterns, custom dots, responsive sizing |
| `/src/components/CashflowChart.tsx` | Bar chart for cashflow | BarChart usage, conditional cell colouring |
| `/src/components/NetWorthChart.tsx` | Multi-line net worth chart | NW_COLORS palette (non-blue override) |
| `/src/components/PortfolioGrowthChart.tsx` | Line chart with legend | Legend styling, property icons, goal markers |
| `/src/index.css` | Global typography & theming | CSS variables, typography tokens, animations |
| `/tailwind.config.ts` | Tailwind configuration | colour mappings, brand colours, custom utilities |

---

## Glossary

- **CHART_COLORS:** Central colour palette (blues, greys)
- **CHART_STYLE:** Recharts component style props (grid, axes, lines)
- **ChartCard:** Wrapper component with title, border, legend
- **ResponsiveContainer:** Recharts wrapper for responsive sizing
- **ComposedChart:** Recharts component supporting multiple series types
- **ReferenceDot:** Single point marker (goal achievement)
- **ReferenceLine:** Full-height or full-width line (goal, phase boundary)
- **ReferenceArea:** Shaded region (phase background)
- **YAxis domain:** Min/max range for the Y-axis
- **Active Dot:** Recharts element shown on hover

---

## Last Updated

This documentation was created and last verified on **March 15, 2026**.

For questions or updates, refer to:
- Chart components: `/src/components/`
- Colours: `/src/constants/chartColors.ts`
- Typography: `/src/index.css`
- Tailwind config: `/tailwind.config.ts`
