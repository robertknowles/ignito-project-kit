# Company Strategy → AI Extraction: Coverage Audit

**Date:** 10 Jul 2026
**Trigger:** Adam (beta) asked whether BA fees / purchase costs stated in a company strategy get picked up. Verified: they do not. This audit maps every factor a BA could plausibly state in a company strategy against (a) what the live prompt tells the AI to extract, (b) whether the tool schema has a field to carry it, and (c) whether the engine would apply it if carried.

**Scope note — no code was changed.** This is the audit + proposal only.

---

## 1. How the pipeline works (and where things get dropped)

1. **Capture** — BA writes free text (max 2,000 chars) per named strategy in `src/components/StrategyProfileModal.tsx`; stored as a JSONB array on `profiles.strategy_profiles` (`src/hooks/useStrategyProfiles.ts`). BA picks one per client via pills (`src/components/CompanyStrategySelector.tsx`); the selected text is sent as `strategyProfileText`.
2. **Prompt** — `supabase/functions/nl-parse/index.ts:100` calls `buildSystemPrompt()` in **`supabase/functions/nl-parse/prompt.ts`** (the live prompt — `system-prompt.ts`/`pipeline.ts`/`prompts/` are the deprecated Tier-1 pipeline, still imported only by the eval runner). The Company Strategy section is `prompt.ts:120–145`.
3. **Extraction** — the AI must respond via one of 6 tools (`tools.ts`, `tool_choice: any`). For plan creation, the **`create_plan` schema is the hard ceiling on what can be extracted**: per-property fields are only `type, mode, purchasePrice, state, growthAssumption, loanProduct, lvr, lmiCapitalized, rentPerWeek, targetPeriod, entity` (`tools.ts:85–97`); profile fields are only `depositPool, annualSavings, baseSalary, timelineYears, timelineYearsExplicit, equityGoal, cashflowGoal, targetPassiveIncome` (`tools.ts:69–78`).
4. **Mapping** — `src/utils/nlDataMapper.ts:205–290` overlays the AI's values onto `getPropertyInstanceDefaults()`. **Everything the schema can't carry silently gets the template default** (e.g. `engagementFee: 8000`, `propertyManagementPercent: 8`, `interestRate: 6.25`, `ioTermYears: 5`, vacancy 4%).
5. **Engine** — `src/engine/projectionEngine.ts` consumes the full ~36-field `PropertyInstanceDetails` (`src/types/propertyInstance.ts`) plus a rich `investmentProfile` (see `accuracy-testing/fixtures/*.json` → `scenario_data.investmentProfile`): `interestRate`, `vacancyRate`, `rentEscalationRate`, `ioToPiTransitionYears`, `depositBuffer`, `maxPurchasesPerYear`, etc. The engine already applies all of these — the gap is purely upstream.

**Key structural finding:** the prompt already says *"Extract every specific the company strategy states and apply it per property — do NOT fall back to generic defaults"* (`prompt.ts:135`), but for most cost/expense factors **there is literally no schema field to put the value in**. Prompt strengthening alone cannot fix those — the schema and `nlDataMapper.ts` must gain fields first. Conversely, some factors (LVR, cadence) have fields but weak/no prompt coverage, where prompt text alone suffices.

---

## 2. Factor coverage table

Legend — **Extracted:** does the live prompt instruct extraction (citation = `prompt.ts` line)? **Carrier:** does a `create_plan` schema field exist? **Engine:** would the engine apply it if carried? **Verdict:** WORKS / PARTIAL / DROPPED.

