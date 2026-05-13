# PropPath internal CRM — Claude Code handover spec

**Audience:** Claude Code, run from inside `ignito-project-kit/`.
**Author:** Bertie (PropPath research partner), 2026-05-12.
**Purpose:** Build a PropPath-internal sales CRM as an admin-only module inside the existing app. Two synchronised views (industry map + pipeline kanban) over a single Supabase data model, gated behind an email allowlist so only Rob and James can see it.

---

## 1. Goal and non-goals

**Goal.** Replace the current PropPath_Industry_Map Google Sheet with a database-backed CRM that:

- Preserves the top-down "whole industry" view Rob already has (one column per company, ranked by relevance, smallest companies first within each tier).
- Tracks per-person outreach status through a Pipedrive-style kanban (Connection sent -> Connected -> Video sent -> Replied -> Demo booked -> Beta tester -> Dead).
- Lives inside the PropPath codebase so updates ship through the same pipeline as the product.
- Bulk-imports the existing CSV once, then accepts low-friction manual additions.

**Non-goals (defer to v2).**

- LinkedIn API/scraping integration. Manual data entry is fine at current volume.
- Email integration / sequencing.
- Multi-user activity feed.
- Reporting dashboards.
- Mobile-responsive layout. Desktop only is acceptable.

---

## 2. Confirmed stack (no changes required)

- Vite 7 + React 18 + TypeScript.
- Tailwind 3.4 with HSL CSS variables (`--background`, `--card`, etc. defined in `src/index.css` for both light and `.dark` modes).
- shadcn/ui (full Radix suite installed — `@/components/ui/*`).
- Supabase JS v2 (`@/integrations/supabase/client`).
- React Router DOM v6, routes centralised in `src/AppRouter.tsx`.
- `@dnd-kit/core` for drag and drop (existing hook pattern at `src/hooks/usePropertyDragDrop.ts` — mirror it).
- Lucide icons (`lucide-react`).
- Data fetching pattern in this codebase is **direct Supabase calls inside custom hooks with `useState` + `useEffect`** — not TanStack Query. Follow that pattern.
- `cn()` util at `@/lib/utils`.

---

## 3. Auth gating — PropPath internal admin

The existing `profiles.role` enum (`'owner' | 'agent' | 'client'`) describes tenant roles inside customer companies. It's the wrong gate for the CRM, because every signup defaults to `'owner'`. We need a separate "is this Rob or James" check.

### 3.1 Add an admin allowlist config

Create `src/config/proppathAdmin.ts`:

```ts
// Source of truth for who can access the PropPath internal CRM.
// Update this list when bringing on internal sales staff.
export const PROPPATH_ADMIN_EMAILS = [
  'rob@proppath.com.au',
  'james@proppath.com.au',
] as const;

export function isPropPathAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return (PROPPATH_ADMIN_EMAILS as readonly string[])
    .map(e => e.toLowerCase())
    .includes(email.toLowerCase());
}
```

Replace the placeholder emails with the actual PropPath admin emails before deploying.

### 3.2 Route guard wrapper

Create `src/components/AdminOnlyRoute.tsx`:

```tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isPropPathAdmin } from '@/config/proppathAdmin';

export function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null; // or a spinner consistent with existing pages
  if (!isPropPathAdmin(user?.email)) return <Navigate to="/home" replace />;
  return <>{children}</>;
}
```

### 3.3 Database-level enforcement

Mirror the gate inside Postgres with a `SECURITY DEFINER` helper so RLS can't be bypassed by a leaked client-side check. See the migration in section 4.

---

## 4. Database schema

Create `supabase/migrations/<YYYYMMDDHHMMSS>_create_crm_tables.sql` (use the migration timestamp convention already in the repo). Migration body:

