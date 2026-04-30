"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// handlers/council.ts
var council_exports = {};
__export(council_exports, {
  default: () => handler
});
module.exports = __toCommonJS(council_exports);

// src/lib/types.ts
var import_zod = require("zod");
var SignalDirectionSchema = import_zod.z.enum(["BUY", "SELL", "HOLD"]);
var SignalSchema = import_zod.z.object({
  id: import_zod.z.string(),
  instrument: import_zod.z.string(),
  category: import_zod.z.literal("FOREX"),
  tier: import_zod.z.literal("PRO"),
  direction: SignalDirectionSchema,
  // From Risk Agent (real numbers, not arbitrary multiples)
  entry: import_zod.z.number(),
  target: import_zod.z.number(),
  stop: import_zod.z.number(),
  takeProfits: import_zod.z.array(import_zod.z.number()).length(3),
  // TP1, TP2, TP3
  confidence: import_zod.z.number().min(0).max(100),
  vitality: import_zod.z.number().min(0).max(100),
  timestamp: import_zod.z.number(),
  spread: import_zod.z.number(),
  // 5 dots for SignalCard.tsx (L0=strategies, L1=trend, L2=meanrev, L3=breakout, L4=macro)
  layers: import_zod.z.array(import_zod.z.boolean()).length(5),
  layerConfidences: import_zod.z.array(import_zod.z.number()).length(5),
  status: import_zod.z.enum(["active", "expired", "closing_soon"]),
  sourceLayers: import_zod.z.array(import_zod.z.string()),
  // PRO-only metadata
  thesis: import_zod.z.string(),
  mainRisk: import_zod.z.string(),
  positionSizePct: import_zod.z.number(),
  riskRewardTp1: import_zod.z.number(),
  expectedHoldMinutes: import_zod.z.number(),
  backtestWinRate: import_zod.z.number(),
  backtestSampleSize: import_zod.z.number()
});
var CandidateSchema = import_zod.z.object({
  pair: import_zod.z.string(),
  // e.g. "EUR/USD"
  direction: import_zod.z.enum(["BUY", "SELL"]),
  l0Confidence: import_zod.z.number().min(0).max(100),
  triggeredStrategies: import_zod.z.array(import_zod.z.string()),
  currentPrice: import_zod.z.number()
});
var CouncilRequestSchema = import_zod.z.object({
  candidates: import_zod.z.array(CandidateSchema).min(1).max(5)
});
var StrategyVerdictSchema = import_zod.z.object({
  verdict: import_zod.z.enum(["CONFIRM", "REJECT", "SKIP"]),
  confidence: import_zod.z.number().min(0).max(100),
  reasoning: import_zod.z.string().max(300),
  htfAligned: import_zod.z.boolean().optional(),
  trendStrength: import_zod.z.enum(["STRONG", "MODERATE", "WEAK"]).optional(),
  extremeLevel: import_zod.z.enum(["EXTREME", "ELEVATED", "NEUTRAL"]).optional(),
  divergenceDetected: import_zod.z.boolean().optional(),
  breakoutType: import_zod.z.enum(["RANGE", "SQUEEZE", "TREND_CONTINUATION", "NONE"]).optional(),
  followThroughLikely: import_zod.z.boolean().optional(),
  backtest: import_zod.z.object({
    winRate: import_zod.z.number(),
    sampleSize: import_zod.z.number()
  }).optional()
});
var MacroVerdictSchema = import_zod.z.object({
  verdict: import_zod.z.enum(["CONFIRM", "REJECT", "NEUTRAL"]),
  confidence: import_zod.z.number().min(0).max(100),
  keyEventNext12h: import_zod.z.string().nullable(),
  fundamentalBias: import_zod.z.enum(["BULL", "BEAR", "NEUTRAL"]),
  newsSummary: import_zod.z.string().max(400)
});
var RiskOutputSchema = import_zod.z.object({
  entryZone: import_zod.z.object({ low: import_zod.z.number(), high: import_zod.z.number() }),
  stopLoss: import_zod.z.number(),
  takeProfit1: import_zod.z.number(),
  takeProfit2: import_zod.z.number(),
  takeProfit3: import_zod.z.number(),
  positionSizePct: import_zod.z.number().min(0).max(3),
  riskRewardTp1: import_zod.z.number(),
  consensusStrength: import_zod.z.enum(["STRONG", "MIXED", "WEAK"])
});
var JudgeVerdictSchema = import_zod.z.object({
  decision: import_zod.z.enum(["PUBLISH", "HOLD", "DROP"]),
  finalDirection: import_zod.z.enum(["BUY", "SELL", "HOLD"]),
  finalConfidence: import_zod.z.number().min(0).max(100),
  keyThesis: import_zod.z.string().max(500),
  mainRisk: import_zod.z.string().max(300),
  expectedHoldMinutes: import_zod.z.number().int().min(15).max(2880)
});

// src/tools/fetchKlinesMultiTF.ts
var import_tools = require("@mastra/core/tools");
var import_zod2 = require("zod");

// src/lib/cache.ts
var _kv;
async function getKv() {
  if (_kv !== void 0) return _kv;
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    _kv = null;
    return null;
  }
  try {
    const mod = require("@vercel/kv");
    _kv = mod.kv;
  } catch {
    _kv = null;
  }
  return _kv;
}
async function kvGet(key) {
  try {
    return await (await getKv())?.get(key) ?? null;
  } catch {
    return null;
  }
}
async function kvSet(key, value, ttlSeconds) {
  try {
    await (await getKv())?.set(key, value, { ex: ttlSeconds });
  } catch {
  }
}
async function kvLPush(listKey, value, maxLen = 200) {
  try {
    const kv = await getKv();
    if (!kv) return;
    await kv.lpush(listKey, JSON.stringify(value));
    await kv.ltrim(listKey, 0, maxLen - 1);
  } catch {
  }
}

// src/lib/twelvedata.ts
var TD_BASE = "https://api.twelvedata.com";
var TF_MAP = {
  "15min": "15min",
  "1h": "1h",
  "4h": "4h",
  "1day": "1day"
};
var TTL_BY_TF = {
  "15min": 60 * 5,
  // 5 min cache
  "1h": 60 * 15,
  // 15 min
  "4h": 60 * 60,
  // 1h
  "1day": 60 * 60 * 6
  // 6h
};
async function fetchTwelveDataCandles(pair, timeframe, outputsize = 200) {
  const apiKey = process.env.TWELVEDATA_API_KEY;
  if (!apiKey) throw new Error("TWELVEDATA_API_KEY missing");
  const cacheKey = `td:${pair}:${timeframe}:${outputsize}`;
  const cached = await kvGet(cacheKey);
  if (cached) return cached;
  const url = new URL(`${TD_BASE}/time_series`);
  url.searchParams.set("symbol", pair);
  url.searchParams.set("interval", TF_MAP[timeframe]);
  url.searchParams.set("outputsize", String(outputsize));
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("format", "JSON");
  url.searchParams.set("order", "ASC");
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`TwelveData HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  if (data.status === "error" || !data.values) {
    throw new Error(`TwelveData API error: ${data.message || "unknown"}`);
  }
  const candles = data.values.map((v) => ({
    timestamp: (/* @__PURE__ */ new Date(v.datetime + "Z")).getTime(),
    open: parseFloat(v.open),
    high: parseFloat(v.high),
    low: parseFloat(v.low),
    close: parseFloat(v.close),
    volume: v.volume ? parseFloat(v.volume) : 0
  }));
  await kvSet(cacheKey, candles, TTL_BY_TF[timeframe]);
  return candles;
}
async function fetchTwelveDataQuote(pair) {
  const apiKey = process.env.TWELVEDATA_API_KEY;
  if (!apiKey) throw new Error("TWELVEDATA_API_KEY missing");
  const url = new URL(`${TD_BASE}/quote`);
  url.searchParams.set("symbol", pair);
  url.searchParams.set("apikey", apiKey);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TwelveData quote HTTP ${res.status}`);
  const data = await res.json();
  if (data.status === "error") {
    throw new Error(`TwelveData quote error: ${data.message}`);
  }
  const price = parseFloat(data.close ?? "0");
  const bid = data.bid ? parseFloat(data.bid) : price;
  const ask = data.ask ? parseFloat(data.ask) : price;
  return { price, bid, ask, spread: Math.abs(ask - bid) };
}

