# CRM playbook page — Claude Code handover spec

**Audience:** Claude Code, run from inside `ignito-project-kit/`.
**Author:** Bertie, 2026-05-12.
**Purpose:** Add an editable "outreach playbook" page at `/admin/crm/playbook` that displays the canonical sales motion and lets Rob/James edit the message templates inline. Content source: `OUTREACH-PLAYBOOK.md` at the repo root.

## 1. Goal

A new admin-only page that:

- Renders the principles, numbers, and the canonical 7-step outreach flow.
- Displays both Male ("Hey mate") and Female ("Hey [Name]") variants of every template.
- Allows editing any template body or notes inline, persisted to the database.
- Lives in the same dark-mode aesthetic as the existing `/admin/crm` page.

Same gating as the rest of the CRM: only emails in `src/config/proppathAdmin.ts` can access it.

## 2. Schema (new migration)

Create `supabase/migrations/<timestamp>_create_crm_outreach_steps.sql`:

```sql
CREATE TABLE public.crm_outreach_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_key text NOT NULL UNIQUE,
  step_order integer NOT NULL,
  day_label text NOT NULL,
  step_title text NOT NULL,
  description text,
  template_male text,
  template_female text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_outreach_steps_order ON public.crm_outreach_steps(step_order);

CREATE TRIGGER trg_crm_outreach_steps_updated_at
  BEFORE UPDATE ON public.crm_outreach_steps
  FOR EACH ROW EXECUTE FUNCTION public.tg_crm_set_updated_at();

ALTER TABLE public.crm_outreach_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PropPath admins manage crm_outreach_steps"
  ON public.crm_outreach_steps
  FOR ALL
  USING (public.is_proppath_admin())
  WITH CHECK (public.is_proppath_admin());
```

After the schema, seed the table with the 7 steps from `OUTREACH-PLAYBOOK.md`. The exact `INSERT` statements are listed in section 8 of this spec — use them verbatim.

Regenerate Supabase types after the migration.

## 3. Route

In `src/AppRouter.tsx`, add inside the existing routes block:

```tsx
<Route
  path="/admin/crm/playbook"
  element={
    <ProtectedRoute allowedRoles={['owner', 'agent']}>
      <AdminOnlyRoute>
        <CrmPlaybook />
      </AdminOnlyRoute>
    </ProtectedRoute>
  }
/>
```

## 4. LeftRail nav

In `src/components/LeftRail.tsx`, add a new button after the existing CRM nav button (the `Building2` one for `/admin/crm`). Gate with the same `isPropPathAdmin(user?.email)` check. Icon: `BookOpen` from `lucide-react`.

```tsx
{isPropPathAdmin(user?.email) && (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        onClick={() => navigate('/admin/crm/playbook')}
        className={navButtonClasses(location.pathname === '/admin/crm/playbook')}
        aria-label="Outreach playbook"
      >
        <BookOpen size={20} />
      </button>
    </TooltipTrigger>
    <TooltipContent side="right">Outreach playbook</TooltipContent>
  </Tooltip>
)}
```

## 5. File structure

```
src/
  pages/
    admin/
      CrmPlaybook.tsx                       # the page
  components/
    crm/
      OutreachStepCard.tsx                  # one card per step
      OutreachTemplateEditor.tsx            # textarea + auto-save (used twice per card: male/female)
      PrinciplesPanel.tsx                   # bullet list of principles
      PacingPanel.tsx                       # numbers and recommended cadence
  hooks/
    useOutreachSteps.ts                     # fetch all steps ordered by step_order
    useUpdateOutreachStep.ts                # patch any field (template_male, template_female, notes)
supabase/
  migrations/
    <timestamp>_create_crm_outreach_steps.sql
```

## 6. Page layout

Same `.dark` wrapper as `CrmDashboard.tsx`. Same `LeftRail` + content offset (`ml-16`). Layout top to bottom:

1. **Header.** "Outreach playbook" + one-line subtitle ("Editable templates · last updated [most recent step's updated_at]").
2. **PrinciplesPanel.** The 9 bullet points from section "Principles" in `OUTREACH-PLAYBOOK.md`. Static, not editable in v1.
3. **PacingPanel.** Card showing target volumes (170 invites, 120 video DMs, 18 replies, 9 demos, 5 beta testers) and recommended weekly pacing (25-30/week ramp to 40-50/week). Static, not editable in v1.
4. **Outreach steps section header:** "Templates"
5. **Step cards.** One `OutreachStepCard` per row in `crm_outreach_steps`, ordered by `step_order`.

## 7. OutreachStepCard structure

Each card:

```
┌───────────────────────────────────────────────────────────────────┐
│ Step 3 · Day +1 · Video + DM                          [pencil]    │
│ The day after they accept. Personalised 90-sec video + 2 sentences │
├───────────────────────────────────────────────────────────────────┤
│ [Male — "Hey mate"]  [Female — "Hey [Name]"]                       │
│                                                                    │
│ <textarea — currently selected variant, ~4 rows tall>              │
│                                                                    │
├───────────────────────────────────────────────────────────────────┤
│ Notes                                                              │
│ <textarea — notes field, ~3 rows>                                  │
└───────────────────────────────────────────────────────────────────┘
```

