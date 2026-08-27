import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  countLineDiff,
  countUnifiedDiff,
  editsFromToolUpdate,
  looksLikeFilePath,
  mergeEdits,
  totals,
} from './edits';

describe('edits', () => {
  it('counts unified diffs', () => {
    const diff = `--- a/a.ts
+++ b/a.ts
@@ -1,2 +1,3 @@
 keep
-old
+new
+also
`;
    assert.deepEqual(countUnifiedDiff(diff), { added: 2, removed: 1 });
  });

  it('counts line diffs', () => {
    assert.deepEqual(countLineDiff('a\nb\n', 'a\nc\n'), { added: 1, removed: 1 });
  });

  it('merges by path', () => {
    const merged = mergeEdits([
      { path: 'src/a.ts', added: 2, removed: 0 },
      { path: 'src\\a.ts', added: 1, removed: 1 },
    ]);
    assert.equal(merged.length, 1);
    assert.deepEqual(totals(merged), { added: 3, removed: 1 });
  });

  it('detects windows file paths', () => {
    assert.equal(looksLikeFilePath('C:\\Temp\\shot.png'), true);
    assert.equal(looksLikeFilePath('hello world'), false);
  });

  it('keeps nested replay diffs and previous text', () => {
    const found = editsFromToolUpdate({
      kind: 'edit',
      content: {
        type: 'content',
        content: {
          type: 'diff',
          path: 'src/a.ts',
          oldText: 'a\n',
          newText: 'b\n',
        },
      },
    });
    assert.equal(found.length, 1);
    assert.equal(found[0].path, 'src/a.ts');
    assert.equal(found[0].previous, 'a\n');
    assert.equal(found[0].added, 1);
    assert.equal(found[0].removed, 1);
  });
});
