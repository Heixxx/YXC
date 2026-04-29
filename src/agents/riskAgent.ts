/**
 * Risk Agent — does NOT decide direction. Takes the council's outputs + market data
 * and outputs concrete trade levels (entry, SL, 3 TPs, position size).
 *
 * Uses DeepSeek JSON mode + has access to klines/correlation tools so it can
 * adjust SL to swing levels and reduce size if highly correlated to existing exposure.
 */
import { callDeepSeekJSON } from '../lib/llm';
import { fetchTwelveDataCandles } from '../lib/twelvedata';
import { computeATR, findSwingPoints } from '../lib/indicators';
import { fetchCorrelationMatrixTool } from '../tools/fetchCorrelationMatrix';
import {
  RiskOutputSchema,
  type RiskOutput,
  type AgentContext,
  type StrategyVerdict,
  type MacroVerdict,
} from '../lib/types';

interface RiskInput {
  ctx: AgentContext;
  trend: StrategyVerdict | null;
  meanRev: StrategyVerdict | null;
  breakout: StrategyVerdict | null;
  macro: MacroVerdict | null;
}

export async function runRiskAgent(input: RiskInput): Promise<RiskOutput> {
  const { ctx } = input;

  // Pre-fetch deterministic context
  const candles1h = await fetchTwelveDataCandles(ctx.pair, '1h', 200);
  const atrSeries = computeATR(candles1h, 14);
  const atr = atrSeries[atrSeries.length - 1] ?? 0;
  const swings = findSwingPoints(candles1h, 20);

  let correlationNote = '';
  try {
    const corr = await fetchCorrelationMatrixTool.execute({
      context: { pair: ctx.pair, days: 30 },
    } as never);
    const strong = corr.correlations.filter((c) => Math.abs(c.correlation) >= 0.7);
    if (strong.length > 0) {
      correlationNote = `STRONG correlations (${strong.map((s) => `${s.otherPair}=${s.correlation}`).join(', ')}). Reduce size if user holds correlated pairs.`;
    } else {
      correlationNote = 'No strong correlations with majors — independent exposure.';
    }
  } catch {
    correlationNote = 'Correlation data unavailable.';
  }

  const consensus = [input.trend, input.meanRev, input.breakout].filter(Boolean) as StrategyVerdict[];
  const confirms = consensus.filter((v) => v.verdict === 'CONFIRM').length;
  const rejects = consensus.filter((v) => v.verdict === 'REJECT').length;

  const SYSTEM = `You are a RISK MANAGER. You DO NOT decide direction — that is already determined.
You output concrete trade levels using the volatility (ATR) and recent swings.
Always return VALID JSON only. All numbers must be actual values, not formulas.`;

  const userPrompt = `Calculate risk levels for ${ctx.pair} ${ctx.direction} at ${ctx.currentPrice}.

Market data:
- ATR(14) on 1h: ${atr.toFixed(6)}
- Recent 20-bar swing high: ${swings.swingHigh.toFixed(6)}
- Recent 20-bar swing low: ${swings.swingLow.toFixed(6)}
- Current price: ${ctx.currentPrice}

Council consensus:
- Trend: ${input.trend ? `${input.trend.verdict} (${input.trend.confidence}%)` : 'unavailable'}
- Mean-Rev: ${input.meanRev ? `${input.meanRev.verdict} (${input.meanRev.confidence}%)` : 'unavailable'}
- Breakout: ${input.breakout ? `${input.breakout.verdict} (${input.breakout.confidence}%)` : 'unavailable'}
- Macro: ${input.macro ? `${input.macro.verdict} (${input.macro.confidence}%)` : 'unavailable'}
- Strategy CONFIRMs: ${confirms}, REJECTs: ${rejects}
- Correlation: ${correlationNote}

Calculate (all in absolute price terms, NOT pips):
- entryZone: low and high of a band ±0.25*ATR around currentPrice
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
      { role: 'system', content: SYSTEM },
      { role: 'user', content: userPrompt },
    ],
    RiskOutputSchema,
    { temperature: 0.1 } // very deterministic for risk math
  );
}
