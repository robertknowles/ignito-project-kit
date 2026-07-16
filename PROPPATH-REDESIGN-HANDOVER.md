# PropPath Dashboard Redesign — HANDOVER (Jul 2026)

> **Read this top-to-bottom before touching anything.** The redesign is now **substantially
> complete** — the whole app has been reskinned to the locked PropPath prototype. This handover
> captures the finished state, the method that worked, and the small set of things still open.
>
> **Branch:** `design/proppath-refresh` · **Status:** 16 files modified, **ALL UNCOMMITTED** (see §5).
> Rob has not asked to commit yet. `npm run build` passes clean (~6.3s).
>
> **Mission (unchanged):** apply the locked PropPath design system to the live app as
> **presentation-only** changes. Calculation engine, contexts, hooks, and data flow stay exactly as
> they are.

---

## 0. TL;DR — current state

Every tab now matches the prototype and was verified live in Rob's Chrome:
- **Shell:** page bg `#FAFAFA`, sticky white top navbar, violet-active sidebar, underline top-tabs,
  segmented sub-tabs. AI assistant = 56px circular violet FAB + popover (bottom-right).
- **Portfolio Plan → Purchases:** split hero card, record-table Purchases, the 4 plan charts
  (Total Equity / Net Cashflow / Borrowing Capacity / Portfolio Cashflow) + Property Roadmap.
- **Portfolio Plan → Projections:** Financial Summary matrix — REBUILT 2 Jul 2026 after Rob flagged
  it still looked nothing like the prototype (a previous session had claimed it done with only the
  weight ladder applied). Now prototype-exact: no vertical cell grid, no spacer bands, hairline
  above each section start + stronger `#D5D7DA` rule above Net, Expenses/Loans indented as
  breakdowns, right-aligned 12px numbers, sticky 200px label column, semantic-red negatives,
  `#FAFAFA` row hover. Same pass fixed the Brief's Detailed annual breakdown, Client Inputs
  (both cards), and the Purchases block-card KV tables — see §4.
- **Next Purchase Brief → Performance:** ONE big 3-line chart + return-metrics rail (§3.11).
- **Next Purchase Brief → Purchase:** KPI bar + donut/LVR + three peer tables (§2.5).
- **Existing Portfolio:** segmented KPI bar + 3 comparison bar charts + record table.
- **Client Inputs / Retirement:** inherit the reskinned primitives.

**Grey ramp is now systemic** — `tailwind.config.ts` remaps the whole `neutral` scale to the UUI
hexes, so every `neutral-*` class resolves to the brand ramp app-wide.

**2 Jul 2026 PM round (Rob-flagged, all verified live):**
- **Shell sizing:** `SIDEBAR_WIDTH` 256→240 (`AppSidebar.tsx`, single source used by `App.tsx`
  margins); top navbar row → `h-[62px]` with tabs `h-full self-stretch` (`Dashboard.tsx`) —
  prototype header is 62px, app was 46px.
- **KPI bars:** Brief KPI row + Existing Portfolio KPI row cells → prototype spec
  `px-[18px] py-4`, 12px label, `mt-2`, 24px value (`BriefTab.tsx`, `PortfolioTab.tsx`).
- **Brief → The Performance:** now two peer cards (chart flex-1 + 280px Return-metrics card,
  replacing the single card w/ internal border-l rail); chart title 14px/600 `#181D27` (custom
  card div, NOT ChartCard — deliberate prototype exception); legend on the title row as 16×3px
  rounded bar swatches, 11px `#717680` labels, still click-to-toggle; HorizonToggle kept at right.
  `BriefPerformanceCharts.tsx`: axis ticks 11px/400 `#A1A1AA` (was 600 `#717680`), grid `#F0F1F4`,
  line weights 2.75/2.75/2.5, X ticks every 5 years + last (2026/2031/…/2045), Y = niceCeil/4
  round steps with HALF-step ticks below zero (prototype −$150K pattern).
