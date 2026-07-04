# Compare Evolution — Build Plan

**Goal:** Compare runs the real affordability engine on two independent scenarios — Scenario A (saved plan) vs Scenario B (saved plan OR an AI-remodelled copy). Side-by-side editable purchases tables; a cell edit re-runs that side's engine.

**Status 4 Jul 2026 (later):** Phases 1+2 core BUILT — `src/engine/scenarioRunner.ts` (headless runScenario over the extracted engines; deep-copies inputs; materializes missing instances like createInstance; timelineLoanTypes={}, events/pauses=[]), `src/engine/scenarioMutator.ts` (applyNlResponseToScenario — pure re-host of ChatPanel's merge loop over the SHARED nlDataMapper, incl. compound mods, valuation auto-sync, orphaned-add net), `src/hooks/useScenarioRunner.ts` (env capture), `src/hooks/useCompareRemodel.ts` (nl-parse client: currentPlan built from the DRAFT's engine run so refinements compose; 30s timeout; stale-response guard). Compare.tsx: remodel mode fully wired — draft charts dashed+ring dots, changed rows tinted, infeasible years red, Model-check strip (mapper warnings + placement moves vs base run + failed tests), DEV parity console check (headless run vs saved snapshot on scenario A). Still dev-gated (REMODEL_ENABLED) pending real-data parity sign-off. NOT YET: editable table cells, save-draft-as-scenario, prod enablement.

**Status 4 Jul 2026:** Phase 0 (engine extraction) DONE — `src/engine/timelineEngine.ts` + `src/engine/projectionEngine.ts` extracted verbatim, hooks delegate, build/tsc/lint clean, verbatim-diff verified. The redesigned page SHIPPED as the real `src/pages/Compare.tsx` (dev prototype deleted): dashboard styling, KPI cards at plan horizon, purchases tables (read-only, derived from saved chartData purchase years joined to propertyInstances via propertyOrder — join refuses when counts mismatch), row-detail dialog from real instance fields, violet chart palette. "Remodel with AI" toggle is gated behind `REMODEL_ENABLED = import.meta.env.DEV` (composer shell only) so users never meet a dead input. Table editing + live engine re-runs come with Phase 1; the interim chart-order join gets replaced by the live timeline.

**Product rules (Rob, Jul 2026):**
- Two Scenario B modes only: Saved scenario / Remodel with AI. ("Describe new" was cut.)
- All numbers come from the real engine — never bent to fit. When the engine can't honour a request (e.g. commercial purchase not serviceable in the asked year), show an honest amber "Model check" note saying what it did instead.
- Draft signalling minimal: dashed line, hollow purchase dots, small "Draft" pill, violet-tinted changed rows. No explainer chips/bars/template pills.
- Page order (revised 4 Jul, above-the-fold spec): Scenario A/B cards → grey hairline rule → OUTPUT section: model-check strip (remodel mode only) → compact KPI cards (equity + cashflow at plan horizon 2040, A and B values side by side with delta meta) → two purchases tables → equity chart. Cashflow chart below the fold. NO year slider (Rob cut it — "kills the page"); KPIs read at the plan horizon.
- Styling must match the dashboard exactly: #FAFAFA page, ChartCard sections, gap-6 grid, `24px 28px 80px` full-width content column, global type classes (metric-label/stat-number/meta), semantic red #F04438 on negative figures.
- Condensed tables show Year/Type/State/Price/LVR/Rent; clicking a row pops a full-detail dialog (Contract / Loan / Purchase costs / Cashflow) — Rob approved this pattern 4 Jul. Detail values should be editable in the real build (same instance-field edits as the table).

## Architecture findings (investigated 4 Jul 2026)

- Pipeline is two stages, both already side-effect-free memo bodies:
  - **Stage 1 placement:** `src/hooks/useAffordabilityCalculator.ts` (~1300 lines) — `calculateTimelineProperties` memo (lines ~357–1070) → `TimelineProperty[]`. Affordability tests already extracted pure in `src/engine/affordabilityEngine.ts` (`checkAffordability`, `calculateAvailableFunds`, `EngineDeps` bridge).
  - **Stage 2 projection:** `src/hooks/usePortfolioProjection.ts` (~1650 lines) — single memo (~350–1566) → `portfolioGrowthData`, `cashflowData`, `roadmapData`. Already accepts a partial `scenarioData?` override. (The old 23k/41k-line useChartDataGenerator/useRoadmapData in CLAUDE.md no longer exist — this replaced them.)
