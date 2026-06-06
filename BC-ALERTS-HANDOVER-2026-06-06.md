# BC Gate & Alerts System — Handover 2026-06-06

## Branch: `bc-gate-entity` (do NOT work on main)

All work is local uncommitted modifications. No edge function deployments this session.

---

## What This Session Accomplished

### 1. Pre-check ↔ Dashboard Divergence — FIXED

The P0 blocker from the previous session. Pre-check said PASS, dashboard said FAIL for the same property.

**Root cause:** Two issues in `planPreCheck.ts`:
- `cumulativeEquityReleased` was hardcoded to 0 — the dashboard mutates this on purchase history entries as equity is extracted, inflating total debt. Pre-check didn't track this.
- Growth rate calculation used simple division (`rate / 2`) instead of compound conversion (`(1+r)^(1/2) - 1`) like the dashboard.

**Fix:** Added equity release tracking loop after each purchase in planPreCheck.ts (mirrors lines 870-882 of useAffordabilityCalculator.ts), switched to `annualRateToPeriodRate()`.

**Also fixed:** `propertyWithInstance` in useAffordabilityCalculator.ts now includes `loanAmount: correctLoanAmount` so the manual placement BC check uses the correct loan amount including capitalized LMI.

**Verified:** Engine BC logs show identical numbers from both pre-check and dashboard for all 5 properties.

### 2. Auto-fix Improvements

- `MAX_PERIOD_PUSH` increased from 8 to 20 (10 years) — auto-fix can search further for a viable slot
- **Pass 4: Drop unfixable properties** — if a property still fails after trust + period push + price reduction, it gets spliced out of the response instead of showing as a red icon
- `changeType: 'dropped'` added to `AutoFixChange` type with explanation text

### 3. Alerts System — NEW (partially working)

#### New component: `src/components/ui/AffordabilityAlert.tsx`
Shared HoverCard (Radix) that wraps any trigger element. Shows on hover:
- Which tests failed (deposit, serviceability, BC ceiling) with surplus/shortfall amounts
- Suggestion text
- **Dismiss** button

#### PropertyCardRow.tsx — Editable Year + Alerts
- Year column now has +/- stepper buttons (was readonly)
- Changing year sets `isManuallyPlaced: true` + `manualPlacementPeriod` via single `updateInstance` call
- When `isBCBlocked && !alertDismissed`: year shows red, wrapped in `AffordabilityAlert`
- Dismiss writes `alertDismissed: true` to the instance (persisted to Supabase)
- Any other field change resets `alertDismissed: false`
- Chart icon in `InvestmentTimelineChart.tsx` also respects `alertDismissed`

#### ConfirmationBrief.tsx — Pre-check + Alerts
- `runPlanPreCheck(editedResponse, profile)` runs via `useMemo` on every edit
- `failureByIndex` map for O(1) lookup
- Failed property blocks get red border + year stepper wrapped in `AffordabilityAlert`
- `alertDismissed` added to NLParseResponse property type and mapped through `nlDataMapper.ts`

### 4. `alertDismissed` Persistence
- Added `alertDismissed?: boolean` to `PropertyInstanceDetails` type
- Dashboard reads/writes via `updateInstance` (survives tab switches, reload, scenario changes)
- ConfirmationBrief writes to `editedResponse` property on dismiss, mapped to instance on confirm

---

## THE BUG — Year reversion from Confirmation Brief

### The problem
User changes a property's year on the ConfirmationBrief (e.g. 2034 → 2032), dismisses the alert, clicks Approve. Dashboard shows the **original** year (2034 or 2033), not the user's edit.

### Evidence
Console shows `[ConfirmPlan] Properties: Array(5)` but the actual targetPeriod values weren't visible in the log. The dashboard consistently renders `period=17` (2033) even though the user changed to 2032 (period=15).

### Where the bug must be
The `targetPeriod` on `editedResponse.properties[i]` is not reflecting the user's year change by the time `handleConfirm` fires. The flow:

1. User clicks year stepper → `onFieldChange('targetPeriod', ((2032 - 2025) * 2) + 1)` = `onFieldChange('targetPeriod', 15)`
2. This calls `updatePropertyField(i, 'targetPeriod', 15)` in ConfirmationBrief
3. `updatePropertyField` does `setEditedResponse(prev => { ...spread with targetPeriod: 15 })`
4. User dismisses alert → calls `updatePropertyField(i, 'alertDismissed', true)` → another setEditedResponse
5. User clicks Approve → `handleConfirm()` reads `editedResponse` and passes to `confirmPlanHandler`

### Likely cause
The `onDismissAlert` callback calls `updatePropertyField(i, 'alertDismissed', true)`. But the ConfirmationBrief's pre-check `useMemo` re-runs whenever `editedResponse` changes. The pre-check creates a `failureByIndex` map. If React batches the state updates in a way that the pre-check useMemo runs between the year change and the dismiss, or if there's a stale closure issue, the targetPeriod might be getting lost.

**Debug approach:** Add a more detailed log in `handleConfirm` that prints the actual targetPeriod values:
```ts
console.warn('[ConfirmPlan] Properties:', response.properties?.map((p, i) => 
  `P${i+1} targetPeriod=${p.targetPeriod} alertDismissed=${p.alertDismissed}`
))
```
This log is already in ChatPanel.tsx:337 but shows `Array(5)` without expansion. Make it log a string instead.

