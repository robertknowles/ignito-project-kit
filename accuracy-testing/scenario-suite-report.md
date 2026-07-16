# Scenario Accuracy Suite — Results

**Date:** 2026-07-11
**Harness:** `accuracy-testing/run-scenario-suite.ts` over `accuracy-testing/scenario-suite.ts` — runs the REAL engine (`src/engine/scenarioRunner` → `timelineEngine` + `projectionEngine`) headlessly. No app/engine/prompt code was modified.
**Run with:** `npx vite-node accuracy-testing/run-scenario-suite.ts` (vite-node, not tsx). Full machine-readable results: `accuracy-testing/scenario-suite-results.json`.

**Mode: ENGINE-ONLY.** No `ANTHROPIC_API_KEY` was available (checked `.env`, `.env.local`, supabase env files, shell env), so the nl-parse AI leg was not exercised live. Instead:

- The **8 real fixtures** grade the plan the AI pipeline produced *at the time* for real beta testers (the persisted `scenario_data`), plus the engine outcome of re-running that plan today.
- The **12 variants** simulate a *faithful extraction* of each brief and grade what the ENGINE does with it — isolating engine behaviour from AI extraction.
- The two **schema-gap** scenarios are verified statically against the production `RESPONSE_TOOL` schema (`supabase/functions/nl-parse/response-schema.ts`).

Grading criteria are the beta-call expectations (Ella / Anu / Julian / Adam). Cashflow **calibration** divergences (interest pin, vacancy, opex levels) are documented in `gameplans-comparison-report.md` and are deliberately not re-graded here — this suite grades plan **structure** and goal-anchoring.

---

## Results table

| # | Scenario | Source | Archetype | Verdict | Failing checks (root cause) |
|---|----------|--------|-----------|---------|------------------------------|
| 1 | FIX-ANU-275 | fixture | anu · high income, aggressive, 7-year passive-income goal | FAIL | property-count (persistence); existing-count (extraction); timeline-persisted (extraction); cashflow-goal (engine-goal) |
| 2 | FIX-ANU-287 | fixture | anu · commercial transition, $1m BC, $100k passive, ~$2m commercial | FAIL | yield-band (plan-selection); property[2]-price (plan-selection) |
| 3 | FIX-ELLA-314 | fixture | ella · $700k BC, $150k by 2045, P1 ≤ -$1,500/mo, then "only one purchase" | FAIL | property-count (persistence); cashflow-goal (engine-goal) |
| 4 | FIX-ELLA-315 | fixture | ella · $250k income / $300k deposit / 3 existing — blue-chip expectation | FAIL | property-count (persistence); blue-chip-selection (plan-selection) |
| 5 | FIX-ELLA-316 | fixture | ella · cf-high, 6%-yield commercial interest, retire 2046 on $250k | FAIL | property-count (persistence); property[0]-yield (plan-selection); all-placed (engine-placement); cashflow-goal (engine-goal) |
| 6 | FIX-ELLA-317 | fixture | ella · "4 properties, retire on 250k" — $250k income | FAIL | pacing (engine-placement); cashflow-goal (engine-goal) |
| 7 | FIX-JULIAN-210 | fixture | julian · goal-anchored: $1m BC, $50k CF + $2m equity in 20y | FAIL | trust-usage (plan-selection); all-placed (engine-placement) |
| 8 | FIX-JULIAN-290 | fixture | julian · $100k passive, 1 existing, $750k BC, couple on $300k | FAIL | profile-cashflowGoal (extraction); cashflow-goal (engine-goal) |
| 9 | VAR-CF-80K | variant | grid · $80k income, cash-flow, no existing | FAIL | cashflow-goal (engine-goal) |
| 10 | VAR-EG-80K-EXIST | variant | grid · $80k income, equity-growth, equity-funded deposit | FAIL | property[0]-placed-by (engine-placement) |
| 11 | VAR-EGCF-150K | variant | grid · $150k income, eg-to-cf, transition must be visible | FAIL | cashflow-goal (engine-goal) |
| 12 | VAR-CT-150K-TRUST | variant | grid · $150k, commercial-transition, "properties 2 and 3 in a trust" | PASS | — |
| 13 | VAR-CF-150K-BANDS | variant | grid · $150k, cash-flow, explicit price AND yield bands | PASS | — |
| 14 | VAR-EG-250K-BLUECHIP | variant | grid · $250k, blue-chip growth, conservative pacing requested | FAIL | pacing (engine-placement) |
| 15 | VAR-CT-250K-SMSF | variant | grid · $250k, commercial-transition, commercial in SMSF | PASS | — |
| 16 | VAR-EGCF-250K-EXIST | variant | grid · $250k, eg-to-cf, existing portfolio + equity release | PASS | — |
| 17 | VAR-ADAM-BAND | variant | adam · 3 × $375-390k then a ~$600k house | FAIL | property[1]-placed-by, property[2]-placed-by (engine-placement) |
| 18 | VAR-ADAM-EQUITY | variant | adam · existing equity funds later deposits (low cash) | PASS | — |
| 19 | VAR-BAFEE | variant | schema gap · explicit BA engagement fee | EXPECTED-FAIL | schema: `properties.engagementFee` missing |
| 20 | VAR-PURCHCOSTS | variant | schema gap · explicit purchase-costs statement | EXPECTED-FAIL | schema: `stampDutyOverride` / `conveyancing` missing |

