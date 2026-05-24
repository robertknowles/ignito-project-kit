# Handover prompt for Claude Code — PropPath internal CRM

Build the PropPath internal CRM module per the specification in `CRM-HANDOVER-SPEC.md` at the repo root. Read that document end to end before writing any code.

## Primary brief

**File:** `CRM-HANDOVER-SPEC.md` (repo root)

Everything you need is in there: the goal, the stack, the database schema, the auth gating approach, the file structure, the design tokens, the two views, the hooks, the dialogs, the acceptance criteria, and the explicit list of deferred-to-v2 features.

## How to approach this

1. Read `CRM-HANDOVER-SPEC.md` end to end before writing any code.
2. Work through the spec **section by section in the order it's written**. Don't skip ahead.
3. **Pause and ask me before deviating from anything in the spec** — including: skipping an acceptance criterion, changing the auth pattern, introducing a new dependency, or moving away from the direct-Supabase-call pattern the rest of the codebase uses.
4. After each major section is complete (migration, route + guard, industry map view, pipeline view, dialogs), run `npm run build` and confirm it passes before moving on.
5. Do not run `git commit`, `git push`, or `supabase db push` against production. I'll review and deploy manually.

## Sequence I want you to follow

1. **Migration** (spec §4) — write the SQL file in `supabase/migrations/` using the existing timestamp naming convention, run it locally, regenerate the Supabase TypeScript types so `Database['public']['Tables']['crm_companies']` and `crm_contacts` are typed.
2. **Admin gating** (spec §3) — create `src/config/proppathAdmin.ts` and `src/components/AdminOnlyRoute.tsx`. Leave the placeholder emails as `rob@proppath.com.au` and `james@proppath.com.au` — I'll swap them in myself before deploy.
3. **Route + LeftRail nav entry** (spec §§6–7) — add to `src/AppRouter.tsx` and `src/components/LeftRail.tsx`. Gate visibility behind `isPropPathAdmin(user?.email)`.
4. **Helpers** (spec §9.5 and §10.1) — `src/lib/crmHelpers.ts` with `sortCompaniesForMap`, `sizeTierFromEmployees`, `PIPELINE_STAGES`.
5. **Hooks** (spec §11) — `useCrmCompanies` and `useUpdateContactStatus`. Mirror the existing direct-Supabase pattern; **do NOT introduce TanStack Query** despite it being installed.
6. **Industry map view** (spec §9) including the **blurb-first card rule in §9.4** — the blurb card is mandatory and renders before any contact rows inside each company column.
7. **Pipeline kanban** (spec §10) — mirror the `@dnd-kit` hook pattern in `src/hooks/usePropertyDragDrop.ts` exactly. Drop targets are `stage-<status>`.
8. **Add Contact / Add Company dialogs** (spec §12.1–12.2). Use `react-hook-form` + Zod as the rest of the codebase does.
9. **CrmDashboard page** (spec §13) — composition only, plus the local `.dark` wrapper for the page root.
10. **Verify against acceptance criteria** (spec §15) — every checkbox must pass.

## What NOT to do

- **Don't import any CSV data.** That's a manual step Rob runs in Supabase Studio after the migration is deployed. The output CSVs at `tmp-crm-dry-run/companies.csv` and `tmp-crm-dry-run/contacts.csv` are already prepared. You don't need to read them, parse them, or build an import path for them.
- **Don't build the BulkImportDialog** listed in the file structure. Explicitly deferred per spec §12.3.
- **Don't try to enrich LinkedIn data, fetch external APIs, scrape, or call Apollo.** Manual entry is the v1 workflow.
- **Don't add features that are listed as deferred in spec §16** — no follow-up reminders, no email integration, no search, no filter UI, no per-contact drawer (unless trivially derivable from an existing Radix dialog).
- **Don't change anything in the existing PropPath app** outside of: adding the new route in `src/AppRouter.tsx`, adding the CRM nav button in `src/components/LeftRail.tsx`, and the new files listed in spec §5.
- **Don't introduce TanStack Query.** The codebase uses direct Supabase calls with `useState` + `useEffect`. Match that pattern.
- **Don't toggle the global theme.** The CRM page wraps its own root in a local `.dark` className — see spec §8. Everything else in the app stays light mode.

## Stack reminders (also in spec §2)

- Vite + React 18 + TS + shadcn/ui + Tailwind 3.4 + Supabase + React Router v6 + `@dnd-kit/core` + Lucide.
- Data fetching: direct Supabase calls inside custom hooks. **Not** TanStack Query.
- Each page renders `LeftRail` and `TopBar` itself. There is no shared layout wrapper.
- Lucide icons only. No emoji anywhere.
- `cn()` util at `@/lib/utils`, shadcn imports at `@/components/ui/*`, Supabase client at `@/integrations/supabase/client`.
- All numeric displays go through `Math.round()`, `.toFixed()`, or `Intl.NumberFormat` — never raw JS float output.

## Related files (do not modify, just reference)

- `CRM-HANDOVER-SPEC.md` — the spec. Primary brief.
- `scripts/import_leads_from_csv.py` — already written and verified against Rob's data. The output CSVs live in `tmp-crm-dry-run/`. You don't need to touch the script.
- `tmp-crm-dry-run/companies.csv` (314 rows) and `tmp-crm-dry-run/contacts.csv` (525 rows) — used manually post-migration. Don't load them.
- `src/hooks/usePropertyDragDrop.ts` — the @dnd-kit hook pattern to mirror.
- `src/contexts/AuthContext.tsx` — how to read `user.email` and `role`.
- `src/integrations/supabase/client.ts` — Supabase client.
- `src/AppRouter.tsx` — where routes are registered.
- `src/components/LeftRail.tsx` — where nav buttons are hardcoded.

## When you're done

Reply with:

1. A short summary of what you built, broken down by file.
2. The output of `npm run build` (last 20 lines).
3. A checklist mapped to spec §15 (acceptance criteria) confirming each item passes.
4. Any deviations from the spec, with justification.

Start by reading `CRM-HANDOVER-SPEC.md` end to end and confirming you understand the scope before writing any code.
