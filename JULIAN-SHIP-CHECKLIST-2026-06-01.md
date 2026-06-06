# PropPath — Must-Do Before Shipping to Julian (1 June 2026)

We're giving Julian (an experienced buyers' agent) a login this afternoon to test PropPath
against the tool he currently uses ("prop portfolio"). He's already said our **output** is
good — "cleaner, faster, easier to use." The goal of this pass is to close the gaps that would
stop his first session from lining up with what he's used to, and to make sure the basics
actually work end-to-end.

Below are the only things that need doing before we send it. They're grouped into **Checks**
(confirm it works, fix if it doesn't) and **Builds** (new functionality).

**How to use this doc:** Each item has *what it is*, *current state*, and *what done looks like*.
Treat "done looks like" as the acceptance test. If current state turns out different from what's
written, flag it rather than guessing. Suggested order: do the Checks first (they may change scope),
then the Builds. Items 4 and 5 are linked — read them together.

> ⚠️ **The single biggest change in this whole pass is item 4 — the assumptions.** It is *not* just
> "add a few fields." We are moving assumptions from **global (one universal set)** to **per-client
> (each client carries their own set)**. That is a data-model / architecture change that touches how
> assumptions are stored, loaded, and fed into every projection. Budget the most time here, and do it
> first among the Builds — items 5 and 6 are small by comparison.

---

## CHECKS

### 1. Home-page chat input — "attach doc" must work

**What it is:** The natural-language chat input on the home page is meant to let a user attach a
document (e.g. a client's existing spreadsheet or PDF) so its contents get read into the parse,
instead of typing everything by hand.

**Current state:** Unknown whether this is even built. The attach control may be missing, present
but non-functional, or half-wired. **Step one is to find out which.**

**What done looks like:** A user can attach a document on the home-page chat input, and its content
is ingested into the same natural-language parse pipeline as typed input (i.e. it populates the
brief / client profile / properties just like typing would). If it doesn't exist, build it. If it
exists but is broken, finish it.

### 2. Natural-language existing-property pickup carries through

**What it is:** When a user types existing properties into the chat input in natural language
(e.g. "they own a house in Penrith worth $850k with a $400k loan"), those properties should be
parsed and appear on the Existing Portfolio page.

**Current state:** Believed to work — this is a double-check, not a rebuild.

**What done looks like:** Enter 2–3 existing properties via natural language → they appear correctly
on the Existing Portfolio page with the right values (value, loan, etc.). Fix any that drop off or
land with wrong data.

### 3. Client login / client view

**What it is:** The client-facing login lets a BA invite their client to view the output in their
own portal.

**Current state:** It exists but hasn't been used or tested in a long time.

**What done looks like:** Confirm a client can actually log in, and **document exactly what's visible
and available through the client view** so we know what we're putting in front of Julian's clients.
If it's broken, get it working to at least a "client can log in and see their plan" baseline.

---

## BUILDS

### 4. Per-client assumptions — moved into a pill, wired to the model, with the missing fields added

> **This is the biggest single change in this pass.** The core of it is the shift from global to
> per-client assumptions — see the warning at the top. Adding the new fields is the easy part; the
> hard part is that assumptions are now a per-client thing.

**What it is:** Assumptions that drive the projections (inflation, tax rates, etc.).

**Current state:** Assumptions are currently **global** — one universal set applied across everything.
That doesn't make sense; different clients need different assumptions.

**What done looks like:**
- Assumptions become **per-client** (each client/scenario carries its own set). **This is the headline
  change** — assumptions move from a single universal record to one owned by each client, and the rest
  of the app reads the active client's assumptions rather than a global set.
- They're surfaced via a **pill button with a settings icon, labelled "Assumptions," in the top-right
  of the home-page chat input.** Clicking it opens the assumptions panel.
- **Keep all our existing assumptions** — including Inflation, Selling Costs, and Passive Income Goal,
  which already exist.
- **Add the fields from Julian's tool that we don't currently have:**
  - **Tax Rate panel:** Marginal Tax Rate, Company Tax Rate, Trust Tax Rate, SMSF Tax Rate
  - **Marginal Tax Rate at Consolidation Year**
  - **CGT 1-Year Discount**
- **Everything must be wired in — and it has to actually work:** changing any assumption value must
  actually flow through and move the numbers on the dashboard / projection. No display-only fields.
- **Critically, changes must apply post-generation.** Once the plan is generated and the user is in the
  dashboard, opening the Assumptions pill and changing a value (e.g. CGT discount, a tax rate, inflation)
  must **immediately re-flow through and update the dashboard outputs live** — without needing to
  regenerate the whole plan from scratch. This is the acceptance test that matters most: Julian will
  open the dashboard, tweak an assumption, and expect to watch the numbers move. If they don't move,
  this item is not done.

### 5. Ownership entities — add SMSF + Company, confirm all four are wired, add Entity column

**What it is:** The ownership entity a property is held in.

**Current state:** We already have **Individual** and **Trust**. We do **not** have SMSF or Company,
and it's unclear whether the existing entities are actually wired into the calculations or just
selectable labels.

**What done looks like:**
- **Add SMSF and Company** as ownership entity options (so the full set is Individual, Trust, Company,
  SMSF).
- **Confirm all four are wired:** selecting an entity for a property applies the matching **entity tax
  rate from the Assumptions panel (item 4)** to that property's tax / CGT treatment — not just a label.
- **Add "Entity" as a column** in the **table view on the Property Plan tab.**

**Scope boundary for this pass:** "Wired" here means the entity drives the *tax treatment* (correct tax
rate per entity, correct CGT handling). Entity-specific *borrowing / serviceability* rules (e.g. SMSF
limited-recourse lending assessed on the fund rather than personal income) are **out of scope for this
pass** — don't build that now, and don't silently fake it.

### 6. Expanded-view fields surfaced on the block and in the table output

**What it is:** A property block has an **expanded view** that shows a concise set of fields.

**Current state:** Those expanded-view fields aren't carried through consistently — they should appear
both on the property block and in the property-table output, and currently don't.

**What done looks like:** The (concise) set of fields shown in the property block's **expanded view**
also appears as fields on the property block and as columns in the **property-table output**, so the
same data is visible in both places. Inspect the expanded view to get the exact field set — match it,
don't invent fields.

---

## Out of scope for this pass (noted so we don't drift)

These came up in Julian's session and matter for the roadmap, but are **not** part of this afternoon's
ship: scenario comparison tool, export / download-and-send to client, hold-sell consolidation cashflow,
"goal achieved" indicator polish, baked-in legislation/budget changes, and SMSF borrowing mechanics.
