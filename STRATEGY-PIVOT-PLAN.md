# Strategy Pivot Plan — Ben's 5 Presets + 10-Cell Matrix

**Status:** Draft for cofounder approval. Once approved, execute steps in order, no deviation.
**Replaces:** Pacing system + 8-template property model.
**Does not replace:** Engine math, chat+cards UI, scenario persistence, custom blocks, events.

---

## Read this first — drastic items needing your sign-off

These are decisions I cannot make unilaterally without confirmation. The plan halts at Step 0 until each is checked off.

| # | Decision | Recommendation |
|---|---|---|
| D1 | Drop `larger-blocks-10-20-units` (the $3.5M residential block template) | **Yes, drop.** Map any saved instances to `commercial-high-cost` during migration. |
| D2 | Migrate saved scenarios in Supabase in-place vs. archive-and-replace | **Migrate in-place.** Reversible only via Supabase backup. |
| D3 | Cell defaults (the 10-cell numeric table below — prices, yields, growth tiers) | **Use as-shown.** Calibrate later against research. |
| D4 | Strategy preset selector replaces `PacingToggle` in: (a) Dashboard header, (b) ChatPanel empty state | **Yes.** Same two surfaces, new control. |
| D5 | The chatbot's outputs WILL change for the same input. Existing regression baseline cannot be bit-for-bit valid afterwards | **Acknowledged.** New baseline captured as part of plan. |
| D6 | Old saved scenarios in Supabase get rewritten with new cell IDs. If a BA had a saved plan referencing `duplexes`, it becomes `regional-house-cashflow` | **Acknowledged.** Migration map below. |

If any of D1-D6 is "no" or "wait," tell me and I'll revise the plan before any code changes.

---

## What stays untouched (safety perimeter)

- The financial engine (`useAffordabilityCalculator`, `useChartDataGenerator`, `useRoadmapData`) — input shape changes but math is identical.
- `PERIODS_PER_YEAR`, `SERVICEABILITY_FACTOR`, `RENTAL_RECOGNITION_RATE`, `EQUITY_EXTRACTION_LVR_CAP`, `DEFAULT_EQUITY_FACTOR`, `GROWTH_RATE_TIERS` — all constants.
- `PropertyInstanceDetails` — keeps all 30 fields. **One** new optional field added (`mode`).
- Chat UI, cards UI, dashboard, charts, PDF export — no changes.
- Custom blocks, pause blocks, events — no changes.
- Stripe billing, auth, white-label branding — no changes.
- Saved scenario shape — same Supabase schema, only the property type *keys* change.

If anything outside this perimeter starts changing during execution, I'll stop and ask.

---

## The 10-cell matrix (canonical reference for all steps)

### Cell IDs and defaults

| Cell ID | Type | Mode | Default state | Price | Rent/wk | Yield | Growth tier | LVR | Rate | Term |
|---|---|---|---|---|---|---|---|---|---|---|
| `metro-house-growth` | Metro House | Growth | NSW | $850,000 | $570 | 3.5% | High | 88% | 6.5% | 30y |
| `metro-house-cashflow` | Metro House | Cashflow | QLD | $700,000 | $605 | 4.5% | Medium | 88% | 6.5% | 30y |
| `regional-house-growth` | Regional House | Growth | QLD | $600,000 | $520 | 4.5% | High | 88% | 6.5% | 30y |
| `regional-house-cashflow` | Regional House | Cashflow | NSW | $480,000 | $555 | 6.0% | Medium | 88% | 6.5% | 30y |
| `metro-unit-growth` | Metro Unit | Growth | VIC | $550,000 | $425 | 4.0% | Medium | 88% | 6.5% | 30y |
| `metro-unit-cashflow` | Metro Unit | Cashflow | QLD | $420,000 | $445 | 5.5% | Low | 88% | 6.5% | 30y |
| `regional-unit-growth` | Regional Unit | Growth | NSW | $420,000 | $405 | 5.0% | Medium | 88% | 6.5% | 30y |
| `regional-unit-cashflow` | Regional Unit | Cashflow | QLD | $360,000 | $450 | 6.5% | Low | 88% | 6.5% | 30y |
| `commercial-high-cost` | Commercial | HighCost | VIC | $2,000,000 | $2,115 | 5.5% | Medium | 70% | 7.5% | 25y |
| `commercial-low-cost` | Commercial | LowCost | QLD | $700,000 | $1,075 | 8.0% | Low | 65% | 7.5% | 20y |

