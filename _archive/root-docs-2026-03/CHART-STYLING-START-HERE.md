# Chart Styling Documentation — START HERE

**Created:** March 15, 2026
**Last Updated:** March 15, 2026

This is your entry point for understanding PropPath's dashboard chart styling. All exact values, hex codes, and pixel dimensions have been extracted from the codebase and documented.

---

## What This Documentation Covers

### ✅ What You'll Find
1. **Exact colour palette** — Every hex code, RGB value, and opacity used in charts
2. **Chart library details** — Recharts 2.15.4, components used, API patterns
3. **Visual styling** — Border radius, shadows, padding, margins, font sizes
4. **Component patterns** — How tooltips, legends, and markers are styled
5. **Layout specifics** — Exact pixel dimensions, responsive behaviour
6. **Copy-paste code blocks** — Ready-to-use imports, formatters, templates

### ❌ What You Won't Find
- Colour theory or design philosophy (this is implementation-focused)
- UX rationale (this is "here's what's used", not "here's why")
- Design iteration history
- Figma links or mockups

---

## Three Document Tiers

### Tier 1: QUICK REFERENCE (This File)
**Read this first for a 5-minute overview**
- High-level summary
- Key files and imports
- Most common colour values
- When each chart is used

### Tier 2: VISUAL MAP (CHART-COMPONENT-MAP.md)
**Read this next for visual layouts**
- Each chart's visual structure
- Dimension specs (width, height, margins)
- Screenshot-like descriptions
- Data format examples
- Common mistakes to avoid

### Tier 3: COMPREHENSIVE SPEC (DESIGN-SYSTEM-CHARTS.md)
**Read this for deep dives and edge cases**
- Complete colour palette with all 60+ colours
- All typography tokens with exact CSS
- Recharts API reference
- Theme variables and CSS variable system
- Dark mode considerations
- Accessibility notes

---

## The Essential Facts (Memorize These)

### Colour Scheme
✅ **ALL BLUE PALETTE** — No reds, greens, or purples (except NetWorthChart)

**The 4 Blues You'll Use 90% of the Time:**
```
Primary:    #3B6CF4  ← Main lines, bars, goal markers
Secondary:  #6B9CF7  ← Equity lines, secondary series
Light:      #A3C1FA  ← Debt, negative values, light fills
Dark:       #1E4FD0  ← Multi-series depth
```

**Chrome (Grid, Axes, Labels):**
```
Grid:       #F1F3F5  ← Light grey horizontal lines
Labels:     #9CA3AF  ← Grey axis text, annotations
Borders:    #CBD5E1  ← Reference lines
White:      #FFFFFF  ← Card backgrounds, dot strokes
```

### Recharts Library
- **Version:** 2.15.4
- **Import:** `import { LineChart, BarChart, ComposedChart, ... } from 'recharts'`
- **Wrap every chart:** `<ResponsiveContainer width="100%" height={260}>`
- **Grid always:** `<CartesianGrid {...CHART_STYLE.grid} vertical={false} />`

### Dimensions (Fixed, Never Percentage)
```
CashflowChart:        260px height
NetWorthChart:        260px height
PortfolioGrowth:      320px height
ChartWithRoadmap:     276px height
Y-Axis Width:         80px
```

### Typography in Charts
```
Axis Labels:    11px, weight 400, #9CA3AF
Tooltip Text:   12px, weight 400, #111827
Card Title:     14px, weight 600, #111827
Annotations:    9-12px, weight 400, #9CA3AF
```

### Common Strikewidths
```
Primary Line:     2px (bold)
Secondary Line:   1.5px (normal)
Reference Line:   1.5px dashed (pattern: "5 5")
Dashed Baseline:  1.5px dashed (pattern: "6 4")
Bar Radius:       [2, 2, 0, 0] (rounded tops only)
Dot Stroke:       2px white
```

---

## Files You'll Reference

### Main Reference Files (Read 1st Time)
| File | Purpose | Read When |
|------|---------|-----------|
| `/src/constants/chartColors.ts` | Source of truth for all colours | Picking colours |
| `/src/components/ui/ChartCard.tsx` | Card wrapper container | Styling card shells |
| `/src/components/ChartWithRoadmap.tsx` | Complex chart example | Building interactive charts |

