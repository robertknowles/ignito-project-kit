# PropPath AI Chatbot — Architecture Reference

**Last updated:** June 2026
**Architecture version:** Tier 2

---

## Overview

The PropPath chatbot converts natural language from buyers' agents (BAs) into structured data that drives a property investment dashboard. The BA types a client brief or instruction, the AI extracts structured data, and the dashboard updates.

**Flow:** Message → Unified Prompt → AI Picks Tool → Validation → Template Message → Frontend Response

This is the **Tier 2 architecture**, replacing the original Tier 1 system (2-step classifier pipeline with 2000+ lines of per-intent prompts).

---

## Architecture

A single Anthropic API call. The AI reads one unified prompt (~250 lines) and picks from 6 tools. No classifier step — tool selection replaces intent routing.

```
BA message
    ↓
Single system prompt (prompt.ts)
+ 6 tool definitions (tools.ts)
+ current plan state (if exists)
    ↓
Claude Sonnet picks the right tool
    ↓
Validation layer (validation.ts)
    ↓
Template message for actions (templates.ts)
OR AI-authored message for conversation
    ↓
Feasibility injection (feasibility.ts, create_plan only)
    ↓
JSON response → Frontend
```

### Why This Replaced Tier 1

| | Tier 1 | Tier 2 |
|---|---|---|
| API calls | 2 (classify + respond) | 1 |
| Intents/tools | 8 intents, classifier routes | 6 tools, AI picks |
| Prompt size | ~2000 lines across 8 files | ~250 lines, 1 file |
| Message authoring | AI writes all messages | Templates for actions, AI for conversation |
| Validation | None | Business rules + auto-fix |
| Test results | 46/50 (92%) | 49/50 (98%) |
| Response time (non-plan) | 5-9 seconds | 2-3 seconds |

---

## The 6 Tools

### create_plan → `initial_plan`
**When:** BA describes a new client's financial situation. Any message with financial details when no plan exists.
**Data:** clientProfile, investmentProfile, properties array, strategyPreset, missingInputs.
**Message:** Template-generated (code writes it).

### modify_plan → `modification`
**When:** BA wants to change a specific property or profile field. "Change property 2 to 500k", "drop the last one", "savings are 5k/month".
**Data:** modification (single) or modifications (array), optional properties array for adds.
**Message:** Template-generated.

### update_profile → `update_profile`
**When:** BA corrects or adds client financial details on an existing plan. "He actually earns 150k", "capacity is 800k".
**Data:** profileUpdates (only changed fields).
**Message:** Template-generated.
**Guard:** Only valid when a plan exists. Server redirects to `respond` if no plan.

### add_event → `add_event`
**When:** BA adds a concrete timeline event with a year. "Refinance in 2030 at 5.5%", "salary to 150k in 2028".
**Data:** event (eventType, targetYear, parameters). Only refinance and salary_change supported.
**Message:** Template-generated.

### suggest_properties → `property_suggestions`
**When:** BA wants to add a property but is vague. "Add another", "something with good yield".
**Data:** propertySuggestions array (propertyType, label, price, yield, reason, prompt).
**Message:** AI-authored (needs natural language to describe options).

### respond → `explanation`
**When:** Everything else — questions, clarifications, hypotheticals, greetings, acknowledgments. This is the **"just talk" escape hatch**.
**Data:** message, optional explanation object (question, relevantPeriods, relevantProperties).
**Message:** AI-authored.
**Key rule:** "If you're not sure what the user means, use respond and ask them."

---

## Message Generation

Two modes, split by whether the response is an action or a conversation:

### Templated (actions)
`create_plan`, `modify_plan`, `update_profile`, `add_event` — code in `templates.ts` generates the message from structured data. The AI never writes these messages. This eliminates inconsistent phrasing, trailing questions, and compliance violations.

Example create_plan output:
> "Built a 4-property plan for Tom, priced from $400k to $500k. Modelled at 88% LVR with LMI capitalised with IO loans, biased toward equity growth, low price point. Default 20-year horizon applied. For tighter numbers, share borrowing capacity. See the dashboard for the engine's exact projection."

### AI-authored (conversation)
`respond` and `suggest_properties` — the AI writes freely. These are inherently conversational and can't be templated.

---

## Validation Layer

`validation.ts` runs between AI output and the frontend. Auto-fixes bad data with warnings.

**Rules enforced:**
- Property prices: $250k floor, $2M residential ceiling, $5M commercial ceiling
- LVR: 50-95% range
- Valid cell types (10 cells from the matrix)
- Valid Australian states
- Non-negative financial values
- Timeline: 1-40 years
- Event years: not in the past, not 40+ years out

**Behavior:** Clamps out-of-range values, appends `[auto-corrected]` warnings to assumptions array.

---

## Key Design Decisions

### Property type and location are internal
The AI never mentions "metro house", "regional unit", "in QLD", etc. in messages. These are internal engine parameters — the BA's agent selects location and type. The chatbot talks about properties by number, price, growth tier, and cost characteristics only.

### "If you're not sure, ask"
The `respond` tool is the default escape hatch. The AI never blocks, never refuses, never gives a dead-end response. If the input is ambiguous, it asks for clarification naturally.

