# User-flow & table-language handover — completed 3 Jul 2026

This session started as ideation ("how do we simplify the product?") and ended with
everything built. This document records WHAT shipped, WHY each piece exists, and what's
still open. All work is on branch `design/proppath-refresh`, UNCOMMITTED along with the
wider design refresh — nothing has been banked to git yet.

---

## 1. The problems (from the Ella beta call, 2 Jul 2026)

Watching a first-time buyers' agent use the product surfaced two failures:

1. **"Where do I edit this?"** — Ella tried to edit read-only output figures in the
   Next Purchase Brief. The editable source (the Purchases table) was one tab away and
   nothing pointed to it. Read-only and editable values looked identical.
2. **"What is the product doing?"** — the AI's "you could buy in 2026" timing hint was
   on screen and she never saw it. AI decisions had no persistent, findable home.

Constraint: solve both WITHOUT cluttering the dashboard. Rob explicitly rejected a
first-run guided tour (driver.js stays unused) — affordances must work in-context, at
the moment of confusion, not in a one-off walkthrough people forget.

## 2. The system we settled on (one rule, told three ways)

**"You edit in two places. Everywhere else is a view of the plan."**

| Signal | Meaning |
|---|---|
| Inset column grid + centred values + hover pill | Editable — type here |
| Borderless, ZERO hover response | Calculated view — read only |
| Violet (i) beside a table title | Whole table is calculated; popover has a "Go to Purchases" jump link |
| Grey (i) beside a row label | This one row is set elsewhere (chat / existing portfolio) |
| Bell (with shimmer while unread) | The single home for what the AI decided |

The strict rule that keeps this legible: **hover response anywhere = editable.**
And: an (i) is exclusive to "edited elsewhere" — never a generic help icon.

## 3. What was built and why

### 3a. Editability language (the "where do I edit" fix)

- **Global `td:hover` rule REMOVED from `src/index.css`.** A global grey cell-hover was
  painting every table in the app — the root cause of read-only cells looking editable.
  Never reintroduce it.
- **Read-only tables are stone cold**: all row/cell hover washes removed from
  `FinancialSummaryTable.tsx` and the BriefTab detailed-annual-breakdown table.
- **Editable tables got the refined "Option A" grid** (`PropertyCardRow.tsx` — purchases/
  equity/cashflow modes — and `PortfolioTab.tsx`):
  - vertical `#F2F4F7` hairlines between data columns only (none on the trailing
    remove-X column), whole table inset `px-5 pb-5` so no border touches card edges
  - numeric values AND their headers centred; labels/selects stay left
  - Rob rejected BOTH alternatives live: bare Option A (edge-hitting, uneven) and an
    Option B boxed "table well" (too much chrome). Mocks flatter designs — he judges at
    real density in the app.
- **Table-level (i)** on the two wholly-calculated tables — Financial Summary
  (Dashboard.tsx, Projections sub-tab) and Detailed annual breakdown (BriefTab.tsx):
  violet-chip InfoPopover, copy "Every figure here is calculated from your plan…",
  with a **Go to Purchases** jump link that switches tab/sub-tab. Plumbing:
  `InfoPopover` gained `accent` + `action` props; `ChartCard` gained `titleInfo`;
  `BriefTab` gained an `onNavigateToPurchases` prop fed by Dashboard.
- **Per-row grey (i)** on the three read-only rows inside the (otherwise editable)
  plan-review brief — Strategy, Timeline, Usable equity (`ConfirmationBrief.tsx`;
  `ClientRow` gained an `info` slot). Strategy/Timeline explain "change in chat — the
  whole plan replans"; Usable equity explains it's derived from the existing portfolio
  (80% of value minus loans). This was Ella's exact dead-end.

### 3b. Bell as the home for AI decisions (the "what is it doing" fix)

