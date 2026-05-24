# Claude Code Prompt — CRM v2 (Simplified)

**Context for the agent:** Surgical changes to the existing CRM module at `/admin/crm` and playbook page at `/admin/crm/playbook`. Do not refactor anything not explicitly called out.

---

## What we're shipping

1. **Playbook page cleanup** — remove numbers section, 2-tab layout (LinkedIn / Future channels), 7 principles, 5 reusable content templates, list-building section.
2. **Red overdue indicator** — single red exclamation icon on kanban cards when a contact has been in their current pipeline stage too long.
3. **Sender icon (R/J)** — small toggleable chip on each kanban card showing whose pipeline the contact is on.

---

## Files affected

| File | Change |
|---|---|
| `supabase/migrations/20260514000000_crm_v2.sql` | NEW — schema + template content updates |
| `src/lib/crmHelpers.ts` | Add `DURATION_BY_STATUS` + `isContactOverdue()` helper |
| `src/pages/admin/CrmPlaybook.tsx` | Convert to 2-tab layout, remove PacingPanel + flow diagram |
| `src/components/crm/PrinciplesPanel.tsx` | Replace content (Section 3) |
| `src/components/crm/PacingPanel.tsx` | DELETE |
| `src/components/crm/OutreachFlowDiagram.tsx` | DELETE |
| `src/components/crm/OutreachStepCard.tsx` | Remove male/female variants + day label display, single template body |
| `src/components/crm/ListBuildingPanel.tsx` | NEW (Section 5) |
| `src/components/crm/FutureChannelsMindmap.tsx` | NEW (Section 6) |
| `src/components/crm/PipelineCard.tsx` | Add red overdue icon + sender chip |
| `src/hooks/useOutreachSteps.ts` | Update type: drop `template_female`, rename `template_male` → `template_body` |

---

## 1. Database migration

`supabase/migrations/20260514000000_crm_v2.sql`:

```sql
-- 1.1 Sender assignment on crm_contacts (single field, nullable)

ALTER TABLE public.crm_contacts
  ADD COLUMN assigned_to text;

ALTER TABLE public.crm_contacts
  ADD CONSTRAINT crm_contacts_assigned_to_check
  CHECK (assigned_to IS NULL OR assigned_to IN ('rob', 'james'));

-- 1.2 Outreach steps: drop female variant, rename male → body

ALTER TABLE public.crm_outreach_steps
  DROP COLUMN IF EXISTS template_female;

ALTER TABLE public.crm_outreach_steps
  RENAME COLUMN template_male TO template_body;

-- 1.3 Wipe existing template rows — we're replacing the entire set

DELETE FROM public.crm_outreach_steps;

-- 1.4 Insert the 5 new content templates
--      Day labels and step numbering are not surfaced in the UI; columns stay
--      for compatibility but values are intentionally generic.

INSERT INTO public.crm_outreach_steps (step_key, step_order, day_label, step_title, description, template_body, notes) VALUES
(
  'demo_video_cofounder',
  1,
  '',
  'Demo video — cofounder',
  'Pre-recorded video where Rob and James walk through the problem and the product. Single asset, not personalised. The default video for higher-volume outreach when there''s no time for a personalised Loom.',
  'Hey [Name] — [hook]. Quick 2-min video below where we walk through what we built and the problem it solves for buyers agents working with investment clients.',
  'The accompanying DM still needs a specific hook in the [hook] slot. The video does the heavy lifting; the DM only earns the click.'
),
(
  'demo_video_loom',
  2,
  '',
  'Demo video — personalised Loom',
  'Recorded fresh for a specific prospect. Mirror their business — if they''re a Brisbane BA targeting first-home investors, build a Brisbane first-home-investor roadmap on screen. ~2-3 min.',
  'Hey [Name] — built this one for you specifically. Walked through what a [their client type, e.g. Sydney investment client] roadmap looks like inside PropPath. ~2 min below.',
  'Reserved for high-value prospects (whales, content creators, named warm-list contacts). Reciprocity-heavy — even prospects who weren''t interested often respond because you put in real effort for them.'
),
(
  'case_study_message',
  3,
  '',
  'Case study — beta tester quote',
  'Reference a beta tester''s experience. Use once Ben at Compound (or another tester) gives a quotable line.',
  'Hey [Name] — [hook]. [Beta tester name] from [their firm] has been using PropPath for [time period] and said [quote]. Thought it might be relevant given [specific thing about their work]. Quick walkthrough below if you want a look.',
  'Only deploy when you have a real, specific, attributable quote. Generic case-study framing without a name kills credibility.'
),
(
  'reengage_clients_message',
  4,
  '',
  'Re-engage existing clients — market change hook',
  'Hook the BA around a specific recent market event (rate move, budget change, negative gearing change, regulatory shift) and PropPath''s ability to remodel client scenarios in under a minute.',
  'Hey [Name] — with [specific recent event — rate move, budget change, regulatory shift this week], your investment clients are about to be asking "what does this mean for my plan?" Built a tool that lets you remodel any client''s scenario in under a minute and show them the new picture. Quick walkthrough below.',
  'The [specific recent event] slot is non-negotiable. Update to the most relevant news of the sending week. Generic "recent changes" reads as mail-merge and kills the message.'
),
(
  'pricing_positioning',
  5,
  '',
  'Pricing positioning',
  'Standing positioning for any pricing conversation — applies across every touch and call.',
  'Charge from day one. Money-back guarantee, not free trials. Payment signals real value and self-selects serious users.',
  'Beta access is the exception — but every conversation that gets past beta should anchor to the paid tier, not a free runway.'
);
```