```sql
-- =====================================================================
-- PropPath internal CRM tables
-- =====================================================================

-- Enums --------------------------------------------------------------
CREATE TYPE public.crm_relevance_tier AS ENUM ('high', 'medium', 'low');

CREATE TYPE public.crm_contact_status AS ENUM (
  'not_contacted',
  'connection_sent',
  'connected',
  'video_sent',
  'replied',
  'demo_booked',
  'beta_tester',
  'dead'
);

-- Admin gate ---------------------------------------------------------
-- SECURITY DEFINER so RLS policies can reference it without exposing
-- the admin email list to clients. Keep this list in sync with
-- src/config/proppathAdmin.ts.
CREATE OR REPLACE FUNCTION public.is_proppath_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE(
    (SELECT lower(email)
     FROM auth.users
     WHERE id = auth.uid()) IN (
       'rob@proppath.com.au',
       'james@proppath.com.au'
     ),
    false
  );
$$;

COMMENT ON FUNCTION public.is_proppath_admin() IS
  'Returns true if the current authenticated user is a PropPath internal admin (Rob or James). Used in RLS policies on crm_* tables.';

-- Companies ----------------------------------------------------------
CREATE TABLE public.crm_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  relevance_tier public.crm_relevance_tier NOT NULL DEFAULT 'medium',
  employees integer,
  state text,
  website text,
  blurb text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.crm_companies IS
  'PropPath sales target accounts. One row per BA agency. size_tier is derived in the application layer from employees.';

CREATE INDEX idx_crm_companies_relevance_employees
  ON public.crm_companies(relevance_tier, employees ASC NULLS LAST);

-- Contacts -----------------------------------------------------------
CREATE TABLE public.crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.crm_companies(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  title text,
  linkedin_url text,
  status public.crm_contact_status NOT NULL DEFAULT 'not_contacted',
  connection_sent_at timestamptz,
  video_sent_at timestamptz,
  replied_at timestamptz,
  last_touch_at timestamptz,
  next_action_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.crm_contacts IS
  'Individual people inside CRM companies. Status drives the pipeline kanban.';

CREATE INDEX idx_crm_contacts_company_id ON public.crm_contacts(company_id);
CREATE INDEX idx_crm_contacts_status ON public.crm_contacts(status);
CREATE INDEX idx_crm_contacts_next_action_at
  ON public.crm_contacts(next_action_at)
  WHERE next_action_at IS NOT NULL;

-- updated_at triggers ------------------------------------------------
-- If the repo already has a generic set_updated_at() function, reuse it
-- instead of redefining. Otherwise:
CREATE OR REPLACE FUNCTION public.tg_crm_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_crm_companies_updated_at
  BEFORE UPDATE ON public.crm_companies
  FOR EACH ROW EXECUTE FUNCTION public.tg_crm_set_updated_at();

CREATE TRIGGER trg_crm_contacts_updated_at
  BEFORE UPDATE ON public.crm_contacts
  FOR EACH ROW EXECUTE FUNCTION public.tg_crm_set_updated_at();

-- RLS ----------------------------------------------------------------
ALTER TABLE public.crm_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contacts  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PropPath admins manage crm_companies"
  ON public.crm_companies
  FOR ALL
  USING (public.is_proppath_admin())
  WITH CHECK (public.is_proppath_admin());

CREATE POLICY "PropPath admins manage crm_contacts"
  ON public.crm_contacts
  FOR ALL
  USING (public.is_proppath_admin())
  WITH CHECK (public.is_proppath_admin());
```

After running the migration, regenerate the Supabase TypeScript types so `Database['public']['Tables']['crm_companies']` and `crm_contacts` are typed.

---

## 5. File structure

All new files. Nothing existing should be modified except `src/AppRouter.tsx` (add a route) and `src/components/LeftRail.tsx` (add a nav item).