### Quick References (Keep Handy)
| File | Purpose | Use For |
|------|---------|---------|
| `CHART-COLORS-QUICK-REF.ts` | Copy-paste values | Hex codes, font sizes, imports |
| `CHART-COMPONENT-MAP.md` | Visual layouts & specs | Dimensions, structure, examples |
| `DESIGN-SYSTEM-CHARTS.md` | Complete specification | Edge cases, full details, dark mode |

---

## Getting Started — Quick Workflow

### Step 1: Import the Essentials
```tsx
import { CHART_COLORS, CHART_STYLE } from '@/constants/chartColors';
import { ChartCard } from '@/components/ui/ChartCard';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
```

### Step 2: Wrap in ChartCard
```tsx
<ChartCard title="Your Chart Title">
  {/* Content here */}
</ChartCard>
```

### Step 3: Use ResponsiveContainer
```tsx
<ResponsiveContainer width="100%" height={260}>
  <LineChart data={data} margin={{ top: 20, right: 24, left: 0, bottom: 5 }}>
    {/* Chart content */}
  </LineChart>
</ResponsiveContainer>
```

### Step 4: Use CHART_STYLE & CHART_COLORS
```tsx
<CartesianGrid {...CHART_STYLE.grid} vertical={false} />
<XAxis dataKey="year" {...CHART_STYLE.xAxis} />
<YAxis {...CHART_STYLE.yAxis} width={80} />
<Line stroke={CHART_COLORS.primary} strokeWidth={2} dot={false} />
```

### Step 5: Add Custom Tooltip
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
<Tooltip content={<CustomTooltip />} />
```

Done! This pattern works for 90% of charts in the app.

---

## Which Chart to Extend From?

### Simple: Single Data Series
**Base:** CashflowChart or PortfolioGrowthChart
- **When:** One metric (cashflow, total value, etc.)
- **Components:** BarChart or LineChart
- **Height:** 260px
- **Complexity:** Low

### Moderate: 2-3 Data Series + Legend
**Base:** NetWorthChart
- **When:** Multiple related metrics (assets, debt, net worth)
- **Components:** ComposedChart or LineChart
- **Height:** 260px
- **Complexity:** Medium
- **Note:** Good place to customize colours if needed

### Complex: Interactive Elements + Custom Layout
**Base:** ChartWithRoadmap
- **When:** Drag-drop, overlays, property icons, custom positioning
- **Components:** ComposedChart + custom React overlays
- **Height:** 276px
- **Complexity:** High
- **Use cases:** Timeline views, interactive planning

---

## Where Each Component Files Lives

```
src/
├── components/
│   ├── ui/
│   │   ├── ChartCard.tsx          ← Card wrapper (use for all charts)
│   │   └── chart.tsx               ← Shadcn components (optional, advanced)
│   ├── ChartWithRoadmap.tsx        ← Complex example (learn from this)
│   ├── CashflowChart.tsx           ← Simple BarChart example
│   ├── NetWorthChart.tsx           ← Simple multi-line example
│   └── PortfolioGrowthChart.tsx    ← Moderate with legend example
├── constants/
│   └── chartColors.ts              ← ALWAYS IMPORT FROM HERE
└── index.css                        ← Typography tokens, CSS variables
```

---

## Colour Reference (Copy This)

### Primary Series (Use Most Often)
```
#3B6CF4  ← Blue (portfolio, primary, positive)
#6B9CF7  ← Blue (equity, secondary, goal)
#A3C1FA  ← Light Blue (debt, negative)
```

### Chrome
```
#F1F3F5  ← Grid lines
#9CA3AF  ← Axis labels, annotations
#E5E7EB  ← Card border
#FFFFFF  ← Card background, strokes
```

### Exception (NetWorthChart Only)
```
#3B82F6  ← Blue (assets)
#8B5CF6  ← Purple (net worth)
#22D3EE  ← Cyan (debt)
```

### Validation Feedback (ChartWithRoadmap)
```
rgba(34, 197, 94, 0.15)    ← Green valid
rgba(239, 68, 68, 0.15)    ← Red invalid
```

---

## Font Sizes in Charts

```
Axis labels:     11px
Tooltip text:    12px
Card title:      14px
Phase label:     9px
Legend label:    12px
```

**Rule:** Never use font sizes not listed above. Stick to the system.

---

## Margin Patterns

All chart margins follow this pattern:

```
Standard Charts (260px height):
  margin={{ top: 20, right: 24, left: 0, bottom: 5 }}