// src/lib/indicators.ts
function computeEMA(values, period) {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  const out = new Array(values.length).fill(NaN);
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    const cur = values[i] * k + prev * (1 - k);
    out[i] = cur;
    prev = cur;
  }
  return out;
}
function computeSMA(values, period) {
  const out = new Array(values.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}
function computeRSI(values, period = 14) {
  const out = new Array(values.length).fill(NaN);
  if (values.length < period + 1) return out;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gains += d;
    else losses -= d;
  }
  let avgG = gains / period;
  let avgL = losses / period;
  out[period] = avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL);
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    const g = d > 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    avgG = (avgG * (period - 1) + g) / period;
    avgL = (avgL * (period - 1) + l) / period;
    out[i] = avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL);
  }
  return out;
}
function computeATR(candles, period = 14) {
  const out = new Array(candles.length).fill(NaN);
  if (candles.length < period + 1) return out;
  const trs = [0];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i], p = candles[i - 1];
    trs.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)));
  }
  let atr = trs.slice(1, period + 1).reduce((a, b) => a + b, 0) / period;
  out[period] = atr;
  for (let i = period + 1; i < candles.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
    out[i] = atr;
  }
  return out;
}
function computeBollingerBands(values, period = 20, stddevMult = 2) {
  const middle = computeSMA(values, period);
  const upper = new Array(values.length).fill(NaN);
  const lower = new Array(values.length).fill(NaN);
  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;
    const m = middle[i];
    for (let j = i - period + 1; j <= i; j++) sum += (values[j] - m) ** 2;
    const sd = Math.sqrt(sum / period);
    upper[i] = m + stddevMult * sd;
    lower[i] = m - stddevMult * sd;
  }
  return { upper, middle, lower };
}
function computeDonchian(candles, period = 20) {
  const upper = new Array(candles.length).fill(NaN);
  const lower = new Array(candles.length).fill(NaN);
  for (let i = period - 1; i < candles.length; i++) {
    let hi = -Infinity, lo = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (candles[j].high > hi) hi = candles[j].high;
      if (candles[j].low < lo) lo = candles[j].low;
    }
    upper[i] = hi;
    lower[i] = lo;
  }
  return { upper, lower };
}
function findSwingPoints(candles, lookback = 20) {
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
function snapshotTimeframe(candles) {
  const closes = candles.map((c) => c.close);
  const ema20a = computeEMA(closes, 20);
  const ema50a = computeEMA(closes, 50);
  const ema200a = computeEMA(closes, 200);
  const rsia = computeRSI(closes, 14);
  const atra = computeATR(candles, 14);
  const bb = computeBollingerBands(closes, 20, 2);
  const last = closes.length - 1;
  const ema20 = ema20a[last] ?? closes[last];
  const ema50 = ema50a[last] ?? closes[last];
  const ema200 = ema200a[last] ?? closes[last];
  const rsi = rsia[last] ?? 50;
  const atr = atra[last] ?? 0;
  const bbU = bb.upper[last] ?? 0;
  const bbL = bb.lower[last] ?? 0;
  const bbWidthPct = bbL > 0 ? (bbU - bbL) / closes[last] * 100 : 0;
  const ema20Prev = ema20a[Math.max(0, last - 5)] ?? ema20;
  const slope20Pct = ema20Prev > 0 ? (ema20 - ema20Prev) / ema20Prev * 100 : 0;
  let trend = "RANGE";
  if (ema20 > ema50 && ema50 > ema200 && slope20Pct > 0.05) trend = "UP";
  else if (ema20 < ema50 && ema50 < ema200 && slope20Pct < -0.05) trend = "DOWN";
  return { ema20, ema50, ema200, rsi, atr, bbWidthPct, slope20Pct, trend };
}

// src/tools/fetchKlinesMultiTF.ts
var fetchKlinesMultiTFTool = (0, import_tools.createTool)({
  id: "fetch_klines_multi_tf",
  description: "Fetch OHLC candles and indicator snapshots for a forex pair across multiple timeframes. Returns last 200 candles per TF plus computed indicator snapshot (EMA20/50/200, RSI, ATR, BB width, slope, trend label).",
  inputSchema: import_zod2.z.object({
    pair: import_zod2.z.string().describe('Forex pair, e.g. "EUR/USD"'),
    timeframes: import_zod2.z.array(import_zod2.z.enum(["15min", "1h", "4h", "1day"])).default(["1h", "4h", "1day"]).describe("Timeframes to fetch"),
    outputsize: import_zod2.z.number().int().min(50).max(500).default(200)
  }),
  outputSchema: import_zod2.z.object({
    pair: import_zod2.z.string(),
    snapshots: import_zod2.z.record(
      import_zod2.z.string(),
      import_zod2.z.object({
        ema20: import_zod2.z.number(),
        ema50: import_zod2.z.number(),
        ema200: import_zod2.z.number(),
        rsi: import_zod2.z.number(),
        atr: import_zod2.z.number(),
        bbWidthPct: import_zod2.z.number(),
        slope20Pct: import_zod2.z.number(),
        trend: import_zod2.z.enum(["UP", "DOWN", "RANGE"]),
        currentPrice: import_zod2.z.number(),
        candlesCount: import_zod2.z.number()
      })
    )
  }),
  execute: async ({ context }) => {
    const { pair, timeframes, outputsize } = context;
    const result = {};
    await Promise.all(
      timeframes.map(async (tf) => {
        const candles = await fetchTwelveDataCandles(pair, tf, outputsize);
        if (candles.length < 50) {
          throw new Error(`Insufficient candles for ${pair} ${tf}: got ${candles.length}`);
        }
        const snap = snapshotTimeframe(candles);
        result[tf] = {
          ...snap,
          currentPrice: candles[candles.length - 1].close,
          candlesCount: candles.length
        };
      })
    );
    return { pair, snapshots: result };
  }
});

// src/tools/runMicroBacktest.ts
var import_tools2 = require("@mastra/core/tools");
var import_zod3 = require("zod");

// src/lib/strategies.ts
function runLayer0AtBar(candles, i) {
  if (i < 50) return { direction: "HOLD", confidence: 0, triggered: [] };
  const slice = candles.slice(0, i + 1);
  const closes = slice.map((c) => c.close);
  const last = closes[closes.length - 1];
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
  const donU = don.upper[ix - 1];
  const donL = don.lower[ix - 1];
  const triggered = [];
  let buyVotes = 0;
  let sellVotes = 0;
  if (e20 && e50 && e20 > e50 && Math.abs(last - e20) / last < 1e-3) {
    buyVotes++;
    triggered.push("S1:EMA-pullback-up");
  }
  if (e20 && e50 && e20 < e50 && Math.abs(last - e20) / last < 1e-3) {
    sellVotes++;
    triggered.push("S1:EMA-pullback-down");
  }
  if (r !== void 0 && !isNaN(r) && r < 30) {
    buyVotes++;
    triggered.push("S2:RSI-oversold");
  }
  if (r !== void 0 && !isNaN(r) && r > 70) {
    sellVotes++;
    triggered.push("S2:RSI-overbought");
  }
  if (bbL && last < bbL) {
    buyVotes++;
    triggered.push("S3:BB-lower");
  }
  if (bbU && last > bbU) {
    sellVotes++;
    triggered.push("S3:BB-upper");
  }
  if (donU && last > donU) {
    buyVotes++;
    triggered.push("S4:Donchian-up");
  }
  if (donL && last < donL) {
    sellVotes++;
    triggered.push("S4:Donchian-down");
  }
  if (e20 && e50 && e20 > e50 && last > e20) {
    buyVotes++;
    triggered.push("S5:trend-up");
  }
  if (e20 && e50 && e20 < e50 && last < e20) {
    sellVotes++;
    triggered.push("S5:trend-down");
  }
  const prev = closes[ix - 1];
  if (a && prev && last - prev > 0.5 * a) {
    buyVotes++;
    triggered.push("S6:momentum-up");
  }
  if (a && prev && prev - last > 0.5 * a) {
    sellVotes++;
    triggered.push("S6:momentum-down");
  }
  const atrSlice = atr.slice(-50).filter((v) => !isNaN(v));
  if (atrSlice.length > 10 && a) {
    const sorted = [...atrSlice].sort((a2, b) => a2 - b);
    const p30 = sorted[Math.floor(sorted.length * 0.3)];
    const p70 = sorted[Math.floor(sorted.length * 0.7)];
    if (a >= p30 && a <= p70) {
      if (buyVotes > sellVotes) {
        buyVotes++;
        triggered.push("S7:vol-regime");
      } else if (sellVotes > buyVotes) {
        sellVotes++;
        triggered.push("S7:vol-regime");
      }
    }
  }
  if (buyVotes >= 3 && buyVotes > sellVotes) {
    return {
      direction: "BUY",
      confidence: Math.min(95, 40 + buyVotes * 10),
      triggered
    };
  }
  if (sellVotes >= 3 && sellVotes > buyVotes) {
    return {
      direction: "SELL",
      confidence: Math.min(95, 40 + sellVotes * 10),
      triggered
    };
  }
  return { direction: "HOLD", confidence: 0, triggered };
}

// src/tools/runMicroBacktest.ts
var runMicroBacktestTool = (0, import_tools2.createTool)({
  id: "run_micro_backtest",
  description: "Replay the deterministic Layer 0 strategy on the last N historical candles and report win-rate, average R-multiple, and sample size. Use this to validate that the proposed direction has historically worked on this pair under the current volatility regime.",
  inputSchema: import_zod3.z.object({
    pair: import_zod3.z.string(),
    direction: import_zod3.z.enum(["BUY", "SELL"]),
    timeframe: import_zod3.z.enum(["15min", "1h", "4h", "1day"]).default("1h"),
    slMultiplier: import_zod3.z.number().default(1.5).describe("SL = entry - slMultiplier * ATR (BUY)"),
    tpMultiplier: import_zod3.z.number().default(3).describe("TP = entry + tpMultiplier * ATR (BUY)"),
    lookback: import_zod3.z.number().int().min(100).max(500).default(300).describe("Bars to scan"),
    forwardBars: import_zod3.z.number().int().min(6).max(100).default(24).describe("Bars to wait for SL/TP")
  }),
  outputSchema: import_zod3.z.object({
    winRate: import_zod3.z.number().describe("Percentage 0-100"),
    avgR: import_zod3.z.number().describe("Average R-multiple realized (positive = profitable)"),
    sampleSize: import_zod3.z.number(),
    regimeMatch: import_zod3.z.boolean().describe("True if current ATR is within 30-70 percentile of historical setups ATR"),
    setupsScanned: import_zod3.z.number()
  }),
  execute: async ({ context }) => {
    const { pair, direction, timeframe, slMultiplier, tpMultiplier, lookback, forwardBars } = context;
    const total = lookback + forwardBars + 50;
    const candles = await fetchTwelveDataCandles(pair, timeframe, total);
    if (candles.length < 100) {
      return { winRate: 0, avgR: 0, sampleSize: 0, regimeMatch: false, setupsScanned: 0 };
    }
    const atrSeries = computeATR(candles, 14);
    const setupATRs = [];
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
      const entry = candles[i].close;
      const slDist = slMultiplier * atrAtSetup;
      const tpDist = tpMultiplier * atrAtSetup;
      const sl = direction === "BUY" ? entry - slDist : entry + slDist;
      const tp = direction === "BUY" ? entry + tpDist : entry - tpDist;
      let outcome = "TIMEOUT";
      for (let j = i + 1; j <= i + forwardBars && j < candles.length; j++) {
        const c = candles[j];
        if (direction === "BUY") {
          if (c.low <= sl) {
            outcome = "SL";
            break;
          }
          if (c.high >= tp) {
            outcome = "TP";
            break;
          }
        } else {
          if (c.high >= sl) {
            outcome = "SL";
            break;
          }
          if (c.low <= tp) {
            outcome = "TP";
            break;
          }
        }
      }
      sample++;
      setupATRs.push(atrAtSetup);
      if (outcome === "TP") {
        wins++;
        totalR += tpMultiplier / slMultiplier;
      } else if (outcome === "SL") {
        totalR -= 1;
      }
    }
    const currentATR = atrSeries[atrSeries.length - 1] ?? 0;
    let regimeMatch = false;
    if (setupATRs.length >= 5 && currentATR > 0) {
      const sorted = [...setupATRs].sort((a, b) => a - b);
      const p30 = sorted[Math.floor(sorted.length * 0.3)];
      const p70 = sorted[Math.floor(sorted.length * 0.7)];
      regimeMatch = currentATR >= p30 && currentATR <= p70;
    }
    return {
      winRate: sample > 0 ? Math.round(wins / sample * 100) : 0,
      avgR: sample > 0 ? Math.round(totalR / sample * 100) / 100 : 0,
      sampleSize: sample,
      regimeMatch,
      setupsScanned: scanned
    };
  }
});