```
src/
  config/
    proppathAdmin.ts                        # email allowlist + isPropPathAdmin()
  components/
    AdminOnlyRoute.tsx                      # route guard wrapper
    crm/
      IndustryMapView.tsx                   # View 1
      PipelineView.tsx                      # View 2
      CompanyColumn.tsx                     # one company in the map
      CompanyBlurbCard.tsx                  # blurb card rendered first inside CompanyColumn
      ContactRow.tsx                        # one person in a company column
      PipelineColumn.tsx                    # one stage column in the kanban
      PipelineCard.tsx                      # one card in a pipeline column
      SizeTierBadge.tsx                     # small | mid | whale pill
      RelevanceDot.tsx                      # green | amber | gray dot
      ContactStatusBadge.tsx                # status pill
      AddContactDialog.tsx                  # quick-add form
      AddCompanyDialog.tsx                  # quick-add form
      BulkImportDialog.tsx                  # CSV upload UI
      CrmKanban.tsx                         # DndContext wrapper for view 2
  hooks/
    useCrmCompanies.ts                      # fetch companies + counts
    useCrmContacts.ts                       # fetch contacts (all or by filter)
    useUpdateContactStatus.ts               # mutation: move card between stages
    useCrmKanbanDragDrop.ts                 # mirrors usePropertyDragDrop pattern
  lib/
    crmHelpers.ts                           # sizeTierFromEmployees, statusToColumn, etc.
  pages/
    admin/
      CrmDashboard.tsx                      # the page itself
supabase/
  migrations/
    <ts>_create_crm_tables.sql              # from section 4
scripts/
  import_leads_from_csv.py                  # already provided
```

---

## 6. Routes

In `src/AppRouter.tsx`, add the route inside the existing `<Routes>` block, wrapped in both `ProtectedRoute` (any authenticated user) and `AdminOnlyRoute` (Rob/James only):

```tsx
<Route
  path="/admin/crm"
  element={
    <ProtectedRoute allowedRoles={['owner', 'agent']}>
      <AdminOnlyRoute>
        <CrmDashboard />
      </AdminOnlyRoute>
    </ProtectedRoute>
  }
/>
```

The double-wrap is deliberate: `ProtectedRoute` handles the "are you logged in" check using existing infrastructure; `AdminOnlyRoute` adds the email allowlist on top. Defense in depth.

---

## 7. LeftRail nav entry

In `src/components/LeftRail.tsx`, add a new button after the Clients button (around line 137). Gate visibility with `isPropPathAdmin`:

```tsx
import { isPropPathAdmin } from '@/config/proppathAdmin';
import { Building2 } from 'lucide-react';

// ... inside the component, alongside the existing nav buttons:
{isPropPathAdmin(user?.email) && (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        onClick={() => navigate('/admin/crm')}
        className={navButtonClasses(location.pathname === '/admin/crm')}
        aria-label="CRM"
      >
        <Building2 size={20} />
      </button>
    </TooltipTrigger>
    <TooltipContent side="right">CRM</TooltipContent>
  </Tooltip>
)}
```

Match the styling of the surrounding buttons. Use whatever `navButtonClasses` helper / inline className pattern is already in use in that file.

---

## 8. Design tokens (Linear-style dark aesthetic)

The page must render in dark mode regardless of the rest of the app's theme. Do this by wrapping the page root in a `.dark` className — the existing `src/index.css` already defines the `.dark` CSS variables, so all shadcn components inside will pick up the dark palette automatically.

```tsx
// In CrmDashboard.tsx
<div className="dark min-h-screen bg-background text-foreground">
  {/* page content */}
</div>
```

### 8.1 Spacing and structure

- Page padding: `px-8 py-6`.
- Column widths: company columns 180px, pipeline columns 220px.
- Gap between columns: `gap-2` (8px).
- Card padding inside columns: `p-3` (12px).
- Card radius: `rounded-md` (matches existing shadcn).
- Page rhythm: section headers use the `meta`/14px muted-foreground style.

### 8.2 Colour usage (semantic)

| Concept                | Token                                              | Notes                                                                |
|------------------------|----------------------------------------------------|----------------------------------------------------------------------|
| Page background        | `bg-background`                                    | Near-black inside `.dark`.                                            |
| Card / column surface  | `bg-card`                                          | Slightly lifted from background.                                      |
| Muted borders          | `border-border`                                    | Low-opacity divider.                                                  |
| Primary text           | `text-foreground`                                  | High contrast but not pure white (handled by the var).                |
| Secondary text         | `text-muted-foreground`                            | For titles, dates, meta info.                                          |
| Active contact (map)   | `bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/30` | Use Tailwind colour utilities for the highlight tint.              |
| High relevance dot     | `bg-emerald-500`                                   | Small (`size-2 rounded-full`).                                         |
| Mid relevance dot      | `bg-amber-500`                                     |                                                                       |
| Low relevance dot      | `bg-zinc-500`                                      |                                                                       |
| Small size badge       | `bg-zinc-500/15 text-zinc-300`                     | Subtle pill.                                                          |
| Mid size badge         | `bg-blue-500/15 text-blue-300`                     |                                                                       |
| Whale size badge       | `bg-rose-500/15 text-rose-300`                     | The "do not burn early" visual cue.                                    |

