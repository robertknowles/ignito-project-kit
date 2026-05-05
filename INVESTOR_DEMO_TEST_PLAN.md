# Investor Demo Test Plan

Date: 2026-05-04 (last updated 2026-05-05)
Purpose: Manual test script for personally validating the platform before investor demo. Designed to surface glitches in chatbot reliability, multi-client persistence, and navigation flows that real testers will accidentally trigger.

## How to use this document

Run sections in order. Each test has an **Expected:** line — match what you see against it. If they match, mark PASS and move on. If they don't, mark FAIL with a one-line note.

- **PASS** — what you see matches "Expected"
- **FAIL — [description]** — what went wrong, exact input used, what you saw
- **WEIRD — [description]** — works but feels off (slow, confusing, ugly)

Anything in FAIL or WEIRD is a fix candidate before investors hit it.

### When to reset / start fresh

Don't reset between every test — most tiers share state on purpose. The rule:

| Section | Fresh scenario between tests? | How to do it |
|---|---|---|
| **Tier A** (A1–A6) | Yes — each one tests fresh plan generation | Create a **new client** for each. Cleaner than "Reset Scenario" and tests multi-client behaviour incidentally. |
| **Tier B** (B1–B6) | No | Run all six on the same plan generated from one Tier A test. |
| **Tier C** | Mixed | C1, C2, C3 need fresh (new client). C4, C5 need a plan to already exist (run after a Tier A or after C1–C3). |
| **Tier D** (megachain) | No | Single uninterrupted session. No resets within. |
| **Platform flows 1–6** | Per flow as written | Some need fresh state (Flow 1, 2, 6), others build on existing state. |
| **Persistence flows 7–14** | No | These tests are *about* state persistence — resetting would defeat them. |

In practice you'll create about 6–8 new clients during the chatbot section, and zero resets after that.

---

## Part 1 — Chatbot Stress Tests

### Tier A: Complex initial plans

Run each in a **fresh chat session** (new client, or new scenario on existing client).

**Test A1 — High-net-worth PPOR owner pivoting to investment**
```
My client David owns a home in Mosman worth about 3.2m with 1.1m left on the mortgage. He earns 280k, wife Sarah earns 180k. They save about 12k a month. Want to use their equity to build a portfolio — thinking 4-5 properties over 10 years, aiming for $4m equity. Mix of growth and yield.
```
**Expected:** Plan generated immediately (no clarifying questions). 4-5 properties shown on dashboard. Mix of growth and yield modes. Chat message references the existing PPOR equity as a deposit source. Goal verdict reads as "comfortable" or "well positioned" given the income. Refinement option buttons appear.

**Test A2 — Low-income first-timer with aggressive goals**
```
Got a young bloke, 26, earning 72k, saving 1500 a month, has 35k saved. No property. Wants to build a portfolio of 5+ properties. He's been watching YouTube and wants to "retire in 10 years on passive income." Be realistic with him.
```
**Expected:** Plan generated. Properties priced in the $350-500k band (low-cap). Chat message uses "stretch — likely lands meaningfully short" or "isn't realistic" wording for the 5+/10-year goal. 2-3 specific gap-closers offered (extend horizon, lift deposit, etc). 88% LVR + LMI capitalised on the properties.

**Test A3 — Couple with existing IPs wanting to scale**
```
Couple — Tom 145k, Rachel 110k. They already have 2 IPs — one in Brisbane worth 680k owing 520k, another in regional NSW worth 450k owing 380k. Saving 6k a month. Have 90k liquid. Want to get to 6 properties total over 12 years. Borrowing cap is 1.4m.
```
**Expected:** Plan generated for **4 new** properties (so total = 6 with existing 2). Chat acknowledges the existing IPs explicitly. Borrowing capacity of $1.4m respected — properties priced accordingly (mid band, $500-700k range). No "missing input" nudge for borrowing capacity.

**Test A4 — The $10M residential pivot to a single IP**
```
Client owns a home worth 10 million in Toorak, no mortgage. Earns 400k. Wants to sell the home and use the proceeds to buy one investment property only — a single high-end residential investment around 8-9 million. What does a single-asset portfolio look like over 15 years?
```
**Expected:** Single property shown (N=1). Property priced near $8-9m. Chat doesn't refuse or pad to a default count. Goal verdict matches the single-asset compounding (likely "comfortable" given the price).