ChartWithRoadmap (276px height):
  margin={{ top: 20, right: 0, left: 0, bottom: 0 }}

PortfolioGrowthChart (320px height):
  margin={{ top: 30, right: 120, left: 14, bottom: 5 }}  ← Extra right for annotations
```

---

## Common Tasks & Solutions

### "I need to add a colour for my new series"
❌ **Don't:** Add inline color="#NEWCOLOR"
✅ **Do:** Add to CHART_COLORS in `/src/constants/chartColors.ts`, import and use

### "I need larger axis labels"
❌ **Don't:** Override fontSize inline
✅ **Do:** Update CHART_STYLE.xAxis.tick.fontSize (affects all charts)

### "I need to show a custom marker"
✅ **Do:** Use `<ReferenceDot r={8} fill={CHART_COLORS.goal} />`

### "My bars need different styling"
✅ **Do:** Use `<Cell>` to color individual bars conditionally

### "I need a phase background"
✅ **Do:** Use `<ReferenceArea x1={} x2={} fill="transparent" />`

### "My Y-axis is showing too many ticks"
✅ **Do:** Specify `domain={[min, max]}` and `ticks={[...]}` arrays

### "Numbers aren't formatted correctly"
✅ **Do:** Create a formatter function and pass to `tickFormatter={formatFn}`

---

## Visual Hierarchy

**Card Layout:**
```
Title (14px, bold)
[Chart area, 260px height]
Legend (12px, grey dots)
```

**Chart Layout:**
```
[Top margin: 20px]
[Y-axis: 80px wide on left]
[Grid lines: light grey]
[Data lines/bars: bold blues]
[X-axis labels: 11px grey]
[Bottom margin: 5px]
```

---

## Testing Your Chart

Before committing, verify:

- [ ] Chart renders without data (shows empty state)
- [ ] Chart renders with data (all series visible)
- [ ] Hover tooltip appears with formatted values
- [ ] Y-axis domain scales correctly for data range
- [ ] Grid is light grey and horizontal only
- [ ] Card title displays properly
- [ ] All text is readable (contrast OK)
- [ ] No console errors
- [ ] Responsive container fills parent
- [ ] Height is fixed (no stretching to content)

---

## Dark Mode Notes

Current implementation: **Light mode only**

Charts don't respect `.dark` class. If you need dark mode support:

1. Update CHART_COLORS in `/src/constants/chartColors.ts` to use CSS variables
2. Define dark variants in `index.css`
3. Check `const isDark = document.documentElement.classList.contains('dark')`
4. Conditionally apply colours

For now: Assume all charts are light mode only.

---

## Real-World Examples from Codebase

### Example 1: Simple BarChart (CashflowChart)
```tsx
<BarChart data={data} margin={{ top: 20, right: 24, left: 0, bottom: 5 }}>
  <CartesianGrid {...CHART_STYLE.grid} />
  <XAxis dataKey="year" {...CHART_STYLE.xAxis} />
  <YAxis {...CHART_STYLE.yAxis} width={80} />
  <Tooltip content={<CustomTooltip />} />
  <Bar dataKey="cashflow" fill={CHART_COLORS.barPositive} radius={[2, 2, 0, 0]} />
</BarChart>
```

### Example 2: Multi-Line with Legend (PortfolioGrowthChart)
```tsx
<LineChart data={data} margin={{ top: 30, right: 120, left: 14, bottom: 5 }}>
  <CartesianGrid {...CHART_STYLE.grid} />
  <XAxis dataKey="year" {...CHART_STYLE.xAxis} />
  <YAxis {...CHART_STYLE.yAxis} tickFormatter={formatYAxis} />
  <Tooltip content={<CustomTooltip />} />
  <Legend verticalAlign="top" height={36} />
  <Line dataKey="portfolioValue" stroke={CHART_COLORS.primary} strokeWidth={2} />
  <Line dataKey="equity" stroke={CHART_COLORS.secondary} strokeWidth={2} />
  <ReferenceLine y={goal} stroke={CHART_COLORS.goal} strokeDasharray="5 5" />
