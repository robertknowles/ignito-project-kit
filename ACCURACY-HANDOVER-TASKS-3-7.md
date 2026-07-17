# Handover: Accuracy Tasks 3–7

**Written:** 11 Jul 2026 (Tasks 3–4), restructured 16 Jul 2026 after Rob's review — Task 4 rescoped, Tasks 5–7 added.
**For:** a fresh Claude session running in parallel with the original session. Read this whole file before doing anything.

---

## Session context (read first)

- **Repo:** `/Users/robknowles/Projects/Code_Repo/ignito-project-kit`, branch `design/proppath-refresh`. `git pull` before starting — the original session is committing to this branch.
- **The accuracy program:** Tasks 1 (Gameplans cashflow comparison) and 2 (20-scenario suite) are DONE — reports in `accuracy-testing/`. This handover covers **Task 3 (company strategy prompt/schema strengthening)** and **Tasks 4–7 (single-property benchmarking against four external calculators/spreadsheets)**.
- **Anthropic API key:** in `.env.local` (gitignored) as `ANTHROPIC_API_KEY`. NEVER move it to `.env` — `.env` is committed to the repo. A full live suite pass costs ~$0.80.
- **Headless engine runs:** always `npx vite-node <script>` — NOT `tsx` (`timelineEngine.ts:1023` reads `import.meta.env.DEV`, which only exists under Vite).
- **Production AI pipeline:** the live path is the Tier-2 single-call architecture in `supabase/functions/nl-parse/prompt.ts` + `tools.ts` + `index.ts`. The classify→extract pipeline that `evals/run-evals.ts` uses is DEPRECATED — do not calibrate against it. `accuracy-testing/run-scenario-suite-ai.ts` mirrors the production path verbatim, including the app-side `planPreCheck`/`autoFixPlan`/mapper apply chain.
- **Key reference docs (all in `accuracy-testing/`):**
  - `company-prompt-coverage-audit.md` — the original Task-3 design (read top to bottom before implementing).
  - `scenario-suite-ai-report.md` — live AI re-run results, per-scenario verdicts, verbatim diffs.
  - `gameplans-comparison-report.md` — cashflow calibration findings.
  - `scenario-suite.ts` / `run-scenario-suite.ts` / `run-scenario-suite-ai.ts` — the test suite (engine leg + live AI leg, `--only ID` supported on both).
  - `fixtures/*.json` — 8 real beta-tester scenarios pulled from Supabase (full saved state incl. the tester's original typed brief in `chatHistory`).

### ⚠️ Parallel-session coordination — DO NOT COLLIDE

The original session has work in flight on this branch. **Do not edit these files** until their streams land (check `git log` for the commits below before assuming they've landed):

| Owned by the other session | Files | Lands as |
|---|---|---|
| Gameplans calibration (worktree) | `src/constants/financialParams.ts`, `property-defaults.json`, engine cashflow paths (`projectionEngine.ts`, `detailedCashflowCalculator.ts`), vacancy dial UI in DataAssumptions | commit(s) mentioning interest 5.5% / opex / vacancy |
| Goal-shortfall feasibility (worktree) | `supabase/functions/nl-parse/feasibility.ts`, descriptor injection in `nl-parse/index.ts`, the dashboard goal-banner component | commit(s) mentioning cashflow-goal feasibility |
| Already landed | `f605b07` (interest-rate fix), `f3e2ab8` (removal-index + post-autofix chat messages: `nlDataMapper.ts`, `ChatPanel.tsx`, `scenarioMutator.ts`, `useChatConversation.ts`, new `autoFixDisclosure.ts`) | pushed |

Task 3 needs `prompt.ts`, `tools.ts`, and `nlDataMapper.ts`. The mapper was just changed in `f3e2ab8` (pull it), and the feasibility stream may add lines to `index.ts` — **rebase/pull before pushing, and if `index.ts` or `feasibility.ts` conflicts appear, stop and flag rather than resolving blind.**

---

## TASK 3 — Company strategy: make stated factors actually stick

### Step 0 — FRESH RE-AUDIT (do not skip)

Rob's instruction (16 Jul): the original audit was produced late in a very large session and may have missed fields. A fresh whole-software re-inspection was run on 16 Jul — **findings in `accuracy-testing/company-field-reaudit-jul16.md`**. Read it alongside `company-prompt-coverage-audit.md`; the union of the two lists is the real scope, and the re-audit's Section A corrects several of the original audit's line numbers and claims (the `valuationAtPurchase` overwrite is now `nlDataMapper.ts:250`; `depositBuffer` is a dead dial; the `lvrStrategy` setting clobbers AI-extracted LVR).

The re-audit found **18 new gap clusters**; four are top-10-grade and must join the ranked list below: **(B1)** planned sell-down/`saleYear` — mapper+engine already support it, schema field is a near-free win; **(B2)** stated plan horizons force-clamped to 20 years because `timelineYearsExplicit` is never mapped — likely a straight bug; **(B3)** `forceRefinanceOn()` overrides a stated "don't touch the existing equity"; **(B4)** serviceability multiplier, including a prompt-says-×8 / engine-uses-×6 mismatch. Don't ship the schema twice — fold these in with the original top-10 in one pass, and decide scope with Rob if the full union is too big for one PR.

### The problem (from the audit — design doc: `accuracy-testing/company-prompt-coverage-audit.md`)

A BA writes their firm's strategy in free text ("our fee is $12k, we allow 5% purchase costs, PM fee 7%, IO 7 years, we buy 10% under market value…"). The AI reads it — but the `create_plan`/`modify_plan` tool schema (`supabase/functions/nl-parse/tools.ts:85-97`) only carries ~11 property fields, so most factors have **no field to be output into**. They silently fall back to hardcoded defaults from `getPropertyInstanceDefaults()`: **$8k BA fee, 8% PM fee, 6.25% interest (5.5% once calibration lands), 4% vacancy, 5% rent growth**. Prompt wording is NOT the root cause — only 2 of the top 10 gaps are fixable by prompt alone.

Score at audit time: 6 factors work, 4 partial, ~15 silently dropped.

### Ranked gaps to close (from the audit, most damaging first)

1. **BA / engagement fee** — feeds `totalCashRequired` on every purchase; a wrong fee shifts every purchase date. (Beta tester Adam's direct question.)
2. **Upfront purchase costs** (stamp duty override, conveyancing, B&P) — same deposit-math channel, ~$30k/purchase.
3. **Interest rate assumption at plan creation** — currently modify-only.
4. **Deposit % / LVR preference** — schema field EXISTS; the prompt's company-strategy bullets never mention it. **Prompt-only fix — do this one first, it's 10 minutes.**
5. **IO term** — "IO 5 years" works only by coincidence (default is 5); any other term silently ignored.
6. **PM fee %** — recurring cashflow error on every property/year.
7. **Vacancy** — note: the calibration stream is removing vacancy from client-facing cashflow lines; check its landed state before wiring anything.
8. **Rent escalation** — default 5%/yr compounds hard over 20 years.
9. **Buy under market value** — `valuationAtPurchase` exists but `src/utils/nlDataMapper.ts:242` (line number pre-`f3e2ab8`; re-locate) hard-overwrites it to `purchasePrice`. This is a straight bug — any firm whose strategy is buying under market (Adam's is) loses their day-one equity story.
10. **Negative-cashflow appetite / pacing** — `StrategyProfileModal`'s helper copy PROMISES this is honoured; it isn't. Either honour it or fix the copy (do both: honour what's feasible, soften copy for the rest).

Plus: any **NEW GAPS** from the Step-0 re-audit (`company-field-reaudit-jul16.md`), slotted in by damage.

### Implementation plan (the audit doc has draft schema JSON + draft prompt bullets — use them)

1. **Schema:** add the audit's ~6 property fields + ~3 profile fields (plus any re-audit additions) to `CREATE_PLAN_TOOL` (and `modify_plan` where applicable) in `tools.ts`. Optional fields, so old outputs stay valid.
2. **Mapper:** overlay the new fields in `nlDataMapper.ts` — extracted value beats default, absent means default. Fix the `valuationAtPurchase` overwrite while in there.
3. **Prompt:** add the audit's drafted bullets to the company-strategy section of `prompt.ts` (~lines 120-150, the "Extract every specific" block) — match its existing voice/format exactly. Add the deposit-%/LVR bullet (gap 4).
4. **Copy:** fix the over-promising helper text in `StrategyProfileModal.tsx`.
5. **Deploy note:** edge-function changes need `supabase functions deploy nl-parse` (project id `gaoqzrdzihmrwipwsbwo`) — flag for Rob rather than deploying unilaterally.

### Verification (required)

1. The suite has 2 EXPECTED-FAIL schema-gap cases — after the fix they must FLIP TO PASS: `npx vite-node accuracy-testing/run-scenario-suite-ai.ts -- --only <the two SCHEMA-* ids in scenario-suite.ts>`.
2. Write 3-4 new strategy briefs exercising the new fields (e.g. "our engagement fee is $15,000, we budget 6% purchase costs, PM fee 6.6%, IO 7 years, we buy ~8% under market") → run through the live leg → assert the values land in the mapped plan, not the defaults.
3. Regression: run the full engine-leg suite (`npx vite-node accuracy-testing/run-scenario-suite.ts`) — no previously-passing case may regress.
4. `npm run build` + no new lint problems.
5. Do NOT weaken any existing grader expectation.

---

## TASKS 4–7 — External benchmarking: where do we sit against everyone else?

### Purpose (Rob, 16 Jul)

We now have artefacts from **four** external sources — Ella's sheet, Propgoal (competitor Julian uses), Anu's spreadsheet, and Compound's (Ben & Adam's) calculator sheet. Each is only a single-property view, but together they show where PropPath sits against most of the firms/tools around us. The logic: Task 1 already validated our **compounding** against Gameplans over a full multi-year projection. If our **single-property, year-1 numbers** are also close to each of these four independent sources — and, where their sheets show growth rates / cashflow growth / multi-year lines, those match too — we can be reasonably confident the numbers compound correctly. (Multi-property interaction — equity-release timing, serviceability stacking — is mostly not validated by these single-property sheets; the exception is Anu's, which turned out to be a portfolio-level Year 0–18 roadmap and IS a multi-property compounding check. Note the caveat in each single-property report rather than overclaiming.)

### Inputs — UNBLOCKED (16 Jul)

Everything lives in **`/Users/robknowles/Projects/Company Calculators/`** (note the space in the folder name — quote paths):

| Source | Folder | Contents | Transcription status |
|---|---|---|---|
| Ella | `Ella/` | 1 screenshot | DONE → `accuracy-testing/external-sources/ella-transcription.md` |
| Julian / Propgoal | `Julian/` | 32 jpegs, 28 unique (the four `09.55.38*` files are byte-identical dupes of the `09.54.58*` batch) | DONE → `accuracy-testing/external-sources/julian-propgoal-transcription-A.md` + `-B.md` |
| Anu | `Anu/` | 5 jpegs | DONE → `accuracy-testing/external-sources/anu-transcription.md` |
| Ben & Adam / Compound | `Ben:Adam/` | 4 CSVs (machine-readable xlsx export — no vision needed) | DONE → `accuracy-testing/external-sources/benadam-compound-transcription.md` |

Start each task from its transcription file; go back to the raw images only to resolve a cell the transcription marks [unreadable] or that fails an arithmetic cross-check. Key facts learned at transcription time: **Ella's sheet is a Darwin (NT) property** — NT stamp duty, not VIC; **Compound's sheet buys under market** ($315k price / $380k valuation) so it directly exercises Task-3 gap #9, uses per-year front-loaded growth (12/10/8/5/5%), capitalises LMI into the loan, and holds IO flat for all 10 years (no P&I reversion); Ella's sheet has NO multi-year projection (year-1 + upfront cash only), Compound's has a full 10-year table (the best compounding check).

### Shared method (applies to all four; adapted from Task 1's `run-gameplans-comparison.ts`)

1. Read the screenshot(s) carefully (Read tool renders images). Transcribe EVERY visible input and output cell into a fixture: `accuracy-testing/fixtures/<source>-sheet.json` — inputs, their computed lines, their totals. Where a cell is unreadable, record it as unknown — never guess a number.
2. Build `accuracy-testing/run-<source>-comparison.ts` on the pattern of `run-gameplans-comparison.ts` (import the REAL engine + `src/utils/stampDutyCalculator.ts`, `src/utils/lmiCalculator.ts`, `src/utils/landTaxCalculator.ts`, `src/utils/detailedCashflowCalculator.ts`; manual placement so affordability gating can't contaminate the comparison).
3. **Set every input explicitly** (overrides beat defaults everywhere — proven by the GP-BRIEF-350K exact-match case). This makes the comparison immune to the calibration stream changing defaults underneath you.
4. Diff line by line; report `accuracy-testing/<source>-comparison.md`: their number vs ours per line, divergence, root cause (formula difference vs default difference vs missing line item).
5. If the sheet shows growth assumptions or multi-year projections (growth rate, cashflow growth, equity over time), diff those curves too — that's the compounding check.
6. End every report with: (a) a gap list of line items we can't represent, and (b) a per-cell before/after table for Rob's eyes.

### TASK 4 — Ella's spreadsheet (Mecca Property Group)

- **Input:** ONE screenshot, fully transcribed with arithmetic cross-checks → `accuracy-testing/external-sources/ella-transcription.md`. Excellent readability; matches the structure described on the 2 Jul call (the "$169,000 settlement account" figure is $169,188 on the sheet).
- **The property is in Darwin, NT** ("11 Emma Ct Driver" tab) — stamp duty comparison must use **NT**, not VIC as the call implied. Sheet shows Stamp Duty + Transfer $35,838 on a $650k house.
- Her PropPath scenarios: `accuracy-testing/fixtures/ella-scenario-31{4,5,6,7}.json`, account `ella@caseventsgroup.com`.
- Key comparison points: $650k house, 20% deposit, P&I 6.29% / IO 6.39% side-by-side, $650/wk rent, PM 8.8%, land tax $1,300, advertising/letting $750 → out-of-pocket ($163.27)/wk IO, ($274.29)/wk P&I.
- Known quirk to handle explicitly (see transcription): management fee appears twice with different values ($2,974 vs $1,859 in the annual total) — compare against both and flag, don't silently pick one.
- **No multi-year projection on her sheet** — this task validates year-1 cashflow + upfront cash only.
- Special attention: NT stamp duty, advertising/letting as a line item, land tax defaulting to $0 unless overridden (known engine behaviour), $/week out-of-pocket framing (we display annual/monthly — note what's missing for parity), and the dual P&I/IO side-by-side view.
- Feeds the "itemised operating expenses + upfront settlement cash" feature Ella and Julian both asked for.

### TASK 5 — Julian's competitor tool ("Propgoal" unconfirmed — vendor KalGi Pty Ltd, white-labeled as Search Party Property)

- **Input:** 28 unique screenshots of a 1 Jun Google Meet demo, transcribed → `accuracy-testing/external-sources/julian-propgoal-transcription-A.md` + `-B.md`. No product wordmark visible anywhere; the footer disclaimer names **KalGi Pty Ltd** and the UI carries Julian's own **Search Party Property** branding, so it's white-labeled. (Rob, 17 Jul: do NOT chase the product name — the reports use the neutral "Julian's tool (KalGi)" and that stands.)
- **It is NOT a per-property calculator** — it's a portfolio strategy/consolidation tool operating on a real client's 6-property portfolio (NSW/VIC/WA/QLD). What it shows: dashboard KPIs, per-property Hold/Sell toggles, ownership structures (Personal/Trust/SMSF) with structure-specific tax rates (marginal 47%, company 25%, SMSF 15%, CGT discount 50% vs 33.33%), passive-income goals ($60k/$100k/$10k across strategies), consolidation-year end-state cards ($9,757,502 unencumbered, $137,411 passive income, "Goal Achieved 33 years"), an interest-rate stress-test slider, named saveable/comparable strategies, and a property audit log.
- **Growth model:** market-heat tiers — Hot 20% yrs 1–4 → 15% → 7%; Warm 10–15% → 7%; baseline flat 7%; a full 2027→2057 year-by-year growth matrix. Inflation 3%, selling costs ~2%, implicit 80% LVR ("New Debt @ 80%").
- **What's NOT visible:** interest rate, vacancy, LMI, purchase fees, and no time-series projection chart (the "Projection" toggle was never opened). A line-by-line cashflow comparison is NOT possible from these screenshots.
- **Adjusted method for this task:** (a) compare what IS comparable — their growth matrix vs our growth tiers, tax/CGT/selling-cost assumptions vs ours, end-state consolidation math on a reconstructed portfolio; (b) the bigger deliverable is **competitive-gap intel**: hold/sell per property, ownership-structure tax modelling, stress-test slider, strategy compare, audit log — what they have that we don't, and vice versa. The three-way vs Gameplans leg applies only where a number is actually comparable.

### TASK 6 — Anu's spreadsheet ("Property Roadmap", branded Fresh Start)

- **Input:** 5 screenshots (from a 1 Jun Google Meet demo). Transcription: `accuracy-testing/external-sources/anu-transcription.md`.
- **This one is PORTFOLIO-LEVEL, not single-property** — 16 property slots (4 filled: VIC/NSW/TAS/NSW, $550k–$600k, purchased Years 1–4) with a Year 0–18 projection (Portfolio Value, Equity, Gross Rental Income, Interest Costs, Operating Costs, annual/monthly cashflow). That makes it the ONE external source that validates multi-property compounding — weight it accordingly and diff the portfolio curve year by year, not just year 1.
- Key modelling traits to account for: 80% LVR, IO forever (interest flat from Year 3), 6.00% interest, $19,500 flat BA fee, 7% PM fee, no vacancy row, no visible growth-rate cell (infer implied growth from the portfolio-value curve and report it), cashflow crosses positive at Year 9.
- Caveat: the Cashflow/Commercial tab and the "Other Expenses" breakdown were never shown on screen — mark those lines as unknown, don't guess.

### TASK 7 — Compound's calculator sheet (Ben & Adam)

- **Input:** 4 machine-readable CSV tabs (Calculator, Growth Assumptions, LMI, Costs by LGA) of one deal — 5/804 Warrigal Road, Malvern East VIC. Transcription + comparison notes: `accuracy-testing/external-sources/benadam-compound-transcription.md`. The richest source: full **10-year projection table** (value/loan/equity/income/expenses/net-cashflow per year) — the best single-property compounding check we have.
- Confirms Adam's buy-under-market strategy in the wild: $315k purchase vs $380k valuation, $97,256 day-one equity — **directly exercises Task-3 gap #9** (the `valuationAtPurchase` overwrite bug). Engagement fee $10,000 (vs our $8k default — Task-3 gap #1 in the wild).
- Modelling differences to handle (full list in the transcription's notes section): LMI capitalised into the loan; per-year front-loaded growth (12/10/8/5/5% "High" profile — flat-rate engines can't reproduce it; their "Average" column is flat 6.5%, use that for a like-for-like leg); IO held flat for all 10 years with no P&I reversion; staged payment timeline (engagement → exchange → settlement) with $66,972 total cash required.
- Sheet anomalies are documented in the transcription — compare against what the sheet says, but don't replicate its internal inconsistencies (rental growth 4% in body vs 9% in the tab; insurance $350/yr in cashflow vs $1,401.64 paid at exchange; LGA dropdown says Muswellbrook for a Malvern East property).

### Cross-source synthesis (after 4–7)

Write `accuracy-testing/external-benchmark-synthesis.md`: one table, rows = cashflow/cost line items, columns = Ella / Julian's tool (KalGi) / Anu / Compound / Gameplans / PropPath. Which lines does everyone model that we don't? Where do we diverge from ALL of them (likely our bug/default) vs from just one (likely their house assumption)? Growth/compounding assumptions compared where visible. This is the "where we sit against the market" summary Rob actually wants.

---

## After all tasks: update `~/.claude/.../memory/` via the original session or note results in this file's footer, and tell Rob what needs deploying (`nl-parse` edge function) and what needs his eyes (per-cell before/after tables + the synthesis table).

---

## Status footer (16 Jul 2026, executed by the coordinating session)

**TASK 3 — DONE.** Implemented: 10 new per-property fields on `create_plan`/`modify_plan` (`interestRate`, `ioTermYears`, `engagementFee`, `propertyManagementPercent`, `valuationAtPurchase`, `isNewBuild`, `stampDutyOverride`, `conveyancing`, `purchaseCostsTotal`, `saleYear`), 3 profile fields (`interestRate`, `vacancyRate`, `rentEscalationRate`) on create/update_profile, mapper overlays incl. the `valuationAtPurchase` overwrite fix (+`valuationAtPurchaseManual`), the B2 `timelineYearsExplicit` mapping fix, rate-unit normalisers, modify-path support for the new fields, company-strategy prompt bullets + guard-rail, honest modal copy. Suite: VAR-BAFEE/VAR-PURCHCOSTS flipped EXPECTED-FAIL→PASS (live), 3 new VAR-STRAT-* company-strategy cases (strategyProfileText now threads through the AI runner; ChatPanel timeline-clamp parity added; instanceFields assertions added), engine-leg schema checks now resolve against the production CREATE_PLAN_TOOL (was the deprecated RESPONSE_TOOL). NOT done (deliberate, needs Rob): B3 forced-equity-release reversal (product decision), B4 ×8-vs-×6 serviceability alignment (would shift every derived-BC plan), the min-20-year timeline floor for explicit short horizons. **Deployed:** nl-parse v74 went live 16 Jul 18:22 (includes the schema, prompt bullets, and validation guards). Post-deploy adversarial re-sweep also landed: mapper vacancyRate 2→0.02 fix for AI-extracted existing properties (was −100% rent in serviceability), timelineYearsExplicit on modify/update paths, fee+lump SUM guidance, magnitude guards in validation.ts, suite fidelity fixes (see commit be00d73).

**TASKS 4–7 — DONE.** Reports in `accuracy-testing/`: `ella-spreadsheet-comparison.md` (matches to the dollar on IO legs; her sheet's quirks documented; found OUR NT stamp-duty sub-$525k bug — chip spawned), `compound-comparison.md` (equity/value match to $0 over 10 years with their curve; upfront cash exact $66,972; gaps = per-year growth input + stepped rent escalation), `anu-comparison.md`, `julian-kalgi-comparison.md` (their arithmetic exact; divergence = assumption generosity; our 5% rent-escalation default flagged), synthesis in `external-benchmark-synthesis.md`.
