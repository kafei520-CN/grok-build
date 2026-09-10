import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { foldCarriageReturns, renderTermHtml } from './termAnsi';
import { normalizeTermEncoding } from './termEncoding';
import { decodeTermBytes, decodeTermUnknown } from './termText';

describe('term encoding', () => {
  it('defaults unknown labels to utf-8', () => {
    assert.equal(normalizeTermEncoding(''), 'utf-8');
    assert.equal(normalizeTermEncoding('UTF8'), 'utf-8');
    assert.equal(normalizeTermEncoding('cp936'), 'gbk');
    assert.equal(normalizeTermEncoding('nope'), 'utf-8');
  });

  it('decodes gbk bytes when the runtime supports the label', () => {
    const bytes = Uint8Array.from([0xc4, 0xe3, 0xba, 0xc3]);
    let supported = true;
    try {
      new TextDecoder('gbk');
    } catch {
      supported = false;
    }
    if (!supported) {
      return;
    }
    assert.equal(decodeTermBytes(bytes, 'gbk'), '你好');
    assert.equal(decodeTermUnknown(Buffer.from(bytes).toJSON().data, 'gbk'), '你好');
  });

  it('keeps an already-decoded string', () => {
    assert.equal(decodeTermUnknown('ok', 'gbk'), 'ok');
  });
});

describe('term html', () => {
  it('folds CR progress onto the last segment', () => {
    assert.equal(foldCarriageReturns('a\rbo\rok\n'), 'ok\n');
  });

  it('escapes html and paints basic sgr colors', () => {
    const html = renderTermHtml('hi \x1b[31m<red>\x1b[0m');
    assert.equal(html.includes('&lt;red&gt;'), true);
    assert.equal(html.includes('t-fg-31'), true);
    assert.equal(html.includes('<red>'), false);
  });
});
