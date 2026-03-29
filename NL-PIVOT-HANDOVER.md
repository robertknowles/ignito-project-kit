# PropPath Natural Language Pivot — Claude Code Handover

## Read This First: Why We're Doing This

PropPath is a property investment portfolio planning tool for buyers' agents (BAs) in Australia. We've spent 9 months building a calculation engine, visual roadmap, and client-facing output system. The engine works. The maths is solid. The charts look good.

The problem: our biggest competitor (Zapiio/HTAG) has 1,100 users, aggressive one-time pricing ($100/client lifetime vs our $699-999/month), integrated suburb research data, and deep entity structure support (trusts, SMSF, companies). We cannot beat them on features or price.

What we CAN beat them on: **usability**. Every competitor (Zapiio, Gameplans) requires BAs to fill in dense financial forms, step through multi-page property wizards, and learn complex UI. The consistent market feedback is: "hard to use." Zapiio's own demo took 90 minutes to walk through. Their founder admitted users need 2 hours to learn the product.

**The pivot: replace form-based input with natural language.** A BA types "Jane and John, both earning 120k, saving 3500/month, 80k deposit, want to buy around 650k in VIC" — and PropPath builds the portfolio plan. The BA can then talk to the dashboard to modify it, understand it, and explore alternatives.

This is not adding a chatbot. This is fundamentally changing the input mechanism while preserving the entire calculation engine, chart system, and output layer. The AI translates natural language into structured data. The engine does all the maths. The AI never calculates anything.

---

## The Product Vision (What the BA Experiences)

### Step 1: Initial Input
The BA opens the dashboard. On the left rail (where property blocks currently live), there's a chat input at the bottom. They type their client's situation in plain English:

> "Jane and John, both earning 120k, saving 3500/month, 80k deposit. Want to start building a portfolio, first property around 650k in VIC."

### Step 2: Instant Generation (No Clarifying Questions First)
The system makes educated guesses for anything not specified (IO loans, 88% LVR, high-growth tier, individual ownership 50/50). The RHS dashboard immediately starts rendering:
- Summary cards populate (Portfolio Value, Net Equity, Annual Cashflow)
- Investment Timeline chart draws with property milestone markers animating in
- Funding Sources and Goal cards appear

Simultaneously, the chat panel shows a confirmation of what was assumed:

> "Got it. Built this assuming individual ownership, IO loans at 6.5%, 88% LVR, high-growth areas in VIC. Your cash flow buffer looks comfortable at $3,500/month. Anything you'd like me to change?"

**Critical design decision: generate first, clarify after.** The BA sees a visual plan within 3-6 seconds. They refine from there. This mirrors how a human strategist works — sketch first, refine second. Never gate the output behind a barrage of questions.

### Step 3: Talk to the Dashboard
The BA can now have an ongoing conversation:

**Modify:** "Can we move property 2 to 2026 instead of 2028?"
→ System runs affordability check. If it fails, pushes back with specific options:
> "Can't do 2026 at $550k — only $62k available, need $118k. Three options: drop to $380k, increase savings to $5,200/mo, or go 90% LVR and cop ~$8k LMI."
These appear as clickable option cards, not a wall of text.

**Explain:** "Why is my cashflow negative in 2029?"
→ System reads the chart data at that period and explains in plain English:
> "That's when property 2 settles and the equity loan kicks in. Interest payments spike by $12k/year. It recovers by 2031 as rents catch up."

**Compare:** "What about Brisbane instead of Melbourne for property 3?"
→ System forks the scenario and shows the difference.

### Step 4: Client-Facing Output
Once the BA is happy, they generate a client report or shareable link — the visual roadmap that the client sees and thinks "I want that." This is the sales artefact. (Already partially built — reuse existing client-view and PDF export systems.)

---

## Technical Architecture

### What STAYS (Do Not Modify These)

The calculation engine is the product's backbone. 9 months of financial logic. DO NOT refactor, restructure, or "improve" these files:

