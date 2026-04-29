import type { Candle } from './types';

// ============================================================================
// EMA, SMA
// ============================================================================

export function computeEMA(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  const out: number[] = new Array(values.length).fill(NaN);
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    const cur = values[i]! * k + prev * (1 - k);
    out[i] = cur;
    prev = cur;
  }
  return out;
}

export function computeSMA(values: number[], period: number): number[] {
  const out: number[] = new Array(values.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i]!;
    if (i >= period) sum -= values[i - period]!;
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

// ============================================================================
// RSI (Wilder's)
// ============================================================================

export function computeRSI(values: number[], period = 14): number[] {
  const out: number[] = new Array(values.length).fill(NaN);
  if (values.length < period + 1) return out;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i]! - values[i - 1]!;
    if (d >= 0) gains += d; else losses -= d;
  }
  let avgG = gains / period;
  let avgL = losses / period;
  out[period] = avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL);

  for (let i = period + 1; i < values.length; i++) {
    const d = values[i]! - values[i - 1]!;
    const g = d > 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    avgG = (avgG * (period - 1) + g) / period;
    avgL = (avgL * (period - 1) + l) / period;
    out[i] = avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL);
  }
  return out;
}

// ============================================================================
// ATR
// ============================================================================

export function computeATR(candles: Candle[], period = 14): number[] {
  const out: number[] = new Array(candles.length).fill(NaN);
  if (candles.length < period + 1) return out;
  const trs: number[] = [0];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i]!, p = candles[i - 1]!;
    trs.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)));
  }
  let atr = trs.slice(1, period + 1).reduce((a, b) => a + b, 0) / period;
  out[period] = atr;
  for (let i = period + 1; i < candles.length; i++) {
    atr = (atr * (period - 1) + trs[i]!) / period;
    out[i] = atr;
  }
  return out;
}

// ============================================================================
// Bollinger Bands
// ============================================================================

export function computeBollingerBands(values: number[], period = 20, stddevMult = 2):
  { upper: number[]; middle: number[]; lower: number[] } {
  const middle = computeSMA(values, period);
  const upper = new Array(values.length).fill(NaN);
  const lower = new Array(values.length).fill(NaN);
  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;
    const m = middle[i]!;
    for (let j = i - period + 1; j <= i; j++) sum += (values[j]! - m) ** 2;
    const sd = Math.sqrt(sum / period);
    upper[i] = m + stddevMult * sd;
    lower[i] = m - stddevMult * sd;
  }
  return { upper, middle, lower };
}

// ============================================================================
// Donchian Channels
// ============================================================================

export function computeDonchian(candles: Candle[], period = 20):
  { upper: number[]; lower: number[] } {
  const upper = new Array(candles.length).fill(NaN);
  const lower = new Array(candles.length).fill(NaN);
  for (let i = period - 1; i < candles.length; i++) {
    let hi = -Infinity, lo = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (candles[j]!.high > hi) hi = candles[j]!.high;
      if (candles[j]!.low < lo) lo = candles[j]!.low;
    }
    upper[i] = hi;
    lower[i] = lo;
  }
  return { upper, lower };
}

// ============================================================================
// Swing points
// ============================================================================

export function findSwingPoints(candles: Candle[], lookback = 20): {
  swingHigh: number;
  swingLow: number;
  recentHigh: number;
  recentLow: number;
} {
  const slice = candles.slice(-Math.min(lookback, candles.length));
  let hi = -Infinity, lo = Infinity;
  for (const c of slice) {
    if (c.high > hi) hi = c.high;
    if (c.low < lo) lo = c.low;
  }
  const recent = candles.slice(-5);
  let rHi = -Infinity, rLo = Infinity;
  for (const c of recent) {
    if (c.high > rHi) rHi = c.high;
    if (c.low < rLo) rLo = c.low;
  }
  return { swingHigh: hi, swingLow: lo, recentHigh: rHi, recentLow: rLo };
}

// ============================================================================
// MACD
// ============================================================================

export function computeMACD(values: number[], fast = 12, slow = 26, signal = 9):
  { macd: number[]; signal: number[]; histogram: number[] } {
  const emaFast = computeEMA(values, fast);
  const emaSlow = computeEMA(values, slow);
  const macd = values.map((_, i) => emaFast[i]! - emaSlow[i]!);
  const sig = computeEMA(macd.filter((v) => !isNaN(v)), signal);
  // align signal back
  const sigPadded = new Array(values.length - sig.length).fill(NaN).concat(sig);
  const hist = macd.map((v, i) => v - (sigPadded[i] ?? NaN));
  return { macd, signal: sigPadded, histogram: hist };
}

// ============================================================================
// Multi-TF context builder
// ============================================================================

export interface TFSnapshot {
  ema20: number;
  ema50: number;
  ema200: number;
  rsi: number;
  atr: number;
  bbWidthPct: number;
  slope20Pct: number;
  trend: 'UP' | 'DOWN' | 'RANGE';
}

export function snapshotTimeframe(candles: Candle[]): TFSnapshot {
  const closes = candles.map((c) => c.close);
  const ema20a = computeEMA(closes, 20);
  const ema50a = computeEMA(closes, 50);
  const ema200a = computeEMA(closes, 200);
  const rsia = computeRSI(closes, 14);
  const atra = computeATR(candles, 14);
  const bb = computeBollingerBands(closes, 20, 2);

  const last = closes.length - 1;
  const ema20 = ema20a[last] ?? closes[last]!;
  const ema50 = ema50a[last] ?? closes[last]!;
  const ema200 = ema200a[last] ?? closes[last]!;
  const rsi = rsia[last] ?? 50;
  const atr = atra[last] ?? 0;
  const bbU = bb.upper[last] ?? 0;
  const bbL = bb.lower[last] ?? 0;
  const bbWidthPct = bbL > 0 ? ((bbU - bbL) / closes[last]!) * 100 : 0;

  const ema20Prev = ema20a[Math.max(0, last - 5)] ?? ema20;
  const slope20Pct = ema20Prev > 0 ? ((ema20 - ema20Prev) / ema20Prev) * 100 : 0;

  let trend: 'UP' | 'DOWN' | 'RANGE' = 'RANGE';
  if (ema20 > ema50 && ema50 > ema200 && slope20Pct > 0.05) trend = 'UP';
  else if (ema20 < ema50 && ema50 < ema200 && slope20Pct < -0.05) trend = 'DOWN';

  return { ema20, ema50, ema200, rsi, atr, bbWidthPct, slope20Pct, trend };
}
