/**
 * Bundles each Vercel API function with esbuild.
 * All local src/ imports are inlined; npm packages are left external
 * (Vercel installs node_modules from package.json at deploy time).
 *
 * Output:  api/index.js
 *          api/signals/index.js
 *          api/council/index.js
 *          api/inngest/index.js
 */
import { build } from 'esbuild';

const entries = [
  { in: 'handlers/root.ts',     out: 'api/index.js' },
  { in: 'handlers/signals.ts',  out: 'api/signals/index.js' },
  { in: 'handlers/council.ts',  out: 'api/council/index.js' },
  { in: 'handlers/inngest.ts',  out: 'api/inngest/index.js' },
];

/**
 * Footer injected into every bundle.
 * Vercel Node.js runtime expects module.exports to BE the handler function
 * (or a function directly), not an object with a .default property.
 * esbuild CJS interop outputs { __esModule: true, default: fn, config: {} }.
 * This footer unwraps .default and keeps .config on it so Vercel can read both.
 */
const HANDLER_FOOTER = `
// Vercel Node.js runtime expects module.exports to be the handler function
if (typeof module.exports.default === 'function') {
  const _fn = module.exports.default;
  if (module.exports.config) _fn.config = module.exports.config;
  module.exports = _fn;
}
`.trim();

for (const { in: entryPoint, out: outfile } of entries) {
  await build({
    entryPoints: [entryPoint],
    bundle: true,
    packages: 'external',   // npm packages stay external, only local files are inlined
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile,
    footer: { js: HANDLER_FOOTER },
    logLevel: 'info',
  });
}

console.log('✅ All API functions bundled successfully.');