| File | Lines | What It Does |
|------|-------|-------------|
| `hooks/useAffordabilityCalculator.ts` | 2,037 | Main engine: deposit tests, serviceability, equity extraction, borrowing capacity, cascade calculations |
| `hooks/useChartDataGenerator.ts` | ~23,000 | Generates all chart data from calculation outputs |
| `hooks/useRoadmapData.ts` | ~41,000 | Builds the visual roadmap timeline data |
| `components/InvestmentTimeline.tsx` | ~61,000 | Renders the investment timeline visualization |
| `components/ChartWithRoadmap.tsx` | ~52,000 | Chart + roadmap combined component |
| `utils/stampDutyCalculator.ts` | — | State-specific stamp duty (NSW, VIC, QLD, SA, WA, TAS, NT, ACT) |
| `utils/lmiCalculator.ts` | — | Lenders Mortgage Insurance calculation |
| `utils/landTaxCalculator.ts` | — | Land tax by state |
| `utils/calculateBorrowingCapacity.ts` | — | Borrowing capacity limits |
| `utils/feasibilityChecker.ts` | — | Affordability validation (deposit test, serviceability test) |
| `utils/guardrailValidator.ts` | — | Constraint validation with auto-fix suggestions |
| `utils/suggestedFixes.ts` | — | Generates fix suggestions when constraints fail |
| `utils/detailedCashflowCalculator.ts` | — | Per-property cashflow breakdown |
| `utils/oneOffCostsCalculator.ts` | — | Purchase cost calculations |
| `utils/propertyInstanceDefaults.ts` | — | Smart defaults per property type from property-defaults.json |
| `constants/financialParams.ts` | — | All financial constants (single source of truth) |
| `types/property.ts` | — | Core type definitions (GrowthCurve, TimelineProperty, YearBreakdownData) |
| `types/propertyInstance.ts` | — | PropertyInstanceDetails (36 fields per property) |

### What STAYS (Contexts — We Feed Them Differently)

These React contexts remain. Currently they're populated by form inputs. The NL layer will populate them programmatically instead:

| Context | What It Holds | How NL Uses It |
|---------|--------------|---------------|
| `InvestmentProfileContext` | depositPool, borrowingCapacity, income, savings, goals, growth curves | Claude extracts client financials → mapped to InvestmentProfileData → `updateProfile()` |
| `PropertySelectionContext` | Which property types, quantities, order, pause blocks, events | Claude decides property sequence → mapped to selections and order → `setSelections()` |
| `PropertyInstanceContext` | Per-property details (36 fields each) | Claude sets key fields (price, state, rent, LVR), defaults fill the rest → `createInstance()` + `updateInstance()` |
| `DataAssumptionsContext` | Property type templates, growth rate tiers | Mostly untouched — provides defaults that Claude relies on |
| `ScenarioSaveContext` | Scenario persistence to Supabase | Reused as-is for saving NL-generated scenarios |
| `MultiScenarioContext` | Multiple scenario management | Reused for scenario comparison |
| `ClientContext` | Active client selection | Reused as-is |
| `AuthContext` | Auth state | Reused as-is |
| `BrandingContext` | White-label theming | Reused as-is |

### What Gets BUILT (New Components)

#### 1. Supabase Edge Function: `nl-parse`
**Location:** `supabase/functions/nl-parse/index.ts`

A Deno edge function that:
- Receives: `{ message: string, conversationHistory: Message[], currentPlan: PlanState | null }`
- Calls Claude API (Sonnet) with a system prompt containing Australian property context
- Returns: structured JSON matching PropPath's type system

The system prompt must include:
- PropPath's property type templates and defaults (from property-defaults.json)
- Australian financial conventions (income = annual, savings = monthly, prices in thousands = multiply by 1000)
- Growth curve tiers (High: 12.5/10/7.5/6, Medium: 8/6/5/4, Low: 5/4/3/2.5)
- Default assumptions: IO loans, 6.5% interest, 88% LVR for investment, individual ownership
- State-specific awareness (stamp duty varies, land tax varies)
- The structured output schema (defined below)

