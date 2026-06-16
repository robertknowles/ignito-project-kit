# Company Strategy Engine — Working Handoff

**Owner context:** Rob (co-founder, non-technical, strong design sense).
**Status as of this doc:** Phase 1 (Company Strategy pills + AI preset inference) **shipped & deployed**. Phase 2 (granular "molding") **planned, not started**.
**Purpose of this doc:** Hand the full mental model to a fresh session so it can continue without re-deriving anything.

---

## 0. TL;DR — read this first

We replaced the old strategy UX (5 hardcoded preset pills + a single free-text "Strategy Profile") with **named "Company Strategy 1/2/3" pills** the firm defines. The selected strategy's free text is injected into the AI prompt, and **the AI infers the engine preset** (`eg-low`/`eg-high`/`cf-low`/`cf-high`/`commercial-transition`) from that text + the client brief. This is now intended to be **the core strategy engine**, not just a client input.

**The big realisation driving Phase 2:** agents write *granular, continuous, sometimes phased* strategies ("freestanding homes $550–650k, 10% then 7% growth, 4.5–4.8% yield, pivot to commercial halfway"). Our system collapses everything into *coarse buckets* (5 presets → 10 cells → 3 growth tiers, single-mode plan). We need the product to **mold to the granular detail** the agent provides.

**Decisions locked (by Rob):**
1. **Do all 3 layers** (granular extraction, engine extensions, transparency).
2. **Extract at generation time** (keep strategy as free text; AI parses it fresh each plan, so it can interact with the client brief). NOT pre-parsed into structured fields on save.
3. **Growth → match to the closest existing tier** (High/Med/Low). Do NOT build custom per-property growth curves for now.
4. Everything else in "expand the output schema" (Layer 2) is agreed.

---

## 1. How we got here (the journey)

1. A prospective user said *"I don't want my guys to have to learn a new software."* Goal: simplify the new-client input.
2. **First attempt — REJECTED:** turned the chat-box into a 1→2→3 numbered step timeline. Rob didn't like the layout; **fully reverted** (code to HEAD, DB column dropped). Keep the single chat-box prompt. Don't rebuild the stepper. (See memory `project_new_client_3step_jun2026`.)
3. **Second attempt — SHIPPED:** kept the chat-box, but replaced the preset pills + strategy-profile with **named Company Strategy pills**, and made the **AI infer the preset**. This is the current state.
4. Then we stress-tested with real beta-tester strategy inputs and found the **granularity gap** → Phase 2.

---

## 2. What is SHIPPED right now (Phase 1)

### Data model
- **`profiles.strategy_profiles`** — JSONB array of `{ id, name, text }`. Migration: [`supabase/migrations/20260617000000_add_strategy_profiles.sql`](../supabase/migrations/20260617000000_add_strategy_profiles.sql). Backfills the old `strategy_profile_text` into a first "Company Strategy 1" entry. **Legacy `strategy_profile_text` column kept** (not dropped) — nothing reads it now.
- **Applied to the live DB** (project `gaoqzrdzihmrwipwsbwo`) via the Supabase MCP `apply_migration`.

### Frontend
- **[`src/hooks/useStrategyProfiles.ts`](../src/hooks/useStrategyProfiles.ts)** — loads/saves the strategies array. Exports `StrategyProfile` type + `newStrategyId()`.
- **[`src/components/CompanyStrategySelector.tsx`](../src/components/CompanyStrategySelector.tsx)** — presentational pills. Props: `profiles`, `selectedId`, `onSelect`, `onManage`, `variant?: 'inline-chips'`, `loading?`. Parent owns selection state (it needs the selected text for wiring). Pills match the Assumptions-button style (`px-3 py-1.5 rounded-full text-[11px]`, grey `#F5F5F6`/`#E9EAEB`, active `#ECECED`/`#D5D7DA`). The "Add company strategy" / "Set up company strategies" pill is **white bg + dashed border**.
- **[`src/components/StrategyProfileModal.tsx`](../src/components/StrategyProfileModal.tsx)** — repurposed into the multi-strategy **"Company strategies" manager** (add/rename/edit/delete, save whole array). Same `isOpen`/`onClose` props + new optional `onSaved` (callers call `reloadStrategies`).
- **[`src/components/NewClientView.tsx`](../src/components/NewClientView.tsx)** (home page chat box):
  - Renders `CompanyStrategySelector` (inline-chips) bottom-left.
  - **"Add client fact find"** pill (paperclip + label) sits **top-right next to "Assumptions"**; the send arrow is bottom-right alone.
  - On launch: stores the selected strategy's text in `sessionStorage['proppath:pending-strategy-text']` then the pending prompt, then `setActiveClient`.
