# Investor Demo Hardening — Handoff

Date: 2026-05-04
Branch worked on: `claude/jovial-goldwasser-0b938b` (merged to `main`)

## Objective

Investors expressed buying interest and wanted to test PropPath end-to-end inside 48 hours. The brief was: make sure the product doesn't glitch out under live use, especially the chatbot, and remove anything broken or half-implemented that a tester might click and lose confidence over. Stripe and PDF export were explicitly de-scoped — disable, don't fix.

## What we audited

Four parallel deep audits before touching code:

1. Chatbot edge cases and modification reliability
2. Database save / load behaviour and silent failure paths
3. First-load and authentication flow, including new-user signup
4. Dead buttons, half-implemented UI, broken links

Findings were grouped into tiers by risk and effort. Tier 0 was a single demo-blocking decision (paywall), Tier 1 was chatbot solidity, Tier 2 was defensive cleanup, Tier 3 was deferred (real fixes too risky for 48 hrs).

## Key findings

### Chatbot was silently lying

The biggest issue. When a user said something like "increase property 2 by $500k", several failure modes all routed to the same outcome: the chat said "Done!" and nothing happened.

Specific failure modes traced in code:
- **Property index drift** (`src/utils/nlDataMapper.ts:236`): an out-of-range property number returned an empty updates object with no warning.
- **Unsupported fields silently dropped**: the mapper only knew about 6 fields. The system prompt promised more (e.g. `offsetAccount`) and Claude would dutifully send them — they got discarded with no log.
- **No relative-math instructions**: the prompt only showed absolute-value examples, so "increase by X" was unreliable. Claude sometimes returned the delta instead of the new total.
- **Compound modifications partially failing**: the loop processing a multi-mod response silently skipped any mod with a missing instance — but the chat showed Claude's text as if all of them landed.
- **Generic catch-all error message**: any unclassified error in the chat path resolved to "Something went wrong — try rephrasing that", which is the source of intermittent "I don't understand" reports.
- **No client-side timeout**: a hung edge function would leave the user staring at the loader indefinitely.
- **No retry for transient errors**: rate-limit (429) and timeout (504) errors fired immediately with no backoff. Multiple users retrying at once would create thundering-herd 429 cascades.

### "Looks functional, silently does nothing" trap

`interest_rate_change`, `market_correction`, and `sell_property` were registered as event types and the chatbot would happily add them to the timeline. But the calculation engine had placeholder logic for them — they got added, the dashboard didn't change, and the chat assured the user it would. This pattern is more dangerous than an outright error.

### Demo-blocking paywall

`ProtectedRoute` required `subscriptionStatus === 'active'` on every protected route. Brand-new accounts have no subscription, so they would be redirected to `/upgrade` (Stripe). With Stripe disabled for the demo period, that's a dead-end.

### Other breakages

- `src/components/Navbar.tsx` had a broken Settings dropdown — but the file wasn't imported anywhere. Genuinely dead code.
- LeftRail had a bell icon with an empty onClick handler (placeholder for notifications).
- Settings page had two "Coming Soon" placeholder tabs.
- Footer had four `href="#"` links (About, Contact, Privacy, Terms).
- SignUp form linked to non-existent `/terms` and `/privacy`.
- DataAssumptionsContext silently swallowed save errors with no user feedback. Users could lose template edits without knowing.
- The Loading screen could hang forever if profile fetch failed — no timeout, no retry hint.
- The Stripe checkout flow had multiple unhandled failure paths (missing URL, race-condition double-submit, hung create-checkout edge function).

## What was changed

### Tier 0 — Subscription bypass (demo mode)

`src/components/ProtectedRoute.tsx`
- Added `SUBSCRIPTION_GATE_ENABLED` constant, default `false`. Single-line revert when re-enabling Stripe.
- New `LoadingScreen` component: caps "Loading..." at 15 seconds, then shows a Refresh button.

### Tier 1 — Chatbot solidity

`src/utils/nlDataMapper.ts`
- `ContextUpdates` now has an optional `warnings: string[]` field.
- Out-of-range property indices return a clear warning instead of empty updates.
- Unsupported `change` fields detected against an explicit allowlist, surfaced as warnings.
- Unknown modification targets (e.g. `clientProfile`, `investmentProfile`) are silently logged for diagnostics — they don't pollute the chat with "couldn't apply" messages, since they typically appear alongside a real change in the same compound batch.
- `console.warn` everywhere a silent drop used to happen.

`src/components/ChatPanel.tsx`
- Collects warnings across all mods in a compound modification.
- After applying everything, posts a single system message: "I couldn't apply that change: …" or "Some parts of that update didn't apply: …".
- Forward-ref pattern (`addSystemMessageRef`) so `handleModification` (defined above the `useChatConversation()` call) can post into the chat without a temporal dead zone.
- `handleAddEvent` now only accepts `refinance` and `salary_change`. Everything else is bounced with an honest system message.

