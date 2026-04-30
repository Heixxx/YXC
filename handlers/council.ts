/**
 * POST /api/council
 *
 * Body: { candidates: [{pair, direction, l0Confidence, triggeredStrategies, currentPrice}, ...] }
 *
 * Two modes:
 *  - sync (default): runs council inline, returns Signal[] in response (for testing / direct mode)
 *  - async: triggers Inngest event and returns 202 (production for high concurrency)
 *
 * Set ?mode=async to use Inngest path.
 */
import { CouncilRequestSchema } from '../src/lib/types';
import { runCouncilForCandidate } from '../src/workflow/council';
import { kvLPush, kvSet } from '../src/lib/cache';
import { inngest } from '../src/inngest/client';
import { corsHeaders, validateApiKey, validateOrigin } from '../src/lib/auth';

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
};

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get('Origin');

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders('POST, OPTIONS', origin) });
  }

  // Block unknown origins (browser requests from other sites)
  const originDenied = validateOrigin(req);
  if (originDenied) return originDenied;

  // Require valid API key for all non-preflight requests
  const authDenied = validateApiKey(req);
  if (authDenied) return authDenied;

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method-not-allowed' }), {
      status: 405,
      headers: corsHeaders('POST, OPTIONS', origin),
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid-json' }), {
      status: 400,
      headers: corsHeaders('POST, OPTIONS', origin),
    });
  }

  const parsed = CouncilRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'validation', details: parsed.error.flatten() }), {
      status: 400,
      headers: corsHeaders('POST, OPTIONS', origin),
    });
  }

  const url = new URL(req.url);
  const mode = url.searchParams.get('mode');

  if (mode === 'async') {
    await inngest.send({ name: 'council/run', data: { candidates: parsed.data.candidates } });
    return new Response(JSON.stringify({ ok: true, mode: 'async', queued: parsed.data.candidates.length }), {
      status: 202,
      headers: corsHeaders('POST, OPTIONS', origin),
    });
  }

  // Sync path
  const t0 = Date.now();
  const results = await Promise.all(
    parsed.data.candidates.map((c) =>
      runCouncilForCandidate(c).catch((err) => {
        console.error('[council] error for', c.pair, err);
        return null;
      })
    )
  );

  const signals = results
    .filter((r) => r && r.signal && r.decision !== 'DROP')
    .map((r) => r!.signal!);

  // Persist
  for (const s of signals) {
    await kvLPush('signals:forex:pro', s, 100);
    await kvSet(`signal:${s.id}`, s, 60 * 60 * 6);
  }
  await kvSet('signals:forex:pro:latest', signals, 60 * 30);

  return new Response(
    JSON.stringify({
      ok: true,
      mode: 'sync',
      durationMs: Date.now() - t0,
      processed: parsed.data.candidates.length,
      published: signals.length,
      signals,
      decisions: results.map((r) =>
        r ? { pair: r.candidate.pair, decision: r.decision, reason: r.reason, durationMs: r.durationMs } : null
      ),
    }),
    { status: 200, headers: corsHeaders('POST, OPTIONS', origin) }
  );
}
