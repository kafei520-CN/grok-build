import * as esbuild from 'esbuild';
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import * as path from 'node:path';

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

const shikiMonaco = {
  ...common,
  entryPoints: ['src/webview/shiki-monaco.ts'],
  outfile: 'dist/shiki-monaco.js',
  platform: 'browser',
  format: 'iife',
  target: 'es2022',
  external: [],
};

const tests = {
  ...common,
  entryPoints: [
    'src/authMethods.test.ts',
    'src/billing.test.ts',
    'src/cli.test.ts',
    'src/rpc.test.ts',
    'src/slash.test.ts',
    'src/edits.test.ts',
    'src/i18n.test.ts',
    'src/snapshots.test.ts',
    'src/sessionDiffs.test.ts',
    'src/diff.test.ts',
    'src/context.test.ts',
    'src/clipboard.test.ts',
    'src/contextWindow.test.ts',
    'src/wallpaper.test.ts',
    'src/markdown.test.ts',
    'src/streamTail.test.ts',
    'src/imageTool.test.ts',
    'src/settings.test.ts',
    'src/sessionUpdates.test.ts',
    'src/sessionRow.test.ts',
    'src/sessionGroups.test.ts',
    'src/rulesHost.test.ts',
    'src/skillsHost.test.ts',
    'src/grokDirs.test.ts',
    'src/apiEndpoints.test.ts',
    'src/incoming.test.ts',
    'src/workspaceImages.test.ts',
    'src/errors.test.ts',
    'src/theme.test.ts',
    'src/permissions.test.ts',
    'src/mcpHost.test.ts',
    'src/clientHandlers.test.ts',
    'src/startup.test.ts',
    'src/acpTerminal.test.ts',
    'src/fileSearch.test.ts',
    'src/fork.test.ts',
    'src/roster.test.ts',
    'src/agentsHost.test.ts',
    'src/personasHost.test.ts',
    'src/worktreeHost.test.ts',
    'src/extensionsHost.test.ts',
    'src/tasksHost.test.ts',
    'src/planAsk.test.ts',
    'src/attachments.test.ts',
    'src/slashHost.test.ts',
    'src/liveEdits.test.ts',
    'src/permissionView.test.ts',
    'src/webview/scroll.test.ts',
    'src/webview/popover.test.ts',
    'src/webview/monaco.test.ts',
    'src/controller.test.ts',
    'src/dispatch.test.ts',
    'src/reconnect.test.ts',
    'src/notify.test.ts',
    'src/remoteGateway.test.ts',
    'src/remoteState.test.ts',
    'src/remoteTunnel.test.ts',
    'src/workspaceIndex.test.ts',
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
  copyMonaco();
  if (watch) {
    const ctxs = await Promise.all([
      esbuild.context(extension),
      esbuild.context(webview),
      esbuild.context(diffView),
      esbuild.context(host),
      esbuild.context(shikiMonaco),
    ]);
    await Promise.all(ctxs.map((ctx) => ctx.watch()));
    return;
  }
  await Promise.all([
    esbuild.build(extension),
    esbuild.build(webview),
    esbuild.build(diffView),
    esbuild.build(host),
    esbuild.build(shikiMonaco),
  ]);
}

function copyMonaco() {
  const src = path.join('node_modules', 'monaco-editor', 'min', 'vs');
  const dest = path.join('dist', 'monaco', 'vs');
  if (!existsSync(src)) {
    console.warn('monaco-editor missing; remote workspace falls back to a textarea');
    return;
  }
  mkdirSync(path.dirname(dest), { recursive: true });
  try {
    cpSync(src, dest, {
      recursive: true,
      filter: (from) => !from.endsWith('.map'),
    });
  } catch (error) {
    if (existsSync(path.join(dest, 'loader.js'))) {
      console.warn('monaco copy skipped; existing dist/monaco/vs kept');
      return;
    }
    throw error;
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
