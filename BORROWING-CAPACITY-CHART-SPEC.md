# Borrowing Capacity Chart Overhaul — Build Spec

## Context

We have a `BorrowingCapacityChart.tsx` component that shows borrowing capacity, total liabilities, and offset debt over time. It needs to match the visual and modelling quality of Gameplans (the industry-standard competitor tool used by buyers' agents). A mortgage broker (Adam Young) confirmed in beta testing (June 3 2026) that the standard BA practice is IO loans for ~5 years then rolling to P&I — our chart needs to model this.

**Reference screenshot**: The competitor chart Rob shared shows a stacked area chart with:
- Grey filled area = borrowing capacity ceiling (the envelope)
- Darker fill inside = total liabilities
- Gold/orange fill within that = offset debt (cash reducing net exposure)
- Property purchase events labelled along the top
- Y-axis in $k increments, X-axis in years

---

## CRITICAL: Every Input That Affects This Chart

The borrowing capacity chart must react correctly to changes from **all** of these sources. If any input changes anywhere in the app, the chart must recalculate. This is the full map.

### A. Profile-Level Inputs (InvestmentProfileContext)

These are set via the client inputs panel, chatbot, or NL brief. All live in `src/contexts/InvestmentProfileContext.tsx`.

| Field | Where set | How it affects the chart |
|---|---|---|
| `baseSalary` | Client inputs, chatbot NL parse | Drives the income side of borrowing capacity formula |
| `salaryServiceabilityMultiplier` | Profile (default 6.0) | The "× 6" in BC = income × multiplier |
| `wageGrowthRate` | Assumptions grid (default 0.025) | Salary compounds forward each year → capacity grows |
| `borrowingCapacity` | Client inputs, chatbot | Currently used in affordability calc — chart should be consistent |
| `depositPool` | Client inputs, chatbot | Feeds offset debt calculation (cash available) |
| `annualSavings` | Client inputs, chatbot | Accumulates into offset cash over time |
| `currentDebt` | Client inputs, chatbot, existing portfolio | Starting total liabilities for existing portfolio |
| `portfolioValue` | Client inputs, chatbot, existing portfolio | Used when no individual existing properties are entered |
| `interestRate` | Assumptions grid (default 0.0625) | Affects assessed repayments in capacity calc AND debt service costs |
| `existingPortfolioGrowthRate` | Assumptions grid (default 0.05) | Existing property values grow → affects equity (NOT offset) |
| `timelineYears` | Client inputs (default 20) | How many years the chart spans |
| `ioToPiTransitionYears` | Profile (default 5) | **ALREADY EXISTS** — "years after last purchase to switch IO→P&I". Currently used only for financial freedom projection and consolidation year calcs. See Section A below for how this should be reconciled with per-property IO terms. |
| `inflationRate` | Assumptions grid (default 0.03) | Affects expense growth which feeds into cashflow/rental income |
| `vacancyRate` | Assumptions grid (default 0.04) | Reduces effective rental income → affects capacity |
| `rentEscalationRate` | Assumptions grid (default 0.05) | Rental income grows → capacity grows |
| `equityReleaseFactor` | Profile (default 0.75) | How much equity is extracted on refi — affects debt levels |
| `useExistingEquity` | Profile toggle | Whether existing property equity is used for purchases |

### B. Per-Property Instance Inputs (PropertyInstanceDetails)

These are editable in the purchases table, blocks, and brief. All live on instances in `PropertyInstanceContext`.

| Field | How it affects the chart |
|---|---|
| `purchasePrice` | Determines loan amount → total debt |
| `lvr` | Loan-to-value ratio → loan amount = purchasePrice × lvr/100 |
| `interestRate` | Per-property rate → affects that property's debt service in capacity calc |
| `loanProduct` | 'IO' or 'PI' — determines if debt amortises. **Currently not wired into chart pipeline** |
| `loanTerm` | Total loan term in years (default 30). **Currently not wired into chart pipeline** |
| `rentPerWeek` | Feeds into rental income → captured in capacity formula |
| `growthAssumption` | High/Medium/Low — affects property value growth (equity, NOT offset) |
| `saleYear` | When property is sold — removes it from debt and rental income |
| `entity` | Individual/Trust/Company/SMSF — affects CGT on sale |
| `allowEquityRelease` | Per existing property — whether its equity is included in refi calculations |
| `valuationAtPurchase` | If higher than purchase price → manufactured equity (growth basis) |

### C. Existing Portfolio (ExistingProperty[])

Entered in the Portfolio tab or via chatbot/NL parse. Key fields:

| Field | How it affects the chart |
|---|---|
| `loan` | Adds to starting total debt |
| `currentValue` | Adds to portfolio value → equity calculations |
| `interestRate` | Per-property rate → debt service |
| `loanType` | IO or PI — **currently NOT modelled in chart for existing properties** |
| `loanTerm` | **Optional field, often not set** |
| `rentPerWeek` | Adds to rental income → capacity |
| `saleYear` | When sold, removed from debt/income |
| `allowEquityRelease` | Whether equity can be released |

### D. Event Blocks (Custom Events System)

Added via the events panel on the dashboard. Processed by `src/utils/eventProcessing.ts`.

| Event Type | How it affects the chart |
|---|---|
| `interest_rate_change` | Changes effective interest rate from that period forward → affects debt service AND capacity |
| `salary_change` | **NOT currently processed by BorrowingCapacityChart** — chart reads `baseSalary` from profile only. If a salary_change event fires in year 3, the chart should reflect the new salary from that year forward |
| `partner_income_change` | Same gap as salary_change |
| `market_correction` | Adjusts growth rates temporarily → affects property values (not directly capacity, but affects equity/debt ratios) |
| `refinance` | Can change interest rate per-property → affects debt service |

### E. Chatbot Modifications

The chatbot (`ChatPanel.tsx`) can modify at runtime via `updateProfile()`:
- `baseSalary`, `annualSavings`, `depositPool`, `borrowingCapacity` (profile updates)
- `interestRate` on individual property instances
- `loanProduct`, `lvr`, `purchasePrice`, `rentPerWeek` on property instances
- Add/remove properties entirely
- Add/remove existing portfolio properties
- "What if interest rates go up 1%?" → should create an interest_rate_change event

### F. Assumptions Grid Dials

`src/components/AssumptionsGrid.tsx` — all call `updateProfile()`:
- `existingPortfolioGrowthRate` — existing property value growth
- `rentEscalationRate` — rental income escalation
- `inflationRate` — expense inflation
- `interestRate` — global interest rate
- `vacancyRate` — vacancy loss on rental income

---

## What's Wrong Today

### Modelling Problems

#### 1. Total debt never declines — no amortisation
**File**: `src/utils/metricsCalculator.ts` line ~215
```js
// Simplified debt model - no principal reduction
const remainingDebt = purchase.loanAmount;
```
`calculatePortfolioMetrics()` always uses the original `loanAmount` regardless of years elapsed. The detailed `calculatePropertyProjection()` function in the same file (line ~521) DOES model P&I amortisation correctly — but `portfolioGrowthData` (which feeds the chart) calls the simplified function instead.

#### 2. loanTerm and loanType not wired into chart pipeline
- `PropertyInstanceDetails` has `loanTerm: number` and `loanProduct: 'IO' | 'PI'` — both editable in the purchases table
- `useAffordabilityCalculator.ts` uses them for serviceability checks
- `useChartDataGenerator.ts` does NOT pass them through — calls `calculatePortfolioMetrics` which ignores them entirely
- `calculatePropertyProjection()` checks `loanType === 'PI'` but hardcodes `30 - yearsOwned` instead of using actual `loanTerm`
- Existing properties have `loanType` and optional `loanTerm` — also not modelled in the chart

#### 3. Borrowing capacity grows smoothly — should dip on each purchase
Current formula in `BorrowingCapacityChart.tsx`:
```js
borrowingCeiling = (employmentIncome + capturedRental) * multiplier
```
This ignores that existing loan repayments consume serviceability. Each new property should reduce remaining capacity because banks deduct repayments (at an assessment buffer rate, typically ~3% above actual rate) from income before calculating what you can borrow next. Gameplans shows capacity dipping at each purchase year then recovering as income grows.

**Also missing**: The chart doesn't process `salary_change` or `partner_income_change` events. It reads `baseSalary` from the profile and grows it with `wageGrowthRate`, but if the user adds a salary change event at year 3, the chart ignores it.

#### 4. Offset debt is inflated by equity
`availableFunds` in `useChartDataGenerator.ts` line ~334:
```js
const availableFunds = Math.round(Math.max(0, profile.depositPool + cumulativeSavings + usableEquity - depositsUsed));
```
`usableEquity` is equity sitting in properties — not cash in an offset account. This inflates offset debt unrealistically.

#### 5. Interest rate events not reflected in capacity calc
The chart uses `profile.interestRate` (or a default) for the capacity formula. But `useChartDataGenerator` already processes `interest_rate_change` events via `getEffectiveInterestRate()` for cashflow calcs. The `BorrowingCapacityChart` should use the same event-adjusted rate for its assessed repayments calculation.

### Visual Problems

#### 6. Three independent transparent areas instead of stacked fills
Current: three overlapping `<Area>` components with near-invisible gradient fills (10% to 2% opacity). Looks like three faint lines, not a solid visual story.

Target: Gameplans-style stacked fill where capacity is the background envelope, liabilities fill within it, and offset is carved out within liabilities. PropPath brand colours (see Visual Design section).

---

## What to Build

### A. IO to P&I Rollover — Reconcile Profile vs Per-Property

**Important discovery**: `ioToPiTransitionYears` already exists at profile level (default 5, in `InvestmentProfileContext`). It's used by:
- `useFinancialFreedomProjection.ts` line 86: `piTransitionYear = lastPurchaseYear + profile.ioToPiTransitionYears`
- `useChartDataGenerator.ts` line 232: for consolidation year calc
- `useAffordabilityCalculator.ts` line 407: for consolidation year calc
- `useRoadmapData.ts` line 280: for consolidation year calc

**Current meaning**: "X years after the LAST purchase, switch all IO loans to P&I" (consolidation phase concept).

**What Adam described**: Each loan individually rolling to P&I after 5 years from THAT property's purchase date. This is per-property, not portfolio-wide.

**Recommended approach**: Support BOTH models:
1. **Per-property `ioTermYears`** on `PropertyInstanceDetails` (default: 5) — each loan rolls individually after N years from its purchase date. This is the more realistic model.
2. **Keep `ioToPiTransitionYears` on the profile** for backward compatibility — it continues to drive the financial freedom projection's consolidation phase. But the chart should use the per-property value.

For existing properties (`ExistingProperty`), add optional `ioTermYears` too. Since existing properties already have a `boughtYear`, the system can calculate how many IO years remain (if any). E.g., if `boughtYear = 2022` and `ioTermYears = 5`, then P&I starts from 2027.

**Key files to modify:**
- `src/types/propertyInstance.ts` — add `ioTermYears?: number` field
- `src/types/existingProperty.ts` — add `ioTermYears?: number` field
- `src/utils/propertyInstanceDefaults.ts` — set default `ioTermYears: 5`
- `src/components/PropertyCardRow.tsx` — add IO term to PURCHASES_COLUMNS, blocks mode, and EQUITY_COLUMNS
- `src/components/PortfolioTab.tsx` — add IO term column for existing properties
- `src/utils/metricsCalculator.ts` — update both `calculatePortfolioMetrics()` and `calculatePropertyProjection()`
- `src/hooks/useChartDataGenerator.ts` — pass through to metrics

### B. Fix Total Debt Amortisation

**Goal**: `portfolioGrowthData.totalDebt` should reflect actual loan balances at each year, not original loan amounts.

**Approach (Recommended)**: Fix `calculatePortfolioMetrics()` to model amortisation inline. It currently takes purchases as input — augment each purchase object to include `loanType`, `loanTerm`, `ioTermYears`, and `interestRate`. Then for each purchase in the portfolio at a given year:

```
yearsOwned = currentYear - purchaseYear

if loanProduct === 'PI':
    // P&I from day 1, full loanTerm
    remainingDebt = amortisedBalance(loanAmount, interestRate, loanTerm, yearsOwned)
elif yearsOwned < ioTermYears:
    // Still in IO period
    remainingDebt = loanAmount
else:
    // IO period ended, now in P&I for remaining term
    piYears = yearsOwned - ioTermYears
    remainingTermMonths = (loanTerm - ioTermYears) * 12
    remainingDebt = amortisedBalance(loanAmount, interestRate, remainingTermMonths, piYears * 12)
```

**For existing properties**: Same logic but using `boughtYear` to determine how many years they've been owned. If `boughtYear = 2020` and `ioTermYears = 5`, they've been on P&I since 2025.

**Ripple effects to check**: 
- `useRoadmapData.ts` — also calls metrics functions, also needs amortised debt
- `useFinancialFreedomProjection.ts` — reads `finalPortfolioPoint.totalDebt` from chart data, so it will automatically benefit
- The equity chart (`ChartWithRoadmap`) shows portfolio value vs debt — it should also reflect amortised debt (it reads from the same `portfolioGrowthData`)

**Key files:**
- `src/utils/metricsCalculator.ts` — `calculatePortfolioMetrics()` (line ~214) and `calculatePropertyProjection()` (line ~521)
- `src/hooks/useChartDataGenerator.ts` — where `portfolioGrowthData` is assembled (line ~270-350). Must pass `loanType`, `loanTerm`, `ioTermYears`, `interestRate` through to the metrics calculation for each purchase

### C. Fix Borrowing Capacity to Deduct Existing Commitments

**Goal**: Capacity should dip when you buy and recover as income grows — not just march upward.

**Current formula** (in `BorrowingCapacityChart.tsx`):
```js
borrowingCeiling = (employmentIncome + capturedRental) * multiplier
```

**New formula**:
```js
// Assessment rate: actual rate + 3% buffer (industry standard)
const assessmentRate = effectiveInterestRate + 0.03;

// Annual repayments at assessment rate across all current loans
// For IO loans: interest-only payments at assessment rate
// For P&I loans: full amortised payments at assessment rate
const assessedRepayments = calculateAssessedRepayments(allLoansAtYear, assessmentRate);

// Capacity = (income - existing commitments) * multiplier, floored at 0
borrowingCeiling = Math.max(0, (employmentIncome + capturedRental - assessedRepayments) * multiplier);
```

**Inputs that must flow into this formula:**
1. `baseSalary` from profile — grown by `wageGrowthRate` per year
2. `salary_change` events — must be applied on top of wage growth from the event's year forward
3. `partner_income_change` events — same treatment
4. Rental income from `cashflowData` — already available, scaled by `RENTAL_RECOGNITION_RATE` (0.80)
5. `interestRate` — from profile, adjusted by `interest_rate_change` events via `getEffectiveInterestRate()`
6. Per-property interest rates — if a property has a custom `interestRate`, use that for its assessed repayments
7. Refinance events — can change a property's rate via `getPropertyEffectiveRate()`
8. Total debt at each year — now amortised (from fix B above)

**To process salary events**, import `eventBlocks` from `usePropertySelection` and filter for `salary_change` / `partner_income_change` events. Apply them as step adjustments to the base salary at the relevant year.

**Key files:**
- `src/components/BorrowingCapacityChart.tsx` — the `useMemo` that computes chart data (line ~38-76). Will need access to `eventBlocks` from PropertySelectionContext, and `getEffectiveInterestRate` from eventProcessing utils
- `src/constants/financialParams.ts` — add `ASSESSMENT_RATE_BUFFER = 0.03` constant

### D. Fix Offset Debt Calculation

**Goal**: Offset should represent actual cash savings, not equity.

**Current** (in `BorrowingCapacityChart.tsx`):
```js
const offsetDebt = Math.round(Math.min(d.availableFunds ?? 0, totalDebt));
```
Where `availableFunds = depositPool + cumulativeSavings + usableEquity - depositsUsed`

**Fix**: Add a `cashOffset` field to `portfolioGrowthData` that excludes equity:
```js
// In useChartDataGenerator, alongside the existing availableFunds calc:
const cashOffset = Math.round(Math.max(0, profile.depositPool + cumulativeSavings - depositsUsed));
```

Add `cashOffset` to the `PortfolioGrowthDataPoint` interface and populate it in the data assembly loop (line ~340-350 of useChartDataGenerator).

Then in `BorrowingCapacityChart.tsx`:
```js
const offsetDebt = Math.round(Math.min(d.cashOffset ?? 0, totalDebt));
```

**Inputs that affect offset:**
- `depositPool` — starting cash
- `annualSavings` — grows with wage growth, accumulates each year
- `wageGrowthRate` — savings compound forward
- Deposits used for purchases — each purchase consumes cash
- Sale proceeds — if a property is sold, net proceeds add to cash (already tracked as `cashFromSales`)

**Key files:**
- `src/hooks/useChartDataGenerator.ts` — add `cashOffset` field to data points, calculate it without equity
- `src/components/BorrowingCapacityChart.tsx` — use `cashOffset` instead of `availableFunds`

### E. Visual Redesign — PropPath Stacked Fill

**Brand colours (PropPath purple palette):**
- Borrowing Capacity (envelope/ceiling): `#E9D7FE` (light purple / brand200) fill, `#7F56D9` (brand600) stroke
- Total Liabilities (region inside): `#535862` (neutral grey) fill at ~25% opacity, `#414651` (darker grey) stroke
- Offset Debt (within liabilities): `#D6BBFB` (brand300) fill at ~40% opacity, `#9E77ED` (brand500) stroke

**Recharts approach for stacked fill:**
Render them as layered areas with solid-ish fills, not near-invisible gradients:

1. **Capacity area**: Full fill from 0 to borrowingCeiling — the background envelope. Light purple fill.
2. **Liabilities area**: Fill from 0 to totalDebt — sits inside the capacity envelope. Grey fill.
3. **Offset area**: Fill from 0 to offsetDebt — sits inside the liabilities area. Purple fill (visually "carves out" the offset portion).

Rendering order: capacity first (background), then liabilities, then offset on top.

**Additional visual elements:**
- Purchase event markers along the top (property name + year) — matching the competitor screenshot
- Solid area fills (not near-invisible gradients)
- Clean legend with dot + label for each series (Borrowing Capacity, Total Liabilities, Offset Debt)
- Tooltip — keep existing UUI-styled tooltip (already well-designed), but update colours to match new palette
- Y-axis in $K / $M format (already implemented)
- "Exclude debt" toggle with property chips — matching the competitor screenshot's top section (nice to have, not essential for v1)

**Key file:**
- `src/components/BorrowingCapacityChart.tsx` — full visual rewrite of the chart rendering

### F. Property Purchase Labels Along Top

The competitor chart shows property purchases as labels along the top edge:
```
2027 Purchase One 2030   3 113 Marley St 2033   2026 Purchase Two 2033   +1 more properties >
```

**Implementation**: Add `ReferenceLine` or custom label elements at each purchase year. Data is available from `portfolioGrowthData` which already has a `properties` field (array of property titles purchased that year). Map these to labels positioned at the top of the chart area.

---

## Complete Data Flow (After Changes)

```
                    ┌─────────────────────────────────────────┐
                    │           INPUT SOURCES                  │
                    ├─────────────────────────────────────────┤
                    │                                          │
                    │  Profile (InvestmentProfileContext)       │
                    │  ├── baseSalary                          │
                    │  ├── salaryServiceabilityMultiplier (6×)  │
                    │  ├── wageGrowthRate (2.5%)               │
                    │  ├── depositPool                         │
                    │  ├── annualSavings                       │
                    │  ├── currentDebt                         │
                    │  ├── interestRate (6.25%)                │
                    │  ├── vacancyRate (4%)                    │
                    │  ├── rentEscalationRate (5%)             │
                    │  └── timelineYears                       │
                    │                                          │
                    │  Per-Property (PropertyInstanceDetails)   │
                    │  ├── purchasePrice, lvr → loanAmount     │
                    │  ├── interestRate (per-property)         │
                    │  ├── loanProduct (IO/PI)                 │
                    │  ├── loanTerm (30 yrs)                   │
                    │  ├── ioTermYears (5 yrs) ← NEW          │
                    │  ├── rentPerWeek                         │
                    │  └── saleYear                            │
                    │                                          │
                    │  Existing Properties                     │
                    │  ├── loan, currentValue, boughtYear      │
                    │  ├── loanType, interestRate              │
                    │  ├── ioTermYears ← NEW                  │
                    │  └── rentPerWeek, saleYear               │
                    │                                          │
                    │  Events (EventBlocks)                    │
                    │  ├── interest_rate_change → rate shifts   │
                    │  ├── salary_change → income steps ← NEW  │
                    │  ├── partner_income_change ← NEW         │
                    │  ├── refinance → per-property rate       │
                    │  └── market_correction → growth adj      │
                    │                                          │
                    │  Assumptions Grid                        │
                    │  └── All feed into Profile fields above  │
                    │                                          │
                    │  Chatbot                                 │
                    │  └── Modifies Profile + Property fields  │
                    └──────────────┬──────────────────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────────────────┐
                    │     useChartDataGenerator               │
                    │     (portfolioGrowthData per year)      │
                    ├─────────────────────────────────────────┤
                    │                                          │
                    │  Per year, for each property:            │
                    │  ├── Calculate loanBalance with IO→PI    │
                    │  │   amortisation (using ioTermYears)    │
                    │  ├── Sum all → totalDebt (amortised)     │
                    │  └── Calculate cashOffset (no equity)    │
                    │                                          │
                    │  New fields on data points:              │
                    │  ├── totalDebt (amortised)               │
                    │  ├── cashOffset (cash only)              │
                    │  └── properties[] (purchase labels)      │
                    └──────────────┬──────────────────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────────────────┐
                    │     BorrowingCapacityChart.tsx           │
                    ├─────────────────────────────────────────┤
                    │                                          │
                    │  For each year:                          │
                    │  1. employmentIncome = baseSalary        │
                    │     × (1 + wageGrowth)^years             │
                    │     + salary_change events               │
                    │  2. capturedRental = rentalIncome × 80%  │
                    │  3. effectiveRate = interestRate          │
                    │     + interest_rate_change events         │
                    │  4. assessedRepayments = f(totalDebt,    │
                    │     effectiveRate + 3% buffer)           │
                    │  5. borrowingCeiling = max(0,            │
                    │     (income + rental - repayments) × 6)  │
                    │  6. totalDebt = from chartData           │
                    │  7. offsetDebt = min(cashOffset, debt)   │
                    │                                          │
                    │  Render: stacked area chart              │
                    │  ├── Purple envelope (capacity)          │
                    │  ├── Grey fill (liabilities)             │
                    │  ├── Light purple (offset)               │
                    │  └── Purchase labels along top           │
                    └─────────────────────────────────────────┘
```

---

## Files to Touch (Ordered by Dependency)

1. `src/types/propertyInstance.ts` — add `ioTermYears?: number` field
2. `src/types/existingProperty.ts` — add `ioTermYears?: number` field  
3. `src/utils/propertyInstanceDefaults.ts` — set default `ioTermYears: 5`
4. `src/constants/financialParams.ts` — add `ASSESSMENT_RATE_BUFFER = 0.03`
5. `src/utils/metricsCalculator.ts` — fix `calculatePortfolioMetrics()` to model amortisation with IO→PI rollover. Fix `calculatePropertyProjection()` to use actual `loanTerm` instead of hardcoded 30
6. `src/hooks/useChartDataGenerator.ts` — pass `loanType`, `loanTerm`, `ioTermYears`, `interestRate` through to metrics for each purchase. Add `cashOffset` field to data points (without equity). Ensure existing property debt is also amortised
7. `src/components/BorrowingCapacityChart.tsx` — new capacity formula (deduct assessed commitments, process salary/rate events), use `cashOffset`, full visual redesign with PropPath purple/grey palette, purchase labels along top
8. `src/components/PropertyCardRow.tsx` — add IO term column to PURCHASES_COLUMNS, EQUITY_COLUMNS, and blocks mode
9. `src/components/PortfolioTab.tsx` — add IO term column for existing properties
10. `src/components/ConfirmationBrief.tsx` — consider adding IO term to new property blocks (optional for v1)

---

## Ripple Effects — Other Charts That Read the Same Data

Fixing `totalDebt` in `portfolioGrowthData` will automatically improve these other views (they read from the same data source):

| Component | What changes |
|---|---|
| `ChartWithRoadmap.tsx` | Equity chart — equity = portfolioValue - totalDebt. Debt declining means equity grows faster (more accurate) |
| `FinancialSummaryTable.tsx` | Summary metrics — total debt figures will now reflect amortisation |
| `useFinancialFreedomProjection.ts` | Reads `finalPortfolioPoint.totalDebt` — will get amortised figure, more accurate freedom year |
| `useRoadmapData.ts` | Roadmap visualisation — uses consolidation year calcs |
| `InvestmentTimeline.tsx` | Timeline events — if it shows debt levels, they'll be amortised |
| PDF export (`pdfEnhancedGenerator.tsx`) | Exports chart data — will reflect improved numbers |

**Do NOT break these.** The changes to `metricsCalculator.ts` and `useChartDataGenerator.ts` feed everything. Test the equity chart and cashflow chart alongside the borrowing capacity chart.

---

## Validation Checklist

After building, verify:

1. **Debt line declines** after IO period ends for each property (year 5 by default)
2. **Capacity dips** at each purchase year then recovers as income grows
3. **Offset debt** is reasonable (not inflated by property equity — should be much smaller than totalDebt)
4. **Visual match** to Gameplans — solid stacked fills in purple/grey, purchase labels along top
5. **IO term editable** in purchases table — changing it recalculates the chart
6. **Changing interest rate** in assumptions grid recalculates both debt service AND capacity
7. **Adding a salary_change event** causes a visible step in the capacity line
8. **Adding an interest_rate_change event** causes capacity to shift AND debt service to change
9. **Existing properties** with IO loans that are past their IO term show declining debt
10. **Selling a property** (saleYear) removes it from debt and income at that year
11. **Equity chart** (`ChartWithRoadmap`) still looks correct — equity should actually improve since debt now declines
12. **Backwards compatibility** — existing scenarios without `ioTermYears` default to 5, render correctly
13. **Chatbot modifications** — changing baseSalary, interestRate, or property details via chat recalculates the chart
14. **PDF export** reflects the improved numbers

---

## Reference Documents

- **Gameplans validation analysis**: `/Users/robknowles/Projects/proppath-validation-gameplans-summary.md` (sections 2, 3, and dial comparison table — especially the BC formula: `BC = 6 x (personal_income + portfolio_rental_income)`)
- **Beta test transcript**: `/Users/robknowles/Downloads/Beta Test Review.pdf` (Adam Young feedback at 12:57 — IO→PI rollover standard practice after 5 years)
- **Competitor screenshot**: Shared by Rob in this session — stacked area chart with grey/gold/dark fills, property labels along top
- **Financial params**: `src/constants/financialParams.ts` — all constants including `RENTAL_RECOGNITION_RATE` (0.80), `ANNUAL_WAGE_GROWTH_RATE` (0.025), `DEFAULT_INTEREST_RATE` (0.0625)
- **Event processing**: `src/utils/eventProcessing.ts` — `getEffectiveInterestRate()`, `getPropertyEffectiveRate()`, `getGrowthRateAdjustment()`
