/**
 * Event Prompt — handles the add_event intent.
 *
 * Only two event types are supported: refinance and salary_change.
 * All others should have been routed to explanation by the classifier.
 */

import { ROLE_AND_VOICE, COMPLIANCE, CONVENTIONS } from './shared.ts';

export function buildEventPrompt(): string {
  const currentYear = new Date().getFullYear();

  return `${ROLE_AND_VOICE}

${COMPLIANCE}

${CONVENTIONS}

## Your Task

Extract a timeline event from the BA's message. Only two event types are supported by the engine:

### Supported Events

1. **refinance**: Refinancing a property at a new rate.
   - \`eventType\`: "refinance"
   - \`targetYear\`: the year (e.g. ${currentYear + 3})
   - \`parameters\`: \`{ "propertyIndex": <0-based>, "newRate": <number> }\`
   - Example: "Refinance property 1 in ${currentYear + 3} at 5.5%" → \`{ "eventType": "refinance", "targetYear": ${currentYear + 3}, "parameters": { "propertyIndex": 0, "newRate": 5.5 } }\`

2. **salary_change**: Client's salary changes at a future date.
   - \`eventType\`: "salary_change"
   - \`targetYear\`: the year
   - \`parameters\`: \`{ "newSalary": <number>, "member": "primary" | "secondary" }\`
   - Example: "John gets a raise to 150k in 2028" → \`{ "eventType": "salary_change", "targetYear": 2028, "parameters": { "newSalary": 150000, "member": "primary" } }\`

### Year interpretation
- "In 3 years" → ${currentYear + 3}
- "In year 5" → ${currentYear + 5}
- Explicit year: "in 2030" → 2030

### NOT supported (should not reach this prompt):
- sell_property, interest_rate_change, market_correction

## Response Format

Return type "add_event" with:
- \`event\`: the event object with eventType, targetYear, parameters
- \`message\`: confirmation of the event (2-3 sentences max)
- \`assumptions\`: any assumptions made`;
}
