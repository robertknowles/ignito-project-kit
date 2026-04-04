# PropPath Chart Components — Visual & Implementation Map

**Last Updated:** March 15, 2026

---

## Chart Components Overview

### 1. ChartWithRoadmap (Complex)

**File:** `/src/components/ChartWithRoadmap.tsx`

**Purpose:** Multi-year investment timeline with interactive property placement

**Recharts Type:** `ComposedChart` (multiple series + overlay elements)

**Dimensions:**
- Height: 276px (CHART_HEIGHT)
- Width: Dynamic (responsive columns, 50-120px each)
- Margins: top: 20, right: 0, left: 0, bottom: 0

**Series Rendered:**
1. **Portfolio Value Line** (primary blue) — `#3B6CF4`, strokeWidth: 2
2. **Total Equity Line** (secondary blue) — `#6B9CF7`, strokeWidth: 1.5
3. **Savings Only (Do-Nothing)** (dashed grey) — `#9CA3AF`, strokeDasharray: "6 4"

**Interactive Elements:**
- Property icons (draggable, 34px circles)
- Year column drop zones (validation highlighting)
- Goal achievement marker (8px blue dot at equity target)
- Refinance trigger dots (5px amber markers)
- Phase labels (Accumulation/Consolidation in light text)

**Special Features:**
- Custom property dot component with warning/check indicators
- Drag-and-drop with green/red validation feedback
- Phase background areas (transparent but labelled)
- Grid overlay for column-based layout alignment
- Horizontal scrolling for multi-year views

**Tooltip Content:**
```
Year: [YYYY]
Portfolio: [currency]
Equity: [currency]
Savings Only: [currency] (if applicable)
[Property names if purchased this year]
[Refinance-ready properties if applicable]
```

**Colour Scheme:**
- Primary lines: `#3B6CF4` (blue)
- Secondary lines: `#6B9CF7` (blue)
- Dashed baseline: `#9CA3AF` (grey)
- Goal marker: `#3B6CF4` (blue)
- Refinance dots: outer `#6B9CF7`, centre `#3B6CF4`
- Valid drop zone: `rgba(34, 197, 94, 0.15)` (green tint)
- Invalid drop zone: `rgba(239, 68, 68, 0.15)` (red tint)
- Grid: `#F1F3F5` (light grey)
- Axis text: `#9CA3AF` (grey)

---

### 2. CashflowChart (Simple)

**File:** `/src/components/CashflowChart.tsx`

**Purpose:** Annual net cashflow visualization with income goal marker

**Recharts Type:** `BarChart`

**Dimensions:**
- Height: 260px
- Margins: top: 20, right: 24, left: 0, bottom: 5

**Series Rendered:**
1. **Net Cashflow Bars** (conditional colouring)
   - Positive values: `rgba(59, 108, 244, 0.55)` (blue, 55% opacity)
   - Negative values: `rgba(163, 193, 250, 0.50)` (light blue, 50% opacity)
   - Border radius: [2, 2, 0, 0] (rounded tops only)

**Interactive Elements:**
- Income goal marker (8px blue dot when target reached)
- Y-axis dynamic domain (rounds to nice intervals: 10K, 20K, 50K, 100K)

**Tooltip Content:**
```
Year: [YYYY]
Net Cashflow: [±currency]
```

**Colour Scheme:**
- Positive bars: `#3B6CF4` (55% blue)
- Negative bars: `#A3C1FA` (50% light blue)
- Goal dot: `#3B6CF4` (blue)
- Goal line: none (only dot shown)
- Grid: `#F1F3F5`
- Axis text: `#9CA3AF`

---

### 3. NetWorthChart (Simple)

**File:** `/src/components/NetWorthChart.tsx`

**Purpose:** Total assets, debt, and net worth progression

**Recharts Type:** `ComposedChart` (3 lines)

**Dimensions:**
- Height: 260px
- Margins: top: 20, right: 24, left: 0, bottom: 5

**Series Rendered:**
1. **Total Assets Line** (blue) — `#3B82F6`, strokeWidth: 1.5
2. **Total Debt Line** (aqua) — `#22D3EE`, strokeWidth: 1.5
3. **Net Worth Line** (purple) — `#8B5CF6`, strokeWidth: 2 (bold)

