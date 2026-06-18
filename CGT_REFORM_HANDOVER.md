# CGT & Negative Gearing Reform — Session Handover

> **Working document.** Created at the end of a build session to hand over cold to a new
> session (human or AI). Self-contained: you should be able to pick up the work, understand
> every decision, and find every change from this file alone.
>
> **Status as of handover:** All changes implemented, type-checked, production-build-clean,
> and **verified in the live authenticated app**. **NOT committed to git.**
> Branch: `main` (changes are uncommitted in the working tree).

---

## 0. TL;DR

The 2026 Australian Budget proposed big CGT and negative-gearing changes (effective 1 July 2027
if passed). We:

1. Researched exactly what changed (Part 1).
2. Worked out which parts touch *our* product — almost entirely **CGT, via sale proceeds**;
   negative gearing is a non-issue for us, for two independent reasons (Part 2).
3. Discovered the **"Sell" button on planned/future properties was non-functional** and fixed it
   so planned and existing properties behave identically (Part 4).
4. Modelled CGT on the **2027 basis as a single number** (the market already applies the proposed
   rules — no current-vs-proposed comparison), and surfaced **CGT + net proceeds** in exactly two
   places: the **Projections table** and the **Sell popup** (Parts 5–6).

Verified live: a planned property set to sell in 2036 produced **CGT $170,323** (sale year only)
and **Net proceeds $430,838** in the Projections table.

---

## 1. The reform — what the research found

A fact-checked, multi-source deep-research pass (primary sources: budget.gov.au, the Treasury
budget factsheet, the Treasurer's second-reading speech, the ATO new-legislation page, the APH
Bills Digest). Key facts:

### Legislative status
- **Announced** in the 2026-27 Federal Budget on **12 May 2026**.
- Treasury Laws Amendment (Tax Reform No. 1) Bill 2026: introduced 28 May, passed the House
  4 June, **referred to a Senate committee** (report due ~22 June 2026), **NOT passed the Senate**.
- The ATO page literally says *"this measure is not yet law."*
- **Effective 1 July 2027 if passed.**

### CGT change
- The **50% CGT discount** (for individuals, trusts, partnerships) is **replaced** with:
  - **CPI cost-base indexation** (you only pay tax on the above-inflation gain), **plus**
  - a **30% minimum tax** on the (real, indexed) gain.
- **Out of scope:** companies, super funds/SMSFs, foreign residents (they keep current treatment).
- **Transition:** for an asset held across 1 July 2027, the gain is split — the **50% discount
  applies to growth up to 1 July 2027**, the **new method to growth after**.
- Main residence exemption, affordable-housing 60% discount, small-business CGT concessions retained.
- Income-support/Age-Pension recipients exempt from the 30% minimum tax.

### Negative gearing change
- Limited to **new builds** from 1 July 2027.
- Losses on **established** properties bought after **7:30pm AEST 12 May 2026** become deductible
  **only against residential property income** (rent + property capital gains), **not wages**.
  Excess carries forward.
- **New builds are exempt** — can still negatively gear against all income, AND get a **choice** at
  sale between the 50% discount and the new method.
- **Grandfathering:** properties held at announcement (incl. contracts entered but unsettled before
  the cutoff — contract date governs) keep full current negative-gearing treatment until sold.

### Important nuance (drove a later decision)
At research time this was **proposed, not law**. The initial plan treated it as a *scenario alongside
current law*. **Rob later overrode this** — see §3, decision D6 — because every bank, buyers' agent
and investor in Australia is *already* applying the proposed rules; nobody is waiting until 2027.

---

## 2. How CGT & negative gearing actually work in OUR system (the load-bearing findings)

This is the most important section. The audit (read-only, across the calc engine, constants, and UI)
established:

### 2.1 We model ZERO tax on cashflow → we never modelled negative gearing
- `utils/detailedCashflowCalculator.ts` has `const potentialDeductions = 0` (kept for backward compat).
- Holding-period cashflow is **pre-tax**: rent − expenses − interest − principal. No tax refund on
  losses, no tax owed on profits, no depreciation.
- **Consequence:** the negative-gearing *cashflow* reform has nothing in our system to restrict.

### 2.2 Negative gearing affects borrowing capacity in reality — but not in a way we need to model
- In reality, lenders **add the negative-gearing tax benefit back** into serviceable income, which
  *inflates* investor borrowing power. The reform removes that for established properties → real
  capacity drops.
