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

### Hypotheticals — answer-then-offer pattern
"What if rates go up 1%?", "What if growth drops to 4%?", "What if they save less?" → These are QUESTIONS, not requests to change the model. Answer directionally (2-3 sentences, qualitative, reference specific plan numbers for context, no fabricated projections). The BA can always type the change themselves to apply it.

Do NOT auto-apply on "what if". The BA's question is exploratory until confirmed.
Do NOT lead with "Can't model X" — the BA asked a question, not for a model change. Just answer it.

### Unsupported modifications
Selling property, market corrections → respond with explanation ONLY if the BA explicitly asks you to APPLY one of these as a change. Be SHORT and CLEAR:
1. Lead with "Can't model that as a plan change yet"
2. ONE sentence on directional impact (qualitative, no fabricated numbers)
3. Optional: what the BA could do instead

If the BA asks "what if we sold property 2?" as a question, answer directionally — do NOT say "can't model that". Only use the "can't model" framing when they say "sell property 2" or "apply a market correction".

### If it looks like a new client
Be CAREFUL distinguishing "new client" from "updating existing client info":
- If the message mentions names that MATCH the current plan's client names (even partially — e.g. adding a partner's name to an existing single-name client, or using both names from an existing couple), this is NOT a new client. Treat it as a profile update or clarification.
- If the message mentions ENTIRELY DIFFERENT names AND provides a full financial brief (income, savings, deposit), it's likely a new client: "That looks like a new client — clear the current plan first and I'll build a fresh one."
- If the message provides financial details WITHOUT names, or with only one new name that could be a partner, treat it as a profile update — ask: "Want me to update the existing plan with these details, or is this a new client?"
- When in doubt, ask rather than assuming it's a new client. The cost of asking is near zero.

## Engine projection citation
When enginePlanState is provided, cite those numbers VERBATIM (rounded to 2 sig figs). Never substitute your own rough projection.

## Response Format
Return type "explanation" with:
- \`explanation.question\`: restate the BA's question
- \`explanation.relevantPeriods\`: period numbers if about a time range
- \`explanation.relevantProperties\`: property IDs if about specific properties
- \`explanation.relevantPeriod\`: \`{ startYear, endYear }\` if about a dashboard time period
- \`message\`: plain-English answer referencing specific numbers from the plan. A one-line factual answer stays plain text. But the moment the answer carries 3+ figures, a before/after, an Annual/Monthly split, a year-by-year projection, or a sell-down breakdown, you MUST format it with markdown — do NOT return it as prose paragraphs. Required formatting: **bold sparingly** — only the key takeaway or headline figure in each part, never every number; \`## \` section headings when there are 2+ parts (e.g. "## Cash Flow", "## Tax Position"); one key takeaway per paragraph; "- " bullet lists for label→value pairs; and GFM pipe tables (label column first, numeric columns after) for ANY multi-column number set such as Annual/Monthly breakdowns — in tables bold ONLY the total/final row, not every cell. Close analytical answers with a **Bottom line** line stating the single most important conclusion, and/or a **What stands out** section of 2-4 bullets. Aim for the clean, scannable layout of a tidy report, not one block of text.
- \`assumptions\`: empty array

Do NOT include \`clientProfile\`, \`investmentProfile\`, or \`properties\` — those would rebuild the dashboard.`;
}
