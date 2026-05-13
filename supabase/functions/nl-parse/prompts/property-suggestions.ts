/**
 * Property Suggestions Prompt — handles the property_suggestions intent.
 *
 * The BA wants to add a property but is vague about what kind.
 * Returns 3-4 options for them to choose from.
 */

import { ROLE_AND_VOICE, COMPLIANCE, CONVENTIONS } from './shared.ts';

interface CurrentPlanProperty {
  type: string;
  purchasePrice: number;
  state: string;
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
}

const PRESET_LABELS: Record<string, string> = {
  'eg-low': 'Equity Growth, Low Price Point',
  'eg-high': 'Equity Growth, High Price Point',
  'cf-low': 'Cash Flow, Low Price Point',
  'cf-high': 'Cash Flow, High Price Point',
  'commercial-transition': 'Commercial Transition',
};

export function buildPropertySuggestionsPrompt(currentPlan: CurrentPlanState): string {
  const presetId = currentPlan.investmentProfile.strategyPreset || 'eg-low';
  const presetLabel = PRESET_LABELS[presetId] || 'Equity Growth, Low Price Point';

  return `${ROLE_AND_VOICE}

${COMPLIANCE}

${CONVENTIONS}

## Current Plan State

**Client:** ${currentPlan.clientNames.join(' & ') || 'Not named'}
**Active Preset:** ${presetId.toUpperCase()} — ${presetLabel}
**Deposit Pool:** $${currentPlan.investmentProfile.depositPool.toLocaleString()}
**Base Salary:** $${currentPlan.investmentProfile.baseSalary.toLocaleString()}
**Existing properties:** ${currentPlan.properties.length}
${currentPlan.properties.map((p, i) => `  ${i + 1}. ${p.type} — $${p.purchasePrice.toLocaleString()} in ${p.state}`).join('\n')}

## Your Task

The BA wants to add a property but hasn't specified exactly what kind. Return 3-4 suggestions that fit the current plan.

## The 10-Cell Matrix

| Cell ID | Default Price | Default State |
|---------|---------------|---------------|
| metro-house-growth | $900k | NSW |
| metro-house-cashflow | $750k | QLD |
| regional-house-growth | $620k | QLD |
| regional-house-cashflow | $500k | NSW |
| metro-unit-growth | $580k | VIC |
| metro-unit-cashflow | $440k | QLD |
| regional-unit-growth | $430k | NSW |
| regional-unit-cashflow | $380k | QLD |
| commercial-high-cost | $2.2M | VIC |
| commercial-low-cost | $750k | QLD |

## Selection Criteria

1. Only suggest properties the client can plausibly afford
2. If the BA mentions yield/income: bias toward Cashflow-mode cells
3. If the BA mentions growth: bias toward metro/capital city cells
4. Never suggest commercial >$2M unless the client clearly has the budget
5. Diversify — don't suggest 3 of the same type
6. Complement existing properties — don't duplicate what's already in the plan

## Response Format

Return type "property_suggestions" with:
- \`propertySuggestions\`: array of 3-4 objects, each with:
  - \`propertyType\`: v4 cell ID (e.g. "regional-house-cashflow")
  - \`label\`: human-readable (e.g. "Regional House — Cashflow")
  - \`price\`: display price (e.g. "$480k")
  - \`yield\`: expected yield range (e.g. "4.5-5.2%")
  - \`reason\`: one sentence why this fits
  - \`prompt\`: the full message to send if chosen (e.g. "Add a regional-house-cashflow in QLD at $480,000")
- \`message\`: 2-3 sentence overview of the options
- \`assumptions\`: empty array`;
}
