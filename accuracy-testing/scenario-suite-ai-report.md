# Scenario Accuracy Suite — Live-AI Results (vs Engine-Only)

**Date:** 2026-07-16
**Harness:** `accuracy-testing/run-scenario-suite-ai.ts` — feeds each scenario's natural-language brief through the REAL production nl-parse pipeline (the Tier-2 single-call architecture actually deployed in `supabase/functions/nl-parse/index.ts`: `prompt.ts` + `tools.ts` + `validation.ts` + `templates.ts` + `feasibility.ts`), applies the AI output through the SAME code path the app uses (`planPreCheck`/`autoFixPlan` + `nlDataMapper` for create_plan, `scenarioMutator` for modify_plan, the `handleUpdateProfile` equivalent for update_profile), runs the real engine, and grades with the SAME expectations as the engine-only suite (`scenario-suite.ts`).
**Model:** `claude-sonnet-4-6` (the `MODEL` constant in the production edge function), temperature 0, one pass, no retries beyond the pipeline's own transient-error retry.
**Run:** `npx vite-node accuracy-testing/run-scenario-suite-ai.ts` (`--only ID` supported; merges into the results file). Machine-readable results: `accuracy-testing/scenario-suite-ai-results.json`.

**Fixtures replay ALL of the tester's user turns verbatim** from the fixture's `chatHistory` (threading `conversationHistory` + `currentPlan` between turns exactly like the app), not just the first message — several graded expectations ("only one purchase", "seven-year timeframe") come from follow-up turns. Variants send the suite brief as one fresh-client turn.

**Headline: 6 PASS / 12 FAIL / 2 EXPECTED-FAIL (engine-only was 5 / 13 / 2).** The scenario-level pass rate barely moved, but the *composition* of the failures changed a lot — extraction and trust-assignment failures are largely gone; what remains is dominated by the engine-side cashflow-goal silent miss plus a newly visible chat-vs-state divergence mechanism.

---

## Headline: which failure clusters reproduce TODAY

