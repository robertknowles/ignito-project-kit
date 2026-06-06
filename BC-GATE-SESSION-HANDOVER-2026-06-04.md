# Borrowing Capacity Gate — Session Handover (2026-06-04)

**Session scope:** Enforce cumulative borrowing capacity across the entire app. Single source of truth between the BC chart and the affordability calculator.
**State on remote:** Two commits pushed to `origin/main`: `f84917e` (cumulative gate + entity discounts) and `f51bfe7` (single source of truth ceiling + manual placement validation).

---

## 1. What was built and shipped

### 1.1 Cumulative BC gate (commit `f84917e`)

The affordability calculator now checks **total cumulative debt** against BC, not just individual loans. Applied to all 3 code paths:
- **Path A** — `checkAffordability()` (auto-placement)
- **Path B** — `calculateAffordabilityForPeriod()` (live preview)
- **Path C** — `previewPlacementAtPeriod()` (drag-drop validation)

Both per-loan AND cumulative tests must pass: `borrowingCapacityTestPass = perLoanBCPass && cumulativeBCPass`

### 1.2 Entity-based serviceability discounts (commit `f84917e`)

`ENTITY_SERVICEABILITY_FACTORS` in `src/constants/financialParams.ts`:
- Individual: 100%
- Trust: 70% (self-servicing rental income)
- Company: 100%
- SMSF: 0% (limited recourse, fully separate)

SMSF debt excluded from both serviceability AND cumulative BC ceiling. Trust discount only affects serviceability, not BC ceiling.

### 1.3 Single source of truth ceiling (commit `f51bfe7`)

New shared utility: `src/utils/borrowingCapacityCeiling.ts`

Formula (same everywhere):
- Stated BC > 0: `statedBC × (1 + wageGrowth)^yearsElapsed`
- Stated BC = 0: `6 × (salary + partner + rental) × multiplier`

**Equity boost removed from BC ceiling.** Equity is a funding mechanism (helps with deposits via `calculateAvailableFunds`), not a lending ceiling expansion. Banks don't increase your BC because your properties appreciated.

Called by:
1. `BorrowingCapacityChart.tsx` (display)
2. `useAffordabilityCalculator.ts` Path A (auto-placement gate)
3. `useAffordabilityCalculator.ts` timeline display (`borrowingCapacityRemaining`)
4. `useAffordabilityCalculator.ts` Path B (live preview)
5. `useAffordabilityCalculator.ts` Path C (drag-drop)

### 1.4 Manual placement validation (commit `f51bfe7`)

**Root cause discovered:** `nlDataMapper.ts` (the AI chatbot data mapper) sets `isManuallyPlaced = true` on every property it creates with a `targetPeriod`. This caused ALL properties to bypass the affordability gates entirely.

**Fix:** Manual placements now run `checkAffordability()` at the forced period. If they fail, they get `status: 'challenging'` instead of `'feasible'`. Challenging properties are filtered out of chart data by `useChartDataGenerator` (`status === 'feasible'` filter).

### 1.5 Guardrail message updated

`src/utils/guardrailValidator.ts` — violation message changed to "Borrowing capacity exceeded. Total debt surpasses capacity by $X"

---

## 2. Files changed (5 files + 1 new)

| File | What changed |
|---|---|
| `src/constants/financialParams.ts` | Added `ENTITY_SERVICEABILITY_FACTORS` |
| `src/utils/borrowingCapacityCeiling.ts` | **NEW** — shared BC ceiling function |
| `src/hooks/useAffordabilityCalculator.ts` | Cumulative gate, entity discounts, shared ceiling, manual placement validation |
| `src/components/BorrowingCapacityChart.tsx` | Refactored to use shared ceiling function |
| `src/utils/guardrailValidator.ts` | Updated violation message |

---

## 3. What's NOT done — the remaining disconnect

### 3.1 Purchases table shows all properties regardless of feasibility

The `PropertyCardRow.tsx` purchases table shows every property the AI added, even those marked `'challenging'` by the BC gate. There's no visual indicator (red row, warning badge, strikethrough) showing a property is blocked.