- **INVERTED HOUSE PIN (Rob: old one read as a tree; wanted dark fill):** new pin = accent-filled
  disc (`#7C3AED`, red when challenging) + white 1.5 ring + SOLID WHITE house silhouette
  `M 0 -4.3 L 4.1 -0.9 L 4.1 4.1 L -4.1 4.1 L -4.1 -0.9 Z` + accent door rect (x −1.1, y +1.5,
  2.2×2.8, rx 0.5). v2: the first cut had roof EAVES overhanging the walls — at small sizes the
  two eave spikes + door notch read as a STAR (Rob caught it). The glyph is now an eaves-free
  pentagon (roof flush with walls) so it reads as a house at any size. Applied in `InvestmentTimelineChart`,
  `BorrowingCapacityChart`, `PropertyRoadmapChart` (roadmap unlock/padlock + $ glyphs went white
  on filled discs too; legend rings → filled dots). Goal/target + Cash-goal pins stay white
  outline — deliberate contrast: filled = purchase events, outline = goals. This DIVERGES from
  the prototype's white-disc pins at Rob's request.
- **Roadmap labels:** ALL amounts/years now above their badge (prototype top:0); labels closer
  than ~44px stagger one 12px step higher. **Same-year events also offset horizontally ±10px**
  (unlock + pull in one year used to stack badges, hiding one and its tooltip — now both visible
  and hoverable). The old deferred label-dodge nit is fixed.
- **Plan-chart space fixes (Rob round 3):** the hidden tooltip-only `<Line>`s in `CashflowChart`
  (income/expenses) and `BorrowingCapacityChart` (ceiling/liabilities) were silently STRETCHING
  the Y domain (Recharts extends `domain` to fit all series) — plots were squashed into the
  bottom third. Fixed with a hidden second Y axis (`yAxisId="tooltipOnly"` + `<YAxis hide/>`).
  Both charts now `flex:1, minHeight:240` + `height="100%"` so they FILL their card when the grid
  sibling is taller (ChartCard content div is now `display:flex; flex-direction:column`). Gutters
  tightened across the three plan charts: YAxis width 50→42, margin right 20→8.
- **Existing Portfolio → prototype-exact (Rob round 3):** KPI values compact via `fmtKpi`
  ($1.16M / $512k / -$6.9k/yr / $280k); table numerics right-aligned + comma-grouped (NumCell
  `grouped`/`right` props; per-column `width` on the fixed-layout table, minWidth 1620, px-3
  cells); bar charts: NO gridlines (baseline/zero only), 9px/400 `#A1A1AA` category labels,
  bar radius 2, barGap 10 / barSize 28 (48 waterfall), legend = `square` variant (new 8×8 rx2
  in ChartCard) via `legendBelow`, Borrowable legend 2 items and its bar `#8B5CF6` (dc.html —
  NOT the darker violet it appears in screenshots).
- **Brief standalone charts reinstated:** `Cashflow projection` + `Growth projection` cards
  below the hero (2-col), rebuilt as one shared `BriefAreaChart` (BriefPerformanceCharts.tsx):
  same axis/grid/zero-line language as the hero, violet `#8B5CF6` / ink `#7C3AED`, round Y
  ticks w/ half-step below zero, 5-year X ticks, mid+end value labels on the line.

**Still open (small):** see §6. Nothing structural — mostly data-dependent verification + one
deferred chart-label nicety.

---

## 1. THE GOLDEN RULES (these are why it finally landed — keep following them)

1. **Compare against the PROTOTYPE, visually.** The rendered prototype at `http://127.0.0.1:8899/…`
   IS screenshot-able (just not DOM-measurable — its text lives in a `<script>`, so
   `querySelectorAll` finds nothing). Method that works: **screenshot the prototype view, screenshot
   the same app view, diff them by eye + measure the APP with `getComputedStyle`** against the spec
   hexes. Every "heaps of issues still" round came from NOT opening the prototype first. Open it.
2. **MEASURE the app, don't eyeball.** Chrome MCP `javascript_tool` → `getComputedStyle` on matched
   elements, diff vs §3 values. Probe that works:
   ```js
   const norm=s=>(s||'').replace(/\s+/g,' ').trim();
   const el=[...document.querySelectorAll('*')].find(e=>e.children.length===0 && norm(e.textContent)==='Total Equity');
   const c=getComputedStyle(el); ({size:c.fontSize,weight:c.fontWeight,color:c.color,tracking:c.letterSpacing});
   ```