### Expense defaults per cell (council/water, insurance, strata, maintenance)

Inherits from the closest existing template, with adjustments for mode:

| Cell ID | Council/water (yr) | Insurance (yr) | Strata (yr) | Maintenance (yr) | Mgmt % |
|---|---|---|---|---|---|
| `metro-house-growth` | $3,500 | $2,000 | $0 | $4,000 | 8.0% |
| `metro-house-cashflow` | $3,200 | $1,800 | $400 | $3,500 | 8.0% |
| `regional-house-growth` | $2,200 | $1,500 | $0 | $2,500 | 8.0% |
| `regional-house-cashflow` | $2,000 | $1,500 | $0 | $2,200 | 8.0% |
| `metro-unit-growth` | $2,200 | $1,300 | $2,800 | $1,800 | 8.0% |
| `metro-unit-cashflow` | $2,000 | $1,200 | $2,500 | $1,600 | 8.0% |
| `regional-unit-growth` | $2,000 | $1,200 | $2,000 | $1,600 | 8.0% |
| `regional-unit-cashflow` | $1,800 | $1,200 | $1,800 | $1,500 | 8.0% |
| `commercial-high-cost` | $6,000 | $4,000 | $6,000 | $10,000 | 6.0% |
| `commercial-low-cost` | $4,000 | $3,000 | $3,000 | $5,000 | 6.0% |

### Acquisition cost defaults per cell

Conveyancing/inspection/mortgage fees — these scale with price band, not cell-by-cell. Use these three bands:

| Band | Engagement fee | Holding deposit | Bldg insurance upfront | B&P | Mortgage fees | Conveyancing | Maintenance allowance |
|---|---|---|---|---|---|---|---|
| Sub-$500k | $8,000 | 2% of price | $1,500 | $700 | $1,000 | $2,200 | $1,500 |
| $500k–$1M | $10,000 | 2% of price | $1,800 | $800 | $1,200 | $2,500 | $2,500 |
| $1M+ (commercial) | $15,000 | 3% of price | $4,500 | $900 | $1,500 | $3,000 | $5,000 |

### Strategy presets and cell biases

| Preset ID | Name | Primary cells | Secondary cells |
|---|---|---|---|
| `eg-low` | Equity Growth — Low Price Point | `regional-house-growth`, `metro-unit-growth` | `regional-unit-growth` |
| `eg-high` | Equity Growth — High Price Point | `metro-house-growth` | `metro-unit-growth` |
| `cf-high` | Cash Flow — High Price Point | `metro-house-cashflow`, `commercial-high-cost` | `regional-house-cashflow` |
| `cf-low` | Cash Flow — Low Price Point | `regional-unit-cashflow`, `regional-house-cashflow` | `commercial-low-cost` |
| `commercial-transition` | Commercial Transition | Phase 1: `metro-house-growth`, `regional-house-growth`<br>Phase 2: `commercial-high-cost`, `commercial-low-cost` | — |

### Saved-scenario migration map (old → new)

| Old key (positional id) | Old defaults | New cell ID | Notes |
|---|---|---|---|
| `units-apartments` (property_0) | $350k VIC Medium 88% | `metro-unit-cashflow` | Yield-leaning unit |
| `villas-townhouses` (property_1) | $325k QLD High 88% | `metro-unit-growth` | Growth-leaning attached dwelling |
| `houses-regional` (property_2) | $350k NSW High 88% | `regional-house-growth` | Growth-corridor regional |
| `duplexes` (property_3) | $550k QLD High 88% | `regional-house-cashflow` | Yield-tilted regional |
| `small-blocks-3-4-units` (property_4) | $900k NSW Medium 80% | `metro-unit-cashflow` | Yield play |
| `metro-houses` (property_5) | $800k VIC High 88% | `metro-house-growth` | Direct match |
| `larger-blocks-10-20-units` (property_6) | $3.5M NSW Medium 55% | `commercial-high-cost` | Drop-recommend; alias for now (D1) |
| `commercial-property` (property_7) | $3M VIC Low 60% | `commercial-low-cost` | Profile match (Low growth, 8% yield) |

