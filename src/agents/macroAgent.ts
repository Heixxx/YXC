/**
 * Macro Agent does NOT use Mastra's tool-calling pattern (DeepSeek/Claude tool-use)
 * because Perplexity is the LLM and it has built-in web search.
 *
 * Instead it directly invokes:
 * 1. fetchCalendar tool (deterministic data)
 * 2. Perplexity with the calendar context embedded in the prompt
 *
 * Returns MacroVerdict structured via JSON parse.
 */
import { fetchCalendarTool } from '../tools/fetchCalendar';
import { callPerplexity, callDeepSeekJSON } from '../lib/llm';
import { MacroVerdictSchema, type MacroVerdict, type AgentContext } from '../lib/types';
import { kvGet, kvSet } from '../lib/cache';

const SYSTEM = `You are a macro/fundamental FX analyst with web search. Find recent news and upcoming events for the currency pair. Always respond with VALID JSON only — no preamble, no markdown fences.`;

export async function runMacroAgent(ctx: AgentContext): Promise<MacroVerdict> {
  const cacheKey = `macro:${ctx.pair}:${ctx.direction}`;
  const cached = await kvGet<MacroVerdict>(cacheKey);
  if (cached) return cached;

  // Step 1: pull calendar (deterministic)
  let calendarSummary = 'Calendar data unavailable.';
  try {
    const cal = await fetchCalendarTool.execute({
      context: { pair: ctx.pair, hoursAhead: 24 },
    } as never);
    if (cal.eventsCount > 0) {
      calendarSummary = `Events next 24h: ${cal.eventsCount} total, ${cal.highImpactCount} high-impact. ` +
        (cal.nextHighImpact ? `Next major: ${cal.nextHighImpact}.` : 'No major events.');
    } else {
      calendarSummary = 'No scheduled events in next 24h.';
    }
  } catch {
    // proceed without
  }

  const userPrompt = `Analyze macro context for ${ctx.pair}, proposed direction ${ctx.direction}.

Pre-fetched calendar context:
${calendarSummary}

Search the web for:
1. Last 48h economic releases for ${ctx.pair.split('/')[0]} and ${ctx.pair.split('/')[1]}
2. Central bank statements affecting these currencies
3. Geopolitical events impacting USD/EUR/GBP/JPY etc.

Decision rules:
- CONFIRM if fundamentals support ${ctx.direction}
- REJECT if a major event in next 12h could invalidate (e.g. Fed today on USD pair)
- NEUTRAL if no significant news either way

Return ONLY this JSON object:
{
  "verdict": "CONFIRM" | "REJECT" | "NEUTRAL",
  "confidence": <0-100>,
  "keyEventNext12h": <string or null>,
  "fundamentalBias": "BULL" | "BEAR" | "NEUTRAL",
  "newsSummary": "<max 350 chars summary of relevant news>"
}`;

  let result: MacroVerdict;
  try {
    const text = await callPerplexity([
      { role: 'system', content: SYSTEM },
      { role: 'user', content: userPrompt },
    ]);

    // Extract JSON
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Perplexity returned no JSON');
    const parsed = JSON.parse(m[0]);
    result = MacroVerdictSchema.parse(parsed);
  } catch {
    // Fallback to DeepSeek without web search
    result = await callDeepSeekJSON(
      [
        { role: 'system', content: SYSTEM + ' (No web access; reason from training data and the calendar context.)' },
        { role: 'user', content: userPrompt },
      ],
      MacroVerdictSchema,
      { temperature: 0.3 }
    );
  }

  await kvSet(cacheKey, result, 60 * 30); // 30 min cache
  return result;
}