**Impact:** The user sees 3 rows in the purchases table but only 2 property icons on the equity chart. Confusing.

**Fix needed:** Read `status` from `timelineProperties` and visually mark infeasible rows. Options:
- Red/orange background on the row
- "Exceeds BC" badge in the Year column
- Greyed-out row with tooltip explaining why
- Row action to "Remove" or "Defer"

### 3.2 Brief flow doesn't check BC

When the AI chatbot proposes a property and the brief pops up for approval, it does NOT run the cumulative BC gate. The user approves without knowing the property would push total debt past the ceiling.

**Fix needed:** The brief approval flow should call the affordability check before presenting the property. If it fails BC, show a warning: "This purchase would push total debt to $X, exceeding your $Y borrowing capacity."

### 3.3 AI chatbot doesn't know about cumulative BC

The AI chatbot (`nlDataMapper.ts`) places properties at target periods without checking cumulative affordability. It should either:
- Check affordability before suggesting a period
- Or flag that the suggested plan needs validation

### 3.4 No visual feedback on charts for blocked properties

The BC chart correctly shows liabilities below the ceiling (blocked properties excluded). But there's no indication that properties WERE blocked. The user needs to understand why their 4-property plan became a 2-property plan.

**Options:**
- Ghost icons on the equity chart for blocked properties (greyed out, with red X)
- A summary banner: "2 of 4 planned purchases exceed borrowing capacity"
- Blocked properties shown in red on the BC chart

### 3.5 Entity switching doesn't visually update

When switching a property from Individual to Trust, the entity discount only affects serviceability. If serviceability isn't the binding constraint (deposit or BC is), there's no visible change. This is correct behavior but confusing for the user.

**Fix needed:** Show a tooltip or indicator explaining which test is the binding constraint for each property.

---

## 4. How the data flows (verified working)

```
AI chatbot → nlDataMapper.ts → sets isManuallyPlaced=true + targetPeriod
                                          ↓
                        useAffordabilityCalculator
                          ├── checkAffordability() runs at forced period
                          ├── marks status: 'feasible' or 'challenging'
                          └── produces timelineProperties[]
                                          ↓
                    ┌─────────────────────┼─────────────────────┐
                    ↓                     ↓                     ↓
          useChartDataGenerator    useRoadmapData     FinancialSummaryTable
          (filters: feasible)    (reads timeline)    (reads timeline)
                    ↓                     ↓                     ↓
          ┌────────┼────────┐      Roadmap view        Projections table
          ↓        ↓        ↓
     Equity    Cashflow    BC Chart
     chart     chart    (shared ceiling fn)
```

All charts and the projections table read from `timelineProperties` which is now gated by cumulative BC. The BC chart uses the same `calculateBorrowingCeiling()` function as the affordability calculator. **One source of truth.**

---

## 5. Test scenarios

### Scenario A: $500k BC, $600k existing debt (cofounder's test)
- **Expected:** ALL purchases blocked (existing debt > ceiling)
- **Verified:** BC chart shows no property icons, liabilities below capacity ✅

### Scenario B: $1.5M BC, 4 properties
- **Expected:** 3 approved, 4th blocked (cumulative $1.82M > ceiling $1.62M)
- **Verified:** 4th property blocked, first 3 show on charts ✅

### Scenario C: Adam & Monique (6× DTI, no stated BC)
- **Expected:** No change from before (deposit-constrained, BC ceiling ~$2.2M well above debt)
- **Not yet tested** — needs verification

---

## 6. Next session priorities

### P0 — Visual consistency for blocked properties
The purchases table and brief need to reflect blocked properties. This is what the user's cofounder flagged — the table shows 3 properties but the charts show 2. See section 3.1-3.4.

### P1 — Remove debug logging
Verify no `console.log` statements remain from the `[BC-GATE]` diagnostics. (Should be clean — removed before commit.)

### P2 — Test the Adam scenario end-to-end
The Gameplans calibration scenario needs to be re-tested with the new ceiling formula to confirm no regression.

### P3 — BC chart visual feedback for blocked properties
Red/ghost icons on the equity chart or BC chart for properties that were blocked by the gate.
