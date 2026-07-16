# Anu "Fresh Start — Property Roadmap" × PropPath Engine Comparison (Task 6)

**Date:** 16 Jul 2026
**Source:** `accuracy-testing/external-sources/anu-transcription.md` (screenshots of Anu Varughese's Google Sheets workbook; raw images at `/Users/robknowles/Projects/Company Calculators/Anu/`)
**Harness:** `accuracy-testing/run-anu-comparison.ts` (`npx vite-node accuracy-testing/run-anu-comparison.ts`)
**Fixture:** `accuracy-testing/fixtures/anu-roadmap.json`
**Engine:** real `src/engine/scenarioRunner` (timelineEngine + projectionEngine) — math untouched, measurement only.

This is the only PORTFOLIO-LEVEL external source in the program: 4 properties purchased in staggered years (VIC/NSW/TAS/NSW, $550k–$600k, her Years 1–4), projected Year 0–18 on her Summary tab. It validates **multi-property compounding** — staggered growth curves, per-property rent/opex escalation clocks, and equity accumulation against a flat IO debt stack — so the multi-year curve comparison is weighted over any single line.

---

## 1. Her model, reverse-engineered (derived, not transcribed)

No growth-rate, escalation, or compounding cell is visible in any screenshot. The rules below were **inferred by fitting her displayed numbers**, then validated by hand-computing her whole sheet outside the engine: the replica reproduces **all 6 Summary rows × 19 years to within $0.50** (harness section 1).

| Rule | Value | How it was fitted |
|---|---|---|
| Capital growth | **10% in ownership years 1–2, 7% from year 3 on** (annual compounding, per property, starting the year after purchase) | Y6→Y18 portfolio ratios are exactly 1.0700; back-solving Year 3 ($2,637,585) per property gives year-3 rate 7.000%; forward-check reproduces every value cell |
| Rent escalation | **5%/yr** per property from its 2nd ownership year | Y1 rent 53,300 = 26,000×1.05 + 26,000; exact all years |
| Management fee | **7% of escalated gross rent** | Purchases sheet states 7.0%; portfolio opex closes only if it rides the 5% rent clock |
| Insurance + rates + "Other Expenses" | flat block **inflating 3.0%/yr** per property | Y1 opex 15,282 closes at exactly 3.0%; exact all 19 years |
| Interest | **loan × 6.1831%, IO forever** | 27,206/440,000 = 29,679/480,000 = 6.18313% = **6.00% nominal compounded DAILY** ((1+0.06/365)³⁶⁵−1). Flat $113,770 from Year 3 → loans never amortise |
| Vacancy | **none** | No vacancy row anywhere; gross rent flows straight to cashflow |
| Tax / land tax / CGT / equity recycling | **none modelled** | Nothing on the Summary; Equity = Value − constant $1,840,000 debt |

## 2. Engine mapping

- **Placement:** manual, P1→2026 (= her Year 0 = our BASE_YEAR period 1), P2→2027, P3→2028, P4→2029. All four placed `feasible` at the correct year/price/loan. The 2026+ start also makes every buy a post-NG-reform established purchase → engine NG benefit is $0 and its cashflow line is pre-tax like hers (verified: `cashflow = rent − opex − interest` closed on all 38 variant-A/B rows).
- **Growth:** our tier structure is `year1 / years2to3 / year4 / year5plus` — ownership years 2 and 3 share one rate, so her 10/10/7/7… is **not exactly expressible**. Best-fit custom curve (what a BA can set on the Assumptions page): `10 / 8.48963 (=√(1.10×1.07)−1) / 7 / 7` — cumulative value exact at every integer ownership year except year 2.
- **Everything else set explicitly:** LVR 80, IO, `ioTermYears` 30, `interestRate` 6.00 (variant A) / 6.18313 (variant B), `engagementFee` 19,500, `conveyancing` 2,500, all other one-off costs 0, `stampDutyOverride` = her figures (our calculator compared separately), mgmt 7%, insurance 1,250, council/rates 1,500, strata 0, **maintenance = her "Other Expenses" (2,940 / 2,979)** — the only flat opex slot left; her breakdown was never shown, values used verbatim. `vacancyRate` 0 on profile AND instances (matching her missing vacancy row — that's **her modelling gap**, ours is a deliberate dial-down), rent escalation 0.05, inflation 0.03, land tax override 0, `isNewBuild` false, generous funding so gating can't contaminate the projection.

## 3. Year-by-year reconciliation (her Year 0 = 2026)

Variant A = 6.00% simple interest (our convention on her stated rate). Variant B = 6.18313% (her implied daily-compounding convention). Value/equity/rent/opex are identical between A and B.

| Yr | Value: Anu | Value: ours | Δ | Rent Δ | Opex Δ | Interest: Anu | A Δ | Net CF: Anu | A: ours | A Δ | B Δ (all rows) |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | 550,000 | 550,000 | 0 | 0 | 0 | 27,206 | −806 | −8,716 | −7,910 | +806 | 0 |
| 1 | 1,155,000 | 1,155,000 | 0 | 0 | 0 | 54,412 | −1,612 | −16,393 | −14,782 | +1,611 | 0 |
| 2 | 1,870,500 | 1,861,362 | −9,138 | 0 | 0 | 84,091 | −2,491 | −23,071 | −20,581 | +2,490 | 0 |
| 3 | 2,637,585 | 2,628,447 | −9,138 | 0 | 0 | 113,770 | −3,370 | −28,478 | −25,108 | +3,370 | 0 |
| 4 | 2,860,016 | 2,850,048 | −9,968 | 0 | 0 | 113,770 | −3,370 | −23,736 | −20,366 | +3,370 | 0 |
| 5 | 3,080,017 | 3,070,049 | −9,968 | 0 | 0 | 113,770 | −3,370 | −18,742 | −15,372 | +3,370 | 0 |
| 6 | 3,295,618 | 3,295,618 | **0** | 0 | 0 | 113,770 | −3,370 | −13,484 | −10,114 | +3,370 | 0 |
| 7 | 3,526,312 | 3,526,312 | 0 | 0 | 0 | 113,770 | −3,370 | −7,947 | −4,578 | +3,369 | 0 |
| 8 | 3,773,153 | 3,773,153 | 0 | 0 | 0 | 113,770 | −3,370 | −2,119 | **+1,251** | +3,370 | 0 |
| 9 | 4,037,274 | 4,037,274 | 0 | 0 | 0 | 113,770 | −3,370 | **+4,018** | +7,387 | +3,369 | 0 |
| 10 | 4,319,883 | 4,319,883 | 0 | 0 | 0 | 113,770 | −3,370 | 10,477 | 13,847 | +3,370 | 0 |
| 12 | 4,945,834 | 4,945,834 | 0 | 0 | 0 | 113,770 | −3,370 | 24,435 | 27,804 | +3,369 | 0 |
| 15 | 6,058,860 | 6,058,860 | 0 | 0 | 0 | 113,770 | −3,370 | 48,241 | 51,611 | +3,370 | 0 |
| 18 | 7,422,364 | 7,422,364 | 0 | 0 | 0 | 113,770 | −3,370 | 75,988 | 79,358 | +3,370 | 0 |

(Full 19-year print in the harness output. Equity Δ = Value Δ exactly, both sides model flat $1.84m IO debt.)

**Summary of divergences:**

| Line | Max |Δ| | Where | Root cause |
|---|---|---|---|
| Portfolio Value / Equity | $9,968 (0.35% of value / 1.79% of equity) | her Years 2–5 only; **$0 from Year 6 to Year 18** | Tier granularity: our curve shape can't hold 10% for exactly 2 years then drop to 7 — geometric-mean fit dips each property's year-2 snapshot by 1.37%, then compounds back exact |
| Gross Rental Income | **$0** | — | Identical 5%-per-ownership-year escalation semantics, mgmt on gross |
| Operating Costs | **$0** | — | Identical: mgmt rides rent clock, flat block rides 3% inflation clock, both per-ownership-year |
| Interest Costs | $3,370/yr (−2.96%) | every year (variant A) | **Convention**: she charges the daily-compounded effective rate (6.1831%) of "6.00%"; we charge simple annual 6.00%. Variant B (rate 6.18313) → $0 on every row |
| Net Cashflow | $3,370/yr | = the interest gap exactly | Nothing else differs |

## 4. Cashflow-positive crossover

| Model | Crossover |
|---|---|
| Anu's sheet | **Year 9** ($4,018) |
| Engine A (6.00% simple) | **Year 8** ($1,251) — one year earlier, purely from the $3,370/yr interest-convention gap straddling her Year-8 figure of −$2,119 |
| Engine B (her effective rate) | **Year 9** ($4,018) — exact |

## 5. Root causes & attribution (ours-bug vs her-quirk)

1. **Interest convention — her quirk, not our bug.** Her "6.00%" is charged as the daily-compounding effective annual rate (6.18313%). Our `loan × rate` simple-interest convention is the industry-normal presentation for IO holding-cost estimates. Anyone keying "6.00%" into both tools gets our number; keying her *effective* rate reproduces her sheet to the dollar. It does move the crossover year (8 vs 9) because her Year-8 cashflow sits at −$2,119, inside the $3,370 gap.
2. **Growth-tier granularity — our structural limitation (documented, not fixed).** `GROWTH_RATE_TIERS` / custom curves share one rate across ownership years 2–3, so a 10/10/7… profile is inexpressible; best-fit leaves a transient −1.37% per-property dip in its second year (portfolio max −$9,968, gone by her Year 6). Immaterial for advice, but it is the one curve shape gap this source exposes. The nearest **built-in** tier (High: 12.5/10/7.5/6) is much worse: +4.5% at Year 5, **−6.1% (−$452,597) by Year 18**, because no built-in tier holds ≥7% long-run — matching a 7%-flat operator requires custom assumptions.
3. **IO-forever — agreement by construction, flag for other sources.** Her loans never amortise. Our portfolio-level debt/interest lines hold planned loans at the original balance regardless of `ioTermYears` (the IO→PI rollover exists only in per-property views via `calculateRemainingLoanBalance`), so we match her IO-forever debt stack natively. Note for future comparisons: against a source that *does* roll IO→P&I, this same portfolio-level simplification would diverge the other way.
4. **Vacancy — her modelling gap.** Her sheet has no vacancy row. We set our dial to 0 to isolate other effects; our default (4%) affects serviceability/funding, not the client-facing cashflow line (gross-rent basis), so even at defaults the displayed cashflow comparison would be unchanged.
5. **NG/tax — aligned by scenario dating.** Her sheet is pre-tax. All four purchases being 2026+ established makes our NG benefit $0, so both cashflow lines are pre-tax (verified by identity check on all rows).
6. **NSW stamp duty — constant +$795 on her side, likely vintage.** Her NSW figures exceed our 2025-26-verified calculator by exactly $795 at both $550k and $600k (same marginal bracket ⇒ constant offset), consistent with an earlier-FY NSW schedule (NSW CPI-indexes thresholds annually; VIC and TAS, which don't reindex the relevant bands, match to the dollar). *Inference — her formula was not shown.*

**Attributable to un-transcribed unknowns (honest list):**
- The **"Other Expenses" line ($2,940/$2,979)** — the annual totals are transcribed and were mapped verbatim into our maintenance slot, but their derivation (and whether they'd scale differently under other price points) is unknown. Any scenario-generalisation beyond these 4 properties can't be validated.
- The **Cashflow/Commercial tab** was never shown — nothing from it is compared.
- **No explicit growth cell** — the 10/10/7 curve is a fit (exact to <$1 over 114 cells, so effectively certain for *this* sheet, but not a stated assumption of hers).
- Columns beyond Year 18, and the constant-$795 NSW duty offset's true cause.

## 6. Per-cell before/after (for Rob)

"Anu cell" = her sheet's figure; "PropPath" = our engine/calculator with the same inputs keyed in.

| Cell | Anu | PropPath | Verdict |
|---|---:|---:|---|
| Stamp duty VIC $550k | 28,070 | 28,070 | ✓ exact |
| Stamp duty NSW $550k | 19,957 | 19,162 | −795 — hers likely prior-FY NSW schedule (ours verified 2025-26) |
| Stamp duty TAS $600k | 22,498 | 22,498 | ✓ exact |
| Stamp duty NSW $600k | 22,207 | 21,412 | −795 — same constant offset |
| Deposit @ 20% ($550k / $600k) | 110,000 / 120,000 | 110,000 / 120,000 | ✓ exact |
| Loan @ 80% ($550k / $600k) | 440,000 / 480,000 | 440,000 / 480,000 | ✓ exact |
| LMI at 80% LVR | – (nil) | 0 | ✓ exact |
| BA fee / legals | 19,500 / 2,500 | 19,500 / 2,500 | ✓ (direct inputs) |
| Interest yr-1, $440k @ "6.00%" | 27,206 | 26,400 | −806 — she compounds daily (eff. 6.1831%); keying 6.18313 → 27,206 ✓ |
| Interest yr-1, $480k @ "6.00%" | 29,679 | 28,800 | −879 — same convention; 6.18313 → 29,679 ✓ |
| Per-property net CF yr-1 ($550k) | (8,716) | −7,910 | +806 = interest convention only; variant B −8,716 ✓ |
| Per-property net CF yr-1 ($600k) | (8,810) | −7,931 | +879 = interest convention only; variant B −8,810 ✓ |
| Portfolio Value Y0–Y18 | (19 cells) | match | ✓ exact except Y2–Y5 (max −$9,968, −0.35%): tier-shape transient; $0 from Y6 |
| Equity Y0–Y18 | (19 cells) | match | ✓ same as Value (both hold debt flat at $1.84m) |
| Gross Rental Income Y0–Y18 | (19 cells) | match | ✓ exact, all 19 years |
| Operating Costs Y0–Y18 | (19 cells) | match | ✓ exact, all 19 years |
| Interest Costs Y0–Y18 | 113,770 plateau | 110,400 | −2.96% every year (convention); variant B exact all years |
| Cashflow (Annual) Y0–Y18 | (19 cells) | match ± interest gap | variant B exact all 19 years; variant A +$3,370/yr |
| Crossover year | Year 9 | Year 8 (A) / Year 9 (B) | driven solely by the interest convention |

## 7. Multi-property compounding verdict

**PASS — the engine's multi-property compounding is structurally sound and, on like-for-like conventions, exact.** With her (derived) assumptions keyed in, the engine reproduces a 4-property staggered portfolio over 19 years with: gross rent exact to the dollar in all years, operating costs exact to the dollar in all years, portfolio value and equity exact from her Year 6 through Year 18 (transient ≤0.35% dip in Years 2–5 from growth-tier shape granularity), and net cashflow exact in every year once the interest-rate *convention* (simple vs daily-compounded effective) is matched. Per-property escalation clocks (growth, rent, opex) each run off ownership year, exactly as her sheet does — the compounding across staggered purchases is not merely close, it is the same arithmetic.

**Gap list (document-only, per task rules):**
1. Growth curve shape: ownership years 2–3 share one rate; profiles like 10/10/7 need a per-year curve to be exact (transient year-2 error otherwise). No built-in tier sustains ≥7% year-5+, so long-run-bullish operators (Anu holds 7% to Year 18) need custom assumptions — built-in High is −6.1% on portfolio value by Year 18.
2. Interest compounding convention is simple annual; sources quoting effective/daily-compounded rates will show ~3% higher interest at the same nominal rate. Worth a UI note ("nominal p.a., simple") rather than an engine change.
3. Portfolio-level lines are IO-forever for planned properties irrespective of `ioTermYears` (matches Anu; will diverge vs amortising sources — already the per-property views amortise correctly).
4. CLAUDE.md states `BASE_YEAR = 2025`; the constant is now **2026** (harness prints it) — stale doc, noted in passing.
