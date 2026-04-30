/**
 * GET /api/signals?tier=PRO
 * Returns latest published PRO signals from cache.
 */
import type { IncomingMessage, ServerResponse } from 'http';
import { kvGet } from '../src/lib/cache';
import type { Signal } from '../src/lib/types';

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? 'https://xyc-fron.vercel.app';

function setCorsHeaders(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=15');
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'method-not-allowed' }));
    return;
  }

  try {
    const signals = (await kvGet<Signal[]>('signals:forex:pro:latest')) ?? [];
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, count: signals.length, signals, generatedAt: Date.now() }));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: message }));
  }
}
