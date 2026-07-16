# Ella's Cashflow Calculator × PropPath Engine — Accuracy Comparison (Task 4)

**Property:** 11 Emma Ct Driver (Darwin, NT) — $650k house, 20% deposit, $650/wk rent
**Her sheet:** Excel "Cashflow Calculator", one tab per property (transcription: `accuracy-testing/external-sources/ella-transcription.md`; inputs frozen in `accuracy-testing/fixtures/ella-spreadsheet.json`)
**Our side:** the REAL engine — `src/engine/scenarioRunner` (timelineEngine + projectionEngine) plus `detailedCashflowCalculator` / `stampDutyCalculator` / `lmiCalculator` / `landTaxCalculator` / `oneOffCostsCalculator`, run headlessly by `accuracy-testing/run-ella-spreadsheet-comparison.ts` (`npx vite-node`, never tsx).
**Method notes:** every input set explicitly on the instance/profile (no defaults in play); manual placement in 2027 H1 so the established-property NG ring-fence zeroes the tax benefit and the engine's cashflow line is **pre-tax**, matching her sheet's only basis (asserted in the run: `ngBenefit $0` on every leg). Every printed engine figure was reconciled against `projection.cashflowData` and `tp.totalCashRequired` — **all cross-checks pass**.

---

## Headline

**Once her sheet's own two quirks are normalised, PropPath reproduces her cashflow to the dollar on both IO legs and to within $26 (0.2%) on P&I.** The three real divergences are all explainable:

1. **Her management-fee inconsistency** (her sheet, not ours): the fee appears as **$2,974** (= true 8.8% × $33,800) in her mid block but **$1,859** (= exactly **5.5%** × $33,800) inside her Annual Total. Her bottom-line cashflows are built on the $1,859. We ran every leg both ways and never picked silently.
2. **Stamp duty −$3,663** (10.2%): ours $32,175 is the statutory NT rate (4.95% flat in the $525k–$3m band). Her $35,838 = **exactly 5.5% × $650,000 + $88** — it looks like a flat-rate rule-of-thumb (or a non-NT/generic calculator), not the NT schedule. Ours matches the law; hers is conservative by $3.7k.
3. **Per-week display convention**: her "per week" = **annual ÷ 48** (monthly ÷ 4 — verified exactly: −7,837/48 = −163.27, −13,166/48 = −274.29). Ours divides by 52. A 7.7% apparent gap that is purely presentational.

---

## Per-line comparison — annual cashflow

Purchase price $650,000 · loan $520,000 (80% LVR) · rent $33,800/yr. "Ours (as-printed)" = mgmt forced to her $1,859; "Ours (true 8.8%)" = mgmt at the labelled 8.8%.