**Special Notes:**
- **EXCEPTION:** Uses custom NW_COLORS palette (not CHART_COLORS)
- This is the ONLY chart with non-blue colours
- No interactive elements beyond hover tooltip

**Tooltip Content:**
```
Year: [YYYY]
Total Assets: [currency]
Total Debt: [currency]
Net Worth: [currency]  (bold, purple text)
```

**Colour Scheme:**
- Total Assets: `#3B82F6` (pure blue)
- Total Debt: `#22D3EE` (cyan/aqua)
- Net Worth: `#8B5CF6` (purple)
- Grid: `#F1F3F5`
- Axis text: `#9CA3AF`

---

### 4. PortfolioGrowthChart (Moderate)

**File:** `/src/components/PortfolioGrowthChart.tsx`

**Purpose:** Portfolio value and equity growth with property icons and legend

**Recharts Type:** `LineChart` (2 lines + legend)

**Dimensions:**
- Height: 320px (h-80 container)
- Margins: top: 30, right: 120, left: 14, bottom: 5
- Extra right margin for end-state annotations

**Series Rendered:**
1. **Portfolio Value Line** (primary blue) — `#3B6CF4`, strokeWidth: 2
2. **Equity Line** (secondary blue) — `#6B9CF7`, strokeWidth: 2

**Interactive Elements:**
- Legend (top, line icons, custom formatter)
- Property icons at purchase points (20px circles, stacked if multiple in same year)
- Goal achievement marker (8px blue dot)
- Equity goal reference line (dashed, `#6B9CF7`)
- End-state annotation (right side shows final portfolio/equity values)

**Tooltip Content:**
```
Year: [YYYY]
Portfolio Value: $[X]M
Equity: $[X]M
Properties Purchased:
  • [Property Name]
  • [Property Name]
```

**Colour Scheme:**
- Portfolio line: `#3B6CF4` (blue)
- Equity line: `#6B9CF7` (blue)
- Goal line: `#6B9CF7` (dashed, 5px dash)
- Goal marker: `#3B6CF4` (blue dot)
- Property icons: `text-gray-500` (grey icons in white circles)
- Legend text: `text-gray-600`
- Grid: `#F1F3F5`
- Axis text: `#9CA3AF`
- Annotation text: `#9CA3AF`

---

## Card Container Wrapper

**File:** `/src/components/ui/ChartCard.tsx`

All charts are typically wrapped in this container:

```tsx
<ChartCard title="Chart Title" legend={[...]}>
  {/* Recharts component here */}
</ChartCard>
```

**Visual Structure:**
```
┌─────────────────────────────────────────┐
│ "Chart Title"                    [Action]│  ← px-6 pt-5
├─────────────────────────────────────────┤
│                                         │
│  [Chart Content Here]                   │  ← pl-2 pr-2 pt-5 pb-4
│                                         │
├─────────────────────────────────────────┤
│ [Legend Dot] Label  [Legend Dot] Label  │  ← pl-12 pr-6 pb-6 pt-2
└─────────────────────────────────────────┘
```

**Styling:**
- Background: white
- Border: 1px solid `#E5E7EB` (grey-200)
- Border Radius: 8px (rounded-lg)
- Shadow: None (ElevenLabs clean aesthetic)

---

## Colour Reference Sheet

### Core Palette (All Blues)

| Name | Hex | Use Case |
|------|-----|----------|
| Primary Blue | `#3B6CF4` | Main lines, primary bars, goal markers |
| Secondary Blue | `#6B9CF7` | Equity lines, goal reference, secondary series |
| Light Blue | `#A3C1FA` | Debt/negative values, background series |
| Dark Blue | `#1E4FD0` | Multi-series depth (6-colour rotation) |

### Exception Palette (NetWorthChart Only)

| Name | Hex | Use Case |
|------|-----|----------|
| Assets Blue | `#3B82F6` | Total Assets line |
| Net Worth Purple | `#8B5CF6` | Net Worth line (main) |
| Debt Cyan | `#22D3EE` | Total Debt line |

### Chrome & UI Colours

| Name | Hex | Use Case |
|------|-----|----------|
| Grid Grey | `#F1F3F5` | Horizontal grid lines only |
| Label Grey | `#9CA3AF` | Axis labels, annotations, legend text |
| Border Grey | `#CBD5E1` | Reference lines, borders |
| White | `#FFFFFF` | Card backgrounds, dot strokes |

