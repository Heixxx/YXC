import { z } from 'zod';

// ============================================================================
// TIMEFRAMES
// ============================================================================

export type Timeframe = '15min' | '1h' | '4h' | '1day';

export interface Candle {
  timestamp: number; // epoch ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ============================================================================
// SIGNAL — kompatybilne z frontendem (Signal interface w useSignals.ts)
// ============================================================================

export const SignalDirectionSchema = z.enum(['BUY', 'SELL', 'HOLD']);
export type SignalDirection = z.infer<typeof SignalDirectionSchema>;

export const SignalSchema = z.object({
  id: z.string(),
  instrument: z.string(),
  category: z.literal('FOREX'),
  tier: z.literal('PRO'),
  direction: SignalDirectionSchema,

  // From Risk Agent (real numbers, not arbitrary multiples)
  entry: z.number(),
  target: z.number(),
  stop: z.number(),
  takeProfits: z.array(z.number()).length(3), // TP1, TP2, TP3

  confidence: z.number().min(0).max(100),
  vitality: z.number().min(0).max(100),
  timestamp: z.number(),
  spread: z.number(),

  // 5 dots for SignalCard.tsx (L0=strategies, L1=trend, L2=meanrev, L3=breakout, L4=macro)
  layers: z.array(z.boolean()).length(5),
  layerConfidences: z.array(z.number()).length(5),

  status: z.enum(['active', 'expired', 'closing_soon']),
  sourceLayers: z.array(z.string()),

  // PRO-only metadata
  thesis: z.string(),
  mainRisk: z.string(),
  positionSizePct: z.number(),
  riskRewardTp1: z.number(),
  expectedHoldMinutes: z.number(),
  backtestWinRate: z.number(),
  backtestSampleSize: z.number(),
});

export type Signal = z.infer<typeof SignalSchema>;

// ============================================================================
// CANDIDATE — what frontend POSTs to /api/council
// ============================================================================

export const CandidateSchema = z.object({
  pair: z.string(),                  // e.g. "EUR/USD"
  direction: z.enum(['BUY', 'SELL']),
  l0Confidence: z.number().min(0).max(100),
  triggeredStrategies: z.array(z.string()),
  currentPrice: z.number(),
});

export type Candidate = z.infer<typeof CandidateSchema>;

export const CouncilRequestSchema = z.object({
  candidates: z.array(CandidateSchema).min(1).max(5),
});

export type CouncilRequest = z.infer<typeof CouncilRequestSchema>;

// ============================================================================
// AGENT VERDICTS — Zod schemas for structured outputs
// ============================================================================

export const StrategyVerdictSchema = z.object({
  verdict: z.enum(['CONFIRM', 'REJECT', 'SKIP']),
  confidence: z.number().min(0).max(100),
  reasoning: z.string().max(300),
  htfAligned: z.boolean().optional(),
  trendStrength: z.enum(['STRONG', 'MODERATE', 'WEAK']).optional(),
  extremeLevel: z.enum(['EXTREME', 'ELEVATED', 'NEUTRAL']).optional(),
  divergenceDetected: z.boolean().optional(),
  breakoutType: z.enum(['RANGE', 'SQUEEZE', 'TREND_CONTINUATION', 'NONE']).optional(),
  followThroughLikely: z.boolean().optional(),
  backtest: z.object({
    winRate: z.number(),
    sampleSize: z.number(),
  }).optional(),
});

export type StrategyVerdict = z.infer<typeof StrategyVerdictSchema>;

export const MacroVerdictSchema = z.object({
  verdict: z.enum(['CONFIRM', 'REJECT', 'NEUTRAL']),
  confidence: z.number().min(0).max(100),
  keyEventNext12h: z.string().nullable(),
  fundamentalBias: z.enum(['BULL', 'BEAR', 'NEUTRAL']),
  newsSummary: z.string().max(400),
});

export type MacroVerdict = z.infer<typeof MacroVerdictSchema>;

export const RiskOutputSchema = z.object({
  entryZone: z.object({ low: z.number(), high: z.number() }),
  stopLoss: z.number(),
  takeProfit1: z.number(),
  takeProfit2: z.number(),
  takeProfit3: z.number(),
  positionSizePct: z.number().min(0).max(3),
  riskRewardTp1: z.number(),
  consensusStrength: z.enum(['STRONG', 'MIXED', 'WEAK']),
});

export type RiskOutput = z.infer<typeof RiskOutputSchema>;

export const JudgeVerdictSchema = z.object({
  decision: z.enum(['PUBLISH', 'HOLD', 'DROP']),
  finalDirection: z.enum(['BUY', 'SELL', 'HOLD']),
  finalConfidence: z.number().min(0).max(100),
  keyThesis: z.string().max(500),
  mainRisk: z.string().max(300),
  expectedHoldMinutes: z.number().int().min(15).max(2880),
});

export type JudgeVerdict = z.infer<typeof JudgeVerdictSchema>;

// ============================================================================
// AGENT CONTEXT — passed to every agent
// ============================================================================

export interface AgentContext {
  pair: string;
  direction: 'BUY' | 'SELL';
  currentPrice: number;
  l0Confidence: number;
  triggeredStrategies: string[];
}
