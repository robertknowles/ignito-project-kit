# Manual Test Pack — Accuracy Fixes (11 Jul 2026)

Six tests, ~5 minutes each. Every brief below is **verbatim what a real tester typed** (or a suite variant built from Adam's WhatsApp instructions). Each test says what June looked like and exactly what you should see now.

## Before you start

1. Be on the latest branch: `git pull` on `design/proppath-refresh` (fixes landed up to `3efc959`), then run the app locally.
2. **⚠️ One deploy needed for Tests 1, 3 & 4's chat behaviour:** the goal-shortfall messages come from the `nl-parse` edge function, which is changed in code but **not yet deployed to Supabase**. Until it's deployed, the chat will still be silent about missed goals (the dashboard banner part works regardless — it's client-side). Ask Claude to deploy it, or deploy `nl-parse` yourself, before running those tests.
3. **Always create FRESH plans.** Scenarios saved before today carry the old 6.25% interest rate stored per property, which now counts as a deliberate override — old plans intentionally keep their old numbers.
4. Test as a new client each time so plans don't contaminate each other.

---

## Test 1 — Ella's phantom properties + missed goal (the big one)

**Paste as the brief:**
> i have $700,000 in borrowing capacity. I want to retire on $150k passive income by 2045. I want the first property to be negative by no more than $1,500 per month.

**Check A — goal honesty (needs the deploy):** $150k/yr is far beyond what $700k of borrowing capacity can produce. In June the plan generated with zero acknowledgement.
- ✅ Now: the chat should LEAD with the shortfall, something like *"the $150k/yr income goal isn't reached on this plan — the engine projects $Xk/yr by 2045, leaving a $Yk/yr gap"*, and the dashboard goal panel should show a red quantified line: *"Income projected $Xk/yr by 2045 — $Yk/yr short"*.
- ❌ Fail: plan appears, nobody mentions the goal.

**Check B — the removal bug:** once the plan exists (should be ~4 properties), type in chat: **"remove properties 2, 3 and 4"**.
- ✅ Now: exactly those disappear; 1 property remains; the chat's claim matches the table.
- ❌ June behaviour: wrong ones removed, survivors remain, chat says "Removed property 2… 3… 4" anyway.

## Test 2 — Ella's real portfolio + auto-fix honesty

**Paste as the brief:**
> I own 3 properties, one in townsville (purchased in 2024) worth $600k renting for $550 per week. 80% LVR. One in Melbourne for $920k (purchased in 2025) (100%LVR), renting for $300 per week. I plan to add a granny flat to this house for $180k and rent that out for $400 per week. I also own a house in Darwin i paid $500k (purchased in 2025) (80% LVR), it is now worth $600k and it rents for $550 per week. I want to retire by 2046 with $250k passive income. Create a model that tells me what i should buy next.

**Check:** in June the chat claimed *"Built a 4-property plan, priced from $380k to $750k"* while the affordability auto-fixer had actually emptied or changed the plan — the chat described a plan that didn't exist.
- ✅ Now: whatever the chat says must match the purchase table exactly (count, prices, years). If the auto-fixer changed anything you'll see a plain-English note per change, e.g. *"Note: property 2 was moved from 2027 to 2029 — the deposit isn't available until then."*
- ⚠️ Known remaining issue (don't chase it): property *selection* for a client this strong may still be under-priced (the blue-chip gap — next session's schema work feeds this).

## Test 3 — Anu's impossible goal on a fresh plan (needs the deploy)

**Paste as the brief:**
> With 5 mil borrowing capacity, 300k income, 150k deposit, want to achieve 200k passive income, no existing properties

**Check:** June: silent. Now the chat should say the goal isn't realistic with numbers, e.g. *"The $200k/yr income goal isn't realistic on this plan — the model estimates around $Xk/yr by 2046, about $Yk/yr short."* Banner shows the quantified gap too.

## Test 4 — Julian's achievable goals: NO false alarm (needs the deploy)

**Paste as the brief:**
> Rob. $1m borrowing capacity. $100k income. $150k deposit. $50k/year cashflow goal. $2m equity goal. 20 years.

**Check:** both goals are reachable. There must be **no** shortfall warning anywhere — chat clean, banner shows goals met. If you see a shortfall message here, the check is over-firing: tell Claude.

## Test 5 — Adam's sequence: deferrals are disclosed

**Paste as the brief:**
> Buy 3 properties between $375k and $390k over the first three years, then a freestanding house around $600k. Income $120k, $90k deposit, saving $2k/month, BC $1.1m.

**Check:** the deposit can't actually sustain 3 purchases in 3 years, so the auto-fixer spreads them out. June: silently. 
- ✅ Now: the chat explicitly notes each deferral (*"property 3 was moved from 2028 to 2031 — the deposit isn't available until then"*), and the confirmation brief matches.
- ⚠️ Known remaining issue: the *engine's pacing itself* (whether it should find a tighter sequence) is a separate open item — you're testing the honesty, not the pacing.

## Test 6 — Calibration spot-check (no AI involved)

Create any fresh simple plan (e.g. $120k income, $80k deposit, $1M borrowing capacity). Open a property's details and the cashflow chart:

- **Interest rate reads 5.5%** everywhere a default shows (was 6.25%).
- **Cashflow uses gross rent** — no 4% vacancy haircut in the client-facing line; the vacancy dial in assumptions now says it applies to serviceability/funding tests.
- **Operating costs ≈ 1.0% of property value** for houses (e.g. ~$5,900/yr on a $500k regional house; units ~1.2–1.5% because strata is real).
- **A typical 5%-yield property goes cashflow-positive around year 3–4**, not year 7–8. A 3-property plan should cross around year 5–6.
- Sanity guard: manually type in your own costs on a property — your numbers must win over every default.

---

## If something fails
Note which test + check letter and what you saw — the scenario IDs map straight back to the automated suite (`FIX-ELLA-314`, `FIX-ELLA-315`, `FIX-ANU-275`, `FIX-JULIAN-210`, `VAR-ADAM-BAND`), so any failure you see by eye can be replayed and debugged headlessly in seconds.
