const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const vscodeRoot = path.resolve(__dirname, '..');
const pkg = require('../package.json');
const relayJs = path.join(vscodeRoot, 'dist', 'relay.js');
if (!fs.existsSync(relayJs)) {
  const compile = spawnSync('npm', ['run', 'compile'], {
    cwd: vscodeRoot,
    stdio: 'inherit',
    shell: true,
  });
  if ((compile.status ?? 1) !== 0) {
    process.exit(compile.status ?? 1);
  }
}

const outDir = path.resolve(vscodeRoot, '..', 'packages', 'web');
const folderName = `grok-web-${pkg.version}`;
const stage = path.join(outDir, folderName);
fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(stage, { recursive: true });
fs.copyFileSync(relayJs, path.join(stage, 'relay.js'));
fs.copyFileSync(
  path.join(vscodeRoot, 'resources', 'relay', 'grok-relay.service'),
  path.join(stage, 'grok-web.service'),
);
fs.writeFileSync(
  path.join(stage, 'start.cmd'),
  [
    '@echo off',
    'cd /d "%~dp0"',
    'if not "%~1"=="" if not "%~1"=="--reset-admin" set GROK_RELAY_PORT=%~1',
    'node relay.js %*',
    '',
  ].join('\r\n'),
);
fs.writeFileSync(
  path.join(stage, 'start.sh'),
  '#!/bin/sh\ncd "$(dirname "$0")"\ncase "$1" in\n  --reset-admin) ;;\n  [0-9]*) export GROK_RELAY_PORT="$1" ;;\nesac\nexec node relay.js "$@"\n',
);

const zip = path.join(outDir, `${folderName}.zip`);
fs.rmSync(zip, { force: true });
const packed = spawnSync('tar', ['-a', '-c', '-f', zip, folderName], {
  cwd: outDir,
  stdio: 'inherit',
  shell: true,
});
if ((packed.status ?? 1) !== 0) {
  process.exit(packed.status ?? 1);
}
process.stdout.write(`DONE  Packaged: ${zip}\n`);