</LineChart>
```

### Example 3: Complex with Overlays (ChartWithRoadmap)
```tsx
<ComposedChart width={width} height={276} data={data} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
  <CartesianGrid {...CHART_STYLE.grid} />
  <XAxis dataKey="year" {...CHART_STYLE.xAxis} />
  <YAxis tickFormatter={formatCurrency} width={80} />
  <Tooltip content={<CustomTooltip />} />
  <Line dataKey="portfolioValue" stroke={CHART_COLORS.primary} strokeWidth={2} />
  <Line dataKey="totalEquity" stroke={CHART_COLORS.secondary} strokeWidth={1.5} />
  {/* Overlay: Property icons, drop zones, etc. */}
</ComposedChart>
```

---

## When to Reference Each Document

| Situation | Document |
|-----------|----------|
| "What colour should I use?" | CHART-COLORS-QUICK-REF.ts |
| "How are chart dimensions set?" | CHART-COMPONENT-MAP.md (Dimension table) |
| "Show me the pixel-perfect layout" | CHART-COMPONENT-MAP.md (Visual structure) |
| "I need the CSS variable names" | DESIGN-SYSTEM-CHARTS.md (Section 7) |
| "How do tooltips work exactly?" | DESIGN-SYSTEM-CHARTS.md (Section 3.8) |
| "I'm building something new — where do I start?" | This file (Getting Started workflow) |
| "I found a bug in a colour — what files changed?" | DESIGN-SYSTEM-CHARTS.md (File Reference Guide) |

---

## Key Takeaways

1. **All blues, all the time** — Except NetWorthChart (purple, blue, cyan exception)
2. **Import from CHART_COLORS and CHART_STYLE** — Never inline colours
3. **Fixed pixel heights** — Never use % for chart height
4. **Wrapped in ChartCard** — Standard card styling for consistency
5. **Custom tooltips** — Every chart needs its own formatter
6. **Accessible by default** — Contrast, labels, and formatting are built-in
7. **Recharts 2.15.4** — Specific version, don't upgrade without testing

---

## Questions? Check Here First

**Q: Where do I find the colour codes?**
A: `/src/constants/chartColors.ts` (source of truth) or CHART-COLORS-QUICK-REF.ts (quick lookup)

**Q: Can I use green for positive values?**
A: No — the palette is all blues. Use `#3B6CF4` (primary blue) instead.

**Q: What's the exact height I should use?**
A: See Dimensions table above. Standard is 260px, ChartWithRoadmap is 276px.

**Q: How do I add dark mode support?**
A: See Dark Mode Notes section. Currently not implemented.

**Q: Can I change the font size of axis labels?**
A: Globally in CHART_STYLE.xAxis.tick.fontSize. Per-chart via prop override (not recommended).

**Q: Where's the Figma file?**
A: Not included in this documentation. This is implementation-focused only.

---

## Document Map

```
CHART-STYLING-START-HERE.md (You are here)
    ↓
    ├─→ Quick answers? → CHART-COLORS-QUICK-REF.ts
    │
    ├─→ Need layout specs? → CHART-COMPONENT-MAP.md
    │
    └─→ Need everything? → DESIGN-SYSTEM-CHARTS.md
```

---

**Last verified:** March 15, 2026
**Extracted from:** ChartWithRoadmap.tsx, CashflowChart.tsx, NetWorthChart.tsx, PortfolioGrowthChart.tsx, ChartCard.tsx, chart.tsx, chartColors.ts, index.css, tailwind.config.ts

**Total colours documented:** 60+
**Total components covered:** 6
**Chart libraries used:** Recharts 2.15.4
**Total lines of analysis:** 2500+

---

## Next Steps

1. **Bookmark this page** — You'll reference it often
2. **Copy CHART-COLORS-QUICK-REF.ts into your IDE** — Keep it open while coding
3. **Read CHART-COMPONENT-MAP.md** — Understand the visual layouts
4. **Pick a chart to extend from** (simple, moderate, or complex)
5. **Start coding** — You now have all the exact values

Good luck! The design system is your friend. 🎨

