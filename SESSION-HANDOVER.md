# Session Handover — 2026-05-24 Table Styling + Architecture + Placeholders

Read this at the start of the next session before responding to anything.

---

## What We Accomplished

Two major outcomes this session:

1. **Established a UUI table design standard** and applied it consistently to every table in the app
2. **Resolved product architecture** — defined what belongs in each of the 3 main sections, restructured tabs accordingly, and placeholdered all future charts

---

## Product Architecture (Locked Decision)

The three main sections of the dashboard serve distinct purposes in the client relationship lifecycle:

| Section | Purpose | Analogy |
|---------|---------|---------|
| **Portfolio Plan** | Multi-property strategy over full timeline | "Here's your 10-year roadmap" |
| **Next Purchase Brief** | Single-property deep-dive (Compound Calculator equivalent) | "Here's why you should buy THIS one" |
| **Existing Portfolio** | Current state snapshot — what you own today | "Here's where things sit right now" |

### Portfolio Plan — Sub-tabs: `Purchases | Equity | Cashflow | Projections`

- **Purchases** (NEW, default tab): Massive 30-column horizontally-scrollable editable table. ALL property parameters in one place — purchase/loan fields + income + annual expenses + one-off costs. This is the single source of truth for property inputs.
- **Equity**: Total Equity chart + "Loan / Borrowing Capacity" chart (placeholder)
- **Cashflow**: Net Cashflow chart + "What It Costs to Hold" chart (placeholder)
- **Projections**: Financial Summary table (year-by-year multi-property projections)

### Next Purchase Brief — Sub-tabs: `The Purchase | The Hold | The Performance`

- **The Purchase**: 3 side-by-side tables (Property summary, Purchase costs, Funding source)
- **The Hold**: 3 side-by-side tables (Annual cash in, Annual cash out, Net result)
- **The Performance**: 2x2 grid of chart placeholders (Cashflow, Equity, Loan balance, What it costs to hold) + Year-by-year projections table

### Existing Portfolio

- KPI summary cards (Combined Value, Total Equity, Annual Cashflow, Releasable Equity)
- Properties table (expandable rows with detail panels)
- "Portfolio Snapshot" chart (placeholder)
- Old complex multi-chart section (Capital Composition, Income vs Expenses, Borrowable Equity waterfall) has been **removed** — replaced with single placeholder

---

## UUI Table Design Standard (Locked)

Every table in the app now follows this exact specification, extracted from UntitledUI's font system via Chrome DOM inspection:

```
Headers:     text-xs font-semibold text-neutral-500   (12px, weight 600, #737373)
Primary:     text-sm font-medium text-neutral-900     (14px, weight 500, #171717)
Secondary:   text-sm text-neutral-600                 (14px, weight 400, #525252)
Row borders: border-b border-neutral-200
Col borders: border-r border-neutral-100
Row padding: py-2 px-3
Last row:    last:border-b-0 (prevents border overlapping card corners)
```

### Number formatting rules:
- Full numbers with commas: `Math.round(v).toLocaleString('en-AU')` → "1,250,000"
- NO dollar signs in data cells
- Dollar signs go in column headers: "Price ($)", "Rent/wk ($)"
- Percentages same: value is just "5.2", header says "LVR (%)"

