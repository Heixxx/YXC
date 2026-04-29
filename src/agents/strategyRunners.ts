/**
 * Strategy agent runners.
 *
 * Why not pure Mastra Agent class? Mastra's auto tool-calling loop has variable
 * iteration count which makes cost/latency unpredictable. We pre-execute the
 * required tools and feed their outputs into a single deterministic LLM call.
 * The agent's "instructions" still drive the reasoning — we just lock the tool
 * orchestration for production reliability.
 *
 * Each runner returns a typed StrategyVerdict.
 */
import { fetchKlinesMultiTFTool } from '../tools/fetchKlinesMultiTF';
import { runMicroBacktestTool } from '../tools/runMicroBacktest';
import { fetchSessionContextTool } from '../tools/fetchSessionContext';
import { callDeepSeekJSON } from '../lib/llm';
import {
  StrategyVerdictSchema,
  type StrategyVerdict,
  type AgentContext,
} from '../lib/types';

// Helper: run all 3 commonly-needed tools in parallel
async function gatherCommonContext(ctx: AgentContext, tfs: ('1h' | '4h' | '1day')[] = ['1h', '4h', '1day']) {
  const [klines, backtest, session] = await Promise.all([
    fetchKlinesMultiTFTool.execute({
      context: { pair: ctx.pair, timeframes: tfs, outputsize: 200 },
    } as never),
    runMicroBacktestTool.execute({
      context: {
        pair: ctx.pair,
        direction: ctx.direction,
        timeframe: '1h' as const,
        slMultiplier: 1.5,
        tpMultiplier: 3.0,
        lookback: 300,
        forwardBars: 24,
      },
    } as never),
    fetchSessionContextTool.execute({ context: { pair: ctx.pair } } as never),
  ]);
  return { klines, backtest, session };
}

// ============================================================================
// TREND
// ============================================================================

export async function runTrendAgent(ctx: AgentContext): Promise<StrategyVerdict> {
  const { klines, backtest } = await gatherCommonContext(ctx);

  const SYSTEM = `You are a TREND-FOLLOWING SPECIALIST. Confirm only setups aligned with HTF trend (4h + daily). Counter-trend = REJECT. Respond ONLY with JSON.`;

  const tf1h = klines.snapshots['1h']!;
  const tf4h = klines.snapshots['4h']!;
  const tfD = klines.snapshots['1day']!;

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
      { role: 'system', content: SYSTEM },
      { role: 'user', content: userPrompt },
    ],
    StrategyVerdictSchema,
    { temperature: 0.3 }
  );
}

// ============================================================================
// MEAN-REV
// ============================================================================

