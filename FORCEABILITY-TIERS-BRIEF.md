# Forceability Tiers — what a BA can make the AI do, and what's next

**Written 16 Jul 2026.** Standalone brief from the accuracy session (suite results: `accuracy-testing/scenario-suite-ai-results.json`; fix round landed through `3efc959`; schema work shipped separately as nl-parse v74). Audience: next working session + James.

## The principle (agreed with Rob)

The AI must **never infer** what a client "probably" wants — a $250k earner gets no blue-chip bias unless someone says so. But when the BA **explicitly states** something (company strategy or brief), the platform should force it as hard as affordability allows. The suite proves this mechanism works: the same $250k-income client **passes** with explicit strategy text and **fails** without it.

The one thing no instruction can override, by design: **fundability.** We never emit a plan the client can't fund; we adjust and disclose exactly what changed (shipped 11 Jul). Gameplans, by contrast, lets you place anything. This is a trust feature — keep it.

## Tier 1 — forceable today (live, suite-proven)

Price/yield bands · blue-chip price points · two-phase strategies (growth→cashflow, →commercial) · ownership structures (trust per property, SMSF) · purchase cadence when fundable · property kind. All pass when stated.

## Tier 2 — forceable now that nl-parse v74 is live (shipped by the parallel session, 16 Jul)

BA engagement fee · purchase costs (stamp duty override, conveyancing, totals) · interest rate & IO term · PM % · vacancy · rent escalation · under-market valuation (`valuationAtPurchase`) · new-build flag · sale year. The two suite cases that guarded these (VAR-BAFEE, VAR-PURCHCOSTS) flipped to PASS.

**Remaining Tier-1/2 polish (approved by Rob, not yet done):**
1. **Negotiate, don't just shrink.** When affordability blocks an explicit ask (Anu's "$2M commercial" on no deposit → silently reduced to $405k, now at least disclosed), the AI should propose the path instead: *"a $2M commercial needs ~$600k cash — reachable ~2034 using equity from properties 1–2. Model that?"* Prompt-level change in `prompt.ts`, possibly enriched by a feasibility descriptor. Evidence case: FIX-ANU-287.
2. **Auto-fix rent-scaling bug** (task chip exists: "Fix autoFix price cuts not rescaling rent"): price reductions leave rent unchanged → $405k @ 29.9% yield. Scale rent to preserve stated yield + disclose.
3. Three decisions the v74 session parked for Rob: forced-equity-release reversal (B3), ×8-vs-×6 serviceability alignment (B4 — shifts every derived-BC plan), min-20-year timeline floor. Rob to rule; don't build unprompted.

## Tier 3 — NOT forceable however stated (⚠️ parked — Rob is discussing with James first; do not build)

1. **Goal-chasing restructuring** — "do whatever it takes to hit $250k passive by 2046": sell-downs, asset-mix pivots, commercial sizing toward the goal. Today the engine builds the strategy-shaped plan and honestly reports the shortfall; it never re-plans toward the number. This is the single biggest remaining accuracy theme (it drives most of the 8 remaining suite failures) and it's what both Anu ("one-shot it — that would be insane") and Ella's commercial scenario need.
2. **Manufactured equity as plan steps** — granny flats ($180k build + second rent stream), renovations, subdivisions stated in a brief and modelled as journey steps. The event system can fake a renovation manually; the AI can't drive it.
3. **Mid-plan sell-downs** — selling exists in retirement analysis only, not as an accumulation-phase move the AI can deploy.

**Why it matters commercially:** Tier 3 is the difference between "honest bookkeeper" and "sharp strategist" — the remaining suite failures are almost all Tier 3-shaped. Two beta testers are ready validators the day any of it exists.

## Current suite standing (for orientation)

June baseline 5 pass / 13 fail → post-fix 10/8 → post-v74 12 pass / 8 fail (plus 3 new strategy cases added by the v74 session). The 8 remaining failures decompose as: wealth-scaled selection & strategy adherence under pressure (~3), goal-chasing (~3, Tier 3), granny flat (1, Tier 3), pacing aggressiveness (~2), one replay artifact. Re-run: `npx vite-node accuracy-testing/run-scenario-suite-ai.ts` (key in `.env.local`; ~$0.80).
