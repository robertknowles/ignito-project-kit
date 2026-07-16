# PropPath × Julian's tool (KalGi) — Assumption & Feature Comparison

**Date:** 2026-07-16
**Task:** Accuracy-benchmarking program, Task 5 (competitor comparison — analysis only, no engine harness).
**Competitor identity:** vendor **KalGi Pty Ltd** (named in the on-screen disclaimer), white-labeled with **Search Party Property** branding (Julian Khursigara's buyers' agency). The believed product name "Propgoal" is **unconfirmed** — no wordmark appears in any of the 28 screenshots. Referred to throughout as **"Julian's tool (KalGi)"**.
**Sources:**
- `accuracy-testing/external-sources/julian-propgoal-transcription-A.md` (16 screenshots — Dashboard + Strategy)
- `accuracy-testing/external-sources/julian-propgoal-transcription-B.md` (12 screenshots — Strategy end-state, Risk Assessment, Assumptions, Growth Strategy matrix, Track Changes)
- PropPath side: `src/constants/financialParams.ts`, `src/contexts/InvestmentProfileContext.tsx` (INITIAL_INVESTMENT_PROFILE), `src/utils/cgtCalculator.ts`
- Gameplans leg: `accuracy-testing/gameplans-comparison-report.md` (2026-07-11)

**Scope limits (deliberate):** the screenshots show **no interest rate level, vacancy, LMI, purchase fees, loan terms, or management fees** for their tool, so a line-by-line cashflow comparison is impossible and was not attempted. This report compares (a) the assumptions that ARE visible, (b) internal arithmetic consistency of their displayed outputs, and (c) feature surface. All "who's more defensible" commentary cites ATO-standard figures **from background knowledge, not verified research** — flagged where used.

---

## 1. What their tool is

A **portfolio strategy / consolidation tool** for existing property investors, built around the question *"which properties do I hold, which do I sell, and when does the sell-down deliver my passive-income goal?"* — a different center of gravity from PropPath's *"what do I buy next and when can I afford it?"*

Observed capabilities (28 screenshots, Google Meet demo 1 Jun 2026, real client workspace set up by Julian in Oct 2025):