export async function runMeanRevAgent(ctx: AgentContext): Promise<StrategyVerdict> {
  const klines = await fetchKlinesMultiTFTool.execute({
    context: { pair: ctx.pair, timeframes: ['1h' as const, '4h' as const, '1day' as const], outputsize: 200 },
  } as never);
  const backtest = await runMicroBacktestTool.execute({
    context: {
      pair: ctx.pair,
      direction: ctx.direction,
      timeframe: '1h' as const,
      slMultiplier: 1.0,
      tpMultiplier: 2.0,
      lookback: 300,
      forwardBars: 12,
    },
  } as never);

  const tf1h = klines.snapshots['1h']!;
  const tf4h = klines.snapshots['4h']!;

  const SYSTEM = `You are a MEAN-REVERSION SPECIALIST. You hunt extremes ready to revert. Avoid trending markets. Respond ONLY with JSON.`;
  const userPrompt = `Analyze ${ctx.pair} for ${ctx.direction} MEAN-REVERSION setup.

Data:
- 1h: RSI=${tf1h.rsi.toFixed(1)}, BB widthPct=${tf1h.bbWidthPct.toFixed(2)}%, ATR=${tf1h.atr.toFixed(6)}, trend=${tf1h.trend}, current=${tf1h.currentPrice.toFixed(5)}
- 4h: RSI=${tf4h.rsi.toFixed(1)}, trend=${tf4h.trend}

Backtest (tighter MR-style stops): winRate=${backtest.winRate}%, sample=${backtest.sampleSize}, regimeMatch=${backtest.regimeMatch}

Rules for ${ctx.direction}:
${ctx.direction === 'BUY'
    ? '- CONFIRM only if 1h RSI < 35 AND 4h trend != DOWN (no falling-knife) AND winRate >= 50%\n- REJECT if 4h trend strongly DOWN AND daily DOWN'
    : '- CONFIRM only if 1h RSI > 65 AND 4h trend != UP (no chasing) AND winRate >= 50%\n- REJECT if 4h trend strongly UP AND daily UP'}
- SKIP when RSI 40-60 (no extreme)

Return JSON:
{ "verdict": "CONFIRM"|"REJECT"|"SKIP", "confidence": <0-100>, "reasoning": "<max 250>", "extremeLevel": "EXTREME"|"ELEVATED"|"NEUTRAL", "divergenceDetected": <bool>, "backtest": {"winRate": ${backtest.winRate}, "sampleSize": ${backtest.sampleSize}} }`;

  return callDeepSeekJSON(
    [{ role: 'system', content: SYSTEM }, { role: 'user', content: userPrompt }],
    StrategyVerdictSchema,
    { temperature: 0.3 }
  );
}

// ============================================================================
// BREAKOUT
// ============================================================================

export async function runBreakoutAgent(ctx: AgentContext): Promise<StrategyVerdict> {
  const { klines, backtest, session } = await gatherCommonContext(ctx);

  // Override backtest with breakout-style params (wider stops, longer hold)
  const breakoutBT = await runMicroBacktestTool.execute({
    context: {
      pair: ctx.pair,
      direction: ctx.direction,
      timeframe: '1h' as const,
      slMultiplier: 2.0,
      tpMultiplier: 4.0,
      lookback: 300,
      forwardBars: 24,
    },
  } as never).catch(() => backtest);

  const tf1h = klines.snapshots['1h']!;

  const SYSTEM = `You are a BREAKOUT SPECIALIST. Confirm true breakouts with follow-through. Squeeze before breakout = best. Respond ONLY with JSON.`;
  const userPrompt = `Analyze ${ctx.pair} for ${ctx.direction} BREAKOUT setup.

Data:
- 1h: BB widthPct=${tf1h.bbWidthPct.toFixed(3)}%, ATR=${tf1h.atr.toFixed(6)}, current=${tf1h.currentPrice.toFixed(5)}, trend=${tf1h.trend}
- Session: active=[${session.activeSessions.join(',')}], highLiquidity=${session.isHighLiquidity}, note: ${session.note}

Breakout-style backtest (slM=2.0, tpM=4.0): winRate=${breakoutBT.winRate}%, sample=${breakoutBT.sampleSize}, regimeMatch=${breakoutBT.regimeMatch}

Rules:
- CONFIRM (70-90) when bbWidthPct < 0.4% (squeeze) AND major session active AND winRate >= 50%
- REJECT (0-30) when bbWidthPct > 1.5% (already volatile) OR no major session OR winRate < 40%
- SKIP otherwise

Return JSON:
{ "verdict": "CONFIRM"|"REJECT"|"SKIP", "confidence": <0-100>, "reasoning": "<max 250>", "breakoutType": "RANGE"|"SQUEEZE"|"TREND_CONTINUATION"|"NONE", "followThroughLikely": <bool>, "backtest": {"winRate": ${breakoutBT.winRate}, "sampleSize": ${breakoutBT.sampleSize}} }`;

  return callDeepSeekJSON(
    [{ role: 'system', content: SYSTEM }, { role: 'user', content: userPrompt }],
    StrategyVerdictSchema,
    { temperature: 0.3 }
  );
}