| Line | Ella | Ours (as-printed) | Δ | Ours (true 8.8%) | Δ | Root cause |
|---|---:|---:|---:|---:|---:|---|
| Gross annual rent | $33,800 | $33,800 | $0 | $33,800 | $0 | — |
| Vacancy deduction | none | none | $0 | none | $0 | Both sides quote gross rent (our client-facing line is deliberately gross; vacancy only shades serviceability) |
| IO repayments @6.29% (annual) | $32,708 | $32,708 | $0 | $32,708 | $0 | Same formula: loan × rate |
| IO repayments @6.29% (monthly) | $2,725.67 | $2,725.67 | $0.00 | $2,725.67 | $0.00 | — |
| IO repayments @6.39% (annual) | $33,228 | $33,228 | $0 | $33,228 | $0 | — |
| IO repayments @6.39% (monthly) | $2,769.00 | $2,769.00 | $0.00 | $2,769.00 | $0.00 | — |
| P&I repayments @6.29% (annual) | $38,557 | $38,583 | +$26 | $38,583 | +$26 | **Formula difference (trivial):** she PMTs weekly (r 0.12%, n 1560) × 52; we PMT monthly × 12 |
| Management fee | $1,859 *and* $2,974 | $1,859.00 | $0 | $2,974.40 | +$0.40 | **Her sheet's quirk:** $1,859 = exactly 5.5% of rent despite the "@8.8%" label. The $0.40 is her rounding of 8.8% × 33,800 = 2,974.40 |
| Council / water rates | $3,500 | $3,500 | $0 | $3,500 | $0 | Direct field (`councilRatesWater`) |
| Insurance | $1,000 | $1,000 | $0 | $1,000 | $0 | Direct field (`buildingInsuranceAnnual`) |
| Advertising / letting | $750 | $750 | $0 | $750 | $0 | **Missing line item** — no field exists; carried via `maintenanceAllowanceAnnual` (see gap list) |
| Land tax | $1,300 | $1,300 | $0 | $1,300 | $0 | Via `landTaxOverride`. NB: NT levies **no** land tax — our auto-calc correctly returns $0; her $1,300 is her sheet's own line |
| Strata | — | $0 | $0 | $0 | $0 | House |
| **Total expenses @6.29 (incl. repayments)** | **$41,117** | **$41,117** | **$0** | $42,232 | +$1,115 | mgmt-fee quirk only |
| **Total expenses @6.39** | **$41,637** | **$41,637** | **$0** | $42,752 | +$1,115 | mgmt-fee quirk only |
| **NET CASHFLOW — IO @6.29** | **($7,317)** | **($7,317)** | **$0** | ($8,432) | −$1,115 | mgmt-fee quirk only |
| **NET CASHFLOW — IO @6.39** | **($7,837)** | **($7,837)** | **$0** | ($8,952) | −$1,115 | mgmt-fee quirk only |
| **NET CASHFLOW — P&I @6.29** | **($13,166)** | **($13,192)** | **−$26** | ($14,308) | −$1,142 | $26 weekly-vs-monthly PMT + mgmt quirk |
| Yield on purchase price | 5.20% | 5.20% | 0.00 | | | — |
| Yield on total acquisition | 4.90% | 4.93% | +0.03 | | | Flows from the stamp-duty gap ($685,525 vs $689,188 acquisition base) — not a displayed PropPath metric |
| Yield on loan | 6.5% | 6.50% | 0.00 | | | Not a displayed PropPath metric |

**Verdict on cashflow:** the operating-cost engine, IO interest math and gross-rent basis are line-for-line identical to a working BA's real spreadsheet. Nothing here is our bug.

## Out-of-pocket per week / per month

| Basis | Ella | Ours | Δ | Cause |
|---|---:|---:|---:|---|
| IO @6.39 — per month | ($653.08) | ($653.08) | $0.00 | annual ÷ 12 both sides (as-printed mgmt) |
| IO @6.39 — per week | ($163.27) | ($150.71) | +$12.56 | **Divisor convention:** hers = annual ÷ 48 (monthly ÷ 4), ours = annual ÷ 52 |
| P&I — per month | ($1,097.17) | ($1,099.35) | −$2.18 | the $26 PMT difference ÷ 12 |
| P&I — per week | ($274.29) | ($253.70) | +$20.59 | ÷48 vs ÷52 again (plus the $26) |

**Display gap:** her client conversation is anchored on "$X out of pocket per week". PropPath's dashboard surfaces annual/monthly; the weekly figure exists in the engine (`netWeeklyCashflow`, annual ÷ 52) but isn't the headline anywhere. If we ever show weekly, ours will read ~8% *kinder* than sheets like hers purely because of the ÷52 vs ÷48 convention — worth a deliberate choice, not an accident.

## Initial outlay / upfront cash

| Line | Ella | Ours | Δ $ | Δ % | Root cause |
|---|---:|---:|---:|---:|---|
| Purchase price | $650,000 | $650,000 | $0 | — | — |
| Deposit (20%) | $130,000 | $130,000 | $0 | — | — |
| Stamp duty + transfer | $35,838 | $32,175 | **−$3,663** | −10.2% | **Formula difference — hers.** Ours = NT statute (4.95% flat for $525k–$3m). Hers = exactly 5.5% × price + $88; candidates: flat-rate rule of thumb, a generic/old calculator, or a VIC-rate habit (VIC duty $34,070 + transfer fees ≈ $35.7k is close but not exact). Ours is right for NT |
| Conveyancer / legals | $1,500 | $1,500 | $0 | — | Direct field (`conveyancing`) |
| Building & pest | $1,850 | $1,850 | $0 | — | Direct field (`buildingPestInspection`) |
| Buyer's agent fee | blank (already paid) | $0 | $0 | — | `engagementFee` zeroed |
| LMI | n/a | $0 | $0 | — | 80% LVR → nil both sides |
| **Total funds required** | **$169,188** | **$165,525** | **−$3,663** | −2.2% | Entirely the stamp-duty line |
| **Total acquisition cost** | **$689,188** | **$685,525** | −$3,663 | −0.5% | Same |

