import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, it } from 'node:test';
import { locateChip } from './openTarget';

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'grok-chip-'));
}

describe('locateChip', () => {
  it('resolves a workspace-relative file and keeps the cited line', () => {
    const root = tempRoot();
    try {
      const file = path.join(root, 'src', 'foo.ts');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, 'export const ready = true;\n');
      const hit = locateChip({ path: 'src/foo.ts', line: 12 }, [root]);
      assert.equal(hit?.kind, 'file');
      assert.equal(path.normalize(hit?.path ?? ''), path.normalize(file));
      assert.equal(hit?.line, 12);
      const colon = locateChip({ path: 'src/foo.ts:9' }, [root]);
      assert.equal(colon?.line, 9);
      assert.equal(path.normalize(colon?.path ?? ''), path.normalize(file));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('finds a line chip by the symbol on that line', () => {
    const root = tempRoot();
    try {
      const file = path.join(root, 'src', 'App.kt');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const lines = Array.from({ length: 20 }, () => 'val x = 1');
      lines[11] = 'fun updateTarget() {';
      fs.writeFileSync(file, lines.join('\n'));
      const hit = locateChip({ path: '', symbol: 'updateTarget', line: 12 }, [root]);
      assert.equal(path.normalize(hit?.path ?? ''), path.normalize(file));
      assert.equal(hit?.line, 12);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('opens a folder chip as a directory', () => {
    const root = tempRoot();
    try {
      const dir = path.join(root, 'src');
      fs.mkdirSync(dir, { recursive: true });
      const hit = locateChip({ path: 'src/' }, [root]);
      assert.equal(hit?.kind, 'dir');
      assert.equal(path.normalize(hit?.path ?? ''), path.normalize(dir));
      assert.equal(hit?.line, undefined);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
