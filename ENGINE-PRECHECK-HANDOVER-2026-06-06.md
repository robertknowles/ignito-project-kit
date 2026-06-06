# Engine Pre-Check & Auto-Fix — Handover 2026-06-06

## Branch: `bc-gate-entity` (do NOT work on main)

All work is local uncommitted modifications. The edge function `nl-parse` was deployed in the previous session (8x BC prompt). This session did NOT deploy anything.

---

## The Story — How This Session Went (READ THIS FIRST)

This session picked up from the engine extraction handover. Three issues were flagged: red icons not showing on the chart, the AI pre-check feedback loop untested, and potential numerical divergence between the pre-check and dashboard. We fixed the first, completely rethought the second, and hit a wall on the third that the next session needs to crack.

### The red icons — wrong component entirely

The previous session spent time adding CSS filters and red borders to `DraggablePropertyIcon` in `ChartWithRoadmap.tsx`. The icons never turned red. This session diagnosed the root cause in about 10 minutes: `ChartWithRoadmap.tsx` is **dead code**. It's exported but never imported anywhere. The actual chart visible on the "Portfolio Plan" tab is `InvestmentTimelineChart.tsx`, which renders icons as SVG `ReferenceDot` elements — completely different rendering path. The fix was straightforward: add a `timelineProperties.find()` lookup in the ReferenceDot's shape callback and apply red stroke when `status === 'challenging'`. Worked immediately.

### The pre-check feedback loop — four iterations of rethinking

This is where most of the session went. The previous session designed a feedback loop: pre-check → send failure data to AI → AI adjusts and resubmits → show the better plan. In practice:

**Attempt 1: AI retry loop.** The pre-check caught failures, sent a feedback message to the AI via `sendMessageRef.current()`. Problem: the AI responded with a text message ("Built a 5-property plan...") instead of calling `create_plan` again. The confirmation brief never appeared because `handlePlanGenerated` was only called on tool calls. We added a 15-second timeout fallback, but that meant 15 seconds of dead air followed by the original failing plan.

**Rob's reaction:** "This really isn't an exciting user experience whatsoever. Takes ages, still produces an incorrect plan."

**Attempt 2: Show the brief immediately, annotate failures.** Skip the AI, show the brief right away, let the user see which properties fail. Rob's concern: "Then the user is always trying to solve their own issues with no clear idea of how to. Our software is meant to be AI driven."

**Rob's key insight:** "Why can't the system — if it's so quick — just tell the AI what the issue is? Then the AI can simply resolve with cheaper purchases if it's deposit, lower purchasing costs if it's cashflow, or trusts for serviceability. If none of that works, properties just occur over a much longer period."

**Attempt 3: Client-side auto-fix.** This became the design. The engine knows exactly what failed and by how much. The fixes are mechanical — trust for serviceability/BC, push to later period for capacity growth, reduce price for deposit. No AI round-trip needed. The AI does the hard creative work (choosing properties, strategy, timing). The engine does the mechanical validation and adjustment.

But Rob also wanted the AI's explanation visible: "Even if there are failures we still want to explain the decisions as the AI would in its response." Since the chat panel hides when the confirmation brief appears, we put the AI's `response.message` text directly on the brief as a subtle note in UUI styling.

**The auto-fix chain works.** It correctly:
- Identifies failing properties (BC exceeded by $11k at period 7)
- Flips entities to trust when not already set
- Pushes to later periods when trust is already set (period 7 → 9, finds BC passes with +59k headroom)
- Re-checks after each fix

But then the user approves the brief, the dashboard renders, and the property is still red.

### The divergence — where we got stuck

The pre-check and the dashboard's `useAffordabilityCalculator` both call `checkAffordability()` from `affordabilityEngine.ts`. Same function. But they get different answers for the same property at the same period.

**Pre-check says:** Property 4 at period 9, BC=PASS with +59k headroom
**Dashboard says:** Property 4 at period 9, BC_rem=0k (negative, clamped), status=challenging

