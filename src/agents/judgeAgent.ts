/**
 * Judge — the final aggregator. Takes everyone's verdicts + risk levels + backtest
 * and decides PUBLISH / HOLD / DROP with final confidence.
 *
 * Uses Claude tool_use for guaranteed schema-compliant JSON, with DeepSeek fallback.
 */
import { callClaudeJSON, callDeepSeekJSON } from '../lib/llm';
import {
  JudgeVerdictSchema,
  type JudgeVerdict,
  type AgentContext,
  type StrategyVerdict,
  type MacroVerdict,
  type RiskOutput,
} from '../lib/types';

const JUDGE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    decision: { type: 'string', enum: ['PUBLISH', 'HOLD', 'DROP'] },
    finalDirection: { type: 'string', enum: ['BUY', 'SELL', 'HOLD'] },
    finalConfidence: { type: 'number', minimum: 0, maximum: 100 },
    keyThesis: { type: 'string', maxLength: 500 },
    mainRisk: { type: 'string', maxLength: 300 },
    expectedHoldMinutes: { type: 'integer', minimum: 15, maximum: 2880 },
  },
  required: ['decision', 'finalDirection', 'finalConfidence', 'keyThesis', 'mainRisk', 'expectedHoldMinutes'],
};

interface JudgeInput {
  ctx: AgentContext;
  trend: StrategyVerdict | null;
  meanRev: StrategyVerdict | null;
  breakout: StrategyVerdict | null;
  macro: MacroVerdict | null;
  risk: RiskOutput | null;
  backtest: { winRate: number; avgR: number; sampleSize: number; regimeMatch: boolean };
}

export async function runJudgeAgent(input: JudgeInput): Promise<JudgeVerdict> {
  const { ctx, trend, meanRev, breakout, macro, risk, backtest } = input;

  const SYSTEM = `You are the FINAL JUDGE of a trading signal council. You aggregate verdicts from 4 strategy specialists, the risk manager output, and historical backtest data.
You make a CALIBRATED decision: PUBLISH only when evidence warrants. Conservative bias preferred — false positives cost more than missed signals.
You return only the structured response via the provided tool.`;

  const consensus = [trend, meanRev, breakout].filter(Boolean) as StrategyVerdict[];
  const confirms = consensus.filter((v) => v.verdict === 'CONFIRM').length;
  const rejects = consensus.filter((v) => v.verdict === 'REJECT').length;

  const userPrompt = `Final verdict needed for ${ctx.pair} ${ctx.direction} at ${ctx.currentPrice}.

L0 deterministic strategies fired with confidence ${ctx.l0Confidence}% from triggers: ${ctx.triggeredStrategies.join(', ')}.

Strategy Council:
${trend ? `- Trend: ${trend.verdict} (${trend.confidence}%) — ${trend.reasoning}` : '- Trend: UNAVAILABLE'}
${meanRev ? `- Mean-Rev: ${meanRev.verdict} (${meanRev.confidence}%) — ${meanRev.reasoning}` : '- Mean-Rev: UNAVAILABLE'}
${breakout ? `- Breakout: ${breakout.verdict} (${breakout.confidence}%) — ${breakout.reasoning}` : '- Breakout: UNAVAILABLE'}
${macro ? `- Macro: ${macro.verdict} (${macro.confidence}%) — ${macro.newsSummary}; key event next 12h: ${macro.keyEventNext12h ?? 'none'}` : '- Macro: UNAVAILABLE'}

Aggregated: ${confirms} CONFIRMs, ${rejects} REJECTs.

Risk Manager output: ${risk ? `entry ~${(risk.entryZone.low + risk.entryZone.high) / 2}, SL ${risk.stopLoss}, TP1 ${risk.takeProfit1} (RR ${risk.riskRewardTp1}), positionSize ${risk.positionSizePct}%, consensus ${risk.consensusStrength}` : 'UNAVAILABLE'}.

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
    return await callClaudeJSON(SYSTEM, userPrompt, JudgeVerdictSchema, JUDGE_JSON_SCHEMA, {
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 1024,
    });
  } catch (err) {
    console.warn('Claude judge failed, falling back to DeepSeek:', err);
    return callDeepSeekJSON(
      [
        { role: 'system', content: SYSTEM + ' Return ONLY a JSON object, no markdown.' },
        { role: 'user', content: userPrompt },
      ],
      JudgeVerdictSchema,
      { temperature: 0.2, maxTokens: 1024 }
    );
  }
}
