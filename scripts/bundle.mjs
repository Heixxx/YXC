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

for (const { in: entryPoint, out: outfile } of entries) {
  await build({
    entryPoints: [entryPoint],
    bundle: true,
    packages: 'external',   // npm packages stay external, only local files are inlined
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile,
    logLevel: 'info',
  });
}

console.log('✅ All API functions bundled successfully.');