---

## 2. Overdue indicator (red icon on cards)

### 2.1 Add the duration map

In `src/lib/crmHelpers.ts`:

```ts
/**
 * Days a contact can sit in a given status before the card flags as overdue.
 * NULL = terminal status (never overdue).
 */
export const DURATION_BY_STATUS: Record<ContactStatus, number | null> = {
  not_contacted: null,
  connection_sent: 10,
  connected: 1,
  video_sent: 14,
  replied: null,
  demo_booked: null,
  beta_tester: null,
  dead: null,
};

export function isContactOverdue(contact: CrmContact, now = new Date()): boolean {
  const days = DURATION_BY_STATUS[contact.status];
  if (days === null) return false;

  const statusSetAt = getStatusSetTimestamp(contact);
  if (!statusSetAt) return false;

  const dueAt = new Date(statusSetAt);
  dueAt.setDate(dueAt.getDate() + days);
  return now > dueAt;
}

function getStatusSetTimestamp(contact: CrmContact): string | null {
  switch (contact.status) {
    case 'connection_sent': return contact.connection_sent_at;
    case 'video_sent':      return contact.video_sent_at;
    case 'connected':       return contact.last_touch_at;
    default:                return contact.last_touch_at;
  }
}
```

No DB writes needed for the overdue logic — computed on the fly from existing timestamps. Leave `next_action_at` alone for now.

### 2.2 Render on the card

In `src/components/crm/PipelineCard.tsx`:

- Use `isContactOverdue(contact)` to gate a small red `AlertCircle` icon (from `lucide-react`) in the top-right of the card.
- Existing first-added date display stays as-is.

Icon style: red foreground, no background, ~14px. Top-right of the card, inside the padding.

No tooltips, no relative-date text, no Today queue.

---

## 3. Principles update

Replace the contents of the `PRINCIPLES` array in `src/components/crm/PrinciplesPanel.tsx` with this exact list — **seven** items, in this order:

```ts
const PRINCIPLES = [
  { bold: 'One person per agency at a time.', rest: 'Never message two people at the same firm in parallel.' },
  { bold: "Don't burn whales early.", rest: 'Within each relevance tier, work smallest agencies first. Exception: a warm intro overrides size-first.' },
  { bold: 'Mark Dead and stop.', rest: 'If they haven\'t replied across the cadence, silence is the answer.' },
  { bold: 'Warm intro > 20 cold messages.', rest: 'Engineer them via Joshua, beta testers, and mutual connections.' },
  { bold: 'One voice, one sender.', rest: "James's account = James's voice. Rob's account = Rob's voice. No \"we built\" — slips into cofounder framing that doesn't match the profile photo." },
  { bold: 'Every touch carries a specific hook.', rest: 'Reference their firm, a recent post, or a named event in the market this week. Generic openers are dead touches.' },
  { bold: 'Profile visits plant a flag.', rest: "View every prospect's LinkedIn profile the day before the invite goes. They get notified — name recognition before the first touch." },
];
```

---

## 4. Templates — flat content assets, no flow

After the migration, `crm_outreach_steps` contains exactly **5 rows**, all reusable content assets we copy-paste as needed across whatever channel:

| step_key | step_title |
|---|---|
| demo_video_cofounder | Demo video — cofounder |
| demo_video_loom | Demo video — personalised Loom |
| case_study_message | Case study — beta tester quote |
| reengage_clients_message | Re-engage existing clients — market change hook |
| pricing_positioning | Pricing positioning |

**Rendering** in `OutreachStepCard.tsx` and `CrmPlaybook.tsx`:

- Render all 5 as a flat grid (or stacked list) inside the LinkedIn tab.
- **Do not display** `day_label` or step numbering. Each card shows: `step_title`, `description`, editable `template_body`, `notes`.
- Each card has a copy-to-clipboard button on the `template_body`.
- Order on display: by `step_order` ascending. The numbers themselves are not surfaced to the user.

---

## 5. Playbook page structure

`src/pages/admin/CrmPlaybook.tsx`:

