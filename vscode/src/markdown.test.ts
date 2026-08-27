import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { escapeHtml, fileName, renderMarkdown, safeUrl } from './webview/markdown';

describe('markdown', () => {
  it('escapes HTML then applies inline marks', () => {
    assert.equal(escapeHtml('<b>'), '&lt;b&gt;');
    assert.equal(
      renderMarkdown('**hi** and `x`'),
      '<p><strong>hi</strong> and <code>x</code></p>',
    );
  });

  it('keeps fenced code blocks', () => {
    const html = renderMarkdown('before\n```js\n<a>\n```\nafter');
    assert.match(html, /<pre class="code" data-lang="js"><code>&lt;a&gt;<\/code><\/pre>/);
    assert.match(html, /<p>before<\/p>/);
    assert.match(html, /<p>after<\/p>/);
  });

  it('renders headings, lists, quotes, and breaks', () => {
    const html = renderMarkdown(
      ['# Title', '', '- one', '- two', '', '> quoted **x**', '', 'hello', 'world'].join('\n'),
    );
    assert.match(html, /<h1>Title<\/h1>/);
    assert.match(html, /<ul><li>one<\/li><li>two<\/li><\/ul>/);
    assert.match(html, /<blockquote><p>quoted <strong>x<\/strong><\/p><\/blockquote>/);
    assert.match(html, /<p>hello<br \/>world<\/p>/);
  });

  it('renders nested lists and tables', () => {
    const html = renderMarkdown(
      [
        '- a',
        '  - b',
        '- c',
        '',
        '| A | B |',
        '| --- | ---: |',
        '| **1** | 2 |',
      ].join('\n'),
    );
    assert.match(html, /<ul><li>a<ul><li>b<\/li><\/ul><\/li><li>c<\/li><\/ul>/);
    assert.match(html, /<th style="text-align:right">B<\/th>/);
    assert.match(html, /<td style="text-align:left"><strong>1<\/strong><\/td>/);
  });

  it('renders links and rejects javascript urls', () => {
    const html = renderMarkdown('see [docs](https://x.ai) and [x](javascript:alert(1))');
    assert.match(html, /<a href="https:\/\/x.ai" rel="noreferrer noopener">docs<\/a>/);
    assert.doesNotMatch(html, /javascript:/);
    assert.match(html, /and x/);
    assert.equal(safeUrl('javascript:alert(1)'), undefined);
    assert.ok(safeUrl('https://x.ai'));
  });

  it('takes the basename of mixed path styles', () => {
    assert.equal(fileName('src\\foo\\bar.ts'), 'bar.ts');
    assert.equal(fileName('/tmp/a.txt'), 'a.txt');
  });
});
