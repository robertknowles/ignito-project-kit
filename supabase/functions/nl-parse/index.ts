import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.39.0";
import { buildSystemPrompt } from "./system-prompt.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { message, conversationHistory, currentPlan } = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the system prompt with current plan context if it exists
    const systemPrompt = buildSystemPrompt(currentPlan);

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
      model: 'claude-opus-4-6-20250616',
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    });

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
