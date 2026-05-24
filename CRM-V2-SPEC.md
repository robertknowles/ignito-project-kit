# CRM v2 — playbook restructure, calendar pipeline, dual-sender support

**Status:** Living scaffold. Sections marked OPEN need a decision before that piece ships.
**Scope:** Builds on CRM v1 (industry map + kanban + LinkedIn-only playbook). Adds multi-channel playbook, calendar-driven pipeline, and Rob/James dual-account support.
**Audience:** Both a Claude Code build spec and an internal strategy document. Update it as decisions firm up.

---

## What this changes vs v1

1. **Playbook page** becomes a multi-channel hub. Tabbed by channel. Existing LinkedIn content moves into the LinkedIn tab; other channels ship as placeholders.
2. **Above the tabs**: a strategic overview — sales-routes mindmap + a "great outreach" reference panel.
3. **Kanban pipeline** becomes calendar-aware. Every status change computes `next_action_at`. New "Today" queue surfaces what's due, for both Rob and James.
4. **Dual-sender support**: model that Rob and James are both running the pipeline. Tag contacts by assigned sender. Surface the "accepted by other sender" edge case.

The reason both Rob and James are adding people: doubling the surface area for response on a small, hard-to-reach niche. Don't try to rationalise this down to one account — it's deliberate.

---

## 1. Playbook page restructure

### 1.1 New layout

```
+----------------------------------------------------------+
| ← CRM    Outreach Playbook                                |
+----------------------------------------------------------+
| STRATEGIC OVERVIEW (always visible above tabs)            |
|                                                            |
|  Sales-routes mindmap                                      |
|   - All 6 channels as nodes                                |
|   - Arrows showing how they interact                       |
|     (e.g. LinkedIn → Email at Day +28;                     |
|     Broker referral → BA acquisition channel)              |
|                                                            |
|  Reference examples panel                                  |
|   - 4-8 "great outreach" examples from others              |
|   - With our annotations on why they work                  |
+----------------------------------------------------------+
| Channel tabs:                                              |
|  [ LinkedIn ] [ Email ] [ Instagram ] [ TikTok ]           |
|  [ Broker referrals ] [ BA referrals ]                     |
+----------------------------------------------------------+
| Active tab content:                                        |
|  - Channel-specific flow diagram                           |
|  - Principles for this channel                             |
|  - Pacing / numbers                                        |
|  - Step-by-step templates (editable)                       |
+----------------------------------------------------------+
```

### 1.2 What lives in each tab

Each channel tab contains its own:
- Flow diagram (channel-specific SVG)
- Principles (e.g. LinkedIn = "Hey mate" greeting; Email = real signature, conspicuous-publication rule for inferred consent)
- Pacing (e.g. LinkedIn = 25-30/wk; Email = 10-15/wk; IG = TBD)
- Sequence of step templates with editable male/female variants

The LinkedIn tab seeds with everything currently on the playbook page (`OutreachFlowDiagram`, `PrinciplesPanel`, `PacingPanel`, and the 7 `crm_outreach_steps` rows). Other tabs ship empty with a "Build this channel" CTA.

### 1.3 OPEN — 6 separate tabs or grouped?

- **A.** 6 flat tabs as listed above.
- **B.** 2 supertabs — Direct outbound (LinkedIn / Email / IG / TikTok) and Referrals (Brokers / BAs).
- **C.** 4 outbound tabs + a separate top-level Referrals page (motion is fundamentally partner-driven, not direct-to-prospect).

**Recommendation: A.** Each channel has different math, rate limits, and content needs — flat tabs make that visible. Revisit if it gets unwieldy.

### 1.4 OPEN — "great outreach" reference panel contents

- **(a)** External examples — competitor messages, founder cold DMs we've seen, posts about outreach principles. Reference material.
- **(b)** Our own promoted templates — strongest performers from our own playbook, pinned for easy reuse.
- **(c)** Both, side by side.

**Recommendation: (a) only for now.** Our own templates haven't proven anything yet. External examples ground us in what good looks like.

---

## 2. Schema changes

### 2.1 Add `channel` to `crm_outreach_steps`

