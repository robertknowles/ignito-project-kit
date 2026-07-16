# Re-Audit: Company-Strategy Field Coverage — Independent Sweep (16 Jul 2026)

**Why this exists:** the original `company-prompt-coverage-audit.md` was produced late in a very large session; Rob asked for a fresh whole-software sweep before implementing Task 3. This re-audit was run by a clean-context agent on 16 Jul 2026. Read it together with the original audit — the union of the two lists is the Task-3 scope.

**Scope:** full sweep of `tools.ts`, `prompt.ts`, `nlDataMapper.ts`, `propertyInstanceDefaults.ts`, `propertyInstance.ts` (all 36+ fields), `InvestmentProfileContext.tsx` (all ~60 profile fields), `ClientAssumptionsContext.tsx`, `DataAssumptionsContext.tsx`, `AssumptionsGrid.tsx` (the hand-editable surface), `financialParams.ts`, `projectionEngine.ts`, `affordabilityEngine.ts`, `timelineEngine.ts`, `detailedCashflowCalculator.ts`, `oneOffCostsCalculator.ts`, stamp-duty/LMI/land-tax calculators, `negativeGearingCalculator.ts`, `cgtCalculator.ts`, `eventTypes.ts`/`eventProcessing.ts`, `validation.ts`, `PlanningDefaultsModal.tsx`, `ChatPanel.tsx`, `StrategyProfileModal.tsx`.

---

## Section A — Confirmation & corrections of the prior audit

The audit's structural finding stands: **the `create_plan` per-property schema is still exactly 11 fields** (`tools.ts:85–97`: type, mode, purchasePrice, state, growthAssumption, loanProduct, lvr, lmiCapitalized, rentPerWeek, targetPeriod, entity) and the profile schema is still 8 fields (`tools.ts:69–78`). All 25 factor verdicts re-verified as directionally correct. Line-drift corrections and substantive corrections below.

### A1. Line-number relocations (post-f3e2ab8)
- **`valuationAtPurchase` hard-overwrite is now `src/utils/nlDataMapper.ts:250`** (`valuationAtPurchase: prop.purchasePrice,` inside the instance overlay starting line 247). Audit cited 242.
- The mapper's overlay block cited as "205–290" is now roughly 205–298; the audit's `rentPerWeek` pattern reference "lines 252–254" is now 260–262; manual placement (`targetPeriod`) is now 270–273; the `modify_plan` handled-params list is `nlDataMapper.ts:365–374` (`SUPPORTED_CHANGE_FIELDS`) and `prompt.ts:349`.
- Prompt anchors: Company Strategy section is now `prompt.ts:126–144`; "Extract every specific…" is still line 135; LVR override rule is still `prompt.ts:296`.

### A2. Substantive corrections

1. **The mapper now supports three fields the schema still can't carry.** `nlDataMapper.ts:275–286` overlays `prop.saleYear`, `prop.isNewBuild`, and `prop.alertDismissed` onto the instance — but none of the three is in the `create_plan` properties schema and the prompt never mentions them. Half the wiring for audit item #8 (`isNewBuild`) already exists; only the schema field + prompt bullet is missing. (Validation in `validation.ts` does not strip unknown property keys, but the model won't emit fields its tool schema doesn't declare.)

2. **Cost-field defaults are less hardcoded than the audit implies — `applyGlobalCostDefaults` exists.** `propertyInstanceDefaults.ts:113–149` overlays the BA's global "Next-Purchase cost defaults" (`profile.defaultEngagementFee`, `defaultConveyancing`, `defaultPropertyManagementPercent`, etc., editable in `AssumptionsGrid.tsx:675–776`), and `mapToPropertySelections` applies it to AI-generated plans (`nlDataMapper.ts:240–243`), including percent-of-price engagement fees seeded from the AI's price. So a firm CAN get its $12k fee into AI plans today — but only by hand-entering it on the Assumptions page, not by stating it in the strategy text. The audit's ranks 1/2/6 remain valid as *extraction* gaps; the proposal in §4a should reuse these existing profile fields rather than invent new plumbing.

3. **Audit #9 (LVR) understates the problem: the BA's `lvrStrategy` setting silently clobbers AI-extracted LVR.** `ChatPanel.tsx:403–407` computes `lvrOverride` from `profile.lvrStrategy` (`prudent_80` → 80, `custom` → custom %) and passes it to `mapToPropertySelections`, where `lvr: lvrOverride ?? prop.lvr` (`nlDataMapper.ts:254`) overrides every property. Even a perfectly extracted "88% + LMI" strategy is discarded when lvrStrategy ≠ `client_comfort`.

