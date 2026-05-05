# Investor Demo Test Plan

Date: 2026-05-04
Purpose: Manual test script for personally validating the platform before investor demo. Designed to surface glitches in chatbot reliability, multi-client persistence, and navigation flows that real testers will accidentally trigger.

## How to use this document

Run sections in order. For each test, record outcome in a notebook or doc:

- **PASS** — works as expected
- **FAIL — [description]** — what went wrong, exact input used, what you saw
- **WEIRD — [description]** — works but feels off (slow, confusing, ugly)

Anything in FAIL or WEIRD is a fix candidate before investors hit it.

---

## Part 1 — Chatbot Stress Tests

### Tier A: Complex initial plans

Run each in a **fresh chat session** (new client, or new scenario on existing client). The chatbot should generate a full plan immediately without asking clarifying questions, except Test 6.

**Test A1 — High-net-worth PPOR owner pivoting to investment**
```
My client David owns a home in Mosman worth about 3.2m with 1.1m left on the mortgage. He earns 280k, wife Sarah earns 180k. They save about 12k a month. Want to use their equity to build a portfolio — thinking 4-5 properties over 10 years, aiming for $4m equity. Mix of growth and yield.
```

**Test A2 — Low-income first-timer with aggressive goals**
```
Got a young bloke, 26, earning 72k, saving 1500 a month, has 35k saved. No property. Wants to build a portfolio of 5+ properties. He's been watching YouTube and wants to "retire in 10 years on passive income." Be realistic with him.
```

**Test A3 — Couple with existing IPs wanting to scale**
```
Couple — Tom 145k, Rachel 110k. They already have 2 IPs — one in Brisbane worth 680k owing 520k, another in regional NSW worth 450k owing 380k. Saving 6k a month. Have 90k liquid. Want to get to 6 properties total over 12 years. Borrowing cap is 1.4m.
```

**Test A4 — The $10M residential pivot to a single IP**
```
Client owns a home worth 10 million in Toorak, no mortgage. Earns 400k. Wants to sell the home and use the proceeds to buy one investment property only — a single high-end residential investment around 8-9 million. What does a single-asset portfolio look like over 15 years?
```

**Test A5 — Commercial transition path**
```
Sarah and Mike, combined 320k income, 200k deposit, saving 9k a month. Borrowing capacity 2.1m. They want to build residential first then pivot into commercial in about 5-6 years. Goal is $80k passive income by year 15.
```

**Test A6 — Minimal info (should ask 1-2 questions only)**
```
I have a new client, just got off the phone. She wants to invest.
```

### Tier B: Modifications and follow-ups

Send AFTER getting an initial plan from any Tier A test.

**Test B1 — Relative price change**
```
Bump property 2 up by 200k
```

**Test B2 — Strategy switch mid-plan**
```
Actually scrap this — switch to a cash flow strategy instead
```

**Test B3 — Multiple changes at once**
```
Change savings to 5k a month, make property 1 a regional house instead, and drop property 3 to 400k
```

**Test B4 — Unsupported event (should explain, not crash)**
```
What if interest rates rise 2% next year?
```

**Test B5 — Supported event**
```
John gets a promotion to 180k in 2028
```

**Test B6 — Vague "add another"**
```
Can we squeeze in one more property? Something with good yield
```

### Tier C: Edge cases that previously caused "I didn't understand that"

**Test C1 — Long rambling input**
```
So basically my client is a teacher, she's been teaching for about 15 years, earns around 95k, her partner is a tradie, electrician, he probably makes about 130 on a good year but it fluctuates, they've got two kids under 10, they own their home in western sydney worth maybe 850, owe about 400 on it, and they've been putting away about 3 grand a month into a savings account that now has about 60k in it and they want to know if they can realistically build a portfolio that gives them options when the kids finish school in about 12 years
```

**Test C2 — Slang-heavy Australian input**
```
Got a bloke in Brissy, earns 110, missus earns 90. Got about 70 saved up. Keen on a couple of IPs, maybe something on the GC and one in regional NSW. No existing IPs. Reckons his pre-approval is around 900.
```