**Important migration rule:** the saved instance's `purchasePrice` and other instance fields are preserved. Only the *type association* changes. So an existing $900k small-block instance becomes a `metro-unit-cashflow` instance with `purchasePrice: 900000` retained — its dollar values don't move; just its label and growth tier reassignment.

---

# Phase 0 — Pre-flight (no code changes)

## Step 0.1 — Capture pre-change baseline
**Files:** none. Local capture only.
**Action:**
- Run the dev server.
- Manually run three fixed scenarios through the chatbot and save: (a) "Jane and John, both 120k, 80k deposit, want $1M equity in 12 years" (b) "Sarah, 95k, 50k saved, two QLD properties" (c) "Marcus and Lisa, 210k+180k, 200k deposit, 6 properties in 10 years aggressive."
- Save each output: clientProfile JSON, properties array, refinementOptions, dashboard year-by-year totalEquity. Store in `regression-baselines/pre-pivot-{a,b,c}.json`.
- Run the existing regression baseline suite (commit 7bb8b57 added artifacts) and save current numbers.

**Acceptance:** Three baseline files saved. Regression suite passes against current commit.

**Why this matters:** the chatbot WILL produce different outputs after pivot. We need pre-pivot snapshots to (a) prove engine math is unchanged for like-for-like properties, (b) produce a meaningful diff for cofounder review post-pivot.

## Step 0.2 — Confirm decisions D1-D6 with cofounder
**Action:** Get explicit yes/no on each of D1-D6 above. Halt if any "no."

---

# Phase 1 — Schema additions (additive, non-breaking)

Goal: lay down the new model without removing anything yet. Old code keeps working in parallel. Easy to revert.

## Step 1.1 — Add `mode` field to PropertyInstanceDetails
**File:** `src/types/propertyInstance.ts`
**Change:**
```ts
/** Strategic configuration mode for the property type.
 *  Growth | Cashflow for residential; HighCost | LowCost for commercial.
 *  Optional during migration — defaults inferred from cell ID. */
mode?: 'Growth' | 'Cashflow' | 'HighCost' | 'LowCost';
```
**Acceptance:** Build clean. Existing scenarios load and run unchanged (field is optional).

## Step 1.2 — Add `strategyPreset` field to InvestmentProfileData
**File:** `src/contexts/InvestmentProfileContext.tsx`
**Change:**
```ts
/** Strategic preset selected by the BA. Drives chatbot cell selection and
 *  property sequencing. Optional during migration — defaults to 'eg-low'. */
strategyPreset?: 'eg-low' | 'eg-high' | 'cf-low' | 'cf-high' | 'commercial-transition';
```
Default in initial state: `strategyPreset: 'eg-low'`. Keep `pacingMode` field intact for now (Phase 5 removes it).

**Acceptance:** Build clean. Existing profiles load with default preset.

## Step 1.3 — Create `propertyCells.ts` (single source of truth)
**File:** `src/utils/propertyCells.ts` (new)
**Contents:** Export the 10 cell IDs, their type/mode mapping, the preset-to-cell-bias mapping, the old-key-to-new-key migration map, helper `getCellDefaults(cellId)`, and helper `inferModeFromCellId(cellId)`. This becomes the canonical lookup the rest of the code reads from.

**Acceptance:** Unit-style sanity: `getCellDefaults('metro-house-growth').growthAssumption === 'High'`. Build clean.

## Step 1.4 — Create `property-defaults-v4.json`
**File:** `src/data/property-defaults-v4.json` (new)
**Contents:** Object keyed by the 10 cell IDs. Each value matches the `PropertyInstanceDetails` shape (all 30 fields populated, including new `mode` field). Numbers per the matrix above.

**Acceptance:** JSON parses. `Object.keys(v4).length === 10`. Each entry passes the `validatePropertyInstance()` check in `applyPropertyOverrides.ts:47`.

