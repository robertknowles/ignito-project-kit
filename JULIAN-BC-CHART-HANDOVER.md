# Borrowing Capacity Chart — Session Handover

**Date:** 2026-06-04
**Original spec:** `BORROWING-CAPACITY-CHART-SPEC.md` (still in project root — the full build spec with input maps, data flow diagrams, and 14-point validation checklist)
**Gameplans reference:** `/Users/robknowles/Projects/proppath-validation-gameplans-summary.md` (sections 2–3 cover the BC formula and offset cascade)

---

## What was done (14 files, 261 lines added)

### 1. IO→PI Rollover — Per-Property Amortisation Engine

**The core fix.** Previously `calculatePortfolioMetrics()` in `metricsCalculator.ts` used `purchase.loanAmount` as a flat constant forever — debt never declined. Now:

- **New function `calculateRemainingLoanBalance()`** (`src/utils/metricsCalculator.ts` line ~191) models three loan states:
  - `PI` from day 1 → standard amortisation formula
  - `IO` within IO term → balance unchanged (equals original loan amount)
  - `IO` past IO term → amortises as P&I for the remaining `(loanTerm - ioTermYears)` years
- **`calculatePortfolioMetrics()`** (line ~253) now calls this instead of using flat `purchase.loanAmount`
- **New `ioTermYears` field** added to `PropertyInstanceDetails`, `ExistingProperty`, and `PropertyPurchase` types — default 5 years everywhere
- **`property-defaults.json`** — all 10 cell entries have `"ioTermYears": 5`
- **`propertyInstanceDefaults.ts`** — `createMinimalDefaults()` includes `ioTermYears: 5`

### 2. Loan Fields Wired Through Chart Pipeline

`useChartDataGenerator.ts` (line ~169) now passes `loanType`, `loanTerm`, and `ioTermYears` from each property instance into the `PropertyPurchase` objects that feed `calculatePortfolioMetrics()`.

**Existing properties** (the `existingProperties.forEach` loop at line ~217) now amortise per-property using `calculateRemainingLoanBalance()` with each property's `boughtYear`, `loanType`, `loanTerm`, and `ioTermYears`. Previously this loop just summed `ep.loan` as a flat value.

### 3. Borrowing Capacity Formula Fixed

**Old formula** in `BorrowingCapacityChart.tsx`:
```
BC = (income + rental) × multiplier
```

**New formula:**
```
assessedRepayments = totalDebt × (effectiveRate + 3% APRA buffer)
BC = max(0, (income + partnerIncome + rental − assessedRepayments) × multiplier)
```

This means capacity **dips at each purchase** (because debt jumps → assessed repayments jump → net income drops) then **recovers** as wage growth and rental growth increase income over time.

**New constant:** `ASSESSMENT_RATE_BUFFER = 0.03` in `financialParams.ts`

### 4. Salary & Interest Rate Events Now Processed