// src/tools/fetchSessionContext.ts
var import_tools3 = require("@mastra/core/tools");
var import_zod4 = require("zod");
var fetchSessionContextTool = (0, import_tools3.createTool)({
  id: "fetch_session_context",
  description: "Identify which forex trading session is currently active (Tokyo / London / New York). Useful for risk-sizing decisions: London + NY overlap has highest liquidity, Asian-only sessions have wider spreads and choppier moves.",
  inputSchema: import_zod4.z.object({
    pair: import_zod4.z.string()
  }),
  outputSchema: import_zod4.z.object({
    pair: import_zod4.z.string(),
    activeSessions: import_zod4.z.array(import_zod4.z.enum(["TOKYO", "LONDON", "NEW_YORK"])),
    isHighLiquidity: import_zod4.z.boolean().describe("True during London-NY overlap"),
    nextSession: import_zod4.z.string(),
    note: import_zod4.z.string()
  }),
  execute: async ({ context }) => {
    const { pair } = context;
    const utcHour = (/* @__PURE__ */ new Date()).getUTCHours();
    const active = [];
    if (utcHour >= 23 || utcHour < 8) active.push("TOKYO");
    if (utcHour >= 7 && utcHour < 16) active.push("LONDON");
    if (utcHour >= 12 && utcHour < 21) active.push("NEW_YORK");
    const isHighLiquidity = active.includes("LONDON") && active.includes("NEW_YORK");
    let nextSession = "TOKYO opens 23:00 UTC";
    if (utcHour < 7) nextSession = "LONDON opens 07:00 UTC";
    else if (utcHour < 12) nextSession = "NEW_YORK opens 12:00 UTC";
    else if (utcHour < 16) nextSession = "LONDON closes 16:00 UTC";
    else if (utcHour < 21) nextSession = "NEW_YORK closes 21:00 UTC";
    else if (utcHour < 23) nextSession = "TOKYO opens 23:00 UTC";
    let note = "";
    if (isHighLiquidity) note = "London-NY overlap: high liquidity, tight spreads, suitable for breakouts.";
    else if (active.length === 0) note = "No major session active: thin liquidity, avoid breakouts.";
    else if (active.includes("TOKYO") && active.length === 1) note = "Asian-only session: choppy ranges typical, mean-reversion may work better than trend.";
    else note = "Single major session active.";
    return { pair, activeSessions: active, isHighLiquidity, nextSession, note };
  }
});