## Step 1.5 — Add saved-scenario read-time alias layer
**File:** `src/utils/propertyCells.ts` (extend Step 1.3)
**Change:** Add `translateLegacyTypeKey(oldKey: string): { newCellId: string; modeOverride: string }` that maps the 8 old keys to new cell IDs. Used at scenario load time.

**Acceptance:** `translateLegacyTypeKey('duplexes').newCellId === 'regional-house-cashflow'`.

---

# Phase 2 — Wire new model into the engine input layer

Goal: the engine starts producing correct projections for the new cells without any UI change yet.

## Step 2.1 — Update `propertyInstanceDefaults.ts` to read v4 JSON when given a cell ID
**File:** `src/utils/propertyInstanceDefaults.ts`
**Change:** Extend `getPropertyInstanceDefaults(propertyType)` to:
1. First check if `propertyType` is a v4 cell ID → return v4 defaults.
2. Else, fall back to existing v3 lookup (for back-compat during transition).

**Acceptance:** Calling with `'metro-house-growth'` returns the new cell's defaults. Calling with `'duplexes'` still returns old defaults (unchanged behaviour).

## Step 2.2 — Update `DataAssumptionsContext.tsx` to expose new cell list
**File:** `src/contexts/DataAssumptionsContext.tsx`
**Change:** The `propertyTypeTemplates` array currently built from the 8 old keys. Rebuild from the 10 new cells (read v4 JSON). Add `cellId`, `mode` fields to each template object.

**Acceptance:** `propertyTypeTemplates.length === 10`. Each has `cellId` and `mode`. Used by `PropertySelectionContext.propertyTypes` downstream — that consumer keeps working because field shape is a superset.

## Step 2.3 — Migrate `nlDataMapper.ts` engine-ID generation
**File:** `src/utils/nlDataMapper.ts`
**Change:** Replace positional `property_${index}` engine IDs with the cell ID directly. So `metro-house-growth_instance_0` instead of `property_5_instance_0`. Add an inbound translation: when loading saved scenarios with old `property_N_instance_M` IDs, run them through the alias layer (Step 1.5) and rewrite to new IDs.

**Acceptance:** New plans use semantic IDs. Old saved scenarios load with translated IDs. No `property_N` artefacts written.

## Step 2.4 — Update `nlParse.ts` request/response contract
**File:** `src/types/nlParse.ts`
**Change:**
- Add `mode` to `properties[]` items in both request and response shapes.
- Add `strategyPreset` to `currentPlan.investmentProfile`.
- Add `strategyPreset` to `NLParseResponse` (for chatbot to confirm/echo back what it picked).
- Remove `pacing?: 'aggressive' | 'balanced' | 'conservative'` from `NLParseResponse` — replaced by `strategyPreset`.

**Acceptance:** TypeScript clean. Edge function signature stays compatible.

---

# Phase 3 — Rewrite the chatbot brain

Goal: the system prompt teaches Claude the new model. This is the biggest behavioural change.

## Step 3.1 — Rewrite `system-prompt.ts` strategy section
**File:** `supabase/functions/nl-parse/system-prompt.ts`
**Change:**
- **Delete** lines 34-40 (Pacing Mode header injection).
- **Delete** lines 263-267 (Pacing / Speed Recognition).
- **Delete** lines 273-277 (pacing-driven timeline spacing rules).
- **Replace** lines 116-142 (Property Types Available + Choosing Property Types + Growth Rate Tiers) with the new sections:
  - **Strategy Presets** — list the 5 presets, what they mean, how the BA picks one.
  - **The 10-Cell Matrix** — table of cells with type, mode, default price band, growth tier, yield, default state.
  - **Cell Selection Rules** — given a preset, which cells are primary vs secondary; capacity-relative price banding (Low = bottom 50% of capacity/N, High = top 50%).
  - **Count Derivation** — try N=2, 3, 4, 5, 6; pick smallest N that the projected math reaches the goal at horizon (rough mental math; engine confirms). If horizon not given, default 15 years. If goal not given, default to the preset's natural shape (EG → equity goal of 2x deposit pool by year 15; CF → income goal of $50k passive by year 15).
  - **Job Sequencing** — internal vocabulary E/Y/M/B (BA never sees these labels); typical sequences per preset.
  - **Infeasibility Flag** — if the synthesised plan obviously cannot hit the goal, say so explicitly: "Best realistic path is $Xm in Y years — to hit the goal you'd need [more time / higher LVR / bigger capacity]."