| # | Factor (real BA phrasing) | Extracted today? | Schema carrier? | Engine applies? | Verdict |
|---|---|---|---|---|---|
| 1 | Price band ("$550–650k") | Yes — `prompt.ts:139` | `purchasePrice` | Yes | **WORKS** |
| 2 | Yield / rent ("4.5–4.8% yield") | Yes — `prompt.ts:138` (incl. spread-across-band rule) | `rentPerWeek` | Yes | **WORKS** |
| 3 | Growth expectation ("10% then 7%") | Yes — `prompt.ts:140` (coarse: mapped to High/Med/Low tier) | `growthAssumption` | Yes (tiered curves) | **WORKS** (coarse) |
| 4 | Purchase cadence ("buy every 18 months") | Yes — `prompt.ts:141` | `targetPeriod` → manual placement (`nlDataMapper.ts:262–265`) | Yes | **WORKS** |
| 5 | Commercial after N properties / mid-plan transition | Yes — `prompt.ts:133,142` + mandatory execution section `prompt.ts:153–175` | `strategyPreset` + commercial cells | Yes | **WORKS** |
| 6 | Regional VIC/QLD, state preference | Yes — cell steering `prompt.ts:143` + planning defaults `prompt.ts:108` | `state` + cell type | Yes (state drives stamp duty, land tax) | **WORKS** |
| 7 | Entity rules ("properties 2+ in trust", "SMSF purchases") | Yes — `prompt.ts:330–343` (proactive trust assignment is even mandatory) | `entity` (`tools.ts:96`) | Yes (serviceability factors) | **WORKS** |
| 8 | Property kind ("established freestanding only", "units") | Partial — `prompt.ts:143` steers cell selection; but "established" vs "new build" has no carrier (`isNewBuild` exists on the instance and in the mapper, `nlDataMapper.ts:272`, but is NOT in the `create_plan` schema) | cell `type`; `isNewBuild` missing from schema | Yes (`isNewBuild` drives CGT/NG treatment + BC uplift) | **PARTIAL** |
| 9 | Deposit % / LVR preference ("20% deposits", "88% + LMI") | Partial — LVR override rule exists (`prompt.ts:296`) but the Company Strategy bullet list (`prompt.ts:138–143`) never names LVR/deposit, so strategy-stated LVR competes with the capacity-based LVR rules | `lvr`, `lmiCapitalized` | Yes | **PARTIAL** |
| 10 | Loan structure ("IO for first 5 years then P&I") | Partial — `loanProduct` IO/PI extractable; the "5 years" (IO term) has NO carrier — default `ioTermYears: 5` happens to match the common case, any other term is silently ignored | `loanProduct` only; `ioTermYears` missing | Yes (`projectionEngine.ts:393` — IO→P&I rollover) | **PARTIAL** |
| 11 | Interest rate assumption ("we model at 6.5%") | **No** at plan creation — no prompt mention; `interestRate` is a `modify_plan` param only (`prompt.ts:349`). Even the BA Planning Defaults' `defaultInterestRate` (`prompt.ts:113`) has no `create_plan` field to land in | None on create_plan (instance + profile fields exist) | Yes (`instance.interestRate`, default 6.25%) | **DROPPED** |
| 12 | **BA fee / engagement fee** ("our fee is $12k per purchase") | **No** — zero prompt mention, no field | None (`engagementFee` on instance, default **$8,000** silently applied) | Yes — feeds `totalCashRequired` (`oneOffCostsCalculator.ts:45`) → deposit math → **purchase timing** | **DROPPED** |
| 13 | Purchase / upfront costs ("allow 5% on top", "budget $30k costs") | **No** | None (`conveyancing`, `mortgageFees`, `buildingPestInspection`, `conditionalHoldingDeposit`, `buildingInsuranceUpfront`, `maintenanceAllowancePostSettlement`, `purchaseCostsOverride` all exist on instance) | Yes — all feed `totalCashRequired` | **DROPPED** |
| 14 | PM fee ("PM at 7%") | **No** | None (`propertyManagementPercent`, default **8%**) | Yes — annual cashflow every property | **DROPPED** |
| 15 | Vacancy ("2 weeks/yr vacancy") | **No** | None (`profile.vacancyRate`, default **4%** ≈ 2 weeks — coincidence saves the common case; `projectionEngine.ts:315`) | Yes | **DROPPED** |
| 16 | Rent growth ("rents grow 3%") | **No** | None (`profile.rentEscalationRate`, default **5%**) | Yes — compounds into every cashflow year (`projectionEngine.ts:643` etc.) | **DROPPED** |
| 17 | Running expenses (insurance, rates, strata, maintenance $) | **No** | None (instance fields exist) | Yes | **DROPPED** |
| 18 | Buy under market value ("we buy 5–10% under market") | **No** | None (`valuationAtPurchase` exists; mapper hard-sets it = purchasePrice, `nlDataMapper.ts:242`) | Yes — drives day-one equity → equity-release timing | **DROPPED** |
| 19 | Renovate / manufacture equity | **No** — renovation events exist in the engine (`getRenovationValueIncrease`, `eventProcessing.ts`) but `add_event` only supports `refinance` and `salary_change` (`tools.ts:264`, `prompt.ts` Events) | None | Yes (via event blocks) | **DROPPED** |
| 20 | Land tax state preferences ("spread states to minimise land tax") | **No prompt mention** — only achievable indirectly if the AI happens to vary `state`; `landTaxOverride` has no carrier | `state` (indirect) | Yes — engine computes land tax by state/entity | **PARTIAL–DROPPED** |
| 21 | Negative-cashflow appetite ("wear negative cashflow early") | **No** — promised in the modal's own helper copy (`StrategyProfileModal.tsx:83`: "appetite for negative cashflow") and the placeholder example, but the prompt has no handling and no carrier (`pacingMode` exists on profile) | None | Partially (pacing dials) | **DROPPED** (UI over-promises) |
| 22 | Home/PPOR purchase inside the plan | **No** — also promised in modal copy ("whether a home purchase can sit inside it"); no PPOR concept in the properties schema | None | No planned-PPOR concept | **DROPPED** (UI over-promises) |
| 23 | Deposit buffer / cash reserve ("keep $20k buffer") | **No** | None (`profile.depositBuffer` exists) | Yes | **DROPPED** (low) |
| 24 | Max purchases per year | **No** (cadence rule partially covers) | None (`profile.maxPurchasesPerYear`) | Yes | **DROPPED** (low) |
| 25 | Loan term ("30yr resi, 25yr commercial") | **No** | None (`loanTerm`) | Yes | **DROPPED** (low) |

