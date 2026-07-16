# External Benchmark Synthesis — Where PropPath Sits Against the Market

**Date:** 2026-07-16
**Inputs:** the five comparison reports in this directory — [Gameplans](./gameplans-comparison-report.md) (2026-07-11, engine harness), [Ella](./ella-spreadsheet-comparison.md) (BA spreadsheet, 1-year), [Compound](./compound-comparison.md) (Ben & Adam, 10-year single property), [Anu](./anu-comparison.md) (4-property 18-year portfolio), [Julian / KalGi](./julian-kalgi-comparison.md) (competitor product, assumptions-and-features only).

---

## 1. Verdict

Across five independent sources — Gameplans, Ella's working BA spreadsheet, Compound's 10-year calculator, Anu's 4-property portfolio roadmap, and Julian's KalGi-built strategy tool — PropPath's math is not the problem anywhere. Every time inputs could be matched exactly, outputs matched to the dollar: Gameplans' canonical Brief case is exact (−$19,289), Ella's cashflow is $0-different on both IO legs, Compound's upfront-cash stack and 10-year value/equity are $0-different under its own growth curve, and Anu's 19-year portfolio is exact on rent and opex in every year and exact on value from Year 6 to Year 18. Julian's tool couldn't be run line-by-line, but every number of his we could hand-check was internally exact — his gap to us is 100% assumption generosity (flat 7% growth, a 20%-p.a. "Hot" tier), not arithmetic. The residual divergences fall into exactly three buckets: input-resolution gaps on our side (tiered growth curves instead of per-year, one rent-escalation dial instead of a stepped one, monthly-vs-weekly PMT cadence), the sources' own quirks (Ella's mislabelled management fee and rule-of-thumb stamp duty, Compound's interest charged on the wrong base and a PM fee that stops tracking rent, Anu's daily-compounded "6.00%", a vintage NSW duty schedule), and deliberate assumption choices on both sides. Two of our own defects surfaced along the way — the NT sub-$525k stamp-duty formula (documented, chip spawned, doesn't affect any compared deal) and the since-fixed hard-pinned 6.25% planned-property interest rate — and both were found by this program, not by a client.

---

## 2. Line-item matrix

What each source's model actually contains. **Y** = models it, **N** = doesn't, **?** = not visible/unknown, **~** = partial or via workaround. Julian's column is mostly **?** because his input stack was never shown (28 screenshots, outputs only).

| Line item | Ella | Compound | Anu | Julian (KalGi) | Gameplans | PropPath |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Gross rent | Y | Y | Y | ? (aggregate only) | Y | Y |
| Vacancy (in cashflow line) | N | N | N | ? | N (dial exists, not applied) | N by design (serviceability-side only, post-fix) |
| PM fee (% of rent) | Y (label≠rate) | Y (doesn't track rent) | Y (7%, tracks rent) | ? | Y (Brief) | Y (tracks rent) |
| Insurance | Y | Y | Y | ? | Y | Y |
| Council / water rates | Y | Y | Y | ? | Y | Y |
| Strata | n/a (house) | Y | ~ (opaque "Other") | ? | Y | Y |
| Maintenance | N | Y ($0) | ~ ("Other") | ? | Y | Y |
| Advertising / letting | **Y** | N | N | ? | N | **~ (no field — carried in maintenance)** |
| Land tax | Y (own line) | Y | N | ? | ~ (Brief only) | Y (auto by state + override; defaults $0 without override) |
| Interest — IO | Y | Y | Y | ~ (payments visible) | Y | Y |
| P&I / principal | **Y (dual IO+P&I view)** | N (IO forever) | N (IO forever) | ? | N (portfolio line) | Y per-property; portfolio line IO-forever |
| NG / tax on cashflow | N | N | N | **Y (waterfall + depreciation + loss c/f)** | N | Y (post-2026 ring-fence ⇒ often $0) |
| Depreciation as display line | N | N | N | Y | N | N |
| Rent escalation | N (static yr) | **Y (stepped 4%→3%)** | Y (5% flat) | Y (3%, per-property) | Y (5%) | Y (single dial) |
| Capital growth | N | **Y (per-year curve)** | Y (10/10/7…) | **Y (editable yr×tier matrix)** | Y (flat 5%) | Y (4-segment tiers) |
| Stamp duty | Y (rule-of-thumb) | Y (= VIC formula) | Y (NSW vintage) | ? | Y (Brief) | Y (statutory, per state) |
| Transfer/registration fee | Y (bundled) | N | N | ? | N | ~ (mortgageFees, mislabelled) |
| Conveyancing / legals | Y | Y | Y | ? | ? | Y |
| Building & pest | Y | Y | N | ? | ? | Y |
| BA / engagement fee | Y | Y | Y | ? | ? | Y |
| Mortgage fees & discharge | N | Y | N | ? | ? | Y |
| Holding deposit (conditional) | N | Y | N | ? | ? | Y |
| LMI (+ capitalisation) | n/a (80%) | **Y (banded, capitalised)** | n/a (80%) | ? | ~ | Y (banded, capitalisation flag) |
| Affordability / purchase-timing gating | N | N | N | **N — hand-typed year+price** | ~ | **Y (unique)** |
| Equity release / refinance | N | N | N | Y (80% borrowable-equity KPI) | Y | Y |
| CGT + selling costs on sale | N | N | N | Y (structure-switched) | N | Y (incl. 2027-reform scenario) |
| Interest-rate stress | N | N | N | **Y (live slider)** | N | ~ (events only) |
| $/week out-of-pocket headline | **Y (÷48)** | Y (per-year $/wk) | N | N | N | ~ (engine ÷52, not headlined) |

**Lines everyone (who models them) has, that we handle differently:** the displayed cashflow basis is now aligned (gross rent — every source that shows a client cashflow line uses gross; our vacancy correctly moved to serviceability-only in the 07-16 fix); interest convention (we charge simple annual on the carried loan — Compound charges it on the wrong base, Anu charges the daily-compounded effective rate; ours is the defensible one both times); P&I cadence (we PMT monthly, Ella weekly — $26/yr on a $520k loan).

**Lines we model that nobody else does:** affordability-gated purchase timing (deposit + borrowing capacity + serviceability + equity release), state-statutory stamp duty from first principles (three sources carry rule-of-thumb or stale figures), LMI banding with capitalisation, semi-annual resolution, CGT-reform-2027 scenario, and land tax auto-calc by state. The purchase-timing engine is the moat — no other source even asks "when *can* they buy".

**The one line we can't name:** advertising/letting (Ella's $750/yr). Only workaround is polluting the maintenance field.