This is the "$169k in their settlement account" number from the 2 Jul call. We land $3,663 under her, and our number is the statutorily correct one — but a BA who trusts her sheet will think PropPath understates the cash a client needs. Needs a UI story ("NT duty is 4.95%; your sheet's 5.5% is conservative"), not a math change.

### NT stamp duty audit (found in passing — OUR bug, does not affect this property)

`calculateStampDutyNT` in `src/utils/stampDutyCalculator.ts` is wrong for prices **≤ $525,000**: it computes `V² × 0.06571441² × 15` instead of the official NT TRO formula **D = 0.06571441·V² + 15V** (V = value in $000s). Measured: $300k → ours $5,830 vs official $10,414; $500k → $16,194 vs $23,929 (−$7,735); and an $8,134 discontinuity at the boundary ($525,000 → $17,854; $525,001 → $25,988, where the official schedule is continuous at ≈$25,988). The ≥$525k branches (4.95%/5.75%/5.95%) are correct — which is why this $650k comparison is unaffected. **Documented only, not fixed** (per task rules); flagged as a spawn-task chip for a separate session.

`calculateLandTax('NT', …) = $0` is **correct** — NT has no land tax. Her $1,300 line is her sheet's own inclusion (possibly a different levy or a habit line); representable in PropPath via `landTaxOverride`.

## Gap list — her lines PropPath cannot natively represent

| Her line / behaviour | Can we carry it? | Honest assessment |
|---|---|---|
| Advertising / letting ($750/yr) | **Workaround only** — no dedicated field. We carried it in `maintenanceAllowanceAnnual` ($750), which is a flat annual $ so year-1 math is identical | Mislabelled in every itemised view ("Repairs & maintenance"), and if the BA *also* wants a maintenance allowance the two collide in one field. Real gap |
| Dual-rate side-by-side (P&I 6.29% vs IO 6.39% on one page) | **No** — an instance has one `loanProduct` + one `interestRate`. Reproducing her sheet took two scenario runs | Her sheet's core selling view. Compare tool territory |
| "Stamp Duty + **Transfer**" (duty + registration fees as one line) | Partially — `mortgageFees` could carry a transfer/registration fee, mislabelled | No named transfer-fee line item |
| $/week out-of-pocket headline | Engine computes `netWeeklyCashflow` (÷52) but UI headlines annual/monthly; her convention is ÷48 | Display gap, see above |
| Yield on loan / yield on total acquisition | Computable, not displayed | Minor |
| NT land tax line ($1,300) | Yes — `landTaxOverride` (auto-calc is $0, correctly) | Her quirk, our override handles it |
| Management fee ex-GST vs inc-GST (her $1,859 vs $2,974 = 5.5% vs 8.8% — note 8.8% = 8% + GST while 5.5% = 5% + GST, so this may be a rate she renegotiated without updating the label) | We take one `propertyManagementPercent` | Ambiguity is hers to resolve — ask Ella which the client actually pays |

## Per-cell before/after for Rob

"Before" = untouched PropPath house-cell defaults; "After" = the instance configured to her sheet (what the runner sets). This doubles as the recipe for reproducing her tab inside the app.

