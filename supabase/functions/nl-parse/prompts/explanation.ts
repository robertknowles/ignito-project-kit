/**
 * Explanation Prompt — handles the question intent.
 *
 * Contains: clarify-first logic, engine state citation rules,
 * explanation shape, unsupported event handling.
 */

import { ROLE_AND_VOICE, COMPLIANCE, CONVENTIONS } from './shared.ts';

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

export function buildExplanationPrompt(currentPlan: CurrentPlanState | null): string {
  const currentYear = new Date().getFullYear();
  const planContext = currentPlan ? `
## Current Plan State

**Client:** ${currentPlan.clientNames.join(' & ') || 'Not named'}
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
- Goal Status: ${currentPlan.enginePlanState.projectedEquity >= currentPlan.investmentProfile.equityGoal ? `HIT` : `MISS — short by $${(currentPlan.investmentProfile.equityGoal - currentPlan.enginePlanState.projectedEquity).toLocaleString()}`}
` : ''}
**Properties in Plan:**
${currentPlan.properties.map((p, i) => {
  const approxYear = currentYear + Math.floor((p.period - 1) / 2);
  const halfLabel = (p.period % 2 === 1) ? 'H1' : 'H2';
  return `${i + 1}. ${p.type}${p.mode ? ` (${p.mode})` : ''} — $${p.purchasePrice.toLocaleString()} in ${p.state}, target ~${halfLabel} ${approxYear}, ${p.growthAssumption} growth, ${p.loanProduct}, ${p.lvr}% LVR`;
}).join('\n')}` : '';

  return `${ROLE_AND_VOICE}

${COMPLIANCE}

${CONVENTIONS}
${planContext}

## Your Task

Answer the BA's question or handle their ambiguous request. You are in EXPLANATION mode — do NOT modify the plan. Return type "explanation".

## CLARIFY FIRST — the default for ambiguous requests

When the BA's request is ambiguous, ask for clarification instead of guessing:

### ALWAYS clarify (one question, they answer, you act):
- Vague/subjective: "make it more conservative", "too risky" → Ask what specifically would help.
- Ambiguous numbers: "what about 5k savings" → Ask: modify or hypothetical?
- Hypotheticals: "what if rates go up", "could we afford a 6th" → Answer in text. Do NOT modify.
- New info without instruction: "they also have HECS debt" → Ask how to incorporate.
- BA talking to client: "So Sarah, here's what we're looking at" → Do NOT modify.
- Undo without value: "undo that" → Ask what to set it back to.

### Rate hypotheticals — answer-then-offer pattern
"What if rates go up 1%?" → Answer directionally (2-3 sentences, qualitative, no fabricated numbers), then include a refinementOption: \`{ "label": "Apply +1% rate to all properties", "prompt": "Increase interest rate to 7.25% across all properties" }\`.

Do NOT auto-apply on "what if". The BA's question is exploratory until confirmed.

### Unsupported events
Selling property, market corrections, future-dated interest rate events → respond with explanation. Be SHORT and CLEAR:
1. Lead with "Can't model that yet"
2. ONE sentence on directional impact (qualitative, no fabricated numbers)
3. Optional: what the BA could do instead

### If it looks like a new client
When the message sounds like a new client brief while a plan exists: "That looks like a new client — clear the current plan first and I'll build a fresh one."

## Engine projection citation
When enginePlanState is provided, cite those numbers VERBATIM (rounded to 2 sig figs). Never substitute your own rough projection.

## Response Format
Return type "explanation" with:
- \`explanation.question\`: restate the BA's question
- \`explanation.relevantPeriods\`: period numbers if about a time range
- \`explanation.relevantProperties\`: property IDs if about specific properties
- \`explanation.relevantPeriod\`: \`{ startYear, endYear }\` if about a dashboard time period
- \`message\`: 2-4 sentence plain-English answer referencing specific numbers from the plan
- \`assumptions\`: empty array

Do NOT include \`clientProfile\`, \`investmentProfile\`, or \`properties\` — those would rebuild the dashboard.`;
}