---

## 3. Divergence triage

Every numeric divergence in the four external-source reports, classified. (The Gameplans report's divergences — pinned 6.25% rate, vacancy in the displayed line, opex defaults — were all OUR bug/defaults and were **shipped fixed on 2026-07-16**, per its §7; they're omitted from this table.)

| # | Source | Divergence | Size | Class | Notes |
|---|---|---|---|---|---|
| 1 | Ella | NT stamp duty sub-$525k formula (`calculateStampDutyNT`) | −$7,735 @ $500k; $8,134 discontinuity at boundary | **OUR BUG** | Found in passing; doesn't affect the compared $650k deal. Documented only; fix chip spawned. The only genuine math bug the whole program found. |
| 2 | Ella | Stamp duty on the deal, −$3,663 | 10.2% | **THEIR quirk** | Her $35,838 = exactly 5.5%×price+$88, a rule-of-thumb; ours is the NT statute (4.95%). We're right and $3.7k kinder — needs a provenance line in UI, not a math change. |
| 3 | Ella | Management fee $1,859 vs $2,974 | $1,115/yr | **THEIR quirk** | Her sheet labels 8.8% but computes 5.5%. Hers to resolve. |
| 4 | Ella | P&I repayment +$26/yr | 0.07% | **OUR input-resolution** (convention) | She PMTs weekly×52, we PMT monthly×12. Trivial. |
| 5 | Ella | $/week figure +$12–21/wk | ~8% | **OUR input-resolution** (display convention) | Her ÷48 vs our ÷52. Purely presentational; needs a deliberate divisor decision if we headline weekly. |
| 6 | Compound | Y10 value +$77,349 (raw run) | +10.9% | **OUR input-resolution** | Their per-year curve (12/10/8/5/5…) vs our High tier. Under their curve through our mechanics: **$0 every year** — zero mechanical error. |
| 7 | Compound | Interest −$94/yr | −$943 cum. | **THEIR quirk** | They charge 6.04% on ~$281k, not their own carried loan $282,744. Ours is self-consistent. |
| 8 | Compound | PM fee drift, −$15→−$183/yr | −$836 cum. | **THEIR quirk/bug** | Their "6.6% of rent" inflates at 3% instead of tracking 4% rent growth. |
| 9 | Compound | Income overshoot from Y7, +$285→+$1,263/yr | +$2,850 cum. | **OUR input-resolution** | Their rent escalation steps 4%→3%; we have one dial. |
| 10 | Compound | Y10 interest cell $16,889 | $95 | **THEIR quirk** | Unexplained anomaly in their own sheet. |
| 11 | Compound | "Capital returned in N years": 1 vs 2 | definitional | **ASSUMPTION** | We measure growth from cost, they from valuation — buy-under-market product decision pending. |
| 12 | Compound | Gross yield 7.4%→10.2% vs our 5.7%→4.4% | definitional | **ASSUMPTION** | Rent÷purchase-price vs rent÷current-value. Both defensible; not comparable. |
| 13 | Compound | LMI bands outside 85–90% | would diverge | **ASSUMPTION** | Same 2% band on this deal; our other band rates differ from theirs. |
| 14 | Anu | Interest −$3,370/yr, every year | −2.96% | **THEIR convention** | Her "6.00%" is the daily-compounded effective 6.1831%. Keying her effective rate → $0 on every row, all 19 years. Moves crossover Y8 vs Y9. |
| 15 | Anu | Portfolio value −$9,968, her Years 2–5 only | −0.35% | **OUR input-resolution** | Tier shape shares one rate across ownership years 2–3; her 10/10/7 is inexpressible. $0 from Year 6 to 18. |
| 16 | Anu | NSW stamp duty +$795 (both prices) | constant | **THEIR quirk** | Consistent with a prior-FY NSW schedule (CPI-indexed thresholds); our figures verified 2025-26. VIC and TAS exact. |
| 17 | Anu | Built-in High tier vs her flat 7% long-run | −6.1% value by Y18 | **ASSUMPTION** | No built-in tier holds ≥7% year-5+; long-run-bullish operators need custom curves. |
| 18 | Julian | End values +30% (his manual 6% vs our Medium), ~2× (Hot tier vs our High) | 30-yr horizons | **ASSUMPTION** | His compounding is hand-verified exact; the entire gap is growth-assumption generosity. Narrative battle, not accuracy. |
| 19 | Julian | Passive-income figures don't reconcile | unknown | **Insufficient data** | Rent inputs not visible; on the ask-Julian list. |

