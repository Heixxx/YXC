import type { Candle } from './types';
import { computeEMA, computeRSI, computeATR, computeBollingerBands, computeDonchian } from './indicators';

export type L0Direction = 'BUY' | 'SELL' | 'HOLD';

export interface L0Result {
  direction: L0Direction;
  confidence: number;
  triggered: string[];
}

/**
 * Replay-compatible Layer 0: equivalent of the 7 strategies in frontend useSignals.ts.
 * Operates on candles[0..i] up to bar `i` (so it can be called for any historical bar
 * during backtest). Returns aggregated direction + confidence.
 */
export function runLayer0AtBar(candles: Candle[], i: number): L0Result {
  if (i < 50) return { direction: 'HOLD', confidence: 0, triggered: [] };

  const slice = candles.slice(0, i + 1);
  const closes = slice.map((c) => c.close);
  const last = closes[closes.length - 1]!;

  const ema20 = computeEMA(closes, 20);
  const ema50 = computeEMA(closes, 50);
  const rsi = computeRSI(closes, 14);
  const atr = computeATR(slice, 14);
  const bb = computeBollingerBands(closes, 20, 2);
  const don = computeDonchian(slice, 20);

  const ix = closes.length - 1;
  const e20 = ema20[ix];
  const e50 = ema50[ix];
  const r = rsi[ix];
  const a = atr[ix];
  const bbU = bb.upper[ix];
  const bbL = bb.lower[ix];
  const donU = don.upper[ix - 1]; // previous bar high (we're testing breakout of past range)
  const donL = don.lower[ix - 1];

  const triggered: string[] = [];
  let buyVotes = 0;
  let sellVotes = 0;

  // S1: EMA pullback in trend
  if (e20 && e50 && e20 > e50 && Math.abs(last - e20) / last < 0.001) {
    buyVotes++; triggered.push('S1:EMA-pullback-up');
  }
  if (e20 && e50 && e20 < e50 && Math.abs(last - e20) / last < 0.001) {
    sellVotes++; triggered.push('S1:EMA-pullback-down');
  }

  // S2: RSI oversold/overbought (mean reversion)
  if (r !== undefined && !isNaN(r) && r < 30) {
    buyVotes++; triggered.push('S2:RSI-oversold');
  }
  if (r !== undefined && !isNaN(r) && r > 70) {
    sellVotes++; triggered.push('S2:RSI-overbought');
  }

  // S3: BB extremes
  if (bbL && last < bbL) {
    buyVotes++; triggered.push('S3:BB-lower');
  }
  if (bbU && last > bbU) {
    sellVotes++; triggered.push('S3:BB-upper');
  }

  // S4: Donchian breakout
  if (donU && last > donU) {
    buyVotes++; triggered.push('S4:Donchian-up');
  }
  if (donL && last < donL) {
    sellVotes++; triggered.push('S4:Donchian-down');
  }

  // S5: Trend alignment (EMA20 > EMA50 + price above)
  if (e20 && e50 && e20 > e50 && last > e20) {
    buyVotes++; triggered.push('S5:trend-up');
  }
  if (e20 && e50 && e20 < e50 && last < e20) {
    sellVotes++; triggered.push('S5:trend-down');
  }

  // S6: Momentum (price > prev close + 0.5*ATR)
  const prev = closes[ix - 1];
  if (a && prev && last - prev > 0.5 * a) {
    buyVotes++; triggered.push('S6:momentum-up');
  }
  if (a && prev && prev - last > 0.5 * a) {
    sellVotes++; triggered.push('S6:momentum-down');
  }

  // S7: Volatility regime — only trade when ATR is in 30-70 percentile of last 50 bars
  const atrSlice = atr.slice(-50).filter((v) => !isNaN(v));
  if (atrSlice.length > 10 && a) {
    const sorted = [...atrSlice].sort((a, b) => a - b);
    const p30 = sorted[Math.floor(sorted.length * 0.3)]!;
    const p70 = sorted[Math.floor(sorted.length * 0.7)]!;
    if (a >= p30 && a <= p70) {
      // confirms whichever side has more votes
      if (buyVotes > sellVotes) { buyVotes++; triggered.push('S7:vol-regime'); }
      else if (sellVotes > buyVotes) { sellVotes++; triggered.push('S7:vol-regime'); }
    }
  }

  if (buyVotes >= 3 && buyVotes > sellVotes) {
    return {
      direction: 'BUY',
      confidence: Math.min(95, 40 + buyVotes * 10),
      triggered,
    };
  }
  if (sellVotes >= 3 && sellVotes > buyVotes) {
    return {
      direction: 'SELL',
      confidence: Math.min(95, 40 + sellVotes * 10),
      triggered,
    };
  }

  return { direction: 'HOLD', confidence: 0, triggered };
}
