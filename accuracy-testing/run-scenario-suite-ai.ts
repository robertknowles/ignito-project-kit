#!/usr/bin/env npx vite-node
/**
 * Scenario Accuracy Suite — LIVE AI leg (measurement only, no app code changes).
 *
 * Feeds each of the 20 scenarios' natural-language briefs through the REAL
 * production nl-parse pipeline (Tier 2: single call, prompt.ts + tools.ts +
 * validation.ts + templates.ts + feasibility.ts — the exact modules
 * supabase/functions/nl-parse/index.ts uses), applies the AI output through
 * the SAME mapper path the app uses (planPreCheck/autoFix + nlDataMapper via
 * confirmPlan-equivalent for create_plan; scenarioMutator for modify_plan;
 * handleUpdateProfile-equivalent for update_profile), runs the real engine,
 * and grades with the SAME expectations as the engine-only suite.
 *
 * Fixtures replay ALL of the tester's user turns VERBATIM from the fixture's
 * chatHistory (threading conversationHistory + currentPlan between turns like
 * the app does). Variants send the suite brief as a single fresh-client turn.
 *
 *   npx vite-node accuracy-testing/run-scenario-suite-ai.ts
 *   npx vite-node accuracy-testing/run-scenario-suite-ai.ts -- --only FIX-ELLA-314
 *
 * (vite-node, not tsx — engine code reads import.meta.env.DEV.)
 * Requires ANTHROPIC_API_KEY in .env.local or the environment.
 *
 * Notable headless deviations from the app (called out in the report):
 *  - The confirmation brief is auto-approved (no BA review step).
 *  - No Supabase persistence: the "saved state" graded here is the in-memory
 *    plan the mapper produced — chat-vs-saved-DB divergence is NOT exercised.
 *  - planningDefaults / strategyProfileText are not sent (unknown for testers).
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

// ── Production nl-parse pipeline modules (same imports as index.ts) ──────────
import { buildSystemPrompt } from '../supabase/functions/nl-parse/prompt';
import { ALL_TOOLS, TOOL_CHOICE, CREATE_PLAN_TOOL, toolToResponseType } from '../supabase/functions/nl-parse/tools';
import {
  buildCreatePlanMessage,
  buildModifyPlanMessage,
  buildUpdateProfileMessage,
  buildAddEventMessage,
} from '../supabase/functions/nl-parse/templates';
import {
  validateCreatePlan,
  validateModifyPlan,
  validateUpdateProfile,
  validateAddEvent,
} from '../supabase/functions/nl-parse/validation';
import { computeFeasibility, injectFeasibilityDescriptor, computeStatedPriceFundingNote, injectFundingNote } from '../supabase/functions/nl-parse/feasibility';

// ── App-side apply path (same modules ChatPanel / Compare use) ───────────────
import {
  runScenario,
  type ScenarioInput,
  type ScenarioEnv,
  type ScenarioRunResult,
} from '../src/engine/scenarioRunner';
import { applyNlResponseToScenario } from '../src/engine/scenarioMutator';
import { runPlanPreCheck, autoFixPlan } from '../src/engine/planPreCheck';
import {
  mapToInvestmentProfile,
  mapToPropertySelections,
  mapToExistingProperties,
  mapUpdateProfileToUpdates,
  forceRefinanceOn,
} from '../src/utils/nlDataMapper';
import { rewritePlanMessageAfterAutoFix } from '../src/utils/autoFixDisclosure';
import { INITIAL_INVESTMENT_PROFILE, type InvestmentProfileData } from '../src/contexts/InvestmentProfileContext';
import { BASE_YEAR, PERIODS_PER_YEAR, GROWTH_RATE_TIERS } from '../src/constants/financialParams';
import { CELL_IDS, getCategoryLabel, getCellDisplayLabel } from '../src/utils/propertyCells';
import { calcGrossYield } from '../src/utils/sharedFinancialCalcs';
import propertyDefaults from '../src/data/property-defaults.json';
import type { PropertyInstanceDetails } from '../src/types/propertyInstance';
import type { PropertyType } from '../src/contexts/PropertySelectionContext';
import type { PropertyAssumption } from '../src/contexts/DataAssumptionsContext';
import type { NLParseResponse } from '../src/types/nlParse';
import {
  SUITE,
  type SuiteScenario,
  type Expectations,
  type FailureCause,
} from './scenario-suite';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

// ─── API key (from .env.local — never printed) ───────────────────────────────

function loadApiKey(): string {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  const envPath = join(ROOT, '.env.local');
  if (existsSync(envPath)) {
    const m = readFileSync(envPath, 'utf-8').match(/^ANTHROPIC_API_KEY=(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  console.error('ANTHROPIC_API_KEY not found in environment or .env.local');
  process.exit(1);
}

// ─── Production model config (mirror of nl-parse/index.ts) ───────────────────

const MODEL = 'claude-sonnet-4-6'; // const MODEL in supabase/functions/nl-parse/index.ts
const MAX_TOKENS = 4096;

// ─── Headless env — identical assembly to run-scenario-suite.ts ──────────────

interface Template extends PropertyInstanceDetails {
  propertyType: string;
  cellId: string;
}

const templates: Template[] = CELL_IDS.map((cellId) => ({
  ...(propertyDefaults as Record<string, PropertyInstanceDetails>)[cellId],
  propertyType: getCellDisplayLabel(cellId),
  cellId,
}));

const propertyTypes: PropertyType[] = templates.map((t) => {
  const yieldPercent = calcGrossYield(t.rentPerWeek, t.purchasePrice);
  const rates = GROWTH_RATE_TIERS[t.growthAssumption || 'Medium'] || GROWTH_RATE_TIERS.Medium;
  return {
    id: t.cellId,
    title: getCategoryLabel(t.cellId),
    priceRange: `$${t.purchasePrice.toLocaleString()}`,
    yield: `${yieldPercent.toFixed(1)}%`,
    cashFlow: `$${Math.round((t.purchasePrice * yieldPercent) / 100 / 12)}`,
    riskLevel: 'Medium' as const,
    cost: t.purchasePrice,
    depositRequired: Math.round((t.purchasePrice * (100 - t.lvr)) / 100),
    yieldPercent,
    growthPercent: rates.year1,
    state: t.state || 'NSW',
    loanType: t.loanProduct || 'IO',
    isCustom: false,
  };
});

const getPropertyData = (
  propertyType: string,
  growthAssumptionOverride?: string,
): PropertyAssumption | undefined => {
  const template = templates.find(
    (t) => t.cellId === propertyType || t.propertyType === propertyType,
  );
  if (!template) return undefined;
  const tier = (growthAssumptionOverride || template.growthAssumption || 'Medium') as string;
  const rates = GROWTH_RATE_TIERS[tier] || GROWTH_RATE_TIERS.Medium;
  return {
    type: template.propertyType,
    averageCost: template.purchasePrice.toString(),
    yield: calcGrossYield(template.rentPerWeek, template.purchasePrice).toFixed(1),
    growthYear1: rates.year1.toString(),
    growthYears2to3: rates.years2to3.toString(),
    growthYear4: rates.year4.toString(),
    growthYear5plus: rates.year5plus.toString(),
    deposit: (100 - template.lvr).toString(),
    loanType: template.loanProduct,
    ...template,
  } as PropertyAssumption;
};

const env: ScenarioEnv = { propertyTypes, getPropertyData };

// ─── nl-parse call — verbatim port of index.ts's request/response handling ───

interface ChatTurn { role: 'user' | 'assistant'; content: string }

let totalApiCalls = 0;
let totalInputTokens = 0;
let totalOutputTokens = 0;
let totalCacheWriteTokens = 0;
let totalCacheReadTokens = 0;

async function callNlParse(
  client: Anthropic,
  args: {
    message: string;
    conversationHistory: ChatTurn[];
    currentPlan: Record<string, any> | null;
    strategyPreset: string;
    strategyProfileText?: string;
  },
): Promise<{ parsed: Record<string, any>; toolName: string }> {
  const messages: ChatTurn[] = [...args.conversationHistory, { role: 'user', content: args.message }];

  const systemPrompt = buildSystemPrompt(
    (args.currentPlan as any) ?? null,
    args.strategyPreset,
    undefined, // planningDefaults — not known for the testers
    undefined, // conversationSummary
    args.strategyProfileText, // company strategy pill (VAR-STRAT-* cases)
    'chat',
  );

  // One retry on transient errors — mirrors the client's _default budget of 1.
  let response: Anthropic.Message | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: 0,
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } } as any],
        messages,
        tools: ALL_TOOLS as any,
        tool_choice: TOOL_CHOICE as any,
      });
      break;
    } catch (err) {
      if (attempt === 1) throw err;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  totalApiCalls += 1;
  totalInputTokens += response!.usage?.input_tokens ?? 0;
  totalOutputTokens += response!.usage?.output_tokens ?? 0;
  totalCacheWriteTokens += (response!.usage as any)?.cache_creation_input_tokens ?? 0;
  totalCacheReadTokens += (response!.usage as any)?.cache_read_input_tokens ?? 0;

  const toolBlock = response!.content.find((b) => b.type === 'tool_use');
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('No tool_use response from Claude');
  }

  let toolName = toolBlock.name;
  const toolInput = toolBlock.input as Record<string, any>;

  // ── Server-side guard: no plan → no update/modify (index.ts verbatim) ─────
  const cp = args.currentPlan;
  const hasPlan = !!cp && Array.isArray(cp.properties) && cp.properties.length > 0;
  if (!hasPlan && (toolName === 'update_profile' || toolName === 'modify_plan' || toolName === 'suggest_properties' || toolName === 'add_event')) {
    toolName = 'respond';
    toolInput.message = toolInput.message || 'Send a client brief with financial details (income, deposit, savings, borrowing capacity) and I\'ll build a plan.';
  }

  const responseType = toolToResponseType(toolName);
  const parsedResponse: Record<string, any> = {
    type: responseType,
    assumptions: toolInput.assumptions || [],
  };

  switch (toolName) {
    case 'create_plan': {
      const validation = validateCreatePlan(toolInput);
      const data = validation.data as any;
      parsedResponse.clientProfile = data.clientProfile;
      parsedResponse.investmentProfile = data.investmentProfile;
      parsedResponse.properties = data.properties;
      parsedResponse.strategyPreset = data.strategyPreset;
      parsedResponse.missingInputs = data.missingInputs || [];
      parsedResponse.clientProfileSources = data.clientProfileSources || {};
      parsedResponse.investmentProfileSources = data.investmentProfileSources || {};
      parsedResponse.propertySources = data.propertySources || [];
      parsedResponse.message = buildCreatePlanMessage(data);
      // index.ts verbatim: "negotiate, don't shrink" — stated-price funding
      // note goes into the chat message ahead of the goal descriptors.
      const fundingNote = computeStatedPriceFundingNote({
        properties: parsedResponse.properties ?? [],
        propertySources: parsedResponse.propertySources,
        depositPool: parsedResponse.investmentProfile?.depositPool ?? 0,
        annualSavings: parsedResponse.investmentProfile?.annualSavings ?? 0,
      });
      if (fundingNote) {
        parsedResponse.message = injectFundingNote(parsedResponse.message, fundingNote);
      }
      if (parsedResponse.properties?.length > 0) {
        const feasibility = computeFeasibility({
          properties: parsedResponse.properties,
          equityGoal: parsedResponse.investmentProfile?.equityGoal ?? 0,
          cashflowGoal: parsedResponse.investmentProfile?.cashflowGoal
            || parsedResponse.investmentProfile?.targetPassiveIncome
            || 0,
          timelineYears: parsedResponse.investmentProfile?.timelineYears ?? 20,
        });
        if (feasibility) {
          parsedResponse.message = injectFeasibilityDescriptor(parsedResponse.message, feasibility);
        }
      }
      if (validation.warnings.length > 0) {
        parsedResponse.assumptions = [
          ...(parsedResponse.assumptions || []),
          ...validation.warnings.map((w: string) => `[auto-corrected] ${w}`),
        ];
      }
      break;
    }
    case 'modify_plan': {
      const currentProperties = cp?.properties || [];
      const validation = validateModifyPlan(toolInput, currentProperties);
      const data = validation.data as any;
      parsedResponse.modification = data.modification;
      parsedResponse.modifications = data.modifications;
      parsedResponse.properties = data.properties;
      parsedResponse.message = buildModifyPlanMessage(data);
      // index.ts verbatim: re-check goal feasibility on every plan-affecting
      // turn using the engine projection sent with the request.
      if (currentProperties.length > 0) {
        const ip = (cp?.investmentProfile ?? {}) as Record<string, any>;
        const feasibility = computeFeasibility({
          properties: currentProperties,
          equityGoal: ip.equityGoal ?? 0,
          cashflowGoal: ip.cashflowGoal ?? 0,
          timelineYears: ip.timelineYears ?? 20,
          engineProjection: cp?.enginePlanState ?? null,
          suppressOnTrack: true,
        });
        if (feasibility) {
          parsedResponse.message = injectFeasibilityDescriptor(parsedResponse.message, feasibility);
        }
      }
      if (validation.warnings.length > 0) {
        parsedResponse.assumptions = [
          ...(parsedResponse.assumptions || []),
          ...validation.warnings.map((w: string) => `[auto-corrected] ${w}`),
        ];
      }
      break;
    }
    case 'update_profile': {
      const validation = validateUpdateProfile(toolInput);
      const data = validation.data as any;
      parsedResponse.profileUpdates = data.profileUpdates;
      parsedResponse.message = buildUpdateProfileMessage(data.profileUpdates);
      if (validation.warnings.length > 0) {
        parsedResponse.assumptions = [
          ...(parsedResponse.assumptions || []),
          ...validation.warnings.map((w: string) => `[auto-corrected] ${w}`),
        ];
      }
      break;
    }
    case 'add_event': {
      const validation = validateAddEvent(toolInput);
      if (!validation.valid) {
        parsedResponse.type = 'explanation';
        parsedResponse.message = validation.warnings.join(' ');
        break;
      }
      const data = validation.data as any;
      parsedResponse.event = data.event;
      parsedResponse.message = buildAddEventMessage(data.event);
      break;
    }
    case 'suggest_properties': {
      parsedResponse.propertySuggestions = toolInput.propertySuggestions;
      parsedResponse.message = toolInput.message || 'Here are some options that fit the current plan.';
      break;
    }
    case 'respond': {
      parsedResponse.message = toolInput.message || '';
      if (toolInput.explanation) parsedResponse.explanation = toolInput.explanation;
      break;
    }
    default: {
      parsedResponse.type = 'explanation';
      parsedResponse.message = toolInput.message || 'I didn\'t quite catch that. Could you rephrase?';
    }
  }

  return { parsed: parsedResponse, toolName };
}

// ─── currentPlan builder — mirror of ChatPanel.getCurrentPlan /
//     useCompareRemodel.buildCurrentPlan (headless variant) ──────────────────

function buildCurrentPlan(
  scenario: ScenarioInput,
  run: ScenarioRunResult,
  clientNames: string[],
): Record<string, any> | null {
  if (scenario.propertyOrder.length === 0) return null;
  const profile = run.profile;

  let enginePlanState: Record<string, any> | undefined;
  const growthData = run.projection.portfolioGrowthData;
  if (growthData.length > 0) {
    const baseYearNum = parseInt(growthData[0]?.year ?? `${BASE_YEAR}`, 10);
    const horizonYear = baseYearNum + (profile.timelineYears ?? 20);
    const horizonPoint =
      growthData.find((d) => parseInt(d.year, 10) >= horizonYear) ??
      growthData[growthData.length - 1];
    const equityGoalReachedPoint =
      profile.equityGoal > 0
        ? growthData.find((d) => d.equity >= profile.equityGoal)
        : undefined;
    // Mirror of ChatPanel.getCurrentPlan: net annual cashflow at the horizon
    // year, feeding the server-side cashflow-goal feasibility check.
    const cashflowSeries = run.projection.cashflowData ?? [];
    const horizonCashflowPoint =
      cashflowSeries.find((d) => parseInt(d.year, 10) >= horizonYear) ??
      cashflowSeries[cashflowSeries.length - 1];
    enginePlanState = {
      horizonYear,
      projectedPortfolioValue: Math.round(horizonPoint?.portfolioValue ?? 0),
      projectedEquity: Math.round(horizonPoint?.equity ?? 0),
      projectedAnnualCashflow: horizonCashflowPoint
        ? Math.round(horizonCashflowPoint.cashflow ?? 0)
        : undefined,
      equityGoalReachedYear: equityGoalReachedPoint
        ? parseInt(equityGoalReachedPoint.year, 10)
        : null,
    };
  }

  return {
    investmentProfile: {
      depositPool: profile.depositPool,
      annualSavings: profile.annualSavings,
      baseSalary: profile.baseSalary,
      timelineYears: profile.timelineYears,
      equityGoal: profile.equityGoal,
      cashflowGoal: profile.cashflowGoal,
    },
    properties: scenario.propertyOrder.map((instanceId, i) => {
      const inst = run.instances[instanceId];
      const engineProp = run.timelineProperties.find((tp) => tp.instanceId === instanceId);
      return {
        instanceId,
        type: instanceId.replace(/_instance_\d+$/, ''),
        purchasePrice: inst?.purchasePrice ?? 0,
        state: inst?.state ?? 'VIC',
        period: inst?.manualPlacementPeriod ?? i + 1,
        growthAssumption: (inst?.growthAssumption ?? 'High') as 'High' | 'Medium' | 'Low',
        loanProduct: (inst?.loanProduct ?? 'IO') as 'IO' | 'PI',
        lvr: inst?.lvr ?? 88,
        entity: inst?.entity,
        engineStatus: engineProp?.status as 'feasible' | 'challenging' | undefined,
        borrowingCapacityRemaining: engineProp?.borrowingCapacityRemaining,
      };
    }),
    clientNames,
    enginePlanState,
  };
}

// ─── Session simulation — apply responses the way the app does ───────────────

interface TurnLogEntry {
  user: string;
  toolName: string;
  effectiveType: string;
  message: string;
  applied: boolean;
  warnings: string[];
  autoFixChanges?: string[];
}

interface SessionResult {
  scenario: ScenarioInput;
  turnLog: TurnLogEntry[];
  clientNames: string[];
}

const emptyScenario = (): ScenarioInput => ({
  propertySelections: {},
  propertyOrder: [],
  investmentProfile: {},
  propertyInstances: {},
  existingProperties: [],
  eventBlocks: [],
});

function fixtureUserTurns(file: string): string[] {
  const raw = JSON.parse(readFileSync(join(HERE, 'fixtures', file), 'utf-8'));
  const ch: Array<{ role: string; type: string; content: string }> =
    raw.scenario_data?.chatHistory ?? [];
  return ch
    .filter((m) => m.role === 'user' && (m.type === 'text' || m.type === undefined))
    .map((m) => m.content);
}

async function runSession(client: Anthropic, s: SuiteScenario): Promise<SessionResult> {
  const userTurns = s.source === 'fixture' ? fixtureUserTurns(s.fixtureFile!) : [s.brief];
  let scenario = emptyScenario();
  let clientNames: string[] = [];
  const conversationHistory: ChatTurn[] = [];
  const turnLog: TurnLogEntry[] = [];
  const HISTORY_WINDOW = 20; // same sliding window as useChatConversation

  for (const userText of userTurns) {
    const hasPlan = scenario.propertyOrder.length > 0;
    const profileNow: InvestmentProfileData = {
      ...INITIAL_INVESTMENT_PROFILE,
      ...(scenario.investmentProfile ?? {}),
    };
    const preset = profileNow.strategyPreset || 'eg-low';

    let currentPlan: Record<string, any> | null = null;
    if (hasPlan) {
      try {
        currentPlan = buildCurrentPlan(scenario, runScenario(scenario, env), clientNames);
      } catch {
        currentPlan = null;
      }
    }

    const { parsed, toolName } = await callNlParse(client, {
      message: userText,
      conversationHistory: conversationHistory.slice(-HISTORY_WINDOW),
      strategyProfileText: s.strategyProfileText,
      currentPlan,
      strategyPreset: preset,
    });
    let response = parsed as NLParseResponse;

    // Client-side guard (useChatConversation): initial_plan while a plan
    // exists is allowed only as a strategy switch; otherwise downgrade.
    let effectiveType: string = response.type;
    if (hasPlan && response.type === 'initial_plan') {
      const isStrategySwitch = !!response.strategyPreset && response.strategyPreset !== preset;
      if (!isStrategySwitch) effectiveType = 'explanation';
    }

    const entry: TurnLogEntry = {
      user: userText,
      toolName,
      effectiveType,
      message: response.message ?? '',
      applied: false,
      warnings: [],
    };

    switch (effectiveType) {
      case 'initial_plan': {
        // ChatPanel.handlePlanGenerated: refinance on, pre-check + auto-fix.
        response = forceRefinanceOn(response);
        let finalResponse = response;
        try {
          const preCheck = runPlanPreCheck(response, profileNow, scenario.existingProperties ?? []);
          if (!preCheck.allFeasible) {
            const fix = autoFixPlan(response, preCheck, profileNow, scenario.existingProperties ?? []);
            if (fix.fixed) {
              finalResponse = fix.fixedResponse;
              entry.autoFixChanges = fix.changes.map((c) => c.detail);
              // ChatPanel.handlePlanGenerated parity: the chat message must
              // describe the POST-auto-fix plan and disclose every change.
              entry.message = rewritePlanMessageAfterAutoFix(
                response.message ?? '',
                finalResponse,
                fix.changes,
              );
            }
          }
        } catch (err) {
          entry.warnings.push(`pre-check threw: ${err instanceof Error ? err.message : err}`);
        }

        // ChatPanel.confirmPlan (auto-approved headlessly).
        const profileUpdates = mapToInvestmentProfile(finalResponse);
        // InvestmentProfileContext.updateProfile parity: non-explicit
        // timelines clamp to exactly 20; explicit ones are honoured AS STATED
        // (no 20-year floor — founder ruling 17 Jul 2026). Without this the
        // suite can't catch the timelineYearsExplicit mapping bug (a stated
        // "30-year plan" silently becoming 20 in the app).
        if (profileUpdates.timelineYears !== undefined) {
          const explicit = profileUpdates.timelineYearsExplicit
            ?? scenario.investmentProfile?.timelineYearsExplicit;
          profileUpdates.timelineYears = explicit
            ? Math.max(Math.round(profileUpdates.timelineYears), 1)
            : 20;
        }
        let nextProfile = { ...(scenario.investmentProfile ?? {}), ...profileUpdates };

        const lvrOverride =
          profileNow.lvrStrategy === 'prudent_80' ? 80
          : profileNow.lvrStrategy === 'custom' ? (profileNow.lvrStrategyCustomPercent ?? 80)
          : undefined;
        const mergedForCosts = { ...INITIAL_INVESTMENT_PROFILE, ...nextProfile };
        const { selections, propertyOrder, instances } =
          mapToPropertySelections(finalResponse, lvrOverride, mergedForCosts);

        scenario = { ...scenario, investmentProfile: nextProfile };
        if (propertyOrder.length > 0) {
          scenario = {
            ...scenario,
            propertySelections: selections,
            propertyOrder,
            propertyInstances: instances,
          };
        }

        const existingProps = mapToExistingProperties(finalResponse);
        if (existingProps) {
          const totalDebt = existingProps.reduce((s2, p) => s2 + (p.loan || 0), 0);
          const totalValue = existingProps.reduce((s2, p) => s2 + (p.currentValue || 0), 0);
          const existingAnnualRent = existingProps.reduce((s2, p) => s2 + (p.rentPerWeek || 0) * 52, 0);
          scenario = {
            ...scenario,
            existingProperties: existingProps,
            investmentProfile: {
              ...scenario.investmentProfile,
              currentDebt: totalDebt,
              portfolioValue: totalValue,
              existingAnnualRent,
            },
          };
        }

        if (finalResponse.clientProfile?.members) {
          clientNames = finalResponse.clientProfile.members.map((m: any) => m.name);
        }
        entry.applied = propertyOrder.length > 0;
        break;
      }

      case 'modification': {
        // Compare/dashboard-parity pure mutator (re-hosts ChatPanel.handleModification).
        const timelineBefore = scenario.investmentProfile?.timelineYears;
        const mutation = applyNlResponseToScenario(scenario, response);
        entry.warnings.push(...mutation.warnings);
        entry.applied = mutation.didChange;
        if (mutation.didChange) {
          scenario = mutation.scenario;
          // ChatPanel routes profile updates through updateProfile, which
          // clamps timelines (explicit → honoured as stated, else exactly 20;
          // founder ruling 17 Jul 2026 removed the explicit floor). The pure
          // mutator merges raw, so replicate the clamp here — otherwise the
          // suite passes timeline behaviour the app can't produce (re-sweep C1).
          const t = scenario.investmentProfile?.timelineYears;
          if (t !== undefined && t !== timelineBefore) {
            const explicit = scenario.investmentProfile?.timelineYearsExplicit;
            scenario = {
              ...scenario,
              investmentProfile: {
                ...scenario.investmentProfile,
                timelineYears: explicit ? Math.max(Math.round(t), 1) : 20,
              },
            };
          }
        }
        break;
      }

      case 'update_profile': {
        // ChatPanel.handleUpdateProfile.
        response = forceRefinanceOn(response);
        const updates = mapUpdateProfileToUpdates(response);
        // updateProfile clamp parity (re-sweep C1) — same as the create_plan
        // path: explicit honoured as stated, non-explicit pinned to 20.
        if (updates.timelineYears !== undefined) {
          const explicit = updates.timelineYearsExplicit
            ?? scenario.investmentProfile?.timelineYearsExplicit;
          updates.timelineYears = explicit ? Math.max(Math.round(updates.timelineYears), 1) : 20;
        }
        if (Object.keys(updates).length > 0) {
          scenario = {
            ...scenario,
            investmentProfile: { ...scenario.investmentProfile, ...updates },
          };
          entry.applied = true;
        }
        const existingProps = mapToExistingProperties(response);
        if (existingProps) {
          const totalDebt = existingProps.reduce((s2, p) => s2 + (p.loan || 0), 0);
          const totalValue = existingProps.reduce((s2, p) => s2 + (p.currentValue || 0), 0);
          const existingAnnualRent = existingProps.reduce((s2, p) => s2 + (p.rentPerWeek || 0) * 52, 0);
          scenario = {
            ...scenario,
            existingProperties: existingProps,
            investmentProfile: {
              ...scenario.investmentProfile,
              currentDebt: totalDebt,
              portfolioValue: totalValue,
              existingAnnualRent,
            },
          };
          entry.applied = true;
        }
        break;
      }

      case 'add_event': {
        // ChatPanel.handleAddEvent.
        const ev = (response as any).event;
        if (ev?.eventType && ev?.targetYear) {
          const period = Math.max(1, Math.round((ev.targetYear - BASE_YEAR) * 2) + 1);
          const categoryMap: Record<string, string> = { refinance: 'portfolio', salary_change: 'income' };
          scenario = {
            ...scenario,
            eventBlocks: [
              ...(scenario.eventBlocks ?? []),
              {
                type: 'event',
                eventType: ev.eventType,
                category: categoryMap[ev.eventType] || 'portfolio',
                period,
                order: 0,
                payload: ev.parameters ?? {},
              } as any,
            ],
          };
          entry.applied = true;
        }
        break;
      }

      default:
        // explanation / property_suggestions / conversation — no state change.
        break;
    }

    conversationHistory.push({ role: 'user', content: userText });
    // entry.message is the message the app's chat would show (post-auto-fix
    // rewrite for initial_plan) - thread THAT, like the app threads its local
    // messages, not the pre-fix server-templated text.
    conversationHistory.push({ role: 'assistant', content: entry.message });
    turnLog.push(entry);
  }

  return { scenario, turnLog, clientNames };
}

// ─── Grading — same checks as run-scenario-suite.ts (engine-only) ────────────
// Differences (live mode):
//  - schemaChecks resolve against the PRODUCTION create_plan tool schema
//    (tools.ts CREATE_PLAN_TOOL), which is what today's pipeline actually uses.
//  - manualFindings: 'blue-chip-selection' is re-evaluated LIVE (avg planned
//    price >= $750k) instead of carrying the June saved-state verdict.

interface CheckResult {
  name: string;
  pass: boolean;
  detail: string;
  cause: FailureCause;
}

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('en-AU');
const cellOf = (instanceId: string) => instanceId.replace(/_instance_\d+$/, '');
const isCommercialCell = (cellId: string) => cellId.startsWith('commercial');
const isGrowthCell = (cellId: string) => cellId.endsWith('-growth');
const isCashflowCell = (cellId: string) => cellId.endsWith('-cashflow') && !cellId.startsWith('commercial');

function resolveSchemaPath(path: string): unknown {
  let cur: any = (CREATE_PLAN_TOOL as any).input_schema.properties;
  for (const part of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[part];
  }
  return cur;
}

function grade(
  s: SuiteScenario,
  input: ScenarioInput,
  result: ScenarioRunResult | null,
  runError: string | null,
  turnLog: TurnLogEntry[] = [],
): CheckResult[] {
  const e: Expectations = s.expectations;
  const checks: CheckResult[] = [];
  const push = (name: string, pass: boolean, detail: string, cause: FailureCause) =>
    checks.push({ name, pass, detail, cause });

  const order = input.propertyOrder ?? [];
  const instances = input.propertyInstances ?? {};
  const planned = order.map((id) => ({ id, cell: cellOf(id), inst: instances[id] }));
  // Merge app defaults under the AI-extracted partial — the dashboard's
  // InvestmentProfileContext always starts from INITIAL_INVESTMENT_PROFILE,
  // so the profile the BA (and engine) actually sees includes defaults like
  // useExistingEquity: true and timelineYears: 20. The engine-only suite's
  // fixtures carried full persisted profiles, so this keeps grading parity.
  const profile = {
    ...INITIAL_INVESTMENT_PROFILE,
    ...(input.investmentProfile ?? {}),
  } as Record<string, unknown>;

  if (runError) {
    push('engine-run', false, `engine threw: ${runError}`, 'engine-placement');
  }

  const placedYears = new Map<string, number>();
  let unplaced: string[] = [];
  if (result) {
    for (const tp of result.timelineProperties) {
      if (tp.period !== Infinity && Number.isFinite(tp.affordableYear)) {
        placedYears.set(tp.instanceId, Math.floor(tp.affordableYear));
      }
    }
    unplaced = result.timelineProperties
      .filter((tp) => tp.period === Infinity || tp.status !== 'feasible')
      .map((tp) => `${tp.instanceId}(${tp.status})`);
  }

  if (e.propertyCount) {
    const [lo, hi] = e.propertyCount;
    const n = planned.length;
    push(
      'property-count',
      n >= lo && n <= hi,
      `expected ${lo === hi ? lo : `${lo}-${hi}`} planned properties, live AI plan has ${n}`,
      s.source === 'fixture' ? 'persistence' : 'plan-selection',
    );
  }

  if (e.existingCount !== undefined) {
    const n = (input.existingProperties ?? []).length;
    push(
      'existing-count',
      n === e.existingCount,
      `expected ${e.existingCount} existing properties per brief, live state has ${n}` +
        (n !== e.existingCount && profile.portfolioValue
          ? ` (portfolioValue ${fmt(profile.portfolioValue as number)})`
          : ''),
      'extraction',
    );
  }

  if (e.priceBand) {
    const [lo, hi] = e.priceBand;
    const out = planned.filter(
      (p) => p.inst && (p.inst.purchasePrice < lo || p.inst.purchasePrice > hi),
    );
    push(
      'price-band',
      out.length === 0,
      out.length === 0
        ? `all ${planned.length} prices within ${fmt(lo)}-${fmt(hi)}`
        : `outside ${fmt(lo)}-${fmt(hi)}: ${out.map((p) => `${p.cell} ${fmt(p.inst.purchasePrice)}`).join(', ')}`,
      'plan-selection',
    );
  }

  if (e.avgPriceMin && planned.length > 0) {
    const avg = planned.reduce((s2, p) => s2 + (p.inst?.purchasePrice ?? 0), 0) / planned.length;
    push(
      'avg-price',
      avg >= e.avgPriceMin,
      `average price ${fmt(avg)} vs blue-chip floor ${fmt(e.avgPriceMin)}`,
      'plan-selection',
    );
  }

  if (e.yieldBand) {
    const [lo, hi] = e.yieldBand;
    const out = planned
      .filter((p) => p.inst)
      .map((p) => ({ ...p, y: (p.inst.rentPerWeek * 52 * 100) / p.inst.purchasePrice }))
      .filter((p) => p.y < lo || p.y > hi);
    push(
      'yield-band',
      out.length === 0,
      out.length === 0
        ? `all yields within ${lo}-${hi}%`
        : `outliers: ${out.map((p) => `${p.cell} ${fmt(p.inst.purchasePrice)} @ ${p.y.toFixed(1)}%`).join(', ')}`,
      'plan-selection',
    );
  }

  for (const pp of e.perProperty ?? []) {
    const p = planned[pp.index];
    if (!p || !p.inst) {
      push(`property[${pp.index}]`, false, `no planned property at index ${pp.index}`, 'persistence');
      continue;
    }
    if (pp.price) {
      const ok = p.inst.purchasePrice >= pp.price[0] && p.inst.purchasePrice <= pp.price[1];
      push(
        `property[${pp.index}]-price`,
        ok,
        `${p.cell} ${fmt(p.inst.purchasePrice)} vs stated ${fmt(pp.price[0])}-${fmt(pp.price[1])}`,
        'plan-selection',
      );
    }
    if (pp.yieldPct) {
      const y = (p.inst.rentPerWeek * 52 * 100) / p.inst.purchasePrice;
      const ok = y >= pp.yieldPct[0] && y <= pp.yieldPct[1];
      push(
        `property[${pp.index}]-yield`,
        ok,
        `${p.cell} yield ${y.toFixed(1)}% vs stated ${pp.yieldPct[0]}-${pp.yieldPct[1]}%`,
        'plan-selection',
      );
    }
    if (pp.entity) {
      const ent = p.inst.entity ?? 'individual';
      push(
        `property[${pp.index}]-entity`,
        ent === pp.entity,
        `${p.cell} entity "${ent}" vs stated "${pp.entity}"`,
        'extraction',
      );
    }
    if (pp.placedBy && result) {
      const y = placedYears.get(p.id);
      const ok = y !== undefined && y <= pp.placedBy;
      push(
        `property[${pp.index}]-placed-by`,
        ok,
        y === undefined
          ? `${p.cell} never places (deposit/serviceability gate)`
          : `${p.cell} places ${y} vs expected by ${pp.placedBy}`,
        'engine-placement',
      );
    }
    for (const f of pp.instanceFields ?? []) {
      const actual = (p.inst as Record<string, unknown>)[f.field as string];
      const ok = Array.isArray(f.expected)
        ? typeof actual === 'number' && actual >= f.expected[0] && actual <= f.expected[1]
        : actual === f.expected;
      const expectedStr = Array.isArray(f.expected)
        ? `${f.expected[0]}-${f.expected[1]}`
        : JSON.stringify(f.expected);
      push(
        `property[${pp.index}]-${String(f.field)}`,
        ok,
        `${p.cell} mapped instance.${String(f.field)} = ${JSON.stringify(actual)} vs stated ${expectedStr}`,
        'extraction',
      );
    }
  }

  if (e.minTrustCount !== undefined) {
    const n = planned.filter((p) => p.inst?.entity === 'trust').length;
    push(
      'trust-usage',
      n >= e.minTrustCount,
      `capacity is tight — expected ≥${e.minTrustCount} trust-held propert${e.minTrustCount === 1 ? 'y' : 'ies'}, plan has ${n}`,
      'plan-selection',
    );
  }

  if (e.lastPropertyCommercial) {
    const last = planned[planned.length - 1];
    const ok = !!last && isCommercialCell(last.cell);
    push(
      'commercial-finisher',
      ok,
      last
        ? `last property is ${last.cell}${ok ? ' — labelled commercial' : ' — NOT labelled commercial'}`
        : 'plan has no properties',
      'plan-selection',
    );
  }

  if (e.containsCommercial) {
    const ok = planned.some((p) => isCommercialCell(p.cell));
    push(
      'commercial-labelled',
      ok,
      ok ? 'plan contains an explicitly-labelled commercial cell' : 'no commercial-labelled property in plan',
      'plan-selection',
    );
  }

  if (e.transitionExpected && result) {
    const growthYears = planned
      .filter((p) => isGrowthCell(p.cell))
      .map((p) => placedYears.get(p.id))
      .filter((y): y is number => y !== undefined);
    const lateYears = planned
      .filter((p) => isCashflowCell(p.cell) || isCommercialCell(p.cell))
      .map((p) => placedYears.get(p.id))
      .filter((y): y is number => y !== undefined);
    const hasBoth = growthYears.length > 0 && lateYears.length > 0;
    const ok = hasBoth && Math.max(...growthYears) <= Math.min(...lateYears);
    push(
      'transition-visible',
      ok,
      hasBoth
        ? `growth phase places ${Math.min(...growthYears)}-${Math.max(...growthYears)}, yield phase ${Math.min(...lateYears)}-${Math.max(...lateYears)}${ok ? ' — visible transition' : ' — phases overlap/reversed'}`
        : `plan does not contain both phases placed (growth placed: ${growthYears.length}, yield placed: ${lateYears.length})`,
      'engine-placement',
    );
  }

  if (e.timelineYears !== undefined) {
    const ok = profile.timelineYears === e.timelineYears;
    push(
      'timeline-persisted',
      ok,
      `user stated ${e.timelineYears}-year timeframe; profile.timelineYears = ${profile.timelineYears}`,
      'extraction',
    );
  }

  for (const pf of e.profileFields ?? []) {
    const actual = profile[pf.field as string];
    push(
      `profile-${String(pf.field)}`,
      actual === pf.expected,
      `profile.${String(pf.field)} = ${JSON.stringify(actual)} vs stated ${JSON.stringify(pf.expected)}`,
      'extraction',
    );
  }

  if (e.allPlaced && result) {
    push(
      'all-placed',
      unplaced.length === 0,
      unplaced.length === 0
        ? `all ${result.timelineProperties.length} properties place (feasible)`
        : `unplaced/infeasible: ${unplaced.join(', ')}`,
      'engine-placement',
    );
  }

  if (e.pacing?.minAvgGapYears && result) {
    const years = [...placedYears.values()].sort((a, b) => a - b);
    if (years.length >= 2) {
      const gaps = years.slice(1).map((y, i) => y - years[i]);
      const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      const ok = avg >= e.pacing.minAvgGapYears;
      push(
        'pacing',
        ok,
        `purchases in ${years.join(', ')} — avg gap ${avg.toFixed(2)}y vs conservative-correct ≥${e.pacing.minAvgGapYears}y`,
        'engine-placement',
      );
    }
  }

  if (e.monthlyCashflowFloorY1 !== undefined && result) {
    const y1 = result.projection.cashflowData[0];
    const monthly = y1 ? y1.cashflow / 12 : NaN;
    const ok = Number.isFinite(monthly) && monthly >= e.monthlyCashflowFloorY1;
    push(
      'p1-monthly-floor',
      ok,
      `year-1 net cashflow ${fmt(monthly)}/mo vs client cap ${fmt(e.monthlyCashflowFloorY1)}/mo`,
      'engine-goal',
    );
  }

  if (e.cashflowGoal && result) {
    const hit = result.projection.cashflowData.find((d) => d.cashflow >= e.cashflowGoal!.amount);
    const reached = !!hit && parseInt(hit.year, 10) <= e.cashflowGoal.byYear;
    if (reached) {
      push(
        'cashflow-goal',
        true,
        `${fmt(e.cashflowGoal.amount)}/yr net cashflow reached ${hit!.year} vs stated by ${e.cashflowGoal.byYear}`,
        'engine-goal',
      );
    } else {
      // Julian's criterion: hit the stated goal OR clearly show the shortfall.
      // A missed goal passes only when the chat acknowledged the shortfall
      // (the nl-parse feasibility descriptor: "income goal ... short/gap").
      const acknowledged = turnLog.some(
        (t) =>
          /income goal/i.test(t.message) &&
          /(short|gap|isn't reached|isn't realistic|tight)/i.test(t.message),
      );
      const missDetail = hit
        ? `${fmt(e.cashflowGoal.amount)}/yr net cashflow reached ${hit.year} vs stated by ${e.cashflowGoal.byYear}`
        : `${fmt(e.cashflowGoal.amount)}/yr never reached within the modelled horizon (max ${fmt(Math.max(...result.projection.cashflowData.map((d) => d.cashflow), 0))}/yr)`;
      push(
        'cashflow-goal',
        acknowledged,
        `${missDetail} — ${acknowledged ? 'shortfall acknowledged in chat' : 'SILENT shortfall: no acknowledgement in chat'}`,
        'engine-goal',
      );
    }
  }

  if (e.equityGoal && result) {
    const hit = result.projection.portfolioGrowthData.find((d) => d.equity >= e.equityGoal!.amount);
    const ok = !!hit && parseInt(hit.year, 10) <= e.equityGoal.byYear;
    push(
      'equity-goal',
      ok,
      hit
        ? `${fmt(e.equityGoal.amount)} equity reached ${hit.year} vs stated by ${e.equityGoal.byYear}`
        : `${fmt(e.equityGoal.amount)} equity never reached within the modelled horizon — shortfall`,
      'engine-goal',
    );
  }

  for (const sc of e.schemaChecks ?? []) {
    const exists = resolveSchemaPath(sc.path) !== undefined;
    push(
      `schema:${sc.path}`,
      exists === sc.shouldExist,
      `${sc.description} [live create_plan tool schema field ${exists ? 'EXISTS' : 'MISSING'}]`,
      'schema-gap',
    );
  }

  // Manual findings: re-evaluate live where possible instead of carrying the
  // June saved-state verdict.
  for (const mf of e.manualFindings ?? []) {
    if (mf.name === 'blue-chip-selection') {
      const avg = planned.length > 0
        ? planned.reduce((s2, p) => s2 + (p.inst?.purchasePrice ?? 0), 0) / planned.length
        : 0;
      const ok = planned.length > 0 && avg >= 750000;
      push(
        'blue-chip-selection',
        ok,
        `Ella criterion (re-evaluated live): $250k-income / $300k-deposit client should get fewer, higher-value blue-chip properties (~$750k+). Live plan: ${planned.length} properties, avg ${fmt(avg)} (${planned.map((p) => fmt(p.inst?.purchasePrice ?? 0)).join(', ')})`,
        'plan-selection',
      );
    } else {
      push(mf.name, mf.pass, `${mf.detail} [carried from saved-state evidence — not re-evaluated live]`, mf.cause);
    }
  }

  return checks;
}

// ─── Run ─────────────────────────────────────────────────────────────────────

type Verdict = 'PASS' | 'FAIL' | 'EXPECTED-FAIL';

interface ScenarioResultOut {
  id: string;
  source: string;
  archetype: string;
  brief: string;
  verdict: Verdict;
  checks: CheckResult[];
  failReasons: string[];
  placement: { instanceId: string; year: number | null; status: string; cost: number; entity: string }[];
  goalYears: { equityGoalYear: number | null; incomeGoalYear: number | null };
  turnLog: TurnLogEntry[];
  notes?: string[];
}

async function main() {
  const apiKey = loadApiKey();
  const client = new Anthropic({ apiKey });

  const args = process.argv.slice(2);
  const onlyIdx = args.indexOf('--only');
  const only = onlyIdx !== -1 ? args[onlyIdx + 1]?.split(',') : null;

  const scenarios = SUITE.filter((s) => !only || only.includes(s.id));
  if (scenarios.length === 0) {
    console.error('No scenarios matched --only filter.');
    process.exit(1);
  }

  // Prior engine-only verdicts for the side-by-side table.
  let engineOnly: Record<string, string> = {};
  const engineOnlyPath = join(HERE, 'scenario-suite-results.json');
  if (existsSync(engineOnlyPath)) {
    const prev = JSON.parse(readFileSync(engineOnlyPath, 'utf-8'));
    for (const r of prev.results ?? []) engineOnly[r.id] = r.verdict;
  }

  console.log('Scenario Accuracy Suite — LIVE AI mode');
  console.log(`model=${MODEL}  BASE_YEAR=${BASE_YEAR}  PERIODS_PER_YEAR=${PERIODS_PER_YEAR}  scenarios=${scenarios.length}\n`);

  const results: ScenarioResultOut[] = [];
  const CONCURRENCY = 3;
  let cursor = 0;

  async function worker() {
    while (cursor < scenarios.length) {
      const s = scenarios[cursor++];
      let session: SessionResult | null = null;
      let sessionError: string | null = null;
      try {
        session = await runSession(client, s);
      } catch (err) {
        sessionError = err instanceof Error ? err.message : String(err);
      }

      const input = session?.scenario ?? emptyScenario();
      let result: ScenarioRunResult | null = null;
      let runError: string | null = sessionError ? `AI session failed: ${sessionError}` : null;
      if (!sessionError) {
        try {
          result = runScenario(input, env);
        } catch (err) {
          runError = err instanceof Error ? err.message : String(err);
        }
      }

      const checks = grade(s, input, result, runError, session?.turnLog ?? []);
      const fails = checks.filter((c) => !c.pass);
      const expectedSet = new Set(s.expectations.expectedFailChecks ?? []);
      const verdict: Verdict =
        fails.length === 0
          ? 'PASS'
          : fails.every((c) => expectedSet.has(c.name))
            ? 'EXPECTED-FAIL'
            : 'FAIL';

      const placement = (result?.timelineProperties ?? []).map((tp) => ({
        instanceId: tp.instanceId,
        year: tp.period === Infinity ? null : Math.floor(tp.affordableYear),
        status: tp.status,
        cost: tp.cost,
        entity: (input.propertyInstances?.[tp.instanceId]?.entity as string) ?? 'individual',
      }));

      results.push({
        id: s.id,
        source: s.source,
        archetype: s.archetype,
        brief: s.brief,
        verdict,
        checks,
        failReasons: fails.map((c) => `[${c.cause}] ${c.name}: ${c.detail}`),
        placement,
        goalYears: {
          equityGoalYear: result?.equityGoalYear ?? null,
          incomeGoalYear: result?.incomeGoalYear ?? null,
        },
        turnLog: session?.turnLog ?? [],
        notes: s.notes,
      });

      const icon = verdict === 'PASS' ? '✅' : verdict === 'EXPECTED-FAIL' ? '🟡' : '❌';
      const prior = engineOnly[s.id] ? ` (engine-only was ${engineOnly[s.id]})` : '';
      console.log(`${icon} ${s.id} — ${verdict}${prior}`);
      for (const t of session?.turnLog ?? []) {
        console.log(`     ↳ tool=${t.toolName} type=${t.effectiveType} applied=${t.applied}${t.autoFixChanges?.length ? ` autofix=[${t.autoFixChanges.join('; ')}]` : ''}${t.warnings.length ? ` warnings=[${t.warnings.join('; ')}]` : ''}`);
      }
      for (const c of checks) {
        console.log(`     ${c.pass ? '✓' : '✗'} ${c.name}: ${c.detail}`);
      }
      console.log('');
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, scenarios.length) }, () => worker()));

  // Preserve suite order.
  results.sort((a, b) => SUITE.findIndex((s) => s.id === a.id) - SUITE.findIndex((s) => s.id === b.id));

  const pass = results.filter((r) => r.verdict === 'PASS').length;
  const fail = results.filter((r) => r.verdict === 'FAIL').length;
  const expected = results.filter((r) => r.verdict === 'EXPECTED-FAIL').length;

  console.log('═'.repeat(90));
  console.log(`TOTAL: ${results.length}   PASS: ${pass}   FAIL: ${fail}   EXPECTED-FAIL: ${expected}`);
  console.log(`API calls: ${totalApiCalls}   input tokens: ${totalInputTokens} (+${totalCacheWriteTokens} cache-write, ${totalCacheReadTokens} cache-read)   output tokens: ${totalOutputTokens}`);
  console.log('═'.repeat(90));

  console.log('\n\n── Engine-only vs live-AI comparison ──\n');
  console.log('| # | Scenario | Engine-only | Live AI | Live failing checks |');
  console.log('|---|----------|-------------|---------|---------------------|');
  results.forEach((r, i) => {
    const failsTxt =
      r.failReasons.length === 0
        ? '—'
        : r.checks
            .filter((c) => !c.pass)
            .map((c) => `${c.name} (${c.cause})`)
            .join('; ');
    console.log(`| ${i + 1} | ${r.id} | ${engineOnly[r.id] ?? '?'} | ${r.verdict} | ${failsTxt} |`);
  });

  // With --only, merge the re-run scenarios into the existing results file
  // instead of clobbering the full-suite run.
  const outPath = join(HERE, 'scenario-suite-ai-results.json');
  let mergedResults = results;
  if (only && existsSync(outPath)) {
    const prev = JSON.parse(readFileSync(outPath, 'utf-8'));
    const byId = new Map<string, ScenarioResultOut>((prev.results ?? []).map((r: ScenarioResultOut) => [r.id, r]));
    for (const r of results) byId.set(r.id, r);
    mergedResults = SUITE.map((s) => byId.get(s.id)).filter(Boolean) as ScenarioResultOut[];
  }
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        mode: 'live-ai',
        model: MODEL,
        timestamp: new Date().toISOString(),
        apiCalls: totalApiCalls,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        cacheWriteTokens: totalCacheWriteTokens,
        cacheReadTokens: totalCacheReadTokens,
        pass: mergedResults.filter((r) => r.verdict === 'PASS').length,
        fail: mergedResults.filter((r) => r.verdict === 'FAIL').length,
        expectedFail: mergedResults.filter((r) => r.verdict === 'EXPECTED-FAIL').length,
        results: mergedResults,
      },
      null,
      2,
    ),
  );
  console.log(`\nFull results written to ${outPath}${only ? ' (merged into prior run)' : ''}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
