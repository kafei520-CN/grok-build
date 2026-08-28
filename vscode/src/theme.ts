import type { ThemeColors } from './types';

export const DEFAULT_THEME: ThemeColors = {
  primary: '#b9d4ff',
  secondary: '#3fb950',
};

export const THEME_PRESETS: Array<{
  id: string;
  primary: string;
  secondary: string;
  background?: string;
}> = [
  { id: 'ice', primary: '#b9d4ff', secondary: '#3fb950' },
  { id: 'aurora', primary: '#7dd3fc', secondary: '#34d399', background: '#0b1620' },
  { id: 'violet', primary: '#c4b5fd', secondary: '#a78bfa', background: '#14101c' },
  { id: 'sunset', primary: '#fdba74', secondary: '#f59e0b', background: '#1a140f' },
  { id: 'rose', primary: '#fda4af', secondary: '#fb7185', background: '#1a1014' },
  { id: 'ember', primary: '#fcd34d', secondary: '#f97316', background: '#1a150c' },
];

const SURFACE_VARS = ['--bg', '--fg', '--muted', '--elev', '--line', '--hover'] as const;

export function parseHex(raw: unknown): string | undefined {
  if (typeof raw !== 'string') {
    return undefined;
  }
  const value = raw.trim();
  const short = /^#([0-9a-f]{3})$/i.exec(value);
  if (short) {
    const [r, g, b] = short[1];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  const full = /^#([0-9a-f]{6})$/i.exec(value);
  return full ? `#${full[1].toLowerCase()}` : undefined;
}

export function rgbToHex(raw: string): string | undefined {
  const hex = parseHex(raw);
  if (hex) {
    return hex;
  }
  const value = raw.trim();
  const csv = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(value);
  if (csv) {
    return toHex(+csv[1], +csv[2], +csv[3]);
  }
  const spaced = /^rgba?\(\s*(\d+)\s+(\d+)\s+(\d+)/i.exec(value);
  return spaced ? toHex(+spaced[1], +spaced[2], +spaced[3]) : undefined;
}

export function contrastFg(background: string): string {
  return hexLuminance(background) > 0.4 ? '#1c1c1c' : '#e8e8e8';
}

export function normalizeTheme(raw: unknown): ThemeColors {
  const value = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const background = parseHex(value.background);
  return {
    primary: parseHex(value.primary) ?? DEFAULT_THEME.primary,
    secondary: parseHex(value.secondary) ?? DEFAULT_THEME.secondary,
    ...(background ? { background } : {}),
  };
}

export function matchingPresetId(theme: ThemeColors): string | undefined {
  const current = normalizeTheme(theme);
  return THEME_PRESETS.find(
    (row) =>
      row.primary === current.primary &&
      row.secondary === current.secondary &&
      (row.background ?? '') === (current.background ?? ''),
  )?.id;
}

export function applyThemeTo(
  style: { setProperty(name: string, value: string): void; removeProperty?(name: string): void },
  raw: unknown,
): void {
  const theme = normalizeTheme(raw);
  if (theme.background) {
    const fg = contrastFg(theme.background);
    style.setProperty('--bg', theme.background);
    style.setProperty('--fg', fg);
    style.setProperty('--muted', 'color-mix(in srgb, var(--fg) 55%, transparent)');
    style.setProperty('--elev', 'color-mix(in srgb, var(--fg) 6%, var(--bg))');
    style.setProperty('--line', 'color-mix(in srgb, var(--fg) 12%, transparent)');
    style.setProperty('--hover', 'color-mix(in srgb, var(--fg) 8%, transparent)');
  } else {
    for (const name of SURFACE_VARS) {
      style.removeProperty?.(name);
    }
  }
  style.setProperty('--ice', `color-mix(in srgb, ${theme.primary} 72%, var(--fg))`);
  style.setProperty('--ice-dim', 'color-mix(in srgb, var(--ice) 28%, transparent)');
  style.setProperty('--ok', theme.secondary);
}

function toHex(r: number, g: number, b: number): string | undefined {
  if (![r, g, b].every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
    return undefined;
  }
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

function hexLuminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const channel = (shift: number): number => {
    const c = ((n >> shift) & 255) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0);
}