**Test A5 — Commercial transition path**
```
Sarah and Mike, combined 320k income, 200k deposit, saving 9k a month. Borrowing capacity 2.1m. They want to build residential first then pivot into commercial in about 5-6 years. Goal is $80k passive income by year 15.
```
**Expected:** 3-5 properties total. First 2-3 are residential growth cells; later 1-2 are commercial cells (`commercial-high-cost` or `commercial-low-cost`). Phase 1 at 80% LVR, Phase 2 at 70% LVR. Chat references the two-phase intent.

**Test A6 — Minimal info (should ask 1-2 questions only)**
```
I have a new client, just got off the phone. She wants to invest.
```
**Expected:** Chat responds with **1-2 questions max** in a single message (income + deposit, typically). No plan generated yet, no error, no "I didn't understand."

### Tier B: Modifications and follow-ups

Send AFTER getting an initial plan from any Tier A test.

**Test B1 — Relative price change**
```
Bump property 2 up by 200k
```
**Expected:** Property 2's purchase price increases by exactly $200k from its previous value (e.g., $500k → $700k). Dashboard updates. Chat confirms the new absolute price. No rebuild of the whole plan.

**Test B2 — Strategy switch mid-plan**
```
Actually scrap this — switch to a cash flow strategy instead
```
**Expected:** Plan rebuilds with cash flow-mode properties (regional units, regional cashflow houses, possibly commercial). Property count may change. Chat acknowledges the switch. This is the one mid-conversation case where rebuilding is correct.

**Test B3 — Multiple changes at once**
```
Change savings to 5k a month, make property 1 a regional house instead, and drop property 3 to 400k
```
**Expected:** All three changes apply in one go. Dashboard reflects $5k/mo savings, property 1 is a regional house, property 3 priced at $400k. Chat summarises all three changes in one message.

**Test B4 — Unsupported event (should explain, not crash)**
```
What if interest rates rise 2% next year?
```
**Expected:** Chat explains in plain English that rate-change events aren't modelled in the engine yet, and describes the directional impact using existing plan numbers. **Dashboard does NOT change.** No "added refinance event" / no fake confirmation.

**Test B5 — Supported event**
```
John gets a promotion to 180k in 2028
```
**Expected:** Salary change event added. Chat confirms it. Dashboard timeline shows the salary bump in 2028 affecting serviceability and acquisition cadence from that point forward.

**Test B6 — Vague "add another"**
```
Can we squeeze in one more property? Something with good yield
```
**Expected:** Chat returns 3-4 property suggestion cards (cashflow-biased) with prices and yields. Each is clickable to apply. Plan is NOT modified yet — user picks one.

### Tier C: Edge cases that previously caused "I didn't understand that"

**Test C1 — Long rambling input**
```
So basically my client is a teacher, she's been teaching for about 15 years, earns around 95k, her partner is a tradie, electrician, he probably makes about 130 on a good year but it fluctuates, they've got two kids under 10, they own their home in western sydney worth maybe 850, owe about 400 on it, and they've been putting away about 3 grand a month into a savings account that now has about 60k in it and they want to know if they can realistically build a portfolio that gives them options when the kids finish school in about 12 years
```
**Expected:** Plan generated successfully. Chat extracts: $95k + $130k income, ~$60k deposit, $3k/mo savings, PPOR equity ~$280k usable, 12-year horizon. No "I didn't understand" or garbled response.

**Test C2 — Slang-heavy Australian input**
```
Got a bloke in Brissy, earns 110, missus earns 90. Got about 70 saved up. Keen on a couple of IPs, maybe something on the GC and one in regional NSW. No existing IPs. Reckons his pre-approval is around 900.
```
**Expected:** Plan generated. "Brissy" → Brisbane (QLD), "GC" → Gold Coast (QLD). Couple with $110k + $90k income, $70k deposit, $900k borrowing cap. ~2 properties (one Gold Coast, one regional NSW). No "missing input" nudge for borrowing capacity.