| # | Cluster (from engine-only report) | Status today | Evidence |
|---|---|---|---|
| 1 | Goal-feasibility silent miss | **STILL REPRODUCES** (partially improved) | Cashflow goals are still never feasibility-checked (`feasibility.ts` is equity-only) and 7 scenarios still miss the stated cashflow goal with no shortfall statement: ANU-275 ($46.9k max vs $200k), ANU-287 ($60.9k vs $100k), ELLA-314 ($31.1k vs $150k), ELLA-317 ($66.0k vs $250k), JULIAN-290 ($69.2k vs $100k), VAR-CF-80K ($30k reached 2045 vs stated 2040), VAR-EGCF-150K ($38.8k vs $80k). *Improvement:* the equity-goal descriptor now fires in chat — FIX-JULIAN-210's live reply opens with "Reaching $2M is tight on this profile — the model lands close but not clear", and JULIAN-210 now actually reaches both goals (2041). |
| 2 | Silent deferral / pacing | **STILL REPRODUCES** (less silent, less severe) | VAR-ADAM-BAND: "3 properties … over the first three years" still places P2 in 2029 and P3 in 2032 (June engine-only: 2031/2036). The deferral now happens in `autoFixPlan` ("Moved from 2027 to 2031 to allow savings to accumulate") — recorded in `_autoFixChanges` shown on the confirmation brief, but the chat message itself still reads as clean success. Pacing: ELLA-317 still buys at avg 1.67y gap vs the ≥1.75y criterion; but VAR-EG-250K-BLUECHIP now PASSES — the live AI expresses pacing via per-property `targetPeriod`, which the faithful-extraction variant couldn't. |
| 3 | Plan selection (archetype/band violations) | **PARTIALLY FIXED** | Fixed: ANU-287's absurd $245k @ 49.5%-yield "commercial" is gone (live: commercial-high-cost at $1.345M with sane rent); JULIAN-210 now assigns trusts to properties 2-4 (June: zero) and all 4 place feasible; every `trust-usage` check now passes. Still failing: blue-chip selection for $250k earners (ELLA-317 avg $520k vs $650k floor; ELLA-315 ends with 0 properties), JULIAN-210 has no commercial finisher and auto-fix *introduced* a $200k price-band violation, VAR-CF-150K-BANDS has a marginal yield miss (5.45% vs stated 5.5% floor — rent rounding). |
| 4 | Chat-vs-saved divergence | **NOT FULLY TESTABLE headlessly — but the in-memory analog REPRODUCES, with a mechanism found** | There is no Supabase persistence in this harness, so "saved state" here is the in-memory plan the mapper produced; DB-write divergence is explicitly NOT exercised and is NOT marked fixed. What did reproduce: (a) **FIX-ELLA-314** — chat says "Removed property 2 from the plan. Removed property 3 … Removed property 4" but 2 of 4 properties remain. Root cause identified: compound removals are applied sequentially and each `property-N` index is resolved against the *already-mutated* list (`mapModificationToUpdates` via `scenarioMutator`/ChatPanel's identical loop) — remove #2 shifts everything, "remove #3" hits the original #4, "remove #4" is out of range and is *silently* dropped (console.warn only, no user-facing warning). This exactly explains June's "Removed property 2..5" leaving 3 of 5. (b) **FIX-ELLA-315** — chat says "Built a 4-property plan, priced from $380k to $750k" while `autoFixPlan` removed ALL 4 ("could not fit within borrowing capacity") → state has 0 properties; the message is templated before auto-fix runs. (c) **FIX-ANU-287** — chat says "priced from $450k to $2M" while auto-fix had already cut the commercial to $1.345M. |
| 5 | Extraction errors | **MOSTLY FIXED** | ANU-275: "seven-year timeframe" now lands (`update_profile` → timelineYears 7; June saved 20); "no existing properties" no longer materialises a phantom existing property (June: 1 existing @ portfolioValue $630k); property count is sane (5-6 vs June's 1). JULIAN-290: `cashflowGoal` now 100,000 (June saved 50,000) and `useExistingEquity` true. Remaining marginal: ELLA-314 `timelineYears = 19` vs the expected 20 — a replay-date artifact ("by 2045" from 2026 is 19 years; the expectation was written when the same phrase yielded 20), arguably *correct* extraction; VAR-CF-150K-BANDS rent rounding puts one yield just under the stated band. |
| 6 | Schema gaps | **STILL PRESENT** (verified against the LIVE production schema) | Checked statically against `CREATE_PLAN_TOOL.input_schema` in `supabase/functions/nl-parse/tools.ts` (what today's pipeline actually uses, not the deprecated `response-schema.ts`): `properties.engagementFee`, `stampDutyOverride`, `conveyancing` are all still missing. VAR-BAFEE and VAR-PURCHCOSTS remain EXPECTED-FAIL. Granny-flat/improvement requests (ELLA-315/316 briefs) still have no representation. |

---

## Per-scenario: engine-only vs live-AI verdicts

| # | Scenario | Engine-only | Live AI | Live failing checks |
|---|----------|-------------|---------|---------------------|
| 1 | FIX-ANU-275 | FAIL | FAIL | all-placed (engine-placement); cashflow-goal (engine-goal) |
| 2 | FIX-ANU-287 | FAIL | FAIL | property[2]-price (plan-selection); cashflow-goal (engine-goal) |
| 3 | FIX-ELLA-314 | FAIL | FAIL | property-count (persistence); timeline-persisted (extraction); cashflow-goal (engine-goal) |
| 4 | FIX-ELLA-315 | FAIL | FAIL | property-count (persistence); blue-chip-selection (plan-selection) |
| 5 | FIX-ELLA-316 | FAIL | FAIL* | property-count; property[0]; commercial-labelled; cashflow-goal; equity-goal — *replay artifact, see below* |
| 6 | FIX-ELLA-317 | FAIL | FAIL | avg-price (plan-selection); pacing (engine-placement); cashflow-goal (engine-goal) |
| 7 | FIX-JULIAN-210 | FAIL | FAIL | price-band (plan-selection); commercial-finisher (plan-selection) |
| 8 | FIX-JULIAN-290 | FAIL | FAIL | cashflow-goal (engine-goal) |
| 9 | VAR-CF-80K | FAIL | FAIL | cashflow-goal (engine-goal) |
| 10 | VAR-EG-80K-EXIST | FAIL | **PASS** | — |
| 11 | VAR-EGCF-150K | FAIL | FAIL | cashflow-goal (engine-goal) |
| 12 | VAR-CT-150K-TRUST | PASS | PASS | — |
| 13 | VAR-CF-150K-BANDS | PASS | **FAIL** | yield-band (plan-selection) |
| 14 | VAR-EG-250K-BLUECHIP | FAIL | **PASS** | — |
| 15 | VAR-CT-250K-SMSF | PASS | PASS | — |
| 16 | VAR-EGCF-250K-EXIST | PASS | PASS | — |
| 17 | VAR-ADAM-BAND | FAIL | FAIL | property[1]-placed-by, property[2]-placed-by (engine-placement) |
| 18 | VAR-ADAM-EQUITY | PASS | PASS | — |
| 19 | VAR-BAFEE | EXPECTED-FAIL | EXPECTED-FAIL | schema: engagementFee missing (live schema) |
| 20 | VAR-PURCHCOSTS | EXPECTED-FAIL | EXPECTED-FAIL | schema: stampDutyOverride / conveyancing missing (live schema) |

**Totals: engine-only 5 PASS / 13 FAIL / 2 EXPECTED-FAIL → live 6 / 12 / 2.**

---

## Verbatim diffs for changed outcomes

Each entry quotes the failing-check strings **verbatim** from `scenario-suite-results.json` (engine-only, June/early-July saved plans) vs `scenario-suite-ai-results.json` (live, today).

### FIX-ANU-275 — FAIL → FAIL, but 3 of 4 June failures are gone

Engine-only:
```
[persistence] property-count: expected 4-8 planned properties, saved plan has 1
[extraction] existing-count: expected 0 existing properties per brief, saved state has 1 (portfolioValue $630,000)
[extraction] timeline-persisted: user stated 7-year timeframe; profile.timelineYears = 20
[engine-goal] cashflow-goal: $200,000/yr never reached within the modelled horizon (max $22,647/yr) — shortfall
```
Live AI:
```
[engine-placement] all-placed: unplaced/infeasible: regional-house-cashflow_instance_0(challenging)
[engine-goal] cashflow-goal: $200,000/yr never reached within the modelled horizon (max $46,915/yr) — shortfall
```
Live built a 6-property plan (auto-fix trimmed to 5), extracted "no existing properties" correctly, and the follow-up "seven-year timeframe" landed as `timelineYears = 7` via update_profile — all three June extraction/persistence failures FIXED. The $200k cashflow goal remains silently unreachable.

### FIX-ANU-287 — FAIL → FAIL, the 49.5%-yield outlier is gone

Engine-only:
```
[plan-selection] yield-band: outliers: commercial-high-cost $245,000 @ 49.5%
[plan-selection] property[2]-price: commercial-high-cost $245,000 vs stated $1,600,000-$2,400,000
```
Live AI:
```
[plan-selection] property[2]-price: commercial-high-cost $1,345,000 vs stated $1,600,000-$2,400,000
[engine-goal] cashflow-goal: $100,000/yr never reached within the modelled horizon (max $60,877/yr) — shortfall
```
The AI extracted the ~$2M commercial correctly; `autoFixPlan` then "Reduced from $2000k to $1345k to fit available deposit" — a *reasoned* band violation instead of June's absurd one, but the chat message still claims "priced from $450k to $2M". Note the June run *passed* cashflow-goal only because the absurd 49.5%-yield property generated fantasy rent; the honest live plan exposes the real shortfall.

### FIX-ELLA-314 — FAIL → FAIL, removal now applies but leaves a stray property

Engine-only:
```
[persistence] property-count: expected 1 planned properties, saved plan has 3
[engine-goal] cashflow-goal: $150,000/yr never reached within the modelled horizon (max $24,280/yr) — shortfall
```
Live AI:
```
[persistence] property-count: expected 1 planned properties, live AI plan has 2
[extraction] timeline-persisted: user stated 20-year timeframe; profile.timelineYears = 19
[engine-goal] cashflow-goal: $150,000/yr never reached within the modelled horizon (max $31,119/yr) — shortfall
```
Live chat: "Removed property 2 from the plan. Removed property 3 from the plan. Removed property 4 from the plan." — but 2 of the 4 remain. **Mechanism found:** compound removals resolve `property-N` against the already-mutated order (remove #2 → "remove #3" deletes the original #4 → "remove #4" out-of-range, silently dropped). Same bug class as June's 5→3. The `timelineYears = 19` entry is a replay-date artifact ("by 2045" from 2026), not a regression.

### FIX-ELLA-315 — FAIL → FAIL, cheap-plan claim replaced by an empty-plan claim

Engine-only:
```
[persistence] property-count: expected 2-4 planned properties, saved plan has 0
[plan-selection] blue-chip-selection: … Assistant chat: "Built a 4-property plan, priced from $400k to $500k" — four cheap properties.
```
Live AI:
```
[persistence] property-count: expected 2-4 planned properties, live AI plan has 0
[plan-selection] blue-chip-selection: Ella criterion (re-evaluated live): … Live plan: 0 properties, avg $0 ()
```
Live AI proposed 4 properties $380k-$750k (still not blue-chip for a $250k earner), then the pre-check auto-fix moved them out to 2035-2038 and finally "Removed - could not fit within borrowing capacity even after pushing to later periods" — all four. The chat message still says "Built a 4-property plan, priced from $380k to $750k". Different path, same end state as June: a claimed plan with zero properties behind it.

### FIX-ELLA-316 — FAIL → FAIL (replay artifact — not directly comparable)

Today's pipeline asked a clarifying question June's didn't ("is the $300k a monthly savings figure or an annual lump sum?"), and the replayed canned answers never address it — the AI kept re-asking across all 5 turns and never called create_plan, so no plan exists to grade. All five live failing checks are consequences of the empty state, not reproductions of June's specific failures (8.5% vs stated 6% commercial yield; 2 saved vs 4 claimed). Verdict: **untestable via verbatim replay**; needs an interactive or adjusted-brief rerun. It does show today's pipeline holds out for clarification much longer — including through the explicit "Change the client goal…" turn (which the no-plan guard converts to a plain response).

### FIX-ELLA-317 — FAIL → FAIL, one new blue-chip failure surfaced

Engine-only:
```
[engine-placement] pacing: purchases in 2026, 2027, 2028, 2031 — avg gap 1.67y vs conservative-correct ≥1.75y
[engine-goal] cashflow-goal: $250,000/yr never reached within the modelled horizon (max $27,009/yr) — shortfall
```
Live AI:
```
[plan-selection] avg-price: average price $520,000 vs blue-chip floor $650,000
[engine-placement] pacing: purchases in 2026, 2027, 2029, 2031 — avg gap 1.67y vs conservative-correct ≥1.75y
[engine-goal] cashflow-goal: $250,000/yr never reached within the modelled horizon (max $66,005/yr) — shortfall
```
(June's saved plan happened to average above $650k so avg-price passed then; the live AI picks cheaper stock for this $250k-income client — Ella's core complaint, reproduced.)

### FIX-JULIAN-210 — FAIL → FAIL, trust/placement fixed, new failures traded in

Engine-only:
```
[plan-selection] trust-usage: capacity is tight — expected ≥1 trust-held property, plan has 0
[engine-placement] all-placed: unplaced/infeasible: regional-unit-cashflow_instance_1(challenging), regional-house-cashflow_instance_1(challenging), commercial-low-cost_instance_0(challenging)
```
Live AI:
```
[plan-selection] price-band: outside $350,000-$800,000: regional-unit-cashflow $200,000
[plan-selection] commercial-finisher: last property is regional-house-cashflow — NOT labelled commercial
```
Trusts now assigned (3 of 4), all 4 properties place feasible, and both goals are reached (equity + cashflow goal year 2041 ≤ 2045) — June's headline failure fixed. The live chat even surfaces the tightness: "Reaching $2M is tight on this profile — the model lands close but not clear." New: no commercial finisher in the live plan, and `autoFixPlan`'s "Reduced from $380k to $200k to fit available deposit" pushed a property below the client's stated band.

### FIX-JULIAN-290 — FAIL → FAIL, extraction fixed, goal shortfall remains

Engine-only:
```
[extraction] profile-cashflowGoal: profile.cashflowGoal = 50000 vs stated 100000
[engine-goal] cashflow-goal: $100,000/yr never reached within the modelled horizon (max $41,375/yr) — shortfall
```
Live AI:
```
[engine-goal] cashflow-goal: $100,000/yr never reached within the modelled horizon (max $69,198/yr) — shortfall
```
`cashflowGoal = 100000` and `useExistingEquity = true` both extracted correctly today.

### VAR-CF-80K — FAIL → FAIL, "never" became "5 years late"

Engine-only:
```
[engine-goal] cashflow-goal: $30,000/yr never reached within the modelled horizon (max $14,856/yr) — shortfall
```
Live AI:
```
[engine-goal] cashflow-goal: $30,000/yr net cashflow reached 2045 vs stated by 2040
```
The live AI planned 4 cash-flow properties (vs the variant's faithful 2), so the goal is eventually reached — but 5 years past the stated timeframe, still with no shortfall surfaced.

### VAR-EG-80K-EXIST — FAIL → PASS
Engine-only: `[engine-placement] property[0]-placed-by: regional-unit-growth places 2030 vs expected by 2027`.
Live: the AI set an explicit early `targetPeriod` and the equity-funded purchase places in time. PASS.

### VAR-EG-250K-BLUECHIP — FAIL → PASS
Engine-only: `[engine-placement] pacing: purchases in 2026, 2027, 2029 — avg gap 1.50y vs conservative-correct ≥1.75y`.
Live: the AI encodes "one purchase every couple of years" as spaced `targetPeriod`s — the only pacing lever that exists — and the plan passes all checks including the $750k+ blue-chip floor. PASS.

### VAR-CF-150K-BANDS — PASS → FAIL (marginal)
Engine-only: PASS (faithful extraction used in-band rents).
Live: `[plan-selection] yield-band: outliers: metro-house-cashflow $620,000 @ 5.5%` — the AI's rent pick computes to ~5.45%, a hair under the stated 5.5% floor (display rounds to 5.5). A rounding-margin extraction miss, not a structural one.

### VAR-ADAM-BAND — FAIL → FAIL (less severe)
Engine-only: `property[1]-placed-by: … places 2031 vs expected by 2028; property[2]-placed-by: … places 2036 vs expected by 2028`.
Live: `places 2029 … places 2032` — auto-fix ("Moved from 2027 to 2031…") defers less brutally than the raw engine did, but "3 in the first three years" is still not met and the conflict is still not stated in chat.

---

## Chat-vs-state divergences observed live (cluster 4 evidence)

The harness records every turn's tool, templated message, and whether the apply step changed state (`turnLog` in the results JSON):

| Scenario | Chat claimed | Actual state after apply | Cause |
|---|---|---|---|
| FIX-ELLA-314 | "Removed property 2 … 3 … 4" | 2 of 4 properties remain | Compound-removal index shift in `mapModificationToUpdates` (applied per-mod against the mutating order; out-of-range removal silently dropped) |
| FIX-ELLA-315 | "Built a 4-property plan, priced from $380k to $750k" | 0 properties | `buildCreatePlanMessage` runs before `autoFixPlan`; auto-fix dropped all 4; drops appear only in `_autoFixChanges` |
| FIX-ANU-287 | "priced from $450k to $2M" | commercial at $1,345,000 | Same ordering: message templated pre-auto-fix |

**Explicitly untested:** the Supabase save path (ScenarioSaveContext → DB) — the June evidence for cluster 4 included saves whose contents diverged from chat. This harness has no persistence layer, so that leg can neither be confirmed nor marked fixed. The findings above show that at least part of June's divergence is *upstream* of persistence (the apply/messaging layer), which is testable and reproduces today.

---

## Harness caveats

1. **Confirmation brief auto-approved.** In the app the BA reviews the plan (including `_autoFixChanges`) before it lands; headlessly we apply immediately. Everything graded on plan *content* is unaffected; anything a BA might have hand-edited at the brief is out of scope.
2. **FIX-ELLA-316 is a replay artifact** (see above) — its 5 live failures should not be read as reproductions.
3. **FIX-ELLA-314 `timeline-persisted` (19 vs 20)** is a run-date artifact: "by 2045" is 19 years from 2026. The extraction is arguably correct; the expectation constant encodes 2025 arithmetic.
4. **No planningDefaults / strategyProfileText** were sent (unknowable for the June testers); preset starts at the app default `eg-low` and then follows the AI's own `strategyPreset`, as the app does.
5. Non-determinism: temperature 0, but tool-choice/plan composition can still vary slightly between runs; this is a single pass.

## Cost

- **API calls: 34** (31 full pass + 1 smoke test + 2 re-run of FIX-JULIAN-290 after a grading fix).
- Tokens (full pass + re-run, from `usage`): ~18.6k input, ~32k cache-write, ~208k cache-read, ~31.9k output.
- At claude-sonnet-4-6 rates ($3/M in, $15/M out, $3.75/M cache-write, $0.30/M cache-read): **≈ $0.80 total**.

## Re-running

```bash
npx vite-node accuracy-testing/run-scenario-suite-ai.ts                      # all 20 (~31 calls)
npx vite-node accuracy-testing/run-scenario-suite-ai.ts -- --only FIX-ELLA-314   # merges into the results file
```
