import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { kvGet, kvSet } from '../lib/cache';

const CCY_FROM_PAIR = (pair: string): string[] => {
  const [a, b] = pair.split('/');
  return [a ?? '', b ?? ''].filter(Boolean);
};

interface TECalendarItem {
  Date: string;
  Country?: string;
  Currency?: string;
  Event?: string;
  Importance?: number; // 1-3
}

export const fetchCalendarTool = createTool({
  id: 'fetch_economic_calendar',
  description:
    'Fetch upcoming high-impact economic events for the currencies in a forex pair within a time window. ' +
    'Use this to detect event risk that could invalidate a technical setup (rate decisions, CPI, NFP, FOMC).',
  inputSchema: z.object({
    pair: z.string(),
    hoursAhead: z.number().int().min(1).max(168).default(24),
  }),
  outputSchema: z.object({
    pair: z.string(),
    eventsCount: z.number(),
    highImpactCount: z.number(),
    nextHighImpact: z.string().nullable(),
    events: z.array(z.object({
      time: z.string(),
      currency: z.string(),
      event: z.string(),
      importance: z.number().min(0).max(3),
    })),
  }),
  execute: async ({ context }) => {
    const { pair, hoursAhead } = context;
    const cacheKey = `cal:${pair}:${hoursAhead}`;
    const cached = await kvGet<{
      pair: string;
      eventsCount: number;
      highImpactCount: number;
      nextHighImpact: string | null;
      events: Array<{ time: string; currency: string; event: string; importance: number }>;
    }>(cacheKey);
    if (cached) return cached;

    const ccys = CCY_FROM_PAIR(pair);
    const now = Date.now();
    const until = now + hoursAhead * 3600_000;

    let events: Array<{ time: string; currency: string; event: string; importance: number }> = [];

    const teKey = process.env.TRADINGECONOMICS_API_KEY;
    if (teKey) {
      try {
        const url = `https://api.tradingeconomics.com/calendar?c=${teKey}&format=json`;
        const res = await fetch(url);
        if (res.ok) {
          const items: TECalendarItem[] = await res.json();
          events = items
            .filter((it) => {
              const ts = new Date(it.Date).getTime();
              if (isNaN(ts) || ts < now || ts > until) return false;
              return it.Currency && ccys.includes(it.Currency.toUpperCase());
            })
            .map((it) => ({
              time: it.Date,
              currency: (it.Currency ?? '').toUpperCase(),
              event: it.Event ?? '',
              importance: it.Importance ?? 0,
            }));
        }
      } catch {
        // fall through to empty
      }
    }

    const highImpactCount = events.filter((e) => e.importance >= 3).length;
    const next = events.find((e) => e.importance >= 3);

    const result = {
      pair,
      eventsCount: events.length,
      highImpactCount,
      nextHighImpact: next ? `${next.time} ${next.currency} ${next.event}` : null,
      events: events.slice(0, 20),
    };

    await kvSet(cacheKey, result, 60 * 30); // 30 min cache
    return result;
  },
});