**Alternative approach:** The brief's `YearStepper` wrapped in `AffordabilityAlert` might have a DOM/event issue — the HoverCard could be intercepting the stepper's click events when the alert is showing.

---

## Debug Logging to Remove Before Commit

1. **`src/engine/affordabilityEngine.ts`** line ~506 — `[Engine BC]` console.warn block (added this session)
2. **`src/engine/planPreCheck.ts`** lines ~129, ~199 — `[PreCheck]` console.info blocks (previous session)
3. **`src/hooks/useAffordabilityCalculator.ts`** lines ~1019-1022 — `[Dashboard Engine]` console.warn block (previous session)
4. **`src/components/ChatPanel.tsx`** lines ~337-348 — `[ConfirmPlan]` console.warn blocks (added this session)

---

## Complete File Change List (all uncommitted)

### New files
| File | Lines | Purpose |
|------|-------|---------|
| `src/engine/affordabilityEngine.ts` | ~530 | Pure affordability test functions |
| `src/engine/planPreCheck.ts` | ~450 | Pre-check + auto-fix AI plans |
| `src/components/ui/AffordabilityAlert.tsx` | ~70 | Shared hover alert with dismiss |

### Modified files (this session)
| File | Change |
|------|--------|
| `src/engine/planPreCheck.ts` | Equity release tracking, compound growth rates, MAX_PERIOD_PUSH=20, Pass 4 drop, `dropped` changeType |
| `src/hooks/useAffordabilityCalculator.ts` | `loanAmount` added to `propertyWithInstance`, debug logging |
| `src/engine/affordabilityEngine.ts` | Debug logging (REMOVE) |
| `src/components/PropertyCardRow.tsx` | Editable year stepper, AffordabilityAlert integration, alertDismissed on instance |
| `src/components/ConfirmationBrief.tsx` | Pre-check useMemo, failure display, alertDismissed flow |
| `src/components/InvestmentTimelineChart.tsx` | alertDismissed check on chart icon color |
| `src/components/ChatPanel.tsx` | Debug logging (REMOVE) |
| `src/types/propertyInstance.ts` | Added `alertDismissed?: boolean` |
| `src/types/nlParse.ts` | Added `alertDismissed?: boolean` on property type |
| `src/utils/nlDataMapper.ts` | Maps `alertDismissed` from response to instance |

### Modified files (previous sessions, still uncommitted)
| File | Change |
|------|--------|
| `src/hooks/useAffordabilityCalculator.ts` | Engine extraction, BC gate, entity discounting |
| `src/hooks/useChartDataGenerator.ts` | BC field uses calculateBorrowingCeiling |
| `src/hooks/useRoadmapData.ts` | Filters changed from feasible to period !== Infinity |
| `src/components/BorrowingCapacityChart.tsx` | Offset debt uses entity-discounted debt |
| `src/components/ChartWithRoadmap.tsx` | Dead code (not imported anywhere) |
| `src/components/Dashboard.tsx` | Red warning banner removed |
| `src/components/PropertyCardRow.tsx` | "Blocked" → red year + alerts |
| `src/components/BriefTab.tsx` | Entity selector dropdown |
| `src/components/ConfirmationBrief.tsx` | Entity toggle + AI message + alerts |
| `src/constants/financialParams.ts` | Stale comment fixed |
| `src/utils/nlDataMapper.ts` | BC derivation 8x income + alertDismissed mapping |
| `src/contexts/ClientContext.tsx` | Removed localStorage persistence |
| `supabase/functions/nl-parse/prompt.ts` | BC derivation 8x. **DEPLOYED.** |
| `supabase/functions/nl-parse/tools.ts` | Entity field on tool schemas |
| `supabase/functions/nl-parse/templates.ts` | Auto-mentions trusts |
| `supabase/functions/nl-parse/response-schema.ts` | Entity field |
| `supabase/functions/nl-parse/system-prompt.ts` | Entity section |

---

## Priority for Next Session

### P0: Fix year reversion bug on ConfirmationBrief
The `targetPeriod` edit from the YearStepper doesn't persist through to `handleConfirm`. Debug with expanded logging. Check if the HoverCard wrapper is swallowing click events on the stepper buttons.

### P1: Remove all debug logging
Strip all `console.warn`/`console.info` debug lines before commit.

### P2: Commit everything on `bc-gate-entity`

---

## Test Prompt
```
Combined household income $113,000. Monthly savings $4,500. Monthly expenses $6,900. Liquid savings $10,000. Existing portfolio: 4/6 Cowper Ave, Eagleby QLD 4207 — bought 2024 for $290,000, current value $290,000, loan $165,300 (57% LVR), renting at $256/week, interest only, personal name. 3/113 Marley St, Sale VIC 3850 — bought 2025 for $375,000, current value $375,000, loan $228,750 (61% LVR), renting at $306/week, interest only, held in trust. Currently renting (no PPOR). Goals: retire at 53, target $100,000+ passive income per year. 15 year timeline. Strategy: equity growth, low price point properties. Comfortable with 88% LVR. Interest only loans. Max property price around $450,000.
```
