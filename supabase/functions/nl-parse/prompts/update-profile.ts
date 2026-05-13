/**
 * Update Profile Prompt — handles the update_profile intent (NEW).
 *
 * Handles mid-conversation client detail corrections/additions without
 * rebuilding the plan. This is the fix for the Demo 2 bug: "he makes 150k
 * and has 600k capacity" should update the profile, not trigger a new plan.
 */

import { ROLE_AND_VOICE, COMPLIANCE, CONVENTIONS, MODIFICATION_MESSAGE_RULES } from './shared.ts';

interface CurrentPlanState {
  clientNames: string[];
  investmentProfile: {
    depositPool: number;
    annualSavings: number;
    baseSalary: number;
    timelineYears: number;
    equityGoal: number;
    cashflowGoal: number;
  };
}

export function buildUpdateProfilePrompt(currentPlan: CurrentPlanState): string {
  return `${ROLE_AND_VOICE}

${COMPLIANCE}

${CONVENTIONS}

${MODIFICATION_MESSAGE_RULES}

## Current Plan State

**Client:** ${currentPlan.clientNames.join(' & ') || 'Not named'}
**Investment Profile:**
- Deposit Pool: $${currentPlan.investmentProfile.depositPool.toLocaleString()}
- Annual Savings: $${currentPlan.investmentProfile.annualSavings.toLocaleString()}
- Base Salary: $${currentPlan.investmentProfile.baseSalary.toLocaleString()}
- Timeline: ${currentPlan.investmentProfile.timelineYears} years
- Equity Goal: $${currentPlan.investmentProfile.equityGoal.toLocaleString()}
- Cashflow Goal: $${currentPlan.investmentProfile.cashflowGoal.toLocaleString()}

## Your Task

The BA is providing NEW or CORRECTED client financial details. Extract the updated fields and return them so the existing plan recalculates with the new values. Do NOT rebuild the plan or change properties.

## Updatable Fields

Extract any of these from the message. Only include fields the BA explicitly mentioned — do not infer or guess values for fields they didn't reference.

- **baseSalary** (number): Client income. "He makes 150k" → 150000. "Income is 200k" → 200000.
- **annualSavings** (number): Annual savings. "Saves 3k/month" → 36000. "Saving 5000 a month" → 60000. Remember: savings amounts are MONTHLY unless explicitly stated as annual.
- **depositPool** (number): Available deposit. "Has 100k saved" → 100000. "Deposit is 200k" → 200000.
- **borrowingCapacity** (number): Borrowing capacity. "Capacity is 600k" → 600000. "Pre-approved for 1.2M" → 1200000.
- **equityGoal** (number): Equity target. "Wants 3M equity" → 3000000.
- **cashflowGoal** (number): Cashflow target. "Needs 80k passive income" → 80000.
- **timelineYears** (number): Timeline. "Over 15 years" → 15.
- **existingPropertyDebt** (number): Existing property debt. "Owes 400k on PPOR" → 400000.
- **existingPropertyEquity** (number): Existing property equity. "PPOR worth 900k with 400k owing" → equity = (900000 × 0.8) − 400000 = 320000.
- **targetPassiveIncome** (number): Target passive income.

## Response Format

Return type "update_profile" with:
- \`profileUpdates\`: object containing ONLY the fields being updated, with their new values
- \`message\`: confirmation of what was updated, citing the new absolute values
- \`assumptions\`: any assumptions made during extraction

Example: BA says "he makes 150k and has 600k capacity"
→ \`profileUpdates: { baseSalary: 150000, borrowingCapacity: 600000 }\`
→ message: "Updated income to $150k and borrowing capacity to $600k. The dashboard reflects the new numbers."

## Rules
1. Only update fields explicitly mentioned. If the BA says "income is 150k", only update baseSalary — don't touch savings, deposit, or anything else.
2. Use ABSOLUTE values, not deltas.
3. For savings, convert monthly to annual (× 12) before setting annualSavings.
4. For PPOR equity, calculate: equity = (value × 0.8) − debt.
5. Do NOT return clientProfile, investmentProfile, or properties arrays — those would rebuild the plan.`;
}
