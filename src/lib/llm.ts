import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

// ============================================================================
// DEEPSEEK — JSON mode native, used by 4 strategy agents + risk
// ============================================================================

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function callDeepSeekJSON<T>(
  messages: DeepSeekMessage[],
  schema: z.ZodType<T>,
  opts: { model?: string; temperature?: number; maxTokens?: number } = {}
): Promise<T> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY missing');

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model ?? 'deepseek-chat',
      messages,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 1024,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    throw new Error(`DeepSeek HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('DeepSeek empty response');

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    // attempt to extract JSON from text
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('DeepSeek response not valid JSON');
    parsed = JSON.parse(m[0]);
  }

  return schema.parse(parsed);
}

// ============================================================================
// ANTHROPIC CLAUDE — used by Judge (final aggregator)
// ============================================================================

let _claude: Anthropic | null = null;
function getClaude(): Anthropic {
  if (!_claude) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing');
    _claude = new Anthropic({ apiKey });
  }
  return _claude;
}

export async function callClaudeJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodType<T>,
  jsonSchemaForTool: object,
  opts: { model?: string; maxTokens?: number } = {}
): Promise<T> {
  const claude = getClaude();
  const response = await claude.messages.create({
    model: opts.model ?? 'claude-3-5-sonnet-20241022',
    max_tokens: opts.maxTokens ?? 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    tools: [
      {
        name: 'respond',
        description: 'Provide the structured response.',
        input_schema: jsonSchemaForTool as Anthropic.Tool['input_schema'],
      },
    ],
    tool_choice: { type: 'tool', name: 'respond' },
  });

  const toolUse = response.content.find((b) => b.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Claude did not return tool_use block');
  }
  return schema.parse(toolUse.input);
}

// ============================================================================
// PERPLEXITY — used by Macro agent (web search built-in)
// ============================================================================

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function callPerplexity(
  messages: PerplexityMessage[],
  opts: { model?: string; temperature?: number } = {}
): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new Error('PERPLEXITY_API_KEY missing');

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model ?? 'sonar',
      messages,
      temperature: opts.temperature ?? 0.2,
      max_tokens: 1024,
    }),
  });
  if (!res.ok) throw new Error(`Perplexity HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? '';
}

/** Helper: convert Zod schema to JSON Schema for Claude tool_use. */
export function zodToJsonSchema(_schema: z.ZodType): object {
  // Minimal hand-rolled converter for our needs. For production consider
  // `zod-to-json-schema` package.
  // Each agent file passes the JSON schema explicitly to avoid runtime conversion costs.
  return {};
}
