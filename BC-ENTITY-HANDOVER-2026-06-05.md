# BC Gate + Entity System Handover — 2026-06-05

## Branch: `bc-gate-entity` (do NOT work on main)

Main was rolled back to `f8bf870` (pre-BC-chart). All work lives on `bc-gate-entity` — 5 committed BC commits + 17 files of uncommitted local changes from this session.

---

## What we're building

A borrowing capacity gate that prevents the dashboard from showing purchases the client can't actually afford. The system must be **proactive, not reactive** — the AI chatbot should structure plans that pass the gate BEFORE the user sees them. The user should NEVER see "Blocked" on a property unless they manually tweaked timing/price after approval.

## The flow we want (and don't have yet)

```
1. User inputs client brief to chatbot
2. AI generates plan → MUST structure it so all properties pass the BC gate
   - Derive BC from income (6x) if not stated
   - Assign trust entities to later properties when capacity is tight
   - Mention trust structures in the chat message
3. Confirmation brief appears with entity toggles (Individual/Trust) working
4. User can tweak numbers, change entities, adjust prices
5. User clicks Approve
6. Dashboard renders — ALL properties feasible, charts populated
7. Only way to get "Blocked": user manually drags a property earlier than
   the engine can afford, or edits price/LVR to exceed capacity
```

## What's currently broken (in order of priority)

### P0: Properties still getting blocked on plans the AI generates

**Root cause:** The cumulative BC ceiling check is too strict for clients with existing debt. Example:
- Client: $120k income, 2 existing properties with $600k total debt, $720k BC
- Existing debt (individual, factor 1.0): $600k — eats 83% of ceiling
- New trust property loan $440k × 0.25 = $110k → total $710k, barely fits
- Second trust property $352k × 0.25 = $88k → total $798k > $720k → BLOCKED

The entity discount (0.25 for trusts) is applied to both serviceability AND the BC ceiling now, but the existing individual-entity debt dominates. The AI can't fix this because existing properties are already owned as individual.

**What needs to happen:**
- The AI needs to be smarter about what plans are actually feasible given existing debt
- Consider: should the AI suggest fewer properties when existing debt is high?
- Consider: should existing portfolio entity be editable in the confirmation brief? (toggle exists but may not flow through)
- Consider: is the 6x income BC derivation too conservative? Brokers often approve higher.
- The fundamental principle: **if the AI proposes it, the engine must accept it.** No plan should arrive at the dashboard with blocked properties.

### P1: AI not consistently assigning trust entities

**Current state:** Instructions exist in `prompt.ts` and `tools.ts` telling the AI to assign trusts on properties 2+ when capacity is tight. The tool description says "IMPORTANT: When proposing 3+ properties on ≤$1.5M borrowing capacity, set entity to 'trust' on properties 2+." Sometimes it works, sometimes it doesn't.

**What needs to happen:**
- May need to make `entity` a required field in the tool schema (currently optional)
- Or add post-processing in `index.ts` that auto-assigns trusts when the AI forgets
- The template message in `templates.ts` already auto-mentions trusts when they're present

### P2: Confirmation brief entity toggle was broken (FIXED but verify)

**What was wrong:** `ConfirmationBrief.tsx` line 373 had `value="individual"` hardcoded and line 472 had `onChange={() => {}}` (no-op). Both fixed — now reads `property.entity` and calls `onFieldChange`.

**Verify:** Toggle should visually update AND the value should flow through to the property instance when approved.

---

## Architecture — how data flows

### The affordability calculator is the single source of truth

```
User input → PropertyInstanceContext (entity, price, LVR, etc.)
           → useAffordabilityCalculator (produces timelineProperties with status)
           → useChartDataGenerator (filters feasible only for charts)
           → useRoadmapData (filters feasible only for purchases table)
           → Dashboard renders
```

### Where the BC gate lives (useAffordabilityCalculator.ts)

Two separate tests, BOTH must pass:

1. **Serviceability test** (lines ~888-894): Annual loan payments vs income capacity
   - Uses `ENTITY_SERVICEABILITY_FACTORS` — trust: 0.25 (75% discount for testing)
   - `baseCapacity = profile.borrowingCapacity * SERVICEABILITY_FACTOR (0.06)`
   - `rentalContribution = totalRentalIncome * 0.70`
   - Pass if: `baseCapacity + rentalContribution >= totalAnnualLoanPayment`

2. **Cumulative BC ceiling** (lines ~896-901): Total debt vs effective BC
   - `effectiveBorrowingCapacity` from `calculateBorrowingCeiling()` (wage-grown BC)
   - `totalDebtAfterPurchase` = existing debt + new loan (both entity-discounted now)
   - Pass if: `totalDebtAfterPurchase <= effectiveBorrowingCapacity`
   - Entity discount applied to BOTH existing and new debt (changed this session)

### Where entity discounts are applied

`src/constants/financialParams.ts` line 118:
```typescript
export const ENTITY_SERVICEABILITY_FACTORS = {
  individual: 1.0,
  trust: 0.25,    // Changed from 0.70 to 0.25 for testing (75% reduction)
  company: 1.0,
  smsf: 0.0,
};
```

This factor is used in:
- `useAffordabilityCalculator.ts` — serviceability test (lines 785, 806, 825)
- `useAffordabilityCalculator.ts` — cumulative BC ceiling (lines 681, 692, 770) — CHANGED THIS SESSION
- Second instance of both patterns around lines 1852-1890 — also changed