**Critical:** Claude does NOT do financial calculations. It only extracts/maps data. All maths happens in the existing client-side engine.

#### 2. Structured Output Schema

```typescript
interface NLParseResponse {
  type: 'initial_plan' | 'modification' | 'explanation' | 'comparison';

  // For initial_plan
  clientProfile?: {
    members: Array<{ name: string; annualIncome: number }>;
    monthlySavings: number;
    currentDeposit: number;
    existingDebt?: number;
  };
  investmentProfile?: {
    depositPool: number;
    annualSavings: number;
    baseSalary: number; // Highest earner for serviceability
    timelineYears: number;
    equityGoal?: number;
    cashflowGoal?: number;
    targetPassiveIncome?: number;
  };
  properties?: Array<{
    type: string; // Must match property-defaults.json keys
    purchasePrice: number;
    state: string; // NSW, VIC, QLD, etc.
    growthAssumption: 'High' | 'Medium' | 'Low';
    loanProduct: 'IO' | 'PI';
    lvr: number;
    rentPerWeek?: number; // If specified, otherwise calculated from yield
    targetPeriod?: number; // Preferred timing (period number)
  }>;

  // For modification
  modification?: {
    target: string; // e.g., "property-2", "savings", "interest-rate"
    action: string; // e.g., "move", "change", "add", "remove"
    params: Record<string, any>;
  };

  // For explanation
  explanation?: {
    question: string;
    relevantPeriods: number[];
    relevantProperties: string[];
  };

  // Conversational response (always present)
  message: string; // What to show in the chat
  assumptions: string[]; // What was assumed (shown in confirmation)
  followUpSuggestions?: string[]; // Optional suggested next questions
}
```

#### 3. Chat UI Component
**Location:** `src/components/ChatPanel.tsx`

Replaces the property blocks on the left rail. Design requirements:
- Chat input pinned to bottom of left panel
- Messages scroll above it
- User messages: dark bubble, right-aligned
- Bot messages: light bubble, left-aligned with small bot avatar
- Typing indicator: 3 pulsing dots
- System messages: centered pill (e.g., "✓ Plan generated — 4 properties, goal reached by 2037")
- Option cards: when the engine pushes back, show clickable cards with icon, label, description, and arrow
- Summary card: structured key-value display when confirming what was understood
- The chat panel should coexist with the existing property blocks — togglable via a tab or the existing "Properties / Client" tabs could become "Chat / Properties / Client"

#### 4. Data Mapping Layer
**Location:** `src/utils/nlDataMapper.ts`

Functions that convert Claude's NLParseResponse into the exact shapes needed by existing contexts:

```typescript
// Maps Claude's output to InvestmentProfileData
function mapToInvestmentProfile(response: NLParseResponse): Partial<InvestmentProfileData>

// Maps Claude's property suggestions to property selections + instances
function mapToPropertySelections(response: NLParseResponse): {
  selections: PropertySelection,
  order: string[],
  instances: Record<string, PropertyInstanceDetails>
}

// Maps a modification request to context updates
function mapModificationToUpdates(response: NLParseResponse, currentState: CurrentPlanState): ContextUpdates
```

These functions use `getPropertyInstanceDefaults()` from `utils/propertyInstanceDefaults.ts` to fill in the 36 fields per property that Claude doesn't specify. Claude only needs to set: purchasePrice, state, growthAssumption, loanProduct, lvr, and optionally rentPerWeek. Everything else (vacancy rate, management fees, insurance, conveyancing, etc.) comes from the property-defaults.json templates.

#### 5. Constraint Feedback Handler
**Location:** `src/utils/constraintFeedback.ts`

When a modification fails the engine's checks, this translates the failure into conversational options:

```typescript
// Takes feasibility check results and generates chat-friendly options
function generateConstraintOptions(
  failureReasons: FeasibilityResult,
  suggestedFixes: SuggestedFix[],
  currentState: CurrentPlanState
): ChatOptionCard[]
```

