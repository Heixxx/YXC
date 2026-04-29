import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { fetchTwelveDataCandles } from '../lib/twelvedata';
import { snapshotTimeframe } from '../lib/indicators';
import type { Timeframe } from '../lib/types';

export const fetchKlinesMultiTFTool = createTool({
  id: 'fetch_klines_multi_tf',
  description:
    'Fetch OHLC candles and indicator snapshots for a forex pair across multiple timeframes. ' +
    'Returns last 200 candles per TF plus computed indicator snapshot (EMA20/50/200, RSI, ATR, BB width, slope, trend label).',
  inputSchema: z.object({
    pair: z.string().describe('Forex pair, e.g. "EUR/USD"'),
    timeframes: z
      .array(z.enum(['15min', '1h', '4h', '1day']))
      .default(['1h', '4h', '1day'])
      .describe('Timeframes to fetch'),
    outputsize: z.number().int().min(50).max(500).default(200),
  }),
  outputSchema: z.object({
    pair: z.string(),
    snapshots: z.record(
      z.string(),
      z.object({
        ema20: z.number(),
        ema50: z.number(),
        ema200: z.number(),
        rsi: z.number(),
        atr: z.number(),
        bbWidthPct: z.number(),
        slope20Pct: z.number(),
        trend: z.enum(['UP', 'DOWN', 'RANGE']),
        currentPrice: z.number(),
        candlesCount: z.number(),
      })
    ),
  }),
  execute: async ({ context }) => {
    const { pair, timeframes, outputsize } = context;
    const result: Record<string, ReturnType<typeof snapshotTimeframe> & { currentPrice: number; candlesCount: number }> = {};

    await Promise.all(
      timeframes.map(async (tf) => {
        const candles = await fetchTwelveDataCandles(pair, tf as Timeframe, outputsize);
        if (candles.length < 50) {
          throw new Error(`Insufficient candles for ${pair} ${tf}: got ${candles.length}`);
        }
        const snap = snapshotTimeframe(candles);
        result[tf] = {
          ...snap,
          currentPrice: candles[candles.length - 1]!.close,
          candlesCount: candles.length,
        };
      })
    );

    return { pair, snapshots: result };
  },
});