3. **FUNCTIONALITY IS SACRED (Rob's #1).** Presentation-only. Never edit `src/engine/…`, contexts,
   computing hooks, `constants/financialParams.ts`, `integrations/supabase/…`, or any component's
   props / exported types / event handlers. Keep editable cells, drag-drop pins, toggles,
   time-range toggles, tooltips, the scrubber, the chat wiring all working. **Derive** display
   values from existing engine outputs; never hardcode the prototype's mock numbers over live data.
4. **Each chart hardcodes its own colours** in a local `const UUI = {…}` block. Editing components
   directly is the norm. The ONE systemic exception is grey: it now lives in the Tailwind config.
5. **Build after every screen** (`npm run build`) — `noUnusedLocals` is false, so dead code won't
   fail it, but real type errors will.

---

## 2. ENVIRONMENT & HOW TO VERIFY

- **Repo:** `/Users/robknowles/Projects/Code_Repo/ignito-project-kit`, branch `design/proppath-refresh`.
- **App dev server (8080):** `npm run dev`. Rob stays logged in (localStorage per-origin). If the
  tab shows an error page, the server died — restart it.
- **Prototype server (8899):** already running this session; if not, from the bundle dir
  `python3 -m http.server 8899 --bind 127.0.0.1`.
- **Prototype bundle (gitignored):** `design_handoff_proppath_dashboard/`
  - `PropPath Design System.md` — **THE SPEC. Source of truth. Read fully.**
  - `PropPath Dashboard Refined.dc.html` — exact markup/spacing/colours (read from disk for values).
  - `PropPath Dashboard (open in browser).html` — the rendered picture (screenshot-able; not DOM).
- **Chrome MCP:** `list_connected_browsers` → `select_browser` (deviceId of "Browser 1") →
  `tabs_context_mcp`. Load tools:
  `select:mcp__claude-in-chrome__javascript_tool,…computer,…navigate,…tabs_context_mcp,…list_connected_browsers,…select_browser`.
  Two tabs typically: **8899** = prototype (target), **8080/dashboard** = app (WIP). You can click
  the prototype's own tabs (Portfolio Plan / Next Purchase Brief / Existing Portfolio) via the MCP
  `computer` tool to navigate its views for comparison.
- **Open a plan in the app:** on the landing (client picker) click a "Recents" card — "Rob $6.8M"
  is the usual test plan (Portfolio Plan → Purchases). Reload resets to the picker.
  - ⚠️ Note: the "Rob" plan has **no existing properties** (blank $0 placeholders), so the Existing
    Portfolio comparison charts render EMPTY there — that is a data state, not a bug. To see those
    bars populated, open a client that actually has existing properties (the prototype mocks 3).

---

## 3. EXACT DESIGN TOKENS (from the spec — verbatim)

**§1.2 Grey ramp** — now encoded in `tailwind.config.ts` as the `neutral` scale, so `neutral-*`
classes are correct everywhere:
`50 #FAFAFA · 100 #F5F5F5 · 200 #E9EAEB (borders) · 300 #D5D7DA · 400 #A1A1AA (axis) ·
500 #717680 (meta) · 600 #535862 (secondary) · 700 #414651 (body) · 800 #252B37 · 900 #181D27
(primary) · 950 #0C111D`. Dividers `#F2F2F2`. Page `#FAFAFA`. Card `#FFFFFF`.

**§1.1 Accent (violet):** `#7C3AED` ink (text/interactive/markers) · `#8B5CF6` fill (chart
lines/fills) · tints `#F5F3FF` (violet-50, hover pill) · `#EDE9FE` (violet-100) · `#D9D2F2` (tint2 —
"Out"/secondary bars, headroom swatch) · `#C4C4CC` scrubber/dashed-reference-grey · `#98A2B3`
principal-line grey.

**§1.3 Semantic (SIGN ONLY):** `#17B26A` positive · `#F04438` negative. Only on figures whose sign
carries meaning (net cashflow, CoC, per-property net). Never decorative.

**§1.4 Stat ramp:** `46px hero · 28px chart headline · 24px KPI · 18px paired stat · 13px body ·
11px meta`. Weight 600 for numbers, −0.02em (−0.025em on the 46px hero).
- **Number format:** headline stats abbreviate ≥ $1M (`$3.58M`); axis ticks always compact
  (`$0/$500k/$1M/-$10k`). Brief table values carry their unit (`$20,966`, `88%`, `$420/wk`).

**§1.6 Surfaces:** white cards, 1px `#E9EAEB`, 14px radius, on `#FAFAFA`, minimal/no shadow.

**§2.2 Tables — two archetypes:**
- **Record** (Purchases, Existing Properties): flat. 11px/500 `#717680` headers, 13px cells, Year
  anchor `#181D27`/500, string cells `#414651`, numerics `#535862` **right-aligned**, `#F2F2F2` row
  dividers + `#FAFAFA` hover, **no vertical dividers**, cell pad ~`8px 16px`.
- **Matrix** (Financial Summary, Brief Annual cashflow): 3-step weight ladder — section lines flush
  `#181D27`/500, breakdowns indented + `#717680`/400 + numbers `#535862`, **Net** the one 600 +
  stronger rule (`#D5D7DA`), semantic-red when negative. No grey band headers.

**§2.4 Tabs:** top = underline (violet text + 2px `#7C3AED` border active, `#717680` inactive);
sub-tabs = segmented control (track `#F2F2F3` p-3px r-9px, active pill white r-7px + shadow
`#181D27`, inactive `#717680`, 13px/600, pad 6×14, icon 15px).

**§2.6 AI FAB:** 56px circular violet FAB fixed `right:28 bottom:28 z-50`, white sparkle; click →
360px popover above with green online dot + close X + greeting + input.

**§3.5/§3.9/§3.9a Axis system:** plan charts get a full-height round-number Y frame (smallest round
ceiling above the data max on the top gridline, `$0`/floor on baseline, 5 evenly-spaced labels),
9px `#A1A1AA` labels right-aligned in a 50px left gutter, no spine, gridlines `#F0F1F4`,
baseline/threshold one step stronger (`#E4E7EC`, or `#D5D5DB` for §3.3 zero). Sparse X (~5 ticks).

**§3.1/§3.2 Pin family:** stem (violet) from an r=3 dot → 8.5px white circle + `ink` ring 1.4 + fine
glyph (house `M -4.6 0.9 L 0 -4.3 L 4.6 0.9 M -3.4 0 L -3.4 4.5 L 3.4 4.5 L 3.4 0` = purchase;
concentric circles = goal; open padlock = equity unlock; `$` = equity pull).

**§3.10 Bar charts (Existing Portfolio):** primary `#8B5CF6`, secondary tint `#D9D2F2`, `#7C3AED`
accent for the answer bar; grouped baseline `#E4E7EC`; diverging zero-line `#D5D5DB`. Truthful scale.

**§3.11 Brief Performance:** ONE big line chart — Capital growth `#7C3AED`, Net cashflow `#8B5CF6`,
Principal paid down `#98A2B3` — with Yr10(mid)+Yr20(end) value labels overlaid on each line, §3.9
full-height Y with negative floor; RHS "RETURN METRICS" rail: Gross yield · Capital growth ·
Cash-on-cash (sign-coloured) · ROIC, each Year 1/10/20, stacked. NO separate cashflow/growth cards.

---

## 4. WHAT WAS DONE (this multi-session effort — all verified live, build clean)

**Shell / global**
- `tailwind.config.ts` — added the `neutral` scale = UUI ramp (§1.2). **The systemic grey fix.**
- `Dashboard.tsx` — split **hero band** (violet-tint goal half, 46px number, sign-coloured net);
  **sticky white top navbar** (`px-7`) + content column bg `#FAFAFA`; **underline top-tabs** +
  **segmented sub-tabs**; chart headline sizing.
- `AppSidebar.tsx` — nav 13/500 `#414651`, violet-tint active + `#7C3AED` text/`+`, `#717680` 18px
  icons, violet BETA pill, footer name/email. "My Company" white-label name kept (intentional).
- `ChatPanel.tsx` — minimized → 56px circular violet FAB; expanded → fixed 360px popover (green
  dot + close X). Chat body/wiring untouched. (`onHeaderMouseDown` now unused; harmless.)
- `ui/ChartCard.tsx` — single flat white card primitive (from a prior session).

**Portfolio Plan**
- `PropertyCardRow.tsx` — Purchases table → §2.2 record archetype; block-card borders → ramp.
  Block-card KV/num/select rows (card view) re-done 2 Jul 2026 to the §2.5 record family
  (shared `blockLabelCls`/`blockInputCls`): `#F2F2F2` dividers, no vertical rule, label
  `#717680`/500 13px, values right-aligned `#535862`/500, violet-50 hover pill + `#7C3AED`
  focus ring; dropdown selected item violet tint; `SelectInput` grew an optional `className`
  (table view unchanged).
- `InvestmentTimelineChart.tsx`, `CashflowChart.tsx`, `BorrowingCapacityChart.tsx` — pins, round-Y
  frames, sparse X, headroom band (prior session) + local-palette grey fixes.
- `PortfolioCashflow.tsx` — grey `#C4C4CC` scrubber, year labels above pins `#414651`,
  **muted-until-purchased rows** (union of `data.snapshots` → `activeById` lookup; pre-purchase rows
  = grey text + empty tracks + `—`), In/Out `#8B5CF6`/`#D9D2F2`.
- `PropertyRoadmapChart.tsx` — grey lifelines, glyph pins, Refinance marker dropped (prior session).
- `FinancialSummaryTable.tsx` — REBUILT to prototype-exact §2.2 matrix (2 Jul 2026): the prior
  session had only applied the weight ladder and left a full vertical cell grid
  (`border-r border-neutral-100` on every cell), spacer rows between groups, centred values,
  black Net negatives, and Expenses/Loans styled as section rows. Now: hairline `#E9EAEB` above
  each section start (none above Equity — it follows Debt), `#D5D7DA` rule above Net (and Total
  Equity when sales exist), sub-rows label `#717680`/`pl-[34px]`, numbers `#252B37`@500 (totals) /
  `#535862`@400 (breakdowns) / `#181D27`@600 (Net), negatives `#F04438`, right-aligned, sticky
  white 200px label column, `hover:bg-[#FAFAFA]`, table min-width `200 + years×80`.

**Next Purchase Brief**
- `BriefTab.tsx` — **KPI = single segmented bar** (shared by both sub-tabs); **Purchase tab** = 3
  equal peer tables (Purchase costs · Annual cashflow · Deal details); Annual cashflow = §2.2 matrix
  ladder via `EditableNumRow` `tone` prop (section/breakdown/net) with **$ units** and semantic-red
  Net; Deal details trimmed to the prototype's 10 rows with unit-formatted values (`unit` prop:
  money/pct/weekly); `.editable` violet-50 hover-pill on all values; donut/LVR → violet ramp;
  sub-tabs → segmented; **Performance rail** = Gross yield · Capital growth · CoC(red) · ROIC.
