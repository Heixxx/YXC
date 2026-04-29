/**
 * Strategy Council Workflow.
 *
 * Pattern (matches the architecture diagram):
 *  candidate (BUY/SELL + L0 confidence)
 *  → 4 strategy agents in parallel (Trend, MeanRev, Breakout, Macro) with tools access
 *  → Risk Agent (uses correlations + swings)
 *  → Judge (Claude with tool_use)
 *  → only PUBLISH-decisions become Signals
 *
 * Implemented as a plain async function rather than @mastra/core/workflows
 * primitives because we want full control of error handling per agent (we don't
 * want the workflow to abort if one agent fails — others should still vote).
 */
import { runTrendAgent, runMeanRevAgent, runBreakoutAgent } from '../agents/strategyRunners';
import { runMacroAgent } from '../agents/macroAgent';
import { runRiskAgent } from '../agents/riskAgent';
import { runJudgeAgent } from '../agents/judgeAgent';
import { runMicroBacktestTool } from '../tools/runMicroBacktest';
import { fetchTwelveDataQuote } from '../lib/twelvedata';
import {
  type Candidate,
  type Signal,
  type AgentContext,
  type StrategyVerdict,
  type MacroVerdict,
} from '../lib/types';

export interface CouncilResult {
  candidate: Candidate;
  verdicts: {
    trend: StrategyVerdict | null;
    meanRev: StrategyVerdict | null;
    breakout: StrategyVerdict | null;
    macro: MacroVerdict | null;
  };
  signal: Signal | null;
  decision: 'PUBLISH' | 'HOLD' | 'DROP';
  reason: string;
  durationMs: number;
}

export async function runCouncilForCandidate(candidate: Candidate): Promise<CouncilResult> {
  const t0 = Date.now();
  const ctx: AgentContext = {
    pair: candidate.pair,
    direction: candidate.direction,
    currentPrice: candidate.currentPrice,
    l0Confidence: candidate.l0Confidence,
    triggeredStrategies: candidate.triggeredStrategies,
  };

  // Step 1: Run 4 strategy agents in parallel (each fetches its own data via tools)
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
    }),
  ]);

  // Early-out: if all 4 failed, don't waste tokens on judge
  const allFailed = !trend && !meanRev && !breakout && !macro;
  if (allFailed) {
    return {
      candidate,
      verdicts: { trend, meanRev, breakout, macro },
      signal: null,
      decision: 'DROP',
      reason: 'all-agents-failed',
      durationMs: Date.now() - t0,
    };
  }

  // Step 2: Risk Agent (concrete trade levels)
  const risk = await runRiskAgent({ ctx, trend, meanRev, breakout, macro }).catch((err) => {
    console.warn(`[council] riskAgent failed for ${ctx.pair}:`, err);
    return null;
  });

  // Step 3: Backtest summary for Judge
  const backtest = await runMicroBacktestTool.execute({
    context: {
      pair: ctx.pair,
      direction: ctx.direction,
      timeframe: '1h' as const,
      slMultiplier: 1.5,
      tpMultiplier: 3.0,
      lookback: 300,
      forwardBars: 24,
    },
  } as never).catch(() => ({ winRate: 0, avgR: 0, sampleSize: 0, regimeMatch: false, setupsScanned: 0 }));

  // Step 4: Judge
  const judge = await runJudgeAgent({
    ctx,
    trend,
    meanRev,
    breakout,
    macro,
    risk,
    backtest,
  }).catch((err) => {
    console.error(`[council] judge failed for ${ctx.pair}:`, err);
    return null;
  });

  if (!judge) {
    return {
      candidate,
      verdicts: { trend, meanRev, breakout, macro },
      signal: null,
      decision: 'DROP',
      reason: 'judge-failed',
      durationMs: Date.now() - t0,
    };
  }

  if (judge.decision === 'DROP') {
    return {
      candidate,
      verdicts: { trend, meanRev, breakout, macro },
      signal: null,
      decision: 'DROP',
      reason: judge.mainRisk || 'judge-dropped',
      durationMs: Date.now() - t0,
    };
  }

  // Step 5: Build Signal kompatybilny z frontendem
  // Need actual current price + spread for the signal
  let spread = 0.00015; // default ~1.5 pip for majors
  let entry = ctx.currentPrice;
  try {
    const q = await fetchTwelveDataQuote(ctx.pair);
    spread = q.spread || spread;
    entry = q.price || ctx.currentPrice;
  } catch {
    // proceed with defaults
  }

  // If risk gave us levels, use them; otherwise build conservative defaults from ATR proxy
  let entryMid = entry;
  let stopLoss = ctx.direction === 'BUY' ? entry * 0.992 : entry * 1.008;
  let tps: [number, number, number] = [entry * 1.015, entry * 1.025, entry * 1.04];
  let positionSize = 1.0;
  let rr1 = 1.0;

  if (risk) {
    entryMid = (risk.entryZone.low + risk.entryZone.high) / 2;
    stopLoss = risk.stopLoss;
    tps = [risk.takeProfit1, risk.takeProfit2, risk.takeProfit3];
    positionSize = risk.positionSizePct;
    rr1 = risk.riskRewardTp1;
  }

  // Layers + confidences (5 dots compatible with SignalCard.tsx)
  const layers: boolean[] = [
    true,                                         // L0: deterministic strategies fired
    !!trend && trend.verdict === 'CONFIRM',       // L1: Trend
    !!meanRev && meanRev.verdict === 'CONFIRM',   // L2: Mean-Rev
    !!breakout && breakout.verdict === 'CONFIRM', // L3: Breakout
    !!macro && macro.verdict === 'CONFIRM',       // L4: Macro
  ];
  const layerConfidences: number[] = [
    candidate.l0Confidence,
    trend?.confidence ?? 0,
    meanRev?.confidence ?? 0,
    breakout?.confidence ?? 0,
    macro?.confidence ?? 0,
  ];

  const finalConfidence = judge.decision === 'HOLD'
    ? Math.min(judge.finalConfidence, 60)
    : judge.finalConfidence;

  const signal: Signal = {
    id: `${ctx.pair.replace('/', '')}-${Date.now()}`,
    instrument: ctx.pair,
    category: 'FOREX',
    tier: 'PRO',
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

    status: 'active',
    sourceLayers: ['L0', ...(trend ? ['L1'] : []), ...(meanRev ? ['L2'] : []), ...(breakout ? ['L3'] : []), ...(macro ? ['L4'] : [])],

    thesis: judge.keyThesis,
    mainRisk: judge.mainRisk,
    positionSizePct: positionSize,
    riskRewardTp1: rr1,
    expectedHoldMinutes: judge.expectedHoldMinutes,
    backtestWinRate: backtest.winRate,
    backtestSampleSize: backtest.sampleSize,
  };

  return {
    candidate,
    verdicts: { trend, meanRev, breakout, macro },
    signal,
    decision: judge.decision,
    reason: judge.keyThesis.slice(0, 200),
    durationMs: Date.now() - t0,
  };
}