**Pass rate: 5/20 PASS (25%) · 13 FAIL · 2 EXPECTED-FAIL (known schema gaps).**
All 8 real beta fixtures fail at least one BA expectation. What passes cleanly: trust/SMSF entity handling, explicit price+yield band adherence (when faithfully extracted), the eg-to-cf and commercial-transition placement sequencing, and equity-funded deposits with adequate equity.

---

## Failures grouped by root cause

### 1. Engine — stated goal silently missed (7 checks, biggest cluster)

The plan gets built and presented, but the projected cashflow never comes near the client's stated passive-income goal, and nothing in the pipeline says so. `feasibility.ts` computes an equity-goal descriptor for initial plans only — **cashflow goals are never feasibility-checked**, and modifications aren't re-checked at all.

- `FIX-ELLA-316` — client: *"retire by 2046 on $250k cash flow"* → engine max net cashflow over the whole horizon: **$5,922/yr**.
- `FIX-ANU-275` — client: *"want to achieve 200k passive income"* → engine max: **$22,647/yr**.
- Also FIX-ELLA-314 ($150k vs $24k), FIX-ELLA-317 ($250k vs $27k), FIX-JULIAN-290 ($100k vs $41k), VAR-CF-80K ($30k vs $15k), VAR-EGCF-150K ($80k vs $35k).

Caveat: part of the gap is the known cashflow calibration (interest pin / vacancy / opex — see `gameplans-comparison-report.md`), but even Gameplans-aligned dials would not turn $6k into $250k. The structural failure is that the shortfall is invisible — exactly Julian's criterion ("hit the stated goal or clearly show the shortfall").

### 2. Engine — silent placement deferral / no pacing control (7 checks)

When deposits or capacity run out, the engine quietly pushes purchases years past the stated schedule or marks them "challenging" while the chat message reads like success; and there is no pacing lever the AI can set except per-property `targetPeriod` (`profile.pacingMode` is not read by the engine).

- `FIX-JULIAN-210` — 3 of 5 properties end up `challenging` with `BC_rem=0k` (no trusts assigned), yet the assistant chat said *"the model shows the plan clearing the $2M target"*.
- `VAR-ADAM-BAND` — brief: *"3 properties between $375k and $390k over the first three years"* → engine places them **2026, 2031, 2036** (deposit-starved), with no surfaced conflict against the stated schedule.
- `VAR-EG-250K-BLUECHIP` / `FIX-ELLA-317` — *"one purchase every couple of years"* → engine buys as fast as affordable (avg gap 1.5-1.67y); pacing requests have no representation.
- `VAR-EG-80K-EXIST` — "within two years" using equity → places 2030 (equity-release factor + costs make it unfundable earlier; possibly correct, but never communicated).

### 3. AI plan selection — archetype and band violations (5 checks)

- `FIX-ANU-287` — client asked for a *"commercial property worth around $2,000,000"*; the saved commercial is **$245,000 at $2,330/wk = 49.5% gross yield** — exactly the "$200k/15%-yield outlier" class Anu flagged, an order of magnitude worse.
- `FIX-ELLA-315` — $250k-income / $300k-deposit client got *"Built a 4-property plan, priced from $400k to $500k"* — Ella's core complaint (should be fewer, higher-value blue-chip ~$750k+).
- `FIX-ELLA-316` — client stated a **6% yield** commercial; plan uses the default commercial cell at **8.5%**.
- `FIX-JULIAN-210` — $2.48m of purchases against $1m BC with **zero** trust assignments (Julian: trusts should appear when capacity is tight) — and this is what stalls placement in cluster 2.

### 4. Persistence — chat claims ≠ saved state (4 checks)