- **[`src/components/ChatPanel.tsx`](../src/components/ChatPanel.tsx)** (in-client chat widget):
  - Renders `CompanyStrategySelector` in the empty state.
  - Reads `proppath:pending-strategy-text` in the pending-prompt effect → `setPendingStrategyText`.
  - `selectedStrategyText = pendingStrategyText || selectedPill?.text || undefined` → passed to `useChatConversation` as `strategyProfileText`.
  - Header gear button now opens the manager (relabelled "Company strategies").
- **[`src/hooks/useChatConversation.ts`](../src/hooks/useChatConversation.ts)** — new option `strategyProfileText?: string`. Resolution: explicit option → else first saved strategy from `profiles.strategy_profiles` → else null. Passed to `nl-parse` as `strategyProfileText` (the existing field name — unchanged on the wire).

### Edge function (the inference) — DEPLOYED
- **[`supabase/functions/nl-parse/prompt.ts`](../supabase/functions/nl-parse/prompt.ts)** — the `## Company Strategy` section (the `strategyProfileSection`, appended near the END of the prompt, ~line 286) now instructs: *"Based on this company strategy AND the client's brief, set `strategyPreset` to whichever of the 5 presets best fits… Infer it — do NOT just keep the default."* Look for the literal string `Choosing the preset:`.
- **Deployed as `nl-parse` version 63, ACTIVE** via Supabase MCP `deploy_edge_function`.
- **Verified live** (same brief, different strategy): cash-flow text → `cf-low`, equity-growth text → `eg-high`, no strategy → `eg-low`. Inference works.

---

## 3. The architecture & data flow (end-to-end)

```
Company strategy TEXT (profiles.strategy_profiles[selected].text)
   │  (selected via pills; home-launch carries it via sessionStorage 'proppath:pending-strategy-text')
   ▼
ChatPanel → useChatConversation(options.strategyProfileText)
   │  POST body.strategyProfileText
   ▼
nl-parse edge fn  (Tier 2 single Anthropic call)
   • prompt.ts injects "## Company Strategy" section + inference instruction
   • AI returns a TOOL call (create_plan etc.) incl. strategyPreset + properties[]
   ▼
index.ts → validation.ts (clamp/auto-fix) → templates.ts (message)
   ▼  JSON response { type, strategyPreset, properties[], clientProfile, ... }
src/utils/nlDataMapper.ts
   • mapToInvestmentProfile / mapToPropertySelections / mapToExistingProperties
   • THREADS per-property: purchasePrice, growthAssumption, loanProduct, rentPerWeek, entity, period
   ▼
React contexts (InvestmentProfileContext, PropertySelectionContext, PropertyInstanceContext)
   ▼                                   ▼
ConfirmationBrief.tsx                useAffordabilityCalculator.ts (the ENGINE)
 (shows/edits Growth, Entity,         • getPropertyData(title, instance.growthAssumption)
  State, Price, Rent/wk, Loan)        • consumes rentPerWeek, growth tier, LVR, entity, period
   ▼                                   ▼
   └────────────► Dashboard charts / projections
```

