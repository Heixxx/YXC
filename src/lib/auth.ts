/**
 * Shared security middleware for all API routes.
 *
 * CORS is locked to ALLOWED_ORIGIN (must be set to https://xyc-fron.vercel.app in Vercel env).
 * API key protection (INTERNAL_API_KEY) is applied to mutating / expensive routes.
 *
 * Usage:
 *   import { corsHeaders, validateApiKey } from '../../src/lib/auth';
 *
 *   // Every handler - options preflight:
 *   if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders('POST') });
 *
 *   // Expensive / internal routes - key check:
 *   const denied = validateApiKey(req);
 *   if (denied) return denied;
 */

const ALLOWED_ORIGIN =
  process.env.ALLOWED_ORIGIN ?? 'https://xyc-fron.vercel.app';

/**
 * Build CORS + JSON headers for a response.
 * @param methods - comma-separated HTTP methods to allow, e.g. 'GET, OPTIONS'
 */
export function corsHeaders(methods = 'GET, OPTIONS'): HeadersInit {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
    'Content-Type': 'application/json',
  };
}

/**
 * Validate the Bearer token in Authorization header against INTERNAL_API_KEY env var.
 * Returns a 401/403 Response when validation fails, or null when OK.
 *
 * Skips validation if INTERNAL_API_KEY is not set (dev mode warning only).
 */
export function validateApiKey(req: Request): Response | null {
  const secret = process.env.INTERNAL_API_KEY;

  if (!secret) {
    // No key configured - warn in logs but allow in dev to avoid breaking local iteration
    console.warn('[auth] INTERNAL_API_KEY is not set - API key validation is DISABLED');
    return null;
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return new Response(JSON.stringify({ error: 'unauthorized', message: 'Missing Authorization header' }), {
      status: 401,
      headers: corsHeaders('POST, OPTIONS'),
    });
  }

  // Constant-time comparison to prevent timing attacks
  if (!timingSafeEqual(token, secret)) {
    return new Response(JSON.stringify({ error: 'forbidden', message: 'Invalid API key' }), {
      status: 403,
      headers: corsHeaders('POST, OPTIONS'),
    });
  }

  return null;
}

/**
 * Poor-man's constant-time string comparison (avoids early-exit timing leaks).
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still iterate to avoid length-based timing leak
    let diff = 0;
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      diff |= (a.charCodeAt(i) ?? 0) ^ (b.charCodeAt(i) ?? 0);
    }
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Check whether the request Origin is allowed.
 * Used as an extra layer for non-browser clients that spoof Origin.
 */
export function validateOrigin(req: Request): Response | null {
  const origin = req.headers.get('Origin');
  // Allow requests with no Origin header (server-to-server calls with valid API key)
  if (!origin) return null;
  if (origin !== ALLOWED_ORIGIN) {
    return new Response(JSON.stringify({ error: 'forbidden', message: 'Origin not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return null;
}