**Update line 117 property type table** to list the 10 new cell IDs. Each entry: `cellId | Type | Mode | Default Price | Default State | LVR | Growth Tier`.

**Update example outputs** (lines 308-518) to use new cell IDs and include `mode` and `strategyPreset` fields.

**Acceptance:** Prompt builds. Edge function deploys. Manual test: send "Jane and John 120k each 80k deposit eg-low" — chatbot returns properties with cell IDs from the eg-low primary list, includes `mode` field, includes `strategyPreset: 'eg-low'`.

## Step 3.2 — Update `nl-parse/index.ts` to thread strategyPreset
**File:** `supabase/functions/nl-parse/index.ts`
**Change:** Replace `pacingMode` parameter (line 57) with `strategyPreset`. Pass to `buildSystemPrompt(currentPlan, strategyPreset)`. Update `buildSystemPrompt` signature accordingly.

**Acceptance:** Edge function deploys. End-to-end chat call works with new param.

## Step 3.3 — Update `useChatConversation.ts` and `ChatPanel.tsx` to pass strategyPreset
**Files:**
- `src/hooks/useChatConversation.ts:55-56,183` — replace `pacingMode` with `strategyPreset`.
- `src/components/ChatPanel.tsx:287` — read `profile.strategyPreset` instead of `profile.pacingMode`.

**Acceptance:** Chat call sends preset. Edge function receives it. No more `pacingMode` references in chat plumbing.

---

# Phase 4 — UI swap

Goal: BA sees the new strategy preset selector and the new cell labels.

## Step 4.1 — Build `StrategyPresetSelector.tsx`
**File:** `src/components/StrategyPresetSelector.tsx` (new)
**Action:** A direct visual replacement for `PacingToggle`. Same two display modes (full + compact). Five buttons:
- Equity Growth — Low (icon: arrow-up small)
- Equity Growth — High (icon: arrow-up large)
- Cash Flow — High (icon: dollar-sign large)
- Cash Flow — Low (icon: dollar-sign small)
- Commercial Transition (icon: building)

Reads/writes `profile.strategyPreset` from `useInvestmentProfile`. Same visual styling as PacingToggle (steal palette and class names from `PacingToggle.tsx` directly so it visually matches the rest of the app).

**Acceptance:** Component renders, click changes preset, persistence works through profile.

## Step 4.2 — Replace PacingToggle mounts
**Files:**
- `src/components/Dashboard.tsx` (or wherever PacingToggle compact is mounted in the dashboard header)
- `src/components/ChatPanel.tsx` (empty state — full mode)

**Action:** Swap `<PacingToggle />` for `<StrategyPresetSelector />`. Same props pattern (`compact` boolean).

**Acceptance:** Both surfaces show the new selector. Old PacingToggle no longer rendered anywhere.

## Step 4.3 — Update PostPlanRefinement.tsx
**File:** `src/components/PostPlanRefinement.tsx:81-90`
**Action:** Replace the `pacing` category with a `strategy` category:
- Label: "Switch strategy"
- Sub-options: each of the 4 *other* presets (excluding the currently active one) as switch options. e.g. if current is `eg-low`, options become "Switch to high price equity growth", "Switch to cash flow", "Switch to commercial transition".

**Acceptance:** Refinement flow no longer mentions pacing. Switching preset triggers a re-plan via chat.

## Step 4.4 — Update property card display labels
**Files:**
- `src/components/PropertyCardRow.tsx`
- `src/components/PropertySummaryCard.tsx`
- `src/components/PropertyDetailPanel.tsx`
**Action:** Where these read `getBucketForPropertyType(...)` from `propertyTypeBuckets.ts`, switch to reading `cellId` directly from the instance, then look up display label from `propertyCells.ts` (e.g. "Metro House — Growth").

**Acceptance:** Cards show "Metro House — Growth" / "Regional Unit — Cashflow" etc. instead of old buckets.