### Color scale:
- Always use `neutral-*` (NOT `gray-*`)
- Key values: neutral-900 (#171717), neutral-700 (#404040), neutral-600 (#525252), neutral-500 (#737373), neutral-200 (#E5E5E5), neutral-100 (#F5F5F5)

### KVRow helper (used in BriefTab):
```tsx
const KVRow: React.FC<{ label: string; value: string | number; bold?: boolean; border?: boolean }> = ({ label, value, bold, border = true }) => (
  <tr className={`${border ? 'border-b border-neutral-200' : ''} last:border-b-0 hover:bg-neutral-50/50 transition-colors`}>
    <td className="py-2 px-3 text-xs font-semibold text-neutral-500 border-r border-neutral-100 whitespace-nowrap">{label}</td>
    <td className={`py-2 px-3 text-sm ${bold ? 'font-medium text-neutral-900' : 'text-neutral-600'}`}>{value}</td>
  </tr>
)
```

---

## Chart Design Standard (Locked)

Both main charts (InvestmentTimelineChart, CashflowChart) follow:
- `margin={{ top: 10/12, right: 16, left: 16, bottom: 0 }}` — 16px inner padding
- XAxis tick: `fontSize: 12, fontWeight: 600, fill: '#737373'` (matches table header style)
- Brand color: `#7F56D9` (purple)
- No Y-axis shown
- Horizontal grid only: `neutral-100`

---

## Placeholder Component

New file: `src/components/ui/PlaceholderChart.tsx`

A clean UUI-style empty state for charts that don't exist yet:
- Dashed neutral-200 border, neutral-50 background
- BarChart3 icon + label + "Coming soon" text
- Used in: Equity tab, Cashflow tab, Brief Performance tab, Portfolio tab

---

## Files Changed This Session

### New files:
- `src/components/ui/PlaceholderChart.tsx` — Placeholder component for future charts

### Modified files:
| File | What changed |
|------|-------------|
| `src/components/Dashboard.tsx` | Added Purchases sub-tab (first, default), PlaceholderChart import, removed duplicate Properties cards from Equity/Cashflow, added ListIcon import |
| `src/components/PropertyCardRow.tsx` | Added `'purchases'` mode with 30 combined columns, updated type, minWidth logic |
| `src/components/BriefTab.tsx` | Added PlaceholderChart import, rebuilt Performance tab (2x2 chart grid + table), removed MiniBarChart component, removed unused `fmt`/`CHART_COLORS` |
| `src/components/PortfolioTab.tsx` | Added PlaceholderChart import, removed old multi-chart section + associated useMemo data + Recharts imports, replaced with single "Portfolio Snapshot" placeholder |
| `src/components/FinancialSummaryTable.tsx` | Full restyle to UUI table standard (HTML table, neutral colors, full number format) |
| `src/components/InvestmentTimelineChart.tsx` | Chart margin padding (16px), XAxis font weight 600 + neutral500 |
| `src/components/CashflowChart.tsx` | Same chart changes as above |

---

## State of the Codebase

- **Branch**: `main` (all changes uncommitted)
- **Build**: `npx vite build` passes cleanly, TypeScript `--noEmit` passes
- **Dev server**: `npm run dev` on port 8080
- **No test failures** — project has no test suite

---

## Critical Bug (Carried Forward From Previous Session)

### Data Not Loading — Autosave Race Condition

Dashboard shows skeleton for ALL clients. `propertyOrder` stays empty → `hasPlan` returns false → skeleton forever.

**Root cause**: Autosave fires during `loadClientScenario` while state is temporarily cleared by `resetSelections()`, writing empty state back to Supabase before the new data is set.

**Key locations**:
| What | File | ~Line |
|---|---|---|
| `loadClientScenario` | `ScenarioSaveContext.tsx` | 468 |
| `saveScenario` | `ScenarioSaveContext.tsx` | 254 |
| Self-heal effect | `ScenarioSaveContext.tsx` | 959 |
| Change-detection / autosave | `ScenarioSaveContext.tsx` | 975 |

**Fix approaches** (not yet implemented):
1. Guard autosave with `loadInProgressRef.current` check
2. Atomic state restoration (single setter instead of reset → set)
3. Verify change-detection effect actually skips during loads

---

## What's Next (Prioritized)

### Immediate (next session):
1. **Build the placeholder charts** — Replace PlaceholderChart instances with real Recharts visualizations:
   - "Loan / Borrowing Capacity" chart (Equity tab) — show loan drawdown + borrowing capacity + equity release events
   - "What It Costs to Hold" chart (Cashflow tab) — stacked area/bar showing expense breakdown over time
   - Brief Performance charts (4x) — single-property cashflow, equity, loan balance, holding costs
   - Portfolio Snapshot chart — macro current-state visualization

2. **Fix the autosave race condition** — The data-not-loading bug needs resolving for the app to be usable

### Later:
- Purple-only palette pass across the app (replace any remaining blue accents)
- Existing Portfolio detail panels need restyling to UUI standard (still using old `gray-*` classes)
- Other pages needing UUI styling (Settings, Clients, etc.)
- Remove the old `EQUITY_COLUMNS` and `CASHFLOW_COLUMNS` from PropertyCardRow if the separate modes are no longer used anywhere

---

## Design Decisions (Locked — Do Not Change)

- **UUI active states**: `bg-neutral-50 text-neutral-800` — never purple for nav/tab active states
- **Tab state in LayoutContext**: Shared between sidebar sub-nav and dashboard tab bar
- **TopBar inline**: Inside tab bar with `ml-auto`, not floating fixed
- **Sub-tab state local**: `planSubTab`/`portfolioSubTab` use local `useState` in Dashboard
- **No capitalised group headers in tables** — Rob explicitly rejected INCOME/EXPENSES/etc. header rows
- **Never use compact number format** ($200k) — always full: 200,000
- **Dollar signs in headers only** — never in data cells
- **neutral color scale** — never gray
- **Tables use HTML `<table>`** — not CSS Grid (consistency + accessibility)
- **ChartCard wraps everything** — all content sections use ChartCard with appropriate `flush`/`action` props
- **Purchases tab is default** — lands on the big editable table first
