import * as esbuild from 'esbuild';
import { mkdirSync } from 'node:fs';

const watch = process.argv.includes('--watch');
const test = process.argv.includes('--test');

mkdirSync('dist/test', { recursive: true });

const common = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  logLevel: 'info',
};

const extension = {
  ...common,
  entryPoints: ['src/extension.ts'],
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
};

const webview = {
  ...common,
  entryPoints: ['src/webview/main.ts'],
  outfile: 'dist/webview.js',
  platform: 'browser',
  format: 'iife',
  target: 'es2022',
  external: [],
};

const diffView = {
  ...common,
  entryPoints: ['src/webview/diff.ts'],
  outfile: 'dist/diff.js',
  platform: 'browser',
  format: 'iife',
  target: 'es2022',
  external: [],
};

const host = {
  ...common,
  entryPoints: ['src/sidecar.ts'],
  outfile: 'dist/host.js',
  format: 'cjs',
  banner: { js: '#!/usr/bin/env node' },
};

const tests = {
  ...common,
  entryPoints: [
    'src/authMethods.test.ts',
    'src/cli.test.ts',
    'src/rpc.test.ts',
    'src/slash.test.ts',
    'src/edits.test.ts',
    'src/i18n.test.ts',
    'src/snapshots.test.ts',
    'src/diff.test.ts',
    'src/context.test.ts',
    'src/clipboard.test.ts',
    'src/markdown.test.ts',
    'src/settings.test.ts',
    'src/sessionUpdates.test.ts',
    'src/sessionRow.test.ts',
    'src/sessionGroups.test.ts',
    'src/rulesHost.test.ts',
    'src/skillsHost.test.ts',
    'src/grokDirs.test.ts',
    'src/apiEndpoints.test.ts',
    'src/incoming.test.ts',
    'src/errors.test.ts',
    'src/theme.test.ts',
    'src/fileSearch.test.ts',
  ],
  outdir: 'dist/test',
  format: 'cjs',
  external: ['vscode'],
  outExtension: { '.js': '.js' },
};

async function run() {
  if (test) {
    await esbuild.build(tests);
    return;
  }
  if (watch) {
    const ctxs = await Promise.all([
      esbuild.context(extension),
      esbuild.context(webview),
      esbuild.context(diffView),
      esbuild.context(host),
    ]);
    await Promise.all(ctxs.map((ctx) => ctx.watch()));
    return;
  }
  await Promise.all([
    esbuild.build(extension),
    esbuild.build(webview),
    esbuild.build(diffView),
    esbuild.build(host),
  ]);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
