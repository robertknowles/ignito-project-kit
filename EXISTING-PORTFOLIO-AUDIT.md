# Existing Portfolio — audit of James's three concerns (17 Jul 2026)

Read-only investigation (three parallel traces + two live probes through the production nl-parse pipeline). **All three concerns are confirmed**, each with a precise mechanism. Nothing has been fixed yet — fix sketches are at the bottom, sized.

---

## Claim 1 — "Data isn't carrying over through the flow, especially edits" → PARTIALLY CONFIRMED (4 real breaks)

The core plumbing is actually sound: Portfolio-tab edits DO reach the engine immediately (equity-release timing, sale year, entity, refinance toggle all read per-property — `affordabilityEngine.ts`), profile aggregates ARE resynced on edit (`PortfolioTab.tsx:477-482`), and save/load round-trips the full per-property list verbatim. What genuinely breaks:

1. **Dead editors on Client Inputs.** The "Portfolio value / Current debt / Existing rent" fields (`ClientInputsTab.tsx:204-206`, `ClientInputsPanel.tsx:234-247`) write profile aggregates that every engine **ignores whenever per-property rows exist** — and the next Portfolio-tab edit or chat sync silently overwrites them. Editing these fields does nothing to the plan. This alone explains most of "my edits don't carry over."
2. **Chat corrections to existing holdings either no-op or clobber.** Telling the chatbot "the PPOR is actually worth 900k with 400k owing" takes one of two paths: (a) the AI returns aggregate fields → mapper writes profile aggregates → engine ignores them → chat says "updated", dashboard doesn't move; or (b) the AI returns a full `existingPortfolio` array → `handleUpdateProfile` **replaces the whole list** through `mapToExistingProperties`, which re-defaults everything — entity gone, growth→Medium, holding costs→defaults, saleYear/allowEquityRelease/overrides/photos wiped, new IDs. Every Portfolio-tab edit is lost in one message.
3. **Entity never survives the brief.** The confirmation brief has an Entity control, but `entity` isn't in the existing-portfolio schema and the mapper never maps it — a Trust/SMSF property lands in the store as `individual`, so serviceability discounts and CGT run on the wrong entity.
4. **Adjacent calc bug found in passing:** `projectionEngine.ts:481-482` grows an existing property's *current* value from `boughtYear` (other paths grow from BASE_YEAR/now) — entering a real historical bought year inflates that property's projected value by years of growth applied to today's value.

## Claim 2 — "Chatbot can't answer existing-portfolio questions (net cash flow after tax in year 3)" → CONFIRMED

The AI *does* receive the existing properties (address, value, loan, equity, rent, rate — live post-edit values; the 6523c33 block is deployed in nl-parse v75). What it does **not** receive is any cashflow series — no per-year data, no after-tax line, no existing-only cut. `enginePlanState` is horizon-year-only.

Live probe with James's exact question: the AI doesn't deflect — it **invents** an operating-cost percentage and a tax calc and answers confidently. Two identical runs at temperature 0 gave **−$5,586/yr and −$6,572/yr** (~18% apart). Asked about the whole plan's year 3, it correctly admitted it only has horizon figures — then offered to "run a cashflow snapshot and pull the Year 3 output from the engine", a capability that doesn't exist. Meanwhile the engine computes real per-year after-tax cashflow (incl. per-existing-property NG benefit) — it's just never sent to chat.

## Claim 3 — "Client submits form with existing portfolio → confirmation brief isn't filling out correctly" → CONFIRMED

Root cause: the client's **structured** form data is rendered into prose and round-trips through the AI, and the form's per-property fields never reach the real store. Confirmed broken in the brief (live probes):

