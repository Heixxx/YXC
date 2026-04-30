const fs = require('fs');
const path = require('path');

const ALLOWED = "process.env.ALLOWED_ORIGIN || 'https://xyc-fron.vercel.app'";

const ROOT = `'use strict';
const ALLOWED_ORIGIN = ${ALLOWED};
module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 200;
  res.end(JSON.stringify({ ok: true, service: 'forexai-engine', message: 'API dzia\\u0142a' }));
};
`;

const SIGNALS = `'use strict';
const ALLOWED_ORIGIN = ${ALLOWED};
let _kv;

async function getKv() {
  if (_kv !== undefined) return _kv;
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) { _kv = null; return null; }
  try { _kv = require('@vercel/kv').kv; } catch(e) { _kv = null; }
  return _kv;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=15');

  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'GET') { res.statusCode = 405; res.end(JSON.stringify({ error: 'method-not-allowed' })); return; }

  try {
    const kv = await getKv();
    const signals = kv ? (await kv.get('signals:forex:pro:latest') || []) : [];
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, count: signals.length, signals, generatedAt: Date.now() }));
  } catch(err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: err.message }));
  }
};
`;

fs.mkdirSync('api/signals', { recursive: true });
fs.mkdirSync('api/council', { recursive: true });
fs.mkdirSync('api/inngest', { recursive: true });
fs.writeFileSync('api/index.js', ROOT);
fs.writeFileSync('api/signals/index.js', SIGNALS);
console.log('Written api/index.js and api/signals/index.js');
console.log('api/index.js:', fs.statSync('api/index.js').size, 'bytes');
console.log('api/signals/index.js:', fs.statSync('api/signals/index.js').size, 'bytes');