4. **Audit #23 (deposit buffer) is wrong about "Engine applies: Yes."** `profile.depositBuffer` is a dead dial: outside `planPreCheck.ts:86` (a default of 0) and UI persistence (`ClientInputsTab.tsx:185`, `ClientOnboarding.tsx:307`), nothing in `affordabilityEngine.ts` / `timelineEngine.ts` / `projectionEngine.ts` reads it. Wiring a schema field to it would do nothing today.

5. **Audit #18 (buy under market): two additional facts.** (a) There are dedicated profile fields `valuationPremiumResidential` (0.03) / `valuationPremiumCommercial` (0.05) — declared in `InvestmentProfileContext.tsx:45–46`, persisted per-client via `ClientAssumptionsContext.tsx:9` — that are **consumed nowhere in the engine** (grep across src/engine, src/hooks, src/utils returns zero consumers). The intended global buy-under-market lever is dead code. (b) The instance flag `valuationAtPurchaseManual` (`propertyInstance.ts:18`) exists to protect a manually-set valuation; the mapper never sets it.

6. **Audit #20 (land tax): engine support is split.** `timelineEngine.ts:672,742` computes real state-based land tax (`landTaxOverride ?? calculateLandTax(...)`), but `detailedCashflowCalculator.ts:107` uses `property.landTaxOverride ?? 0` — the detailed cashflow view treats land tax as **zero** unless overridden. The "engine computes land tax by state/entity" claim is only true for the timeline path.

7. **Audit #11 (interest rate): confirmed, plus a note** — `DEFAULT_INTEREST_RATE` dropped to 5.5% in Jul 2026 (`financialParams.ts:143`), and instance rates equal to the default act as a sentinel deferring to `profile.interestRate` (per the comment at `financialParams.ts:129–142`), so a schema-carried per-property rate must differ from 5.5 to stick.

8. **`mapToInvestmentProfile` also drops `timelineYearsExplicit`** (see NEW GAP B2 — load-bearing).

---

## Section B — NEW GAPS the audit missed (ranked by damage)

Legend per item: default/consumption location → schema? / prompt? / mapper? → damage.

