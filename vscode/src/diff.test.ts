import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildFileDiff, collapseRows, diffOps, opsToRows } from './diff';

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