- `BriefPerformanceCharts.tsx` — Performance chart → 3 lines (dropped the redundant 4th), §3.11
  colours, **Yr10/Yr20 value labels** via `LabelList`, zero-line `#D5D5DB`, right margin for end
  labels. (The old two `BriefCashflowChart`/`BriefGrowthChart` are now unused imports — harmless.)
- `BriefTab.tsx` **Detailed annual breakdown** — REBUILT to the §2.2 matrix (2 Jul 2026): was
  still full cell grid + bold black headers + spacer rows + grey band on Net annual cashflow +
  black negatives. Now: 11px/500/`#717680` headers, hairline above section starts (Property
  value / Principal payments / Gross income / Capital growth / CoC — `sectionStart` flag replaced
  `spacerBefore`), `#D5D7DA` rule above the 3 `strong` rows, Interest/Operating expenses indented
  `pl-[34px]` `#717680`, plain labels `#414651`, At-purchase column `#717680`, negatives `#F04438`
  (detected via `v.startsWith('-')`), sticky 240px label column, row hover.

**Client Inputs** (2 Jul 2026 — was still old-style despite the "inherits primitives" claim)
- `ClientInputsTab.tsx` — Client details → §2.5 record rows: label `#535862`/400 13px, values
  right-aligned `#181D27`, `#F2F2F2` dividers, NO vertical rule; Usable equity = the one 600 row
  with `#FAFAFA` band; editable inputs/selects right-aligned with grey hover + violet focus ring.
  Events → prototype rows: 26px `rounded-[7px]` icon chips (violet-100/`#7C3AED` configured,
  `#F2F2F3`/`#717680` unconfigured), 13px/500 labels (`#181D27` / `#A1A1AA` unconfigured), year
  right in 12px `#717680`, violet "＋ Add event". Remove-X kept. Note: event labels render Title
  Case from `EVENT_TYPES` ("Salary Change" vs prototype "Salary change") — functional constants,
  left alone.

