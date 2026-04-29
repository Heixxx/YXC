/**
 * GET /api/signals?tier=PRO
 *
 * Returns latest published PRO signals from cache.
 * Frontend polls this for the PRO tab in Signals page.
 */
import { kvGet } from '../../src/lib/cache';
import type { Signal } from '../../src/lib/types';
import { corsHeaders, validateOrigin } from '../../src/lib/auth';

export const config = { runtime: 'nodejs', maxDuration: 10 };

function signalsHeaders(): HeadersInit {
  return {
    ...corsHeaders('GET, OPTIONS'),
    'Cache-Control': 'public, max-age=15',
  };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: signalsHeaders() });
  }

  // Block unknown origins (browser-originated requests from other sites)
  const originDenied = validateOrigin(req);
  if (originDenied) return originDenied;

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'method-not-allowed' }), {
      status: 405,
      headers: signalsHeaders(),
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
    { status: 200, headers: signalsHeaders() }
  );
}