**Summary: 6 factors work, 4 are partial, ~15 are silently dropped.** Every dropped factor gets a hard-coded default the BA never sees confirmed, and the AI's chat reply doesn't flag the omission — the failure is invisible until someone (Adam) checks a number.

---

## 3. Ranked gap list

Ranking = (effect on plan accuracy) × (likelihood a firm states it in a strategy). "Deposit-math" factors outrank "cashflow-drip" factors because they shift **purchase timing**, which compounds through the whole plan.

| Rank | Gap | Why it matters |
|---|---|---|
| **1** | **BA / engagement fee** (#12) | Feeds `totalCashRequired` on **every purchase**. A firm charging $15k when the default is $8k understates cash needed by $7k × N properties → purchases land earlier than reality → whole timeline optimistic. This is the one Adam caught. Every BA firm has a fee; near-100% likelihood it appears in strategies. |
| **2** | **Upfront purchase costs** (#13) | Same deposit-math channel, bigger dollars ("allow 5% for costs" on $600k = $30k/purchase). Compounds with #1. |
| **3** | **Interest rate assumption** (#11) | Hits cashflow AND serviceability on every property, every year. Firms routinely state a modelling rate ("assess at 6.8%"). Currently not settable even via Planning Defaults on plan creation. |
| **4** | **Deposit % / LVR preference** (#9) | Carrier exists — pure prompt gap. LVR changes both deposit math and loan size; a "conservative 80% only" firm can currently get 88%+LMI plans from the low-cap override. Cheapest fix on the list. |
| **5** | **IO term** (#10) | "IO for 5 then P&I" works by coincidence of the default; "IO for 10" or "P&I from day one after year 3" silently ignored. Cashflow steps sharply at the IO→P&I roll — wrong term = wrong cashflow shape mid-plan. |
| **6** | **PM fee %** (#14) | Direct, recurring cashflow error on every property (7% vs default 8% on $520/wk ≈ $270/yr/property — small each, systematic across the portfolio and horizon). Very commonly stated. |
| **7** | **Vacancy** (#15) | Same recurring-cashflow channel; default 4% happens to equal the common "2 weeks", so mis-stated cases (commercial: often 0 with long leases; regional: higher) are the exposure. |
| **8** | **Rent escalation** (#16) | Default 5%/yr is generous; a firm modelling 3% would see materially rosier horizon cashflow than intended. Compounds over 20 years. |
| **9** | **Buy under market / manufacture equity** (#18, #19) | Firms that pitch "we buy 5–10% under market" get zero credit — day-one equity affects equity-release timing and hence purchase cadence. Carrier (`valuationAtPurchase`) exists but mapper overwrites it. |
| **10** | **Negative-cashflow appetite / pacing** (#21) | Molds plan shape (early stretch vs safety). Our own modal copy promises it's honoured — currently false advertising. Fix or delete the copy. |
| — | Lower priority | Running expenses (#17), established/new-build (#8), land-tax steering (#20), deposit buffer (#23), loan term (#25), PPOR-in-plan (#22 — real feature work, not extraction). |

---

## 4. Proposed fixes (draft — not applied)

Two coordinated changes are needed. **Prompt text alone fixes only ranks 4 and (partly) 10**; everything else needs schema fields + `nlDataMapper.ts` overlay lines first, because tool-constrained output physically cannot carry the values today.

### 4a. Schema additions

**`create_plan` → `properties[]` items** (`tools.ts:85–97`) — add:

```ts
interestRate:   { type: 'number', description: 'Annual % e.g. 6.5. Only when the strategy/brief states a modelling rate.' },
ioTermYears:    { type: 'number', description: 'Years of IO before rolling to P&I. Only when stated (default 5).' },
engagementFee:  { type: 'number', description: 'The firm\'s BA fee per purchase in dollars. Only when the company strategy states a fee.' },
propertyManagementPercent: { type: 'number', description: 'PM fee as % of rent, e.g. 7. Only when stated.' },
valuationAtPurchase: { type: 'number', description: 'Value at purchase when the strategy says the firm buys under market value. Omit otherwise (defaults to purchasePrice).' },
isNewBuild:     { type: 'boolean' },
```

**`create_plan` → `investmentProfile`** (`tools.ts:69–78`) — add:

```ts
interestRate:       { type: 'number', description: 'Portfolio-wide modelling rate as decimal or % — only when stated.' },
vacancyRate:        { type: 'number', description: 'Vacancy as fraction of rent, e.g. 0.04 for 2 weeks/yr. Only when stated.' },
rentEscalationRate: { type: 'number', description: 'Annual rent growth as fraction, e.g. 0.03. Only when stated.' },
```

**Wiring:** `nlDataMapper.ts` `mapToPropertySelections` needs overlay lines for each new field (same pattern as `rentPerWeek`, lines 252–254), and must stop hard-setting `valuationAtPurchase = purchasePrice` when the AI supplied one (line 242). `mapUpdateProfileToUpdates` and the `modify_plan` handled-params list (`nlDataMapper.ts:363`, `prompt.ts:349`) should gain the same fields so strategies can be applied to existing plans too. A "purchase costs" lump ("allow $30k costs") maps cleanest onto `purchaseCostsOverride` — recommend adding `purchaseCostsTotal` per property rather than exposing all 8 line items.

### 4b. Prompt additions

Extend the bullet list inside the Company Strategy section (`prompt.ts`, after the "Property kind / price point" bullet at line 143), matching the existing voice/format:

```
- **BA fee / engagement fee** (e.g. "our fee is $12k per purchase", "$15k inc GST"): set each property's \`engagementFee\` to the stated dollar amount. This feeds the cash required at every purchase — leaving the default when the firm stated a fee makes every purchase land too early. If the fee is a percentage of price, compute the dollar amount per property.
- **Purchase / upfront costs** (e.g. "allow 5% for purchase costs", "budget $30k on top of the deposit"): set \`purchaseCostsTotal\` per property — a percentage applies to that property's price; a dollar figure applies as stated. Do NOT silently fall back to itemised defaults when the strategy names an all-in figure.
- **Interest rate** (e.g. "we model at 6.5%", "assess at 7%"): set \`interestRate\` on EVERY property (and \`investmentProfile.interestRate\`). Do not keep the engine default when a rate is stated.
- **Loan structure** (e.g. "IO for the first 5 years then P&I", "P&I from day one"): set \`loanProduct\`, and \`ioTermYears\` to the stated IO length when it differs from 5. "P&I from day one" → \`loanProduct: "PI"\`.
- **Deposit / LVR** (e.g. "20% deposits", "we stretch to 88% with LMI"): deposit % = 100 − LVR. A strategy-stated LVR OVERRIDES the capacity-based LVR rules above — apply it to every property unless the client's brief overrides it.
- **Property management fee** (e.g. "PM at 7%"): set \`propertyManagementPercent\` on every property.
- **Vacancy** (e.g. "2 weeks a year", "allow 3% vacancy"): convert weeks to a fraction of annual rent (2 weeks ≈ 0.04) and set \`investmentProfile.vacancyRate\`.
- **Rent growth** (e.g. "rents grow 3% a year"): set \`investmentProfile.rentEscalationRate\` as a fraction (3% → 0.03).
- **Buying under market value** (e.g. "we buy 5–10% under market"): set \`valuationAtPurchase\` above \`purchasePrice\` by the stated margin (5% under market on a $580k purchase → valuationAtPurchase 610500). This gives the plan its day-one equity — omitting it erases the firm's core value proposition from the model.
```

Plus one guard-rail line at the end of the section (mirrors the existing "Extract every specific" emphasis):

```
**If the strategy states a cost, fee, rate, or expense you have no field for, say so in \`assumptions\` (e.g. "Strategy's $15k BA fee noted — applied to purchase cash required") rather than silently ignoring it. A silently-dropped stated number is the worst failure mode.**
```

### 4c. Non-prompt follow-ups (flagged, not in scope)

- **Modal copy honesty** (`StrategyProfileModal.tsx:78–85`): until #21/#22 are wired, remove "appetite for negative cashflow" and "whether a home purchase can sit inside it" from the helper text — they promise extraction that doesn't happen.
- **Echo-back**: the create_plan chat message should confirm strategy-derived overrides ("Modelled with your firm's $12k fee and 7% PM") so BAs can see what stuck — this is the cheapest trust-builder and would have surfaced Adam's issue instantly.
- The deprecated `prompts/` pipeline and `system-prompt.ts` have no company-strategy section at all; if the eval runner still exercises them, evals won't catch any of this.
