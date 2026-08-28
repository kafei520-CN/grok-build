import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ATTACH_TEXT_MAX, addActiveFile, type AttachmentHost } from './attachments';
import { bindPlatform, type Platform } from './platform';

function fakePlat(over: Partial<Platform> = {}): Platform {
  return {
    cwd: () => process.cwd(),
    workspaceFolders: () => [process.cwd()],
    homeDir: () => process.cwd(),
    isTrusted: () => true,
    extensionVersion: () => '0',
    pathEnv: () => '',
    os: () => process.platform,
    language: () => 'en',
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

describe('attachments', () => {
  it('keeps small active files inline', () => {
    bindPlatform(
      fakePlat({
        getActiveFile: () => ({ path: '/work/app/small.ts', text: 'export const n = 1;\n' }),
      }),
    );
    const host: AttachmentHost = { attachments: [], emit() {} };
    addActiveFile(host);
    assert.equal(host.attachments[0]?.text, 'export const n = 1;\n');
  });

  it('drops inline text when the active file is too large', () => {
    bindPlatform(
      fakePlat({
        getActiveFile: () => ({
          path: '/work/app/huge.ts',
          text: 'x'.repeat(ATTACH_TEXT_MAX),
        }),
      }),
    );
    const host: AttachmentHost = { attachments: [], emit() {} };
    addActiveFile(host);
    assert.equal(host.attachments[0]?.path, '/work/app/huge.ts');
    assert.equal(host.attachments[0]?.text, undefined);
  });
});