**Test C3 — Question that looks like a plan request**
```
How would a $2m goal work for someone on 130k with 100k deposit?
```
**Expected:** Plan generated using $130k income + $100k deposit. Goal verdict addresses whether $2m is reachable. Chat may ask for borrowing capacity in a nudge paragraph.

**Test C4 — Very short ambiguous input after a plan exists**
```
Make it cheaper
```
**Expected:** Either: (a) all properties drop in price by a sensible amount, OR (b) chat asks one short clarifying question ("which property — or all of them?"). NOT a rebuild from scratch. NOT silence.

**Test C5 — Mixes hypothetical with action**
```
What would happen if we went 90% LVR on everything — actually yeah do that
```
**Expected:** All properties' LVR set to 90%. Dashboard updates. Chat confirms the change (not just an explanation). Treats the trailing "actually yeah do that" as the actionable intent.

### Tier D: The Megachain

Run **all 30 prompts in order, in a single chat session**, on a single client. Don't reload, switch clients, or refresh.

```
1.  Couple, both 130k, saving 4500/month, 90k deposit, no existing properties, borrowing cap 1.2m. Want $2.5m equity in 15 years.
2.  Make property 1 a regional house in QLD instead
3.  Bump property 2 up by 250k
4.  What if growth is slower than expected?
5.  Drop property 3 to 380k
6.  Why did you put property 4 in NSW?
7.  Add another property — something with good yield
8.  Change savings to 6k a month
9.  Move property 2 to 2027
10. What happens if rates rise 1.5%?
11. Switch property 5 to PI loan
12. Set LVR to 90% on property 1
13. Refinance property 2 in 2030 at 5.75%
14. Sarah gets a raise to 160k in 2029
15. Why is cashflow negative around 2031?
16. Compare keeping property 4 in NSW vs moving it to VIC
17. What if we sell property 1 in year 8?
18. Drop the last property
19. Actually — make all remaining properties 88% LVR with LMI capitalised
20. Add two more properties
21. Make them both regional units in QLD around 400k each
22. What's the bottleneck stopping us from hitting the goal earlier?
23. Push the timeline to 18 years
24. Switch to the cash flow strategy instead
25. How does this version compare to the equity growth one we had before?
26. Bump deposit to 150k
27. Change income to 145k each
28. Why did the plan change so much?
29. Drop to 4 properties total
30. Go aggressive — push hard
```

**Expected by phase:**
- **#1:** Initial plan generated, 4-6 properties, dashboard populated.
- **#2-3, #5, #8-9, #11-12:** Each modification applies cleanly to the named property/field. Dashboard updates each time. No rebuild.
- **#4, #6, #10, #15, #22, #28:** Plain-English explanation referencing actual plan numbers. Dashboard does NOT change.
- **#7:** Property suggestion cards appear (yield-biased).
- **#13-14:** Events added to timeline; dashboard reflects them.
- **#16, #17, #25:** Plain-English explanation only — no `comparison` type, no fake "now showing two scenarios side by side."
- **#18, #20-21:** Property count changes correctly.
- **#19:** All current properties update to 88% LVR + LMI cap'd.
- **#23, #26-27, #29:** Profile/timeline changes apply.
- **#24:** Strategy switch — plan rebuilds with cashflow cells. This is the one allowed mid-conversation rebuild.
- **#30:** Pacing acknowledgement; possibly tighter cadence.

**Across the whole chain:**
- No "Sorry, I couldn't answer that one cleanly" message.
- Dashboard numbers always match the most recent chat citation.
- Latency stays reasonable (no tab unresponsive, no >15s waits).
- Final plan reflects: 4 properties, cashflow strategy, 18-year horizon, $145k each income, $150k deposit.

---

## Part 2 — Platform flow tests

### Flow 1: Fresh account creation
1. Open the app in an incognito/private window
2. Click Sign Up
3. Enter a test email and password
4. Complete confirmation flow (check email if required)