This uses the EXISTING `feasibilityChecker.ts` and `suggestedFixes.ts` — it just reformats their output for the chat UI instead of the current modal UI.

#### 6. Explanation Generator
**Location:** `src/utils/explanationGenerator.ts`

When the BA asks "why" about something on the dashboard, this function:
1. Identifies the relevant period and data points from useChartDataGenerator output
2. Sends the data context to Claude via the edge function
3. Returns a plain-English explanation

```typescript
function generateExplanation(
  question: string,
  chartData: ChartDataPoint[],
  timelineData: TimelineProperty[],
  period: number
): Promise<string>
```

---

## Implementation Phases

### Phase 1: Chat → Structured Data (The Pipeline)
**Goal:** BA types a scenario → Claude extracts structured JSON → data maps to PropPath types → contexts are populated → engine runs → charts render.

Prompts to give Claude Code:

1. **Create the Edge Function shell.** Create `supabase/functions/nl-parse/index.ts`. It should accept POST requests with `{ message, conversationHistory, currentPlan }`, call Claude API (anthropic SDK for Deno), and return JSON. Use the ANTHROPIC_API_KEY env var. Start with a basic system prompt that says "You are a property investment planning assistant for Australian buyers' agents. Extract structured data from natural language." We'll refine the prompt later.

2. **Define the NLParseResponse type.** Create `src/types/nlParse.ts` with the full response schema defined above. This is the contract between the edge function and the frontend.

3. **Build the system prompt.** This is the most important single file. Create `supabase/functions/nl-parse/system-prompt.ts`. It needs to include: the structured output schema as JSON schema, all property type defaults from property-defaults.json (inline them), Australian financial conventions, growth curve tiers, default assumptions, and examples of input → output mapping. Include at least 5 diverse examples: single income first-time investor, couple with existing portfolio, high-income couple targeting multiple properties, BA describing a client scenario with vague language, and a modification request.

4. **Build the data mapping layer.** Create `src/utils/nlDataMapper.ts`. The `mapToInvestmentProfile` function takes NLParseResponse and returns a partial InvestmentProfileData that can be passed to `updateProfile()`. The `mapToPropertySelections` function creates property instances using `getPropertyInstanceDefaults()` as the base, then overlays Claude's specific values (price, state, growth tier, LVR, loan type). This function needs to: create a PropertySelection object with the right property type counts, create a propertyOrder array, and create PropertyInstanceDetails for each property.

5. **Build ChatPanel.tsx.** A React component for the left rail. It needs: a message list (scrollable), a text input pinned to the bottom, message rendering for user/bot/system/option-card types, a typing indicator, and the summary card component for confirmations. Style it with Tailwind + shadcn/ui to match the existing dashboard aesthetic. The component should accept an `onPlanGenerated` callback that fires when the data mapping is complete.

6. **Wire ChatPanel into the dashboard.** Modify the left rail in the Portfolio/Dashboard page to include a "Chat" tab alongside the existing "Properties" and "Client" tabs. When Chat is active, show ChatPanel. When Properties is active, show the existing property blocks. This preserves the manual workflow while adding the NL option.

7. **Wire the data pipeline end-to-end.** When ChatPanel receives a parsed response of type 'initial_plan': call mapToInvestmentProfile → feed into InvestmentProfileContext.updateProfile(). Call mapToPropertySelections → feed into PropertySelectionContext and PropertyInstanceContext. The existing useAffordabilityCalculator will automatically recalculate. The existing useChartDataGenerator and useRoadmapData will automatically regenerate chart data. The existing timeline and charts will re-render. Test with a hardcoded NLParseResponse first before connecting the real edge function.

8. **Add loading states to the RHS dashboard.** When a plan is being generated, show skeleton loading states on the summary cards, timeline chart, and bottom cards. Use Framer Motion for smooth transitions from skeleton → populated. The skeleton should appear within 200ms of the BA sending a message.

