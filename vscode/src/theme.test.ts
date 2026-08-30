import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_THEME,
  THEME_PRESETS,
  applyThemeTo,
  contrastFg,
  matchingPresetId,
  normalizeTheme,
  parseHex,
  rgbToHex,
} from './theme';

describe('theme', () => {
  it('parses 3-digit and 6-digit hex', () => {
    assert.equal(parseHex('#ABC'), '#aabbcc');
    assert.equal(parseHex('#b9d4ff'), '#b9d4ff');
    assert.equal(parseHex('  #3FB950  '), '#3fb950');
    assert.equal(parseHex('red'), undefined);
    assert.equal(parseHex('#gg0000'), undefined);
    assert.equal(parseHex('#ffff'), undefined);
  });

  it('parses computed rgb colors', () => {
    assert.equal(rgbToHex('rgb(30, 30, 30)'), '#1e1e1e');
    assert.equal(rgbToHex('rgba(11, 22, 32, 1)'), '#0b1620');
    assert.equal(rgbToHex('rgb(11 22 32)'), '#0b1620');
    assert.equal(rgbToHex('#0B1620'), '#0b1620');
    assert.equal(rgbToHex('transparent'), undefined);
  });

  it('falls back to the Ice palette without locking a background', () => {
    assert.deepEqual(normalizeTheme(undefined), DEFAULT_THEME);
    assert.equal(normalizeTheme(undefined).background, undefined);
    assert.deepEqual(normalizeTheme({ primary: 'nope', secondary: '#0f0' }), {
      primary: DEFAULT_THEME.primary,
      secondary: '#00ff00',
    });
    assert.equal(normalizeTheme({ background: '#0b1620' }).background, '#0b1620');
    assert.equal(normalizeTheme({ wallpaper: 'icon', wallpaperOpacity: 40 }).wallpaper, 'icon');
    assert.equal(normalizeTheme({ wallpaper: 'icon', wallpaperOpacity: 40 }).wallpaperOpacity, 40);
    assert.equal(normalizeTheme({ wallpaper: 'custom' }).wallpaper, undefined);
    assert.equal(normalizeTheme({ surface: 'glass' }).surface, 'glass');
    assert.equal(
      normalizeTheme({ wallpaper: 'icon', wallpaperScale: 140, wallpaperX: 20, wallpaperY: 80 }).wallpaperScale,
      140,
    );
    assert.equal(normalizeTheme({ wallpaper: 'icon' }).wallpaperScale, undefined);
    assert.equal(normalizeTheme({ surface: 'glass' }).glassOpacity, 46);
    assert.equal(normalizeTheme({ surface: 'glass', glassOpacity: 70 }).glassOpacity, 70);
    assert.equal(normalizeTheme({ surface: 'glass' }).glassBlur, 18);
    assert.equal(normalizeTheme({ surface: 'glass', glassBlur: 28 }).glassBlur, 28);
  });

  it('matches presets including background', () => {
    assert.equal(matchingPresetId(DEFAULT_THEME), 'ice');
    assert.equal(matchingPresetId(THEME_PRESETS[1]), 'aurora');
    assert.equal(matchingPresetId({ ...DEFAULT_THEME, background: '#111111' }), undefined);
    assert.equal(matchingPresetId({ primary: '#ff00aa', secondary: '#00ffaa' }), undefined);
  });

  it('picks dark text on light backgrounds', () => {
    assert.equal(contrastFg('#f5f5f5'), '#1c1c1c');
    assert.equal(contrastFg('#0b1620'), '#e8e8e8');
  });

  it('writes ice/ok and surface CSS variables', () => {
    const props = new Map<string, string>();
    applyThemeTo(
      {
        setProperty: (name, value) => props.set(name, value),
        removeProperty: (name) => {
          props.delete(name);
        },
      },
      { primary: '#ff0000', secondary: '#00ff00', background: '#0b1620' },
    );
    assert.equal(props.get('--ok'), '#00ff00');
    assert.equal(props.get('--bg'), '#0b1620');
    assert.equal(props.get('--fg'), '#e8e8e8');
    assert.equal(props.get('--ice'), 'color-mix(in srgb, #ff0000 72%, var(--fg))');
    applyThemeTo(
      {
        setProperty: (name, value) => props.set(name, value),
        removeProperty: (name) => {
          props.delete(name);
        },
      },
      DEFAULT_THEME,
    );
    assert.equal(props.has('--bg'), false);
    assert.equal(props.get('--ok'), DEFAULT_THEME.secondary);
  });
});