Pattern: **1 bug of ours (NT, off-path), zero mechanical errors, 7 their-quirks, 5 input-resolution gaps of ours (2 of them trivial conventions), the rest assumption choices.**

---

## 4. Compounding verdict — what's externally validated now

| Horizon test | Source | Result |
|---|---|---|
| 1-year cashflow itemisation + settlement cash | Ella | Exact ($0) on both IO legs once her quirks normalised; outlay exact ex-her stamp duty |
| 10-year single-property value/equity/loan compounding | Compound | **$0 divergence every year** under their curve; upfront stack exact incl. LMI + VIC duty from first principles; cashflow within $890/yr, fully decomposed |
| 18-year 4-property staggered portfolio | Anu | Rent + opex exact all 19 years; value/equity **$0 from Year 6–18**; cashflow exact on her rate convention. Staggered per-property escalation clocks confirmed as the same arithmetic |
| Multi-scenario calibration vs incumbent | Gameplans | Brief case exact to the dollar; post-fix defaults land on their crossover years (GP-CF-P1 year 3 vs their ~2–3; portfolio year 6 vs their ~5–6) |
| Competitor arithmetic | Julian | Internally exact (hand-verified to the dollar) but assumptions generous; no year-by-year series available to benchmark |

**Externally validated:** value/equity compounding (single + staggered multi-property), rent/opex escalation clocks, IO interest, upfront-cash stacks, stamp duty (VIC, TAS exact; NSW ours verified-current), LMI banding + capitalisation, buy-under-market day-one equity, crossover-year behaviour.

**Still only internally tested:** equity-release timing, serviceability stacking / borrowing-capacity gating (every harness deliberately used manual placement and generous funding to keep gating out of the comparison), deposit-pool mechanics, and the IO→P&I portfolio-line rollover (all matched sources model IO-forever, so it's never been exercised externally — and it's the known spot where our portfolio line and per-property view disagree with each other). These are also the features no other source has, so external validation may never come from spreadsheets — it needs broker-grade test cases of our own.

---

## 5. Default-assumption review (flag only — nothing changed)