We verified the profiles match — both show `{BC: 904000, salary: 113000, deposit: 10000, savings: 54000, currentDebt: 394050}`. The divergence is NOT in the profile values anymore (we fixed that by passing the actual `profile` from React context into the pre-check).

The divergence is in **how the two callers prepare the inputs** before calling `checkAffordability`:

1. **Purchase history accumulation** — The dashboard builds purchase history through its main loop, accumulating debt from each property sequentially with full property growth calculations, existing property equity releases, event adjustments, and renovation impacts. The pre-check builds a simplified purchase history with basic loan amounts.

2. **EngineDeps bridge** — The dashboard's `engineDeps` uses `getInstance()`, `getPropertyData()`, and `calculatePropertyGrowth()` from React contexts. The pre-check constructs simplified versions with hardcoded growth curves. Property growth over time affects equity available for release, which affects the available funds calculation, which affects the deposit test.

3. **The wrapper's totalCashRequired** — The dashboard's `checkAffordability` wrapper computes `totalCashRequired` from stamp duty + LMI + 12 different fee fields on the property instance. The pre-check computes it from `calculateOneOffCosts()` + LMI. If any fee field defaults differ, the totals differ.

We tried multiple approaches to close this gap:
- First: hardcoded `INITIAL_PROFILE_DEFAULTS` → diverged on profile values
- Then: pass `profile` from context → profiles matched but still diverged
- The remaining gap is in the deps/purchase-history/cost computation

**Why this matters:** If the pre-check says "this plan works" but the dashboard says it doesn't, the user sees a plan that was supposed to be validated but still has red icons. It undermines trust in the system.

### Rob's frustration point

"Why are we adding a safety margin that is specific to this scenario? That makes no sense surely. There will be 100s of different scenarios. We need a concrete solution."

He's right. The pre-check is a second copy of the affordability logic, and no matter how close we get, there will always be edge cases where it diverges. The fundamental issue is **two different code paths computing the same thing**.

### The nuclear option the next session should consider

Instead of trying to make the pre-check match the dashboard (whack-a-mole with divergences), consider this: **run the dashboard engine itself as the pre-check.**

After `confirmPlan` hydrates the contexts, `useAffordabilityCalculator` runs and produces `timelineProperties`. If any property is `challenging`, run `autoFixPlan` at THAT point — modify the contexts (push periods, flip entities), let the calculator re-run, check again. The dashboard IS the single source of truth. No second copy of the logic.

The challenge with this approach: `confirmPlan` is a user action (clicking Approve). You'd need to either run it speculatively (hydrate contexts temporarily, check, revert if bad, re-apply with fixes) or restructure the flow so the brief approval triggers a validation pass before fully committing.

This is the right architectural direction but it's a significant refactor. The next session should weigh this against continuing to debug the pre-check divergence.

---

## What this session accomplished

### Context — where we picked up

The previous session (see `ENGINE-EXTRACTION-HANDOVER-2026-06-05.md`) extracted the affordability engine into `src/engine/affordabilityEngine.ts` and rewired `useAffordabilityCalculator.ts` to use it. Three P0/P1/P2 issues were left:

1. P0: Chart icons not turning red for challenging properties
2. P1: Verify the pre-check → AI feedback loop end-to-end
3. P2: Existing scenarios showing some properties as blocked (numerical equivalence)

### What we fixed

#### 1. Red chart icons (P0 — FIXED)

**Root cause:** The previous session added challenging-status styling to `ChartWithRoadmap.tsx` (`DraggablePropertyIcon` HTML overlay), but that component is **dead code** — never imported anywhere. The actual chart is `InvestmentTimelineChart.tsx`, which renders property icons as SVG `ReferenceDot` elements with hardcoded grey styling.

**Fix:** Added `timelineProperties` lookup in `InvestmentTimelineChart.tsx`'s `ReferenceDot` shape renderer. When `status === 'challenging'`, the circle gets red stroke (`#EF4444`, width 2) and the icon path gets red stroke.

**File:** `src/components/InvestmentTimelineChart.tsx` — lines ~278-318

#### 2. Pre-check auto-fix with AI explanation on brief (P1 — PARTIALLY WORKING)