### 8.3 Typography

- Body: `text-sm` (14px), `font-medium` for names, `font-normal` for titles and meta.
- Column headers (company name): `text-sm font-semibold`.
- Stage headers (pipeline): `text-xs uppercase tracking-wider text-muted-foreground`.
- Card name: `text-sm font-medium`.
- Card subtext (company name, date): `text-xs text-muted-foreground`.
- **No font sizes below 12px anywhere.**

### 8.4 Icons

Lucide only. Sizes: 14–20px inline, 16px is the default. No emoji.

---

## 9. View 1 — Industry map

The "map view". Companies displayed as columns, ranked left-to-right by `(relevance_tier ASC, employees ASC NULLS LAST)`. Each column contains the company header and a vertical list of its contacts.

### 9.1 Component contract

```tsx
// IndustryMapView.tsx
type CompanyWithContacts = {
  id: string;
  name: string;
  relevance_tier: 'high' | 'medium' | 'low';
  employees: number | null;
  state: string | null;
  contacts: Array<{
    id: string;
    full_name: string;
    title: string | null;
    status: ContactStatus;
  }>;
};

interface Props {
  companies: CompanyWithContacts[];
  onToggleActive: (contactId: string, currentlyActive: boolean) => void;
  onOpenContact?: (contactId: string) => void;
}
```

A contact is "active" if `status !== 'not_contacted' && status !== 'dead'`.

### 9.2 Sorting rules

Apply in the hook, not the component. Primary sort by relevance (high < medium < low), secondary by employees ascending (NULL last). Result: top-relevance smallest agencies first, biggest whales pushed to the right.

```ts
function sortCompaniesForMap(rows: CompanyWithContacts[]): CompanyWithContacts[] {
  const tierOrder = { high: 0, medium: 1, low: 2 };
  return [...rows].sort((a, b) => {
    const tierDiff = tierOrder[a.relevance_tier] - tierOrder[b.relevance_tier];
    if (tierDiff !== 0) return tierDiff;
    const ae = a.employees ?? Number.POSITIVE_INFINITY;
    const be = b.employees ?? Number.POSITIVE_INFINITY;
    return ae - be;
  });
}
```

### 9.3 Layout

Horizontal scroll. Use `overflow-x-auto` on the outer flex container. Each `CompanyColumn` is `flex-shrink-0 w-[180px]`.

### 9.4 CompanyColumn structure

```
┌───────────────────────────────┐
│ ● Company Name                │ ← relevance dot + name (font-semibold)
│ NSW · 213 staff · Whale       │ ← meta line: state · employees · size tier
│ 3/9 active                    │ ← active contact rollup (muted)
├───────────────────────────────┤
│ Investment property advisory  │ ← Blurb card — ALWAYS rendered first
│ helping clients achieve       │   inside the column, before any contact
│ financial freedom through...  │   rows. text-xs, muted-foreground, line
│                               │   -clamp-4 with a "more" affordance if
│                               │   the blurb is long (Radix HoverCard).
├───────────────────────────────┤
│ Scott Kuru          [active]  │ ← Active contacts (blue tint) first
│   CEO                         │
│ Callum Veitch       [active]  │
│   Paid ads dir.               │
│ ───                           │
│ David Morrison      [   ]     │ ← Untouched (no tint, dimmer text)
│ Tom Byron           [   ]     │
└───────────────────────────────┘
```

The blurb card is mandatory and is always the first card inside the column body, between the header (name/meta) and the contact list. Render it even if it's the only thing in the column (e.g. a company with zero contacts loaded — the blurb still gives context).

**Blurb card rules:**