### CONFIDENCE on "does it flow into the confirmation brief + dashboard?"
**HIGH for the scoped plan.** Verified:
- `nlDataMapper.mapToPropertySelections` already maps `rentPerWeek`, `growthAssumption`, `loanProduct`, `entity`, `purchasePrice` onto instances ([nlDataMapper.ts:240-257](../src/utils/nlDataMapper.ts)).
- `ConfirmationBrief` shows/edits Growth (segmented), Entity, State, Price, **Rent/wk**, Loan per property ([ConfirmationBrief.tsx:417-466](../src/components/ConfirmationBrief.tsx)).
- Engine reads `instance.growthAssumption` via `getPropertyData(...)` ([useAffordabilityCalculator.ts:632,665,738,876](../src/hooks/useAffordabilityCalculator.ts)) and uses `rentPerWeek` in cashflow.

**Implication:** because growth = nearest tier and yield = `rentPerWeek` (both already wired), Phase 2 molding mostly reuses existing plumbing. The ONLY genuinely new wiring is the `eg-to-cf` preset (Layer 2). **This is the key de-risking finding — preserve it.**

---

## 4. The granularity gaps (why Phase 2 exists)

Traced against two real beta-tester inputs.

### Input A: *"established freestanding homes $550–650k, high equity growth, 4.5–4.8% yield, growth 10% first 3 yrs then 7%, rent +5%/yr."*

| Dimension | Today | Status |
|---|---|---|
| Freestanding homes | → house type ("established" ignored) | ✅ mostly |
| $550–650k | AI sets `purchasePrice` | ✅ |
| High equity growth | infers `eg-low` (regional-house-growth is a house ~$620k, High growth; `eg-high` is $900k metro → ruled out by price) | ✅ |
| Rent +5%/yr | matches `profile.rentEscalationRate` default 0.05 ([useAffordabilityCalculator.ts:701](../src/hooks/useAffordabilityCalculator.ts)) | ✅ (lucky default) |
| Growth 10%→7% | quantized to a tier (High = 12.5/10/7.5/6). Exact curve lost. **Per Rob: nearest-tier is acceptable for now.** | ⚠️ by design |
| Yield 4.5–4.8% | defaults to ~4%; AI doesn't currently set rentPerWeek from yield | ❌ → Layer 1 |

### Input B: *"transition to cashflow / commercial properties halfway through."*

| Case | Today | Status |
|---|---|---|
| → commercial halfway | first-class `commercial-transition` preset: `phase1`=[metro/regional-house-growth], `phase2`=[commercial-*], `phase2LvrTarget`=70 ([propertyCells.ts:182](../src/utils/propertyCells.ts)) | ✅ |
| → cashflow halfway | **No preset.** Residential presets are single-mode. Flattens to one mode. | ❌ → Layer 2 |
| Transition *timing* ("halfway"/"year 7") | AI-inferred only; no control, no "switch at year X" event (`add_event` = refinance + salary_change only) | ❌ → Layer 2 (follow-up) |

### Root cause
Discrete buckets (5 presets, 10 cells, 3 tiers, single-mode) vs granular/continuous/phased strategies. **The engine already supports per-property granularity** (`growthCurve` type, `rentPerWeek`, `rentEscalationRate`, per-property LVR/loan/entity/period, two-phase `phase1`/`phase2`). The bottleneck is the **inference + output schema layer**, which only emits a coarse preset + tier and doesn't extract numbers.

---

## 5. THE PLAN — Phase 2 (do all 3 layers)

> Sequencing: **schema + engine first** (so values have somewhere to live) → **extraction prompt** → **transparency**. Prototype against Input A/B as we go.