### Directional estimates for hypotheticals
"What if rates go up 1%" gets a real answer — directional impact on cashflow, equity, borrowing capacity — not a deflection. The AI uses plan data to give qualitative analysis while leaving precise calculations to the engine.

### Server-side guards
If the AI picks the wrong tool (e.g., `update_profile` when no plan exists), the server catches it and falls back to `respond` with helpful guidance. Belt and suspenders.

### Compliance
Banned phrases: "strategy", "recommend", "should" (advisory), "aggressive", "passive income", "goal achieved", "wealth building". All output framed as modelling, not advice. PropPath does not hold an AFSL or ACL.

### Home page → dashboard flow
When a BA types a brief on the home page, `forceNewPlan` ensures `currentPlan: null` is sent, preventing stale state from a previous client from causing misrouting. The server also checks `properties.length > 0` before treating a plan as real.

---

## Unified Prompt Structure (~250 lines)

The single prompt in `prompt.ts` contains:

1. **Role** — "You are PropPath AI, a property modelling assistant"
2. **Tool selection guidance** — when to use each tool, with hard rules for no-plan state
3. **Voice** — short sentences, no jargon, no trailing questions, no emoji
4. **Compliance** — banned phrases, framing rules
5. **Australian conventions** — income is annual, savings is monthly, slang dictionary, number interpretation
6. **Domain reference** — 10-cell matrix, strategy presets, LVR rules, pricing by capacity, growth rate tiers
7. **Current plan state** (dynamic) — injected when a plan exists
8. **BA planning defaults** (dynamic) — injected if configured
9. **Conversation history** (dynamic) — action log for context

---

## Test Results

50 real-world inputs across 5 categories:

| Category | Pass | Total |
|---|---|---|
| New plan generation | 9 | 10 |
| Follow-up questions | 10 | 10 |
| Profile updates | 8 | 8 |
| Property modifications | 8 | 8 |
| Edge cases | 14 | 14 |
| **Total** | **49** | **50** |

The one "failure" (NP-09: "I have a client who wants to invest") is correct behavior — the AI asks for more info when zero financial data is provided.

**Number extraction accuracy: 13/13 (100%)** — all incomes, deposits, savings, PPOR equity, bare numbers, slang interpreted correctly.

Test harness: `tests/chatbot-eval/run-eval.mjs`

---

## File Structure

```
supabase/functions/nl-parse/
├── index.ts          # Orchestrator — single API call, validate, template, respond
├── prompt.ts         # Unified system prompt (~250 lines)
├── tools.ts          # 6 tool definitions + toolToResponseType mapping
├── templates.ts      # Code-generated messages for action types
├── validation.ts     # Business rule validation + auto-fix
├── feasibility.ts    # Server-side feasibility check for create_plan
│
├── pipeline.ts       # [DEPRECATED] Old Tier 1 classifier pipeline
├── response-schema.ts # [DEPRECATED] Old single-tool response schema
├── system-prompt.ts  # [DEPRECATED] Old monolithic prompt
└── prompts/          # [DEPRECATED] Old per-intent prompts
    ├── classify.ts
    ├── initial-plan.ts
    ├── modification.ts
    ├── update-profile.ts
    ├── explanation.ts
    ├── event.ts
    ├── property-suggestions.ts
    └── shared.ts

src/
├── types/nlParse.ts              # Response type definitions (added 'conversation' type)
├── hooks/useChatConversation.ts  # Chat hook (forceNewPlan support)
└── components/ChatPanel.tsx      # Chat UI (pending-prompt forceNewPlan flag)

tests/chatbot-eval/
└── run-eval.mjs                  # 50-input evaluation harness
```

---

## The 10-Cell Matrix (Internal Reference)

Properties are classified internally by a Type x Mode matrix:

| Cell ID | Default Price | Growth Tier |
|---------|---------------|-------------|
| metro-house-growth | $900k | High |
| metro-house-cashflow | $750k | Medium |
| regional-house-growth | $620k | High |
| regional-house-cashflow | $500k | Medium |
| metro-unit-growth | $580k | Medium |
| metro-unit-cashflow | $440k | Low |
| regional-unit-growth | $430k | Medium |
| regional-unit-cashflow | $380k | Low |
| commercial-high-cost | $2.2M | Medium |
| commercial-low-cost | $750k | Low |

**These are never surfaced to the BA.** The AI uses them internally for property selection.

---

## Strategy Presets

| Preset | Primary Cells | Secondary |
|--------|---------------|-----------|
| eg-low | regional-house-growth, metro-unit-growth | regional-unit-growth |
| eg-high | metro-house-growth | metro-unit-growth |
| cf-low | regional-unit-cashflow, regional-house-cashflow | commercial-low-cost |
| cf-high | metro-house-cashflow, commercial-high-cost | regional-house-cashflow |
| commercial-transition | Phase 1: residential growth → Phase 2: commercial | — |

### LVR Rules
- Standard: 80%, lmiCapitalized: false
- Low capacity (borrowing ≤ $1M): 88%, lmiCapitalized: true
- Commercial phase 2: 70%

### Pricing by Capacity
- ≤ $1M: $350-500k range, substitute cheaper cell types
- $1M-$1.8M: Cell defaults, ±15% scaling
- \> $1.8M: High-price cells, +15-25% scaling
