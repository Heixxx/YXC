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
  config: () => config,
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

// src/lib/auth.ts
var ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? "https://xyc-fron.vercel.app";
var EXTRA_ORIGINS = (process.env.EXTRA_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
var ALL_ALLOWED_ORIGINS = /* @__PURE__ */ new Set([ALLOWED_ORIGIN, ...EXTRA_ORIGINS]);
function resolveOrigin(requestOrigin) {
  if (requestOrigin && ALL_ALLOWED_ORIGINS.has(requestOrigin)) {
    return requestOrigin;
  }
  return ALLOWED_ORIGIN;
}
function corsHeaders(methods = "GET, OPTIONS", requestOrigin = null) {
  return {
    "Access-Control-Allow-Origin": resolveOrigin(requestOrigin),
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
    "Content-Type": "application/json"
  };
}
function validateOrigin(req) {
  if (req.method === "OPTIONS") return null;
  const origin = req.headers.get("Origin");
  if (!origin) return null;
  if (!ALL_ALLOWED_ORIGINS.has(origin)) {
    return new Response(JSON.stringify({ error: "forbidden", message: "Origin not allowed" }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }
  return null;
}

// handlers/signals.ts
var config = { runtime: "nodejs", maxDuration: 10 };
function signalsHeaders(origin = null) {
  return {
    ...corsHeaders("GET, OPTIONS", origin),
    "Cache-Control": "public, max-age=15"
  };
}
async function handler(req) {
  try {
    const origin = req.headers.get("Origin");
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: signalsHeaders(origin) });
    }
    const originDenied = validateOrigin(req);
    if (originDenied) return originDenied;
    if (req.method !== "GET") {
      return new Response(JSON.stringify({ error: "method-not-allowed" }), {
        status: 405,
        headers: signalsHeaders(origin)
      });
    }
    const signals = await kvGet("signals:forex:pro:latest") ?? [];
    return new Response(
      JSON.stringify({
        ok: true,
        count: signals.length,
        signals,
        generatedAt: Date.now()
      }),
      { status: 200, headers: signalsHeaders(origin) }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : void 0;
    return new Response(
      JSON.stringify({ ok: false, error: message, stack }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  config
});
