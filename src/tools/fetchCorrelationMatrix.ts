import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { fetchTwelveDataCandles } from '../lib/twelvedata';
import { kvGet, kvSet } from '../lib/cache';

const MAJORS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD'];

function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 10) return 0;
  let sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i]!; const y = b[i]!;
    sa += x; sb += y; saa += x * x; sbb += y * y; sab += x * y;
  }
  const num = n * sab - sa * sb;
  const den = Math.sqrt((n * saa - sa * sa) * (n * sbb - sb * sb));
  return den === 0 ? 0 : num / den;
}

function returns(values: number[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < values.length; i++) r.push((values[i]! - values[i - 1]!) / values[i - 1]!);
  return r;
}

export const fetchCorrelationMatrixTool = createTool({
  id: 'fetch_correlation_matrix',
  description:
    'Compute 30-day Pearson correlation between the requested pair and major FX pairs. ' +
    'Use to detect crowded/redundant exposure (e.g., if you also hold EUR/USD long, consider correlation before going long GBP/USD).',
  inputSchema: z.object({
    pair: z.string(),
    days: z.number().int().min(10).max(90).default(30),
  }),
  outputSchema: z.object({
    pair: z.string(),
    correlations: z.array(z.object({
      otherPair: z.string(),
      correlation: z.number().min(-1).max(1),
      label: z.enum(['STRONG_POSITIVE', 'POSITIVE', 'NEUTRAL', 'NEGATIVE', 'STRONG_NEGATIVE']),
    })),
  }),
  execute: async ({ context }) => {
    const { pair, days } = context;
    const cacheKey = `corr:${pair}:${days}`;
    const cached = await kvGet<{
      pair: string;
      correlations: Array<{ otherPair: string; correlation: number; label: 'STRONG_POSITIVE' | 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'STRONG_NEGATIVE' }>;
    }>(cacheKey);
    if (cached) return cached;

    const others = MAJORS.filter((p) => p !== pair);
    const allPairs = [pair, ...others];

    const seriesByPair: Record<string, number[]> = {};
    await Promise.all(allPairs.map(async (p) => {
      try {
        const c = await fetchTwelveDataCandles(p, '1day', days + 5);
        seriesByPair[p] = returns(c.map((k) => k.close));
      } catch {
        seriesByPair[p] = [];
      }
    }));

    const base = seriesByPair[pair] ?? [];
    const correlations = others.map((other) => {
      const corr = pearson(base, seriesByPair[other] ?? []);
      let label: 'STRONG_POSITIVE' | 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'STRONG_NEGATIVE' = 'NEUTRAL';
      if (corr >= 0.7) label = 'STRONG_POSITIVE';
      else if (corr >= 0.3) label = 'POSITIVE';
      else if (corr <= -0.7) label = 'STRONG_NEGATIVE';
      else if (corr <= -0.3) label = 'NEGATIVE';
      return { otherPair: other, correlation: Math.round(corr * 100) / 100, label };
    });

    const result = { pair, correlations };
    await kvSet(cacheKey, result, 60 * 60 * 6); // 6h cache
    return result;
  },
});
