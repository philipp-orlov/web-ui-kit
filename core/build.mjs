// Builds @ui-kit/core: one ES module per entry point (shared code split into chunks, so two entry points never carry
// two copies of a module), and the .d.ts files from tsc. No framework, no runtime dependencies.
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { build } from 'esbuild';

const entries = ['index', 'grid', 'charts', 'export', 'format', 'theme', 'dom', 'hex', 'split', 'dewarp'];

rmSync('dist', { recursive: true, force: true });
await build({
  entryPoints: Object.fromEntries(entries.map(e => [e === 'index' ? 'index' : `${e}/index`, e === 'index' ? 'src/index.ts' : `src/${e}/index.ts`])),
  outdir: 'dist',
  bundle: true,
  splitting: true,
  format: 'esm',
  target: 'es2022',
  platform: 'browser',
  sourcemap: true,
  chunkNames: 'chunks/[name]-[hash]',
  external: ['hls.js'],
  logLevel: 'warning',
});
execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.build.json'], { stdio: 'inherit' });
console.log('built dist/');