```sql
ALTER TABLE public.crm_outreach_steps
  ADD COLUMN channel text NOT NULL DEFAULT 'linkedin',
  ADD COLUMN duration_days_to_next integer;

UPDATE public.crm_outreach_steps SET channel = 'linkedin';

-- step_key must be unique within a channel, not globally
ALTER TABLE public.crm_outreach_steps
  DROP CONSTRAINT IF EXISTS crm_outreach_steps_step_key_key;

CREATE UNIQUE INDEX crm_outreach_steps_channel_step_key
  ON public.crm_outreach_steps (channel, step_key);

CREATE INDEX idx_crm_outreach_steps_channel_order
  ON public.crm_outreach_steps (channel, step_order);
```

Valid channel values (text for now — convert to enum later if it firms up):
`linkedin`, `email`, `instagram`, `tiktok`, `broker_referral`, `ba_referral`.

`duration_days_to_next`: days until the next action is due after this step is completed. Drives `next_action_at` computation.

Backfill for LinkedIn steps:
- `day_0_invite` → 10
- `day_10_inmail` → 4
- `day_1_video_dm` → 4
- `day_4_soft_nudge` → 10
- `day_14_remodel_hook` → 14
- `day_28_email` → 2 (then mark dead)
- `day_120_reengage` → NULL

### 2.2 Add dual-sender fields to `crm_contacts`

```sql
ALTER TABLE public.crm_contacts
  ADD COLUMN assigned_to text NOT NULL DEFAULT 'james',
  ADD COLUMN cross_accepted_by text;

-- Check constraint to keep values clean
ALTER TABLE public.crm_contacts
  ADD CONSTRAINT crm_contacts_assigned_to_check
  CHECK (assigned_to IN ('rob', 'james'));

ALTER TABLE public.crm_contacts
  ADD CONSTRAINT crm_contacts_cross_accepted_by_check
  CHECK (cross_accepted_by IS NULL OR cross_accepted_by IN ('rob', 'james'));
```

**`assigned_to`**: whose LinkedIn account this contact is being worked through. Drives the pipeline cadence.
**`cross_accepted_by`**: the OTHER sender has also got a connection accept. NULL = no cross-acceptance. Surfaces as a badge in the UI.

### 2.3 New table — reference examples

```sql
CREATE TABLE public.crm_reference_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,        -- "Sam Parr cold DM"
  source_url text,                   -- optional link
  channel text,                      -- linkedin / email / instagram / etc.
  body text NOT NULL,                -- the message itself
  why_it_works text,                 -- our annotation
  display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_reference_examples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PropPath admins manage crm_reference_examples"
  ON public.crm_reference_examples
  FOR ALL
  USING (public.is_proppath_admin())
  WITH CHECK (public.is_proppath_admin());
```

### 2.4 Sales-routes mindmap

Ship as a hand-tuned SVG component for v2 (`src/components/crm/SalesRoutesMindmap.tsx`). Editable in-app is a v3 problem. The mindmap doesn't change often enough to justify a schema.

---

## 3. Calendar-driven pipeline (kanban v2)

### 3.1 Automatic `next_action_at` computation

Extend `useUpdateContactStatus`:

```ts
// After setting status + last_touch_at + stage timestamp:
const step = await getStepByChannelAndStatus(channel, newStatus);
if (step?.duration_days_to_next) {
  patch.next_action_at = addDays(now, step.duration_days_to_next).toISOString();
} else {
  patch.next_action_at = null;  // terminal states
}
```

Terminal states (no next action): `replied`, `demo_booked`, `beta_tester`, `dead`.

### 3.2 Card-level surfacing

Every kanban card and industry-map contact row shows:
- Status (existing)
- `next_action_at` as relative date — "Due today", "Due in 3d", "OVERDUE 2d" (red)
- Small avatar/initial for `assigned_to` ("R" or "J")
- ⚠ icon if `cross_accepted_by` is set

### 3.3 "Today" queue — new view

Add a third tab to the dashboard top bar: `CRM | Results | Today`.

```
TODAY · Thursday 14 May
12 actions due, 3 overdue

[J] Send Day +1 video DM       (4 contacts)
    • Sarah Chen (Compound)
    • Marco Bianchi (Streamline)
    • Tom Wilson (Property Hub)
    • Lisa Park (Caifu Group)

[R] Add Day 0 personalisation note   (3 contacts)
    • [...]

[J] Send Day +14 remodel hook        (5 contacts)
    • [...]
    OVERDUE: Jamie Roberts (Apex BA) — 2d overdue
```