Replaced the broken AI retry loop with an instant client-side auto-fix system:

**Flow:**
1. AI proposes plan → `handlePlanGenerated` fires
2. `runPlanPreCheck(response, profile)` runs (milliseconds)
3. If properties fail → `autoFixPlan()` runs auto-fix chain:
   - Pass 1: Flip entity to trust for serviceability/BC failures
   - Pass 2: Push properties to later periods for BC failures (up to +4 years)
   - Pass 3: Reduce prices for deposit shortfalls
4. Brief shows immediately with fixes applied
5. AI's `message` text shown on the brief (explains trust strategy, etc.)

**What's working:**
- Pre-check correctly identifies failing properties
- Auto-fix correctly flips entities and pushes periods
- AI explanation text appears on confirmation brief
- Brief shows instantly (no delay)

**What's NOT working:** See "The Divergence" below.

#### 3. AI explanation on confirmation brief

The AI's `response.message` text (e.g., "Properties 2, 3, 4 held in trusts to fit within borrowing capacity...") now displays directly on the confirmation brief as a subtle note in the existing UUI card style. Previously this text was hidden because the chat panel closes when the brief appears.

**File:** `src/components/ConfirmationBrief.tsx` — the `editedResponse.message` banner above "Proposed Purchases"

#### 4. Reload goes to New Client (requested by Rob)

Removed `localStorage` persistence of `activeClient`. On page reload, `activeClient` is `null` → App renders `<NewClientView />`. Client selection happens via sidebar.

**File:** `src/contexts/ClientContext.tsx` — removed the localStorage read/write for `proppath:activeClientId`

---

## THE DIVERGENCE — The #1 issue for the next session

### The problem

The pre-check says a property passes at period 9 with BC headroom of +59k. The dashboard's `useAffordabilityCalculator` says the same property at the same period fails with BC_rem=0k (clamped from negative). **Same engine functions, same profile values, different answers.**

### Console evidence (side by side)

```
PreCheck:   Property 4 ($450k) at period 9: BC=PASS(59k), entity=trust, loan=395k
Dashboard:  [3] Regional House period=9 status=challenging BC_rem=0k entity=trust cost=450k loan=404k
```

Note: the profiles now match (both show BC=904000, salary=113000, deposit=10000, savings=54000, currentDebt=394050). The profile divergence was fixed by passing `profile` from context into `runPlanPreCheck`.

### Where the divergence must be

Since profiles match and both call `checkAffordability` from the engine, the divergence is in **how inputs are prepared before calling the engine**:

1. **The `checkAffordability` wrapper in `useAffordabilityCalculator.ts`** (line ~575) computes `loanAmount`, `totalCashRequired`, and `purchaseHistory` differently from how the pre-check computes them.

2. **The `EngineDeps` bridge** — the dashboard's `engineDeps` uses React context values (`getInstance`, `getPropertyData`, `calculatePropertyGrowth`), while the pre-check constructs simplified versions of these. Property growth calculations differ because:
   - Dashboard: uses `calculatePropertyGrowth()` from the hook, which reads actual property data from context
   - Pre-check: uses a simplified inline growth calculator with hardcoded growth curves

3. **Existing property debt accumulation** — the dashboard's engine loop accounts for existing properties growing in value and generating rental income over time. The pre-check may not replicate this exactly.

4. **LMI capitalisation** — the dashboard adds LMI to the loan amount when `lmiCapitalized` is true. The pre-check also does this, but the LMI calculation itself may use different inputs (e.g., `valuationAtPurchase` which defaults differ).

### How to find the exact line

Add logging inside the `checkAffordability` function in `affordabilityEngine.ts` itself — not in the wrapper, not in the pre-check. Log the actual inputs it receives from both callers:
- `property.cost`, `property.loanAmount`, `totalCashRequired`
- `availableFunds.total`
- `purchaseHistory.length` and total debt
- `effectiveBorrowingCapacity` (the ceiling)
- `offsetDebt` (entity-discounted debt minus cash)

This will show which specific input diverges.