- Container: same `bg-card border border-border rounded-md p-3` as a contact row.
- Text: `text-xs text-muted-foreground leading-relaxed`.
- Clamp to 4 lines with `line-clamp-4`. If the blurb is longer than 4 lines, wrap the card in a Radix `HoverCard` (already installed) so the full text shows on hover. No truncation UI inside the card itself — keep it visually quiet.
- If `blurb` is null/empty, render a placeholder card with `text-muted-foreground italic`: "No blurb yet — [add one]" where the bracketed text is a button that opens the company edit dialog (defer the dialog to v2; the placeholder can simply be inert until the edit dialog ships).
- Not selectable/draggable — it's purely contextual.

Within the contact list (below the blurb card), sort contacts: active ones first (by `last_touch_at DESC`), then untouched (alphabetical). The checkbox/tick on each row calls `onToggleActive(contactId, isCurrentlyActive)`. Toggling untouched -> active sets status to `connection_sent` and stamps `connection_sent_at = now()`. Toggling active -> untouched sets status back to `not_contacted` and clears the timestamps (confirm dialog).

Clicking the row body (not the checkbox) calls `onOpenContact(contactId)` if the prop is supplied — defer the drawer/details panel to v2 unless trivial.

### 9.5 Size tier rendering

Compute the size tier in `lib/crmHelpers.ts`:

```ts
export type SizeTier = 'small' | 'mid' | 'whale';

export function sizeTierFromEmployees(employees: number | null): SizeTier {
  if (employees == null) return 'small';
  if (employees < 50) return 'small';
  if (employees < 150) return 'mid';
  return 'whale';
}
```

`SizeTierBadge` reads the value and renders a coloured pill per section 8.2.

---

## 10. View 2 — Pipeline kanban

Pipedrive-style kanban. One column per status (excluding `not_contacted`, which is the "untouched" state shown only in the map). Same underlying contacts; this view filters to contacts where the status implies they're in the funnel.

### 10.1 Stage configuration

```ts
// lib/crmHelpers.ts
export const PIPELINE_STAGES = [
  { status: 'connection_sent', label: 'Connection sent' },
  { status: 'connected',       label: 'Connected' },
  { status: 'video_sent',      label: 'Video sent' },
  { status: 'replied',         label: 'Replied' },
  { status: 'demo_booked',     label: 'Demo booked' },
  { status: 'beta_tester',     label: 'Beta tester' },
  { status: 'dead',            label: 'Dead' },
] as const;
```

The kanban renders all seven columns left to right. `dead` sits at the far right and visually dims (reduced opacity, `text-muted-foreground` on the header).

### 10.2 Drag and drop

Mirror the existing `src/hooks/usePropertyDragDrop.ts` pattern. Create `useCrmKanbanDragDrop.ts` with the same shape: `handleDragStart`, `handleDragOver`, `handleDragEnd`, `handleDragCancel`, plus internal state for `draggedContact` and `targetStatus`. The droppable id format is `stage-<status>`.

The `CrmKanban` component wraps the columns in a `DndContext` and uses `useCrmKanbanDragDrop` for the handlers. Cards are made draggable with `useDraggable({ id: contact.id, data: contact })`. Columns are droppable with `useDroppable({ id: `stage-${status}` })`.

On `handleDragEnd`, call the mutation hook to update the contact's status, then optimistically update local state. On failure, revert and toast (`@/components/ui/sonner`).

### 10.3 Card structure

```
┌────────────────────────────────┐
│ Scott Kuru                     │ ← font-medium, text-sm
│ Freedom Property               │ ← text-xs text-blue-300 (the company tag)
│                                │
│ Last touch: May 5              │ ← text-xs text-muted-foreground
└────────────────────────────────┘
```

Clicking the card opens a drawer with full contact details — defer the drawer to v2 unless trivial.

### 10.4 Stage timestamps

When a card moves into a stage, update the corresponding timestamp column on the contact:

| New status         | Timestamp set                            |
|--------------------|-------------------------------------------|
| `connection_sent`  | `connection_sent_at = now()` if null      |
| `connected`        | `last_touch_at = now()`                   |
| `video_sent`       | `video_sent_at = now()`, `last_touch_at = now()` |
| `replied`          | `replied_at = now()`, `last_touch_at = now()` |
| `demo_booked`      | `last_touch_at = now()`                   |
| `beta_tester`      | `last_touch_at = now()`                   |
| `dead`             | `last_touch_at = now()`                   |