| Assumption | PropPath default | The market (5 sources) | Calibration discussion? |
|---|---|---|---|
| **Rent escalation** | **5%** | Julian 3%, Compound 4%→3%, Anu 5%, Gameplans 5% | **YES — top priority.** Two reports independently call 5% our least defensible default; CPI-logic says 3–4%. Also the one place we overshoot others' income lines late-decade. |
| **Growth (default tier)** | Medium ≈5.06% effective | GP 5% flat, Anu 7% long-run, Julian 6–7% manual / 7% baseline / Hot 20% | **YES, but keep Medium** — it's the defensible one. The real ask is a per-year curve *input* so bullish operators can express 7%-flat without us owning it. Expect to look ~30% lighter than KalGi on 30-year horizons; arm BAs with the one-liner. |
| **Marginal tax rate** | 45% | Julian 47% (incl. Medicare) | **YES** — 47% is what a top-bracket investor actually pays; improves NG/CGT accuracy story. |
| **Trust tax rate** | 30% | Julian 47% | Discuss — keep 30% only with an explicit "assumes distribution planning" tooltip; ours is the friendlier number and will be challenged. |
| Marginal rate at consolidation | 39% | Julian 47% | Keep (retirement logic) but document rationale. |
| **Selling costs** | 3% | Julian 2% | Keep — theirs flatters consolidation proceeds by ~$20k per $2m sale. |
| Inflation (expenses) | 3% | Julian 3%, GP 2.5% | Keep — zero crossover impact inside 10 years. |
| Interest rate | 5.5% (post-fix) | GP scenarios 5.5% | Aligned as of 07-16. |
| Opex level | ≈1.0% of value (post-fix) | GP ~1.0% | Aligned as of 07-16 (units/strata cells still 1.2–1.6%). |
| Vacancy in cashflow line | Gross (post-fix); 4% serviceability-side | Nobody deducts it client-facing | Aligned — and ours is the more honest split. |
| $/week divisor | ÷52 (engine) | Ella ÷48 | Decide before headlining weekly: ÷52 with a tooltip recommended (÷48 overstates weekly pain 8%). |
| Company tax rate | 25% | Julian 25% | Both arguably wrong the same way (passive company = 30%, no CGT discount). Low priority. |
| SMSF tax/CGT | 15% / effective 10% | Julian identical | Parity. Pension-phase 0% is an open differentiator for both. |

---

## 6. Feature gaps feeding the roadmap (consolidated)

Roughly ordered by how many sources ask for it × effort:

1. **Itemised opex lines** — a named advertising/letting field or a free-label "Other (annual $)" line (Ella; only recurring line on a real BA sheet we can't name).
2. **"Total funds required at settlement" as a first-class client number** with per-line provenance, incl. a transfer/registration-fee line and stamp-duty state+rate labelling (Ella's "$169k settlement account" moment; already computed as `tp.totalCashRequired`, reconciled exactly in two harnesses).
3. **$/week out-of-pocket headline** — `netWeeklyCashflow` exists; expose it, decide the divisor story, add a per-year $/wk row (Ella, Compound).
4. **Per-year growth-curve input** (per property or per profile) — the single root cause of every value divergence across Compound, Anu and Julian; also the answer to KalGi's editable matrix.
5. **Time-varying rent escalation** (e.g. 4%→3% step) — Compound.
6. **Dual-rate / IO-vs-P&I side-by-side view** — Ella's core selling page; natural fit for the Compare tool.
7. **Hold/Sell toggles + consolidation end-state view** (loans before/after, cash after CGT, unencumbered value, passive income, goal-achieved-in-N-years badge) — Julian's whole moat; our engine has the ingredients (sell events, entity CGT, consolidation-year rate), so largely a surfacing gap.
8. **Interest-rate stress slider** — cheap, high-optics; `interest_rate_change` events already exist (Julian).
9. **Yield/metric surfacing** — net yield per year, CoC/ROIC (already computed: `cocReturnCumulative`, `roic`), yield-on-loan, plus a gross-yield definition note (Compound, Ella, Julian).
10. **Value-add rows** (per-year reno cost / equity uplift / rental uplift) — partial today via renovation events (Compound).
11. **Payment-stage modelling** — unconditional stage + %-structured deposits (Compound).
12. **Tax waterfall display** (after-depreciation / after-tax / loss carried forward) and a per-field property audit trail — Julian; display-layer, not engine.
13. **Fix the NT sub-$525k stamp-duty formula** — the program's one true bug; before any Darwin beta user prices a sub-$525k property (chip spawned).

---

## 7. What to show Rob

The five tables worth his eyes, in order:

1. **Ella per-cell before/after** — the "key her sheet into PropPath" recipe, every cell ✓/⚠ — [ella-spreadsheet-comparison.md](./ella-spreadsheet-comparison.md), §"Per-cell before/after for Rob".
2. **Compound per-cell scoreboard** — $66,972 upfront exact, $0 value/equity all 10 years under their curve — [compound-comparison.md](./compound-comparison.md), §8.
3. **Anu per-cell reconciliation** — 4 properties, 19 years, rent/opex exact everywhere — [anu-comparison.md](./anu-comparison.md), §6.
4. **Julian assumption before/after + the 30%/2× growth-divergence table** — the competitive-narrative page — [julian-kalgi-comparison.md](./julian-kalgi-comparison.md), §6 and §3b.
5. **Gameplans post-fix results** — before/after the 07-16 default changes landing on their crossover years — [gameplans-comparison-report.md](./gameplans-comparison-report.md), §7 (with the §2 sensitivity grid as backup).
