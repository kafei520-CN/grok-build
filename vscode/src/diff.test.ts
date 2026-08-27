import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildFileDiff, collapseRows, diffOps, opsToRows, pairReplacements, splitLines } from './diff';

describe('diff', () => {
  it('replaces a middle line', () => {
    const ops = diffOps(['a', 'b', 'c'], ['a', 'x', 'c']);
    assert.deepEqual(
      ops.map((op) => op.type),
      ['equal', 'del', 'add', 'equal'],
    );
  });

  it('handles create and delete', () => {
    assert.equal(diffOps([], ['n']).every((op) => op.type === 'add'), true);
    assert.equal(diffOps(['o'], []).every((op) => op.type === 'del'), true);
  });

  it('numbers side-by-side rows', () => {
    const rows = opsToRows(diffOps(['keep', 'old'], ['keep', 'new']));
    assert.equal(rows[0]?.beforeNo, 1);
    assert.equal(rows[1]?.type, 'del');
    assert.equal(rows[1]?.beforeNo, 2);
    assert.equal(rows[2]?.type, 'add');
    assert.equal(rows[2]?.afterNo, 2);
  });

  it('collapses unchanged runs', () => {
    const before = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const after = ['a', 'b', 'c', 'X', 'e', 'f', 'g'];
    const hunks = collapseRows(opsToRows(diffOps(before, after)), 1);
    assert.equal(hunks[0]?.kind, 'gap');
    assert.equal(hunks.some((hunk) => hunk.kind === 'block'), true);
  });

  it('pairs a replacement onto one split row', () => {
    const rows = pairReplacements(opsToRows(diffOps(['keep', 'old'], ['keep', 'new'])));
    assert.equal(rows[1]?.type, 'replace');
    assert.equal(rows[1]?.beforeText, 'old');
    assert.equal(rows[1]?.afterText, 'new');
  });

  it('normalizes crlf before counting', () => {
    const file = buildFileDiff({
      path: 'a.ts',
      absPath: '/a.ts',
      before: 'a\r\nb\r\n',
      after: 'a\nb\n',
    });
    assert.equal(file.added, 0);
    assert.equal(file.removed, 0);
    assert.deepEqual(splitLines('a\r\nb'), ['a', 'b']);
  });

  it('counts a few edits in a large file instead of rewriting it', () => {
    const before = Array.from({ length: 1700 }, (_, i) => `line-${i}`);
    const after = before.slice();
    after[10] = 'changed-10';
    after.splice(100, 0, 'inserted');
    const file = buildFileDiff({
      path: 'big.css',
      absPath: '/big.css',
      before: before.join('\n'),
      after: after.join('\n'),
    });
    assert.equal(file.added, 2);
    assert.equal(file.removed, 1);
  });

  it('builds file stats', () => {
    const file = buildFileDiff({
      path: 'a.ts',
      absPath: '/a.ts',
      before: 'one\ntwo\n',
      after: 'one\nTWO\nthree\n',
    });
    assert.equal(file.added > 0, true);
    assert.equal(file.removed > 0, true);
    assert.equal(file.created, false);
  });
});
