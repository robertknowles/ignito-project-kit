# Session download — Accuracy program (10–16 Jul 2026)

Quick handover: what the accuracy session completed. Everything below is **merged to main (`d5630df`), pushed, and nl-parse is deployed** at this state. Branch `design/proppath-refresh` and `main` are level.

## What was completed

**1. Gameplans benchmark (accuracy-testing/gameplans-comparison-report.md)**
Engine maths matches Gameplans to the dollar on identical inputs. The perceived 2–5-year conservatism was three defaults — all recalibrated: interest 6.25%→5.5%, opex ~1.4-1.6%→~1.0% of value, client-facing cashflow now gross rent (vacancy stays in serviceability/funding). Benchmark case: -$6,617/yr-7-crossover → -$2,193/yr-3 vs GP's ≈-$2,000/yr-2-3.

**2. 20-scenario accuracy suite (accuracy-testing/, tracked in git)**
Built from the 8 real beta-tester scenarios (pulled from Supabase) + variants. Engine leg: `npx vite-node accuracy-testing/run-scenario-suite.ts`. Live AI leg: `run-scenario-suite-ai.ts` (needs ANTHROPIC_API_KEY in `.env.local`, ~$0.80/pass, `--only ID` supported). Score went June 5/20 → 12/20+ across the fix rounds.

**3. Structural bug fixes (all verified by suite replay)**
- Interest-rate edits were silently ignored on planned properties — fixed.
- Compound removals ("remove properties 2, 3, 4") removed the wrong ones — fixed via pre-mutation snapshot.
- Chat messages described pre-autofix plans and hid deferrals — now rewritten post-autofix with per-change disclosure lines (src/utils/autoFixDisclosure.ts).
- Cashflow goals were never feasibility-checked — now graded with quantified shortfall descriptors (chat) + red gap line on the goal banner.
- Purchase-brief opex bug (Ella's "$8.5k shows as $15k") — final-year figure shown as year-1; fixed in the fix round.

**4. Company-strategy forceability (nl-parse v74+)**
10 new property fields + 3 profile fields (engagementFee, purchase costs, interestRate, ioTermYears, PM%, valuationAtPurchase, isNewBuild, saleYear…), mapper overlays, prompt bullets. Stated factors now stick instead of falling back to defaults. See FORCEABILITY-TIERS-BRIEF.md for the tier model.

**5. External benchmarks (parallel session)**
Ella's spreadsheet, Anu's spreadsheet, Julian's KalGi tool, Compound's sheet — all matched or divergences explained; synthesis in accuracy-testing/external-benchmark-synthesis.md.

**6. Final cleanup batch (16 Jul)**
- NT stamp duty sub-$525k formula bug fixed (was undercharging ~$8k).
- Autofix price cuts now scale rent to preserve stated yield.
- "Negotiate, don't shrink": stated prices defer to a fundable year with the cash requirement explained; price cut is last resort.
- Rob's three rulings: explicit "don't touch existing equity" wins (schema `useExistingEquity` carrier); serviceability prompt claim 8×→6× (engine unchanged); explicit short horizons honoured — 20-year FLOORS removed, 20-year DEFAULT kept.

## Open items (deliberately NOT done)

- **Tier 3** (goal-chasing restructuring, granny flats/manufactured equity as plan steps, mid-plan sell-downs) — **parked pending Rob × James**. See FORCEABILITY-TIERS-BRIEF.md. Do not build unprompted.
- Rob's manual test pack (ACCURACY-MANUAL-TEST-PACK.md) — not yet run by Rob.
- ANU-287's create-turn cashflow-goal optimistic estimate could be sharpened (goal-reached-late is silent on create turns).
- Remaining suite failures are "strategist quality" (wealth-scaled selection, pacing aggressiveness, goal-chasing) — mostly Tier-3-shaped.

## Gotchas for the next session

- Deploy recipe: `npx --yes supabase functions deploy nl-parse --project-ref gaoqzrdzihmrwipwsbwo --use-api` (auth already stored). Any change under supabase/functions/nl-parse/ needs it.
- Headless engine runs: `npx vite-node`, never tsx.
- Production AI = single-call prompt.ts/tools.ts; evals/ classify→extract path is deprecated.
- Scenarios saved before 11 Jul carry a stored 6.25% rate that now reads as a deliberate override — fresh plans for any testing.
- ANTHROPIC_API_KEY lives in `.env.local` only (`.env` is committed — never put secrets there).
- Ella has 3 accounts; her scenarios live under ella@caseventsgroup.com, not the Mecca account.
