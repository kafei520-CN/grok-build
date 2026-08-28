import type { StringKey } from '../i18n';
import {
  DEFAULT_THEME,
  THEME_PRESETS,
  applyThemeTo,
  matchingPresetId,
  normalizeTheme,
  parseHex,
  rgbToHex,
} from '../theme';
import type { ThemeColors } from '../types';
import { post, tr, ui } from './app';
import { iconChevron } from './icons';

const PRESET_KEYS: Record<string, StringKey> = {
  ice: 'themePresetIce',
  aurora: 'themePresetAurora',
  violet: 'themePresetViolet',
  sunset: 'themePresetSunset',
  rose: 'themePresetRose',
  ember: 'themePresetEmber',
};

export function themeNavRow(): HTMLElement {
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'settings-row settings-link';
  const copy = document.createElement('div');
  copy.className = 'settings-copy';
  const name = document.createElement('div');
  name.className = 'settings-label';
  name.textContent = tr('settingsTheme');
  const hint = document.createElement('div');
  hint.className = 'settings-hint';
  const presetId = matchingPresetId(normalizeTheme(ui.state.theme));
  hint.textContent = presetId ? presetLabel(presetId) : tr('themeCustom');
  copy.append(name, hint);
  const chevron = document.createElement('span');
  chevron.className = 'settings-chevron';
  chevron.innerHTML = iconChevron();
  row.append(copy, chevron);
  row.addEventListener('click', () => post({ type: 'openTheme' }));
  return row;
}

let live = DEFAULT_THEME;
let primaryInputs: { set: (hex: string) => void } | undefined;
let secondaryInputs: { set: (hex: string) => void } | undefined;
let backgroundInputs: { set: (hex: string) => void } | undefined;
let autoBtn: HTMLButtonElement | undefined;

export function mountThemeBody(): HTMLElement {
  const body = document.createElement('div');
  body.className = 'settings-body';
  live = normalizeTheme(ui.state.theme);
  const hint = document.createElement('div');
  hint.className = 'settings-hint';
  hint.textContent = tr('settingsThemeHint');
  body.append(
    hint,
    previewCard(),
    block(tr('themePresets'), presetGrid(live)),
    block(tr('themeCustom'), pickerCard(live)),
  );
  return body;
}

function presetLabel(id: string): string {
  const key = PRESET_KEYS[id];
  return key ? tr(key) : id;
}

function block(title: string, card: HTMLElement): HTMLElement {
  const wrap = document.createElement('section');
  wrap.className = 'settings-block';
  const kicker = document.createElement('div');
  kicker.className = 'settings-kicker';
  kicker.textContent = title;
  wrap.append(kicker, card);
  return wrap;
}

function previewCard(): HTMLElement {
  const card = document.createElement('div');
  card.className = 'theme-preview';
  const dots = document.createElement('div');
  dots.className = 'theme-preview-dots';
  const primary = document.createElement('span');
  primary.className = 'theme-dot primary';
  const secondary = document.createElement('span');
  secondary.className = 'theme-dot secondary';
  const background = document.createElement('span');
  background.className = 'theme-dot bg';
  dots.append(primary, secondary, background);
  const copy = document.createElement('div');
  copy.className = 'theme-preview-copy';
  const title = document.createElement('div');
  title.className = 'theme-preview-title';
  title.textContent = tr('themePreview');
  const chips = document.createElement('div');
  chips.className = 'theme-preview-chips';
  const ice = document.createElement('span');
  ice.className = 'theme-chip ice';
  ice.textContent = 'Aa';
  const ok = document.createElement('span');
  ok.className = 'theme-chip ok';
  ok.textContent = '+12';
  chips.append(ice, ok);
  copy.append(title, chips);
  card.append(dots, copy);
  return card;
}

function presetGrid(theme: ThemeColors): HTMLElement {
  const card = document.createElement('div');
  card.className = 'theme-presets';
  const selected = matchingPresetId(theme);
  for (const preset of THEME_PRESETS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-preset';
    btn.dataset.id = preset.id;
    if (preset.id === selected) {
      btn.classList.add('on');
    }
    const dots = document.createElement('span');
    dots.className = 'theme-preset-dots';
    const a = document.createElement('span');
    a.style.background = preset.primary;
    const b = document.createElement('span');
    b.style.background = preset.secondary;
    const c = document.createElement('span');
    c.style.background = preset.background ?? 'var(--vscode-sideBar-background)';
    dots.append(a, b, c);
    const label = document.createElement('span');
    label.className = 'theme-preset-name';
    label.textContent = presetLabel(preset.id);
    btn.append(dots, label);
    btn.addEventListener('click', () => commit(preset, true));
    card.append(btn);
  }
  return card;
}

