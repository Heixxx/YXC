/**
 * GET /api/signals?tier=PRO
 *
 * Returns latest published PRO signals from cache.
 * Frontend polls this for the PRO tab in Signals page.
 */
import { kvGet } from '../../src/lib/cache';
import type { Signal } from '../../src/lib/types';

export const config = { runtime: 'nodejs', maxDuration: 10 };

const ALLOWED = process.env.ALLOWED_ORIGIN ?? '*';

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': ALLOWED,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=15',
  };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'method-not-allowed' }), {
      status: 405,
      headers: corsHeaders(),
    });
  }

  const signals = (await kvGet<Signal[]>('signals:forex:pro:latest')) ?? [];

  return new Response(
    JSON.stringify({
      ok: true,
      count: signals.length,
      signals,
      generatedAt: Date.now(),
    }),
    { status: 200, headers: corsHeaders() }
  );
}
