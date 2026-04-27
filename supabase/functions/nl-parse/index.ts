import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.39.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { buildSystemPrompt } from "./system-prompt.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    // Never let usage logging break the main flow
    console.error('Failed to log token usage:', err);
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const client = new Anthropic({ apiKey });

    const { message, conversationHistory, currentPlan, userId, strategyPreset, pacingMode } = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the system prompt with current plan context and active strategy preset.
    // pacingMode is accepted but ignored — kept for one release as a backstop
    // against in-flight requests from older clients; removed in Phase 5.
    void pacingMode;
    const systemPrompt = buildSystemPrompt(currentPlan, strategyPreset);

    // Build message history for multi-turn conversation
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }
    }

    // Add the current message
    messages.push({ role: 'user', content: message });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    });

    // Log token usage (non-blocking — don't await)
    if (userId && response.usage) {
      logTokenUsage(userId, response.usage.input_tokens, response.usage.output_tokens);
    }

    // Extract text content from the response
    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Parse the JSON response from Claude
    // Claude should return valid JSON wrapped in ```json ... ``` or as raw JSON
    let parsedResponse;
    const rawText = textBlock.text;

    try {
      // Try raw JSON first
      parsedResponse = JSON.parse(rawText);
    } catch {
      // Try extracting from markdown code block
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[1].trim());
      } else {
        throw new Error('Could not parse Claude response as JSON');
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
