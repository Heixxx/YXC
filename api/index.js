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

// handlers/root.ts
var root_exports = {};
__export(root_exports, {
  default: () => handler
});
module.exports = __toCommonJS(root_exports);
var ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? "https://xyc-fron.vercel.app";
function handler(_req, res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Content-Type", "application/json");
  res.statusCode = 200;
  res.end(JSON.stringify({ ok: true, service: "forexai-engine", message: "API dzia\u0142a" }));
}
// Vercel Node.js runtime expects module.exports to be the handler function
if (typeof module.exports.default === 'function') {
  const _fn = module.exports.default;
  if (module.exports.config) _fn.config = module.exports.config;
  module.exports = _fn;
}