```
┌─────────────────────────────────────────────────────────┐
│ ← CRM   Outreach Playbook                                │
├─────────────────────────────────────────────────────────┤
│ Tabs:  [ LinkedIn ]  [ Future channels ]                 │
├─────────────────────────────────────────────────────────┤
│ LinkedIn tab content:                                    │
│   1. Principles                                          │
│   2. List-building sources                               │
│   3. Templates (5, flat)                                 │
│                                                          │
│ Future channels tab content:                             │
│   - 6-node mindmap                                       │
└─────────────────────────────────────────────────────────┘
```

**Remove:**
- `<PacingPanel />` import + usage. Delete the file.
- `<OutreachFlowDiagram />` import + usage. Delete the file.

**Tabs:** use the shadcn `Tabs` component (already in the codebase). Default to "LinkedIn".

---

## 6. List-building sources panel

New file: `src/components/crm/ListBuildingPanel.tsx`. Static content, no DB. Collapsible card matching the look of `PrinciplesPanel`.

Two subsections:

### Directories

- REBAA member directory — https://rebaa.com.au/find-a-buyers-agent/
- PIPA member directory — https://pipa.asn.au/find-a-pipa-investment-professional/
- HTAG directory — *(URL to confirm)*

### Online sources

- Gameplans partners page — competitor users; tech-forward, already in the category
- Open BA testimonial page — same logic
- Reddit r/AusPropertyChat — BA names get mentioned by investors regularly
- LinkedIn Sales Navigator — filter: "buyers agent" + "investment" in Australia

Each row: source name + short note + small external-link icon where there's a URL.

---

## 7. Future channels mindmap

New file: `src/components/crm/FutureChannelsMindmap.tsx`. SVG, central node "PropPath outreach," 6 channel nodes arranged radially. No arrows between channels, no phasing, no hierarchy. Reference visual only.

Nodes:

1. LinkedIn outreach (connection + InMail)
2. Email outreach
3. Instagram DMs
4. TikTok DMs
5. Mortgage broker referrals
6. Buyers agent referrals

Style: dark theme matching the rest of the playbook. Central node foreground-white, channel nodes muted card colour with border. Connector lines from centre to each channel in muted grey. ~600x400 viewBox.

---

## 8. Sender icon on cards

On `PipelineCard.tsx`, add a small sender chip in the card header (next to or below the contact name).

Three states:

- `R` — Rob (indigo background)
- `J` — James (emerald background)
- empty — unassigned (subtle grey outline, no fill)

Click → cycles through: unassigned → Rob → James → unassigned. On click, write the new value to `crm_contacts.assigned_to`.

That's the entire sender feature. No filter chips, no prompts, no cross-acceptance tracking. The "James got rejected but Rob got accepted" case is handled implicitly — Rob notices, clicks the chip, contact moves to his pipeline visually.

---

## 9. Build order

1. **Migration** (Section 1) — schema + new template rows. Verify by loading `/admin/crm/playbook` and seeing 5 templates.
2. **`DURATION_BY_STATUS` + `isContactOverdue`** (Section 2.1) — helper functions, no UI yet.
3. **Red overdue icon** (Section 2.2) — render on pipeline cards.
4. **Sender chip on cards** (Section 8) — toggleable, writes to DB.
5. **Principles content update** (Section 3) — 7-item list.
6. **Playbook page restructure** (Section 5) — 2 tabs, remove pacing + flow diagram.
7. **Flat template rendering** (Section 4) — single `template_body`, no day label, no numbering, copy-to-clipboard button.
8. **List-building panel** (Section 6) — new component in LinkedIn tab.
9. **Future channels mindmap** (Section 7) — new component in Future channels tab.

Steps 1-4 are the operational changes (cards signal what to do + who owns each contact). Steps 5-9 are the playbook content cleanup. Ship in order; each step works on its own.

---

## 10. Things to NOT change

- Industry map sort order (relevance tier → employees desc, nulls last).
- Status enum on `crm_contacts`.
- Admin gating.
- `useCrmCompanies` query shape — just consume the new `assigned_to` field.
- Existing first-added-date display on cards.

---

## 11. Acceptance checklist

- [ ] `/admin/crm/playbook` shows 2 tabs: LinkedIn, Future channels.
- [ ] No "Numbers & pacing" panel anywhere.
- [ ] No flow diagram. Templates render as a flat list/grid.
- [ ] Principles panel shows exactly 7 items in the specified order.
- [ ] Templates show 5 cards: cofounder demo video, personalised Loom, case study message, re-engage clients message, pricing positioning.
- [ ] Templates show a single editable `template_body`, no male/female toggle, no day label, no step numbering.
- [ ] Each template card has a copy-to-clipboard button on the body.
- [ ] List-building sources panel renders inside the LinkedIn tab.
- [ ] Future channels tab shows the 6-node mindmap.
- [ ] Kanban cards show a red exclamation icon when the contact is overdue.
- [ ] Kanban cards show a sender chip that toggles between unassigned / R / J.
- [ ] No TypeScript errors, no console errors on `/admin/crm` or `/admin/crm/playbook`.
