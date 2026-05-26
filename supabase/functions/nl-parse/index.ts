import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.39.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  getClassifierPrompt,
  getPromptForIntent,
  CLASSIFY_TOOL,
  CLASSIFY_TOOL_CHOICE,
  RESPONSE_TOOL,
  RESPONSE_TOOL_CHOICE,
  type ClassifiedIntent,
} from "./pipeline.ts";
import { computeFeasibility, injectFeasibilityDescriptor } from "./feasibility.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS_CLASSIFY = 256;
const MAX_TOKENS_RESPOND = 4096;

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

    const { message, conversationHistory, conversationSummary, currentPlan, userId, strategyPreset, planningDefaults } = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }
    messages.push({ role: 'user', content: message });

    // Track total tokens across both calls
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // ── Step 1: Classify ────────────────────────────────────────────
    const hasPlan = !!currentPlan;
    const classifierPrompt = getClassifierPrompt(hasPlan);

    let intent: ClassifiedIntent;
    try {
      const classifyResponse = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS_CLASSIFY,
        temperature: 0,
        system: [
          {
            type: 'text',
            text: classifierPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages,
        tools: [CLASSIFY_TOOL as any],
        tool_choice: CLASSIFY_TOOL_CHOICE as any,
      });

      if (classifyResponse.usage) {
        totalInputTokens += classifyResponse.usage.input_tokens;
        totalOutputTokens += classifyResponse.usage.output_tokens;
      }

      const classifyBlock = classifyResponse.content.find((b) => b.type === 'tool_use');
      if (!classifyBlock || classifyBlock.type !== 'tool_use') {
        throw new Error('No tool_use block from classifier');
      }

      const classified = classifyBlock.input as { intent: ClassifiedIntent; reasoning: string };
      intent = classified.intent;
      console.info(`nl-parse: classified as "${intent}" — ${classified.reasoning}`);
    } catch (classifyErr: unknown) {
      const msg = classifyErr instanceof Error ? classifyErr.message : String(classifyErr);
      console.error(`nl-parse: classifier error: ${msg}`);
      return new Response(
        JSON.stringify({ error: `AI classification error: ${msg}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Step 2: Extract + Respond ───────────────────────────────────
    const focusedPrompt = getPromptForIntent(intent, currentPlan ?? null, strategyPreset, conversationSummary, planningDefaults);

    console.info(`nl-parse: calling Anthropic for "${intent}" (${messages.length} messages, prompt ${focusedPrompt.length} chars)`);
    let response;
    try {
      response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS_RESPOND,
        temperature: 0,
        system: [
          {
            type: 'text',
            text: focusedPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages,
        tools: [RESPONSE_TOOL as any],
        tool_choice: RESPONSE_TOOL_CHOICE as any,
      });
    } catch (apiErr: unknown) {
      const msg = apiErr instanceof Error ? apiErr.message : String(apiErr);
      console.error(`nl-parse: Anthropic API error: ${msg}`);
      return new Response(
        JSON.stringify({ error: `AI service error: ${msg}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (response.usage) {
      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;
    }
    console.info(`nl-parse: Anthropic responded, stop_reason=${response.stop_reason}, total_usage=${JSON.stringify({ input: totalInputTokens, output: totalOutputTokens })}`);

    // Log combined token usage (non-blocking)
    if (userId) {
      logTokenUsage(userId, totalInputTokens, totalOutputTokens);
    }

    const toolBlock = response.content.find((block) => block.type === 'tool_use');
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      throw new Error('No tool_use response from Claude');
    }

    const parsedResponse = toolBlock.input as Record<string, any>;
    console.info(`nl-parse: parsed response type=${parsedResponse.type}`);

    if (parsedResponse.type === 'initial_plan' && parsedResponse.properties?.length > 0) {
      const feasibility = computeFeasibility({
        properties: parsedResponse.properties,
        equityGoal: parsedResponse.investmentProfile?.equityGoal ?? 0,
        timelineYears: parsedResponse.investmentProfile?.timelineYears ?? 20,
      });
      if (feasibility && parsedResponse.message) {
        parsedResponse.message = injectFeasibilityDescriptor(parsedResponse.message, feasibility);
        console.info(`nl-parse: feasibility ratio=${feasibility.ratio.toFixed(2)}, descriptor="${feasibility.descriptor}"`);
      }
    }

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