## Step 4.5 — Update remaining type-key consumers
**Files:** `src/utils/propertyTypeIcon.tsx`, `src/components/icons/PropertyIcons.tsx`, `src/components/AddToTimelineModal.tsx`, `src/components/TitleDeedCard.tsx`, `src/pages/Portfolio.tsx`, `src/pages/DataAssumptions.tsx`
**Action:** Each of these has a hardcoded `'units-apartments': '/images/properties/units-apartments.png'` or similar. Update each to a 10-cell map. Reuse old image filenames where they're still relevant (metro-house, regional-house, unit images; rename if needed).

Image file actions:
- Keep `/images/properties/metro-houses.png` → rename to `metro-house-growth.png` and `metro-house-cashflow.png` (duplicate the file under both names initially; cofounder can swap one image later).
- Same pattern for other images.

**Acceptance:** Every component renders an image and label for all 10 cells. No 404s.

---

# Phase 5 — Cleanup and migration

## Step 5.1 — Saved-scenario migration script
**File:** `scripts/migrate-saved-scenarios.ts` (new — one-shot script)
**Action:** Read all rows from Supabase `scenarios` table. For each row's stored `selections`, `propertyOrder`, and `instances`:
1. Translate any old type keys via the alias map (Step 1.5).
2. Set `mode` field on each instance based on its new cell ID.
3. Rewrite instance IDs from `property_N_instance_M` → `<cellId>_instance_M`.
4. Update `propertyOrder` and `selections` accordingly.
5. Write back via Supabase upsert.

**SAFETY GATE:**
- Do NOT run this script automatically. It runs as a manual one-shot AFTER cofounder backs up the Supabase `scenarios` table (export to CSV via Supabase dashboard).
- Script logs each row before+after. First run is `--dry-run` only.
- Cofounder reviews dry-run output before live run.

**Acceptance:** Dry-run shows correct translation for 100% of rows. Live run rewrites every scenario in place. Sample saved scenario loads without errors after migration.

## Step 5.2 — Remove `pacingMode` from codebase
**Files:**
- `src/contexts/InvestmentProfileContext.tsx` — remove `pacingMode` field, default, and any references.
- `src/components/PacingToggle.tsx` — delete file.
- `src/components/PlanningDefaultsModal.tsx:23,242-247` — remove `defaultPacing` setting.
- `src/landing/components-new/Hero.tsx:223` — remove the "Change timing / pacing" demo line; replace with a strategy line.
- Any remaining references found via `grep -r pacingMode src/ supabase/`.

**Acceptance:** `grep -r "pacingMode\|PacingMode\|'aggressive'.*'balanced'.*'conservative'" src/ supabase/` returns zero matches.

## Step 5.3 — Replace `property-defaults.json` content with v4
**Files:**
- `src/data/property-defaults.json` — overwrite with v4 contents (the 10 cells).
- Delete `src/data/property-defaults-v3.json`, `property-defaults-NEW.json`, `property-defaults-CLEAN.json`, `property-defaults-v4.json` (after copying v4 over the canonical file).

**Acceptance:** Only one `property-defaults.json` remains, contains 10 cells.

## Step 5.4 — Delete `propertyTypeBuckets.ts`
**File:** `src/utils/propertyTypeBuckets.ts` — delete.
**Action:** Confirm no remaining importers via `grep -r propertyTypeBuckets src/`. Replace any final references with `propertyCells.ts` equivalents.

**Acceptance:** File deleted. Build clean.

## Step 5.5 — Update `DataAssumptions.tsx` page
**File:** `src/pages/DataAssumptions.tsx`
**Action:** This is the page where users edit per-template defaults. Now keyed by the 10 cell IDs. Update column headers, image map, label list. Same UX, new entries.

**Acceptance:** Page loads, shows 10 cells, edits persist correctly.

---

# Phase 6 — Verification

## Step 6.1 — Engine math regression
**Action:** Run the regression baseline suite (commit 7bb8b57 artifacts). For each baseline scenario, manually create the equivalent in the new system using cell IDs that match the old templates per the migration map. Confirm year-by-year `portfolioValue`, `totalEquity`, `totalDebt` match within rounding (cents) to pre-pivot.

**Acceptance:** All baseline scenarios match within $1 of pre-pivot numbers for like-for-like properties.