function pickerCard(initial: ThemeColors): HTMLElement {
  const card = document.createElement('div');
  card.className = 'settings-card';
  const primary = colorRow(tr('themePrimary'), initial.primary, (hex, persist) => {
    commit({ ...live, primary: hex }, persist);
  });
  const secondary = colorRow(tr('themeSecondary'), initial.secondary, (hex, persist) => {
    commit({ ...live, secondary: hex }, persist);
  });
  const background = colorRow(
    tr('themeBackground'),
    initial.background ?? computedBgHex(),
    (hex, persist) => {
      commit({ ...live, background: hex }, persist);
    },
  );
  primaryInputs = primary;
  secondaryInputs = secondary;
  backgroundInputs = background;
  const actions = document.createElement('div');
  actions.className = 'settings-actions';
  const auto = document.createElement('button');
  auto.type = 'button';
  auto.className = 'btn';
  auto.textContent = tr('themeBackgroundAuto');
  auto.addEventListener('click', () => {
    const next = { ...live };
    delete next.background;
    commit(next, true);
  });
  autoBtn = auto;
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'btn';
  reset.textContent = tr('themeReset');
  reset.addEventListener('click', () => commit(DEFAULT_THEME, true));
  actions.append(auto, reset);
  card.append(primary.row, secondary.row, background.row, actions);
  syncAuto();
  return card;
}

function colorRow(
  label: string,
  value: string,
  onChange: (hex: string, persist: boolean) => void,
): { row: HTMLElement; set: (hex: string) => void } {
  const row = document.createElement('div');
  row.className = 'settings-row theme-color-row';
  const name = document.createElement('div');
  name.className = 'settings-label';
  name.textContent = label;
  const tools = document.createElement('div');
  tools.className = 'theme-picker';
  const picker = document.createElement('input');
  picker.type = 'color';
  picker.value = value;
  picker.setAttribute('aria-label', label);
  const hex = document.createElement('input');
  hex.type = 'text';
  hex.className = 'settings-field theme-hex';
  hex.spellcheck = false;
  hex.maxLength = 7;
  hex.value = value;
  picker.addEventListener('input', () => {
    const next = parseHex(picker.value);
    if (!next) {
      return;
    }
    hex.value = next;
    onChange(next, false);
  });
  picker.addEventListener('change', () => {
    const next = parseHex(picker.value);
    if (next) {
      onChange(next, true);
    }
  });
  hex.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      hex.blur();
    }
  });
  hex.addEventListener('change', () => {
    const next = parseHex(hex.value);
    if (!next) {
      hex.value = picker.value;
      return;
    }
    picker.value = next;
    hex.value = next;
    onChange(next, true);
  });
  tools.append(picker, hex);
  row.append(name, tools);
  return {
    row,
    set: (next) => {
      picker.value = next;
      hex.value = next;
    },
  };
}

function commit(theme: ThemeColors, persist: boolean): void {
  live = normalizeTheme(theme);
  applyThemeTo(document.documentElement.style, live);
  const selected = matchingPresetId(live);
  for (const btn of document.querySelectorAll<HTMLButtonElement>('.theme-preset')) {
    btn.classList.toggle('on', btn.dataset.id === selected);
  }
  primaryInputs?.set(live.primary);
  secondaryInputs?.set(live.secondary);
  backgroundInputs?.set(live.background ?? computedBgHex());
  syncAuto();
  if (persist) {
    post({
      type: 'setTheme',
      primary: live.primary,
      secondary: live.secondary,
      background: live.background ?? '',
    });
  }
}

function syncAuto(): void {
  autoBtn?.classList.toggle('primary', !live.background);
}

function computedBgHex(): string {
  return rgbToHex(getComputedStyle(document.body).backgroundColor) ?? '#1e1e1e';
}
