# Borrowing Capacity Chart — Session Report (2026-06-04)

**Session scope:** Gameplans calibration of the BC chart, formula alignment, display fixes, discovery of a critical affordability calculator issue.
**State on remote:** All BC chart changes were **REVERTED** from `origin/main`. Remote is clean. Changes exist locally only (via a revert-of-revert).
**Key finding:** The BC chart works correctly as a display, but the affordability calculator (`useAffordabilityCalculator`) does not enforce cumulative borrowing capacity — it tests each loan individually, allowing plans that far exceed stated BC. This must be fixed before the BC chart changes can ship.

---

## 1. What was built (all changes are local, not on remote)

### 1.1 BC Formula — Two modes

**File:** `src/components/BorrowingCapacityChart.tsx`

The capacity line now supports two modes:

**Mode A — Stated BC (when `profile.borrowingCapacity > 0`):**
```
borrowingCeiling = statedBC × (1 + wageGrowth)^yearsElapsed
```
Uses the broker-assessed or user-entered BC as the year-1 anchor, then grows it with wage growth. This is the realistic mode — it reflects what a real lender would approve.

**Mode B — Computed fallback (when `profile.borrowingCapacity` is 0 or empty):**
```
borrowingCeiling = 6 × (salary + partnerIncome + capturedRental)
```
Matches Gameplans' convention: gross capacity = 6× DTI on total income including portfolio rental. No repayment deduction — commitments are shown separately via the Total Liabilities area.

**Previous formula (removed):**
```
assessedRepayments = totalDebt × (interestRate + 3% APRA buffer)
BC = max(0, (income + rental − assessedRepayments) × 6)
```
This was removed because it baked commitment deductions into the BC line, making it ~30-40% lower than Gameplans and hiding the headroom story. The ASSESSMENT_RATE_BUFFER constant remains in financialParams.ts but is no longer imported by the chart.

### 1.2 Offset Debt — Net debt exposure display

**Previous:** `offsetDebt = min(cashSavings, grossDebt)` — showed accumulating cash balance
**New:** `offsetDebt = max(0, grossDebt − min(cashSavings, grossDebt))` — shows net debt exposure (debt not covered by offset cash)

This matches Gameplans' display convention:
- Total Liabilities = gross outstanding loan balances
- Offset Debt = the portion of debt NOT covered by offset savings (net exposure)
- Visual gap between them = cash deployed in offset accounts
- When offset debt hits zero = client is effectively debt-free (all debt neutralised by offset cash)

### 1.3 IO→PI Amortisation Engine

**File:** `src/utils/metricsCalculator.ts`

New function `calculateRemainingLoanBalance()` models three loan states:
- `PI` from day 1 → standard amortisation formula
- `IO` within IO term → balance unchanged (= original loan amount)
- `IO` past IO term → amortises as P&I for remaining `(loanTerm - ioTermYears)` years

`calculatePortfolioMetrics()` now calls this instead of using flat `purchase.loanAmount`.

### 1.4 Per-property loan fields wired through pipeline

**File:** `src/hooks/useChartDataGenerator.ts`

`loanType`, `loanTerm`, and `ioTermYears` now flow from each property instance into the `PropertyPurchase` objects that feed `calculatePortfolioMetrics()`. Existing properties also amortise per-property.

### 1.5 New `ioTermYears` field

Added to `PropertyInstanceDetails`, `ExistingProperty`, and `PropertyPurchase` types. Default 5 years everywhere. Editable in:
- `PropertyCardRow.tsx` — EQUITY_COLUMNS and PURCHASES_COLUMNS
- `PortfolioTab.tsx` — existing properties table

### 1.6 Salary and partner income events

**File:** `src/utils/eventProcessing.ts`

Two new functions:
- `getEffectiveSalary(period, baseSalary, events)` — applies `salary_change` events
- `getEffectivePartnerIncome(period, events)` — applies `partner_income_change` events

The BC chart imports `usePropertySelection` to get `eventBlocks` and passes them through these functions.

### 1.7 Cash offset field (equity excluded)

**File:** `src/hooks/useChartDataGenerator.ts`

New `cashOffset` field on `PortfolioGrowthDataPoint`:
```
cashOffset = depositPool + cumulativeSavings − depositsUsed + cashFromSales
```
No equity included. The `availableFunds` field is unchanged for all other consumers.

### 1.8 Tooltip updates

The tooltip now shows:
- **Capacity** — the BC ceiling
- **Total Liabilities** — gross outstanding debt
- **Debt not Offset** — net debt exposure (gross − offset cash)
- **Headroom** — capacity minus liabilities (red when negative)
- **Offset Cash** — savings deployed against debt (derived: liabilities − net exposure)

### 1.9 Dashboard integration

`BorrowingCapacityChart` rendered in `Dashboard.tsx` below Net Cashflow chart with ChartCard and three-item legend.

