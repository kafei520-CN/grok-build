import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  addSnapshot,
  alreadyCaptured,
  isProbablyText,
  normalizeFsPath,
  planRevert,
  type FileSnapshot,
} from './snapshots';

describe('snapshots', () => {
  it('normalizes windows paths', () => {
    assert.equal(normalizeFsPath('e:\\tmp\\a.ts'), 'E:/tmp/a.ts');
    assert.equal(normalizeFsPath('E:/tmp/a.ts'), 'E:/tmp/a.ts');
  });

  it('dedupes captures', () => {
    const first: FileSnapshot = {
      absPath: 'E:/tmp/a.ts',
      displayPath: 'a.ts',
      existed: true,
      previous: 'old',
    };
    const list = addSnapshot([], first);
    assert.equal(alreadyCaptured(list, 'e:\\tmp\\a.ts'), true);
    assert.equal(addSnapshot(list, { ...first, previous: 'other' }).length, 1);
  });

  it('plans restore, delete, and skip', () => {
    const plans = planRevert([
      { absPath: '/a.ts', displayPath: 'a.ts', existed: true, previous: 'keep' },
      { absPath: '/b.ts', displayPath: 'b.ts', existed: false },
      { absPath: '/c.bin', displayPath: 'c.bin', existed: true },
    ]);
    assert.deepEqual(
      plans.map((item) => item.action),
      ['restore', 'delete', 'skip'],
    );
  });

  it('rejects nul bytes as text', () => {
    assert.equal(isProbablyText(Buffer.from('hello')), true);
    assert.equal(isProbablyText(Buffer.from([1, 0, 2])), false);
  });
});