**Expected:** Lands on a sensible empty/welcome state — no errors, no white flash, no console red. Email confirmation works (if it's part of the flow). Logo and branding render correctly.

### Flow 2: First-time client creation
1. After logging in fresh, navigate to create a new client
2. Try submitting the form with empty fields first
3. Then fill in valid client details and submit

**Expected:** Empty submission shows clear validation errors (no silent fail). Valid submission creates the client and it appears immediately in the client list. No page refresh needed.

### Flow 3: Navigation and back button
1. Create a scenario for a client via the chatbot
2. See the dashboard populate
3. Hit browser back button
4. Hit browser forward button

**Expected:** Browser back returns to the previous route without errors. Forward returns to the dashboard with all data still showing — properties, charts, chat history all intact. No blank screen.

### Flow 4: Multiple scenarios per client
1. Create a first scenario, save it
2. Start a new scenario for the same client
3. Switch back to the first scenario via the scenarios menu

**Expected:** New scenario starts with empty chat and empty dashboard. Switching back to the first scenario restores its full state — properties, chat history, dashboard numbers. No bleed of data between scenarios.

### Flow 5: Client share link
1. Create and save a scenario
2. Generate a share link via TopBar
3. Open the link in a fresh incognito window (no auth)

**Expected:** Client view loads without prompting for login. Shows the scenario's properties, charts, and projections in a polished read-only layout. No agent-only buttons visible.

### Flow 6: Cookie/cache independence
1. Clear all cookies and local storage for the site
2. Reload the page
3. Log in
4. Land on the home page

**Expected:** After cookie clear, page redirects to login cleanly (no white flash, no error toast). Login succeeds. Home/dashboard loads without needing a hard refresh. Previous clients still visible.

---

## Part 3 — Multi-client persistence stress tests

### Flow 7: Three-client round-robin
1. Create **Client A** — generate a plan, save it
2. Create **Client B** — generate a different plan, save it
3. Create **Client C** — generate a third plan, save it
4. Switch back to **Client A** via the client selector
5. Switch to **Client B**
6. Switch to **Client C**, change LVR on property 2
7. Switch to **Client A** without explicitly saving C

**Expected:** Each switch loads the correct client's plan with no bleed (chat history matches the client, properties match, dashboard matches). C's edit autosaves within 250ms — when you return to C later, the LVR change is still there.

### Flow 8: Mark as purchased + switching
1. On Client A, go to Portfolio page and mark **property 1 as purchased**
2. Add an address and photo in the modal
3. Switch to Client B
4. Switch back to Client A
5. Refresh the browser (Cmd+R)

**Expected:** Property 1 still shows as purchased after the client switch. Address and photo intact. After full refresh, still purchased. Library Drawer shows "1 of N purchased" correctly. **(This is the bug that was fixed today — verify it's still good.)**

### Flow 9: The "I forgot to save" flow
1. Client A: open an existing saved scenario
2. Make 3-4 edits via the chatbot
3. Click Home / dashboard root without explicit save
4. Come back to Client A's scenario
5. Repeat but switch directly to Client B then back

**Expected:** Edits should be **preserved** — autosave fires within 250ms of each edit, so navigation away picks them up automatically. Returning to the scenario shows the edited state, not the original.

### Flow 10: Concurrent edit across tabs
1. Open the app in **two browser tabs** on the same client/scenario
2. Tab 1: change property 2's price to $500k and save
3. Tab 2 (without refreshing): change property 2's state to QLD and save
4. Refresh both tabs

**Expected:** No data corruption. One tab will show a "Updated in another tab — reloading" toast and reload to the latest version. After both refresh, both tabs show the same final state. Last-write-wins is acceptable; silent corruption is not.

### Flow 11: Delete-and-return
1. Create Client D with a full scenario, save it
2. Switch to Client A, do something
3. Delete Client D from the client list
4. Refresh the page

**Expected:** Delete is immediate, no errors, Client D disappears from selectors. After refresh, no phantom Client D in any list, dropdown, or scenario menu. No orphaned scenarios visible.

### Flow 12: Scenario switching within one client
1. On Client A, save scenario "Aggressive Plan"
2. Start a new scenario, generate a different plan, save as "Conservative Plan"
3. Switch back to "Aggressive Plan"
4. Make an edit on Aggressive but don't manually save
5. Switch to Conservative

**Expected:** Each named scenario loads its own state cleanly. Aggressive's edit autosaves before the switch — when you return to Aggressive later, the edit is there. Conservative shows ONLY its own state, no leak from Aggressive.

### Flow 13: Rapid-fire switching
1. With 3+ clients, click between them rapidly via the selector — A → B → C → A → B → C → A — about 10 switches in 15 seconds

**Expected:** Dashboard catches up cleanly with each switch. Possibly a brief loading skeleton, but never wrong-data flash, never stuck loading, never console errors. Final state matches the last selected client.

### Flow 13b: Blank-dashboard regression (cofounder report 2026-05-05)

The bug: navigate away from the dashboard to a per-property view (or any other page that reads scenario state) and back, and the dashboard renders empty even though Supabase still has the row. Fixed via context-level self-heal — re-test all of these:

1. Generate a plan via chatbot, confirm dashboard populates
2. Click a property on the portfolio chart → per-property page → back to portfolio
3. Click a property card's logo/icon → per-property output → back
4. Navigate to Settings → back to Dashboard
5. Navigate to Home → back to Dashboard
6. Navigate to Clients → back to Dashboard
7. Open a property detail modal → close it
8. Use browser back/forward arrows across two of the above transitions
9. Repeat any of the above twice in a row in the same session

**Expected:** In every case, returning to the dashboard shows the full plan — properties, charts, chat history. Never blank, never just a skeleton. If it does go blank: the context-level self-heal isn't catching that pathway — capture the route sequence and console errors.

### Flow 14: New account, pristine state
1. Create a **brand new account** (different email)
2. Inspect the empty state
3. Create one client, generate one plan
4. Log out
5. Log back in

**Expected:** New account has zero clients (no leak from your account). Empty state has clear next-action prompts, doesn't feel broken. After logout/login, the one client and plan come back exactly as left.

---

## Part 4 — Symptom decoder

When something goes wrong, this maps the visible symptom to the likely underlying cause:

| Symptom | Likely cause |
|---|---|
| "Sorry, I couldn't answer that one cleanly" | AI returned `initial_plan` when a plan already existed — frontend downgraded it and showed fallback |
| "Got a garbled response" | Edge function returned non-JSON (Claude API timeout or token limit) |
| "That took too long" | Edge function timed out (30s) — happens with very long/complex inputs |
| Dashboard goes blank after back-nav | Should self-heal via refetch (recent fix) — confirm working |
| Chat shows loading forever | Network issue or edge function crashed mid-stream |
| Plan numbers don't match dashboard | `enginePlanState` not being passed back to chat correctly, or chat doing its own projection |
| Edit "saved" but doesn't appear on reload | RLS policy denial silently swallowed, or save raced with navigation |
| Wrong client's data appears | Context bleed — `activeClient` and underlying scenario state out of sync |
| Marked-as-purchased turns back off after nav | `portfolioTracking` write got stomped by autosave (fixed 2026-05-05; should not occur) |
| CRM note disappears after typing | `communicationLog` write race (fixed 2026-05-05; should not occur) |

---

## Part 5 — Recommended run order

Half-day of focused testing:

1. **Chatbot Tier A** (A1–A6) — fresh plan generation across capacity bands
2. **Chatbot Tier B** (B1–B6) — modifications on a real plan
3. **Chatbot Tier C** (C1–C5) — edge cases
4. **Megachain Tier D** — single longest run, plan for 15-20 minutes uninterrupted
5. **Platform flows 1-6** — auth, navigation, basics
6. **Persistence flows 7-14** — the stress tests for messy real usage

Anything that fails in 1-3 is a chatbot prompt or mapper issue. Anything in 4 is state-drift. Anything in 5-6 is auth/routing. Anything in 7-14 is database/context/save logic — historically where the demo-killing bugs hide.

---

## Part 6 — When something fails

Capture:
- Exact input typed (copy from this doc if used verbatim)
- What the chatbot/UI did (screenshot if possible)
- What you expected (the line above said it)
- Browser console errors (Cmd+Opt+J → Console tab)
- Whether reproducible on a second attempt

That's enough to hand back for a targeted fix without re-deriving context.
