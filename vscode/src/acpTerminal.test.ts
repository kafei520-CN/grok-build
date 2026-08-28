import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { handleTerminalMethod, spawnProcessTerminal } from './acpTerminal';
import { bindPlatform, type Platform } from './platform';

function fakePlat(): Platform {
  return {
    cwd: () => process.cwd(),
    workspaceFolders: () => [],
    homeDir: () => process.cwd(),
    isTrusted: () => true,
    extensionVersion: () => '0',
    pathEnv: () => '',
    os: () => process.platform,
    getConfig: (_key, fallback) => fallback,
    setConfig: async () => {},
    getState: (_key, fallback) => fallback,
    setState: async () => {},
    log() {},
    showLog() {},
    info() {},
    warn() {},
    input: async () => undefined,
    confirm: async () => false,
    pick: async () => undefined,
    saveFile: async () => undefined,
    openFiles: async () => undefined,
    openFolders: async () => undefined,
    readDir: async () => [],
    openExternal: async () => {},
    openFile: async () => {},
    clipboardWrite: async () => {},
    findFiles: async () => [],
    relativePath: (filePath) => filePath,
    readFile: async () => new Uint8Array(),
    writeFile: async () => {},
    deleteFile: async () => {},
    fileExists: async () => false,
    createTerminal() {},
    spawnAgentTerminal: spawnProcessTerminal,
    closeSidebar: async () => {},
    focusChat() {},
    getActiveSelection: () => undefined,
    getActiveFile: () => undefined,
    onTrustChange: () => ({ dispose() {} }),
    onConfigChange: () => ({ dispose() {} }),
  };
}

describe('acp terminal', () => {
  it('runs a command and returns output', async () => {
    bindPlatform(fakePlat());
    const created = (await handleTerminalMethod('terminal/create', {
      command: process.platform === 'win32' ? 'echo hello-acp' : 'echo hello-acp',
    })) as { terminalId: string };
    assert.ok(created.terminalId);
    const exit = (await handleTerminalMethod('terminal/wait_for_exit', {
      terminalId: created.terminalId,
    })) as { exitCode?: number };
    assert.equal(exit.exitCode, 0);
    const out = (await handleTerminalMethod('terminal/output', {
      terminalId: created.terminalId,
    })) as { output: string; truncated: boolean };
    assert.match(out.output, /hello-acp/);
    assert.equal(out.truncated, false);
    await handleTerminalMethod('terminal/release', { terminalId: created.terminalId });
  });
});
