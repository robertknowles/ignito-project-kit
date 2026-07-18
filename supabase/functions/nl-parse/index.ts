import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.39.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * NL-Parse Edge Function — Tier 2 Architecture
 *
 * Single API call. The AI picks from 6 tools (no classifier step).
 * Code generates messages for action types (templates).
 * Validation layer catches bad data before it hits the frontend.
 *
 * Old architecture (Tier 1):
 *   Classifier call → intent → per-intent prompt → response
 *   (2 API calls, 8 intents, 2000+ lines of prompts)
 *
 * New architecture (Tier 2):
 *   Single prompt → AI picks tool → validate → template message → response
 *   (1 API call, 6 tools, ~250 lines of prompt)
 */

import { buildSystemPrompt } from "./prompt.ts";
import { ALL_TOOLS, WEB_SEARCH_TOOL, TOOL_CHOICE, toolToResponseType } from "./tools.ts";
import { buildCreatePlanMessage, buildModifyPlanMessage, buildUpdateProfileMessage, buildAddEventMessage } from "./templates.ts";
import { validateCreatePlan, validateModifyPlan, validateUpdateProfile, validateAddEvent } from "./validation.ts";
import { computeFeasibility, injectFeasibilityDescriptor, computeStatedPriceFundingNote, injectFundingNote } from "./feasibility.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 4096;

/**
 * Log token usage to the ai_usage table.
 * Upserts by (user_id, month) so we accumulate within each billing month.
 */