The assistant asserts changes that the persisted scenario does not contain. (Caveat: post-chat manual edits can't be ruled out from saves alone, but FIX-ELLA-314 is explicit in-transcript.)

- `FIX-ELLA-314` — user: *"reconfigure to include only one purchase"*, assistant: *"Removed property 2... Removed property 5."* → saved plan still holds **3** planned instances.
- `FIX-ELLA-315` — assistant: *"Built a 4-property plan"* → saved `propertyOrder` is **empty**.
- `FIX-ANU-275` (claimed 6-property plan, 1 saved), `FIX-ELLA-316` (claimed 4, saved 2).

### 5. AI extraction — user statements mis-captured (3 checks)

- `FIX-ANU-275` — *"To achieve this goal in a seven-year timeframe"*, assistant: *"Updated timeline to 7 years"* → saved `timelineYears = 20`.
- `FIX-JULIAN-290` — brief: *"$100,000 passive income"* → saved `cashflowGoal = 50,000` (`targetPassiveIncome` did get 100k — the two fields diverged).
- `FIX-ANU-275` — brief: *"no existing properties"* → saved state contains 1 existing property with `portfolioValue $630k` equal to the planned property's price (the planned purchase appears duplicated into the existing portfolio).

### 6. Schema gaps — statements unrepresentable (3 checks, EXPECTED-FAIL)

Verified statically against the production `RESPONSE_TOOL` schema:

- **BA engagement fee** (`VAR-BAFEE`): *"include my $15k engagement fee on each purchase"* — the instance model has `engagementFee`, but the response schema cannot set it; the cell default ($8-15k) is silently used instead.
- **Purchase costs** (`VAR-PURCHCOSTS`): *"budget $45k purchase costs per property — NSW stamp duty plus legals"* — no `stampDutyOverride` / `conveyancing` fields in the schema; stated costs are dropped.
- Related (observed, not separately graded): granny-flat/improvement requests (FIX-ELLA-315/316 briefs) have no schema representation either.

---

## The 3 most impactful fixes suggested by the failure pattern

1. **Goal-anchored shortfall surfacing (fixes cluster 1 — 7 scenarios).** Extend `computeFeasibility` (nl-parse `feasibility.ts`) to check the **cashflow goal**, not just equity, and run it after *every* plan-affecting turn (modifications and profile updates, not just `initial_plan`). When the projected maximum is a fraction of the stated goal ($5.9k vs $250k), the reply must say so and offer the gap. This is the single check that turns every "confidently wrong" scenario into an honest one, and it's exactly Julian's and Ella's stated expectation.

2. **Apply-and-verify reconciliation between chat claims and saved state (fixes clusters 4 + 5 — 7 checks across 5 scenarios).** After applying an AI modification, diff the resulting scenario against the claimed changes (count of properties, timelineYears, goal fields) and either retry or correct the reply. FIX-ELLA-314's "Removed property 2..5" that removed nothing, and FIX-ANU-275's timeline update that never landed, are trust-destroying in exactly the way Ella's beta feedback described. The `cashflowGoal` vs `targetPassiveIncome` split in FIX-JULIAN-290 belongs here too (one stated number must land in both fields).

3. **Deterministic brief-guardrail pass on emitted plans (fixes cluster 3 and the placement half of cluster 2 — 7+ checks).** Post-validate every emitted property against user-stated bands (price ±20%, yield sanity cap — FIX-ANU-287's $245k/49.5%-yield "commercial" should be impossible to emit), enforce archetype pricing (income ≥$200k + growth strategy → floor the price point), and make trust-when-capacity-tight a deterministic post-pass instead of prompt-dependent (FIX-JULIAN-210 got zero trusts and stalled at BC_rem=0 while other runs got them). This overlaps the existing `guardrailValidator.ts` machinery — the gap is that it isn't applied to the nl-parse output path.

Backlog behind those three: schema fields for engagement fee / purchase costs / pacing (the two EXPECTED-FAILs plus the pacing gap), and an engine-level pacing constraint so "one every couple of years" is expressible at all.

---

## Re-running

```bash
npx vite-node accuracy-testing/run-scenario-suite.ts                 # all 20
npx vite-node accuracy-testing/run-scenario-suite.ts -- --only FIX-ELLA-314,VAR-ADAM-BAND
```

When an `ANTHROPIC_API_KEY` becomes available, the AI leg can be added by feeding each scenario's `brief` through the evals pattern in `evals/run-evals.ts` (classify → extract+respond with the production pipeline from `supabase/functions/nl-parse/pipeline.ts`) and grading the emitted plan with the same `grade()` checks before the engine run — the suite's briefs and expectations were written to support that without change (~40 API calls for a single pass of 20 scenarios).
