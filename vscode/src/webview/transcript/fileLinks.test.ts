import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fileLinkHtml, linkInlineFilePaths, looksLikeInlinePath } from './fileLinks';

describe('inline file links', () => {
  it('accepts windows, unix, and repo-relative paths', () => {
    assert.equal(looksLikeInlinePath('C:\\Users\\a\\b.ts'), true);
    assert.equal(looksLikeInlinePath('file:///C:/work/a.ts'), true);
    assert.equal(looksLikeInlinePath('/tmp/note.md'), true);
    assert.equal(looksLikeInlinePath('plugin/src/chat/controller.ts'), true);
    assert.equal(looksLikeInlinePath('./foo.json'), true);
    assert.equal(looksLikeInlinePath('README.md'), true);
  });

  it('rejects urls, prose, and unknown extensions', () => {
    assert.equal(looksLikeInlinePath('https://example.com/a.ts'), false);
    assert.equal(looksLikeInlinePath('hello world'), false);
    assert.equal(looksLikeInlinePath('this.value'), false);
    assert.equal(looksLikeInlinePath('e.g.'), false);
  });

  it('renders a blue filename chip with the full path on the button', () => {
    const html = fileLinkHtml('plugin/src/foo.ts');
    assert.match(html, /class="md-file"/);
    assert.match(html, /data-path="plugin\/src\/foo.ts"/);
    assert.match(html, />foo\.ts<\/span>/);
    assert.match(html, /md-file-icon/);
  });

  it('chips only an @ path and leaves fractions alone', () => {
    const slots: string[] = [];
    const stash = (html: string) => {
      slots.push(html);
      return `\u0000${slots.length - 1}\u0000`;
    };
    const next = linkInlineFilePaths('see @File:"plugin/src/foo.ts" and 1/5 please', stash);
    assert.equal(next, `see \u00000\u0000 and 1/5 please`);
    assert.match(slots[0] ?? '', /foo\.ts/);
    assert.equal(linkInlineFilePaths('see @plugin/src/foo.ts please', stash), 'see @plugin/src/foo.ts please');
    assert.equal(linkInlineFilePaths('see @File:"1/5" please', stash), 'see @File:"1/5" please');
  });

  it('keeps the line on a file chip and pairs a line chip with that file', () => {
    const slots: string[] = [];
    const stash = (html: string) => {
      slots.push(html);
      return `\u0000${slots.length - 1}\u0000`;
    };
    linkInlineFilePaths('@File:"plugin/src/foo.ts (line 9)"\n@Line:"updateTarget(line 12)"', stash);
    assert.match(slots[0] ?? '', /data-path="plugin\/src\/foo.ts"/);
    assert.match(slots[0] ?? '', /data-line="9"/);
    assert.match(slots[1] ?? '', /data-path="plugin\/src\/foo.ts"/);
    assert.match(slots[1] ?? '', /data-line="12"/);
    assert.match(slots[1] ?? '', /data-symbol="updateTarget"/);
    slots.length = 0;
    linkInlineFilePaths('@Line:"updateTarget(line 4)" in @File:"plugin/src/foo.ts:4"', stash);
    assert.match(slots[0] ?? '', /data-path="plugin\/src\/foo.ts"/);
    assert.match(slots[0] ?? '', /data-line="4"/);
    assert.match(slots[1] ?? '', /data-line="4"/);
    assert.doesNotMatch(slots[1] ?? '', /foo\.ts:4/);
  });
});
