# Affordability Engine Extraction — Handover 2026-06-05

## Branch: `bc-gate-entity` (do NOT work on main)

All work from today's session AND the previous BC-gate session lives on this branch. Nothing committed yet — all changes are local uncommitted modifications. The edge function `nl-parse` WAS deployed (8x BC prompt change is live).

---

## The Journey — How We Got Here (READ THIS FIRST)

This session started as a continuation of the BC-gate entity work from the previous session (see `BC-ENTITY-HANDOVER-2026-06-05.md`). The previous session added entity discounting to the affordability calculator and AI entity instructions, but properties were still getting blocked on AI-generated plans.

### The diagnosis

We discovered the root cause wasn't just entity discounting — it was a **fundamental architectural disconnect**:

1. The **chatbot** (edge function) generates plans with zero knowledge of whether they'll pass the affordability calculator
2. The **feasibility.ts** server-side check only validates equity goal projection — it knows nothing about deposits, serviceability, or BC capacity
3. The **affordability calculator** runs for the first time AFTER the user approves the confirmation brief
4. The user sees blocked properties that the chatbot just said were fine

### The debate: how to fix it

We explored several approaches over extended discussion:

**Option A: Full engine extraction** — Extract the entire 2,103-line hook into a pure engine, rewrite the hook as a thin wrapper, duplicate the engine to the edge function for server-side pre-check. Rob's concern: "I cannot create more side calculators" and "too much risk of breaking 25+ dashboard consumers."

**Option B: Zero-extraction intercept** — Temporarily hydrate React contexts with the AI data, let the existing calculator run, read results, revert if blocked. Concern: context side effects, flashing UI.

**Option C: Targeted extraction** — Extract ONLY the three test functions (~300 lines) into a pure module. The hook imports them (same math, same results). ChatPanel also calls them for a pre-check. This was the approach we chose.

