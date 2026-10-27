const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const vscodeRoot = path.resolve(__dirname, '..');
const pkg = require('../package.json');
const outDir = path.resolve(vscodeRoot, '..', 'packages', 'vscode');
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, `grok-for-vs-code-${pkg.version}.vsix`);
// shell:true on Windows splits an unquoted path at the space in "OpenGrok Project".
const outArg = process.platform === 'win32' ? `"${out}"` : out;
const result = spawnSync('npx', ['--yes', '@vscode/vsce', 'package', '--out', outArg], {
  cwd: vscodeRoot,
  stdio: 'inherit',
  shell: true,
});
process.exit(result.status ?? 1);
