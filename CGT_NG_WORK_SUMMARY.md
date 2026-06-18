# What we built — CGT & New Build vs Established

*Two sessions of work, in plain English. Split into what you can SEE on the dashboard, and what changed UNDER THE HOOD.*

---

## The big idea

Australia's 2027 tax reform changes two things for property investors: **how much tax they pay when they sell (CGT)**, and **whether they can still negatively gear (new builds yes, established no)**.

We made our tool understand both — and, crucially, made **"New build vs Established" an actual lever** that changes the numbers a buyer's agent shows their client.

---

## PART 1 — What changed on the DASHBOARD (what you can see & click)

**1. A "Type" selector on every property** → New build or Established. Sits on the properties table, the cards, and the confirmation screen.

**2. The "Sell" button on planned properties now actually works.** Before, setting a sell year on a future property did *nothing*. Now the property leaves the portfolio, the cash comes back, and the plan updates.

**3. Capital Gains Tax shows up in the Projections table** → a "Capital gains tax" row (in the year of sale) and a "Net proceeds from sales" row.

**4. The Sell pop-up shows a live estimate** → set a sell date and you instantly see "Est. CGT · Net proceeds."

**5. Switching a property to New build now visibly changes TWO charts:**
   - **Net Cashflow** improves in the early years (new builds keep their tax break).
   - **Borrowing Capacity** lifts up (new builds let the client borrow more).
   - Switch it back to Established → both drop to the baseline. *The lever finally does something on screen.*

---

## PART 2 — What changed in the SYSTEM (the engine behind it)

**1. A new CGT calculator** → works out the tax on a sale using the 2027 rules (the whole market is already pricing these in). New builds get the cheaper treatment; established get the new method.

**2. Planned-property sales were rebuilt** → the engine now correctly removes a sold property from value, debt, rent and cashflow — exactly like it already did for properties the client already owns.

**3. A new "after-tax" engine for negative gearing** → for the first time the tool models the tax benefit of owning a property, not just the raw cashflow. This is what powers the new-build difference:
   - **New build** → keeps the tax benefit → better cashflow + more borrowing power.
   - **Established (bought now)** → loses the benefit under the reform → stays at the baseline.
   - **Already-owned properties** → protected ("grandfathered"), they keep their benefit.

**4. The cashflow chart now shows AFTER-TAX cashflow** instead of before-tax — a more honest number for the client.

**5. The borrowing-capacity lift is "display only"** → it shows on the chart, but we deliberately kept the strict lending tests unchanged, so no existing client plan breaks.

---

## Why it matters

New builds are a legitimate strategy buyers' agents now *have* to pitch because of the reform — but it's a hard sell. Before this, our tool showed new build and established as **identical**, which quietly undercut the pitch. Now the tool **backs the pitch with real, visible numbers**: better cashflow, more borrowing power, lower tax on exit.

---

## Status

All of the above is **working and verified in the app**, but **not yet committed / pushed live** — it's ready for review whenever you are.

*The numbers are illustrative (clearly disclaimed as "see your accountant") — sensible defaults, not a formal tax return.*