### The loan amount clue

Note the loan amounts differ:
- PreCheck: `loan=395k` (for $440k property at 88% + LMI)
- Dashboard: `loan=404k` (for $450k property — wait, these are DIFFERENT properties)

Actually — looking more carefully at the 5-property run, the 4th property in the pre-check is $450k but the dashboard shows it as "Regional House — Growth" at $450k with loan=404k. The pre-check shows loan for $450k at ~395-404k. These should match if LMI is computed the same way.

**Key investigation:** Compare `loanAmount` computation in the pre-check vs the wrapper for the same property.

---

## Complete file change list (this session + previous sessions, all uncommitted)

### New files (created across sessions)
| File | Lines | Purpose |
|------|-------|---------|
| `src/engine/affordabilityEngine.ts` | 524 | Pure affordability test functions (previous session) |
| `src/engine/planPreCheck.ts` | 420 | Pre-check + auto-fix AI plans before confirmation brief (this session) |

### Modified files (this session's changes)
| File | Change |
|------|--------|
| `src/components/InvestmentTimelineChart.tsx` | Red stroke on challenging property icons (ReferenceDot shape) |
| `src/components/ChatPanel.tsx` | Pre-check + auto-fix in `handlePlanGenerated`, passes `profile` from context |
| `src/components/ConfirmationBrief.tsx` | AI message text displayed above property cards |
| `src/contexts/ClientContext.tsx` | Removed localStorage persistence of activeClient |
| `src/types/nlParse.ts` | Added `_autoFixChanges` and `period_pushed` types |
| `src/hooks/useAffordabilityCalculator.ts` | Debug logging (REMOVE before commit) |

### Modified files (previous sessions, still uncommitted)
| File | Change |
|------|--------|
| `src/hooks/useAffordabilityCalculator.ts` | Engine extraction: 2,103 → 1,284 lines. Three inline copies replaced with engine calls. |
| `src/hooks/useChartDataGenerator.ts` | BC field uses `calculateBorrowingCeiling()` + entity-discounted debt |
| `src/hooks/useRoadmapData.ts` | Filters changed from `status === 'feasible'` to `period !== Infinity` |
| `src/components/BorrowingCapacityChart.tsx` | Offset debt uses entity-discounted debt |
| `src/components/ChartWithRoadmap.tsx` | Dead code: `hasGuardrailViolations` includes `challenging`, CSS filter on icons (NOT the active chart) |
| `src/components/Dashboard.tsx` | Red warning banner removed |
| `src/components/PropertyCardRow.tsx` | "Blocked" → red year text with hover tooltip |
| `src/components/BriefTab.tsx` | Entity selector dropdown (prev session) |
| `src/components/ConfirmationBrief.tsx` | Entity toggle + AI message |
| `src/constants/financialParams.ts` | Stale comment fixed |
| `src/utils/nlDataMapper.ts` | BC derivation 6x → 8x income |
| `supabase/functions/nl-parse/prompt.ts` | BC derivation 8x. **DEPLOYED.** |
| `supabase/functions/nl-parse/tools.ts` | Entity field on tool schemas |
| `supabase/functions/nl-parse/templates.ts` | Auto-mentions trusts |
| `supabase/functions/nl-parse/response-schema.ts` | Entity field |
| `supabase/functions/nl-parse/system-prompt.ts` | Entity section |

---

## Debug logging to remove before commit

Two files have temporary debug logging that must be removed:

1. **`src/hooks/useAffordabilityCalculator.ts`** lines ~1019-1023 — `[Dashboard Engine]` console.warn block
2. **`src/engine/planPreCheck.ts`** line ~129 — `[PreCheck] Profile:` console.info
3. **`src/engine/planPreCheck.ts`** line ~199 — `[PreCheck] Property N` console.info

---

## Architecture after this session