### 1.10 Constants

`ASSESSMENT_RATE_BUFFER = 0.03` added to `financialParams.ts` (no longer used by chart, but available for future use).

---

## 2. Files changed (14 files)

| File | What changed |
|---|---|
| `src/components/BorrowingCapacityChart.tsx` | Complete rewrite — two-mode BC formula, net-debt offset display, updated tooltip, property purchase icons |
| `src/components/Dashboard.tsx` | Added BC chart rendering with ChartCard + legend |
| `src/components/PropertyCardRow.tsx` | IO Term column in EQUITY_COLUMNS and PURCHASES_COLUMNS |
| `src/components/PortfolioTab.tsx` | IO Term column in existing properties table |
| `src/types/propertyInstance.ts` | Added `ioTermYears?: number` |
| `src/types/existingProperty.ts` | Added `ioTermYears?: number` |
| `src/types/property.ts` | Added `loanType`, `loanTerm`, `ioTermYears` to `PropertyPurchase` |
| `src/utils/propertyInstanceDefaults.ts` | Added `ioTermYears: 5` to minimal defaults |
| `src/data/property-defaults.json` | Added `"ioTermYears": 5` to all 10 cells |
| `src/constants/financialParams.ts` | Added `ASSESSMENT_RATE_BUFFER = 0.03` |
| `src/utils/metricsCalculator.ts` | New `calculateRemainingLoanBalance()`, updated `calculatePortfolioMetrics()` |
| `src/utils/eventProcessing.ts` | New `getEffectiveSalary()`, `getEffectivePartnerIncome()` |
| `src/hooks/useChartDataGenerator.ts` | Wired loan fields, per-property existing debt amortisation, added `cashOffset` |
| `src/hooks/useRoadmapData.ts` | Minor — already had changes in working tree |

---

## 3. The Gameplans calibration process

### 3.1 Test scenario

Adam & Monique scenario from `/Users/robknowles/Projects/knowledge/proppath-adam-scenario-spec-2026-05-27.md`:
- Combined income: $288,173 ($175k Adam + $113,173 Monique)
- Savings: $4,500/mo ($54k/yr), deposit pool $75k
- 2 existing IPs (Cowper QLD $577.5k, Marley VIC $540.75k)
- 4 future purchases (2×$350k 2026, $450k 2027, $450k 2028), all QLD, 88% LVR, IO @ 6%
- Gameplans 2036 targets: $3.39M value / $1.74M debt / $1.65M equity / $45,443 cashflow

### 3.2 Three divergences identified and resolved

**Divergence 1 — BC 30-40% too low (RESOLVED)**
Our old formula deducted assessed repayments from the BC line: `(income + rental − debt×9%) × 6`. Gameplans uses gross `6 × (income + rental)` with commitments shown separately. Fix: removed the deduction; commitments are now the Total Liabilities area.

Validation: `6 × ($288k + ~$85k rental) = ~$2,240k` ≈ Gameplans' ~$2,200k. Confirmed match.

**Divergence 2 — Offset "10× too low" (RESOLVED — was a chart-reading error)**
We were comparing PropPath's accumulating cash-in-offset against Gameplans' net-debt-exposure line. Different quantities. Gameplans' "Offset Debt" = net debt = gross debt minus offset cash. It starts near gross debt (little cash initially) and declines to zero as savings accumulate. Once we matched this display convention, the numbers aligned.

Key insight from cowork session: *"your 2045 debt ($1,122k) and offset ($1,122k) are identical. Your net debt is already ~$0 — which matches Gameplans."*

**Divergence 3 — Debt declining faster in Gameplans (RESOLVED — same chart-reading error)**
We were comparing PropPath's gross debt against Gameplans' net-debt line. The only hard number from Gameplans is Total Debt @2036 = $1,738k. PropPath gross debt @2036 = $1,546k — actually *below* Gameplans, not lagging.

### 3.3 Additional finding — stated BC vs computed BC

Gameplans does not take a stated borrowing capacity as input. They compute `6 × (income + rental)` from the employment data. The $500k BC that was in our scenario was a PropPath placeholder, not from Gameplans research. The Adam scenario spec at `/Users/robknowles/Projects/knowledge/proppath-adam-scenario-spec-2026-05-27.md` has the definitive inputs.

We implemented two-mode BC (stated vs computed fallback) so that when a broker-assessed figure exists, it drives the chart honestly. When empty, the Gameplans-style 6× DTI kicks in.

---

## 4. The critical issue discovered — affordability calculator does not enforce cumulative BC

### 4.1 The problem

When a colleague tested a scenario with BC = $700k and 3 property purchases, the BC chart correctly showed headroom going negative (red) at purchase 2. But the engine had already placed all 3 purchases — it didn't reject them.

