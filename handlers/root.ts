import type { IncomingMessage, ServerResponse } from 'http';

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? 'https://xyc-fron.vercel.app';

export default function handler(_req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 200;
  res.end(JSON.stringify({ ok: true, service: 'forexai-engine', message: 'API działa' }));
}
