import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { writeWorkspaceFile } from './clientHandlers';
import { bindPlatform, type Platform } from './platform';

function fakePlat(over: Partial<Platform>): Platform {
  return {
    cwd: () => '/tmp',
    workspaceFolders: () => ['/tmp'],
    homeDir: () => '/tmp',
    isTrusted: () => true,
    extensionVersion: () => '0',
    pathEnv: () => '',
    os: () => 'linux',
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
    closeSidebar: async () => {},
    focusChat() {},
    getActiveSelection: () => undefined,
    getActiveFile: () => undefined,
    onTrustChange: () => ({ dispose() {} }),
    onConfigChange: () => ({ dispose() {} }),
    ...over,
  };
}

describe('workspace writes', () => {
  it('applies through an open editor instead of writing the disk', async () => {
    const applied: string[] = [];
    const disk: string[] = [];
    bindPlatform(
      fakePlat({
        openText: () => 'old',
        applyText: async (_path, text) => {
          applied.push(text);
          return true;
        },
        writeFile: async () => {
          disk.push('disk');
        },
      }),
    );
    await writeWorkspaceFile({ path: '/tmp/a.ts', content: 'new' });
    assert.deepEqual(applied, ['new']);
    assert.deepEqual(disk, []);
  });

  it('does not clobber a dirty buffer when applyEdit fails', async () => {
    bindPlatform(
      fakePlat({
        openText: () => 'dirty',
        applyText: async () => false,
        writeFile: async () => {
          throw new Error('should not write disk');
        },
      }),
    );
    await assert.rejects(
      () => writeWorkspaceFile({ path: '/tmp/a.ts', content: 'new' }),
      /open file/,
    );
  });

  it('writes the disk when the file is not open', async () => {
    const disk: string[] = [];
    bindPlatform(
      fakePlat({
        writeFile: async (_path, data) => {
          disk.push(Buffer.from(data).toString('utf8'));
        },
      }),
    );
    await writeWorkspaceFile({ path: '/tmp/b.ts', content: 'fresh' });
    assert.deepEqual(disk, ['fresh']);
  });
});