Two new helper functions in `src/utils/eventProcessing.ts`:
- `getEffectiveSalary(period, baseSalary, events)` — applies `salary_change` events
- `getEffectivePartnerIncome(period, events)` — applies `partner_income_change` events (starts at 0 since there's no `partnerSalary` on the profile)

The BC chart imports `usePropertySelection` to get `eventBlocks` and passes them through `getEffectiveInterestRate()` (already existed) and these two new functions.

### 5. Offset Debt Fixed

**Old:** `offsetDebt = min(availableFunds, totalDebt)` where `availableFunds` included property equity — massively inflated.

**New:** Added `cashOffset` field to `PortfolioGrowthDataPoint` in `useChartDataGenerator.ts`:
```
cashOffset = depositPool + cumulativeSavings − depositsUsed + cashFromSales
```
No equity included. The BC chart uses `d.cashOffset` instead of `d.availableFunds`. The `availableFunds` field is **unchanged** — all other consumers (equity chart, financial summary, etc.) still read it as before.

### 6. Visual Redesign

- **Solid stacked fills** replacing near-invisible gradients:
  - Capacity: `#E9D7FE` fill, `#7F56D9` stroke (PropPath brand purple)
  - Liabilities: `rgba(83,88,98,0.25)` fill, `#414651` stroke (neutral grey)
  - Offset: `rgba(214,187,251,0.40)` fill, `#9E77ED` stroke (brand300/500)
- **No Y axis** — matches equity and cashflow charts
- **Property purchase icons** on the capacity line — uses the same `getPropertyIconPath()` + SVG `<circle>` + `<path>` pattern as `InvestmentTimelineChart.tsx`. Same sizes (`bgSize=26`, `iconSize=14`), same UUI stroke icons, same vertical stacking.

### 7. Dashboard Integration

`BorrowingCapacityChart` was defined but never rendered. Added it to `Dashboard.tsx` below the Net Cashflow chart, wrapped in a `ChartCard` with a three-item legend (Borrowing Capacity, Total Liabilities, Offset Debt).

### 8. IO Term Editable in UI

- **`PropertyCardRow.tsx`** — IO Term column added to both `EQUITY_COLUMNS` and `PURCHASES_COLUMNS` (NumberInput, value `ioTermYears ?? 5`)
- **`PortfolioTab.tsx`** — IO Term column added to existing properties table `COLUMNS`

---

## Files changed (in dependency order)

| File | What changed |
|---|---|
| `src/types/propertyInstance.ts` | Added `ioTermYears?: number` |
| `src/types/existingProperty.ts` | Added `ioTermYears?: number` |
| `src/types/property.ts` | Added `loanType`, `loanTerm`, `ioTermYears` to `PropertyPurchase` |
| `src/utils/propertyInstanceDefaults.ts` | Added `ioTermYears: 5` to minimal defaults |
| `src/data/property-defaults.json` | Added `"ioTermYears": 5` to all 10 cells |
| `src/constants/financialParams.ts` | Added `ASSESSMENT_RATE_BUFFER = 0.03` |
| `src/utils/metricsCalculator.ts` | New `calculateRemainingLoanBalance()`, updated `calculatePortfolioMetrics()` to use it |
| `src/utils/eventProcessing.ts` | New `getEffectiveSalary()`, `getEffectivePartnerIncome()` |
| `src/hooks/useChartDataGenerator.ts` | Wired loan fields into PropertyPurchase, amortised existing property debt per-property, added `cashOffset` field |
| `src/components/BorrowingCapacityChart.tsx` | Complete rewrite — new formula, new visual, property icons on line |
| `src/components/Dashboard.tsx` | Added BC chart rendering with ChartCard + legend |
| `src/components/PropertyCardRow.tsx` | IO Term column in EQUITY_COLUMNS and PURCHASES_COLUMNS |
| `src/components/PortfolioTab.tsx` | IO Term column in existing properties table |
| `src/hooks/useRoadmapData.ts` | Minor — already had changes in working tree |

---

## What was NOT done (remaining from the spec)

### From the validation checklist (items not yet verified):

- [ ] **Item 7:** Adding a `salary_change` event causes a visible step in the capacity line — code is wired but not visually tested
- [ ] **Item 8:** Adding an `interest_rate_change` event shifts both capacity and debt service — code is wired but not visually tested
- [ ] **Item 9:** Existing properties with IO loans past their IO term show declining debt — code is correct but not visually tested with a scenario that has existing properties with `boughtYear` far enough back
- [ ] **Item 10:** Selling a property (saleYear) removes it from debt and income — existing logic unchanged, should work but not retested
- [ ] **Item 13:** Chatbot modifications recalculate the chart — relies on existing reactivity, not tested
- [ ] **Item 14:** PDF export reflects improved numbers — not tested

### From the spec — nice-to-haves not built:

- **"Exclude debt" toggle with property chips** (spec section E, noted as "nice to have, not essential for v1")
- **`ConfirmationBrief.tsx`** — IO term not added to the new property summary blocks (spec item 10, noted as "optional for v1")

### Architectural notes for next session:

1. **`useRoadmapData.ts`** also calls metrics functions. It was already modified in the working tree before this session. The amortisation fix in `calculatePortfolioMetrics()` flows through to it automatically since it calls the same function, but check that roadmap visualisation still looks correct.

2. **`calculateExistingPortfolioMetrics()`** (metricsCalculator.ts line ~272) still takes `currentDebt` as a flat number — the amortisation for existing properties happens in the per-property loop in `useChartDataGenerator.ts` BEFORE calling this function (the amortised sum is passed in). This is by design to avoid breaking the function signature, but it means any other caller of `calculateExistingPortfolioMetrics()` that doesn't do per-property amortisation will still get flat debt.

3. **`profile.ioToPiTransitionYears`** (the portfolio-wide consolidation year concept) is **unchanged**. It still drives `useFinancialFreedomProjection` and consolidation year calcs. The new per-property `ioTermYears` is a separate, more granular concept. They coexist.

4. **Backward compatibility:** Saved scenarios without `ioTermYears` will now show IO loans starting to amortise after year 5 (the default). This is the **intended behavioral change** — previously debt never declined at all, which was the bug.

---

## How to verify

```bash
npm run dev    # port 8080
```

1. Open the dashboard with a client that has 2+ feasible properties
2. Scroll to the Borrowing Capacity chart below Net Cashflow
3. **Debt declines:** Grey area should shrink after ~year 5 of each property (IO→PI rollover)
4. **Capacity dips:** Purple capacity line dips at each purchase year, recovers over time
5. **Offset is small:** Light purple offset area at bottom should be much smaller than debt
6. **Icons on line:** Small circular UUI icons sitting on the capacity line at purchase years
7. **Edit IO term:** Go to Purchases table → change IO Term from 5 to 10 → chart should update (debt stays flat longer before declining)
8. **Equity chart check:** Scroll up — equity should still look correct (will be slightly higher now since debt declines)

---

## Reference docs

- **Full build spec:** `BORROWING-CAPACITY-CHART-SPEC.md` — complete input map, data flow diagram, file list, validation checklist
- **Gameplans calibration:** `/Users/robknowles/Projects/proppath-validation-gameplans-summary.md` — sections 2 (BC formula: `6 × (personal_income + portfolio_rental_income)`) and 3 (offset cascade)
- **Implementation plan:** `.claude/plans/cuddly-meandering-catmull.md`