**Test C3 — Question that looks like a plan request**
```
How would a $2m goal work for someone on 130k with 100k deposit?
```

**Test C4 — Very short ambiguous input after a plan exists**
```
Make it cheaper
```

**Test C5 — Mixes hypothetical with action**
```
What would happen if we went 90% LVR on everything — actually yeah do that
```

### Tier D: The Megachain

Run **all 30 prompts in order, in a single chat session**, on a single client. Don't reload, switch clients, or refresh. The point is to stress conversation history bloat, plan-state drift, `enginePlanState` consistency, the "never rebuild a plan" rule, and the dashboard's ability to keep up.

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

**What to watch during the megachain:**
- Does message 29 still know about the strategy switch in 25?
- Does the dashboard match the chat numbers at every step?
- Does any message trigger "Sorry, I couldn't answer that one cleanly"?
- Does the chat ever forget the existing plan and try to rebuild it?
- Does latency degrade as the conversation grows? (each turn sends full history)
- Do compare-style questions (#16, #25) get downgraded to an explanation correctly, or does the chatbot try to return a `comparison` type (which has been removed)?

---

## Part 2 — Platform flow tests

### Flow 1: Fresh account creation
1. Open the app in an incognito/private window
2. Click Sign Up
3. Enter a test email and password
4. Check: does the confirmation flow work? Do you land on the right page?
5. Check: is the empty/welcome dashboard sensible?

### Flow 2: First-time client creation
1. After logging in fresh, navigate to create a new client
2. Fill in client details
3. Check: form validation — try submitting with empty fields
4. Check: after creation, does the client appear in the list?

### Flow 3: Navigation and back button
1. Create a scenario for a client via the chatbot
2. See the dashboard populate
3. Hit browser back button
4. Hit browser forward button
5. Check: does the dashboard reload correctly or go blank?

### Flow 4: Multiple scenarios per client
1. Create a first scenario, save it
2. Start a new scenario for the same client
3. Check: chat cleared? Starting fresh?
4. Check: can you switch between saved scenarios?

### Flow 5: Client share link
1. Create and save a scenario
2. Generate a share link
3. Open in incognito (no auth)
4. Check: does the client view load? Is data visible?

### Flow 6: Cookie/cache independence
1. Clear all cookies and local storage for the site
2. Reload the page
3. Check: redirects to login cleanly (no white screen, no error flash)?
4. Log in
5. Check: dashboard loads without needing a hard refresh?

---

## Part 3 — Multi-client persistence stress tests

These are the messy real-user flows — switching, editing, navigating, coming back. Designed to catch state bleed between clients, lost saves, and stale data on return.

### Flow 7: Three-client round-robin
1. Create **Client A** — generate a plan, save it
2. Create **Client B** — generate a different plan, save it
3. Create **Client C** — generate a third plan, save it
4. Switch back to **Client A** via the client selector
5. Check: A's plan loads correctly? Same numbers, same properties?
6. Switch to **Client B** — check: B's plan, no chat-history bleed
7. Switch to **Client C**, make a small edit (e.g. change LVR on property 2)
8. Switch to **Client A** without explicitly saving C
9. Check: does C's edit persist when you go back?

### Flow 8: Mark as purchased + switching
1. On Client A, go to Data Assumptions and mark **property 1 as purchased**
2. Add an address and photo
3. Without saving the scenario, switch to Client B
4. Switch back to Client A
5. Check: property 1 still marked purchased? Address still there?
6. Refresh the browser
7. Check: purchased state survives a full reload?
8. Library Drawer shows "1 of N purchased" correctly?

### Flow 9: The "I forgot to save" flow
1. Client A: open an existing saved scenario
2. Make 3-4 edits via the chatbot
3. **Without saving**, click Home or navigate to dashboard root
4. Come back to Client A's scenario
5. Check: edits there or gone? Whichever — is the behaviour clear to the user?
6. Repeat but click directly to Client B, then back
7. Check: same — preserved or dropped consistently?

### Flow 10: Concurrent edit across tabs
1. Open the app in **two browser tabs** on the same client
2. Tab 1: change property 2's price to $500k and save
3. Tab 2 (without refreshing): change property 2's state to QLD and save
4. Check: what happens? Does Tab 2 overwrite Tab 1? Conflict warning? Data corruption?
5. Refresh both tabs
6. Check: which version won? Is it clear?

### Flow 11: Delete-and-return
1. Create Client D with a full scenario, save it
2. Switch to Client A, do something
3. Delete Client D from the client list
4. Check: UI reacts cleanly? Stale references? Console errors?
5. Refresh the page
6. Check: Client D fully gone? No phantoms in selectors?

### Flow 12: Scenario switching within one client
1. On Client A, save scenario "Aggressive Plan"
2. Start a new scenario, generate a different plan, save as "Conservative Plan"
3. Switch back to Aggressive Plan via the scenarios menu
4. Check: correct properties, correct chat history (or empty if per-scenario), correct dashboard
5. Make an edit on Aggressive but don't save
6. Switch to Conservative
7. Check: is the unsaved Aggressive edit gone, preserved, or did it leak into Conservative?

### Flow 13: Rapid-fire switching
1. With 3+ clients existing, click between them rapidly via the selector — A → B → C → A → B → C → A — about 10 switches in 15 seconds
2. Check: dashboard stays in sync? Flash of wrong data? Console errors? Stuck loading states?

### Flow 13b: Blank-dashboard regression (cofounder report 2026-05-05)

The bug: navigate away from the dashboard to a per-property view (or any other page that reads scenario state) and back, and the dashboard renders empty even though Supabase still has the row. Recovery now lives in `ScenarioSaveContext` so it covers every pathway — re-test all of these:

1. Generate a plan via chatbot, confirm dashboard populates
2. **Click a property on the portfolio chart → per-property page → back to portfolio.** Expected: data still there. (Cofounder's exact path.)
3. Click a property card's logo/icon → per-property output → back. Expected: data still there.
4. Navigate to Settings → back to Dashboard. Expected: data still there.
5. Navigate to Home → back to Dashboard. Expected: data still there.
6. Navigate to Clients → back to Dashboard. Expected: data still there.
7. Open a property detail modal → close it. Expected: data still there.
8. Use browser back/forward arrows across two of the above transitions. Expected: data still there.
9. Repeat any of the above **twice in a row** in the same session. Expected: still recovers (the recovery ref now resets per active-client).

If any of these go blank: the context-level self-heal isn't catching that pathway — capture the route sequence and console state.

### Flow 14: New account, pristine state
1. Create a **brand new account** (different email)
2. Check: no clients visible (no leak from your account)
3. Check: empty state makes sense, not confusing/blank?
4. Create one client, generate one plan
5. Log out, log back in
6. Check: data comes back exactly as left?

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

---

## Part 5 — Recommended run order

Half-day of focused testing:

1. **Chatbot Tier A** (tests A1–A6) — establishes baseline that fresh plan generation works across capacity bands
2. **Chatbot Tier B** (tests B1–B6) — modifications on a real plan
3. **Chatbot Tier C** (tests C1–C5) — edge cases
4. **Megachain Tier D** — single longest run, plan for 15-20 minutes uninterrupted
5. **Platform flows 1-6** — auth, navigation, basics
6. **Persistence flows 7-14** — the stress tests for messy real usage

Anything that fails in 1-3 is a chatbot prompt or mapper issue. Anything that fails in 4 is a state-drift issue. Anything that fails in 5-6 is auth/routing. Anything that fails in 7-14 is database/context/save logic — and historically that's where the bugs hide that investors would actually trigger.

---

## Part 6 — Notes for fixes

When recording a FAIL, capture:
- Exact input typed (copy from this doc if used verbatim)
- What the chatbot/UI did (screenshot if possible)
- What you expected
- Browser console errors (Cmd+Opt+J → Console tab)
- Whether it was reproducible on a second attempt

That's enough to hand back for a targeted fix without needing to re-derive context.