**Option D (Rob's insight): "Can't the AI just run it and ask?"** — Rob noticed the calculator is fast (milliseconds, pure math). His idea: run the calculator when the AI response arrives, BEFORE showing the confirmation brief. If it fails, send feedback to the AI automatically. The AI adjusts and resubmits. This became the final design.

### Why we chose targeted extraction + client-side pre-check

1. **One source of truth** — the engine functions are called by the hook, the pre-check, and (eventually) the chart data generator. No duplicate math.
2. **Minimal risk** — the hook's public API doesn't change. All 25+ consumers still import `useAffordabilityCalculator` and get `timelineProperties`. They never know the internals changed.
3. **Client-side, not server-side** — the real affordability engine lives in the browser. The pre-check runs the SAME functions with the SAME constants. No simplified copy, no divergence risk.
4. **Feedback loop, not blocking** — the AI gets concrete failure data ("Property 3: BC ceiling exceeded by $80k") and can adjust. The user just sees slightly longer loading on first plans that need fixing.

### Key decisions locked in

| Decision | Value | Reasoning |
|----------|-------|-----------|
| Trust factor | 0.25 (75% discount) | Rob's decision. More aggressive than the original 0.70 but matches the testing config from last session. |
| BC multiplier | 8x income (when not stated) | Rob's decision. Was 6x. Brokers often approve higher. |
| Cash offset in BC test | Yes | Matches the BC chart's concept. Lenders consider offset accounts. Makes the test more lenient and more realistic. |
| Challenging properties in charts | Yes, with red indicators | Rob: "A BA is still more than welcome to override the purchase year. Icons should still exist but just be red." |
| No red banner | Removed | Rob: "We don't want to do that. Simply red text and red icons with hover tooltips." |
| Pre-check retry limit | 2 | Prevents infinite loops if the AI can't fix the plan. After 2 retries, shows the brief anyway. |

### The three-way divergence we discovered

During the audit, we found that the affordability calculator had three DIFFERENT implementations of the BC test in the same file:

| Location | Entity discount? | Used `calculateBorrowingCeiling`? |
|----------|-----------------|-----------------------------------|
| `checkAffordability` (auto-placer) | Yes | Yes |
| `calculateAffordabilityForPeriod` (modal) | Yes | Yes |
| `previewPlacementAtPeriod` (drag-drop) | **NO — raw debt** | Yes |
| Chart data generator | **NO** | **NO — naive subtraction** |

This meant drag-drop gave different answers than auto-placement for the same property at the same period. This bug existed before our session and was fixed by the extraction.

### The `cashflowData` before initialization bug

After the extraction, the chart data generator crashed with `Cannot access 'cashflowData' before initialization`. The new BC calculation in the `portfolioGrowthData` useMemo referenced `cashflowData.find()` to get rental income, but `cashflowData` is defined in a LATER useMemo. Fixed by computing rental income inline from `relevantPurchases` + `existingProperties`.

### The wrapper bug (everything blocked)

After extraction, ALL existing scenarios showed every property as blocked. Root cause: the old `checkAffordability` closure computed `loanAmount` and `totalCashRequired` internally from `property.cost` and stamp duty calculations. The new engine expects them as parameters. But the main loop's `propertyWithInstance` object doesn't include `loanAmount`, and `totalCashRequired` was never passed. The wrapper defaulted `totalCashRequired` to `funds.total` (available funds, not costs), making the deposit test meaningless. Fixed by having the wrapper derive `loanAmount = cost - depositRequired` and compute `totalCashRequired` from stamp duty + LMI + fees when not provided.

---

## What we did this session

### The core problem we solved

The affordability calculator (`useAffordabilityCalculator.ts`) had **three separate inline copies** of the same BC/serviceability tests — the main timeline loop, the modal preview (`calculateAffordabilityForPeriod`), and the drag-drop validator (`previewPlacementAtPeriod`). They diverged:

- Main loop: entity-discounted debt, used `calculateBorrowingCeiling()`
- Modal preview: entity-discounted debt, used `calculateBorrowingCeiling()`
- Drag-drop: **RAW debt (no entity discount)**, used `calculateBorrowingCeiling()` — BUG

Additionally, the chart data generator had a **fourth** naive BC calculation: `statedBC - rawLoans` (no wage growth, no entity discount).

The chatbot had **zero connection** to the affordability engine — the AI proposed plans, the user approved them, and then the dashboard blocked properties the AI said were fine.

### What we built

#### 1. Affordability Engine (`src/engine/affordabilityEngine.ts` — 524 lines, NEW)

Pure TypeScript functions with zero React dependencies. Single source of truth for:

- `calculateAnnualLoanPayment()` — IO vs P&I
- `calculateAvailableFunds()` — equity-first allocation (equity → cash → savings)
- `calculateEntityDiscountedDebt()` — trust at 0.25, SMSF at 0, individual at 1.0
- `calculateTotalAnnualLoanPayments()` — entity-discounted, event-adjusted
- `calculateTotalRentalIncome()` — vacancy-adjusted, recognition-rated
- `checkAffordability()` — THE THREE TESTS (deposit, serviceability, BC ceiling with cash offset)

The engine accepts dependencies via an `EngineDeps` interface:
```typescript
interface EngineDeps {
  getInstance: (instanceId: string) => any | null;
  getPropertyData: (title: string, growthAssumption?: string) => any | null;
  calculatePropertyGrowth: (cost: number, periodsOwned: number, propertyData: any, basePeriod?: number) => number;
}
```

This allows both the React hook and the pre-check to use the same math with different data sources.

#### 2. Plan Pre-Check (`src/engine/planPreCheck.ts` — 218 lines, NEW)

Runs the engine's `checkAffordability` against an AI-proposed plan BEFORE showing the confirmation brief. Maps the `NLParseResponse` to the same profile/property shapes the dashboard uses, then tests each property sequentially.

Returns structured failure data:
```typescript
interface PreCheckResult {
  allFeasible: boolean;
  failures: PreCheckFailure[];  // which properties, which tests, by how much
  feedbackMessage: string;       // auto-generated message for the AI
}
```

#### 3. Hook rewired (`src/hooks/useAffordabilityCalculator.ts` — 1,276 lines, was 2,103)

All three inline copies replaced with calls to `engineCheckAffordability`. The hook defines an `engineDeps` bridge that passes React context values into the pure engine:

```typescript
const engineDeps: EngineDeps = {
  getInstance,
  getPropertyData,
  calculatePropertyGrowth,
};
```

The wrapper also computes `loanAmount` and `totalCashRequired` from property data when not provided (needed because the main loop's `propertyWithInstance` object doesn't include these fields — the old closure computed them internally).

#### 4. ChatPanel feedback loop (`src/components/ChatPanel.tsx`)

`handlePlanGenerated` now runs `runPlanPreCheck(response)` before calling `setPendingPlanResponse`. If properties fail:
1. Auto-sends failure details to the AI via `sendMessageRef.current(preCheck.feedbackMessage)`
2. AI adjusts the plan (assigns trusts, reduces prices, etc.)
3. New response arrives → pre-check runs again
4. Max 2 retries, then shows brief anyway

The user never sees the failed plan — just a slightly longer loading time.

#### 5. BC chart aligned (`src/components/BorrowingCapacityChart.tsx`)

The "Offset Debt" line now uses **entity-discounted debt** minus cash offset — matching what the engine tests against the ceiling. Previously it used raw debt, which meant the purple area could exceed the capacity line for trust properties.

Tooltip updated:
- **Headroom** = ceiling - offsetDebt (was ceiling - rawDebt)
- **Entity + Cash Offset** shows when there's a discount (replaces "Offset Cash")

#### 6. Chart data generator aligned (`src/hooks/useChartDataGenerator.ts`)

- `borrowingCapacity` field: replaced `statedBC - rawLoans` with `calculateBorrowingCeiling() - entityDiscountedDebt`
- New `entityDiscountedDebt` field on `PortfolioGrowthDataPoint` interface
- Inline rental income calculation (avoids reference to `cashflowData` which is a later useMemo)
- All three `useMemo` blocks now include `period !== Infinity` properties (not just `status === 'feasible'`)

#### 7. Roadmap data aligned (`src/hooks/useRoadmapData.ts`)

Three filters changed from `status === 'feasible'` to `period !== Infinity` — challenging properties now appear in roadmap tables.

#### 8. UI changes

- **Dashboard.tsx**: Red warning banner REMOVED. Blocked properties indicated subtly via red year text + red chart icons.
- **PropertyCardRow.tsx**: "Blocked" label replaced with the purchase year in red text. Hover tooltip shows which tests failed and by how much.
- **ChartWithRoadmap.tsx**: `hasGuardrailViolations` now returns `true` for `status === 'challenging'`. Red border and CSS filter tint applied to challenging property icons. Tooltip shows failure reasons.

#### 9. Constants & prompts

- BC multiplier: 6x → **8x** income when no user-provided BC (`nlDataMapper.ts` + `prompt.ts`)
- Trust factor: confirmed at **0.25** (75% discount)
- Cash offset: adopted in BC ceiling test — `offsetDebt <= ceiling` instead of `totalDebt <= ceiling`
- Stale comment fixed in `financialParams.ts` — now says entity factors apply to BOTH tests
- Edge function `nl-parse` **deployed** with 8x prompt change

---

## What's NOT working / needs attention next session

### P0: Chart icons not turning red for challenging properties

The CSS filter approach (`grayscale + sepia + hue-rotate`) was applied to the `<div>` wrapping the `<img>` icon in `DraggablePropertyIcon`. The border turns red (`borderColor` uses `isChallenging`), but the **image filter is not visually applying** in the browser.

**Debugging done:**
- Added `console.log`/`console.warn` in `propertyPositions` — log never appeared in preview console
- The `property.status` reaching the icon component may not be `'challenging'` — needs runtime verification
- The preview console tool may not capture all log levels

**Next steps:**
1. Open Chrome DevTools directly (not preview tool) to see the console logs
2. Check if `property.status` is actually `'challenging'` at the icon level
3. If it is → the CSS filter approach may need tweaking (try inline SVG with `fill` instead of `<img>` with CSS filter)
4. If it isn't → trace why the `timelineProperties.find()` in `propertyPositions` returns a `feasible` property when PropertyCardRow shows the same property as blocked

**Relevant code:**
- `ChartWithRoadmap.tsx` line 282: `const isChallenging = property.status === 'challenging';`
- `ChartWithRoadmap.tsx` line 328-331: CSS filter on the image wrapper div
- `ChartWithRoadmap.tsx` line 974: `property: timelineProperties.find(p => p.instanceId === purchase.instanceId)`

### P1: Verify the pre-check → AI feedback loop end-to-end

The wiring is in place but hasn't been tested with a real chatbot prompt. Need to:
1. Type a brief that would produce blocked properties without trusts
2. Verify the pre-check catches it
3. Verify the feedback message reaches the AI
4. Verify the AI adjusts and resubmits
5. Verify the confirmation brief shows the adjusted plan

**Test prompt:** "Bob. 120k income. 50k deposit. 20k annual savings. 2 mill equity goal in 10 years."

### P2: Existing scenarios showing some properties as blocked

Some existing scenarios show properties with red years that previously showed as feasible. This could be because:
- The **cash offset** makes the BC test MORE lenient (should help, not hurt)
- The `totalCashRequired` computation in the wrapper may differ slightly from the old inline version
- The engine's rental income calculation may differ from the old closure's version

Need to compare engine output vs old calculator output for a known scenario to verify numerical equivalence.

---

## Complete file change list

### New files
| File | Lines | Purpose |
|------|-------|---------|
| `src/engine/affordabilityEngine.ts` | 524 | Pure affordability test functions |
| `src/engine/planPreCheck.ts` | 218 | Pre-check AI plans before confirmation brief |

### Modified files
| File | Change |
|------|--------|
| `src/hooks/useAffordabilityCalculator.ts` | 2,103 → 1,276 lines. Three inline copies replaced with engine calls. Wrapper computes loanAmount/totalCashRequired when not provided. |
| `src/hooks/useChartDataGenerator.ts` | BC field uses `calculateBorrowingCeiling()` + entity-discounted debt. New `entityDiscountedDebt` field. All filters changed from `feasible` to `period !== Infinity`. Inline rental income calculation. |
| `src/hooks/useRoadmapData.ts` | Three filters changed from `status === 'feasible'` to `period !== Infinity`. |
| `src/components/BorrowingCapacityChart.tsx` | Offset debt uses entity-discounted debt. Tooltip shows headroom vs offset debt. |
| `src/components/ChartWithRoadmap.tsx` | `hasGuardrailViolations` includes `status === 'challenging'`. Red border + CSS filter for challenging icons. Failure reasons in tooltip. |
| `src/components/ChatPanel.tsx` | Pre-check in `handlePlanGenerated`. Feedback loop with `sendMessageRef`. Max 2 retries. |
| `src/components/Dashboard.tsx` | Red warning banner removed. |
| `src/components/PropertyCardRow.tsx` | "Blocked" → red year text with hover tooltip showing failure reasons. `timelineProp` added to CardData. |
| `src/constants/financialParams.ts` | Stale comment fixed (entity factors apply to both tests). |
| `src/utils/nlDataMapper.ts` | BC derivation 6x → 8x income. |
| `supabase/functions/nl-parse/prompt.ts` | BC derivation instruction 6x → 8x. **DEPLOYED.** |

### Files changed in previous session (still uncommitted on this branch)
| File | Change |
|------|--------|
| `src/components/BriefTab.tsx` | Entity selector dropdown. |
| `src/components/ConfirmationBrief.tsx` | Entity toggle fixed (was hardcoded). |
| `src/types/nlParse.ts` | Entity, engineStatus, borrowingCapacityRemaining fields. |
| `supabase/functions/nl-parse/tools.ts` | Entity field on create_plan/modify_plan schemas. |
| `supabase/functions/nl-parse/templates.ts` | Auto-mentions trusts in chat message. |
| `supabase/functions/nl-parse/response-schema.ts` | Entity field (Tier 1, kept in sync). |
| `supabase/functions/nl-parse/system-prompt.ts` | Entity section (Tier 1, kept in sync). |

---

## Architecture after this session

```
AI generates plan
    ↓
Frontend receives response
    ↓
handlePlanGenerated → runPlanPreCheck()     ← NEW
    ↓ (if fails, sends feedback to AI, up to 2 retries)
    ↓ (if passes or max retries)
ConfirmationBrief shows (entity toggles work)
    ↓
User clicks Approve → confirmPlan()
    ↓
mapToInvestmentProfile + mapToPropertySelections + mapToExistingProperties
    ↓
Context updates trigger useAffordabilityCalculator
    ↓
checkAffordability wrapper → engineCheckAffordability()    ← SINGLE SOURCE OF TRUTH
    ↓
timelineProperties[] produced (feasible + challenging)
    ↓
╔═══════════════════════════════════════════════════════╗
║  ALL consumers read from the same timelineProperties  ║
║  Challenging properties included everywhere now        ║
╠═══════════════════════════════════════════════════════╣
║  Charts: icons plotted, red border + tint if blocked   ║
║  Tables: red year text, hover shows failure reasons    ║
║  BC Chart: offset debt = entity-discounted - cash      ║
║  Roadmap: all properties shown                         ║
║  ChatPanel: sends engineStatus back to AI              ║
╚═══════════════════════════════════════════════════════╝
```

---

## Critical Understanding — The Data Flow

This took most of the session to map. Any future session MUST understand this flow.

### Why the confirmation brief has "0 loading time"

The affordability calculator does NOT run before the confirmation brief. The brief shows raw AI data. When the user clicks Approve, `confirmPlan()` hydrates three React contexts. This triggers `useAffordabilityCalculator`'s `useMemo`, which is pure synchronous math — milliseconds. That's why it appears instant. It's fast, not pre-computed.

### The chatbot → dashboard data flow

```
1. User types brief
2. Edge function (nl-parse): AI picks create_plan tool → validation → template message
3. Response arrives at useChatConversation → calls onPlanGenerated callback
4. ChatPanel.handlePlanGenerated:
   a. runPlanPreCheck(response) ← ENGINE CHECKS HERE
   b. If fails → sendMessage(feedbackMessage) → AI retries → back to step 2
   c. If passes → setPendingPlanResponse(response) → shows ConfirmationBrief
5. User edits fields (entity, price, state, etc.) in ConfirmationBrief
6. User clicks Approve → confirmPlan(editedResponse)
7. confirmPlan runs 3 mappers:
   - mapToInvestmentProfile(response) → InvestmentProfileContext
   - mapToPropertySelections(response) → PropertySelectionContext + PropertyInstanceContext
   - mapToExistingProperties(response) → ExistingProperties in ScenarioSaveContext
8. Context updates trigger useAffordabilityCalculator.calculateTimelineProperties (useMemo)
9. timelineProperties[] produced → consumed by ALL 25+ components
```

### What the affordability calculator actually tests (three gates)

1. **Deposit test**: `availableFunds.total >= totalCashRequired`
   - Available = deposit pool + accumulated savings (60% deployed) + usable equity (value × 0.80 − loan, scaled by equityReleaseFactor 0.70)
   - Required = deposit balance + stamp duty + LMI (if not capitalised) + legals + building/pest + BA fee + other fees

2. **Serviceability test**: `(BC × 0.10) + (totalRental × 0.80) >= totalAnnualLoanPayments`
   - Loan payments entity-discounted: trust = 0.25×, SMSF = 0×, individual = 1.0×
   - Rental income: 80% recognition rate, vacancy-adjusted, rent-escalated

3. **BC ceiling test (with cash offset)**: `offsetDebt <= effectiveBorrowingCapacity`
   - `offsetDebt = entityDiscountedDebt - min(cashReserves, entityDiscountedDebt)`
   - `cashReserves = availableFunds.cashRemaining + availableFunds.savingsRemaining`
   - `effectiveBorrowingCapacity = calculateBorrowingCeiling(period, ...)` — wage-grown stated BC, or income × multiplier

### What the BC chart shows vs what the engine tests

| Concept | BC Chart | Engine Test |
|---------|----------|-------------|
| Capacity line | `calculateBorrowingCeiling()` | Same function |
| Total Liabilities (dashed) | Raw debt — what you actually owe | Not used for testing |
| Offset Debt (purple stripes) | Entity-discounted debt − cash offset | Same formula — this is what's tested |
| Headroom | Ceiling − offset debt | Same |
| Property icons | Plotted for ALL properties (feasible + challenging) | N/A |
| Red indicators | Border + CSS filter tint when challenging | N/A |

### Edge function architecture (Tier 2)

See `docs/CHATBOT-ARCHITECTURE.md` for full reference. Key points:
- Single Anthropic API call, 6 tools, no classifier
- `prompt.ts` = system prompt, `tools.ts` = schemas, `templates.ts` = code-generated messages
- `feasibility.ts` = equity goal projection ONLY (not affordability)
- Files `system-prompt.ts`, `response-schema.ts`, `pipeline.ts`, `prompts/` = OLD Tier 1, NOT imported by `index.ts`
- The 8x BC derivation instruction is in `prompt.ts` line 231

---

## How to continue

```bash
git checkout bc-gate-entity
npm run dev
# Edge function already deployed with 8x BC
```

**Priority order:**
1. Fix red icon rendering on equity chart (P0)
2. Test chatbot pre-check end-to-end (P1)
3. Verify numerical equivalence with old calculator (P2)
4. Commit all changes once verified

**Test prompts:**
- Simple: "Bob. 120k income. 50k deposit. 20k annual savings. 2 mill equity goal in 10 years."
- With BC: "Bob. 120k income. 50k deposit. 20k annual savings. 900k borrowing cap. 2 mill equity goal in 10 years."
- With existing debt: "Bob. 120k income. 50k deposit. 20k annual savings. 900k borrowing cap. 2 existing properties with 600k total debt. 2 mill equity goal in 10 years."