### B1. Planned sale year — exit / sell-down strategy (HIGH)
- **Field:** `PropertyInstanceDetails.saleYear` (`propertyInstance.ts:125`). Engine fully honours it: sale proceeds net of selling costs and CGT flow back into the plan (`projectionEngine.ts:454–557`, `cgtCalculator.ts`), and existing-property `saleYear` gates equity release (`affordabilityEngine.ts:138–147, 211`).
- **Coverage:** NOT in `create_plan` properties schema (only on `existingPortfolio` items, `tools.ts:59`); NOT in prompt; **mapper already supports it** (`nlDataMapper.ts:275–277`). `sell_property` is also absent from `add_event` (`tools.ts:264` allows only refinance/salary_change) despite being a full UI event type (`eventTypes.ts:148`).
- **Prior audit:** absent. (#22 PPOR is different; nothing covers sell-down.)
- **Damage:** consolidation-style firm strategies — "sell one or two in the final five years to deleverage / fund retirement" — are extremely common. Stated sell-downs are silently ignored, overstating end-state debt and understating cash events; the one-line fix (schema field) is already half-wired.

### B2. Stated plan horizon is force-clamped to 20 years — `timelineYearsExplicit` never mapped (HIGH)
- **Field:** `timelineYearsExplicit` — in the `create_plan` schema (`tools.ts:74`), instructed in the prompt (`prompt.ts:307`), but `mapToInvestmentProfile` (`nlDataMapper.ts:96–106`) **never copies it** into the profile. `InvestmentProfileContext.updateProfile` (`InvestmentProfileContext.tsx:210–216`) then clamps: non-explicit timelines → exactly 20; explicit → `max(x, 20)`.
- **Net effect:** since `explicit` is never set by the AI path, ANY stated timeline — "10-year plan", "we build over 30 years" — becomes exactly 20 years. Even if the flag were mapped, an explicit 10-year horizon would still be floored to 20.
- **Prior audit:** absent (timeline was implicitly treated as WORKS).
- **Damage:** the single most-stated planning parameter is silently rewritten; every downstream projection, goal-reached year, and IO→P&I consolidation date shifts. Only consumer of the flag today is a card-warning in `PropertyCardRow.tsx:1118`.

### B3. "Don't touch the existing equity" is forcibly overridden (HIGH)
- **Field:** `allowEquityRelease` on existing properties — HAS a schema carrier (`tools.ts:58`), but `forceRefinanceOn()` (`nlDataMapper.ts:123–141`) rewrites every AI-extracted existing property to `allowEquityRelease: true` as a product decision. The related global toggle `profile.useExistingEquity` (`InvestmentProfileContext.tsx:34`) has no carrier either.
- **Prior audit:** absent.
- **Damage:** a strategy/brief stating "the client will not refinance the family home" produces a plan funded by exactly that equity. Purchases land years earlier than reality; this is a stated-constraint violation, not a default fallback — arguably worse than any silent-default gap. The chat reply doesn't disclose the override.

### B4. Serviceability multiplier — "we assess at 6× income" (MEDIUM-HIGH)
- **Field:** `profile.salaryServiceabilityMultiplier` (default 6.0, `InvestmentProfileContext.tsx:146`), consumed at `timelineEngine.ts:227,239,889`, `affordabilityEngine.ts:502`, `projectionEngine.ts:751`. Not editable in AssumptionsGrid; no schema/prompt/mapper coverage.
- **Aggravating inconsistency:** the prompt tells the AI to derive BC as **income × 8** (`prompt.ts:311`) and the mapper does the same (`nlDataMapper.ts:85–87`), while the engine's multiplier is 6.0 — two different serviceability worlds in one pipeline.
- **Prior audit:** absent. **Damage:** firms routinely state assessment multiples; a stated "5× conservative" firm gets 8× BC derivation → systematically overfunded plans.

### B5. Tax-rate group — marginal/company/trust/SMSF rates, consolidation rate, CGT discount (MEDIUM-HIGH)
- **Fields:** `marginalTaxRate` (0.45), `companyTaxRate` (0.25), `trustTaxRate` (0.30), `smsfTaxRate` (0.15), `marginalTaxRateAtConsolidation` (0.39), `cgtOneYearDiscount` (0.50) — `InvestmentProfileContext.tsx:184–189`. All hand-editable (`AssumptionsGrid.tsx:595–650`), all engine-applied: after-tax cashflow / NG benefit (`projectionEngine.ts:679,745`), CGT on every sale (`cgtCalculator.ts:16–18,137–142`).
- **Coverage:** none in schema/prompt/mapper. **Prior audit:** absent.
- **Damage:** "our clients are typically 37% bracket" / "we model trust distributions at 30%" ignored → wrong after-tax cashflow on every property-year and wrong CGT on every modelled sale. Default 45% overstates the NG benefit for most clients.

### B6. Selling costs percent (MEDIUM)
- **Field:** `profile.sellingCostsPercent` (default 3, `InvestmentProfileContext.tsx:181`), editable (`AssumptionsGrid.tsx:519`), applied to every sale (`projectionEngine.ts:510,551`).
- **Coverage:** none. **Prior audit:** absent.
- **Damage:** compounds with B1 — a firm stating "allow 2% agent + legals on exit" (or 4–5% incl. marketing) mis-sizes every sale's net proceeds and the consolidation endgame.

### B7. Equity recycling factor — "we only recycle half the usable equity" (MEDIUM)
- **Field:** `profile.equityReleaseFactor` (default 0.70 aggressive, `InvestmentProfileContext.tsx:151`), editable as "Equity Recycling" (`AssumptionsGrid.tsx:584`), applied at `affordabilityEngine.ts:254,287`.
- **Coverage:** none. **Prior audit:** only obliquely via #21 pacing appetite. **Damage:** directly scales released-equity funding on every refinance → purchase timing across the whole plan; conservative firms stating a lower recycle rate get aggressive plans.

### B8. Existing-portfolio growth rate (MEDIUM)
- **Field:** `profile.existingPortfolioGrowthRate` (default 0.05, `InvestmentProfileContext.tsx:166`), editable (`AssumptionsGrid.tsx:497`), applied at `affordabilityEngine.ts:208`, `timelineEngine.ts:606`, `projectionEngine.ts:318`.
- **Coverage:** none — and per-existing-property `growthAssumption` is also missing from the `existingPortfolio` schema (`tools.ts:47–60`), with `mapToExistingProperties` hardcoding `'Medium'` (`nlDataMapper.ts:177`).
- **Prior audit:** absent. **Damage:** existing-property equity growth drives equity-release timing for the first new purchases; "his unit has been flat, assume 2%" → default 5% → equity releases fire too early.

### B9. Existing-portfolio per-property assumption hardcodes — including entity (MEDIUM)
- **Fields:** `mapToExistingProperties` (`nlDataMapper.ts:154–186`) hardcodes `propertyMgmtPercent: 8`, `councilWater: 2500`, `insurance: 1500`, `maintenance: 2000`, `strata: 0`, `vacancyRate: 2`, `loanTerm: 30`, `legals: 1500`, `buildingPest: 700`, `baFee: 0` — and **never maps `entity`**, though `ep.entity` drives serviceability discounting (`affordabilityEngine.ts:327–329,369–370`) and `ExistingProperty.entity` exists (`existingProperty.ts:48`). The `existingPortfolio` schema (`tools.ts:47–60`) has no carrier for any of these, nor `isNewBuild` (read at `nlDataMapper.ts:183` but uncarryable), nor `ioTermYears`.
- **Prior audit:** absent (its table only covered planned-property fields). **Damage:** "their existing duplex is held in the family trust" — stated, ignored → existing debt counted at 100% instead of 25% serviceability → new purchases blocked that shouldn't be. The expense hardcodes distort existing-portfolio cashflow lines.

### B10. Event-type coverage — 9 engine/UI event types the tool can't emit (MEDIUM, breadth)
- **Fields:** the UI + engine support `interest_rate_change`, `market_correction`, `sell_property`, `bonus_windfall`, `inheritance`, `major_expense`, `dependent_change`, `partner_income_change`, `borrowing_capacity_change` (`constants/eventTypes.ts:86–266`, processed in `eventProcessing.ts:29,144,298,321,333`), while `add_event` allows only `refinance` and `salary_change` (`tools.ts:264`).
- **Prior audit:** flagged only `renovate` (#19). **Damage:** strategy-statable examples: "we stress-test with rates at 7% from 2028" (interest_rate_change), "assume a 10% correction mid-plan" (market_correction), "inheritance of $200k expected in 2030" (bonus/inheritance), "second child due next year" (dependent_change — `DEPENDENT_BC_PENALTY` $12k BC / $6k savings, `financialParams.ts:268–271`). All silently unmodellable via chat.

### B11. LMI waiver — "our clients get professional packages / LMI waived" (LOW-MEDIUM)
- **Field:** `instance.lmiWaiver` (`propertyInstance.ts:32`, default false), applied in `lmiCalculator.ts:24` and `costsCalculator.ts:34`; editable in `CustomBlockModal.tsx:467`.
- **Coverage:** none in schema/prompt/mapper (only `lmiCapitalized` is carried). **Prior audit:** absent. **Damage:** medico/professional-niche BAs stating "90% no-LMI lends" get LMI charged on every >80% purchase → overstated cash required → purchases pushed later.

### B12. Stamp-duty override / concessions (LOW-MEDIUM)
- **Field:** `instance.stampDutyOverride` (`propertyInstance.ts:76`), applied in `timelineEngine`/`oneOffCostsCalculator` paths; plan engine otherwise always uses investor rates (`stampDutyCalculator.ts:2`) — the FHB/concession logic lives only in the standalone Toolkit (`toolkitStampDutyCalculator.ts`).
- **Coverage:** none. **Prior audit:** absent (its #13 covers fee line-items, not duty). **Damage:** "first purchase uses the FHB concession" or firm-specific duty budgeting is uncarryable; duty is the single largest purchase cost, so a stated concession shifts first-purchase timing materially.

### B13. Expense inflation rate (LOW-MEDIUM)
- **Field:** `profile.inflationRate` (0.03, `InvestmentProfileContext.tsx:171`), editable (`AssumptionsGrid.tsx:540`), applied to all expense projections (`affordabilityEngine.ts:145,172`, `timelineEngine.ts:685`, also CPI in `cgtCalculator.ts:142`). **Coverage:** none. **Prior audit:** absent. **Damage:** compounds across 20 years of every holding-cost line; same channel as #16 rent escalation but on the expense side.

### B14. Wage growth rate (LOW)
- **Field:** `profile.wageGrowthRate` (0.025), not in AssumptionsGrid but persisted per client (`ClientAssumptionsContext.tsx:8`), consumed at `timelineEngine.ts:890`, `affordabilityEngine.ts:503` (BC ceiling projection — the `financialParams.ts:172` "DECLARED ONLY" comment is stale). **Coverage:** none. **Prior audit:** absent. **Damage:** "assume 3.5% pay rises" ignored — BC growth mistimed for later purchases.

### B15. Per-property vacancy (LOW — refinement of audit #15)
- **Field:** `instance.vacancyRate` (`propertyInstance.ts:99`), consumed per-instance in `detailedCashflowCalculator.ts:56–63` and for existing properties at `affordabilityEngine.ts:420`. The audit treated vacancy as global-only ("no carrier"); there is also a per-property slider (PropertyDetailPanel). A commercial-vs-residential split vacancy ("commercial: zero vacancy on 5-year leases") needs the per-instance field, not just `investmentProfile.vacancyRate` from the audit's §4a proposal.

### B16. Hardcoded constants a firm could state, with NO editable surface at all (LOW, feature work)
- `SAVINGS_DEPLOYMENT_RATE = 0.60` (`financialParams.ts:258`, applied `projectionEngine.ts:1055,1078`, `affordabilityEngine.ts:193`) — "assume all surplus goes to investing" → 40% of stated savings silently discarded from deposit accumulation. Arguably the sneakiest one in this whole list: a BA who states savings precisely still gets only 60% of it deployed.
- `ASSESSMENT_RATE_BUFFER = 0.03` (`financialParams.ts:38`) — "assess at rate + 2%".
- `RENTAL_SERVICEABILITY_CONTRIBUTION_RATE = 0.80` / `RENTAL_RECOGNITION_RATE = 0.80` (`financialParams.ts:47,63`) and `profile.rentFactor`/`serviceabilityRatio`/`equityFactor` — "banks shade rent to 75%".
- `NEW_BUILD_DEPRECIATION_RATE = 0.02` / `ESTABLISHED_DEPRECIATION_RATE = 0.005` (`negativeGearingCalculator.ts:46–47`) — "we get QS schedules, model 2.5%".
- `ENTITY_SERVICEABILITY_FACTORS.trust = 0.25` (`financialParams.ts:118`) — the prompt itself tells the AI trusts count 25% (`prompt.ts:334`); a firm stating "our lenders assess trust debt at 60%" cannot change it.
- **Prior audit:** none of these appear. Each needs an editable field before extraction is even possible — flag for the roadmap, not the schema PR.

### B17. Custom growth curve (LOW — nuance to audit #3)
- `profile.growthCurve` is a fully numeric, hand-editable curve ("New Purchase Y1/Y5+ Growth", `AssumptionsGrid.tsx:475–486`) consumed by `projectionEngine.ts:266–274`. The prompt's "do not invent a custom curve" (`prompt.ts:140`) is therefore a schema choice, not an engine limitation — "10% then 7%" could be honoured exactly via a profile-level growth-curve carrier instead of coarse tiers. Per-property custom curves would still need work (instances only carry tiers).
- (Relevant to Task 7: Compound's calculator uses exactly this shape — 12/10/8/5/5% per-year growth.)

### B18. Dead dials that look statable but currently do nothing (documentation hazard)
- `valuationPremiumResidential/Commercial` and `depositBuffer` (see A2.4/A2.5). If schema fields are added per the audit's §4a, do **not** wire buy-under-market to `valuationPremium*` — it's unconsumed; use `valuationAtPurchase` (+ set `valuationAtPurchaseManual`) as the audit proposed.

---

## Summary

- Audit's table confirmed; 8 corrections (A2), most important: mapper already handles `saleYear`/`isNewBuild`, `applyGlobalCostDefaults` partial mitigation, `lvrStrategy` clobbering, dead `depositBuffer`/`valuationPremium*`, `valuationAtPurchase` overwrite now at `nlDataMapper.ts:250`.
- **18 new gap clusters**, of which four are top-10-grade by the audit's own ranking logic (deposit-math / stated-constraint violations): **B1 planned sell-down (schema field is a near-free win — mapper + engine done), B2 timeline clamp + unmapped `timelineYearsExplicit` (likely a bug, not just a gap), B3 forced equity release overriding a stated refusal, B4 serviceability multiplier incl. the prompt's ×8 vs engine's ×6 mismatch.** B5 (tax rates) and B6/B7/B8 are the strongest of the remainder; B16's `SAVINGS_DEPLOYMENT_RATE` deserves a special mention since it silently discounts a *stated* number (savings) by 40% with no surface anywhere.