### How the AI assigns entities

1. AI outputs `entity: "trust"` on properties in the `create_plan` tool response
2. `nlDataMapper.ts` maps `entity` to `PropertyInstanceDetails` (line ~222)
3. `PropertyInstanceContext` stores it
4. `useAffordabilityCalculator` reads it via `getInstance(instanceId)?.entity`

### How BC is derived when not stated

1. AI should set `clientProfile.borrowingCapacity` = combined income × 6
2. `nlDataMapper.ts` line 83 also derives BC = combined income × 6 as fallback
3. Without either, defaults to $500k (from `INITIAL_INVESTMENT_PROFILE`)

---

## Files changed this session (all on bc-gate-entity, uncommitted)

### Engine (core calculation)
- **`src/hooks/useAffordabilityCalculator.ts`** — Entity discount applied to BC ceiling (not just serviceability). Trust/SMSF debt discounted in cumulative ceiling check. Two instances of the pattern updated.
- **`src/hooks/useRoadmapData.ts`** — Three filters changed: `purchasesByYear`, `propertiesPurchasedByYear`, `propertiesPurchasedBeforeThisYear` now filter by `status === 'feasible'` in addition to `affordableYear !== Infinity`.
- **`src/constants/financialParams.ts`** — Trust factor 0.70 → 0.25 for testing.

### Dashboard UX
- **`src/components/Dashboard.tsx`** — Red warning banner when blocked properties exist. Shows count and suggests fixes.
- **`src/components/PropertyCardRow.tsx`** — "Blocked" label in red instead of purchase year. `isBCBlocked` flag on CardData.
- **`src/components/BriefTab.tsx`** — Entity selector dropdown added. Uses `timelineProperties.find(p => p.status === 'feasible')` instead of `[0]`.
- **`src/components/ConfirmationBrief.tsx`** — Entity toggle fixed: was hardcoded `value="individual"` with no-op onChange. Now reads `property.entity` and calls `onFieldChange`.

### AI feedback loop
- **`src/components/ChatPanel.tsx`** — `getCurrentPlan()` now includes `entity`, `engineStatus`, `borrowingCapacityRemaining` per property. Added `timelineProperties` to dependency array.
- **`src/types/nlParse.ts`** — Added `entity`, `engineStatus`, `borrowingCapacityRemaining` to `CurrentPlanState.properties`. Added `entity` to response properties.
- **`src/utils/nlDataMapper.ts`** — Maps `entity` from AI response to property instances. Derives BC = income × 6 when not stated. Added `entity` to `SUPPORTED_CHANGE_FIELDS` and change handler.

### Edge function (already deployed to production)
- **`supabase/functions/nl-parse/prompt.ts`** — Entity types section with proactive trust assignment rules. BC derivation from income instruction. Entity in supported change params. Entity/status labels on property display.
- **`supabase/functions/nl-parse/tools.ts`** — `entity` field on create_plan and modify_plan property schemas. Trust instruction in create_plan description.
- **`supabase/functions/nl-parse/templates.ts`** — Auto-mentions trusts in chat message when assigned.
- **`supabase/functions/nl-parse/response-schema.ts`** — `entity` field added (old Tier 1 schema, kept in sync).
- **`supabase/functions/nl-parse/system-prompt.ts`** — Entity types section (old Tier 1 prompt, kept in sync).

**NOTE:** The edge function files that are actually LIVE are: `index.ts`, `prompt.ts`, `tools.ts`, `templates.ts`, `validation.ts`, `feasibility.ts`. The files `system-prompt.ts`, `response-schema.ts`, `pipeline.ts`, and the `prompts/` directory are OLD Tier 1 architecture — `index.ts` doesn't import them. Changes to those files have no effect on production. The Tier 2 equivalents are `prompt.ts` (system prompt) and `tools.ts` (schemas).

---

## Key decisions for next session

1. **Should the AI ever propose a plan that gets blocked?** Current answer: NO. The AI must structure feasible plans. "Blocked" should only appear if the user manually tweaks after approval.

2. **How to guarantee feasibility?** Options:
   a. Make the AI smarter (better instructions, required entity field)
   b. Add server-side post-processing that auto-assigns trusts when needed
   c. Add a pre-engine validation step between confirmation brief and dashboard
   d. Run the engine BEFORE showing the confirmation brief, catch failures, and auto-fix

3. **Trust factor for production:** Currently 0.25 (75% reduction) for testing. Real-world is 0.70 (30% reduction). Need to decide the production value and adjust the AI's feasibility estimates to match.

4. **Existing portfolio entity:** Users can't currently change existing property entity in a way that affects the BC calculation from the confirmation brief. If existing debt is individual and takes up most of the ceiling, no amount of trust assignment on new properties will help.

5. **BC derivation:** 6x income as default BC — is this realistic? Brokers often approve more. Consider 7x or 8x for the derived fallback.

---

## How to continue

```bash
git checkout bc-gate-entity
# All uncommitted changes are here
npm run dev
# Edge function is already deployed with entity support
```

Test with: "Bob. 120k income. 50k deposit. 20k annual savings. 900k borrowing cap. 2 mill equity goal in 10 years."
(Use 900k+ BC to avoid existing-debt ceiling issues while testing)
