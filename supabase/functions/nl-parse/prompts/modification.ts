/**
 * Modification Prompt — handles modify_property and modify_profile intents.
 *
 * Contains: modification classification, compound modifications, relative
 * changes, valid targets, property field changes, profile changes.
 * Does NOT contain: cell matrix, count derivation, infeasibility check.
 */

import { ROLE_AND_VOICE, COMPLIANCE, CONVENTIONS, MODIFICATION_MESSAGE_RULES } from './shared.ts';

interface CurrentPlanProperty {
  instanceId: string;
  type: string;
  purchasePrice: number;
  state: string;
  period: number;
  growthAssumption: 'High' | 'Medium' | 'Low';
  loanProduct: 'IO' | 'PI';
  lvr: number;
  mode?: 'Growth' | 'Cashflow' | 'HighCost' | 'LowCost';
}

interface CurrentPlanState {
  clientNames: string[];
  investmentProfile: {
    depositPool: number;
    annualSavings: number;
    baseSalary: number;
    timelineYears: number;
    equityGoal: number;
    cashflowGoal: number;
    strategyPreset?: string;
  };
  properties: CurrentPlanProperty[];
  enginePlanState?: {
    horizonYear: number;
    projectedPortfolioValue: number;
    projectedEquity: number;
    projectedAnnualCashflow?: number;
    equityGoalReachedYear: number | null;
  };
}

const PRESET_LABELS: Record<string, string> = {
  'eg-low': 'Equity Growth, Low Price Point',
  'eg-high': 'Equity Growth, High Price Point',
  'cf-low': 'Cash Flow, Low Price Point',
  'cf-high': 'Cash Flow, High Price Point',
  'commercial-transition': 'Commercial Transition',
};

export function buildModificationPrompt(currentPlan: CurrentPlanState): string {
  const currentYear = new Date().getFullYear();
  const presetId = currentPlan.investmentProfile.strategyPreset || 'eg-low';
  const presetLabel = PRESET_LABELS[presetId] || 'Equity Growth, Low Price Point';

  return `${ROLE_AND_VOICE}

${COMPLIANCE}

${CONVENTIONS}

${MODIFICATION_MESSAGE_RULES}

## Current Plan State

**Client:** ${currentPlan.clientNames.join(' & ') || 'Not named'}
**Active Preset:** ${presetId.toUpperCase()} — ${presetLabel}
**Investment Profile:**
- Deposit Pool: $${currentPlan.investmentProfile.depositPool.toLocaleString()}
- Annual Savings: $${currentPlan.investmentProfile.annualSavings.toLocaleString()}
- Base Salary: $${currentPlan.investmentProfile.baseSalary.toLocaleString()}
- Timeline: ${currentPlan.investmentProfile.timelineYears} years
- Equity Goal: $${currentPlan.investmentProfile.equityGoal.toLocaleString()}
- Cashflow Goal: $${currentPlan.investmentProfile.cashflowGoal.toLocaleString()}
${currentPlan.enginePlanState ? `
**Engine projection at horizon (year ${currentPlan.enginePlanState.horizonYear}) — cite these VERBATIM:**
- Projected Portfolio Value: $${currentPlan.enginePlanState.projectedPortfolioValue.toLocaleString()}
- Projected Equity: $${currentPlan.enginePlanState.projectedEquity.toLocaleString()}${currentPlan.enginePlanState.projectedAnnualCashflow !== undefined ? `
- Projected Annual Cashflow: $${currentPlan.enginePlanState.projectedAnnualCashflow.toLocaleString()}/yr` : ''}
- Equity Goal Reached: ${currentPlan.enginePlanState.equityGoalReachedYear ?? 'NOT REACHED at horizon'}
` : ''}
**Properties in Plan:**
${currentPlan.properties.map((p, i) => {
  const approxYear = currentYear + Math.floor((p.period - 1) / 2);
  const halfLabel = (p.period % 2 === 1) ? 'H1' : 'H2';
  return `${i + 1}. ${p.type}${p.mode ? ` (${p.mode})` : ''} — $${p.purchasePrice.toLocaleString()} in ${p.state}, target ~${halfLabel} ${approxYear} (period ${p.period}), ${p.growthAssumption} growth, ${p.loanProduct}, ${p.lvr}% LVR (ID: ${p.instanceId})`;
}).join('\n')}

## Modification Rules

When the BA says "property 2" or "the second one", they mean property #2 in the list above. When they say "make it cheaper" without specifying which, ask which property. When they say "all of them", apply to every property.

### Classify the modification intent:
- Moving timing: "earlier", "later", "to 2026" → action: "move"
- Changing price: "cheaper", "drop to 400k" → action: "change" with purchasePrice
- Changing state: "VIC instead" → action: "change" with state
- Adding property: "add another", "5 properties instead" → action: "add", target: "portfolio". Include ONLY the NEW properties in "properties" array — NOT existing ones.
- Removing property: "drop the last one" → action: "remove"
- Changing profile: "actually saving 5k", "income is 150k" → target: "savings" or "income"
- Changing goals: "equity goal to 5M" → target: "equityGoal" or "cashflowGoal"

### Compound modifications (CRITICAL)
When the BA asks for MULTIPLE changes in one message, use the \`modifications\` array (plural), NOT a single \`modification\`. Each change is a separate entry.

### Property Field Changes
Supported \`change\` params: \`purchasePrice\`, \`state\`, \`lvr\`, \`loanProduct\`, \`growthAssumption\`, \`rentPerWeek\`, \`interestRate\`.

If the BA asks for something outside this list, respond with type "explanation" saying it isn't editable from chat yet.

**\`type\` (cell ID) is NOT a settable param.** If the BA asks "make property 2 a regional house":
- Check if it already matches → acknowledge as no-op
- If genuinely different → respond with explanation that per-property type swaps aren't supported

### Relative changes (CRITICAL)
The mapper expects ABSOLUTE values, not deltas. When the BA says "increase by $500k":
1. Read the current value from the plan above
2. Apply the math
3. Return the ABSOLUTE result

Example: property 2 is $700k, BA says "increase by $500k" → return \`{ "purchasePrice": 1200000 }\`

### Valid targets
\`property-1\`, \`property-2\`, …, \`property-N\` (1-indexed), \`savings\`, \`income\`, \`timeline\`, \`equityGoal\`, \`cashflowGoal\`, \`lvr\`, \`rates\` (bulk rate change), \`portfolio\` (add/remove).

For goal changes: target \`equityGoal\` with \`params: { equityGoal: <number> }\` or target \`cashflowGoal\` with \`params: { cashflowGoal: <number> }\`.

### Modification Pushback
When a modification would make the plan infeasible:
- Lead with the reason and real numbers
- Offer exactly 3 alternatives as structured refinementOptions
- Tone: matter-of-fact, not apologetic

### Adding properties — cell selection
When adding a property, use cells from the active preset's bias list. Map BA shorthand:
- "duplex" / "house with granny" → regional-house-cashflow or metro-house-cashflow
- "small block" / "3-4 unit block" → metro-unit-cashflow or regional-unit-cashflow
- "townhouse" / "villa" / "apartment" → metro-unit-growth or metro-unit-cashflow
- "blue-chip metro" / "premium house" → metro-house-growth
- "commercial" / "industrial" → commercial-high-cost or commercial-low-cost

### Timeline Periods
Semi-annual periods. Period 1 = first half of ${currentYear}. NEVER reference period numbers to BAs.

## Engine projection citation
When enginePlanState is provided, cite those numbers VERBATIM (rounded to 2 sig figs). Never substitute your own rough projection.`;
}
