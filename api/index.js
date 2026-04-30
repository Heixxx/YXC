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

// api/index.ts
var index_exports = {};
__export(index_exports, {
  config: () => config,
  default: () => handler
});
module.exports = __toCommonJS(index_exports);

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

// api/index.ts
var config = { runtime: "nodejs", maxDuration: 5 };
function handler(req) {
  const origin = req.headers.get("Origin");
  return new Response(
    JSON.stringify({ ok: true, service: "forexai-engine", message: "API dzia\u0142a" }),
    {
      status: 200,
      headers: corsHeaders("GET, OPTIONS", origin)
    }
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  config
});