`src/hooks/useChatConversation.ts`
- 30s hard timeout via `Promise.race`.
- Per-error retry budgets with exponential backoff and jitter:
  - `MALFORMED`: 1 retry (Claude's bad-JSON case)
  - `RATE_LIMIT`: 2 retries (Anthropic rate-limit windows are short)
  - `TIMEOUT`: 1 retry (don't pile on a slow API)
- Backoff base delays: 400ms, 1500ms, 3500ms, plus 0–250ms jitter to break thundering-herd patterns.
- Total worst-case wall time ≈ 65s.

`supabase/functions/nl-parse/system-prompt.ts` (server-side — needs redeploy to take effect)
- Explicit allowlist of valid modification `target` values.
- Critical block on relative math: "for `increase by X`, read the current value from `currentPlan`, do the math, return the absolute new value".
- Removed the misleading `offsetAccount` example.
- Narrowed `add_event` to `refinance` and `salary_change` only; for unsupported events, the prompt now instructs Claude to respond with type `explanation` and describe directional impact.

### Tier 2 — Defensive cleanup

- `src/components/Navbar.tsx`: deleted (was unused dead code).
- `src/components/LeftRail.tsx`: notifications bell hidden.
- `src/pages/SettingsHub.tsx`: Plans & Pricing and Help & Resources tabs removed.
- `src/landing/components-new/Footer.tsx`: dead About/Contact/Privacy/Terms anchors removed.
- `src/pages/SignUp.tsx`: dead Terms/Privacy links converted to plain text.
- `src/constants/eventTypes.ts`: `getEventTypesForCategory` now filters out `sell_property`, `interest_rate_change`, `market_correction` (they stay in the registry so existing saved scenarios still render, but new ones can't be added via the manual picker).
- `src/contexts/DataAssumptionsContext.tsx`: destructive toast after two consecutive silent autosave failures, resets on first success (avoids spamming during transient outages).

### Stripe disable (per explicit instruction)

- `src/landing/components-new/Pricing.tsx` and `src/pages/Upgrade.tsx`: subscribe handlers short-circuit to a "Subscriptions are temporarily unavailable" alert. The original `create-checkout` invocation stays in git history for easy re-enable.
- `src/pages/Login.tsx` and `src/components/PublicRoute.tsx`: pending-checkout flows ripped out, stale `pending_subscription_plan` cleared from localStorage.

### PDF export

Already orphaned. `handleGeneratePDF` exists in `src/pages/ClientScenarios.tsx` but no UI element calls it. No change needed.

## Action items NOT in this PR

These need to happen before / during the demo:

1. **Deploy the edge function.** The system-prompt changes are server-side and only take effect after `supabase functions deploy nl-parse --project-ref <ref>`. Until then, Claude will continue to occasionally pad responses with redundant `clientProfile` / `investmentProfile` mods, sometimes promise the dashboard will update for unsupported events, and not yet know about the new relative-math rule. The frontend defenses already mask these cases for the user; the prompt update closes the loop server-side.
2. **Confirm the subscription bypass is acceptable.** With `SUBSCRIPTION_GATE_ENABLED = false` every signed-in user reaches the dashboard regardless of plan. Re-enable when Stripe comes back online.
3. **Pre-create demo accounts** if you want testers to skip signup entirely — or just rely on the bypass plus the existing signup flow (still routes through the email-confirmation page).

## Known limitations / things deliberately not touched

- Pre-existing React duplicate-key warning in `src/components/ui/ChartCard.tsx` ("Regional House — Growth", "Metro Unit — Growth"). It's a chart-legend issue from before this work, not blocking the demo, but noisy in the console.
- Existing saved scenarios that already contain `interest_rate_change` / `market_correction` / `sell_property` events will continue to render those events on the timeline but the calculator still ignores them. New scenarios can't add these.
- The explanation flow inside `useChatConversation` makes a second `nl-parse` call when chart context is available (doubles token usage and rate-limit pressure for explanation requests). Real perf issue, not addressed — too much surface area for the 48hr window.
- The `nl-parse` system prompt is ~12k tokens with the current plan baked into it, defeating Anthropic's `cache_control: ephemeral` cache on every plan change. Real fix is splitting the prompt into static and dynamic blocks. Out of scope for this push.
- The orphaned PDF generation code (`pdfGenerator.tsx`, `pdfEnhancedGenerator.tsx`, `PDFReportRenderer.tsx`) is left in the tree. No UI reaches it; safe to remove later.

## Files touched

```
M  src/components/ChatPanel.tsx
M  src/components/LeftRail.tsx
D  src/components/Navbar.tsx
M  src/components/ProtectedRoute.tsx
M  src/components/PublicRoute.tsx
M  src/constants/eventTypes.ts
M  src/contexts/DataAssumptionsContext.tsx
M  src/hooks/useChatConversation.ts
M  src/landing/components-new/Footer.tsx
M  src/landing/components-new/Pricing.tsx
M  src/pages/Login.tsx
M  src/pages/SettingsHub.tsx
M  src/pages/SignUp.tsx
M  src/pages/Upgrade.tsx
M  src/utils/nlDataMapper.ts
M  supabase/functions/nl-parse/system-prompt.ts
A  INVESTOR_DEMO_HANDOFF.md
```