- Card surface: `bg-card border border-border rounded-lg p-5`.
- Step number + Day label + Title: row at top, `text-sm font-medium`. Day label gets `text-muted-foreground`.
- Description: `text-xs text-muted-foreground mt-1 mb-4`.
- Variant toggle: a `Tabs` component from shadcn (already installed), two tabs.
- Active tab content: a single `OutreachTemplateEditor` rendering the relevant `template_male` or `template_female` field.
- Notes: a separate `OutreachTemplateEditor` (or simpler `Textarea` from shadcn) bound to the `notes` field.

For Step 1 (Day 0 · Blank invite), the templates are intentionally empty. Render a placeholder: `<em class="text-muted-foreground">(no message — blank invite)</em>` instead of an editor. Still allow editing notes.

## 8. Seed data

Run these inserts inside the migration file:

```sql
INSERT INTO public.crm_outreach_steps (step_key, step_order, day_label, step_title, description, template_male, template_female, notes) VALUES
(
  'day_0_invite',
  1,
  'Day 0',
  'Blank LinkedIn request',
  'First touch on a cold prospect. Sent from James''s LinkedIn account.',
  NULL,
  NULL,
  'Blank invites accept at higher rates than pitched invites. Add the Day 0 personalisation note to the contact''s CRM record — a specific thing about them you''ll reference in the Day +1 video.'
),
(
  'day_10_inmail',
  2,
  'Day 10',
  'InMail fallback',
  'Connection request still unaccepted at Day 10. Send InMail with the same content as the Day +1 DM.',
  'Hey mate — built something I think you''d find useful as a buyers agent. 90 seconds, no slides, tell me to piss off if it''s not your thing.

[Video link]',
  'Hey [Name] — built something I think you''d find useful as a buyers agent. 90 seconds, no slides, tell me to piss off if it''s not your thing.

[Video link]',
  'Uses an InMail credit. LinkedIn Premium Business = 15 InMails/month. Don''t dwell on the "we couldn''t connect" framing — reads as desperate.'
),
(
  'day_1_video_dm',
  3,
  'Day +1',
  'Video + DM',
  'The day after they accept the connection. Personalised 90-sec video + 2-sentence DM.',
  'Hey mate — built something I think you''d find useful. 90 sec, no slides. Tell me to piss off if it''s not your thing.',
  'Hey [Name] — built something I think you''d find useful. 90 sec, no slides. Tell me to piss off if it''s not your thing.',
  'Video script: first 15-20 sec is hyper-personal (name, firm, the specific thing noted on Day 0). Remaining ~70 sec is the platform doing the thing that matches their work. CTA inside video: "If you want to play with this on a real client of yours, happy to drop you a login — no calls, no pitch."'
),
(
  'day_4_soft_nudge',
  4,
  'Day +4',
  'Soft nudge',
  'Day +4 after the video DM. Only if they haven''t replied. One touch, then stop until Day +14.',
  'Hey mate — if you want to have a quick mess around with this on a real client, happy to drop you a login. Otherwise no harm done.',
  'Hey [Name] — if you want to have a quick mess around with this on a real client, happy to drop you a login. Otherwise no harm done.',
  'Don''t reference the previous message. Don''t say "just bumping this up." Don''t ask if they saw it. Just re-offer the value.'
),
(
  'day_14_remodel_hook',
  5,
  'Day +14',
  'Remodel hook',
  'Day +14 after the video DM. Only if they still haven''t replied. References recent property landscape changes.',
  'Hey mate — given the recent changes in the property landscape, our platform lets you remodel and re-engage all your clients'' scenarios in under a minute. Worth a look if you''re fielding "what does this mean for me" questions from clients right now.',
  'Hey [Name] — given the recent changes in the property landscape, our platform lets you remodel and re-engage all your clients'' scenarios in under a minute. Worth a look if you''re fielding "what does this mean for me" questions from clients right now.',
  'Update "recent changes in the property landscape" to reference the most recent specific event (rate move, budget announcement, tax change) — keep it current to the week you''re sending.'
),
(
  'day_28_email',
  6,
  'Day +28',
  'Email',
  'Channel switch from LinkedIn to email. Final touch in the cadence. Case study (once available) or budget/rate bridge version.',
  'Hey mate — last note from me. Most BAs we talk to are getting client questions about how the [recent rate / budget shift] plays into their existing portfolios. We built a quick way to remodel any client''s scenario in under a minute and show them the new picture.

60-sec walkthrough: [link]

If you want the platform login I mentioned on LinkedIn, happy to resend so it doesn''t get lost. Otherwise no further follow-ups from me — appreciate your time either way.',
  'Hey [Name] — last note from me. Most BAs we talk to are getting client questions about how the [recent rate / budget shift] plays into their existing portfolios. We built a quick way to remodel any client''s scenario in under a minute and show them the new picture.

60-sec walkthrough: [link]

If you want the platform login I mentioned on LinkedIn, happy to resend so it doesn''t get lost. Otherwise no further follow-ups from me — appreciate your time either way.',
  'Subject line: "Modelling [recent change] for investment clients in 30 seconds" OR "How [Beta tester firm] uses PropPath for [strategy]" once case study is ready. Swap the middle paragraph for case-study framing once you have a beta tester quote.'
),
(
  'day_120_reengage',
  7,
  'Day +120',
  'Optional re-engage',
  'Only if you have a genuinely new reason. Otherwise leave them alone permanently.',
  'Hey mate — appreciate it''s been a while. [Specific new thing — e.g. "Ben at Compound just told me his clients are leaning into [X] strategy and we shipped a feature for that this week"]. Thought you might want a fresh look. No follow-ups if not — just felt it''d be wrong not to mention.',
  'Hey [Name] — appreciate it''s been a while. [Specific new thing]. Thought you might want a fresh look. No follow-ups if not — just felt it''d be wrong not to mention.',
  'If you can''t fill in [Specific new thing] with a real, current, prospect-relevant fact, skip this step entirely. "Just thinking of you" sends don''t qualify.'
);
```

