// Deploys the AI server as one Vercel function (Build Output API), so the GitHub Pages site can call it.
// First time: `npx vercel login`, then `npx vercel env add GEMINI_API_KEY production`.
// Then: `node scripts/deploy-ai.mjs` prints the URL to put in the VITE_AI_URL repository variable.
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const out = '.vercel/output';
const fn = `${out}/functions/api/ai.func`;
rmSync(out, { recursive: true, force: true });
mkdirSync(fn, { recursive: true });

writeFileSync(`${fn}/entry.ts`, "import { createApp } from '../../../../../server/app.ts';\nexport default createApp();\n");
await build({
  entryPoints: [`${fn}/entry.ts`],
  outfile: `${fn}/index.mjs`,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  logLevel: 'warning',
});
rmSync(`${fn}/entry.ts`);
writeFileSync(`${fn}/.vc-config.json`, JSON.stringify({
  runtime: 'nodejs22.x',
  handler: 'index.mjs',
  launcherType: 'Nodejs',
  shouldAddHelpers: false,
  supportsResponseStreaming: true,
  maxDuration: 60,
}));
writeFileSync(`${out}/config.json`, JSON.stringify({
  version: 3,
  routes: [{ src: '^/api/ai(/.*)?$', dest: '/api/ai' }],
}));

if (process.argv.includes('--build-only')) process.exit(0);
execFileSync('npx', ['--yes', 'vercel@latest', 'deploy', '--prebuilt', '--prod', '--yes'], { stdio: 'inherit' });
const { projectName } = JSON.parse(readFileSync('.vercel/project.json', 'utf8'));
console.log(`\nDeployed. VITE_AI_URL = https://${projectName}.vercel.app/api/ai`);