**Root cause:** `useAffordabilityCalculator.ts` line 878:
```js
const borrowingCapacityTestPass = newLoanAmount <= effectiveBorrowingCapacity;
```

This tests each **individual loan** against `(profile.borrowingCapacity + equityBoost)`. It does NOT test **cumulative debt** against BC. So if BC is $700k and each property's loan is $350k at 88% LVR = $308k, each one passes individually ($308k ≤ $700k) even though combined they total $924k — well past the $700k ceiling.

### 4.2 The second problem — BC × SERVICEABILITY_FACTOR

Line 870:
```js
const baseCapacity = profile.borrowingCapacity * SERVICEABILITY_FACTOR;
```
Where `SERVICEABILITY_FACTOR = 0.10`. For a $700k BC, this produces $70k "annual payment capacity" for the serviceability test. This is a completely different interpretation of the BC field than the chart uses (where it's a total lending ceiling).

### 4.3 Impact

**Every plan generated by the engine can exceed the stated borrowing capacity.** The BC test only gates individual loan size, not cumulative exposure. A client with $700k BC can end up with $1.5M+ in total debt if the engine places multiple properties that each individually pass the per-loan test.

This means:
- Plans shown to clients may not be achievable with their actual borrowing power
- The BC chart (once shipped) will honestly show the breach, but the plan shouldn't have been created in the first place
- BAs presenting these plans to mortgage brokers will lose credibility

### 4.4 Required fix (next session)

The affordability calculator needs a cumulative BC gate:

```js
// After each purchase, check total debt doesn't exceed capacity
const totalDebtAfterPurchase = existingDebt + sumOfPreviousLoans + newLoan;
const cumulativeBCPass = totalDebtAfterPurchase <= effectiveBorrowingCapacity;
```

This should be tested alongside the existing per-loan test. Properties that breach cumulative BC should be marked infeasible.

**Important:** `effectiveBorrowingCapacity` already includes equity boost (`profile.borrowingCapacity + equityBoost`), so the cumulative test naturally accounts for equity release expanding capacity.

---

## 5. What must be tested before pushing

### 5.1 BC chart display tests

- [ ] **Stated BC mode:** Enter a BC value → capacity line starts at that value, grows with wage growth
- [ ] **Computed fallback mode:** Clear BC field → capacity line uses `6 × (income + rental)`
- [ ] **Headroom goes red:** When liabilities exceed capacity, headroom shows negative in red
- [ ] **Offset debt reaches zero:** With sufficient savings over time, net exposure declines to 0
- [ ] **IO→PI amortisation visible:** Debt holds flat for 5 years per property, then declines
- [ ] **Property icons on capacity line:** Purchase year dots render correctly
- [ ] **Tooltip values reconcile:** Capacity + Headroom should equal Total Liabilities at headroom = 0 crossover

### 5.2 Affordability calculator integration tests

- [ ] **Cumulative BC gate works:** Plan with BC = $700k should not place purchases that push total debt past $700k (+ equity boost)
- [ ] **Per-loan test still works:** Individual loans larger than BC are still rejected
- [ ] **Equity boost correctly expands capacity:** As properties appreciate and equity is released, the effective BC ceiling rises, potentially allowing later purchases that wouldn't have been feasible earlier
- [ ] **Existing debt counted:** Starting debt from existing properties counts toward the cumulative total
- [ ] **Sold properties reduce debt:** When a property is sold, its debt is removed from the cumulative total, freeing up capacity

### 5.3 Cross-chart consistency tests

- [ ] **Equity chart still correct:** `ChartWithRoadmap.tsx` reads from `portfolioGrowthData.totalDebt` — with amortisation this should now show equity growing faster (more accurate)
- [ ] **Cashflow chart unaffected:** The cashOffset field is new; `availableFunds` is unchanged
- [ ] **Financial summary table:** Debt figures should reflect amortised balances
- [ ] **Roadmap data:** `useRoadmapData.ts` calls the same metrics functions — verify roadmap visualisation still renders correctly
- [ ] **PDF export:** If PDF includes the BC chart or debt figures, verify they match dashboard

### 5.4 Edge case tests

- [ ] **No properties:** Empty scenario should show capacity line only (no liabilities, no offset)
- [ ] **Existing properties only:** No purchases — just existing portfolio debt declining over time
- [ ] **All IO loans:** Debt stays flat for full IO term, then drops
- [ ] **All PI loans:** Debt declines from day 1
- [ ] **Mixed IO/PI:** Some flat, some declining — verify per-property logic
- [ ] **Property sale:** Selling a property removes its debt from liabilities
- [ ] **Zero income:** Edge case — capacity should be 0 or very low
- [ ] **Very high income:** Verify capacity doesn't produce absurd numbers (consider retirement taper, future work)

### 5.5 Gameplans calibration validation

- [ ] **Adam scenario @2036:** Gross debt ~$1,546k (Gameplans: $1,738k — we're within range given different LVRs)
- [ ] **Net debt reaches $0 by ~2044:** Offset cash fully covers gross debt
- [ ] **BC with $288k income:** `6 × ($288k + ~$85k rental) ≈ $2,240k` — matches Gameplans ~$2,200k
- [ ] **Capacity shape:** Grows steadily with wage growth, no dips (when using computed fallback)

---

## 6. Known remaining issues (not addressed this session)

### 6.1 Retirement taper (future work)

Lenders reduce capacity as borrowers approach retirement age (55-65). Our capacity line grows forever with wage growth, showing $5M+ capacity at age 80. This is unrealistic but matches Gameplans' current display. Worth implementing as a product differentiator.

### 6.2 Cowper Ave sale reconciliation

The Adam scenario shows 2029 total debt of $1,665k. Expected: $394k existing + $1,408k new = $1,802k. The ~$137k gap is likely the Cowper sale ($165k loan removed), but the sell toggle configuration and exact timing need to be verified.

### 6.3 Offset-adjusted amortisation (future work)

In reality, cash in an offset account reduces interest charged, meaning more of each P&I payment goes to principal — accelerating paydown. Our amortisation uses the raw interest rate. This is second-order (the net debt endpoint is correct either way) but would improve the gross debt decline curve.

### 6.4 Savings cascade per-property (future work)

Gameplans allocates offset cash to individual loans in priority order (PPOR first, then highest-interest). When a loan is fully offset, it's "excluded" and the cascade moves to the next. Our model does global netting (`min(totalCash, totalDebt)`), which produces the same net exposure but doesn't show the per-property cascade. Gameplans exposes this via the "Exclude debt (as per year)" toggle with per-property chips showing when each loan is fully offset.

### 6.5 `SERVICEABILITY_FACTOR` usage in affordability calculator

Line 870 of `useAffordabilityCalculator.ts` uses `profile.borrowingCapacity * SERVICEABILITY_FACTOR` (0.10) as annual payment capacity. This interpretation of BC is different from the total-lending-ceiling interpretation. This duality needs to be reconciled as part of the cumulative BC fix.

---

## 7. Git state

### Remote (`origin/main`)
Clean. BC chart changes were pushed as commit `5fccc81`, then reverted via commit `99412db`. Remote tip is the revert.

### Local (`main`)
Has all BC chart changes re-applied via a revert-of-revert (commit `9aee596`). Local is 1 commit ahead of remote.

### To resume work
The local branch has everything. Start from here. Do NOT push to remote until the affordability calculator cumulative BC gate is implemented and all tests in Section 5 pass.

### Unstaged files (not part of the BC work)
- `.claude/settings.local.json` — local Claude settings, don't commit
- `src/hooks/useRoadmapData.ts` — had changes before this session, not part of BC work
- `BORROWING-CAPACITY-CHART-SPEC.md` — the original build spec (untracked)
- `JULIAN-BC-CHART-HANDOVER.md` — previous session's handover (untracked)
- `JULIAN-SHIP-CHECKLIST-2026-06-01.md` — unrelated checklist (untracked)

---

## 8. Reference documents

- **Adam scenario spec:** `/Users/robknowles/Projects/knowledge/proppath-adam-scenario-spec-2026-05-27.md`
- **Original BC build spec:** `BORROWING-CAPACITY-CHART-SPEC.md` (project root)
- **Previous session handover:** `JULIAN-BC-CHART-HANDOVER.md` (project root)
- **Gameplans calibration doc:** `/Users/robknowles/Projects/proppath-validation-gameplans-summary.md`
- **Gameplans replication handover:** `/Users/robknowles/Projects/proppath-gameplans-replication-handover-2026-04-29.md`
- **Gameplans holy grail comparison:** `/Users/robknowles/Projects/Cowork_Knowledge/gameplans-vs-presme-holy-grail-2026-05-18.md`
- **Implementation plan:** `.claude/plans/cuddly-meandering-catmull.md`

---

## 9. Recommended next session priorities

### P0 — Fix affordability calculator cumulative BC gate
The engine must reject purchases that push total debt past `effectiveBorrowingCapacity`. This is the blocker for shipping the BC chart. Without it, the chart will show plans that aren't achievable.

### P1 — Push BC chart changes
Once the cumulative gate works, re-run the full test suite in Section 5, then push.

### P2 — Validate with colleague's scenario
Re-test the $700k BC scenario that exposed the issue. Verify that the engine now limits purchases to stay within capacity, and the BC chart reflects this honestly.

### P3 — Gameplans comparison re-run
With the Adam scenario fully configured (correct income, correct existing property values, correct deposits), re-run the Gameplans comparison and capture screenshots for the calibration writeup.
