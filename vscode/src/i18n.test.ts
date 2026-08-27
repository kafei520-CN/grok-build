import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EN, ZH, formatDuration, resolveLocale, t, toolKindLabel } from './i18n';

describe('i18n', () => {
  it('resolves auto from VS Code language', () => {
    assert.equal(resolveLocale('auto', 'zh-cn'), 'zh-CN');
    assert.equal(resolveLocale(undefined, 'zh-tw'), 'zh-CN');
    assert.equal(resolveLocale('auto', 'en'), 'en');
    assert.equal(resolveLocale('en', 'zh-cn'), 'en');
    assert.equal(resolveLocale('zh-CN', 'en'), 'zh-CN');
  });

  it('keeps Chinese and English catalogs in sync', () => {
    const enKeys = Object.keys(EN).sort();
    const zhKeys = Object.keys(ZH).sort();
    assert.deepEqual(zhKeys, enKeys);
  });

  it('fills placeholders', () => {
    assert.equal(t('en', 'editsTitle', { n: 3 }), '3 changes');
    assert.equal(t('zh-CN', 'editsTitle', { n: 3 }), '3 处修改');
  });

  it('labels collapsed tool kinds', () => {
    assert.equal(toolKindLabel('en', 'read'), 'Read');
    assert.equal(toolKindLabel('zh-CN', 'execute'), '终端');
  });

  it('formats elapsed work time', () => {
    assert.equal(formatDuration(42_000), '42s');
    assert.equal(formatDuration(15 * 60_000 + 42_000), '15m 42s');
    assert.equal(t('zh-CN', 'elapsed', { time: '15m 42s' }), '用时 15m 42s');
  });
});