---

## Dimension Quick Reference

| Component | Height | Width | Margins | Notes |
|-----------|--------|-------|---------|-------|
| ChartWithRoadmap | 276px | Dynamic | T:20, R:0, L:0, B:0 | Responsive columns |
| CashflowChart | 260px | 100% | T:20, R:24, L:0, B:5 | ResponsiveContainer |
| NetWorthChart | 260px | 100% | T:20, R:24, L:0, B:5 | ResponsiveContainer |
| PortfolioGrowthChart | 320px | 100% | T:30, R:120, L:14, B:5 | Large right margin for annotations |

---

## Typography in Charts

| Element | Font Size | Weight | Colour |
|---------|-----------|--------|--------|
| Card Title | 14px | 600 | `#111827` |
| X-Axis Label | 11px | 400 | `#9CA3AF` |
| Y-Axis Label | 11px | 400 | `#9CA3AF` |
| Tooltip Text | 12px | 400 | `#111827` |
| Tooltip Label | 12px | 500 | `#111827` |
| Legend Label | 12px | 400 | `#4B5563` |
| Phase Label | 9px | 400 | `#D1D5DB` |

---

## Stroke & Line Styling

| Element | Width | Style | Notes |
|---------|-------|-------|-------|
| Primary Line | 2px | Solid | Main series, goal lines |
| Secondary Line | 1.5px | Solid | Secondary series |
| Reference Line | 1.5px | Dashed (5 5) | Goal lines |
| Savings Baseline | 1.5px | Dashed (6 4) | Do-nothing comparison |
| Bar Radius | [2,2,0,0] | Rounded top only | CashflowChart bars |
| Goal Dot Stroke | 2px | Solid white | Around 8px blue marker |

---

## Interaction Patterns

### Hover Effects
- **Lines:** Active dot grows to r=6, white fill
- **Property Icons:** Scale to 110%, shadow increases
- **Bars:** Native Recharts active state (subtle highlight)
- **Tooltips:** Appear with smooth fade, include formatted values

### Validation Feedback (ChartWithRoadmap)
- **Valid placement:** Green highlight (rgba(34, 197, 94, 0.15))
- **Invalid placement:** Red highlight (rgba(239, 68, 68, 0.15))
- **Drag active:** Subtle grey background on all columns

### Animations
- Most animations are implicit Recharts defaults (~400ms ease)
- Custom dot components: `isAnimationActive={false}` for performance
- Property icons: Smooth transitions on scale/shadow (150ms)

---

## Data Format Examples

### ChartWithRoadmap Data Structure
```javascript
{
  year: 2025,
  portfolioValue: 500000,
  totalEquity: 100000,
  doNothingBalance: 50000,
  purchaseInYear: true,
  purchaseDetails: [
    { propertyTitle: 'House A', instanceId: 'uuid-1' },
    { propertyTitle: 'Apartment B', instanceId: 'uuid-2' }
  ]
}
```

### CashflowChart Data Structure
```javascript
{
  year: '2025',
  cashflow: 15000,
  rentalIncome: 50000,
  expenses: 25000,
  loanRepayments: 10000
}
```

### NetWorthChart Data Structure
```javascript
{
  year: '2025',
  totalAssets: 1000000,
  totalDebt: 600000,
  netWorth: 400000
}
```

### PortfolioGrowthChart Data Structure
```javascript
{
  year: '2025',
  portfolioValue: 1000000,
  equity: 300000,
  properties: ['House A', 'Apartment B']
}
```

---

## File Locations (Complete)

| Component | File | Lines | Recharts Type | Complexity |
|-----------|------|-------|---------------|-----------|
| ChartCard (wrapper) | `/src/components/ui/ChartCard.tsx` | 1-47 | Container | Simple |
| ChartContainer (shadcn) | `/src/components/ui/chart.tsx` | 1-304 | Wrapper | Moderate |
| ChartWithRoadmap | `/src/components/ChartWithRoadmap.tsx` | 1-1100 | ComposedChart | Complex |
| CashflowChart | `/src/components/CashflowChart.tsx` | 1-170 | BarChart | Simple |
| NetWorthChart | `/src/components/NetWorthChart.tsx` | 1-98 | ComposedChart | Simple |
| PortfolioGrowthChart | `/src/components/PortfolioGrowthChart.tsx` | 1-288 | LineChart | Moderate |
| Chart Colours | `/src/constants/chartColors.ts` | 1-160 | Constants | — |

