/**
 * Model-Graded Eval — uses a separate LLM call to assess response quality.
 *
 * Runs AFTER field-level assertions. Evaluates dimensions that can't be
 * checked with simple field comparisons: coherence, relevance, tone,
 * property selection rationale, compliance.
 */

import Anthropic from '@anthropic-ai/sdk';

export interface GradeResult {
  coherence: number;
  relevance: number;
  tone: number;
  overall: number;
  reasoning: string;
}

const GRADER_TOOL = {
  name: 'grade_response',
  description: 'Grade the AI response quality on multiple dimensions.',
  input_schema: {
    type: 'object' as const,
    properties: {
      coherence: {
        type: 'number' as const,
        description: 'Message clarity and logical flow (1-5). 5 = clear, well-structured. 1 = confusing or contradictory.',
      },
      relevance: {
        type: 'number' as const,
        description: 'How well the response addresses the user request (1-5). 5 = directly answers. 1 = off-topic.',
      },
      tone: {
        type: 'number' as const,
        description: 'Professional but approachable tone appropriate for a BA tool (1-5). 5 = natural, professional. 1 = robotic, overly casual, or condescending.',
      },
      overall: {
        type: 'number' as const,
        description: 'Overall quality (1-5). Would a BA be satisfied with this response?',
      },
      reasoning: {
        type: 'string' as const,
        description: 'One sentence explaining the grades.',
      },
    },
    required: ['coherence', 'relevance', 'tone', 'overall', 'reasoning'],
  },
};

const GRADER_PROMPT = `You are an eval grader for a property investment planning AI. You will be shown:
1. The user message (from a buyers' agent)
2. The AI's structured response (JSON)
3. The AI's text message to the user

Grade the response on these dimensions (1-5 scale):

- **coherence**: Is the message clear, well-structured, and internally consistent?
- **relevance**: Does it directly address what the user asked or described?
- **tone**: Is it professional but approachable — appropriate for a financial tool used by buyers' agents? Not robotic, not overly casual.
- **overall**: Would a buyers' agent be satisfied with this response?

Be a tough grader. A 3 is acceptable, 4 is good, 5 is excellent. Reserve 5 for responses that truly nail it.`;

export async function gradeResponse(
  client: Anthropic,
  userMessage: string,
  response: Record<string, unknown>,
  model = 'claude-haiku-4-5-20251001',
): Promise<GradeResult | null> {
  try {
    const result = await client.messages.create({
      model,
      max_tokens: 256,
      temperature: 0,
      system: [{ type: 'text', text: GRADER_PROMPT }],
      messages: [
        {
          role: 'user',
          content: `## User Message\n${userMessage}\n\n## AI Response (JSON)\n${JSON.stringify(response, null, 2).slice(0, 3000)}\n\n## AI Message to User\n${(response.message as string) ?? '(no message)'}`,
        },
      ],
      tools: [GRADER_TOOL as any],
      tool_choice: { type: 'tool' as const, name: 'grade_response' },
    });

    const block = result.content.find((b) => b.type === 'tool_use');
    if (!block || block.type !== 'tool_use') return null;

    return block.input as GradeResult;
  } catch (err) {
    console.error('Grader error:', err);
    return null;
  }
}
