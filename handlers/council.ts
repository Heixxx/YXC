/**
 * POST /api/council
 */
import type { IncomingMessage, ServerResponse } from 'http';
import { CouncilRequestSchema } from '../src/lib/types';
import { runCouncilForCandidate } from '../src/workflow/council';
import { kvLPush, kvSet } from '../src/lib/cache';
import { inngest } from '../src/inngest/client';

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? 'https://xyc-fron.vercel.app';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? '';

function setCorsHeaders(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Content-Type', 'application/json');
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // Auth check
  const authHeader = (req.headers['authorization'] ?? '') as string;
  if (INTERNAL_API_KEY && authHeader !== `Bearer ${INTERNAL_API_KEY}`) {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: 'unauthorized' }));
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'method-not-allowed' }));
    return;
  }

  let body: unknown;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'invalid-json' }));
    return;
  }

  const parsed = CouncilRequestSchema.safeParse(body);
  if (!parsed.success) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'validation', details: parsed.error.flatten() }));
    return;
  }

  const urlObj = new URL(req.url ?? '/', `https://${req.headers.host ?? 'localhost'}`);
  const mode = urlObj.searchParams.get('mode');

  if (mode === 'async') {
    await inngest.send({ name: 'council/run', data: { candidates: parsed.data.candidates } });
    res.statusCode = 202;
    res.end(JSON.stringify({ ok: true, mode: 'async', queued: parsed.data.candidates.length }));
    return;
  }

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

  for (const s of signals) {
    await kvLPush('signals:forex:pro', s, 100);
    await kvSet(`signal:${s.id}`, s, 60 * 60 * 6);
  }
  await kvSet('signals:forex:pro:latest', signals, 60 * 30);

  res.statusCode = 200;
  res.end(JSON.stringify({
    ok: true,
    mode: 'sync',
    durationMs: Date.now() - t0,
    processed: parsed.data.candidates.length,
    published: signals.length,
    signals,
    decisions: results.map((r) =>
      r ? { pair: r.candidate.pair, decision: r.decision, reason: r.reason, durationMs: r.durationMs } : null
    ),
  }));
}