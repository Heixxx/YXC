"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// handlers/signals.ts
var signals_exports = {};
__export(signals_exports, {
  default: () => handler
});
module.exports = __toCommonJS(signals_exports);

// src/lib/cache.ts
var _kv;
async function getKv() {
  if (_kv !== void 0) return _kv;
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    _kv = null;
    return null;
  }
  try {
    const mod = require("@vercel/kv");
    _kv = mod.kv;
  } catch {
    _kv = null;
  }
  return _kv;
}
async function kvGet(key) {
  try {
    return await (await getKv())?.get(key) ?? null;
  } catch {
    return null;
  }
}

// handlers/signals.ts
var ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? "https://xyc-fron.vercel.app";
function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Vary", "Origin");
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "public, max-age=15");
}
async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "method-not-allowed" }));
    return;
  }
  try {
    const signals = await kvGet("signals:forex:pro:latest") ?? [];
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, count: signals.length, signals, generatedAt: Date.now() }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: message }));
  }
}
// Vercel Node.js runtime expects module.exports to be the handler function
if (typeof module.exports.default === 'function') {
  const _fn = module.exports.default;
  if (module.exports.config) _fn.config = module.exports.config;
  module.exports = _fn;
}