**Existing Portfolio**
- `PortfolioTab.tsx` — KPIs → **single segmented bar** (compact `py-3.5` + `leading-none`),
  sign-coloured net cashflow; 3 comparison bar charts recoloured to exact §3.10 ramp (grouped
  baseline `#E4E7EC`, diverging zero-line `#D5D5DB`); Existing Properties table → §2.2 record
  archetype.

**Misc:** `ChangeLogPanel.tsx` — `#737373`→`#717680` literal fix.

---

## 5. WORKING-TREE STATE (all uncommitted)

17 modified files:
`AppSidebar, BorrowingCapacityChart, BriefPerformanceCharts, BriefTab, CashflowChart,
ChangeLogPanel, ChatPanel, ClientInputsTab, Dashboard, FinancialSummaryTable,
InvestmentTimelineChart, PortfolioCashflow, PortfolioTab, PropertyCardRow,
PropertyRoadmapChart/PropertyRoadmapChart, ui/ChartCard` + `tailwind.config.ts`.
(`ClientInputsTab` joined the set 2 Jul 2026 in the matrix/record-table fix pass.)

`npm run build` ✓ (~6.3s; only pre-existing chunk-size + browserslist warnings).
Rob hasn't asked to commit. Suggested first commit if he does: one checkpoint
`Reskin dashboard to PropPath prototype` (or split per-screen for easy revert).