| Her cell | Her value | PropPath field | Before (default) | After (set to) | PropPath then shows | Match |
|---|---:|---|---:|---:|---:|:--:|
| State | NT (Darwin) | `state` | QLD | NT | NT duty $32,175 | ⚠ −$3,663 vs her $35,838 |
| Purchase price | $650,000 | `purchasePrice` | $750,000 | $650,000 | $650,000 | ✓ |
| Deposit 20% | $130,000 | `lvr` | 80 | 80 | $130,000 deposit | ✓ |
| Loan amount | $520,000 | (derived) | — | — | $520,000 | ✓ |
| Rate — IO | 6.39% | `interestRate` + `loanProduct: IO` | 5.5% | 6.39 | $33,228/yr, $2,769.00/mo | ✓ exact |
| Rate — P&I | 6.29% | `interestRate` + `loanProduct: PI` | 5.5% | 6.29 | $38,583/yr | ✓ within $26 (PMT cadence) |
| Rent | $650/wk | `rentPerWeek` | $720 | $650 | $33,800/yr | ✓ |
| Management fee | $2,974 *or* $1,859 | `propertyManagementPercent` | 8.0 | 8.8 → $2,974.40 · 5.5 → $1,859.00 | either | ✓ once she picks one |
| Council/water | $3,500 | `councilRatesWater` | $2,000 | $3,500 | $3,500 | ✓ |
| Insurance | $1,000 | `buildingInsuranceAnnual` | $1,500 | $1,000 | $1,000 | ✓ |
| Advertising/letting | $750 | *(none — used `maintenanceAllowanceAnnual`)* | $600 | $750 | $750, labelled "maintenance" | ⚠ wrong label |
| Land tax | $1,300 | `landTaxOverride` | null (NT auto = $0) | $1,300 | $1,300 | ✓ via override |
| Strata | — | `strata` | $400 | $0 | $0 | ✓ |
| Vacancy | (none) | `vacancyRate` | 4% (serviceability only) | 0 | gross-rent cashflow either way | ✓ by design |
| Conveyancer | $1,500 | `conveyancing` | $2,500 | $1,500 | $1,500 | ✓ |
| Building & pest | $1,850 | `buildingPestInspection` | $800 | $1,850 | $1,850 | ✓ |
| BA fee | blank | `engagementFee` | $10,000 | $0 | $0 | ✓ |
| Other one-offs | (none) | holding dep / upfront ins / P&E / valuation / mortgage fees / post-settlement | $15,000 / $1,800 / $400 / $0 / $1,200 / $2,500 | all $0 | $0 | ✓ — **defaults add $20,900 if not zeroed** |
| Total funds required | $169,188 | (derived) | — | — | $165,525 | ⚠ −$3,663 (stamp duty only) |
| Cashflow IO @6.39 | ($7,837)/yr | (derived) | — | — | ($7,837)/yr | ✓ exact (as-printed mgmt) |
| Cashflow P&I | ($13,166)/yr | (derived) | — | — | ($13,192)/yr | ✓ within 0.2% |
| Per week | ($163.27) | (derived, ÷52) | — | — | ($150.71) | ⚠ her ÷48 vs our ÷52 |

Note the one-offs row: a BA replicating a "clean" sheet like Ella's must zero six default cost fields or PropPath's total-funds figure lands ~$20.9k above her sheet for reasons that have nothing to do with math accuracy. Defaults are opinionated; her sheet is minimal.

## Feeds into: "itemised operating expenses + upfront settlement cash" feature

- **Add an itemised opex line for letting/advertising** (or a generic "Other (annual $)" line with a free label). It's the only recurring line on a real BA's sheet we can't name today; the workaround pollutes the maintenance label.
- **Add a "transfer/registration fees" line to the upfront block**, and show stamp duty with its state + rate provenance ("NT 4.95%") so a BA whose own sheet says $35,838 can see *why* we say $32,175 instead of distrusting the total.
- **Surface "Total funds required at settlement" as a first-class client number** — it's the "$169k in the settlement account" moment from her call. We already compute it (`tp.totalCashRequired`); it reconciled exactly against `calculateOneOffCosts` in this run.
- **Weekly out-of-pocket**: expose `netWeeklyCashflow`, and decide the divisor story (÷52 vs the ÷48 that at least one real BA sheet uses). Recommend ÷52 with a tooltip, since ÷48 overstates weekly pain by 8%.
- **Dual-rate view** (P&I vs IO side by side) is her sheet's main comparative device — natural fit for the Compare/what-if tool rather than the instance panel.
- Fix the **NT sub-$525k stamp duty formula** before any NT/Darwin beta user prices a sub-$525k property (task chip spawned).

## Scope limit

Ella's sheet has **no growth, no multi-year projection, no equity, no tax** — one static year plus an outlay block. This comparison therefore validates PropPath's **year-1 cashflow itemisation and upfront settlement cash only**. It says nothing about compounding, rent escalation, equity release or serviceability; those remain covered by the Task-1 Gameplans harness and its multi-year reconciliation.

---

*Reproduce: `npx vite-node accuracy-testing/run-ella-spreadsheet-comparison.ts` (engine cross-checks print ✓/✗ per leg; all ✓ as of 2026-07-16, BASE_YEAR 2026).*