9. **Add progressive rendering.** Instead of waiting for the entire calculation to complete, render in stages: summary cards first (fast — just profile data), then timeline chart (needs affordability calc), then bottom detail cards. Use React.Suspense or simple state flags to stagger the reveals with Framer Motion animations.

10. **Test and refine the system prompt.** Run 10+ diverse scenarios through the pipeline. Check that: income is extracted correctly (annual not monthly), savings are monthly, prices are correctly scaled ("650" → 650000, "650k" → 650000), states are valid, growth assumptions are reasonable, LVR defaults are sensible. Fix extraction errors by adding examples to the system prompt. This is iterative — expect 2-3 rounds of refinement.

### Phase 2: Talk to the Dashboard (Modifications + Explanations)
**Goal:** BA can modify the plan via conversation, and the engine pushes back when constraints are violated.

11. **Build the intent classifier.** Extend the edge function to classify incoming messages when a plan already exists: is this a modification ("move property 2", "change the price", "add another property"), an explanation ("why is cashflow negative", "explain the dip in 2029"), or a comparison ("what about Brisbane instead")? The system prompt needs context about the current plan state to do this.

12. **Build modification handling.** When a modification comes in: map it to context updates, apply them, let the engine recalculate. If the engine's feasibility checks pass → update the dashboard, confirm in chat. If they fail → DO NOT apply the change. Instead, read the failure reasons from feasibilityChecker and suggestedFixes, pass them to the constraint feedback handler, and show option cards in the chat.

13. **Build the constraint feedback handler.** `src/utils/constraintFeedback.ts`. Takes the output from `feasibilityChecker.ts` (which properties fail, why — deposit, serviceability, or borrowing) and `suggestedFixes.ts` (which already generates fix suggestions like "reduce purchase price" or "increase deposit"). Formats these into ChatOptionCard objects with: label, description, icon, and an action payload that can be applied when clicked.

14. **Build option card click handling.** When the BA clicks an option card, apply that specific fix: update the relevant context values, let the engine recalculate, re-render the dashboard, and confirm in chat. "Applied — dropped property 2 to $380k. Plan updated. Cashflow buffer is now $2,100/month."

15. **Build explanation handling.** When the BA asks "why" about something: identify the relevant period from the question (use the edge function to extract period/year references), pull the chart data and property data at that period from useChartDataGenerator output, send the data context back to Claude via the edge function, and render Claude's plain-English explanation in the chat. The explanation should reference specific numbers from the actual calculated data — not make them up.

### Phase 3: Client Output + Polish
**Goal:** Shareable client-facing view and production readiness.

16. **Conversation persistence.** Save the chat history alongside the scenario in Supabase. When a BA loads a saved scenario, the chat history loads too. Add a `conversation_history` JSONB column to the scenarios table.

17. **Client report integration.** The existing Client Report button and PDF export should work with NL-generated plans (they should already — they read from the same contexts). Test and fix any issues.

18. **Error handling.** Handle: Claude API timeouts (show "I'm thinking longer than usual, one moment..."), malformed responses (retry once, then show "Something went wrong — try rephrasing"), rate limits, network failures. Never show raw error messages to the BA.

19. **Usage tracking.** Track tokens used per user per month in Supabase. Implement a soft monthly limit (e.g., 500 plans/month — way more than any BA needs). Show usage in settings.

20. **Edge case testing.** Test: single income, couple with unequal incomes, existing portfolio with properties, PPOR included, very low deposit, very high income, zero savings, modification that makes the entire plan infeasible. Refine system prompt for each.

---

## Critical Design Principles

### 1. The AI Is a Translator, Not a Calculator
Claude extracts structured data from natural language. All financial calculations happen in the existing client-side engine (useAffordabilityCalculator, stamp duty, LMI, land tax, borrowing capacity). Claude NEVER calculates numbers. If a number appears in the chat, it came from the engine, not from Claude.

