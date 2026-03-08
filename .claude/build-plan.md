# PropPath Build Plan

## Scope Summary

**BA Portal:** Home (review dashboard), Clients (CRM table), Forms (predefined templates + tracking)
**Client Portal:** Home (stats + checklist), Property Plan (play mode), Portfolio (track owned properties), Profile (editable, feeds engine)
**Not building:** Messaging, custom form builder, documents/file sharing, settings redesign, UI/style overhaul

---

## Phased Build Plan

| Phase | Task Name | Task Details |
|-------|-----------|--------------|
| **1** | **Database schema** | Add columns to clients table (stage, portal_status, roadmap_status, next_review_date, last_active_at, strategy_type). Create new tables: client_properties, form_templates, form_submissions, activity_log. Set up RLS policies for all new tables. |
| **2** | **Client portal infrastructure** | New route group `/portal`. Client auth flow (invite link, separate login). Shared sidebar layout with branding, review countdown banner, agent info. Protected routes for client role. |
| **3** | **BA Clients page** | Full CRM table with columns: Client, Stage, Portal status, Roadmap status, Last Active, Forms status, Review Date. Filter tabs (All, Review cycle, Onboarding, Ready). Search. Export CSV. |
| **4** | **BA Home page** | Client cards sorted by next review date with form status and send buttons. 2-month review calendar with client dots. Recent activity feed (last 7 days). |
| **5** | **BA Forms page** | Two predefined templates: Input Form (onboarding) and Profile Update (6-month review). Questions map to dashboard inputs only. Send to client flow. Send history table with status tracking (sent, opened, completed). Resend action. |
| **6** | **Client Profile page** | Three editable sections: personal details, financial snapshot, investment preferences. Data feeds into the calculation engine. Review Stage badge. |
| **7** | **Client Home page** | Review countdown banner. Stat cards (portfolio value, equity, rental income, next review). Checklist (forms, review tasks). Quick actions linking to other portal pages. |
| **8** | **Client Property Plan** | Load BA's saved scenario read-only. Client can tweak all inputs and see charts update in real-time. No save button. Refresh resets to BA's version. Scenario tabs (No change, Recommended, Accelerated). Agent notes card. |
| **9** | **Client Portfolio page** | Add/edit owned properties. Fields: address, type (owner-occupied/investment), purchase price, current value, loan balance, rental income, tenancy details. Summary cards (total value, equity, loans, rent). LVR progress bars. Standalone, does not feed into property plan. |

---

## Open Questions (for James)

1. Review dates: auto 6 months from plan finalised + auto-roll, or BA picks manually?
2. Client portal access: invite email + password, or magic link?
3. Profile edits: auto-update dashboard inputs, or BA reviews/approves first?
4. Portfolio data: client enters manually, or API (CoreLogic/PropTrack)?
5. Stage transitions: auto when roadmap finalised, or BA flips manually?
6. Forms vs Profile: submitting Profile Update form should just update their profile directly, or separate?

---

## Dependencies

- Phase 1 (DB) must go first, everything depends on it
- Phase 2 (client portal infra) must go before phases 6-9
- Phases 3-5 (BA portal) can run in parallel with phases 6-9 (client portal)
- Phase 6 (client profile) should go before phase 7 (client home) since home references profile data