- **Headless precedent:** `src/engine/planPreCheck.ts` runs the engine with zero React — but it once drifted (stale hardcoded growth curve, documented ~lines 150–156). Lesson: never fork the math; always pass the real `getPropertyData` from DataAssumptionsContext.
- **nl-parse application:** `ChatPanel.tsx` `handleModification`/`handleUpdateProfile` are thin wrappers over pure mappers in `src/utils/nlDataMapper.ts`; only the final setter calls are stateful → trivially redirectable to a scenario copy.
- **Saved scenario blob** has everything needed (`propertySelections`, `propertyOrder`, `investmentProfile`, `propertyInstances`, `existingProperties`). `eventBlocks`/`pauseBlocks` are NOT persisted — headless runs use `[]`, which matches the dashboard after a reload.
- **Table edits** map directly to `PropertyInstanceDetails` fields (see `PURCHASES_COLUMNS` in `PropertyCardRow.tsx`, cell editors in `utils/propertyCells.ts`).

**Chosen approach — Option A, pure extraction.** Hooks become thin context adapters over extracted pure functions; the headless runner calls the same functions. Parity is structural. (Option B — hidden sandbox provider tree — rejected: ScenarioSaveContext autosave could clobber real data, async settling per keystroke, singleton contexts.)

## Phases

### Phase 0 — extraction (zero behaviour change)  ← IN PROGRESS
- Create `src/engine/timelineEngine.ts`: move `calculateTimelineProperties` body + helpers → `computeTimelineProperties(inputs)` taking `{profile, propertyOrder, selections, propertyTypes, instances, existingProperties, eventBlocks, pauseBlocks, timelineLoanTypes, getPropertyData}`. Hook delegates.
- Create `src/engine/projectionEngine.ts`: move projection memo body → `computeProjection({profile, timelineProperties, instances, existingProperties, eventBlocks, getPropertyData})`. Hook delegates, keeps `scenarioData?` param.
- Gate hot-path `console.warn`s (affordabilityEngine.ts ~line 524; useAffordabilityCalculator ~1030–1036).
- Dev-only parity harness on the dashboard: snapshot contexts → `runScenario` → deep-compare vs live hook output, structured diff on mismatch.

### Phase 1 — runner + Compare live mode
- `src/engine/scenarioRunner.ts`: `runScenario(scenario: ScenarioInput, env: ScenarioEnv) → {timelineProperties, portfolioGrowthData, cashflowData, roadmapData, allFeasible, goal years}`. Normalize profile over defaults (planPreCheck pattern; `utils/scenarioRepair.ts` for old saves); materialize missing instances via `getPropertyInstanceDefaults` (the dashboard's auto-create effect does this — subtlest parity trap); never mutate caller input (timeline loop mutates purchase history records — deep-copy).
- `src/hooks/useScenarioRunner.ts`: captures env (`propertyTypes`, `getPropertyData`), memoized per-side runs, ~250ms debounce on edits.
- Rebuild `src/pages/Compare.tsx` per prototype: hydrate `ScenarioInput` per side from `scenarios.data` (use ScenarioSaveContext's translate helpers), live-run both sides, `generateComparisonChartData` merges chart output. Fallback to stored `chartData` for legacy saves.
- `src/components/compare/CompareScenarioTable.tsx`: condensed editable table (Year read-only from `affordableYear` · Type · State · Price · LVR · Rent), reuse cell editors, mirror price/valuation auto-sync (ChatPanel ~504–512). Edit → immutable instance update → debounced re-run of that side only.

### Phase 2 — AI remodel
- `src/engine/scenarioMutator.ts`: `applyNlResponseToScenario(scenario, response)` — pure re-host of ChatPanel's merge loop over `mapModificationToUpdates`/`mapUpdateProfileToUpdates`; returns new scenario + warnings.
- Remodel panel on Compare: slim nl-parse client (invoke shape per `useChatConversation.ts`), handle `modify_plan`/`update_profile` only, feed warnings + engine deltas into the amber Model-check strip. Changed instance ids drive violet row tint.
- Quiet "save draft as scenario" affordance (placement TBD with Rob — no explainer bar).

## Parity verification (before trusting any of it)
1. Dev parity harness on real client scenarios (dashboard live output vs `runScenario` on the exact persisted blob).
2. Round-trip: save scenario → reload app → dashboard chart === saved chartData === runScenario output.
3. Known parity conditions: pre-materialized instances; `timelineLoanTypes={}`; events/pauses `[]`; real `getPropertyData`.

## Key risks
- Input-assembly drift (instance materialization, profile default merge — verify `PropertyInstanceContext.createInstance` vs `getPropertyInstanceDefaults` agree).
- In-place mutation bleeding side A edits into side B (deep-copy in runner).
- `strictNullChecks: false` — undefined old-save fields become NaN; normalize first.
- Perf: fine for 3–6 property plans once hot-path warns are gated; debounce + re-run edited side only.