```
AI generates plan
    ↓
Frontend receives NLParseResponse
    ↓
handlePlanGenerated:
    ├── runPlanPreCheck(response, profile)     ← uses actual profile from context
    │   ├── mapToInvestmentProfile(response)   ← overlay AI data on profile
    │   ├── mapToPropertySelections(response)  ← get instances + periods
    │   ├── mapToExistingProperties(response)  ← get existing portfolio
    │   └── checkAffordability() per property  ← engine functions
    │
    ├── If failures → autoFixPlan():
    │   ├── Pass 1: flip entity to trust
    │   ├── Pass 2: push period (+1yr at a time, max +4yr)
    │   ├── Pass 3: reduce price for deposit shortfalls
    │   └── Re-check after each pass
    │
    └── Show confirmation brief immediately:
        ├── AI message text on brief
        ├── Auto-fix changes noted (if any)
        └── User can edit entity/price/period before approving
    ↓
User clicks Approve → confirmPlan()
    ↓
Contexts hydrated → useAffordabilityCalculator runs
    ↓
timelineProperties[] produced (feasible + challenging)
    ↓
╔═══════════════════════════════════════════════════════╗
║  DIVERGENCE HERE: pre-check said PASS, dashboard     ║
║  says FAIL for the same property at the same period   ║
║  with the same profile. The inputs to checkAffordabi- ║
║  lity differ between the two callers.                 ║
╚═══════════════════════════════════════════════════════╝
```

---

## Priority order for next session

### P0: Fix the pre-check ↔ dashboard divergence

This is THE blocker. The pre-check and dashboard call the same `checkAffordability` function but produce different results because they prepare inputs differently.

**Approach:** Add logging inside `checkAffordability` in `affordabilityEngine.ts` to see the ACTUAL inputs from both callers. Compare:
- `effectiveBorrowingCapacity` (the ceiling)
- `offsetDebt` (entity-discounted total debt minus cash)
- `purchaseHistory` entries and their debt/entity values
- `totalCashRequired` vs `availableFunds.total`

The divergence is in one of these. Once identified, make the pre-check compute that value the same way the dashboard wrapper does.

**Alternative approach:** Instead of trying to make the pre-check match the dashboard exactly, move the pre-check to run AFTER `confirmPlan` hydrates the contexts. Then use the dashboard's own `timelineProperties` output and auto-fix from there. This eliminates the pre-check entirely — the dashboard IS the check.

### P1: Remove debug logging

Remove all `console.warn`/`console.info` debug lines before committing.

### P2: Commit all changes

Once the divergence is fixed and debug removed, commit everything on `bc-gate-entity`.

---

## Test prompts

Use the same brief for consistent comparison:

**Standard test:**
```
Combined household income $113,000. Monthly savings $4,500. Monthly expenses $6,900. Liquid savings $10,000. Existing portfolio: 4/6 Cowper Ave, Eagleby QLD 4207 — bought 2024 for $290,000, current value $290,000, loan $165,300 (57% LVR), renting at $256/week, interest only, personal name. 3/113 Marley St, Sale VIC 3850 — bought 2025 for $375,000, current value $375,000, loan $228,750 (61% LVR), renting at $306/week, interest only, held in trust. Currently renting (no PPOR). Goals: retire at 53, target $100,000+ passive income per year. 15 year timeline. Strategy: equity growth, low price point properties. Comfortable with 88% LVR. Interest only loans. Max property price around $450,000.
```

**Simpler test (no existing portfolio):**
```
Bob. 120k income. 50k deposit. 20k annual savings. 2 mill equity goal in 10 years.
```

---

## Key decisions from this session

| Decision | Value | Reasoning |
|----------|-------|-----------|
| Pre-check uses dashboard profile | Pass `profile` from context | Eliminates profile value divergence |
| Auto-fix chain | trust → push period → reduce price | Rob: "If none of that works, properties just occur over a much longer period" |
| AI message on brief | Show `response.message` | Rob: "Even if there are failures we still want to explain the decisions" |
| No AI retry loop | Removed entirely | Was slow (15s+ delay), unreliable (AI responded with text not tool calls) |
| Reload → New Client | Remove localStorage persistence | Rob's existing rule that wasn't working |
| Brief styling | UUI tokens only | Rob: "I cannot deal with anymore AI looking stuff" |