- **But in our system, borrowing capacity is a USER INPUT.** See
  `utils/borrowingCapacityCeiling.ts` → `calculateBorrowingCeiling()`: when `statedBC > 0` it simply
  grows the broker's figure by wage growth, with a comment *"This is what a real lender would approve."*
- The broker's number **already contains** the NG benefit. We inherit a realistic figure; post-reform
  the user just enters a lower one. **So we don't need to model NG — twice over** (no cashflow tax,
  and capacity is user-supplied).
- **One edge:** a *computed fallback* exists for blank BC — `(salary + 80% rent) × 6` — which has no
  NG and no new-build/established distinction. Minor; most users enter a real BC. **Left as-is**,
  documented as a known simplification.
- Grep confirmed: **zero** references to negative gearing / tax inside the serviceability/capacity
  engine (`engine/affordabilityEngine.ts`, `utils/borrowingCapacityCeiling.ts`).

### 2.3 CGT only touches net SALE PROCEEDS — nothing else
- CGT is a one-off event at disposal. It does **not** belong in borrowing capacity or holding cashflow,
  and it isn't in ours.
- The only place CGT enters: **net sale proceeds** = `sale value − selling costs − loan − CGT`, which
  flows into `salesProceedsCash` → roadmap cash/equity (`cashFromSales`) → funds for the next deposit.
- CGT was already centralised: `utils/cgtCalculator.ts` → consumed in `hooks/usePortfolioProjection.ts`.
  No duplicate CGT/proceeds computation exists elsewhere (verified across `comparisonCalculator`,
  `metricsCalculator`, `planPreCheck`, `useChartDataGenerator`, `useRoadmapData`, `client-view/`).

### 2.4 THE BIG DISCOVERY: planned-property sales were non-functional
- The engine read `saleYear` **only from existing properties** (`ep.saleYear`).
- Planned/future properties (`PropertyInstance.saleYear`) had the field, a working toggle UI, and were
  even AI-parseable and persisted — but the **projection engine never read it.**