- **Entity lost + corrupts Loan type.** The schema has no `entity` on existing properties, so the model stuffs "Trust"/"SMSF" into `loanType` → brief shows Entity = **Individual** and a loan-type toggle with **no segment selected**; on approve the corrupt string reaches the engine, which treats it as P&I (overstated repayments).
- **State fabricated** per property (form never asks; schema requires it; model invents NSW/QLD and tags it "user" so it can't render amber).
- **Bought year: shows 2020, saves 2026** (brief default vs mapper default differ) — the BA approves one thing, the save contains another.
- **Purchase price silently = current value** (form only collects value).
- Intermittent: deposit pool inflated by usable equity (double-counts with engine equity release); the AI's correct `allowEquityRelease: false` for SMSF gets force-flipped on.
- Also: the form's per-property list lands only in display-only `clientSubmittedInputs` — **the Portfolio tab stays empty** and the engine never sees per-property fidelity from the form path at all.

Value, loan balance, weekly rent, and the usable-equity row come through correctly.

---

## Fix plan (sized, not yet built)

| # | Fix | Size |
|---|---|---|
| 1 | Add `entity` to existing-portfolio schema (create_plan + update_profile) + mapper passthrough + sanitise `loanType` to IO/PI in validation (rescue entity words) | S — kills the worst brief corruption AND claim-1 break #3 |
| 2 | Onboarding form: map `clientSubmittedInputs.existingProperties` → real `ExistingProperty[]` store on submit/first-load (skip the prose round-trip for structured rows) | S-M — fixes the form path structurally |
| 3 | update_profile: MERGE AI portfolio rows into the current list instead of replace; send saleYear/allowEquityRelease in currentPlan so the AI can echo them | M — kills the clobber |
| 4 | Client Inputs aggregates: read-only + jump-link to Portfolio tab when per-property rows exist | S |
| 5 | Chat: add per-year after-tax cashflow series (and an existing-only line) to enginePlanState + prompt guardrail "never invent opex/tax; if a figure isn't in the series, say the engine holds it" | M — makes James's question answerable with the engine's real number |
| 6 | Brief honesty: align boughtYear default (display vs save), make state optional/amber when not stated | S |
| 7 | projectionEngine boughtYear growth-basis bug | S, needs a suite re-run |

Full detail per finding lives in this audit's source traces (session 17 Jul). Suggested order: 1 → 2 → 3 (data integrity), then 5 (chat quality), then 4/6/7.

---

## STATUS: ALL 7 FIXED — 17 Jul 2026, nl-parse redeployed (v76)

1. ✅ `entity` on existing-portfolio schema (create_plan + update_profile), mapper passthrough, `loanType` sanitised to IO/PI with entity-word rescue ("trust" in loanType → entity trust, loanType IO).
2. ✅ Onboarding form now writes real `ExistingProperty[]` rows into the scenario (`submittedPortfolioMapper.ts`); the BA "Add client details" path seeds a scenario row so the Portfolio tab hydrates before the AI ever runs. State/address honestly blank, not fabricated. Client re-submissions never clobber BA-curated rows.
3. ✅ Chat corrections now MERGE into the portfolio on file (match by address, else order; only AI-supplied fields overwrite; unmatched rows kept) — Portfolio-tab edits survive chat turns. `saleYear`/`allowEquityRelease` now travel in the chat payload so the AI can echo them. Prompt instructs partial-row corrections + aggregate-fields-are-ignored warning.
4. ✅ Client Inputs portfolio value/debt/rent rows render read-only derived values with an (i) jump-link to the Portfolio tab whenever per-property rows exist (both ClientInputsTab and the legacy panel).
5. ✅ Engine now emits `existingOnlyCashflow` per year (after-tax, incl. NG benefit); ChatPanel sends the full per-year after-tax series (whole-plan + existing-only) in `enginePlanState.cashflowByYear`; the prompt renders it as a cite-verbatim table with hard guardrails (never invent opex/tax; never claim it can run the engine). James's "year three" question is now answerable with the engine's real number.
6. ✅ Brief honesty: bought-year display default = current year (matches what saves); existing-property Entity control offers all four structures (dropdown — four segments don't fit); junk loanType displays as IO instead of an unselected control.
7. ✅ `projectionEngine` existing-property value growth now compounds from BASE_YEAR, not boughtYear (currentValue is today's value; the old basis double-counted past growth).

Verification: build clean; engine suite unchanged at 10/23 PASS with zero regressions (incl. both existing-portfolio cases); live AI runs pass on the existing-portfolio cases with the new payload + merge; no new lint errors on touched files. Note for the planned-property side: the brief's planned-property Entity control still only offers Individual/Trust (out of scope here).
