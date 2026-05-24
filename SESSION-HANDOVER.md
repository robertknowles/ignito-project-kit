# Session Handover — 2026-05-24 Real Charts + Portfolio Restyle

Read this at the start of the next session before responding to anything.

---

## What We Accomplished

Three major outcomes this session:

1. **Built all real charts** replacing PlaceholderChart instances across Portfolio Plan, Next Purchase Brief, and Existing Portfolio
2. **Restyled Existing Portfolio** to UUI — 3 charts in a single row, removed Graphs/Tables sub-tabs, matched KPI number format
3. **Saved all work safely** to the `dashboard-redesign` branch on GitHub

---

## Branch & Git State

- **Branch**: `dashboard-redesign` (created this session, pushed to GitHub)
- **Last commit**: `cec0314` — "UUI dashboard redesign — 5 sessions of work"
- **Uncommitted changes** (this session's work):
  - `src/components/BriefTab.tsx` — PlaceholderChart replaced with real BriefPerformanceCharts
  - `src/components/Dashboard.tsx` — new chart imports, removed portfolio sub-tabs, annual cashflow headlines
  - `src/components/PortfolioTab.tsx` — restored 3 charts with UUI restyle, 3-col layout, formatCompact KPIs
  - `src/components/ui/ChartCard.tsx` — flex layout fix (prevents grey overflow in grid), line legend variant
  - `src/components/BriefPerformanceCharts.tsx` (NEW)
  - `src/components/EquityMortgageChart.tsx` (NEW)
  - `src/components/HoldingCostChart.tsx` (NEW)
- **Build**: TypeScript `--noEmit` passes cleanly
- **Dev server**: `npm run dev` on port 8080

---

## New Chart Components

### EquityMortgageChart.tsx (Portfolio Plan > Growth tab)
- Side-by-side bar chart: Market Value (brand-600) vs Loan Balance (brand-200)
- Dotted LVR % line (neutral-500, strokeDasharray="6 4")
- No YAxis elements — LVR is scaled to the value axis range to avoid hidden YAxis width issues
- Custom tooltip filters out the scaled LVR data key, shows real percentage
- Data from `useChartDataGenerator().portfolioGrowthData`

### HoldingCostChart.tsx (Portfolio Plan > Cashflow tab)
- Stacked bar chart: Mortgage (brand-700) + Operating Expenses (brand-500) + Rental Income (neutral-200)
- Data from `useHoldingCostTimeline`, aggregated per year, multiplied by 12 for annual values
- Rounded top corners only on top stack: `radius={[6, 6, 0, 0]}`
- Top bar in stack gets rounded corners, bottom bars get square corners

### BriefPerformanceCharts.tsx (Brief > Performance tab, 4 mini charts)
- **BriefCashflowChart**: AreaChart with brand-600 line, gradient opacity 0.08
- **BriefEquityChart**: AreaChart with brand-600 line, gradient opacity 0.15
- **BriefLoanChart**: ComposedChart with 2 lines (propertyValue brand-600, loanBalance brand-200) + dotted LVR (neutral-500, scaled to max value)
- **BriefHoldingCostChart**: Stacked BarChart matching portfolio version colors
- All show years 1-10 as calendar years (2025-2034 via `BASE_YEAR + r.year - 1`)
- Shared XAxis config via `sharedXAxis` object
- Data from `calculatePerPropertyProjection` (YearRow type)

---

## Portfolio Plan Changes (Dashboard.tsx)

### KPIs
- `totalDebt` added to kpis object
- `netCashflowMonthly` → `netCashflowAnnual`
- `rentalIncomeAnnual` and `holdingCostsAnnual` added

### Growth sub-tab (was "Equity")
- Tab label changed from "Equity" to "Growth" (internal state key remains `'equity'`)
- Equity vs Mortgage ChartCard: headline shows LVR% ("32% LVR by 2045")
- Legend uses `'line'` variant for LVR dotted line indicator
- TimeRangeTabs controls shared `displayYears` state

### Cashflow sub-tab
- What It Costs to Hold ChartCard: headline shows coverage % (rent/costs × 100)
- Both cashflow headlines changed from /mo to /yr
- TimeRangeTabs shared with Growth tab

---

## Existing Portfolio Changes (PortfolioTab.tsx)

### Removed
- `mode` prop (`'graphs' | 'tables'`) — always shows combined view now
- Graphs/Tables sub-tab toggle from Dashboard.tsx
- `PortfolioSubTab` type, `portfolioSubTab` state, `hasPortfolioSubTabs` variable
- `error400` (#F97066) color — replaced with purple tones

### Added/Changed
- 3 charts restored and restyled to UUI: Capital Composition, Income vs Expenses, Borrowable Equity
- Layout: `grid-cols-3` single row instead of 2-col + full-width
- Color palette: all-purple (brand-200, brand-300, brand-500, brand-600, brand-700) — no more coral red
- KPI format: `formatCompact()` matching Dashboard style — `$500,000` not `$500k`, `$4.55M` not `$4.6M`
- Capital Composition: brand-200 (loan) + brand-600 (equity)
- Income vs Expenses: brand-600 (income) + brand-300 (expenses)
- Borrowable Equity waterfall: brand-600, brand-300, brand-500

---

## ChartCard.tsx Changes

### Flex layout fix
- Outer shell now uses `display: 'flex', flexDirection: 'column'`
- Inner white card uses `flex: 1` to fill remaining height
- Fixes: when ChartCards sit in a CSS grid row, shorter cards had FAFAFA grey strips at the bottom because the outer shell stretched to match the tallest card but the inner card didn't

### Line legend variant
- `LegendItem.variant` expanded: `'dot' | 'ring' | 'line'`
- `'line'` renders: `<svg width="16" height="8"><line ... strokeDasharray="2 3" /></svg>`
- Used for LVR dotted line legend in Equity vs Mortgage chart

---

## UUI Color Tokens (Reference)

```
brand-700: #6941C6  (darkest purple — mortgage bars)
brand-600: #7F56D9  (primary purple — main data series)
brand-500: #9E77ED  (medium purple — secondary data)
brand-400: #B692F6
brand-300: #D6BBFB  (light purple — expenses, current debt)
brand-200: #E9D7FE  (lightest purple — loan balance, backgrounds)
neutral-900: #171717
neutral-500: #737373  (axis text, labels)
neutral-200: #E5E5E5  (borders, reference lines)
neutral-100: #F5F5F5  (grid lines)
```

---

## Known Issues

### Deferred: X-axis alignment between area charts and bar charts
Bar charts have inherent category spacing that prevents pixel-perfect X-axis alignment with area charts above them. Tried adjusting `barCategoryGap` — didn't help. Accepted as a Recharts limitation for now.

### Carried forward: Autosave race condition
Dashboard can show skeleton forever for all clients. `propertyOrder` stays empty during `loadClientScenario` because autosave fires while state is temporarily cleared. See previous handover for fix approaches.

### Existing Portfolio detail panels
Still use old `gray-*` Tailwind classes. Need restyling to `neutral-*` UUI standard.

---

## Design Decisions (Locked — Do Not Change)

All decisions from the previous handover remain locked, plus:

- **No Graphs/Tables sub-tabs** on Existing Portfolio — single combined view with table + charts
- **3-column chart row** on Existing Portfolio — Capital Composition, Income vs Expenses, Borrowable Equity side by side
- **Purple-only chart palette** — no error/red colors for data visualization, use brand-300 for "negative" items
- **formatCompact for KPIs** — `$500,000` for thousands, `$4.55M` for millions (2 decimal places)
- **Growth tab** (not "Equity") — renamed for clearer client communication
- **Annual not monthly** for cashflow headlines
- **Coverage %** headline for "What It Costs to Hold" (rent ÷ costs × 100)
- **LVR %** headline for "Equity vs Mortgage" (informational since total equity shown above)
- **No YAxis elements** in charts — use scaled data trick for dual-axis needs (avoids Recharts width reservation bug)
- **Gradient opacity varies by chart**: 0.08 for cashflow area, 0.15 for equity area (denser data fills = lighter gradient)

---

## What's Next (Prioritized)

### Immediate:
1. **Commit this session's work** to the `dashboard-redesign` branch
2. **Restyle Existing Portfolio detail panels** — replace `gray-*` with `neutral-*`, match UUI patterns
3. **Fix the autosave race condition** — critical for app usability

### Later:
- Purple-only palette pass across remaining app areas
- Other pages needing UUI styling (Settings, Clients, etc.)
- Remove unused `EQUITY_COLUMNS` and `CASHFLOW_COLUMNS` from PropertyCardRow if no longer needed