Always update `last_touch_at`. Stage-specific timestamps are append-only — don't overwrite if already set.

---

## 11. Hooks

Match the existing pattern: each hook is a plain function returning state + a refetch helper, using direct Supabase calls inside `useEffect`. No TanStack Query.

### 11.1 `useCrmCompanies`

Fetches all companies with their contacts joined in, sorts them with `sortCompaniesForMap`, returns the shaped array. On mount and on `refetch()`.

```ts
export function useCrmCompanies() {
  const [companies, setCompanies] = useState<CompanyWithContacts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('crm_companies')
      .select(`
        id, name, relevance_tier, employees, state, website, blurb, notes,
        contacts:crm_contacts (
          id, full_name, title, status, last_touch_at
        )
      `);
    if (error) {
      setError(error.message);
    } else {
      setCompanies(sortCompaniesForMap((data ?? []) as CompanyWithContacts[]));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { companies, loading, error, refetch: fetchAll };
}
```

### 11.2 `useUpdateContactStatus`

Returns a function `(contactId: string, newStatus: ContactStatus) => Promise<void>` that:

1. Computes the patch object including the stage-specific timestamp from the table in section 10.4.
2. Calls `supabase.from('crm_contacts').update(patch).eq('id', contactId)`.
3. On success, toasts a confirmation. On failure, toasts the error.

The parent component is responsible for refetching `useCrmCompanies` (or applying the optimistic update) after the mutation resolves.

### 11.3 `useCrmContacts` (optional v1)

If the pipeline view derives from `useCrmCompanies`, this hook can be deferred. If you need a flat-contact query for filters, it follows the same pattern.

---

## 12. Forms

### 12.1 AddContactDialog

shadcn `Dialog` triggered from a "+ contact" button in the page header. Form fields:

- Company (combobox of existing companies, with "create new" affordance below the list)
- Full name (required)
- Title (optional)
- LinkedIn URL (optional but validated as URL)
- Initial status (defaults to `connection_sent`)

Validation with Zod via `react-hook-form` (already in the stack). On submit, insert into `crm_contacts`, close dialog, trigger refetch.

### 12.2 AddCompanyDialog

shadcn `Dialog` for the "create new company" flow inside AddContactDialog or accessible from the page header. Fields:

- Name (required, unique)
- Relevance tier (high/medium/low select, default medium)
- Employees (number, optional)
- State (text, optional)
- Website (URL, optional)
- Blurb (textarea, optional)

### 12.3 BulkImportDialog

Out of scope for the Claude Code build. Bulk import is done **once**, manually, via Supabase Studio after running the Python script in `scripts/import_leads_from_csv.py`. The dialog can be deferred.

---

## 13. CrmDashboard page

The full page. Composition:

```tsx
// src/pages/admin/CrmDashboard.tsx
export default function CrmDashboard() {
  const { companies, loading, refetch } = useCrmCompanies();
  const updateStatus = useUpdateContactStatus();

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <LeftRail />
      <main className="ml-16 flex flex-col h-screen overflow-hidden">
        <header className="flex items-center justify-between px-8 py-4 border-b border-border">
          <div>
            <h1 className="text-lg font-semibold">PropPath CRM</h1>
            <p className="text-xs text-muted-foreground">
              {companies.length} companies · {totalActive(companies)} active contacts
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setAddContactOpen(true)}>
              <Plus size={14} className="mr-1" /> Contact
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAddCompanyOpen(true)}>
              <Plus size={14} className="mr-1" /> Company
            </Button>
          </div>
        </header>

        <section className="px-8 py-4 border-b border-border overflow-x-auto">
          <p className="text-xs text-muted-foreground mb-3">
            Industry map — sorted by relevance, smallest companies first
          </p>
          <IndustryMapView
            companies={companies}
            onToggleActive={async (id, active) => {
              await updateStatus(id, active ? 'not_contacted' : 'connection_sent');
              refetch();
            }}
          />
        </section>

        <section className="flex-1 px-8 py-4 overflow-x-auto">
          <p className="text-xs text-muted-foreground mb-3">
            Pipeline — drag cards to update status
          </p>
          <CrmKanban
            companies={companies}
            onStatusChange={async (contactId, newStatus) => {
              await updateStatus(contactId, newStatus);
              refetch();
            }}
          />
        </section>
      </main>

      <AddContactDialog
        open={addContactOpen}
        onOpenChange={setAddContactOpen}
        companies={companies}
        onCreated={refetch}
      />
      <AddCompanyDialog
        open={addCompanyOpen}
        onOpenChange={setAddCompanyOpen}
        onCreated={refetch}
      />
    </div>
  );
}
```