---

## Recharts Library Details

- **Version:** 2.15.4 (from package.json)
- **Responsive Container:** Wraps chart, sets width/height
- **Margin System:** All 4 sides (top, right, bottom, left) in pixels
- **Grid:** Horizontal lines by default, vertical optional
- **Tooltips:** Custom React components with any HTML/styling
- **Legends:** Can be positioned top/bottom/left/right
- **Reference Elements:** Dots, Lines, Areas for annotations
- **Active State:** Automatic on hover (dot highlights)

---

## Common Mistakes to Avoid

1. ❌ **Mixing colour palettes** — Only NetWorthChart uses non-blue colours
2. ❌ **Using % heights on charts** — Always use fixed pixels
3. ❌ **Forgetting CHART_STYLE imports** — Grid & axes should use this object
4. ❌ **Large number formatting** — Always use M/K suffixes for readability
5. ❌ **Missing Y-axis width** — Set to 80px for consistency
6. ❌ **Adding dots to all lines** — Use dot={false} for performance
7. ❌ **Over-complex custom tooltips** — Keep formatting simple, 3-4 lines max
8. ❌ **Visible axis/tick lines** — Always set axisLine={false}, tickLine={false}

---

## Testing Checklist

- [ ] Chart renders without data (empty state message shown)
- [ ] Chart renders with sample data (all series visible)
- [ ] Hover tooltip appears and displays formatted values
- [ ] Y-axis domain scales correctly (min/max adjusted for data range)
- [ ] Grid lines are light grey, horizontal only
- [ ] Card title is visible and properly styled
- [ ] Legend items display with coloured dots
- [ ] Responsive container fills parent width
- [ ] Chart height is fixed (no stretching)
- [ ] No console errors or React warnings

---

## Quick Copy-Paste Blocks

### Import Everything Needed
```tsx
import { CHART_COLORS, CHART_STYLE } from '@/constants/chartColors';
import { ChartCard } from '@/components/ui/ChartCard';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
```

### Typical Tooltip
```tsx
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white p-3 border border-gray-200 shadow-sm rounded-lg">
      <p className="text-xs font-medium text-gray-900">{label}</p>
      <p className="text-xs text-gray-600">${payload[0].value.toLocaleString()}</p>
    </div>
  );
};
```

### Typical Line
```tsx
<Line
  type="monotone"
  dataKey="value"
  stroke={CHART_COLORS.primary}
  strokeWidth={2}
  dot={false}
  activeDot={{ r: 6, stroke: CHART_COLORS.primary, strokeWidth: 2, fill: 'white' }}
/>
```

### Typical Bar
```tsx
<Bar dataKey="value" fill={CHART_COLORS.barPositive} radius={[2, 2, 0, 0]}>
  {data.map((entry, i) => (
    <Cell key={i} fill={entry.value >= 0 ? CHART_COLORS.barPositive : CHART_COLORS.barNegative} />
  ))}
</Bar>
```

---

## Glossary

- **ResponsiveContainer:** Recharts wrapper that makes chart responsive to parent width
- **ComposedChart:** Recharts chart supporting multiple series types (lines, bars, areas)
- **CartesianGrid:** Recharts grid background (lines)
- **ReferenceDot:** Single point annotation (e.g., goal marker)
- **ReferenceLine:** Full-height/width line annotation (e.g., goal threshold)
- **ReferenceArea:** Shaded region between x1-x2 or y1-y2
- **Cell:** Individual bar colouring in BarChart
- **Tooltip:** Interactive hover popup
- **Legend:** Series name/colour key
- **Active Dot:** Visual highlight when hovering over data point

---

**End of Chart Component Map**

For detailed colour codes, styling specifics, and implementation details, refer to:
- `/DESIGN-SYSTEM-CHARTS.md` (comprehensive reference)
- `/CHART-COLORS-QUICK-REF.ts` (copy-paste values)