- **`queueAiInsight()`** added to `ChangeReceiptContext.tsx`. On plan approval,
  `ConfirmationBrief.handleConfirm` logs (a) pull-forward timing hints the user did NOT
  act on and (b) properties the auto-fix dropped, as an "AI insight" entry. Mechanism
  note: the brief renders OUTSIDE the ChangeReceiptProvider (which also remounts on
  approve), so insights go through a module-level queue drained on provider mount +
  a `pp-ai-insight` window event. The entry lands the moment the dashboard appears.
- **Bell shimmer** while unread (`ChangeLogPanel.tsx`) — same sweep as the Retirement
  sell button, amber-tinted, on an inner clipped layer so the badge isn't cut off.
  Panel empty-state copy now mentions AI decisions. `SOURCE_LABELS` gained `ai`.
- Rejected on principle (see memory `project_change_feedback_design.md`): strips,
  toasts, KPI-card callouts. A one-time auto-peek of the panel was floated, not approved.

### 3c. Same-session design polish (Rob-directed, iterative)

- **Total Equity chart** (`ChartWithRoadmap.tsx`): equity Line → Area with the same
  violet 10%→0 gradient as the other charts (`equityFillGradient`), so the chart family
  reads as one set.
- **Year stepper** in Purchases: −/+ buttons made flush (no side padding), stepper
  centred, year column padding reduced — it was overflowing its 64px column.
- **Column widths** normalised to three tiers (72 / 88 / 104 in
  `PURCHASES_COL_WIDTHS`); fixed layout stretches proportionally so the rendered grid
  steps evenly. `minWidth` bumped to 1460.
- **Delete X** violet (`#C4B5FD` → `#7C3AED` hover) in both editable tables, replacing
  grey→red.
- **Font size**: editable-table values dropped 13px → 12px (`text-xs`) to match the
  read-only matrix tables — they were the largest text on screen.
- **The three brief cards** (Purchase costs / Annual cashflow / Deal details in
  BriefTab's purchase sub-tab) restyled to EXACTLY match the Purchases table: 12px,
  grey `#F4F4F5` hover pill + violet-300 focus ring (was violet pill + strong ring),
  normal-weight plain values. Tone ladder (section semibold / net semantic red-green /
  bold totals) preserved.

## 4. Why it's shaped this way (design ground rules that emerged)

- **In-context beats onboarding.** Affordances at the moment of confusion, not a tour.
- **Signals must be scarce to mean anything.** The (i) means one thing; hover means one
  thing. Sprinkling either everywhere would kill both.
- **Match existing patterns, don't invent.** Everything reuses InfoPopover, ChartCard,
  the sell-button shimmer, the change-log bell. One new primitive was added (the
  insight queue) only because the brief lives outside the provider.
- **Rob judges live, not in mocks.** Build it, let him look at real density, iterate.
  Never claim "it's close."

## 5. Still open

1. **Client Inputs derived rows** (Portfolio value / Current debt / Existing annual
   rent, `ClientInputsTab.tsx` ~line 200) — same trap pattern, flagged in the original
   inventory but outside the agreed scope. Candidates for the same per-row (i).
2. **Projections-table kicker** — a one-line "Projected outcomes — change the plan in
   Purchases" under the Financial Summary title was proposed; the title (i) may be
   enough. Rob to judge after living with it.
3. **Rob's visual sign-off** on the full set — everything compiles and renders, but
   the dashboard is behind his login; final verdicts are his.
4. **Committing.** The branch carries the entire design refresh + Ella fixes + all of
   the above, uncommitted. Rob has deliberately deferred committing — ask before
   banking anything.

## 6. Repo / environment notes

- Branch `design/proppath-refresh`; dev server `npm run dev` (port 8080 — Rob usually
  has his own running; a preview instance may grab another port).
- TypeScript (`npx tsc --noEmit`) clean as of handover.
- Memory files `project_userflow_approach_jul2026.md` and
  `project_ella_beta_feedback_jul2026.md` carry the durable context; this file is the
  detailed record.