### 2. Generate First, Clarify After
Never ask the BA more than 0-1 questions before showing a plan. Use smart defaults for everything not specified. Show assumptions in the confirmation message. Let the BA refine via conversation. The magic moment is seeing a plan appear in seconds — don't delay it with questions.

### 3. Push Back, Don't Break
When a modification violates constraints, don't silently fail or show a red error. Explain why it can't work in plain English and offer 2-3 specific alternatives with real numbers. Use the existing guardrailValidator and suggestedFixes utilities — they already generate this data.

### 4. Two Questions Maximum
If the system truly cannot proceed without clarification (extremely rare — maybe if the BA says "a client" with no financial details at all), ask at most 2 questions. Group them into one message. Never ask 3+ questions.

### 5. The Voice
Chat responses should sound like a knowledgeable property strategist, not a chatbot. Short sentences. No jargon. Definitive, not hedging. No "I think" or "it appears" — use "Here's what's happening" and "The bottleneck is." No emoji. No exclamation marks. Professional but warm.

### 6. Speed Is Everything
Target: first visual content on dashboard within 2 seconds of sending a message. Full plan rendered within 4-6 seconds. Skeleton UI appears within 200ms. Use streaming from the edge function where possible. The Claude API call for structured extraction should take 1-3 seconds — it's a small JSON response, not a long conversation.

### 7. Manual Controls Stay
The existing property blocks, sliders, config modals — they all remain accessible via the "Properties" tab on the left rail. A BA can generate via chat then fine-tune a specific property by clicking into it. The chat and manual controls operate on the same underlying contexts. Changes in one reflect in the other.

---

## File Inventory: What's New vs Modified

### New Files to Create
```
supabase/functions/nl-parse/index.ts          — Edge function
supabase/functions/nl-parse/system-prompt.ts   — System prompt (most important file)
src/types/nlParse.ts                           — Response types
src/utils/nlDataMapper.ts                      — Claude JSON → PropPath types
src/utils/constraintFeedback.ts                — Failed constraints → chat options
src/utils/explanationGenerator.ts              — Dashboard questions → explanations
src/components/ChatPanel.tsx                   — Chat UI component
src/components/ChatMessage.tsx                 — Individual message renderer
src/components/ChatOptionCard.tsx              — Clickable option card component
src/components/ChatSummaryCard.tsx             — Confirmation summary display
src/hooks/useChatConversation.ts               — Chat state management + API calls
```

### Files to Modify (Minimal Changes)
```
src/pages/Portfolio.tsx (or equivalent dashboard page)
  — Add "Chat" tab to left rail alongside Properties/Client

src/AppRouter.tsx
  — No changes needed (Chat lives inside existing dashboard route)

supabase/migrations/
  — Add conversation_history column to scenarios table (Phase 3)
```

### Files to NEVER Modify
```
hooks/useAffordabilityCalculator.ts
hooks/useChartDataGenerator.ts
hooks/useRoadmapData.ts
components/InvestmentTimeline.tsx
components/ChartWithRoadmap.tsx
All files in utils/ (calculation logic)
All files in constants/
All files in types/ (except adding nlParse.ts)
All files in components/ui/ (shadcn primitives)
```

---

## Environment Setup

You'll need an Anthropic API key set in Supabase Edge Function secrets:
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

Use Claude Sonnet (claude-sonnet-4-20250514) for the edge function — best balance of speed, quality, and cost for structured extraction. Not Opus (too slow/expensive for real-time use), not Haiku (quality too low for reliable extraction).

---

## What Success Looks Like

When this is done, a BA should be able to:
1. Open PropPath
2. Type a client scenario in 1-2 sentences
3. See a visual portfolio plan appear within seconds
4. Ask "Can we do property 2 earlier?" and get a smart response with options
5. Ask "Why is cashflow negative here?" and get a plain-English explanation
6. Click "Client Report" and generate a shareable visual roadmap

No training. No onboarding. No 90-minute webinar. No "follow the bouncing ball."

That's the product.