async function logTokenUsage(
  userId: string,
  inputTokens: number,
  outputTokens: number
): Promise<void> {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const totalTokens = inputTokens + outputTokens;

    await supabaseAdmin.rpc('upsert_ai_usage', {
      p_user_id: userId,
      p_month: month,
      p_input_tokens: inputTokens,
      p_output_tokens: outputTokens,
      p_total_tokens: totalTokens,
    });
  } catch (err) {
    console.error('Failed to log token usage:', err);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const client = new Anthropic({ apiKey });

    const { message, conversationHistory, conversationSummary, currentPlan, userId, strategyPreset, planningDefaults, strategyProfileText, requestContext } = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build conversation messages. Content is a string for normal turns, but
    // pause_turn continuations append the assistant's content BLOCKS verbatim
    // (required so the server can resume an in-flight web search).
    const messages: Array<{ role: 'user' | 'assistant'; content: string | unknown[] }> = [];
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }
    messages.push({ role: 'user', content: message });

    // ── Single API call — AI picks the tool ────────────────────────
    const systemPrompt = buildSystemPrompt(
      currentPlan ?? null,
      strategyPreset,
      planningDefaults,
      conversationSummary,
      strategyProfileText,
      requestContext === 'remodel' ? 'remodel' : 'chat',
    );

    // Web search is a research-only affordance for conversational turns.
    // Remodel turns are plan-editing — no search tool there, so searched
    // content can never even reach a remodel response.
    const tools = requestContext === 'remodel'
      ? (ALL_TOOLS as any)
      : ([...ALL_TOOLS, WEB_SEARCH_TOOL] as any);

    console.info(`nl-parse: calling Anthropic (${messages.length} messages, prompt ${systemPrompt.length} chars, ${tools.length} tools)`);

    const requestParams = {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: 0,
      system: [
        {
          type: 'text' as const,
          text: systemPrompt,
          cache_control: { type: 'ephemeral' as const },
        },
      ],
      tools,
      tool_choice: TOOL_CHOICE as any,
    };

    let response;
    let inputTokens = 0;
    let outputTokens = 0;
    let webSearchCount = 0;
    try {
      response = await client.messages.create({ ...requestParams, messages: messages as any });
      inputTokens += response.usage?.input_tokens ?? 0;
      outputTokens += response.usage?.output_tokens ?? 0;
      webSearchCount += (response.usage as any)?.server_tool_use?.web_search_requests ?? 0;

      // Long search turns can pause server-side (stop_reason "pause_turn").
      // Continue by re-sending with the assistant content appended, capped so
      // a wedged turn can't loop forever.
      let continuations = 0;
      while (response.stop_reason === ('pause_turn' as any) && continuations < 3) {
        continuations++;
        console.info(`nl-parse: pause_turn — continuing (${continuations}/3)`);
        messages.push({ role: 'assistant', content: response.content as unknown[] });
        response = await client.messages.create({ ...requestParams, messages: messages as any });
        inputTokens += response.usage?.input_tokens ?? 0;
        outputTokens += response.usage?.output_tokens ?? 0;
        webSearchCount += (response.usage as any)?.server_tool_use?.web_search_requests ?? 0;
      }
    } catch (apiErr: unknown) {
      const msg = apiErr instanceof Error ? apiErr.message : String(apiErr);
      console.error(`nl-parse: Anthropic API error: ${msg}`);
      return new Response(
        JSON.stringify({ error: `AI service error: ${msg}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webSearchUsed = webSearchCount > 0;
    console.info(`nl-parse: Anthropic responded, stop_reason=${response.stop_reason}, usage=${JSON.stringify({ input: inputTokens, output: outputTokens, webSearches: webSearchCount })}`);

    if (userId) {
      logTokenUsage(userId, inputTokens, outputTokens);
    }

    // ── Extract tool call ──────────────────────────────────────────
    const toolBlock = response.content.find((block) => block.type === 'tool_use');
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      throw new Error('No tool_use response from Claude');
    }

    let toolName = toolBlock.name;
    const toolInput = toolBlock.input as Record<string, any>;

    // ── Server-side guard: no plan → no update/modify ─────────────
    // If the AI picks update_profile or modify_plan but no plan exists,
    // there's nothing to update. Fall back to a helpful response.
    // Check for a MEANINGFUL plan — not just a truthy currentPlan.
    // The frontend may send a currentPlan with empty properties from stale state.
    const hasPlan = !!currentPlan && Array.isArray(currentPlan.properties) && currentPlan.properties.length > 0;
    if (!hasPlan && (toolName === 'update_profile' || toolName === 'modify_plan' || toolName === 'suggest_properties' || toolName === 'add_event')) {
      console.warn(`nl-parse: tool="${toolName}" chosen but no plan exists — falling back to respond`);
      toolName = 'respond';
      // Rewrite the message to guide the user
      toolInput.message = toolInput.message || 'Send a client brief with financial details (income, deposit, savings, borrowing capacity) and I\'ll build a plan.';
    }

    const responseType = toolToResponseType(toolName);
    console.info(`nl-parse: tool="${toolName}" → type="${responseType}"`);

    // ── Validate + Template + Build response ───────────────────────
    const parsedResponse: Record<string, any> = {
      type: responseType,
      assumptions: toolInput.assumptions || [],
    };

    switch (toolName) {
      case 'create_plan': {
        // Validate
        const validation = validateCreatePlan(toolInput);
        if (validation.warnings.length > 0) {
          console.warn(`nl-parse: validation warnings:`, validation.warnings);
        }
        const data = validation.data;

        // Build response (same shape as old initial_plan)
        parsedResponse.clientProfile = data.clientProfile;
        parsedResponse.investmentProfile = data.investmentProfile;
        parsedResponse.properties = data.properties;
        parsedResponse.strategyPreset = data.strategyPreset;
        parsedResponse.missingInputs = data.missingInputs || [];
        parsedResponse.clientProfileSources = data.clientProfileSources || {};
        parsedResponse.investmentProfileSources = data.investmentProfileSources || {};
        parsedResponse.propertySources = data.propertySources || [];

        // Template the message (code writes it, not AI)
        parsedResponse.message = buildCreatePlanMessage(data as any);

        // "Negotiate, don't shrink": when the BA stated a price the deposit
        // pool can't cover near-term, name the cash requirement and the
        // deferral path in the chat message.
        const fundingNote = computeStatedPriceFundingNote({
          properties: parsedResponse.properties ?? [],
          propertySources: parsedResponse.propertySources,
          depositPool: parsedResponse.investmentProfile?.depositPool ?? 0,
          annualSavings: parsedResponse.investmentProfile?.annualSavings ?? 0,
        });
        if (fundingNote) {
          parsedResponse.message = injectFundingNote(parsedResponse.message, fundingNote);
          console.info(`nl-parse: stated-price funding note injected`);
        }

        // Feasibility injection (equity AND cashflow goals)
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
            console.info(`nl-parse: feasibility ratio=${feasibility.ratio.toFixed(2)}, descriptor="${feasibility.descriptor}"${feasibility.cashflow ? `, cashflow ratio=${feasibility.cashflow.ratio.toFixed(2)}, cashflow descriptor="${feasibility.cashflow.descriptor}"` : ''}`);
          }
        }

        // Append validation warnings to assumptions if any
        if (validation.warnings.length > 0) {
          parsedResponse.assumptions = [
            ...(parsedResponse.assumptions || []),
            ...validation.warnings.map(w => `[auto-corrected] ${w}`),
          ];
        }
        break;
      }

      case 'modify_plan': {
        // Validate
        const currentProperties = currentPlan?.properties || [];
        const validation = validateModifyPlan(toolInput, currentProperties);
        const data = validation.data;

        parsedResponse.modification = data.modification;
        parsedResponse.modifications = data.modifications;
        parsedResponse.properties = data.properties; // For add action

        // Template the message
        parsedResponse.message = buildModifyPlanMessage(data as any);

        // Re-check goal feasibility on every plan-affecting turn — a missed
        // goal must never be silently glossed over by a modification reply.
        // The engine projection sent with the request (enginePlanState) is
        // authoritative here; the modification itself hasn't been applied
        // yet, so this describes the plan as it currently stands.
        if (currentProperties.length > 0) {
          const ip = currentPlan?.investmentProfile ?? {};
          const feasibility = computeFeasibility({
            properties: currentProperties,
            equityGoal: ip.equityGoal ?? 0,
            cashflowGoal: ip.cashflowGoal ?? 0,
            timelineYears: ip.timelineYears ?? 20,
            engineProjection: currentPlan?.enginePlanState ?? null,
            suppressOnTrack: true,
          });
          if (feasibility) {
            parsedResponse.message = injectFeasibilityDescriptor(parsedResponse.message, feasibility);
            console.info(`nl-parse: modify feasibility ratio=${feasibility.ratio === Infinity ? 'n/a' : feasibility.ratio.toFixed(2)}${feasibility.cashflow ? `, cashflow ratio=${feasibility.cashflow.ratio.toFixed(2)}, cashflow descriptor="${feasibility.cashflow.descriptor}"` : ''}`);
          }
        }

        if (validation.warnings.length > 0) {
          parsedResponse.assumptions = [
            ...(parsedResponse.assumptions || []),
            ...validation.warnings.map(w => `[auto-corrected] ${w}`),
          ];
        }
        break;
      }

      case 'update_profile': {
        // Validate
        const validation = validateUpdateProfile(toolInput);
        const data = validation.data;

        parsedResponse.profileUpdates = data.profileUpdates;

        // Template the message
        parsedResponse.message = buildUpdateProfileMessage(data.profileUpdates as any);

        if (validation.warnings.length > 0) {
          parsedResponse.assumptions = [
            ...(parsedResponse.assumptions || []),
            ...validation.warnings.map(w => `[auto-corrected] ${w}`),
          ];
        }
        break;
      }

      case 'add_event': {
        // Validate
        const validation = validateAddEvent(toolInput);
        if (!validation.valid) {
          // Fall back to conversation
          parsedResponse.type = 'explanation';
          parsedResponse.message = validation.warnings.join(' ');
          break;
        }
        const data = validation.data;

        parsedResponse.event = data.event;

        // Template the message
        parsedResponse.message = buildAddEventMessage(data.event as any);
        break;
      }

      case 'suggest_properties': {
        // AI writes the message for suggestions (needs natural language)
        parsedResponse.propertySuggestions = toolInput.propertySuggestions;
        parsedResponse.message = toolInput.message || 'Here are some options that fit the current plan.';
        break;
      }

      case 'respond': {
        // AI writes the message (this is the "just talk" path)
        parsedResponse.message = toolInput.message || '';
        if (toolInput.explanation) {
          parsedResponse.explanation = toolInput.explanation;
        }
        break;
      }

      default: {
        parsedResponse.type = 'explanation';
        parsedResponse.message = toolInput.message || 'I didn\'t quite catch that. Could you rephrase?';
      }
    }

    // Web-research hygiene: the search tool's citations can surface as <cite>
    // tags in the message — the chat renders markdown only, so strip them.
    // webSearchUsed is the audit trail; if the model searched AND picked a
    // plan-mutating tool, note it (plan params must come from the BA — the
    // prompt forbids searched figures in tool inputs; this logs the turn).
    if (typeof parsedResponse.message === 'string') {
      parsedResponse.message = parsedResponse.message.replace(/<\/?cite[^>]*>/g, '');
    }
    parsedResponse.webSearchUsed = webSearchUsed;
    if (webSearchUsed && toolName !== 'respond') {
      console.warn(`nl-parse: web search used on a "${toolName}" turn — verify no searched figures entered plan params`);
      parsedResponse.assumptions = [
        ...(parsedResponse.assumptions || []),
        'Web research was consulted this turn — plan inputs reflect only figures stated in the brief/chat.',
      ];
    }

    console.info(`nl-parse: returning type="${parsedResponse.type}", message length=${parsedResponse.message?.length || 0}, webSearchUsed=${webSearchUsed}`);

    return new Response(
      JSON.stringify(parsedResponse),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('nl-parse error:', errorMessage);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