## Step 6.2 — Chatbot output regression
**Action:** Run the three Phase 0.1 scenarios through the new chatbot. Compare:
- Engine math for the picked properties: should match pre-pivot for properties of the same growth tier and price.
- Property selection: WILL DIFFER (intentional). For each scenario, write a one-paragraph summary of how the new selection differs and whether it's defensible (e.g. "Pre-pivot picked metro-houses + duplexes; post-pivot picked metro-house-growth + regional-house-cashflow under eg-low — same shape, just labeled correctly.")

**Acceptance:** Differences are explicable in terms of preset bias, not engine drift.

## Step 6.3 — Manual UI walkthrough
**Action:** From a fresh client:
1. Pick a strategy preset (e.g. EG Low).
2. Type "Jane and John, both 120k, 80k deposit, $1m equity in 12 years."
3. Confirm chatbot returns plan with eg-low primary cells.
4. Open dashboard. Confirm cards show "Regional House — Growth" / "Metro Unit — Growth" labels.
5. Edit one card's price via the card UI. Confirm cascade math (downstream timings) updates but cell types stay locked.
6. Send "switch to cash flow low" in chat. Confirm new plan uses cf-low primary cells.
7. Save scenario. Reload. Confirm everything restored correctly.

**Acceptance:** All seven steps work without console errors or UI glitches.

## Step 6.4 — Saved scenario load test
**Action:** Take a pre-migration saved scenario (one of the cofounder's existing scenarios), run it through migration in dry-run mode, then live, then load it. Confirm dashboard renders correctly with translated cell labels and engine projection unchanged.

**Acceptance:** Pre-migration scenario opens successfully post-migration with same numerical projection.

---

# Drastic-failure rollback plan

If anything in Phase 6 fails badly:

- **Phase 1-3 changes**: revertable via `git revert` on individual commits. No data loss.
- **Phase 4 (UI swap)**: revertable via `git revert`. No data loss.
- **Phase 5.1 (saved scenario migration)**: rollback requires restoring Supabase backup taken pre-migration. **The backup is mandatory before Step 5.1 runs** — confirmation D2 captures this.
- **Phase 5.3 (delete legacy JSON)**: revertable via `git revert`. The legacy v3/NEW/CLEAN files come back.

If any step fails in a way I can't diagnose, I stop, leave the worktree in its last-good state, and surface the failure in chat for cofounder input. I do not push half-finished commits.

---

# Estimated effort and ordering

| Phase | Steps | Effort | Notes |
|---|---|---|---|
| 0 | Pre-flight | 30 min | Halt for confirmations |
| 1 | Schema additions | 2-3 hrs | Pure additive, low risk |
| 2 | Engine wiring | 2-3 hrs | Most subtle — engine ID rewrite |
| 3 | Chatbot rewrite | 4-6 hrs | Largest behavioural change |
| 4 | UI swap | 3-4 hrs | Many small files |
| 5 | Cleanup + migration | 3-5 hrs | Migration script + legacy delete |
| 6 | Verification | 2 hrs | Manual + automated |
| **Total** | | **~16-23 hrs over 3-4 days** | Sequential; cannot parallelise |

Each phase commits separately. Each phase is independently revertable. I do not start a phase until the previous one's acceptance criteria are met.

---

# Open questions to confirm before Step 1.1

1. D1-D6 sign-off (above).
2. **Phase 5.1 timing** — run saved-scenario migration the moment Phase 4 ships, or wait a few days to let the new chatbot bake on new clients first? Recommendation: wait. New chats use new model; saved scenarios load through the alias layer until migration runs.
3. **Hidden "Advanced" cells** — D1 drops `larger-blocks-10-20-units`. If you ever sold a plan with one, the BA may notice it gone. Recommendation: drop, and if a BA asks, tell them to use Commercial High Cost.
4. **Custom blocks** — these survive untouched (Phase 0 safety perimeter). A BA can still create custom property types. Confirm this is the intent.
5. **Image assets** — Step 4.5 duplicates existing PNGs under new names. Recommendation: ship as-is, then the cofounder can swap individual images for cell-specific ones over the following weeks.

---

**End of plan.**