## 9. Hooks

### `useOutreachSteps`

Direct Supabase call inside `useEffect`. Returns `{ steps, loading, error, refetch }`. Order by `step_order ASC`. Mirror the pattern of `useCrmCompanies`.

### `useUpdateOutreachStep`

Returns a function `(stepId: string, patch: Partial<OutreachStep>) => Promise<void>`. Calls `supabase.from('crm_outreach_steps').update(patch).eq('id', stepId)`. On success, toast a confirmation. On error, toast the error. Parent is responsible for refetching.

## 10. OutreachTemplateEditor behaviour

- Renders a shadcn `Textarea` with `rows={4}` (or `rows={3}` for notes).
- Holds local state for the textarea content.
- Debounces save: on `onBlur` OR after 1500ms of no typing, persist via the update hook.
- Shows a small "Saved · just now" indicator below the textarea after a successful save (fade after 3 seconds).
- Shows "Saving..." while in flight.
- On error: toast the error and revert the local state to the last persisted value.

Use `useDebounce` from `src/hooks/useDebounce.ts` (already in the codebase) for the 1500ms debounce.

## 11. PrinciplesPanel content

Render the 9 principle bullets verbatim from `OUTREACH-PLAYBOOK.md` section "Principles". Use a simple `<ul>` with `text-sm text-muted-foreground`, `space-y-2`. Collapsible header: "Principles" with chevron toggle (default expanded).

## 12. PacingPanel content

A card with two columns:

- **Left column:** "Funnel target" — a small table showing the 5 → 9 → 18 → 120 → 170 progression from `OUTREACH-PLAYBOOK.md` section "Numbers and pacing".
- **Right column:** "Weekly pacing" — three rows: Week 1-2 (25-30/wk), Week 3-4 (40-50/wk), Week 5+ (steady 40-50/wk). Plus a one-line bottom note: "Estimated timeline: 4-6 weeks of disciplined outreach."

Both columns are static text in v1. Editing these is deferred to v2.

## 13. Acceptance criteria

- Migration runs cleanly. Seven rows visible in `crm_outreach_steps`.
- Page accessible only to PropPath admins. Others get redirected.
- LeftRail shows a "Playbook" nav entry next to the existing CRM entry (admins only).
- All seven steps render in `step_order`, with correct Day labels and titles.
- Switching between Male and Female tabs swaps the textarea content correctly.
- Editing a template body and clicking outside (blur) persists the change.
- Refreshing the page shows the persisted edits.
- Notes field is editable and persists.
- Step 1 (Day 0) shows the empty-template placeholder, not a textarea.
- Principles panel and Pacing panel render correctly.
- Whole page renders in dark mode regardless of global theme.
- `npm run build` succeeds with no TypeScript errors.

## 14. Out of scope (v2)

- Editing the principles or pacing in the database. v1 they're static.
- Version history of template edits.
- A/B variant tracking (e.g. send 50% on variant A, 50% on variant B, measure).
- Per-template usage analytics.
- Inline preview of how the template renders with a real contact's name substituted.
- Markdown rendering inside the template editor.

## 15. Notes for Claude Code

- Mirror the existing direct-Supabase data fetching pattern. Do not introduce TanStack Query.
- Use the same `.dark` wrapper pattern as `CrmDashboard.tsx` for local dark mode.
- Use `react-hook-form` if the editor logic gets complex, but for simple debounced textareas, plain `useState` + `useDebounce` is cleaner.
- Don't introduce a rich-text editor (TipTap, Slate, etc.) — plain textareas are correct here.
- Don't add `BulkImportDialog`-style features.
- Use existing shadcn components: `Card`, `Tabs`, `Textarea`, `Button`, `Tooltip`.

End of spec.
