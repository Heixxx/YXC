'use strict';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://xyc-fron.vercel.app';
module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 200;
  res.end(JSON.stringify({ ok: true, service: 'forexai-engine', message: 'API dzia\u0142a' }));
};