// src/lib/llm.ts
var import_sdk = __toESM(require("@anthropic-ai/sdk"));
async function callDeepSeekJSON(messages, schema, opts = {}) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY missing");
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: opts.model ?? "deepseek-chat",
      messages,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 1024,
      response_format: { type: "json_object" }
    })
  });
  if (!res.ok) {
    throw new Error(`DeepSeek HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek empty response");
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("DeepSeek response not valid JSON");
    parsed = JSON.parse(m[0]);
  }
  return schema.parse(parsed);
}
var _claude = null;
function getClaude() {
  if (!_claude) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY missing");
    _claude = new import_sdk.default({ apiKey });
  }
  return _claude;
}
async function callClaudeJSON(systemPrompt, userPrompt, schema, jsonSchemaForTool, opts = {}) {
  const claude = getClaude();
  const response = await claude.messages.create({
    model: opts.model ?? "claude-3-5-sonnet-20241022",
    max_tokens: opts.maxTokens ?? 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    tools: [
      {
        name: "respond",
        description: "Provide the structured response.",
        input_schema: jsonSchemaForTool
      }
    ],
    tool_choice: { type: "tool", name: "respond" }
  });
  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return tool_use block");
  }
  return schema.parse(toolUse.input);
}
async function callPerplexity(messages, opts = {}) {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new Error("PERPLEXITY_API_KEY missing");
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: opts.model ?? "sonar",
      messages,
      temperature: opts.temperature ?? 0.2,
      max_tokens: 1024
    })
  });
  if (!res.ok) throw new Error(`Perplexity HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// src/agents/strategyRunners.ts
async function gatherCommonContext(ctx, tfs = ["1h", "4h", "1day"]) {
  const [klines, backtest, session] = await Promise.all([
    fetchKlinesMultiTFTool.execute({
      context: { pair: ctx.pair, timeframes: tfs, outputsize: 200 }
    }),
    runMicroBacktestTool.execute({
      context: {
        pair: ctx.pair,
        direction: ctx.direction,
        timeframe: "1h",
        slMultiplier: 1.5,
        tpMultiplier: 3,
        lookback: 300,
        forwardBars: 24
      }
    }),
    fetchSessionContextTool.execute({ context: { pair: ctx.pair } })
  ]);
  return { klines, backtest, session };
}
async function runTrendAgent(ctx) {
  const { klines, backtest } = await gatherCommonContext(ctx);
  const SYSTEM2 = `You are a TREND-FOLLOWING SPECIALIST. Confirm only setups aligned with HTF trend (4h + daily). Counter-trend = REJECT. Respond ONLY with JSON.`;
  const tf1h = klines.snapshots["1h"];
  const tf4h = klines.snapshots["4h"];
  const tfD = klines.snapshots["1day"];
  const userPrompt = `Analyze ${ctx.pair} for ${ctx.direction} TREND-FOLLOWING setup.

Multi-TF data:
- 1h: EMA20=${tf1h.ema20.toFixed(5)}, EMA50=${tf1h.ema50.toFixed(5)}, EMA200=${tf1h.ema200.toFixed(5)}, RSI=${tf1h.rsi.toFixed(1)}, slope20=${tf1h.slope20Pct.toFixed(3)}%, trend=${tf1h.trend}, current=${tf1h.currentPrice.toFixed(5)}
- 4h: EMA20=${tf4h.ema20.toFixed(5)}, EMA50=${tf4h.ema50.toFixed(5)}, slope20=${tf4h.slope20Pct.toFixed(3)}%, trend=${tf4h.trend}
- Daily: EMA20=${tfD.ema20.toFixed(5)}, slope20=${tfD.slope20Pct.toFixed(3)}%, trend=${tfD.trend}
- 1h ATR: ${tf1h.atr.toFixed(6)}

Backtest of L0 ${ctx.direction} on this pair (last 300 1h bars):
- winRate=${backtest.winRate}%, avgR=${backtest.avgR}, sampleSize=${backtest.sampleSize}, regimeMatch=${backtest.regimeMatch}

Rules:
- CONFIRM (70-90) only if 4h trend == Daily trend == ${ctx.direction} AND winRate >= 55% (sample >= 8)
- REJECT (0-30) if HTF counter to ${ctx.direction} OR winRate < 40%
- SKIP (30-50) if EMAs flat (|slope| < 0.02%) or sample < 5

Return JSON exactly:
{
  "verdict": "CONFIRM" | "REJECT" | "SKIP",
  "confidence": <0-100>,
  "reasoning": "<max 250 chars>",
  "htfAligned": <bool>,
  "trendStrength": "STRONG" | "MODERATE" | "WEAK",
  "backtest": { "winRate": ${backtest.winRate}, "sampleSize": ${backtest.sampleSize} }
}`;
  return callDeepSeekJSON(
    [
      { role: "system", content: SYSTEM2 },
      { role: "user", content: userPrompt }
    ],
    StrategyVerdictSchema,
    { temperature: 0.3 }
  );
}
async function runMeanRevAgent(ctx) {
  const klines = await fetchKlinesMultiTFTool.execute({
    context: { pair: ctx.pair, timeframes: ["1h", "4h", "1day"], outputsize: 200 }
  });
  const backtest = await runMicroBacktestTool.execute({
    context: {
      pair: ctx.pair,
      direction: ctx.direction,
      timeframe: "1h",
      slMultiplier: 1,
      tpMultiplier: 2,
      lookback: 300,
      forwardBars: 12
    }
  });
  const tf1h = klines.snapshots["1h"];
  const tf4h = klines.snapshots["4h"];
  const SYSTEM2 = `You are a MEAN-REVERSION SPECIALIST. You hunt extremes ready to revert. Avoid trending markets. Respond ONLY with JSON.`;
  const userPrompt = `Analyze ${ctx.pair} for ${ctx.direction} MEAN-REVERSION setup.

Data:
- 1h: RSI=${tf1h.rsi.toFixed(1)}, BB widthPct=${tf1h.bbWidthPct.toFixed(2)}%, ATR=${tf1h.atr.toFixed(6)}, trend=${tf1h.trend}, current=${tf1h.currentPrice.toFixed(5)}
- 4h: RSI=${tf4h.rsi.toFixed(1)}, trend=${tf4h.trend}

Backtest (tighter MR-style stops): winRate=${backtest.winRate}%, sample=${backtest.sampleSize}, regimeMatch=${backtest.regimeMatch}

Rules for ${ctx.direction}:
${ctx.direction === "BUY" ? "- CONFIRM only if 1h RSI < 35 AND 4h trend != DOWN (no falling-knife) AND winRate >= 50%\n- REJECT if 4h trend strongly DOWN AND daily DOWN" : "- CONFIRM only if 1h RSI > 65 AND 4h trend != UP (no chasing) AND winRate >= 50%\n- REJECT if 4h trend strongly UP AND daily UP"}
- SKIP when RSI 40-60 (no extreme)

Return JSON:
{ "verdict": "CONFIRM"|"REJECT"|"SKIP", "confidence": <0-100>, "reasoning": "<max 250>", "extremeLevel": "EXTREME"|"ELEVATED"|"NEUTRAL", "divergenceDetected": <bool>, "backtest": {"winRate": ${backtest.winRate}, "sampleSize": ${backtest.sampleSize}} }`;
  return callDeepSeekJSON(
    [{ role: "system", content: SYSTEM2 }, { role: "user", content: userPrompt }],
    StrategyVerdictSchema,
    { temperature: 0.3 }
  );
}
async function runBreakoutAgent(ctx) {
  const { klines, backtest, session } = await gatherCommonContext(ctx);
  const breakoutBT = await runMicroBacktestTool.execute({
    context: {
      pair: ctx.pair,
      direction: ctx.direction,
      timeframe: "1h",
      slMultiplier: 2,
      tpMultiplier: 4,
      lookback: 300,
      forwardBars: 24
    }
  }).catch(() => backtest);
  const tf1h = klines.snapshots["1h"];
  const SYSTEM2 = `You are a BREAKOUT SPECIALIST. Confirm true breakouts with follow-through. Squeeze before breakout = best. Respond ONLY with JSON.`;
  const userPrompt = `Analyze ${ctx.pair} for ${ctx.direction} BREAKOUT setup.

Data:
- 1h: BB widthPct=${tf1h.bbWidthPct.toFixed(3)}%, ATR=${tf1h.atr.toFixed(6)}, current=${tf1h.currentPrice.toFixed(5)}, trend=${tf1h.trend}
- Session: active=[${session.activeSessions.join(",")}], highLiquidity=${session.isHighLiquidity}, note: ${session.note}

Breakout-style backtest (slM=2.0, tpM=4.0): winRate=${breakoutBT.winRate}%, sample=${breakoutBT.sampleSize}, regimeMatch=${breakoutBT.regimeMatch}

Rules:
- CONFIRM (70-90) when bbWidthPct < 0.4% (squeeze) AND major session active AND winRate >= 50%
- REJECT (0-30) when bbWidthPct > 1.5% (already volatile) OR no major session OR winRate < 40%
- SKIP otherwise

Return JSON:
{ "verdict": "CONFIRM"|"REJECT"|"SKIP", "confidence": <0-100>, "reasoning": "<max 250>", "breakoutType": "RANGE"|"SQUEEZE"|"TREND_CONTINUATION"|"NONE", "followThroughLikely": <bool>, "backtest": {"winRate": ${breakoutBT.winRate}, "sampleSize": ${breakoutBT.sampleSize}} }`;
  return callDeepSeekJSON(
    [{ role: "system", content: SYSTEM2 }, { role: "user", content: userPrompt }],
    StrategyVerdictSchema,
    { temperature: 0.3 }
  );
}

// src/tools/fetchCalendar.ts
var import_tools4 = require("@mastra/core/tools");
var import_zod5 = require("zod");
var CCY_FROM_PAIR = (pair) => {
  const [a, b] = pair.split("/");
  return [a ?? "", b ?? ""].filter(Boolean);
};
var fetchCalendarTool = (0, import_tools4.createTool)({
  id: "fetch_economic_calendar",
  description: "Fetch upcoming high-impact economic events for the currencies in a forex pair within a time window. Use this to detect event risk that could invalidate a technical setup (rate decisions, CPI, NFP, FOMC).",
  inputSchema: import_zod5.z.object({
    pair: import_zod5.z.string(),
    hoursAhead: import_zod5.z.number().int().min(1).max(168).default(24)
  }),
  outputSchema: import_zod5.z.object({
    pair: import_zod5.z.string(),
    eventsCount: import_zod5.z.number(),
    highImpactCount: import_zod5.z.number(),
    nextHighImpact: import_zod5.z.string().nullable(),
    events: import_zod5.z.array(import_zod5.z.object({
      time: import_zod5.z.string(),
      currency: import_zod5.z.string(),
      event: import_zod5.z.string(),
      importance: import_zod5.z.number().min(0).max(3)
    }))
  }),
  execute: async ({ context }) => {
    const { pair, hoursAhead } = context;
    const cacheKey = `cal:${pair}:${hoursAhead}`;
    const cached = await kvGet(cacheKey);
    if (cached) return cached;
    const ccys = CCY_FROM_PAIR(pair);
    const now = Date.now();
    const until = now + hoursAhead * 36e5;
    let events = [];
    const teKey = process.env.TRADINGECONOMICS_API_KEY;
    if (teKey) {
      try {
        const url = `https://api.tradingeconomics.com/calendar?c=${teKey}&format=json`;
        const res = await fetch(url);
        if (res.ok) {
          const items = await res.json();
          events = items.filter((it) => {
            const ts = new Date(it.Date).getTime();
            if (isNaN(ts) || ts < now || ts > until) return false;
            return it.Currency && ccys.includes(it.Currency.toUpperCase());
          }).map((it) => ({
            time: it.Date,
            currency: (it.Currency ?? "").toUpperCase(),
            event: it.Event ?? "",
            importance: it.Importance ?? 0
          }));
        }
      } catch {
      }
    }
    const highImpactCount = events.filter((e) => e.importance >= 3).length;
    const next = events.find((e) => e.importance >= 3);
    const result = {
      pair,
      eventsCount: events.length,
      highImpactCount,
      nextHighImpact: next ? `${next.time} ${next.currency} ${next.event}` : null,
      events: events.slice(0, 20)
    };
    await kvSet(cacheKey, result, 60 * 30);
    return result;
  }
});

// src/agents/macroAgent.ts
var SYSTEM = `You are a macro/fundamental FX analyst with web search. Find recent news and upcoming events for the currency pair. Always respond with VALID JSON only \u2014 no preamble, no markdown fences.`;
async function runMacroAgent(ctx) {
  const cacheKey = `macro:${ctx.pair}:${ctx.direction}`;
  const cached = await kvGet(cacheKey);
  if (cached) return cached;
  let calendarSummary = "Calendar data unavailable.";
  try {
    const cal = await fetchCalendarTool.execute({
      context: { pair: ctx.pair, hoursAhead: 24 }
    });
    if (cal.eventsCount > 0) {
      calendarSummary = `Events next 24h: ${cal.eventsCount} total, ${cal.highImpactCount} high-impact. ` + (cal.nextHighImpact ? `Next major: ${cal.nextHighImpact}.` : "No major events.");
    } else {
      calendarSummary = "No scheduled events in next 24h.";
    }
  } catch {
  }
  const userPrompt = `Analyze macro context for ${ctx.pair}, proposed direction ${ctx.direction}.

Pre-fetched calendar context:
${calendarSummary}

Search the web for:
1. Last 48h economic releases for ${ctx.pair.split("/")[0]} and ${ctx.pair.split("/")[1]}
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
  let result;
  try {
    const text = await callPerplexity([
      { role: "system", content: SYSTEM },
      { role: "user", content: userPrompt }
    ]);
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("Perplexity returned no JSON");
    const parsed = JSON.parse(m[0]);
    result = MacroVerdictSchema.parse(parsed);
  } catch {
    result = await callDeepSeekJSON(
      [
        { role: "system", content: SYSTEM + " (No web access; reason from training data and the calendar context.)" },
        { role: "user", content: userPrompt }
      ],
      MacroVerdictSchema,
      { temperature: 0.3 }
    );
  }
  await kvSet(cacheKey, result, 60 * 30);
  return result;
}

// src/tools/fetchCorrelationMatrix.ts
var import_tools5 = require("@mastra/core/tools");
var import_zod6 = require("zod");
var MAJORS = ["EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD", "NZD/USD"];
function pearson(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < 10) return 0;
  let sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i];
    const y = b[i];
    sa += x;
    sb += y;
    saa += x * x;
    sbb += y * y;
    sab += x * y;
  }
  const num = n * sab - sa * sb;
  const den = Math.sqrt((n * saa - sa * sa) * (n * sbb - sb * sb));
  return den === 0 ? 0 : num / den;
}
function returns(values) {
  const r = [];
  for (let i = 1; i < values.length; i++) r.push((values[i] - values[i - 1]) / values[i - 1]);
  return r;
}
var fetchCorrelationMatrixTool = (0, import_tools5.createTool)({
  id: "fetch_correlation_matrix",
  description: "Compute 30-day Pearson correlation between the requested pair and major FX pairs. Use to detect crowded/redundant exposure (e.g., if you also hold EUR/USD long, consider correlation before going long GBP/USD).",
  inputSchema: import_zod6.z.object({
    pair: import_zod6.z.string(),
    days: import_zod6.z.number().int().min(10).max(90).default(30)
  }),
  outputSchema: import_zod6.z.object({
    pair: import_zod6.z.string(),
    correlations: import_zod6.z.array(import_zod6.z.object({
      otherPair: import_zod6.z.string(),
      correlation: import_zod6.z.number().min(-1).max(1),
      label: import_zod6.z.enum(["STRONG_POSITIVE", "POSITIVE", "NEUTRAL", "NEGATIVE", "STRONG_NEGATIVE"])
    }))
  }),
  execute: async ({ context }) => {
    const { pair, days } = context;
    const cacheKey = `corr:${pair}:${days}`;
    const cached = await kvGet(cacheKey);
    if (cached) return cached;
    const others = MAJORS.filter((p) => p !== pair);
    const allPairs = [pair, ...others];
    const seriesByPair = {};
    await Promise.all(allPairs.map(async (p) => {
      try {
        const c = await fetchTwelveDataCandles(p, "1day", days + 5);
        seriesByPair[p] = returns(c.map((k) => k.close));
      } catch {
        seriesByPair[p] = [];
      }
    }));
    const base = seriesByPair[pair] ?? [];
    const correlations = others.map((other) => {
      const corr = pearson(base, seriesByPair[other] ?? []);
      let label = "NEUTRAL";
      if (corr >= 0.7) label = "STRONG_POSITIVE";
      else if (corr >= 0.3) label = "POSITIVE";
      else if (corr <= -0.7) label = "STRONG_NEGATIVE";
      else if (corr <= -0.3) label = "NEGATIVE";
      return { otherPair: other, correlation: Math.round(corr * 100) / 100, label };
    });
    const result = { pair, correlations };
    await kvSet(cacheKey, result, 60 * 60 * 6);
    return result;
  }
});

// src/agents/riskAgent.ts
async function runRiskAgent(input) {
  const { ctx } = input;
  const candles1h = await fetchTwelveDataCandles(ctx.pair, "1h", 200);
  const atrSeries = computeATR(candles1h, 14);
  const atr = atrSeries[atrSeries.length - 1] ?? 0;
  const swings = findSwingPoints(candles1h, 20);
  let correlationNote = "";
  try {
    const corr = await fetchCorrelationMatrixTool.execute({
      context: { pair: ctx.pair, days: 30 }
    });
    const strong = corr.correlations.filter((c) => Math.abs(c.correlation) >= 0.7);
    if (strong.length > 0) {
      correlationNote = `STRONG correlations (${strong.map((s) => `${s.otherPair}=${s.correlation}`).join(", ")}). Reduce size if user holds correlated pairs.`;
    } else {
      correlationNote = "No strong correlations with majors \u2014 independent exposure.";
    }
  } catch {
    correlationNote = "Correlation data unavailable.";
  }
  const consensus = [input.trend, input.meanRev, input.breakout].filter(Boolean);
  const confirms = consensus.filter((v) => v.verdict === "CONFIRM").length;
  const rejects = consensus.filter((v) => v.verdict === "REJECT").length;
  const SYSTEM2 = `You are a RISK MANAGER. You DO NOT decide direction \u2014 that is already determined.
You output concrete trade levels using the volatility (ATR) and recent swings.
Always return VALID JSON only. All numbers must be actual values, not formulas.`;
  const userPrompt = `Calculate risk levels for ${ctx.pair} ${ctx.direction} at ${ctx.currentPrice}.

Market data:
- ATR(14) on 1h: ${atr.toFixed(6)}
- Recent 20-bar swing high: ${swings.swingHigh.toFixed(6)}
- Recent 20-bar swing low: ${swings.swingLow.toFixed(6)}
- Current price: ${ctx.currentPrice}

Council consensus:
- Trend: ${input.trend ? `${input.trend.verdict} (${input.trend.confidence}%)` : "unavailable"}
- Mean-Rev: ${input.meanRev ? `${input.meanRev.verdict} (${input.meanRev.confidence}%)` : "unavailable"}
- Breakout: ${input.breakout ? `${input.breakout.verdict} (${input.breakout.confidence}%)` : "unavailable"}
- Macro: ${input.macro ? `${input.macro.verdict} (${input.macro.confidence}%)` : "unavailable"}
- Strategy CONFIRMs: ${confirms}, REJECTs: ${rejects}
- Correlation: ${correlationNote}

Calculate (all in absolute price terms, NOT pips):
- entryZone: low and high of a band \xB10.25*ATR around currentPrice
- stopLoss:
   - For BUY: ${ctx.currentPrice} - max(1.5*ATR, distance to swingLow + 0.1*ATR)
   - For SELL: ${ctx.currentPrice} + max(1.5*ATR, distance to swingHigh + 0.1*ATR)
   - Use the wider of the two so stop is realistic
- takeProfit1, 2, 3: at 1R, 2R, 3R where R = |entry - SL|
- positionSizePct (% of account):
   - 3 strategy CONFIRMs + macro CONFIRM = 2.0
   - 3 CONFIRMs but macro NEUTRAL = 1.5
   - 2 CONFIRMs = 1.0
   - 1 CONFIRM (others NEUTRAL/SKIP, no REJECTs) = 0.5
   - any REJECT = 0
   - if correlation note says STRONG, multiply by 0.6 (reduce exposure)
- riskRewardTp1: TP1_distance / SL_distance (should be 1.0)
- consensusStrength: 'STRONG' (3 confirms), 'MIXED' (2 confirms or some neutrals), 'WEAK' (1 confirm)

Return ONLY this JSON:
{
  "entryZone": { "low": <num>, "high": <num> },
  "stopLoss": <num>,
  "takeProfit1": <num>,
  "takeProfit2": <num>,
  "takeProfit3": <num>,
  "positionSizePct": <num>,
  "riskRewardTp1": <num>,
  "consensusStrength": "STRONG" | "MIXED" | "WEAK"
}`;
  return callDeepSeekJSON(
    [
      { role: "system", content: SYSTEM2 },
      { role: "user", content: userPrompt }
    ],
    RiskOutputSchema,
    { temperature: 0.1 }
    // very deterministic for risk math
  );
}

// src/agents/judgeAgent.ts
var JUDGE_JSON_SCHEMA = {
  type: "object",
  properties: {
    decision: { type: "string", enum: ["PUBLISH", "HOLD", "DROP"] },
    finalDirection: { type: "string", enum: ["BUY", "SELL", "HOLD"] },
    finalConfidence: { type: "number", minimum: 0, maximum: 100 },
    keyThesis: { type: "string", maxLength: 500 },
    mainRisk: { type: "string", maxLength: 300 },
    expectedHoldMinutes: { type: "integer", minimum: 15, maximum: 2880 }
  },
  required: ["decision", "finalDirection", "finalConfidence", "keyThesis", "mainRisk", "expectedHoldMinutes"]
};
async function runJudgeAgent(input) {
  const { ctx, trend, meanRev, breakout, macro, risk, backtest } = input;
  const SYSTEM2 = `You are the FINAL JUDGE of a trading signal council. You aggregate verdicts from 4 strategy specialists, the risk manager output, and historical backtest data.
You make a CALIBRATED decision: PUBLISH only when evidence warrants. Conservative bias preferred \u2014 false positives cost more than missed signals.
You return only the structured response via the provided tool.`;
  const consensus = [trend, meanRev, breakout].filter(Boolean);
  const confirms = consensus.filter((v) => v.verdict === "CONFIRM").length;
  const rejects = consensus.filter((v) => v.verdict === "REJECT").length;
  const userPrompt = `Final verdict needed for ${ctx.pair} ${ctx.direction} at ${ctx.currentPrice}.

L0 deterministic strategies fired with confidence ${ctx.l0Confidence}% from triggers: ${ctx.triggeredStrategies.join(", ")}.

Strategy Council:
${trend ? `- Trend: ${trend.verdict} (${trend.confidence}%) \u2014 ${trend.reasoning}` : "- Trend: UNAVAILABLE"}
${meanRev ? `- Mean-Rev: ${meanRev.verdict} (${meanRev.confidence}%) \u2014 ${meanRev.reasoning}` : "- Mean-Rev: UNAVAILABLE"}
${breakout ? `- Breakout: ${breakout.verdict} (${breakout.confidence}%) \u2014 ${breakout.reasoning}` : "- Breakout: UNAVAILABLE"}
${macro ? `- Macro: ${macro.verdict} (${macro.confidence}%) \u2014 ${macro.newsSummary}; key event next 12h: ${macro.keyEventNext12h ?? "none"}` : "- Macro: UNAVAILABLE"}

Aggregated: ${confirms} CONFIRMs, ${rejects} REJECTs.

Risk Manager output: ${risk ? `entry ~${(risk.entryZone.low + risk.entryZone.high) / 2}, SL ${risk.stopLoss}, TP1 ${risk.takeProfit1} (RR ${risk.riskRewardTp1}), positionSize ${risk.positionSizePct}%, consensus ${risk.consensusStrength}` : "UNAVAILABLE"}.

Historical micro-backtest of L0 on this pair (last 300 bars):
- winRate: ${backtest.winRate}%
- avgR: ${backtest.avgR}
- sampleSize: ${backtest.sampleSize}
- regimeMatch: ${backtest.regimeMatch}

DECISION RULES:
- DROP if: macro REJECT, OR rejects >= 2, OR (backtest.sampleSize >= 10 AND backtest.winRate < 45%), OR risk.positionSizePct == 0
- HOLD if: confirms == 1 AND no rejects, OR (backtest.sampleSize >= 10 AND backtest.winRate in [45,55))
- PUBLISH otherwise (when confirms >= 2, no critical rejects, backtest acceptable)

FINAL CONFIDENCE FORMULA:
- Base: weighted average of CONFIRMing agents' confidence (weight by their own confidence)
- Multiply by (winRate/100) if sampleSize >= 10, else multiply by 0.85 (penalty for thin data)
- +5pp bonus if all 3 strategy agents CONFIRM
- +5pp bonus if regimeMatch == true
- +3pp bonus if macro CONFIRM
- Cap at 95
- Floor at 0

Use \`respond\` tool with this exact schema:
{ decision, finalDirection, finalConfidence, keyThesis, mainRisk, expectedHoldMinutes }

Notes for fields:
- finalDirection should equal ${ctx.direction} on PUBLISH/HOLD; only HOLD if dropping confidence-only; on DROP set 'HOLD'
- keyThesis: one short paragraph synthesizing why this trade makes sense (or doesn't)
- mainRisk: the single most important thing that could invalidate it
- expectedHoldMinutes: realistic hold duration based on direction strength and TP1 distance (typical: trend 240-480, mean-rev 60-180, breakout 120-360)`;
  try {
    return await callClaudeJSON(SYSTEM2, userPrompt, JudgeVerdictSchema, JUDGE_JSON_SCHEMA, {
      model: "claude-3-5-sonnet-20241022",
      maxTokens: 1024
    });
  } catch (err) {
    console.warn("Claude judge failed, falling back to DeepSeek:", err);
    return callDeepSeekJSON(
      [
        { role: "system", content: SYSTEM2 + " Return ONLY a JSON object, no markdown." },
        { role: "user", content: userPrompt }
      ],
      JudgeVerdictSchema,
      { temperature: 0.2, maxTokens: 1024 }
    );
  }
}

// src/workflow/council.ts
async function runCouncilForCandidate(candidate) {
  const t0 = Date.now();
  const ctx = {
    pair: candidate.pair,
    direction: candidate.direction,
    currentPrice: candidate.currentPrice,
    l0Confidence: candidate.l0Confidence,
    triggeredStrategies: candidate.triggeredStrategies
  };
  const [trend, meanRev, breakout, macro] = await Promise.all([
    runTrendAgent(ctx).catch((err) => {
      console.warn(`[council] trendAgent failed for ${ctx.pair}:`, err);
      return null;
    }),
    runMeanRevAgent(ctx).catch((err) => {
      console.warn(`[council] meanRevAgent failed for ${ctx.pair}:`, err);
      return null;
    }),
    runBreakoutAgent(ctx).catch((err) => {
      console.warn(`[council] breakoutAgent failed for ${ctx.pair}:`, err);
      return null;
    }),
    runMacroAgent(ctx).catch((err) => {
      console.warn(`[council] macroAgent failed for ${ctx.pair}:`, err);
      return null;
    })
  ]);
  const allFailed = !trend && !meanRev && !breakout && !macro;
  if (allFailed) {
    return {
      candidate,
      verdicts: { trend, meanRev, breakout, macro },
      signal: null,
      decision: "DROP",
      reason: "all-agents-failed",
      durationMs: Date.now() - t0
    };
  }
  const risk = await runRiskAgent({ ctx, trend, meanRev, breakout, macro }).catch((err) => {
    console.warn(`[council] riskAgent failed for ${ctx.pair}:`, err);
    return null;
  });
  const backtest = await runMicroBacktestTool.execute({
    context: {
      pair: ctx.pair,
      direction: ctx.direction,
      timeframe: "1h",
      slMultiplier: 1.5,
      tpMultiplier: 3,
      lookback: 300,
      forwardBars: 24
    }
  }).catch(() => ({ winRate: 0, avgR: 0, sampleSize: 0, regimeMatch: false, setupsScanned: 0 }));
  const judge = await runJudgeAgent({
    ctx,
    trend,
    meanRev,
    breakout,
    macro,
    risk,
    backtest
  }).catch((err) => {
    console.error(`[council] judge failed for ${ctx.pair}:`, err);
    return null;
  });
  if (!judge) {
    return {
      candidate,
      verdicts: { trend, meanRev, breakout, macro },
      signal: null,
      decision: "DROP",
      reason: "judge-failed",
      durationMs: Date.now() - t0
    };
  }
  if (judge.decision === "DROP") {
    return {
      candidate,
      verdicts: { trend, meanRev, breakout, macro },
      signal: null,
      decision: "DROP",
      reason: judge.mainRisk || "judge-dropped",
      durationMs: Date.now() - t0
    };
  }
  let spread = 15e-5;
  let entry = ctx.currentPrice;
  try {
    const q = await fetchTwelveDataQuote(ctx.pair);
    spread = q.spread || spread;
    entry = q.price || ctx.currentPrice;
  } catch {
  }
  let entryMid = entry;
  let stopLoss = ctx.direction === "BUY" ? entry * 0.992 : entry * 1.008;
  let tps = [entry * 1.015, entry * 1.025, entry * 1.04];
  let positionSize = 1;
  let rr1 = 1;
  if (risk) {
    entryMid = (risk.entryZone.low + risk.entryZone.high) / 2;
    stopLoss = risk.stopLoss;
    tps = [risk.takeProfit1, risk.takeProfit2, risk.takeProfit3];
    positionSize = risk.positionSizePct;
    rr1 = risk.riskRewardTp1;
  }
  const layers = [
    true,
    // L0: deterministic strategies fired
    !!trend && trend.verdict === "CONFIRM",
    // L1: Trend
    !!meanRev && meanRev.verdict === "CONFIRM",
    // L2: Mean-Rev
    !!breakout && breakout.verdict === "CONFIRM",
    // L3: Breakout
    !!macro && macro.verdict === "CONFIRM"
    // L4: Macro
  ];
  const layerConfidences = [
    candidate.l0Confidence,
    trend?.confidence ?? 0,
    meanRev?.confidence ?? 0,
    breakout?.confidence ?? 0,
    macro?.confidence ?? 0
  ];
  const finalConfidence = judge.decision === "HOLD" ? Math.min(judge.finalConfidence, 60) : judge.finalConfidence;
  const signal = {
    id: `${ctx.pair.replace("/", "")}-${Date.now()}`,
    instrument: ctx.pair,
    category: "FOREX",
    tier: "PRO",
    direction: judge.finalDirection,
    entry: entryMid,
    target: tps[0],
    stop: stopLoss,
    takeProfits: tps,
    confidence: finalConfidence,
    vitality: 100,
    timestamp: Date.now(),
    spread,
    layers,
    layerConfidences,
    status: "active",
    sourceLayers: ["L0", ...trend ? ["L1"] : [], ...meanRev ? ["L2"] : [], ...breakout ? ["L3"] : [], ...macro ? ["L4"] : []],
    thesis: judge.keyThesis,
    mainRisk: judge.mainRisk,
    positionSizePct: positionSize,
    riskRewardTp1: rr1,
    expectedHoldMinutes: judge.expectedHoldMinutes,
    backtestWinRate: backtest.winRate,
    backtestSampleSize: backtest.sampleSize
  };
  return {
    candidate,
    verdicts: { trend, meanRev, breakout, macro },
    signal,
    decision: judge.decision,
    reason: judge.keyThesis.slice(0, 200),
    durationMs: Date.now() - t0
  };
}

// src/inngest/client.ts
var import_inngest = require("inngest");
var inngest = new import_inngest.Inngest({
  id: "forexai-engine",
  name: "ForexAI Engine",
  eventKey: process.env.INNGEST_EVENT_KEY
});

// handlers/council.ts
var ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? "https://xyc-fron.vercel.app";
var INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? "";
function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Vary", "Origin");
  res.setHeader("Content-Type", "application/json");
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  const authHeader = req.headers["authorization"] ?? "";
  if (INTERNAL_API_KEY && authHeader !== `Bearer ${INTERNAL_API_KEY}`) {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: "unauthorized" }));
    return;
  }
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "method-not-allowed" }));
    return;
  }
  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "invalid-json" }));
    return;
  }
  const parsed = CouncilRequestSchema.safeParse(body);
  if (!parsed.success) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "validation", details: parsed.error.flatten() }));
    return;
  }
  const urlObj = new URL(req.url ?? "/", `https://${req.headers.host ?? "localhost"}`);
  const mode = urlObj.searchParams.get("mode");
  if (mode === "async") {
    await inngest.send({ name: "council/run", data: { candidates: parsed.data.candidates } });
    res.statusCode = 202;
    res.end(JSON.stringify({ ok: true, mode: "async", queued: parsed.data.candidates.length }));
    return;
  }
  const t0 = Date.now();
  const results = await Promise.all(
    parsed.data.candidates.map(
      (c) => runCouncilForCandidate(c).catch((err) => {
        console.error("[council] error for", c.pair, err);
        return null;
      })
    )
  );
  const signals = results.filter((r) => r && r.signal && r.decision !== "DROP").map((r) => r.signal);
  for (const s of signals) {
    await kvLPush("signals:forex:pro", s, 100);
    await kvSet(`signal:${s.id}`, s, 60 * 60 * 6);
  }
  await kvSet("signals:forex:pro:latest", signals, 60 * 30);
  res.statusCode = 200;
  res.end(JSON.stringify({
    ok: true,
    mode: "sync",
    durationMs: Date.now() - t0,
    processed: parsed.data.candidates.length,
    published: signals.length,
    signals,
    decisions: results.map(
      (r) => r ? { pair: r.candidate.pair, decision: r.decision, reason: r.reason, durationMs: r.durationMs } : null
    )
  }));
}
// Vercel Node.js runtime expects module.exports to be the handler function
if (typeof module.exports.default === 'function') {
  const _fn = module.exports.default;
  if (module.exports.config) _fn.config = module.exports.config;
  module.exports = _fn;
}