### Layer 1 — Granular extraction (extract-at-generation)
Teach the AI to pull numbers from the strategy text and populate fields the engine already consumes. **Scoped per Rob's decisions:**
- **Yield → `rentPerWeek`.** Prompt guidance: "If the strategy states a yield (e.g. 4.5–4.8%), set each property's `rentPerWeek = round(purchasePrice × yield / 52)`." `rentPerWeek` already in tool schema + already flows end-to-end. **Mostly a prompt change.**
- **Growth → NEAREST tier.** Keep `growthAssumption` enum. Prompt guidance: "Map the stated growth expectation to the closest of High/Med/Low (curves listed)." NO new field, NO custom curve. (Rob's call.)
- **Cadence → `period`/`targetPeriod`.** Prompt guidance: "one per year" → space purchases ~2 periods apart (semi-annual; `PERIODS_PER_YEAR=2`). Field exists.
- **Loan structure** ("IO for 5 years") — `loanProduct` is single-value per property; IO→PI *switch at year X* is NOT representable yet. For now: set initial `loanProduct`; flag the switch as not-modelled (Layer 3). (Possible future: a loan-change event.)

### Layer 2 — Engine extensions

> **VERIFIED 2026-06-17 — there is NO runtime two-phase engine. "Phase" is entirely prompt-emergent.** Decisive findings:
> - The `create_plan`/`modify_plan` tool schema in [`tools.ts`](../supabase/functions/nl-parse/tools.ts) has **no `phase` field** on properties. Each property is flat: `type` (cell), `purchasePrice`, `state`, `growthAssumption`, `loanProduct`, `lvr`, `rentPerWeek`, `targetPeriod`.
> - `getCellsForPreset` and `getPresetLvrTarget` in `propertyCells.ts` have **zero call sites**. `STRATEGY_PRESETS` is read **only inside `propertyCells.ts`** (by those uncalled helpers); `getPresetDefaultPacing` is also uncalled. The whole `phase1`/`phase2`/`phase2LvrTarget` block is **dead scaffolding**.
> - `commercial-transition` produces a two-phase plan **purely via the prompt**: the preset table ([prompt.ts:225](../supabase/functions/nl-parse/prompt.ts)) tells the AI "Phase 1: …growth cells, Phase 2: commercial," and the LVR rule ([prompt.ts:232](../supabase/functions/nl-parse/prompt.ts)) says "Commercial (phase 2): 70%." The AI emits early properties (growth cells, 80%, low `targetPeriod`) and late properties (commercial cells, 70%, high `targetPeriod`). The engine just consumes the flat list.
>
> **Consequence:** the old worry ("is phase logic commercial-specific?") is moot — there's no engine phase logic to be gated. Building `eg-to-cf` is a **prompt + enum/type change, no engine work.** This is *more* de-risked than originally written.

- **Add `eg-to-cf` two-phase preset** — the high-value fix. Concrete change set:
  - **Prompt** ([`prompt.ts`](../supabase/functions/nl-parse/prompt.ts)): add a preset-table row `eg-to-cf | Phase 1: regional-house-growth, metro-unit-growth. Phase 2: regional-unit-cashflow, regional-house-cashflow`; add to the `PRESET_LABELS` map (~line 51); update the "5 presets" wording in the strategy/inference section to "6 presets" and describe the eg→cf intent. **Phase-2 LVR stays 80% (Rob's call) = the standard default, so NO new LVR rule needed.**
  - **Timing default (decision #3)** is also prompt-only: instruct the AI that when the strategy says "transition to cashflow" without a stated pivot point, start placing phase-2 (cashflow) properties at **~halfway through the plan horizon** (in periods: `targetPeriod ≈ timelineYears`, since `PERIODS_PER_YEAR=2`).
  - **Tool enum** ([`tools.ts`](../supabase/functions/nl-parse/tools.ts):103): add `'eg-to-cf'` to the `strategyPreset` enum (and the modify-plan copy if present).
  - **Type unions / labels (mirror EVERY site):** grep `'commercial-transition'` across `src/` + `supabase/` and add `'eg-to-cf'` beside each — at minimum `StrategyPresetId` in [`propertyCells.ts`](../src/utils/propertyCells.ts):105-107, `src/types/nlParse.ts`, `InvestmentProfileContext`, the `templates.ts` label map. **`STRATEGY_PRESETS` is `Record<StrategyPresetId, …>`, so once the union gains `eg-to-cf` TS will REQUIRE a `STRATEGY_PRESETS` entry to compile** — add one (it's dead at runtime but keeps types honest: `phase1`/`phase2` cells as above, `lvrTarget: 80`, no `phase2LvrTarget`, `defaultPacing: 'aggressive'`).
  - **Skip:** `system-prompt.ts`/`prompts/*` (DEPRECATED).
  - **⚠️ Check `StrategyPresetSelector.tsx`** — still imported & rendered at [`AgentHome.tsx:377`](../src/pages/AgentHome.tsx). Confirm whether `AgentHome` is a live route; if so, mirror `eg-to-cf` into its `PRESETS` too. (The new flow uses `NewClientView`, so `AgentHome` may be legacy — verify before deciding.)
- **Transition-point control (ACCEPTED — Rob, 2026-06-17):** let the strategy/brief specify *when* to pivot (year or property count) and pass a trigger. Today timing is AI-inferred. **Default: when no pivot point is stated, switch at the halfway point of the plan horizon.** Build as part of Layer 2.

### Layer 3 — Transparency (mandatory, do regardless)
The agent must SEE what was applied vs approximated/defaulted, so they never silently trust numbers that aren't theirs.
- Extend the `create_plan` template ([`templates.ts`](../supabase/functions/nl-parse/templates.ts)) and/or the ConfirmationBrief to state the applied assumptions: e.g. *"Modelled at High-tier growth (~12.5/10/7.5/6%), ~4.6% yield, 5% rent growth. Your stated 10%→7% growth was matched to the nearest tier."*
- Surface the **inferred preset** explicitly (ConfirmationBrief already edits `strategyPreset` — consider showing the inferred company-strategy → preset mapping).

---

## 6. Key files map

| Concern | File |
|---|---|
| Strategy data model | `supabase/migrations/20260617000000_add_strategy_profiles.sql`, `profiles.strategy_profiles` JSONB |
| Load/save strategies | `src/hooks/useStrategyProfiles.ts` |
| Pills UI | `src/components/CompanyStrategySelector.tsx` |
| Manager modal | `src/components/StrategyProfileModal.tsx` |
| Home chat box | `src/components/NewClientView.tsx` |
| In-client chat | `src/components/ChatPanel.tsx` |
| Chat hook (wire strategy text) | `src/hooks/useChatConversation.ts` |
| **Live AI prompt (Tier 2)** | `supabase/functions/nl-parse/prompt.ts` |
| Tool/output schema | `supabase/functions/nl-parse/tools.ts` |
| Action message templates | `supabase/functions/nl-parse/templates.ts` |
| Validation/auto-fix | `supabase/functions/nl-parse/validation.ts` |
| Presets & cells (incl. phases) | `src/utils/propertyCells.ts` |
| Growth tiers / rent escalation | `src/constants/financialParams.ts` (`GROWTH_RATE_TIERS`, `rentEscalationRate` default) |
| NL response → app state | `src/utils/nlDataMapper.ts` |
| Confirmation brief (review/edit) | `src/components/ConfirmationBrief.tsx` |
| The engine | `src/hooks/useAffordabilityCalculator.ts` |
| Preset enum type | `src/types/nlParse.ts`, `src/contexts/InvestmentProfileContext.tsx` |

⚠️ **DEPRECATED (Tier 1, do NOT edit):** `nl-parse/system-prompt.ts`, `pipeline.ts`, `response-schema.ts`, `prompts/*`. The live prompt is `prompt.ts`. (See `docs/CHATBOT-ARCHITECTURE.md`.)

---

## 7. Deploy & test

### Deploy the edge function (no CLI in this sandbox)
The Supabase CLI is **not installed / not on PATH** in the agent's Bash sandbox, and the agent likely lacks the user's access token — so the usual `supabase functions deploy` 2-second path is NOT available to the agent. **Use the Supabase MCP `deploy_edge_function`** (this is the project's confirmed standard from Rob's other session).
- The deployed `nl-parse` bundle is **exactly 6 files**, names prefixed `nl-parse/`: `index.ts, prompt.ts, tools.ts, templates.ts, validation.ts, feasibility.ts`. (NOT the deprecated files.)
- Deploy params: `project_id: "gaoqzrdzihmrwipwsbwo"`, `name: "nl-parse"`, `entrypoint_path: "nl-parse/index.ts"`, `verify_jwt: true`, `files: [{name: "nl-parse/<file>", content}]`.
- **Before deploying:** fetch the live bundle via MCP `get_edge_function` and confirm your local unchanged files are byte-identical, so you only ship your intended change (we verified this for v63). Doing the deploy via a subagent keeps ~70k chars of file content out of the main context.
- Current live version: **63**.

### Test
- **Eval harness:** `node tests/chatbot-eval/run-eval.mjs` — 50 real inputs, was 49/50. **Run after any prompt/schema change** to check for regressions (Rob hasn't run the full suite on v63 yet — recommended before calling Phase 1 locked).
- **Quick inference check pattern** (we used a temp script, since deleted): POST to `https://gaoqzrdzihmrwipwsbwo.supabase.co/functions/v1/nl-parse` with `Authorization: Bearer <ANON_KEY>` + `apikey` (ANON_KEY is in `run-eval.mjs`), body `{ message, conversationHistory:[], currentPlan:null, strategyPreset:'eg-low', planningDefaults:null, strategyProfileText:'<strategy>' }`, and read `response.strategyPreset`.

---

## 8. Gotchas / context for the next session

- **Nothing is committed.** `HEAD = dff9891`. All Phase 1 work is uncommitted in the working tree (4 modified + 2 new src files + 1 migration + modified `prompt.ts`). The **edge function IS deployed (v63)** even though the code is uncommitted — so prod AI ≠ committed code until someone commits. Commit when Rob says so (he hasn't yet).
- **Preview screenshot glitch:** the preview iframe viewport sometimes collapses to 1px wide → blank/clipped screenshots and unclickable elements. Fix with `preview_resize` to an explicit width (e.g. 1280×900). The DOM is fine; it's a tooling glitch.
- **Pre-existing lint:** `@typescript-eslint/no-explicit-any` errors exist throughout (e.g. `(row as any)`); our new files avoid `any` (use `Record<string, unknown>`). Don't be alarmed by ~7 "errors" — they're pre-existing.
- **`tsconfig` has `strictNullChecks: false`.**
- **Reverted work:** the 1-2-3 stepper is gone and rejected — do not resurrect.
- **Two "Client / Today" recents** (one "Draft") appeared in Rob's account during testing; not created by us — left alone.
- **Compliance:** the chatbot must NEVER say "metro house / regional / in QLD" etc. to the agent, and avoids banned words ("strategy", "recommend", "should", "aggressive", "passive income", "high-yield", "goal achieved", "wealth building"). Keep templates/messages compliant. (See `prompt.ts` Compliance section.)
- **The chatbot never surfaces property type/location** — so molding steers the cells, but the agent sees price/growth-tier/yield, not "metro house in NSW."

---

## 9. Decisions (resolved 2026-06-17 by Rob)
1. **Eval — SKIPPED.** The old 50-input harness (`run-eval.mjs`) is for the pre-strategy-inference system; Rob: *"it's a different system now, I don't see how that can help."* Don't treat 49/50 as a v63 baseline; don't gate Phase 1 on it.
2. **Commit — DONE.** Phase 1 committed straight to `main` and pushed (git pull → push) on 2026-06-17. (Prod edge fn was already deployed as v63; code now matches.)
3. **Transition-*timing* control — ACCEPTED, with a default.** Build it as part of Layer 2. **When the strategy/brief doesn't specify a pivot point, default to halfway through the plan horizon.** (This supersedes the "defer" lean in §5.)
4. **Loan-term switches (IO→PI at year X) — LOW PRIORITY.** Flag as not-modelled for now; revisit later. Don't build a loan-change event yet.