- **Per-property Hold ⇄ Sell toggles** in the strategy table; the sell-set drives a consolidation event.
- **Ownership structures as a first-class column** — Personal / Trust / SMSF per property — with structure-specific tax assumptions that switch with the strategy (personal 47% marginal + 50% CGT discount; SMSF 10% effective marginal + 33.33% CGT discount).
- **Passive-income goal-seek framing** — a dollar goal ($60k / $100k / $10k across the demo strategies) and a "Goal Achieved" badge with years-to-goal ("13 years", "12 years", "33 years") against a user-selectable consolidation year.
- **Consolidation end-state cards + table** — per property and total: projected value, loans before/after sales, remaining cash from sales after CGT, projected value without loans (unencumbered end state), and passive income (pre-tax).
- **Interest-rate stress slider** ("Risk Assessment" page) — drag a rate-change %, see Current vs Predicted vs Difference mortgage payments per property and portfolio-total, with an annual/period toggle.
- **Named, saveable, comparable strategies** — "No Purchase, Consolidate", "Purchase 2, Consolidate", "SMSF" — with Save As / Delete / **Compare** buttons and per-strategy portfolio subsets ("2 properties" scope pill).
- **Audit log ("Track Changes")** — per-property who/what/when with change counts (~29–34 tracked fields per property record) and drill-down.
- **Growth Strategy matrix (2027→2057, PY+1→PY+31)** — a fully editable year-by-year growth table with three market-heat tiers: **Hot** (20% p.a. years 1–4, 15% year 5, → 7%), **Warm** (10% years 1–3, 15% years 4–5, → 7%), **Growth** baseline (flat 7% every year). All tiers converge to 7% long-run. Individual properties can instead be set to a "Manual" flat rate (the demo portfolio ran 6–7% Manual).
- **Future purchases as placeholder rows** ("New IP 1", $750k, 2026) mixed into the same table — user picks year and price by hand; no affordability engine gates the timing.
- **Rich dashboard** — 10 KPI tiles (value, equity, borrowable equity @ 80%, cashflow pre/post tax, LVR, 3 yield variants, avg growth), a tax-waterfall cashflow chart (rent → expenses → pre-tax → after-depreciation → after-tax → loss carried forward), per-property cashflow bars, historic cumulative growth + CAGR per property.
- Video-help + PDF-export icons on every page title; footer disclaimer naming KalGi Pty Ltd; agent-operated client workspaces (Julian's email in the audit log).

---

## 2. Assumption-by-assumption comparison

PropPath values are the shipped defaults in `INITIAL_INVESTMENT_PROFILE` (`src/contexts/InvestmentProfileContext.tsx:128`) and `src/constants/financialParams.ts`. Gameplans values from `accuracy-testing/gameplans-comparison-report.md`. "—" = not visible/documented.

| Assumption | Julian's tool (KalGi) | PropPath default | Gameplans | More defensible for AU modelling (background knowledge, not verified research) |
|---|---|---|---|---|
| **Growth model — new purchases** | Market-heat tier matrix: **Hot** 20% yrs1–4, 15% yr5 → 7%; **Warm** 10% yrs1–3, 15% yrs4–5 → 7%; **Growth** baseline flat 7%; every cell editable; or per-property "Manual" flat rate (demo used 6–7%) | `GROWTH_RATE_TIERS`: **High** 12.5/10/10/7.5→6; **Medium** 6/5.5/5.5/5→5 (default, ~5.06% effective over 30y); **Low** 5/4/4/3.5→3 | 5% flat default; 6% dial max in transcripts | **PropPath.** Long-run AU national dwelling growth is ~6.8% over 25 years but recent decades lower; a flat 7% baseline for every year of a 30-year projection is at the optimistic edge, and their Hot tier (20% p.a. × 4 years = 2.07× before year 5) is promotional, not defensible. Our Medium (~5%) is deliberately calibrated near Gameplans; our High (12.5% yr1) is aggressive but still half their Hot tier. Their matrix *editability* is better UX than our fixed tiers, though. |
| **Growth — existing/mature properties** | Same matrix or Manual per property (demo: 6% most, 7% The Ponds) | `DEFAULT_EXISTING_PORTFOLIO_GROWTH_RATE` = 5% flat | 5% flat | Tie / theirs slightly higher. 5–6% flat for mature stock is standard; their per-property manual override is a nice touch we match via per-property tiers. |
| **Rent growth** | 3% per property default (0% on one row — per-property editable) | `rentEscalationRate` = **5%** | 5% in CF-archetype transcripts | **Theirs.** Long-run AU rent growth tracks CPI+ (~3–4%); our 5% uniform escalation for 20+ years is the aggressive outlier here and is a defensibility risk in our own numbers. (Gameplans also uses 5% in scenarios.) |
| **Inflation (expenses)** | 3% | `inflationRate` = 3% (`ANNUAL_INFLATION_RATE`) | 2.5% | Tie (both 3%, mid-RBA-band); Gameplans' 2.5% is the RBA midpoint. Immaterial either way (per Gameplans report §2: 0 crossover-years inside a 10-year window). |
| **Selling costs** | 2% | `sellingCostsPercent` = **3%** | — | **Slightly ours.** Agent commission alone runs ~1.8–2.5% in AU; adding conveyancing/marketing/discharge, an all-in 2.5–3% is realistic. Their 2% flatters sale proceeds at consolidation; on a $2M sale that's a $20k difference in modelled net proceeds. |
| **Marginal tax rate** | **47%** (45% top rate + 2% Medicare levy) | `marginalTaxRate` = **45%** | pre-tax modelling | **Theirs, for top-bracket clients.** 47% incl. Medicare is what a top-bracket investor actually pays; our 45% understates CGT and negative-gearing benefit by ~4% relative. (Both editable; for sub-$190k clients both defaults overstate.) |
| **Marginal rate at consolidation year** | 47% (same as during accumulation) | `marginalTaxRateAtConsolidation` = **39%** | — | **Ours, conceptually.** At sell-down/retirement the client's other income has usually dropped, so a lower consolidation-year rate is more realistic — but staging multiple sales across years to manage brackets matters more than either constant. Theirs is the more conservative (higher-tax) choice. |
| **Company tax rate** | 25% | `companyTaxRate` = 25% | — | Tie — both arguably **wrong the same way**: a company whose income is ≥80% passive (rent) is not a base-rate entity and pays **30%**, and companies get **no CGT discount** (our `cgtCalculator.ts` correctly applies no discount for companies; their treatment of company CGT is not visible). |
| **Trust tax rate** | **47%** (taxed at top personal rate) | `trustTaxRate` = **30%** | — | Depends on framing. Trusts are flow-through: distributed income is taxed at beneficiary marginal rates; only *undistributed* income cops 47%. Their 47% assumes zero distribution planning (very conservative); our 30% assumes distribution to a corporate beneficiary / mid-bracket individuals (typical advised structure, but optimistic if the client has no bucket company). Neither is a fact; ours produces friendlier trust numbers — be ready to defend that in a head-to-head. |
| **SMSF tax rate** | 15% (accumulation rate); shown as **10% "marginal rate at consolidation"** in the SMSF strategy | `smsfTaxRate` = 15% | — | Tie — and **mathematically identical on CGT**: their 10% effective = 15% × ⅔; our `cgtCalculator.ts:28` computes `smsfTaxRate × (1 − 1/3)` = 10%. Both ignore pension-phase 0% tax after retirement, which is the actually-correct end state for a consolidation story — an improvement opportunity for *both* tools. |
| **CGT 1-year discount** | 50% personal / **33.33% SMSF** (switches with structure) | `cgtOneYearDiscount` = 0.50; SMSF ⅓ hardcoded in `cgtCalculator.ts` | — | Tie — same ATO-standard treatment (50% individual/trust, ⅓ SMSF), differently surfaced. Theirs displays the structure-switched value in the assumptions bar (good demo optics); ours is buried in the calculator. PropPath additionally models the **proposed 2027 CGT reform** as a scenario (`calculateCgtComparison`) — they show no equivalent. |
| **LVR (equity access)** | Implicit **80%** — "New Debt @ 80%" bar; borrowable equity = value × 0.80 − debt (verified: 5,780,000 × 0.8 − 3,529,000 = 1,095,000, matches their KPI to the dollar) | `EQUITY_EXTRACTION_LVR_CAP` = 0.80 (purchase LVR per property) | 80–90% per scenario | Tie — identical 80% refinance convention. |
| **Interest rate** | **Not visible** (stress slider shown only at 0% change; $228,978 portfolio annual payment shown but loan balances per property unknown) | `DEFAULT_INTEREST_RATE` = 5.5% | 6% dial default / 5.5% scenarios | Cannot compare. |
| **Vacancy** | Not visible | 4% (`DEFAULT_VACANCY_RATE`) | 92% occupancy dial, NOT applied to displayed cashflow | Cannot compare theirs. |
| **LMI / purchase costs / mgmt fees** | Not visible | Modelled (per-type defaults + profile overrides) | partial | Cannot compare theirs. |
| **Passive-income goal** | Explicit per-strategy ($60k/$100k/$10k demo) | `targetPassiveIncome` = $80,000 (Financial Freedom projection) | — | Tie in concept; theirs is the *primary* framing, ours is one output among several. |
| **Depreciation & loss carry-forward** | First-class portfolio line items (cashflow waterfall: after-depreciation, after-tax, loss carried forward) | After-tax modelling exists (new-build NG flag per Gameplans report) but depreciation/loss-carry-forward are not surfaced as portfolio waterfall lines | pre-tax only | **Theirs on presentation.** Whatever the engine truth, showing "cashflow after depreciation / after tax / loss carried forward" as portfolio bars is persuasive and tax-literate. |

---

## 3. Worked sanity check — their growth math, verified by hand

The Strategy end-state table (batch B, image 1) shows the SMSF strategy: two placeholder properties at $800,000, purchased 2027 and 2029, growth set to **Manual 6%** (batch A, images 14–15), consolidation year **2059**.

**Note first:** these projections did **not** use the 7% matrix baseline — the demo properties were all on "Manual" rates (6–7%). The matrix (Hot/Warm/Growth) is an alternative curve source. The check below therefore verifies their compounding engine at the manual 6% rate, then quantifies what the 7% baseline and our Medium tier would do on identical inputs.

### 3a. Internal consistency of their displayed values (hand-computed)

| Check | Hand computation | Their displayed value | Verdict |
|---|---|---|---|
| SMSF New IP 3: $800k @ 6% for 32 yrs (2027→2059) | 800,000 × 1.06³² = **5,162,709.35** | **5,162,709** | Exact (rounds to the dollar) |
| SMSF New IP 4: $800k @ 6% for 30 yrs (2029→2059) | 800,000 × 1.06³⁰ = **4,594,792.94** | **4,594,793** | Exact |
| Total projected value | 5,162,709 + 4,594,793 = **9,757,502** | **9,757,502** (table total AND result card) | Exact |
| Dashboard equity | 5,780,000 − 3,529,000 = **2,251,000** | 2,251,000 | Exact |
| Borrowable equity @ 80% | 5,780,000 × 0.80 = **4,624,000**; − 3,529,000 = **1,095,000** | 4,624,000 / 1,095,000 | Exact — proves the 80% refinance LVR |
| Portfolio cashflow = Σ per-property | 61 − 12,022 − 7,400 − 17,135 + 316 − 55,491 = **−91,671** | −91,671 (KPI tile & waterfall) | Exact |
| LVR | 3,529,000 / 5,780,000 = **61.06%** | 61% | Consistent |
| "Growth (Avg) 43.4%" | mean(52, 1, 8, 38, 87, 74) = **43.33%** | 43.4% | Consistent (simple average of per-property cumulative growth — note: unweighted by value or hold period) |

**Verdict: their arithmetic is internally consistent to the dollar.** Values compound annually at the per-property manual rate for (consolidationYear − purchaseYear) full years, per-property cashflows sum exactly to the portfolio figure, and the 80% equity convention is applied precisely. The one thing that does **not** reconcile from screen data alone is the passive-income figures ($69,486 on $5.16M = 1.35% vs $67,925 on $4.59M = 1.48% — neither a flat yield on end value nor a common starting rent grown at 3%; the underlying rent inputs are not visible). Also unexplained: the SMSF strategy shows "Goal Achieved" at a $10,000 goal with $137,411 income — the goal-achieved logic vs the user-set consolidation-year dropdown isn't observable.

### 3b. Same inputs through PropPath's Medium tier — divergence from assumptions alone

Same $800k start, same horizons, PropPath **Medium** curve (6% yr1, 5.5% yrs2–3, 5% yr4, 5% yr5+; effective CAGR ≈ 5.06%):

| Horizon | Their Manual 6% | Their matrix baseline 7% | PropPath Medium | Their 6% vs our Medium | Their 7% vs our Medium |
|---|---|---|---|---|---|
| 10 years | $1,432,678 | $1,573,721 | $1,328,085 | **+7.9%** | **+18.5%** |
| 30 years (IP 4 case) | $4,594,793 | $6,089,804 | $3,523,805 | **+30.4%** | +72.8% |
| 32 years (IP 3 case) | $5,162,709 | $6,972,217 | $3,884,995 | **+32.9%** | +79.5% |

And the promotional tiers on a $800k purchase:

| Horizon | Their **Hot** tier (20/20/20/20/15→7) | PropPath **High** tier (12.5/10/10/7.5→6) | Ratio |
|---|---|---|---|
| 10 years | $2,675,665 | $1,660,625 | **1.61×** |
| 32 years | $11,854,270 | $5,984,124 | **1.98×** |

**Takeaway:** on identical properties over a consolidation-length horizon, their tool will show end values **~30% higher than PropPath at like-for-like "default" settings, and ~2× higher if a property is tagged Hot** — none of it from math errors (their compounding is exact), all of it from assumption choice. In a side-by-side sales situation PropPath will look pessimistic unless the growth-assumption difference is named explicitly.

---

## 4. Feature-gap matrix

**Caveat: absence-in-screenshots ≠ absence-in-product.** The demo never opened their "Projection" toggle (year-by-year projection view), any assumptions beyond tax/strategy/growth, or any purchase-cost screens. Conversely, PropPath capabilities are assessed from the codebase, not their view of us.

### They have it — PropPath lacks it (or lacks the surfacing)

| Feature | Their implementation | PropPath status |
|---|---|---|
| Per-property Hold ⇄ Sell toggles | One-click toggle column; sell-set drives consolidation | Engine has `sell_property` events (`src/constants/eventTypes.ts:147`) but no strategy-table toggle UI; sell-downs are event-by-event, not a "flip these and re-run" workflow |
| Consolidation end-state framing | Cards + per-property table: loans before/after sales, cash after CGT, **unencumbered value**, passive income | We compute the pieces (CGT via `cgtCalculator.ts`, consolidation-year rate) but have no "debt-free end state" summary view |
| Goal-achieved-in-N-years badge | "Goal Achieved — 13 years" against passive-income goal | `targetPassiveIncome` exists; no years-to-goal badge framing |
| Ownership-structure tax UI incl. SMSF | Owner Type column per property; assumptions bar switches (47%→10%, 50%→33.33%) with structure | Engine is entity-aware (`entity` on property instances, `ENTITY_SERVICEABILITY_FACTORS`, entity-specific CGT) — arguably deeper than theirs (SMSF debt excluded from personal serviceability) — but not surfaced as a prominent per-property column + switching assumption display |
| Interest-rate stress slider | Live Risk Assessment page: slider → Current/Predicted/Difference per property | `interest_rate_change` events exist in the engine; no interactive slider/stress page |
| Named strategy compare | Save As / Delete / **Compare** buttons | MultiScenario support exists; NL what-if Compare is prototype-stage (`/dev/compare`), not a shipped one-click compare |
| Audit log | Track Changes: who/what/when, ~30 fields per property, drill-down | Change-log bell logs AI decisions; no per-field property audit trail with editor identity |
| Editable growth matrix | Every year × tier cell editable, 31-year horizon | Fixed 4-segment tier curves; profile `growthCurve` editable but not year-by-year |
| Tax waterfall dashboard | Rent → expenses → pre-tax → after-depreciation → after-tax → loss carried forward, portfolio + per property | Cashflow modelled but depreciation / loss-carry-forward not first-class display lines |
| Yield triptych | Gross-on-purchase, gross-on-loan, net-on-loan per property | Fewer yield variants surfaced |

### PropPath has it — they appear to lack it (from these screenshots)

| Feature | PropPath | Their tool (as observed) |
|---|---|---|
| **Purchase-timing / affordability engine** | Deposit tests, borrowing capacity, serviceability (incl. APRA buffer), equity-release mechanics decide *when* a purchase is possible | "New IP 1, $750,000, 2026" — user hand-picks year and price; nothing visible gates whether the client can actually fund it. This is the core differentiator. |
| **Upfront cash modelling** | Stamp duty by state, LMI, engagement/conveyancing/inspection fees, deposit pool, savings deployment | No purchase costs visible anywhere in 28 screenshots |
| **Per-line cashflow itemisation** | Mortgage/mgmt/insurance/council/strata/maintenance/land-tax per property per year (validated to-the-dollar vs Gameplans) | Only aggregate annual cashflow per property shown |
| **Brief-to-plan AI** | NL brief → generated plan, auto-fix guardrails, AI chat edits | Fully manual data entry (~30 fields/property per their own audit log) |
| **Semi-annual engine resolution** | H1/H2 periods | Annual only (as far as visible) |
| **CGT-reform scenario (2027)** | `calculateCgtComparison` current-law vs proposed reform | Not visible |
| **White-label + client-view links, Stripe SaaS** | Multi-tenant, share links | White-labeled too (Search Party branding) — parity, not a gap |

---

## 5. What we can't compare — and what to ask Julian for

Cannot be compared from the available screenshots:

1. **Year-by-year projections** — their "Projection" toggle was never opened; we only ever see end-state cards. No portfolio-value-over-time or cashflow-over-time series to benchmark against our chart engine.
2. **The whole cashflow input stack** — interest rate level, loan terms (IO/P&I), vacancy, property management %, insurance, rates, maintenance, land tax, depreciation schedule inputs. Their dashboard *outputs* (−$91,671 portfolio cashflow, per-property figures) are visible but unreconstructible without the inputs.
3. **Purchase-side mechanics** — stamp duty, LMI, deposits, funding source for "New IP" rows.
4. **Passive-income derivation** — end-state income figures don't reconcile from visible data (see §3a).
5. **Goal-achieved logic** — how the consolidation-year dropdown interacts with the badge (the SMSF case shows "achieved" at 13.7× the goal).

**Ask Julian for (in priority order):**
1. A screenshot of the **Projection view** for any strategy (the un-clicked toggle) — one image would enable a real year-by-year benchmark.
2. The **full Assumptions page(s)** beyond Tax/Strategy/Growth — anything showing interest rate, loan terms, vacancy, management fees, purchase costs.
3. One property's **edit form** (the ~30 tracked fields) — reveals their full input model.
4. The **Compare view** with two strategies loaded.
5. If possible, the exact rent inputs for the two SMSF placeholder properties — lets us reverse their passive-income formula.

---

## 6. Summary for Rob — per-assumption before/after + takeaways

"Before" = PropPath default today; "after" = what this comparison suggests considering (not a commitment — several are deliberate positions worth keeping).

| Assumption | PropPath today | Their value | Suggested position after this comparison |
|---|---|---|---|
| New-purchase growth (default tier) | Medium ≈5.06% effective | flat 7% baseline (matrix); 6–7% manual in practice; Hot 20% front-load available | **Keep Medium** (it's the defensible one) but expect to *look* 30% lighter on long horizons — arm BAs with a one-liner explaining why. Consider exposing an editable year-by-year curve to match their flexibility. |
| Rent growth | 5% | 3% | **Review ours.** 5% for 20+ years is our least defensible default (theirs and CPI-logic say 3–4%). |
| Inflation | 3% | 3% | Keep. |
| Selling costs | 3% | 2% | Keep 3% (more realistic all-in); note theirs flatters consolidation proceeds. |
| Marginal tax rate | 45% | 47% incl. Medicare | **Consider 47%** for top-bracket defaults — it's the ATO-standard top rate incl. Medicare levy (background knowledge) and improves our NG/CGT accuracy story. |
| Marginal rate at consolidation | 39% | 47% | Keep 39% (retirement-phase logic) but document the rationale — theirs is more conservative and a reviewer may ask. |
| Company tax | 25% | 25% | Both questionable for passive-income companies (30% + no CGT discount is the strict reading — background knowledge). Low priority. |
| Trust tax | 30% | 47% | Keep 30% only with an explicit "assumes distribution to corporate/mid-bracket beneficiaries" tooltip; theirs is the no-planning conservative case. |
| SMSF tax / CGT | 15%; effective CGT 10% | 15%; effective CGT 10% | Identical math. Differentiate by adding **pension-phase 0%** modelling — neither tool does it and it's the true retirement end-state. |
| Equity-access LVR | 80% | 80% | Parity. |

**Competitive takeaways:**

1. **Their engine is accurate; their assumptions are generous.** Every displayed number we could hand-check reconciles to the dollar — this is a competently built tool, and the gap between us is 100% assumption choice (flat 7% + Hot 20% vs our calibrated ~5%). The battle is narrative ("realistic vs promotional growth"), not accuracy.
2. **Our moat is the purchase side.** They have no visible affordability engine, purchase costs, or funding logic — future purchases are hand-typed year+price rows. PropPath's deposit/serviceability/equity-release machinery answers a question their tool doesn't even ask. Lead with that in any head-to-head.
3. **Their moat is the exit side.** Hold/Sell toggles, consolidation end-state cards, "Goal Achieved in N years", unencumbered-value framing, and structure-switched tax are a complete, demo-friendly sell-down story. PropPath's engine already has most of the ingredients (sell events, entity CGT, consolidation-year rate) — this is largely a **surfacing gap, not an engine gap**, and plausibly a fast follow.
4. **Three cheap, high-optics features they have:** interest-rate stress slider (our `interest_rate_change` event with a slider UI), per-property audit trail (their agents clearly value it — Julian's email is all over it), and the after-depreciation/after-tax/loss-carry-forward cashflow waterfall (tax literacy as a display choice).
5. **Get the Projection screenshot before any accuracy claims.** Until we see their year-by-year view and rate/fee inputs, we can honestly say "their growth assumptions run ~30% hotter than ours over 30 years" and nothing stronger about cashflow.