---

## 6. STILL OPEN / TO VERIFY (small)

1. **Existing Portfolio charts with real data.** Structure + colours match the prototype, but the
   test "Rob" plan has no existing properties so the bars render empty. Verify against a client that
   HAS existing properties (or drop temporary values into one property to confirm the grouped /
   diverging bars, then clear — don't leave test data in a saved plan).
2. **Property Roadmap same-year label overlap** (deferred polish). Labels already alternate
   above (purchase/unlock) / below (equity pull) and read fine with real data; only clusters of
   many same-year events across rows can still touch. Needs label-dodging if Rob wants it.
3. **Brief "Property management" row** shows the % rate (`8.0%`), while the prototype shows the $
   management fee (`$1,677`). Left as % to avoid touching the cashflow calc — confirm with Rob
   whether he wants the $ amount (needs the computed fee from the engine, not a presentation change).
4. **"Less vacancy"** shows positive `$874`; prototype shows `-$874`. Cosmetic; the label implies
   the deduction. Negate for display only if Rob wants the exact minus sign.
5. **Retirement sub-tab** inherits ChartCard + the ramp; sanity-check it once against the prototype.

---

## 7. RECONCILIATION — locked decisions & must-keeps

- **Locked prototype divergences (keep):** Borrowing Capacity headroom band (2 lines + band, Total
  Liabilities in tooltip); Net Cashflow signed fill + grey $0 line; Total Equity 2 lines + house
  pins + goal pin; Property Roadmap grey lifelines + glyph pins, Refinance marker dropped (calc
  kept); Financial Summary matrix ladder; Brief Performance one chart + rail; Brief Purchase three
  peer tables + Deal-details-mirrors-KPI (the one allowed redundancy); Existing Portfolio segmented
  KPI + comparison bars; AI = FAB + popover.
- **App features the prototype never drew — MUST PRESERVE (restyle, don't remove):** editable table
  cells + change-log bell; drag-drop pins + guardrail validation; Sell/LMI toggles; 10/20/30y
  toggles; Client Inputs + Retirement; Compare page; Existing-Portfolio sub-charts; expand-chart
  modals; the refinance **calculation**. Deal-details fields removed from the Brief view (Valuation,
  Loan amount, Loan term, Growth, funding breakdown) remain editable in Portfolio Plan → Purchases.

---

## 8. SPEC INDEX (`PropPath Design System.md`)
§0 governing principle · §1.1 accent · §1.2 grey · §1.3 sign · §1.4 stat ramp + number format ·
§1.6 surfaces · §2.1 hero pair · §2.2 tables · §2.4 tabs · §2.5 Brief→Purchase IA · §2.6 AI FAB ·
§2.7 editable affordance · §3.1 house pin · §3.2 goal pin · §3.3 threshold/signed fill · §3.5
axis+inset · §3.6 headroom band · §3.7 cashflow scrubber · §3.8 Roadmap · §3.9/§3.9a full-height Y ·
§3.10 bar charts · §3.11 Brief performance chart. Changelog at the bottom records every decision.
