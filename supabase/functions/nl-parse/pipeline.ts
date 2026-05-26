/**
 * Pipeline Orchestrator
 *
 * Provides prompt and schema selection based on classified intent.
 * Both the edge function (Deno) and the eval runner (Node/tsx) import
 * this module — the API call logic stays in each caller.
 *
 * Flow:
 *   1. Caller runs classifier → gets intent
 *   2. Caller calls getPromptForIntent() → gets focused system prompt
 *   3. Caller calls getSchemaForIntent() → gets tool schema
 *   4. Caller makes the API call with the focused prompt + schema
 */

import {
  buildClassifierPrompt,
  CLASSIFY_TOOL,
  CLASSIFY_TOOL_CHOICE,
} from './prompts/classify.ts';
import { buildInitialPlanPrompt } from './prompts/initial-plan.ts';
import { buildModificationPrompt } from './prompts/modification.ts';
import { buildUpdateProfilePrompt } from './prompts/update-profile.ts';
import { buildExplanationPrompt } from './prompts/explanation.ts';
import { buildEventPrompt } from './prompts/event.ts';
import { buildPropertySuggestionsPrompt } from './prompts/property-suggestions.ts';
import { RESPONSE_TOOL, RESPONSE_TOOL_CHOICE } from './response-schema.ts';

// Re-export for callers
export { CLASSIFY_TOOL, CLASSIFY_TOOL_CHOICE };
export { RESPONSE_TOOL, RESPONSE_TOOL_CHOICE };

export type ClassifiedIntent =
  | 'new_plan'
  | 'update_profile'
  | 'modify_property'
  | 'modify_profile'
  | 'question'
  | 'preset_switch'
  | 'add_event'
  | 'property_suggestions';

export interface ClassifierResult {
  intent: ClassifiedIntent;
  reasoning: string;
}

interface CurrentPlanState {
  investmentProfile: {
    depositPool: number;
    annualSavings: number;
    baseSalary: number;
    timelineYears: number;
    equityGoal: number;
    cashflowGoal: number;
    strategyPreset?: string;
  };
  properties: Array<{
    instanceId: string;
    type: string;
    purchasePrice: number;
    state: string;
    period: number;
    growthAssumption: 'High' | 'Medium' | 'Low';
    loanProduct: 'IO' | 'PI';
    lvr: number;
    mode?: 'Growth' | 'Cashflow' | 'HighCost' | 'LowCost';
  }>;
  clientNames: string[];
  enginePlanState?: {
    horizonYear: number;
    projectedPortfolioValue: number;
    projectedEquity: number;
    projectedAnnualCashflow?: number;
    equityGoalReachedYear: number | null;
  };
}

// ── Step 1: Classifier ──────────────────────────────────────────────

export function getClassifierPrompt(hasPlan: boolean): string {
  return buildClassifierPrompt(hasPlan);
}

export function getClassifierTools() {
  return {
    tool: CLASSIFY_TOOL,
    toolChoice: CLASSIFY_TOOL_CHOICE,
  };
}

// ── Step 2: Route to focused prompt ─────────────────────────────────

/**
 * Maps a classified intent to the appropriate response type that the
 * tool schema expects. Some intents map to the same response type.
 */
export function intentToResponseType(intent: ClassifiedIntent): string {
  switch (intent) {
    case 'new_plan':
    case 'preset_switch':
      return 'initial_plan';
    case 'modify_property':
    case 'modify_profile':
      return 'modification';
    case 'update_profile':
      return 'update_profile';
    case 'question':
      return 'explanation';
    case 'add_event':
      return 'add_event';
    case 'property_suggestions':
      return 'property_suggestions';
  }
}

export function getPromptForIntent(
  intent: ClassifiedIntent,
  currentPlan: CurrentPlanState | null,
  strategyPreset?: string,
  conversationSummary?: string,
  planningDefaults?: Record<string, unknown> | null,
): string {
  let prompt: string;

  switch (intent) {
    case 'new_plan':
      prompt = buildInitialPlanPrompt(strategyPreset, undefined, planningDefaults);
      break;

    case 'preset_switch':
      prompt = buildInitialPlanPrompt(
        strategyPreset,
        currentPlan
          ? {
              clientNames: currentPlan.clientNames,
              baseSalary: currentPlan.investmentProfile.baseSalary,
              depositPool: currentPlan.investmentProfile.depositPool,
              annualSavings: currentPlan.investmentProfile.annualSavings,
              timelineYears: currentPlan.investmentProfile.timelineYears,
            }
          : undefined,
        planningDefaults,
      );
      break;

    case 'modify_property':
    case 'modify_profile':
      if (!currentPlan) {
        prompt = buildExplanationPrompt(null);
        break;
      }
      prompt = buildModificationPrompt(currentPlan);
      break;

    case 'update_profile':
      if (!currentPlan) {
        prompt = buildExplanationPrompt(null);
        break;
      }
      prompt = buildUpdateProfilePrompt(currentPlan);
      break;

    case 'question':
      prompt = buildExplanationPrompt(currentPlan);
      break;

    case 'add_event':
      prompt = buildEventPrompt();
      break;

    case 'property_suggestions':
      if (!currentPlan) {
        prompt = buildExplanationPrompt(null);
        break;
      }
      prompt = buildPropertySuggestionsPrompt(currentPlan);
      break;
  }

  if (conversationSummary) {
    prompt += `\n\n## Conversation History (action log)\n\n${conversationSummary}\n\nUse this log to understand what has already been discussed and done. Do not repeat prior actions or contradict prior answers.`;
  }

  return prompt;
}

/**
 * Returns the tool and tool_choice for the extract+respond step.
 * Currently uses the same RESPONSE_TOOL for all intents (the schema
 * is a union type). The focused prompt guides the AI to the right
 * response type.
 */
export function getResponseTools() {
  return {
    tool: RESPONSE_TOOL,
    toolChoice: RESPONSE_TOOL_CHOICE,
  };
}
