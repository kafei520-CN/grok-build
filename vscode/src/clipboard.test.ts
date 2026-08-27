import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { clipboardToPath, splitClipboardPaths } from './clipboard';

describe('clipboard paths', () => {
  it('splits file paths from pasted text', () => {
    assert.deepEqual(splitClipboardPaths('E:\\tmp\\a.txt\nnot a path\n/tmp/b.ts'), [
      'E:\\tmp\\a.txt',
      '/tmp/b.ts',
    ]);
  });

  it('decodes file URIs', () => {
    assert.equal(clipboardToPath('file:///C:/Users/a/b.txt'), 'C:/Users/a/b.txt');
    assert.equal(clipboardToPath('C:\\Users\\a\\b.txt'), 'C:\\Users\\a\\b.txt');
    assert.equal(clipboardToPath('hello'), undefined);
  });
});
