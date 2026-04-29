import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { fetchTwelveDataCandles } from '../lib/twelvedata';
import { runLayer0AtBar } from '../lib/strategies';
import { computeATR } from '../lib/indicators';

export const runMicroBacktestTool = createTool({
  id: 'run_micro_backtest',
  description:
    'Replay the deterministic Layer 0 strategy on the last N historical candles and report ' +
    'win-rate, average R-multiple, and sample size. Use this to validate that the proposed ' +
    'direction has historically worked on this pair under the current volatility regime.',
  inputSchema: z.object({
    pair: z.string(),
    direction: z.enum(['BUY', 'SELL']),
    timeframe: z.enum(['15min', '1h', '4h', '1day']).default('1h'),
    slMultiplier: z.number().default(1.5).describe('SL = entry - slMultiplier * ATR (BUY)'),
    tpMultiplier: z.number().default(3.0).describe('TP = entry + tpMultiplier * ATR (BUY)'),
    lookback: z.number().int().min(100).max(500).default(300).describe('Bars to scan'),
    forwardBars: z.number().int().min(6).max(100).default(24).describe('Bars to wait for SL/TP'),
  }),
  outputSchema: z.object({
    winRate: z.number().describe('Percentage 0-100'),
    avgR: z.number().describe('Average R-multiple realized (positive = profitable)'),
    sampleSize: z.number(),
    regimeMatch: z.boolean().describe('True if current ATR is within 30-70 percentile of historical setups ATR'),
    setupsScanned: z.number(),
  }),
  execute: async ({ context }) => {
    const { pair, direction, timeframe, slMultiplier, tpMultiplier, lookback, forwardBars } = context;

    // Need lookback + forwardBars + 50 (warmup) candles
    const total = lookback + forwardBars + 50;
    const candles = await fetchTwelveDataCandles(pair, timeframe, total);
    if (candles.length < 100) {
      return { winRate: 0, avgR: 0, sampleSize: 0, regimeMatch: false, setupsScanned: 0 };
    }

    const atrSeries = computeATR(candles, 14);
    const setupATRs: number[] = [];
    let wins = 0;
    let totalR = 0;
    let sample = 0;
    let scanned = 0;

    const startIdx = Math.max(50, candles.length - lookback - forwardBars);
    const endIdx = candles.length - forwardBars;

    for (let i = startIdx; i < endIdx; i++) {
      scanned++;
      const l0 = runLayer0AtBar(candles, i);
      if (l0.direction !== direction || l0.confidence < 50) continue;

      const atrAtSetup = atrSeries[i];
      if (!atrAtSetup || isNaN(atrAtSetup)) continue;

      const entry = candles[i]!.close;
      const slDist = slMultiplier * atrAtSetup;
      const tpDist = tpMultiplier * atrAtSetup;
      const sl = direction === 'BUY' ? entry - slDist : entry + slDist;
      const tp = direction === 'BUY' ? entry + tpDist : entry - tpDist;

      let outcome: 'TP' | 'SL' | 'TIMEOUT' = 'TIMEOUT';
      for (let j = i + 1; j <= i + forwardBars && j < candles.length; j++) {
        const c = candles[j]!;
        if (direction === 'BUY') {
          if (c.low <= sl) { outcome = 'SL'; break; }
          if (c.high >= tp) { outcome = 'TP'; break; }
        } else {
          if (c.high >= sl) { outcome = 'SL'; break; }
          if (c.low <= tp) { outcome = 'TP'; break; }
        }
      }

      sample++;
      setupATRs.push(atrAtSetup);
      if (outcome === 'TP') { wins++; totalR += tpMultiplier / slMultiplier; }
      else if (outcome === 'SL') { totalR -= 1; }
      // TIMEOUT counts as 0R
    }

    const currentATR = atrSeries[atrSeries.length - 1] ?? 0;
    let regimeMatch = false;
    if (setupATRs.length >= 5 && currentATR > 0) {
      const sorted = [...setupATRs].sort((a, b) => a - b);
      const p30 = sorted[Math.floor(sorted.length * 0.3)]!;
      const p70 = sorted[Math.floor(sorted.length * 0.7)]!;
      regimeMatch = currentATR >= p30 && currentATR <= p70;
    }

    return {
      winRate: sample > 0 ? Math.round((wins / sample) * 100) : 0,
      avgR: sample > 0 ? Math.round((totalR / sample) * 100) / 100 : 0,
      sampleSize: sample,
      regimeMatch,
      setupsScanned: scanned,
    };
  },
});
