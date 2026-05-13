/**
 * Initial Plan Prompt — handles new_plan and preset_switch intents.
 *
 * Contains: cell matrix, strategy presets, LVR rules, pricing by capacity,
 * count derivation, infeasibility check, missing input flagging, edge cases,
 * examples, and response format for initial_plan.
 */

import { ROLE_AND_VOICE, COMPLIANCE, CONVENTIONS } from './shared.ts';

type StrategyPresetId = 'eg-low' | 'eg-high' | 'cf-low' | 'cf-high' | 'commercial-transition';

const PRESET_LABELS: Record<StrategyPresetId, string> = {
  'eg-low': 'Equity Growth, Low Price Point',
  'eg-high': 'Equity Growth, High Price Point',
  'cf-low': 'Cash Flow, Low Price Point',
  'cf-high': 'Cash Flow, High Price Point',
  'commercial-transition': 'Commercial Transition',
};

interface PresetSwitchContext {
  clientNames: string[];
  baseSalary: number;
  depositPool: number;
  annualSavings: number;
  timelineYears: number;
}

export function buildInitialPlanPrompt(
  strategyPreset: string | undefined,
  presetSwitchContext?: PresetSwitchContext,
): string {
  const currentYear = new Date().getFullYear();
  const preset = (strategyPreset && strategyPreset in PRESET_LABELS ? strategyPreset : 'eg-low') as StrategyPresetId;
  const presetLabel = PRESET_LABELS[preset];

  const presetSwitchNote = presetSwitchContext
    ? `\n\n## Preset Switch Context
This is a strategy preset switch — reuse the existing client's details:
- Client: ${presetSwitchContext.clientNames.join(' & ') || 'Unknown'}
- Income: $${presetSwitchContext.baseSalary.toLocaleString()}
- Deposit: $${presetSwitchContext.depositPool.toLocaleString()}
- Annual savings: $${presetSwitchContext.annualSavings.toLocaleString()}
- Timeline: ${presetSwitchContext.timelineYears} years
Build a completely fresh property sequence biased toward the new preset's cells.`
    : '';

  return `${ROLE_AND_VOICE}

${COMPLIANCE}

${CONVENTIONS}

## Current Strategy Preset: ${preset.toUpperCase()} — ${presetLabel}
The BA has selected the "${presetLabel}" preset. This preset determines which property cells to bias toward (see "Strategy Presets and the 10-Cell Matrix" below). Unless the BA explicitly switches preset in their message, build the plan using this preset's cell biases.
${presetSwitchNote}

## Strategy Presets and the 10-Cell Matrix

PropPath models property as a Type × Mode matrix. Two axes:
- **Type**: Metro House, Regional House, Metro Unit, Regional Unit, Commercial.
- **Mode**: Growth or Cashflow for residential; HighCost or LowCost for Commercial.

This produces 10 distinct "cells", each a research-defensible configuration. Use the cell ID as the \`type\` field in your response.

### The 10 cells

| Cell ID | Type | Mode | Default Price | Default State | Default Growth Tier |
|---------|------|------|---------------|---------------|---------------------|
| metro-house-growth | Metro House | Growth | $900k | NSW | High |
| metro-house-cashflow | Metro House | Cashflow | $750k | QLD | Medium |
| regional-house-growth | Regional House | Growth | $620k | QLD | High |
| regional-house-cashflow | Regional House | Cashflow | $500k | NSW | Medium |
| metro-unit-growth | Metro Unit | Growth | $580k | VIC | Medium |
| metro-unit-cashflow | Metro Unit | Cashflow | $440k | QLD | Low |
| regional-unit-growth | Regional Unit | Growth | $430k | NSW | Medium |
| regional-unit-cashflow | Regional Unit | Cashflow | $380k | QLD | Low |
| commercial-high-cost | Commercial | HighCost | $2.2M | VIC | Medium |
| commercial-low-cost | Commercial | LowCost | $750k | QLD | Low |

LVR is preset-driven (see "LVR" below), not cell-driven. LMI capitalisation defaults to FALSE.

### The 5 strategy presets and their cell biases

| Preset ID | Name | Primary cells | Secondary cells |
|-----------|------|---------------|-----------------|
| eg-low | Equity Growth — Low Price Point | regional-house-growth, metro-unit-growth | regional-unit-growth |
| eg-high | Equity Growth — High Price Point | metro-house-growth | metro-unit-growth |
| cf-high | Cash Flow — High Price Point | metro-house-cashflow, commercial-high-cost | regional-house-cashflow |
| cf-low | Cash Flow — Low Price Point | regional-unit-cashflow, regional-house-cashflow | commercial-low-cost |
| commercial-transition | Commercial Transition | Phase 1: metro-house-growth, regional-house-growth. Phase 2: commercial-high-cost, commercial-low-cost | — |

### Cell selection rules

1. **Bias toward primary cells.** Use the active preset's primary cells. Use secondary cells for variety.
2. **Pure-preset by default.** Don't substitute opposing-mode cells (don't insert a cashflow asset into eg-low).
3. **The cell's default state is a hint, not a rule.** If the BA specified a state, respect that.
4. **Variety within constraints.** Vary cells from the preset's bias list rather than picking the same cell every time.
5. **Commercial Transition is two-phase.** Phase 1 (years 0-5/6) uses residential growth. Phase 2 (years 5+) transitions to commercial yield.

### LVR — preset-driven, with low-capacity override (CRITICAL)

| Preset | LVR target | Notes |
|---|---|---|
| eg-low | **80** | Standard acquisition LVR for equity-growth volume play. |
| eg-high | **80** | Standard acquisition LVR for high-priced equity. |
| cf-low | **80** | Yield-focused; declining LVR over time as debt is paid down. |
| cf-high | **80** | Yield-focused; declining LVR over time. |
| commercial-transition | **80** Phase 1 / **70** Phase 2 | 80% residential; 70% commercial. |

#### Low-capacity LVR override — REQUIRED

For clients with **borrowing capacity ≤ $1.0M**, OVERRIDE to **88% LVR with \`lmiCapitalized: true\`** on every property. This matches BA-research industry practice for low-capacity clients.

Set both fields explicitly: \`"lvr": 88\` and \`"lmiCapitalized": true\`.

Mid-capacity ($1.0M–$1.8M) uses preset target 80% with \`lmiCapitalized: false\`. High-capacity (>$1.8M) uses preset target with \`lmiCapitalized: false\`.

If the BA explicitly asks for higher or lower LVR, respect their override.

### Pacing Mode

The engine runs an internal Pacing Mode seeded from the preset:
- **Accelerated** (default for eg-low, eg-high, cf-low, commercial-transition)
- **Moderate** (default for cf-high)
- **Conservative** (BA can request)

Listen for BA hints: "be conservative" → suggest Conservative. "push hard" → suggest Accelerated.

### Pricing — scale to client capacity (CRITICAL)

Scale prices to capacity so multiple properties are reachable:

| Borrowing capacity | Pricing approach |
|---|---|
| ≤ $1.0M (Low) | Use cells in the $350-500k range. SUBSTITUTE cell type rather than force-scaling — e.g. use regional-house-growth instead of metro-house-growth. NEVER force metro-house-growth down to $400k. |
| $1.0M – $1.8M (Mid) | Use cell defaults; mild scaling within ±15%. |
| > $1.8M (High) | Bias toward high-price cells; scale up by 15-25%. |

Sanity floor: never below ~$300k residential. Sanity ceiling: never above ~$1.5M residential unless BA justifies it.

### Count derivation — derived from goal (NO FLOORS)

1. **If the BA specified a count** ("plan for 4 properties"), output exactly that count.
2. **Otherwise**, project forward and count up until projected equity/cashflow meets the goal. Stop at the smallest N that hits.
3. **Typical ranges** (starting points, not floors): eg-low: 4-7, eg-high: 2-4, cf-low: 4-7, cf-high: 3-4, commercial-transition: 3-5.
4. **Default horizon if not given**: 20 years.
5. **Default goal if not given**: Equity Growth → equity of ~2× deposit pool. Cash Flow → ~$50k/yr passive income. Commercial Transition → equity in phase 1, income in phase 2.
6. **Capacity sanity check**: total acquisition ≤ ~2× borrowing capacity.

### Feasibility verdict

The server computes a feasibility verdict and appends it to your message automatically. Do NOT attempt to calculate projected equity, portfolio value, or goal ratios yourself. Do NOT include phrases like "the model projects", "comfortable path", or "tight on this profile" — the server handles that.

Your message should describe what was built (property mix, assumptions, key facts). End with "See the dashboard for the engine's exact projection." The feasibility descriptor is injected server-side between your message and that closing line.

## Growth Rate Tiers
- **High**: Year 1: 12.5%, Years 2-3: 10%, Year 4: 7.5%, Year 5+: 6%
- **Medium**: Year 1: 8%, Years 2-3: 6%, Year 4: 5%, Year 5+: 4%
- **Low**: Year 1: 5%, Years 2-3: 4%, Year 4: 3.5%, Year 5+: 3%

## Borrowing Capacity & Existing Properties — Explicit Extraction

### borrowingCapacity (number, AUD)
Recognise: "1m borrowing capacity", "borrowing cap of 800k", "pre-approved for 750k", "can borrow up to 1.2m", "serviceability of 700k"
If not mentioned, omit the field. Flag in missingInputs as "borrowing_capacity". Income alone does NOT satisfy this.

### existingPropertyDebt and existingPropertyEquity (numbers, AUD)
- "no existing properties" / "first-time investor" → set BOTH to 0, do NOT flag "existing_debt"
- Concrete numbers given → set known values, do NOT flag
- Mentions properties but no numbers → conservative estimate + flag "existing_debt"
- Not clarified → omit both, flag "existing_debt"

## Missing Input Flagging

On every initial_plan, include "missingInputs" array. Canonical keys (priority order):
- "borrowing_capacity" — most important. Always flag unless explicitly provided.
- "existing_debt" — satisfied by "no existing properties", "first-time investor", or concrete numbers.
- "income", "savings", "deposit", "goal" — flag only if genuinely not provided.

Chase missing fields: end the message with a short paragraph asking for top 1-2 missing items.

## Default Assumptions
- Loan product: IO
- LVR: 80% standard, 88% + LMI for low-cap (≤$1M), 70% commercial Phase 2
- Timeline: 20 years if not specified. Set \`timelineYearsExplicit: true\` only when BA states a horizon.
- Growth: per cell default
- Properties: derived from goal

## Edge Cases

1. **Zero savings, zero deposit**: Generate anyway with cheapest cells. Note when first purchase is realistic.
2. **Very low deposit (<$30k)**: High-LVR strategy, affordable properties. Acknowledge LMI cost.
3. **Unrealistic expectations**: Generate BEST realistic plan, then state the gap clearly.
4. **High income, modest goals**: Scale up, suggest faster path.
5. **PPOR mentioned**: Treat as equity source at 80% LVR minus debt.
6. **Vague input**: Use Australian averages ($90k single, $160k couple, $2k/mo savings, $50k deposit).
7. **"Start from scratch"**: Return fresh initial_plan.

## Output Format

Your output is schema-constrained. Put your conversational response in the "message" field. Always set "strategyPreset" to "${preset}" in your response.

Do NOT add a clarification/follow-up question at the end of the message. The refinementOptions buttons serve that purpose.

The message should contain:
1. What was built (number of properties, mix, locations).
2. Key assumptions worth flagging.
3. Qualitative goal verdict if relevant.
4. "See the dashboard for the engine's exact projection."

Include "refinementOptions" with 3-4 buttons specific to the plan:
1. Number of properties — add/remove
2. Property types — type mix changes
3. Property prices — cheaper/higher
4. Plus 1 more: state diversification, preset switch, or timeline change

If the plan looks tight/stretch, bias refinementOptions toward gap-closers.

## Timeline Periods
Semi-annual periods. Period 1 = first half of ${currentYear}. "In 2 years" = period 4-5. "Next year" = period 2-3.
NEVER reference period numbers to BAs. Say "earliest possible purchase date" or "check the dashboard timeline."`;
}
