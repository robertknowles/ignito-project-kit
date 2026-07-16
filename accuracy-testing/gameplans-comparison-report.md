# PropPath × Gameplans — Cashflow Accuracy Comparison

**Date:** 2026-07-11
**Harness:** `accuracy-testing/run-gameplans-comparison.ts` — runs the REAL engine (`src/engine/scenarioRunner` → `timelineEngine` + `projectionEngine`, `src/utils/detailedCashflowCalculator`) headlessly. No app code was modified.
**Run with:** `npx vite-node accuracy-testing/run-gameplans-comparison.ts` (vite-node, not tsx — `timelineEngine.ts:1023` reads `import.meta.env.DEV`, which only exists under Vite module semantics).
**Sources:** `GAMEPLANS-BASELINE-REFERENCE.md` (§5 dials, §8 Brief, §12 archetypes, §13 calibration notes) + the four Gameplans scenario transcripts in `~/Downloads/Docs/`.

Every year-row printed by the harness is reconciled against the engine's own `cashflowData` output (✓ column). All runs reconcile to within $2, so the per-line itemisation below IS the engine's math, not a re-implementation.

---

## 0. Headline result

**Given identical inputs, our cashflow math reproduces Gameplans to the dollar.** The GP-BRIEF-350K case (Gameplans' canonical Brief-tab unit, §8/§13.4 of the baseline) run with Gameplans' exact itemised inputs produces **-$19,289/yr = -$1,607/mo — an exact match** to Gameplans' published figure.

All divergence therefore comes from **defaults and treatments**, not formulas. Four of them, ranked below, add up to the "10 years vs 7" beta complaint:

| | Assumption | PropPath | Gameplans | Y1 impact ($650k, 5% yield) | Crossover impact |
|---|---|---|---|---|---|
| 1 | Interest rate on planned-property cashflow | **6.25% hard-pinned** (ignores per-property AND profile rate edits) | 6% dial default; 5.5% in every scenario transcript | -$3,900/yr | **-2 years** (8→6) |
| 2 | Vacancy in the displayed cashflow line | 4% deducted from income | Cashflow/Brief lines use **gross rent** (occupancy dial not applied there) | -$1,300/yr | -1 year |
| 3 | Operating-cost defaults | 1.2–1.6% of value | ~1.0% of value ("typical holding costs") | -$1,700/yr | -1 year |
| 4 | Expense inflation | 3% | 2.5% | ~$0 Y1, compounds late | 0 years in a 10-yr window |

Combined ("ALL Gameplans-aligned" sensitivity row): **Y1 -$2,600, crossover year 3** — landing exactly on Gameplans' "essentially neutral over the next couple of years". Our all-defaults engine on the same property: **Y1 -$9,496, crossover year 8** (year 10 if yield is 4.5%).

---

## 1. Case-by-case comparison

### 1.1 GP-CF-P1 — Gameplans Cashflow archetype, property 1
$550k residential, 5% gross yield ($529/wk), IO 80% LVR ($440k loan), 5.5% interest, 92% occupancy, 5% rent growth. Gameplans transcript figures vs our engine (Gameplans dials applied where the engine allows; our default opex):

| Line (Year 1) | Gameplans | PropPath engine | Δ |
|---|---|---|---|
| Gross rent | $27,500 | $27,508 | ≈0 |
| Vacancy deduction | (not deducted in their net figure) | -$2,201 (8%) | **-$2,201** |
| Mortgage (IO) | ~$24,200 | $24,200 | 0 |
| Running costs | ~$5,500 | $7,725 (mgmt $2,025 + insurance $1,500 + council/water $2,000 + maintenance $2,200) | **-$2,225** |
| **Net cashflow** | **≈ -$2,000** | **-$6,617** | **-$4,617** |
| **Crossover** | **"neutral over the next couple of years" (~2-3 yrs)** | **2032 — year 7 of ownership** | **~4-5 years later** |

Gameplans' own arithmetic ($27.5k − $24.2k − $5.5k = -$2.2k) confirms their net line uses **gross** rent — the 92% occupancy dial is not applied to the cashflow output they show clients.

Forcing Gameplans-level running costs ($5.5k via `holdingCostOverride`, case GP-CF-P1-GPOPEX): Y1 -$4,393, crossover year 5. The remaining -$2,192 gap vs their -$2,000 is **exactly our vacancy deduction ($2,201)** — with gross-rent treatment we match Gameplans within $10.

### 1.2 GP-BRIEF-350K — exact-match proof (baseline §8 / §13.4)
$350k QLD unit, $140/wk rent, IO 5.77% on $280k, Gameplans' itemised holding costs (council+water $2,100, strata $5,400, insurance $700, maintenance $550, mgmt $163, land tax $1,500), no vacancy:

| Line (Year 1) | Gameplans | PropPath engine |
|---|---|---|
| Rent | $7,280 | $7,280 |
| Holding costs | $10,413 | $10,413 |
| Repayments | $16,156 | $16,156 |
| **Annual cashflow** | **-$19,289** | **-$19,289 — EXACT** |

§13.4's "monthly cashflow per $350k unit -$1,607 ±10%" target: **PASS** exactly at 0% vacancy; at our 4% default vacancy it is -$1,632/mo (-1.5%), still comfortably inside ±10%. (Note: the $140/wk rent = 2.08% yield is as-published in the baseline doc — a Gameplans demo-data quirk; we kept it verbatim.)

### 1.3 GP-GROWTH-P1 — Gameplans Growth archetype, property 1
$700k, 3.2% yield ($431/wk), IO 90% LVR ($630k loan), 5.5%, 92% occupancy:

| | Gameplans | PropPath engine |
|---|---|---|
| Y1 net | ≈ -$20,000 | -$25,180 |
| Crossover | "neutral about 2026" (year 4) | 2046 (year 21) |

Y1 gap decomposes as before: vacancy -$1,793 + opex gap (our metro-house-growth cell defaults total $11,150 vs their ~$5.5-7k).

**Important caveat: Gameplans' "neutral about 2026" is NOT derivable from their own stated inputs.** Rent of $22.4k growing 5%/yr cannot cover $34.65k IO interest plus any running costs by year 4 — under their own dials it crosses around year 11-12. Their "passive income" chart line evidently includes something beyond this property's cashflow (or the transcript is loose). We did **not** treat that claim as a calibration target; the honest statement is: on their dials, this property crosses ~year 11-12; on our dials (interest pinned 6.25%), year 21. The pinned interest rate roughly doubles the time-to-positive for a low-yield property.

### 1.4 GP-CF-PORTFOLIO — full 3-purchase Cashflow archetype
$550k (Y0) + $600k (Y+2) + $720k (Y+4), all 5% yield, IO 80%, 5.5%:

| Checkpoint | Gameplans | PropPath engine |
|---|---|---|
| Year of P3 (portfolio rent ~$100k) | rent ~$100k / repayments ~$85k / running ~$20k → **≈ -$2k, "essentially neutral"** | gross rent $102,500 / interest $82,280 / opex $29,250 + vacancy $8,200 → **-$17,230** |
| Year after P3 | **positive $6-7k** | -$13,435 |
| Portfolio crossover | ~year 5-6 | **2035 — year 10** |

Rent and interest track Gameplans almost exactly ($102.5k vs ~$100k; $82.3k vs ~$85k). The whole divergence is vacancy ($8.2k) + running-cost level ($29.3k vs ~$20k). **This case reproduces the beta complaint verbatim: a portfolio Gameplans shows going positive around year 5-6, our engine shows at year 10.**

---

## 2. The "10 vs 7 years to cashflow-positive" claim — tested

Single property, $650k, 5.0% gross yield ($625/wk), IO 80% LVR, 5% rent growth, all PropPath defaults:

**Our engine: crossover in year 8 (2033).** At 4.5% yield: **year 10** — the tester's "~10 years" is reproduced by a typical 4.5-4.75% yield property under our defaults. The BA's "~7 years" expectation is what the same property does in a Gameplans-dialled world.

Sensitivity (one dial at a time; ownership-year of crossover):

| Variant | Y1 net | Crossover (own-year) |
|---|---|---|
| **Base — all PropPath defaults** | **-$9,496** | **8** |
| Interest 6.25% → 5.5% (GP scenario rate) | -$5,596 | **6** |
| Interest 6.25% → 6.0% (GP dial default) | -$8,196 | 7 |
| Vacancy 4% → 8% (GP occupancy dial) | -$10,692 | 9 |
| Vacancy 4% → 0% (GP cashflow-line treatment) | -$8,300 | 7 |
| Expense inflation 3% → 2.5% (GP) | -$9,496 | 8 |
| Management 8% → 5.5% of rent | -$8,716 | 7 |
| Opex forced to 1.0% of value (GP running costs) | -$7,800 | 7 |
| Rent escalation 5% → 4% | -$9,496 | 10 |
| New build (NG benefit retained, after-tax) | **+$627** | **1** |
| Yield 5.0% → 4.5% | -$12,343 | 10 |
| Yield 5.0% → 5.5% | -$6,603 | 6 |
| **ALL Gameplans-aligned (5.5% + gross rent + GP opex + 2.5% infl)** | **-$2,600** | **3** |

**The single Gameplans-alignable assumption that moves crossover most is the interest rate (2 years).** Vacancy treatment and opex level are worth ~1 year each; expense inflation is worth nothing inside a 10-year window. (The new-build NG flag is a 7-year swing but is an after-tax modelling choice, not a Gameplans-alignment dial — Gameplans models pre-tax.)

---

## 3. Ranked diagnosis of the divergence

1. **Planned-property loan interest is hard-pinned to `DEFAULT_INTEREST_RATE` (6.25%).**
   `src/engine/projectionEngine.ts:697` calls `getPropertyEffectiveRate(periodsElapsed, eventBlocks, rp.instanceId)` **without a baseRate argument**, so it falls back to the platform constant. Verified headlessly: setting the per-instance `interestRate` to 5.5 AND setting `profile.interestRate` to 0.055 both leave the cashflow line at $32,500 on a $520k loan (= 6.25%). Only `interest_rate_change` events reach it. Existing properties, by contrast, DO use their instance/profile rate — so a mixed portfolio is internally inconsistent. Ella's saved fixture (`accuracy-testing/fixtures/ella-scenario-314.json`) shows the same flat 6.25% figure in production output. Gameplans runs every scenario at 5.5% (dial default 6%). **Biggest single cashflow gap and biggest crossover mover; also means a BA "correcting" the rate sees no change — compounding the perception problem.**

2. **Vacancy is deducted from the displayed cashflow line; Gameplans' client-facing cashflow figures use gross rent.**
   Proven two ways: their Brief maths ($7,280 − $10,413 − $16,156 = -$19,289 exactly, no vacancy) and their transcript arithmetic ($27.5k − $24.2k − $5.5k ≈ -$2k). Where Gameplans' 92% occupancy dial actually lands is not verifiable from the docs — but it is demonstrably NOT in the cashflow outputs BAs compare against. Ours (4% default) is arguably more honest, but it makes us read ~$1-2k/yr more negative per property on a like-for-like screen. Worth ~1 crossover year.

3. **Operating-cost defaults are 20-60% above Gameplans' "typical holding costs".**
   Ours: $7,725/yr on a $550k regional house (1.40% of value), $11,150/yr on a $700k metro house (1.59%). Gameplans scenarios: ~$5,500 on $550k (1.0%). The gap is mostly maintenance ($2,200-4,000 vs their implied few hundred) and council ($2,000-3,500). Note Gameplans is not uniformly low — their Brief itemisation on the $350k unit totals $10,413 (with $5,400 strata + $1,500 land tax) — but their scenario-engine "typical" level is ~1.0% of value. Worth ~$2-6k/yr and ~1 crossover year. The tester's "holding costs possibly optimistic in year 1" is **not supported** — year 1 we are *higher* than Gameplans, not lower.

4. **Expense escalation: 3% vs 2.5% — negligible for crossover, visible at horizon.**
   Zero crossover-year impact within 10 years. But it explains the "escalating too fast" perception at the display level: **an $8.5k opex figure inflated at 3% for 19-20 years displays as ~$14.9-15.4k — exactly the tester's "$8.5k edit shows as $15k" report.** That is almost certainly a final-year/inflated-year figure being shown where the tester expected the year-1 figure (display/labelling issue, not an engine error — not measured further here). Also note management fees escalate with rent (5%/yr), faster than inflation — same as Gameplans' model implies, but worth knowing when reading long-horizon opex lines.

5. **After-tax treatment (negative gearing).** Our displayed cashflow adds the NG benefit, but planned *established* purchases bought ≥2026 are ring-fenced → $0, so the line is effectively pre-tax (same basis as Gameplans). A new build flips Y1 to positive (+$627 vs -$9,496) — a 7-year crossover swing between otherwise identical plans. Not a Gameplans divergence, but the largest within-PropPath lever a tester will trip over.

6. **Offsetting anti-conservative quirks (for completeness):** land tax defaults to $0 unless `landTaxOverride` is set (Gameplans' Brief includes it — makes us *less* conservative); IO loans never roll to P&I in the portfolio cashflow line (interest flat on the original loan forever — matches Gameplans' Pattern 6, so no divergence, but the per-property Brief view DOES amortise after the IO term, so the two views disagree with each other); P&I principal payments are inflated by expense inflation (a quirk — principal is not an inflating cost).

---

## 4. Baseline §13 calibration notes — verified against current engine

| §13 item | Status now |
|---|---|
| BC = 6× income | ✅ Present (`salaryServiceabilityMultiplier` default 6.0) |
| New-purchase LVR 80% | ✅ All 10 cell defaults are `lvr: 80` |
| Interest 6.25% vs GP 6% | ⚠️ Still present — and worse than a default drift: the rate is **unoverridable** for planned-property cashflow (finding #1) |
| Vacancy 4% vs GP 8% dial | ⚠️ Still present, but see finding #2 — GP's cashflow outputs don't apply their 8% at all |
| Wage growth 2.5% | ◐ Declared in `financialParams.ts` but the comment says "DECLARED ONLY — engine does not yet apply this to BC ceiling" (it IS used in savings/do-nothing projections) |
| 30-year horizon | ◐ Default `timelineYears` still 20; engine handles 30 when set (used in these runs) |
| CGT on sale events | ✅ FIXED since April note — `salesCgtBreakdown` models CGT (2027 basis) on existing + planned sales |
| Selling costs 3% | ✅ FIXED — `sellingCostsPercent` default 3 applied on sales |
| Per-property historical compound floor | ❌ Still flat `existingPortfolioGrowthRate` (default 5%) |
| Life-event spending shocks | ❌ Still absent (event system covers rates/market/renovation, not cars/holidays/education) |
| Growth Medium tier ≈5.4% ("smart match" +2% over GP 5%) | Unchanged; irrelevant to cashflow lines |

## 5. What the baseline docs do NOT give (stated, not invented)

- The composition of Gameplans' ~$5.5k "typical holding costs" (no per-line split in any scenario transcript).
- Where the 92% occupancy dial is actually applied inside Gameplans (not in Brief or the transcript cashflow lines; possibly serviceability or a chart we don't have).
- A precise Gameplans crossover year for any scenario — only verbal ("neutral over the next couple of years", "neutral about 2026", "positive 6 or 7 grand the year after"). The Growth-scenario "neutral about 2026" is internally inconsistent with their own inputs (see §1.3) and was not used as a target.
- Gameplans' land-tax defaults in the scenario engine (Brief shows $1,500 for one QLD unit only).

## 6. Harness usage

```bash
npx vite-node accuracy-testing/run-gameplans-comparison.ts                     # all cases + sensitivity
npx vite-node accuracy-testing/run-gameplans-comparison.ts -- --case GP-CF-P1  # one case
npx vite-node accuracy-testing/run-gameplans-comparison.ts -- --case SENSITIVITY
```

Cases: `GP-CF-P1`, `GP-CF-P1-GPOPEX`, `GP-GROWTH-P1`, `GP-BRIEF-350K`, `BETA-DEFAULTS`, `GP-CF-PORTFOLIO`, plus the sensitivity grid. Properties are manually placed (`isManuallyPlaced` + `manualPlacementPeriod`) so deposit/BC gating differences cannot contaminate the cashflow comparison; Gameplans' 5.5%/5.77% rates are modelled via an `interest_rate_change` event because that is the only lever that reaches the planned-property interest line (finding #1).

---

## 7. 2026-07-16 update — divergences #1-#3 closed in product defaults

The three actionable divergences above were shipped (branch `design/proppath-refresh` worktree, commits "Default interest rate 6.25% -> 5.5% platform-wide", "Rescale per-cell operating-cost defaults toward ~1.0% of typical value", "Client-facing cashflow lines use gross rent; vacancy stays assessment-side"):

1. **Interest**: `DEFAULT_INTEREST_RATE` = 5.5% (cell templates, profile default, carded rate follow it). The rate-resolution fix (instance-off-default → profile → default) references the constant, so the sentinel moved with it. NOTE: instances saved under the old default carry a stored 6.25 which now reads as a deliberate per-property override.
2. **Opex**: cell defaults rescaled to ≈1.0% of typical value for houses/commercial-high (units/commercial-low bottom out at 1.2-1.6% because strata and high-yield mgmt fees are untouched). Cut taken from maintenance first, then council.
3. **Vacancy**: client-facing cashflow lines (portfolio line, per-property, briefs, holding-cost panel, retirement projection) now use GROSS rent. Vacancy still applies unchanged in serviceability rental recognition and funding projections; the assumptions dial + per-property slider copy say so. The harness's Vacancy column is now a memo (not summed).

Post-change harness results (`npx vite-node accuracy-testing/run-gameplans-comparison.ts`):

| Case | Before | After | Gameplans |
|---|---|---|---|
| GP-CF-P1 Y1 net | -$6,617 | **-$2,193** | ≈ -$2,000 |
| GP-CF-P1 crossover | year 7 | **year 3** | ~2-3 yrs |
| GP-CF-PORTFOLIO crossover | year 10 | **year 6** | ~year 5-6 |
| GP-CF-PORTFOLIO P3-year net / running | -$17,230 / $29.3k | **-$746 / $21.0k** | ≈ -$2k / ~$20k |
| GP-GROWTH-P1 Y1 net | -$25,180 | **-$20,731** | ≈ -$20,000 |
| GP-BRIEF-350K Y1 | -$19,289 | **-$19,289 (unchanged, exact)** | -$19,289 |

Expense inflation (#4) deliberately left at 3% (zero crossover impact inside 10 years).