Each row clickable → opens contact card with the relevant template pre-loaded for that step. "Mark done" button advances the pipeline status, which auto-computes the next `next_action_at`.

Group by: assigned sender → step → contact. Sort: overdue first, then by due date ascending.

### 3.4 Filter on the queue

Top of the Today view: `[ All ] [ Mine (Rob) ] [ James's ] [ Overdue only ]`.

---

## 4. Dual-sender view

### 4.1 Filter chips on Industry Map and Kanban

Add a row of filter chips:

`[ All ] [ Mine (Rob) ] [ James's ] [ Cross-accepted ⚠ ]`

State persists in URL or localStorage so filter survives reload.

### 4.2 Cross-acceptance badge

On any contact card where `cross_accepted_by` is set:

```
⚠ Accepted by Rob (not James)
```

Small amber pill, top-right of the card.

### 4.3 Setting cross-acceptance

Two ways to set it:
- **Manually**: a small action on the contact card — "Mark cross-accepted by..." → choose Rob or James.
- **Prompt on status change**: when status moves to `connected`, ask "Did the other sender also get a connection accept?"

### 4.4 OPEN — what does the playbook do on cross-acceptance?

- **(a)** Reassign automatically — switch `assigned_to` to the sender who got accepted.
- **(b)** Prompt for warm intro — the accepted account introduces the prospect to the other.
- **(c)** Run in parallel — both accounts engage from their angles.

**Recommendation: (a) by default, with a one-click "do warm intro instead" option that opens a hand-off template.** Add a "warm intro template" to the LinkedIn tab as a new entry.

---

## 5. Build order

1. **Schema migration** — add `channel`, `duration_days_to_next`, `assigned_to`, `cross_accepted_by`, `crm_reference_examples` table. Backfill LinkedIn step durations.
2. **Calendar logic** — extend `useUpdateContactStatus` to compute `next_action_at`. Surface relative due dates on cards.
3. **Today queue** — new tab on the CRM dashboard. Group by sender → step → contact. Mark-done button.
4. **Playbook page restructure** — extract the existing playbook page content into a `<ChannelTab channel="linkedin">` component. Wrap in tabs. Add the other 5 channels as empty placeholders.
5. **Strategic overview block** — sales-routes mindmap SVG + reference examples panel above the tabs.
6. **Dual-sender filters & badges** — filter chips, cross-acceptance badge, manual set + prompt flow.

Steps 1-3 are the operational unlock (CRM becomes calendar-driven, daily action queue exists). Steps 4-6 are the structural cleanup (playbook becomes a real strategy hub).

If we have to ship something this week, ship 1-3. They make the system actually useful day-to-day. 4-6 can come once the strategy work locks in.

---

## 6. Out of scope for v2

- Template content for non-LinkedIn channels — depends on strategy decisions still to make.
- Sales-routes mindmap content — depends on locking channel strategy first.
- Reference examples seed content — Rob and Bertie curate manually.
- Editing the mindmap in-app — v3 problem.
- Per-contact video URL storage (for the personalised Loom-style demos) — flag as v2.1 if it becomes a pain point.

---

## 7. Open decisions (re-flagged in one place)

| # | Decision | Default if no answer |
|---|---|---|
| 1.3 | Tab grouping: 6 flat tabs vs grouped | 6 flat tabs |
| 1.4 | Reference panel contents | External examples only |
| 4.4 | Cross-acceptance default behaviour | Reassign automatically + warm-intro option |

---

## 8. What we're NOT changing in v2

- Industry map ordering (relevance tier → employee count desc, nulls last). It works.
- Status enum on `crm_contacts`. Stable.
- Admin gating via email allowlist + `is_proppath_admin()`. Stable.
- The 7 LinkedIn step templates themselves — they need a rewrite, but that's a content task, not a schema task. Lives in the same table.

---

## 9. Living doc rules

- New ideas during sessions → add to this doc, not to chat.
- Section marked OPEN → don't ship that piece until decision is made.
- When something ships, move the section from spec into a "Shipped" note at the bottom, with date.

### Shipped log

_Nothing yet — v2 not started._