- Setting "Sell" on a planned property did **nothing**: no proceeds, no CGT, the property never left
  the portfolio. (This is exactly why Rob's test "did nothing happen?" — it was computing nothing.)
- Confirmed by tracing every `saleYear` reference: all engine reads were `ep.saleYear` across
  `usePortfolioProjection.ts`, `affordabilityEngine.ts`, `useAffordabilityCalculator.ts`.

---

## 3. Decisions and rationale

| # | Decision | Rationale |
|---|---|---|
| D1 | **Do NOT model negative gearing** | We don't model cashflow tax (§2.1) and capacity is user-input (§2.2). Non-issue twice over. |
| D2 | **Focus the work on CGT** | It's the only place the reform changes our numbers (§2.3). |
| D3 | **Time-apportioned CGT calc** (not "full legal apportionment", not "bookend") | Accurate enough without needing a formal 1 July 2027 market valuation. Bookend overstates; full-legal is overkill while the bill is unpassed. |
| D4 | **Add a "new build vs established" flag** | New builds get the cheaper CGT treatment; it changes the number, so the user must be able to set it. |
| D5 | **Make planned-property sales functional**, mirroring existing-property behaviour exactly | Parity: proposed (planned) and existing properties should sell the same way. Mirroring existing logic = lowest-risk, consistent. |
| D6 | **Single CGT number on the 2027 basis — DROP the current-vs-proposed comparison** | Rob: the market already applies the proposed rules; a comparison was overcooked and made a "massive deal" of proposed-vs-current that the industry doesn't. |
| D7 | **Numbers go in the Projections table; the sale flow shows an estimate in the Sell popup. Nothing else.** | Rob: numbers belong in the projections table; sale decisions in the sell popup; the change-log sidebar already shows "what changed" — so no extra cards/banners. We **removed** a comparison card we'd built earlier once we agreed it wasn't worth its prominence. |

---

## 4. The CGT math model (so the next session can verify/extend)

Implemented in `utils/cgtCalculator.ts` → `calculateCgtComparison(params)`.

**Constants**
- `CGT_REFORM_START_YEAR = 2027.5` (1 July 2027 as a fractional year).
- `CGT_REFORM_MIN_RATE = 0.30`.

**Inputs**: `entity`, `profile`, `capitalGain` (nominal), `costBase` (purchase price),
`valueAtHoldStart?` (value at the start of the modelled hold; gain above cost base here is forced
into the pre-2027 slice), `holdStartYear`, `saleYear`, `isNewBuild?`, `isConsolidationPeriod?`.

**Returns** `{ capitalGain, current: {cgt, effectiveRate}, reform: {cgt, effectiveRate, preReformGain,
postReformGain, indexationRelief, inScope} }`. (We now use only `reform.cgt` in the app — see D6 —
but the function still computes both; `current` is kept available.)

**Logic**
1. **Current law:** `cgt = capitalGain × getEffectiveCgtRate(entity, profile, isConsolidationPeriod)`.
   - Individual: `marginal × (1 − discount)`; Trust: `trustRate × (1 − discount)`;
     Company: `companyRate`; SMSF: `smsfRate × (1 − 1/3)`. (`discount` default 0.50.)
2. **Company / SMSF:** out of scope → `reform === current`, `inScope = false`.
3. **New build (in scope):** the investor **chooses the cheaper** of:
   - (a) current discount method on the whole gain, or
   - (b) **new method on the whole gain**: index out inflation
     `relief = costBase × ((1+cpi)^yearsHeld − 1)` (capped at the gain), then tax the real gain at
     `max(entityRate, 30%)`.
   - `reform.cgt = min(current, newMethod)`. (So a new build is **never worse** than current law.)
4. **Established (in scope):** **time-apportion** straight-line at `CGT_REFORM_START_YEAR`:
   - `embeddedGain = max(0, valueAtHoldStart − costBase)` → entirely pre-2027.
   - Remaining growth split by time: `preGain = embeddedGain + growthGain × (yearsPre/total)`,
     `postGain = growthGain × (yearsPost/total)`.
   - **Pre slice:** current discount method (`entityRate × (1 − discount)`).
   - **Post slice:** indexation relief `= (costBase + preGain) × ((1+cpi)^yearsPost − 1)` (capped at
     postGain), real post gain taxed at `max(entityRate, 30%)`.
   - `cpi = profile.inflationRate` (default 0.03).

**Worked sanity checks (verified standalone with tsx):**
- Individual, $1M cost base, ~$790k gain, sold 2036 (long hold): current $177,750 (22.5%),
  reform $185,072 (23.4%) — slightly higher, indexation offsets most of the discount removal.
- Sold before 1 July 2027: reform == current (all pre-slice).
- Company: reform == current (out of scope).
- Big embedded gain + low post-2027 real growth: reform **lower** than current (16.4% vs 22.5%) —
  indexation wipes the post-2027 slice. **→ reform is NOT a blanket increase; depends on growth vs
  inflation.**
- New build (same inputs as the long-hold established case): reform == current (22.5%) — it elects
  the discount. **New builds never pay more than current law.**

---

## 5. What changed in the code (file-by-file)

> Reference by symbol/function (line numbers drift). The pattern for the engine sale guards is:
> an **additive early-return gated on a sale year being set**, so scenarios with no sale year are
> completely unaffected.

### `utils/cgtCalculator.ts`
- Added `CGT_REFORM_START_YEAR`, `CGT_REFORM_MIN_RATE`, the `CgtComparison`/`CgtRegimeResult` types,
  and `calculateCgtComparison()` (the model in §4). `getEffectiveCgtRate()` unchanged.

### `hooks/usePortfolioProjection.ts` (the projection engine — single source of truth)
- Import switched from `getEffectiveCgtRate` to `calculateCgtComparison`.
- Added `SaleCgtRow` interface `{ id, name, saleYear, kind: 'existing'|'planned', capitalGain, cgt,
  netProceeds }` and `salesCgtBreakdown: SaleCgtRow[]` on `PortfolioProjectionResult` (+ in the return).
- Added `isPlannedSold(rp, atYear)` helper (reads `getInstance(rp.instanceId)?.saleYear`).
- **Existing-property sale block:** routes through `calculateCgtComparison`, uses **`cgt.reform.cgt`**
  (2027 basis) for proceeds, pushes a `SaleCgtRow`.
- **NEW planned-property sale-proceeds block** (mirrors the existing one): for each planned property at
  its `saleYear`, computes event-aware grown value, `costBase = rp.prop.cost`, CGT via
  `calculateCgtComparison` (holdStartYear = purchase year), `netProceeds` using the **original**
  `rp.prop.loanAmount` (consistent with how existing sales use `ep.loan`), adds to `salesProceedsCash`,
  pushes a `SaleCgtRow`. Guards `saleYear > purchaseYear`.
- **5 loop guards** (`if (isPlannedSold(rp, year)) return;`): value/debt/refi loop, cashflow loop,
  BC rental loop, BC entity-debt loop, roadmap prior-props cashflow loop.

### `engine/affordabilityEngine.ts`
- Added `isPurchaseSold(purchase, currentPeriod, deps)` helper (reads
  `deps.getInstance(purchase.instanceId)?.saleYear`, compares via `yearToPeriod`).
- Guards (`if (isPurchaseSold(...)) return;`) in **4 purchase loops**: `calculateAvailableFunds`,
  `calculateEntityDiscountedDebt`, `calculateTotalAnnualLoanPayments`, `calculateTotalRentalIncome`.

### `hooks/useAffordabilityCalculator.ts`
- Inline `saleYear` guards in **4 planned-purchase loops**: the portfolio snapshot loop, the two
  timeline-cashflow loops, and the equity-release tracking loop.

### Data model + persistence
- `types/existingProperty.ts`: `isNewBuild?: boolean`.
- `types/propertyInstance.ts`: `isNewBuild?: boolean`.
- `types/nlParse.ts`: `isNewBuild?: boolean` on the 3 parsed-property shapes (AI pipeline).
- `utils/nlDataMapper.ts`: maps `isNewBuild` (initial map + Confirmation-Brief overlay).
- **Persistence verified:** scenarios are stored as a JSON blob in `scenarios.data` (no field
  whitelist, no schema constraint, loaded atomically). `isNewBuild` (existing + planned) and planned
  `saleYear` **persist automatically — no migration needed.**

### UI — existing properties: `components/PortfolioTab.tsx`
- Calls `usePortfolioProjection()`, builds `cgtById` lookup from `salesCgtBreakdown`.
- New **"Type"** column (Estab./New) after Entity.
- Sell cell special-cased to pass `estimate={cgtById[p.id]}` into `SaleYearTogglePortfolio`.
- `SaleYearTogglePortfolio` gained an `estimate` prop; popup restructured to show
  **"Est. CGT · Net proceeds"** when a sale year is set.
- **Removed** the "Capital Gains Tax at sale" comparison card + tags.
- Reworded the Type header tooltip (dropped the misleading negative-gearing mention).

### UI — planned properties: `components/PropertyCardRow.tsx`
- Calls `usePortfolioProjection()`, builds `saleEstimates` keyed by instance id.
- New **"Type"** column in the purchases table + a "Type" row in the blocks/card view + label map entry.
- `SaleYearToggle` gained an `estimate` prop; popup shows the same inline estimate.
- Table-mode and blocks-mode Sell controls pass `estimate={saleEstimates[id]}`.

### UI — Confirmation Brief: `components/ConfirmationBrief.tsx`
- Added a **Type** Segmented (Established / New build) to the planned-property block, writing
  `onFieldChange('isNewBuild', …)`.

### UI — the Projections table: `components/FinancialSummaryTable.tsx`
> This is the "Projections table" (Dashboard → Plan → **Projections** sub-tab).
- Destructures `salesCgtBreakdown`; builds `cgtByYear` (sum CGT by sale year).
- Added a **"Capital gains tax"** row (shows the CGT in the sale-year column only).
- The pre-existing sales row was renamed **"Cash from sales" → "Net proceeds from sales"** (it already
  showed net proceeds via `yearData.cashFromSales`, which now includes planned sales too).

---

## 6. What changed in the output (user-visible)

1. **"Type" (New build / Established) selector** on every property — existing table, planned table,
   card view, and Confirmation Brief.
2. **Planned properties now actually sell** — set a "Sell" year → the property leaves the portfolio,
   proceeds return as cash, and the roadmap shifts (debt drops from serviceability, deposits free up).
3. **Projections table** has a **"Capital gains tax"** row + a **"Net proceeds from sales"** row.
4. **Sell popup** shows an inline **"Est. CGT · Net proceeds"** when you set a date (existing + planned).
5. **One CGT number on the 2027 basis** — no current-vs-proposed comparison, no tags, no extra cards.
6. Reworded new-build tooltip (no longer implies we model negative gearing).

---

## 7. Regression safety

- **Every engine change is an additive early-return gated on `saleYear` being set.** In all existing
  scenarios `saleYear` is null/undefined, so **every guard is a no-op and nothing changes.**
- The new planned-sale proceeds block is also gated (`if (!sy || year !== sy) return;`).
- The only behavioural change: setting a planned "Sell" year now actually does something (it didn't
  before), and sale proceeds use the 2027-basis CGT instead of the old 50%-discount figure.
- `salesCgtBreakdown` is empty when there are no sales; the Projections rows are gated on `hasSales`.

---

## 8. Verification

- **TypeScript:** `npx tsc --noEmit` → **0 errors.**
- **Lint:** no new errors (pre-existing `no-explicit-any` / empty-interface / prefer-const remain).
- **Production build:** `npm run build` → passes (3,234 modules).
- **Standalone math checks** (tsx): see §4 worked examples.
- **LIVE BROWSER (the preview was authenticated as Rob):**
  - Opened the **"Growth to Cash Flow"** scenario (3 planned properties).
  - Set property 1 to **Sell = 2036**.
  - **Projections table showed: "Capital gains tax" $170,323** (in the 2036 column only) and
    **"Net proceeds from sales" $430,838** (from 2036 onward). 
  - "Type" column present on both tables; old comparison card gone; **no runtime errors.**
  - **Reverted the test sale afterward** (it had autosaved), restoring the scenario.

---

## 9. Gotchas for the next session

- **Sell toggles + synthetic clicks:** `preview_click` / synthetic events do **not** reliably toggle
  the Sell control or open its popup (it has a `mousedown` outside-click handler). Use a **native
  `element.click()` via `preview_eval`** to drive it, or real user interaction. (Matches the existing
  memory note about not editing these via synthetic events.)
- **HMR hook-count errors:** adding a hook (`usePortfolioProjection`) to a component mid-session throws
  *"Rendered more hooks than during the previous render"* until a **full page reload**. These are dev
  artifacts, **not real bugs** — they cleared on reload and the components render fine.
- **Persistence is a JSON blob** (`scenarios.data`) — new optional fields ride along automatically; no
  Supabase migration needed.
- **`usePortfolioProjection` is heavy** and is now called in `PortfolioTab` and `PropertyCardRow` (it
  was already called widely — Dashboard, charts, FinancialSummaryTable). Consistent with the codebase
  but adds compute; if perf matters later, consider a shared projection context.
- **`BASE_YEAR`** = `new Date().getFullYear()` (dynamic; was 2026 this session), NOT a fixed 2025.

---

## 10. Deliberately NOT done / deferred

- **Negative gearing modelling** — not needed (§2.1–2.2).
- **Full legal CGT apportionment** (actual market value at 1 July 2027) — overkill until the bill passes.
- **After-tax cashflow modelling** — a real, *separate* latent gap (the whole tool shows pre-tax
  cashflow, so it slightly overstates holding costs and overstates positive-cashflow deposit-building).
  Out of scope here; worth a future decision.
- **NG in the computed BC fallback** — the blank-BC `(salary + 80% rent) × 6` path has no NG /
  new-build split; minor edge, left as-is.
- **Standalone CGT unit test** — the `evals/` suite tests the **AI-parse pipeline**, not engine math,
  so a CGT regression test would be a new standalone test (like the tsx checks in §4), not an eval entry.

---

## 11. Open questions / watch-items

- **Senate committee report** (was due ~22 June 2026) may change the statutory **definition of an
  "eligible new build"** and the **exact gain-apportionment method** (time-based vs market-valuation).
  If those shift, revisit §4.
- **Does the reform ever drive the roadmap differently than intended?** Currently proceeds use the
  2027-basis CGT everywhere (D6). If the bill fails or is amended, the basis is a one-line change in
  the two sale blocks of `usePortfolioProjection.ts` (`cgt.reform.cgt`).

---

## 12. Next steps / how to ship

1. Review the working-tree diff (uncommitted on `main`).
2. If committing, branch first (don't commit straight to `main`).
3. Consider whether the after-tax cashflow gap (§10) is worth a follow-up — it's the biggest remaining
   accuracy item this work surfaced.

**Related memory:** `memory/project_cgt_neggearing_reform_2027.md` (the persistent index entry for this
work).
