import { corsHeaders } from '../src/lib/auth';

export const config = { runtime: 'nodejs', maxDuration: 5 };

export default function handler(req: Request): Response {
  const origin = req.headers.get('Origin');
  return new Response(
    JSON.stringify({ ok: true, service: 'forexai-engine', message: 'API działa' }),
    {
      status: 200,
      headers: corsHeaders('GET, OPTIONS', origin),
    }
  );
}