(`LeftRail` is the existing left-side navigation. The page uses the same `ml-16` content offset other pages use.)

---

## 14. Bulk import workflow (one-time)

This is run by Rob locally, **not** by Claude Code:

1. Place the latest `PropPath_Industry_Map_updated - Industry Map.csv` in the repo root.
2. From the repo root: `python3 scripts/import_leads_from_csv.py "PropPath_Industry_Map_updated - Industry Map.csv" --out-dir ./tmp-import`
3. Inspect `tmp-import/companies.csv` and `tmp-import/contacts.csv` for sanity.
4. In Supabase Studio, run the CRM migration (`supabase db push` or apply manually).
5. Import `companies.csv` into `public.crm_companies`. Column mapping:
   - `id` -> `id`
   - `name` -> `name`
   - `relevance_tier` -> `relevance_tier`
   - `employees` -> `employees` (numeric)
   - `state` -> `state`
   - `website` -> `website`
   - `blurb` -> `blurb`
   - `notes` -> `notes`
   - **Do NOT map** `size_tier_hint`. It exists only for human verification — `size_tier` is computed in the app layer.
6. Import `contacts.csv` into `public.crm_contacts`. Column mapping:
   - `id` -> `id`
   - `company_id` -> `company_id`
   - `full_name` -> `full_name`
   - `title` -> `title`
   - `linkedin_url` -> `linkedin_url`
   - `status` -> `status`
   - **Do NOT map** `company_name`. It's there for human verification only.
7. Delete `tmp-import/`.

---

## 15. Acceptance criteria

Claude Code is done when:

- Migration runs cleanly on a fresh database and on the existing PropPath database.
- Non-admin users get redirected to `/home` when they hit `/admin/crm`.
- Admin users see the CRM nav item in `LeftRail`; everyone else does not.
- The industry map view renders correctly with sample data, sorted by relevance then employee count ascending.
- Ticking a contact in the map view changes their status to `connection_sent` and they become highlighted.
- The pipeline kanban renders all seven stages and shows the same active contacts grouped by status.
- Dragging a card between stages updates the contact's `status` and the relevant timestamps; the map view reflects the change after refetch.
- AddContactDialog and AddCompanyDialog persist new rows and refetch the page.
- The whole page renders in dark mode regardless of the global app theme.
- No TypeScript errors. `npm run build` succeeds.

---

## 16. Deferred to v2

- Per-contact drawer / details panel (notes, full activity timeline, next-action editing).
- Email-driven outreach automation.
- LinkedIn enrichment (Apollo API or similar).
- Follow-up reminders on `next_action_at`.
- Filter UI on the kanban (by company, by date range, by size tier).
- Search across companies and contacts.
- Multi-user activity log.
- Export back to CSV.

---

## 17. Notes for Claude Code

- The codebase **does not currently use TanStack Query** despite it being installed. Follow the direct-Supabase-call pattern visible in `src/hooks/useAIUsage.ts` etc. Do not introduce TanStack Query for the CRM.
- The codebase **does not use a shared layout wrapper**. Each page renders `LeftRail` and `TopBar` themselves. Mirror that.
- The `.dark` class on the root of CrmDashboard is intentional — the rest of the app is light-mode-only. Don't try to flip the global theme.
- All migrations in this repo use plain SQL files in `supabase/migrations/`. Don't introduce `supabase-cli` automation if it isn't already in the build.
- When writing components, prefer composing existing shadcn primitives over reinventing them.
- Use `lucide-react` icons throughout. No emoji.
- All numeric displays go through `Math.round()`, `.toFixed()`, or `Intl.NumberFormat` — never raw JS float output.

End of spec.
