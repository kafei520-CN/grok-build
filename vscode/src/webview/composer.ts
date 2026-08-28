import { contextTone, formatTokens } from '../context';
import { looksLikeFilePath } from '../edits';
import { effortLabel } from '../i18n';
import { FALLBACK_COMMANDS, filterCommands } from '../slash';
import type { Attachment, ChatState, ModelOption } from '../types';
import { canSend, canType, loc, post, render, tr, turnBusy, ui } from './app';
import { iconButton } from './dom';
import { iconChevron, iconPlus, iconStar, iconStop } from './icons';
import { escapeHtml } from './markdown';

const FALLBACK_EFFORTS = ['low', 'medium', 'high', 'xhigh'];

export function mountComposer(parent: HTMLElement): void {
  if (document.getElementById('composer-wrap')) {
    return;
  }
  const footer = document.createElement('footer');
  footer.className = 'composer-wrap';
  footer.id = 'composer-wrap';
  const queue = document.createElement('div');
  queue.id = 'composer-queue';
  queue.className = 'queue';
  queue.hidden = true;
  const chips = document.createElement('div');
  chips.id = 'composer-chips';
  chips.className = 'chips';
  chips.style.display = 'none';
  const menuBox = document.createElement('div');
  menuBox.id = 'composer-menu-slot';
  const card = document.createElement('div');
  card.id = 'composer-card';
  card.className = 'composer-card';
  const input = document.createElement('textarea');
  input.id = 'composer';
  input.rows = 2;
  bindComposerInput(input);
  const bar = document.createElement('div');
  bar.id = 'composer-bar';
  bar.className = 'composer-bar';
  card.append(input, bar);
  footer.append(queue, chips, menuBox, card);
  parent.append(footer);
  ui.composer = input;
}

let barKey = '';
let chipKey = '';
let menuKey = '';
let fileSearchTimer: ReturnType<typeof setTimeout> | undefined;

export function patchComposer(): void {
  if (!document.getElementById('composer-wrap')) {
    mountComposer(document.getElementById('app') ?? document.body);
  }
  const input =
    ui.composer ?? (document.getElementById('composer') as HTMLTextAreaElement | null);
  if (!input) {
    return;
  }
  ui.composer = input;
  const queue = document.getElementById('composer-queue');
  if (queue) {
    const n = ui.state.queue?.length ?? 0;
    queue.hidden = n === 0;
    queue.textContent = n > 0 ? tr('queued', { n }) : '';
  }
  const chips = document.getElementById('composer-chips');
  const nextChipKey = (ui.state.attachments ?? []).map((item) => item.id).join('|');
  if (chips && nextChipKey !== chipKey) {
    chipKey = nextChipKey;
    chips.replaceChildren();
    const attachments = ui.state.attachments ?? [];
    chips.style.display = attachments.length ? 'flex' : 'none';
    for (const attachment of attachments) {
      chips.append(attachmentChip(attachment));
    }
  }
  const menuSlot = document.getElementById('composer-menu-slot');
  const nextMenuKey = `${ui.menu ?? ''}:${ui.draft}:${(ui.state.fileHits ?? []).length}`;
  if (menuSlot && nextMenuKey !== menuKey) {
    menuKey = nextMenuKey;
    menuSlot.replaceChildren();
    if (ui.menu === 'slash') {
      menuSlot.append(slashMenu());
    } else if (ui.menu === 'files') {
      menuSlot.append(fileMenu());
    }
  }
  const card = document.getElementById('composer-card');
  if (card) {
    card.className =
      ui.state.status === 'streaming' ? 'composer-card live' : 'composer-card';
  }
  const placeholder = composerPlaceholder();
  if (input.placeholder !== placeholder) {
    input.placeholder = placeholder;
  }
  const disabled = !canType();
  if (input.disabled !== disabled) {
    input.disabled = disabled;
  }
  const composing = input.dataset.composing === '1';
  const focused = document.activeElement === input;
  if (ui.wantFocus) {
    ui.wantFocus = false;
    if (input.value !== ui.draft) {
      input.value = ui.draft;
      autosize(input);
    }
    input.focus();
    input.setSelectionRange(ui.draft.length, ui.draft.length);
  } else if (focused || composing) {
    ui.draft = input.value;
  } else if (input.value !== ui.draft) {
    input.value = ui.draft;
    autosize(input);
  }
  if (turnBusy() && ui.picker) {
    ui.picker = undefined;
  }
  const bar = document.getElementById('composer-bar');
  const nextBarKey = composerBarKey();
  if (bar && (nextBarKey !== barKey || bar.childElementCount === 0)) {
    barKey = nextBarKey;
    fillComposerBar(bar, input);
  } else if (bar) {
    patchContextMeter(bar);
  }
  if (input.dataset.composing !== '1') {
    autosize(input);
  }
}

function bindComposerInput(input: HTMLTextAreaElement): void {
  input.addEventListener('focus', () => {
    ui.composerFocused = true;
  });
  input.addEventListener('blur', () => {
    ui.composerFocused = false;
  });
  input.addEventListener('compositionstart', () => {
    input.dataset.composing = '1';
  });
  input.addEventListener('compositionend', () => {
    input.dataset.composing = '0';
    ui.draft = input.value;
  });
  input.addEventListener('input', () => {
    ui.draft = input.value;
    autosize(input);
    const last = ui.draft.split(/\s+/).pop() ?? '';
    if (last.startsWith('/')) {
      ui.menu = 'slash';
      ui.picker = undefined;
      render();
    } else if (last.startsWith('@')) {
      ui.menu = 'files';
      ui.picker = undefined;
      const query = last.slice(1);
      if (fileSearchTimer) {
        clearTimeout(fileSearchTimer);
      }
      fileSearchTimer = setTimeout(() => post({ type: 'searchFiles', query }), 160);
      render();
    } else if (ui.menu) {
      ui.menu = undefined;
      render();
    }
  });
  input.addEventListener('paste', (event) => {
    handlePaste(event);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (ui.lightboxSrc) {
        ui.lightboxSrc = undefined;
        render();
        return;
      }
      ui.menu = undefined;
      ui.picker = undefined;
      render();
      return;
    }
    const sendKey = ui.state.multiline
      ? event.key === 'Enter' && (event.shiftKey || event.altKey)
      : event.key === 'Enter' && !event.shiftKey;
    if (sendKey) {
      event.preventDefault();
      sendFrom(input);
    }
  });
}

function fillComposerBar(bar: HTMLElement, input: HTMLTextAreaElement): void {
  const plus = iconButton(tr('attach'), iconPlus(), () => post({ type: 'attach' }));
  const seg = document.createElement('div');
  seg.className = 'seg';
  for (const [id, key] of [
    ['ask', 'modeAsk'],
    ['plan', 'modePlan'],
    ['default', 'modeAgent'],
  ] as const) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = tr(key);
    const current = ui.state.modeId ?? 'default';
    if (current === id || (id === 'default' && current !== 'ask' && current !== 'plan')) {
      btn.className = 'on';
    }
    const locked = turnBusy();
    btn.disabled = locked;
    btn.title = locked ? tr('busyLock') : tr(key);
    btn.addEventListener('click', () => {
      if (turnBusy()) {
        return;
      }
      post({ type: 'setMode', modeId: id });
    });
    seg.append(btn);
  }
  const send = document.createElement('button');
  send.type = 'button';
  send.className = ui.state.status === 'streaming' ? 'send-fab stop' : 'send-fab';
  send.title = ui.state.status === 'streaming' ? tr('stop') : tr('send');
  send.disabled = ui.state.status === 'streaming' ? false : !canSend();
  if (ui.state.status === 'streaming') {
    send.innerHTML = iconStop();
    send.addEventListener('click', () => post({ type: 'cancel' }));
  } else {
    send.innerHTML = iconStar('14');
    send.addEventListener('click', () => sendFrom(input));
  }
  bar.replaceChildren(plus, seg, modelPicker(), effortPicker(), contextMeter(), send);
}

function composerBarKey(): string {
  const model = ui.state.models;
  const current = model?.available.find((item) => item.id === model.currentId);
  return [
    ui.state.status,
    ui.state.modeId ?? '',
    model?.currentId ?? '',
    current?.currentEffort ?? '',
    current?.efforts?.join(',') ?? '',
    ui.picker ?? '',
    ui.state.locale ?? '',
    canType() ? '1' : '0',
    (model?.available.length ?? 0).toString(),
  ].join('|');
}

function patchContextMeter(bar: HTMLElement): void {
  const wrap = bar.querySelector('.ctx-meter') as HTMLElement | null;
  if (!wrap) {
    return;
  }
  const ctx = ui.state.context;
  const percent = ctx?.percent ?? 0;
  const key = `${percent}:${ctx?.used ?? ''}:${ctx?.total ?? ''}`;
  if (wrap.dataset.sig === key) {
    return;
  }
  wrap.dataset.sig = key;
  const compactAt = ctx?.compactAt ?? 85;
  const tone = contextTone(percent, compactAt);
  wrap.className = `ctx-meter ${tone}`;
  wrap.setAttribute(
    'aria-label',
    ctx ? `${tr('ctxTitle')} ${percent}%` : tr('ctxWaiting'),
  );
  const fill = wrap.querySelector('circle.fill') as SVGCircleElement | null;
  if (fill) {
    const radius = 10;
    const circ = 2 * Math.PI * radius;
    const offset = circ * (1 - Math.min(1, Math.max(0, percent / 100)));
    fill.setAttribute('stroke-dasharray', circ.toFixed(2));
    fill.setAttribute('stroke-dashoffset', offset.toFixed(2));
  }
  const tip = wrap.querySelector('.ctx-tip');
  if (tip) {
    tip.replaceWith(contextTip(ctx, percent, compactAt));
  }
}

function contextMeter(): HTMLElement {
  const wrap = document.createElement('div');
  const ctx = ui.state.context;
  const percent = ctx?.percent ?? 0;
  const compactAt = ctx?.compactAt ?? 85;
  const tone = contextTone(percent, compactAt);
  wrap.className = `ctx-meter ${tone}`;
  wrap.setAttribute('role', 'img');
  wrap.setAttribute(
    'aria-label',
    ctx ? `${tr('ctxTitle')} ${percent}%` : tr('ctxWaiting'),
  );
  const radius = 10;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.min(1, Math.max(0, percent / 100)));
  wrap.innerHTML = `<svg viewBox="0 0 28 28" width="22" height="22" aria-hidden="true">
    <circle class="track" cx="14" cy="14" r="${radius}" fill="none" stroke-width="2.5"/>
    <circle class="fill" cx="14" cy="14" r="${radius}" fill="none" stroke-width="2.5"
      stroke-linecap="round" stroke-dasharray="${circ.toFixed(2)}"
      stroke-dashoffset="${offset.toFixed(2)}" transform="rotate(-90 14 14)"/>
  </svg>`;
  wrap.append(contextTip(ctx, percent, compactAt));
  return wrap;
}

function contextTip(
  ctx: ChatState['context'],
  percent: number,
  compactAt: number,
): HTMLElement {
  const tip = document.createElement('div');
  tip.className = 'ctx-tip';
  if (!ctx || ctx.total <= 0) {
    tip.textContent = tr('ctxWaiting');
    return tip;
  }
  const rows: Array<[string, string]> = [
    [tr('ctxTitle'), `${percent}%`],
    ['', `${formatTokens(ctx.used)} / ${formatTokens(ctx.total)}`],
  ];
  if (ctx.systemTokens !== undefined) {
    rows.push([tr('ctxSystem'), formatTokens(ctx.systemTokens)]);
  }
  if (ctx.messageTokens !== undefined) {
    rows.push([tr('ctxMessages'), formatTokens(ctx.messageTokens)]);
  }
  if (ctx.toolTokens !== undefined) {
    rows.push([tr('ctxTools'), formatTokens(ctx.toolTokens)]);
  }
  if (ctx.free !== undefined) {
    rows.push([tr('ctxFree'), formatTokens(ctx.free)]);
  }
  for (const cat of ctx.categories ?? []) {
    rows.push([cat.detail ? `${cat.label} · ${cat.detail}` : cat.label, formatTokens(cat.tokens)]);
  }
  rows.push([tr('ctxCompact', { pct: compactAt }), '']);
  for (const [label, value] of rows) {
    const line = document.createElement('div');
    line.className = 'ctx-tip-row';
    const left = document.createElement('span');
    left.textContent = label;
    line.append(left);
    if (value) {
      const right = document.createElement('span');
      right.textContent = value;
      line.append(right);
    }
    tip.append(line);
  }
  return tip;
}

function currentModel(): ModelOption | undefined {
  return ui.state.models?.available.find((m) => m.id === ui.state.models?.currentId);
}

function displayModelName(id?: string, name?: string): string {
  const raw = name ?? id ?? 'Grok';
  return raw.replace(/^Grok\s+/i, 'Grok ');
}

function currentModelLabel(): string {
  const model = currentModel();
  return displayModelName(model?.id ?? ui.state.models?.currentId, model?.name);
}

function currentEffortValue(): string {
  const model = currentModel();
  if (model?.currentEffort) {
    return model.currentEffort;
  }
  const choices = effortChoices();
  return choices.includes('high') ? 'high' : (choices[0] ?? 'high');
}

function effortChoices(): string[] {
  const listed = currentModel()?.efforts?.filter((item) => item.trim().length > 0);
  if (listed && listed.length > 0) {
    return listed;
  }
  return FALLBACK_EFFORTS;
}

function displayEffort(level?: string): string {
  if (!level) {
    return tr('switchEffort');
  }
  return effortLabel(loc(), level) || level;
}

function modelPicker(): HTMLElement {
  const models = ui.state.models?.available ?? [];
  return pickerControl({
    kind: 'model',
    label: currentModelLabel(),
    title: tr('switchModel'),
    disabled: turnBusy() || !canType() || models.length === 0,
    items: models.map((model) => ({
      id: model.id,
      label: displayModelName(model.id, model.name),
      selected: model.id === ui.state.models?.currentId,
    })),
    onPick: (id) => post({ type: 'setModel', modelId: id }),
  });
}

function effortPicker(): HTMLElement {
  const selected = currentEffortValue();
  return pickerControl({
    kind: 'effort',
    label: displayEffort(selected),
    title: tr('switchEffort'),
    disabled: turnBusy() || !canType(),
    items: effortChoices().map((level) => ({
      id: level,
      label: displayEffort(level),
      selected: level === selected,
    })),
    onPick: (id) => post({ type: 'setEffort', level: id }),
  });
}

function pickerControl(opts: {
  kind: 'model' | 'effort';
  label: string;
  title: string;
  disabled: boolean;
  items: Array<{ id: string; label: string; selected: boolean }>;
  onPick: (id: string) => void;
}): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = `picker ${opts.kind}`;
  wrap.addEventListener('click', (event) => event.stopPropagation());
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = ui.picker === opts.kind ? 'picker-btn open' : 'picker-btn';
  btn.title = opts.disabled && turnBusy() ? tr('busyLock') : opts.title;
  btn.disabled = opts.disabled;
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', ui.picker === opts.kind ? 'true' : 'false');
  const text = document.createElement('span');
  text.className = 'picker-label';
  text.textContent = opts.label;
  btn.append(text);
  btn.insertAdjacentHTML('beforeend', iconChevron());
  btn.addEventListener('click', () => {
    if (opts.disabled) {
      return;
    }
    ui.picker = ui.picker === opts.kind ? undefined : opts.kind;
    ui.moreOpen = false;
    ui.menu = undefined;
    render();
  });
  wrap.append(btn);
  if (ui.picker === opts.kind && opts.items.length > 0) {
    const list = document.createElement('div');
    list.className = 'picker-menu';
    list.setAttribute('role', 'listbox');
    for (const item of opts.items) {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = item.selected ? 'picker-item on' : 'picker-item';
      option.setAttribute('role', 'option');
      option.textContent = item.label;
      option.addEventListener('click', () => {
        ui.picker = undefined;
        if (!item.selected) {
          opts.onPick(item.id);
        }
        render();
      });
      list.append(option);
    }
    wrap.append(list);
  }
  return wrap;
}

function slashMenu(): HTMLElement {
  const query = (ui.draft.split(/\s+/).pop() ?? '').replace(/^\//, '');
  const hits = filterCommands(
    ui.state.commands.length ? ui.state.commands : FALLBACK_COMMANDS,
    query,
  );
  const el = document.createElement('div');
  el.className = 'menu';
  for (const cmd of hits) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'menu-item';
    item.innerHTML = `<code>/${escapeHtml(cmd.name)}</code> <span>${escapeHtml(cmd.description)}</span>`;
    item.addEventListener('click', () => {
      ui.draft = `/${cmd.name}${cmd.hint ? ' ' : ''}`;
      ui.menu = undefined;
      ui.wantFocus = true;
      render();
    });
    el.append(item);
  }
  return el;
}

function fileMenu(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'menu';
  for (const hit of ui.state.fileHits ?? []) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'menu-item';
    item.textContent = hit.label;
    item.addEventListener('click', () => {
      post({ type: 'pickFile', path: hit.path });
      ui.draft = ui.draft.replace(/@[^\s]*$/, '').trimEnd();
      ui.menu = undefined;
      ui.wantFocus = true;
      render();
    });
    el.append(item);
  }
  if (!ui.state.fileHits?.length) {
    const empty = document.createElement('div');
    empty.className = 'menu-item';
    empty.textContent = tr('fileSearchHint');
    el.append(empty);
  }
  return el;
}

function handlePaste(event: ClipboardEvent): void {
  const data = event.clipboardData;
  if (!data) {
    return;
  }
  let files = [...data.files];
  if (files.length === 0) {
    for (const item of [...data.items]) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }
  }
  const uris = (data.getData('text/uri-list') || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
  const text = data.getData('text');
  if (files.length === 0 && uris.length === 0 && !looksLikeFilePath(text)) {
    return;
  }
  event.preventDefault();
  void (async () => {
    const images: Array<{ name: string; mimeType: string; data: string }> = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        continue;
      }
      const buf = new Uint8Array(await file.arrayBuffer());
      images.push({
        name: file.name || 'paste.png',
        mimeType: file.type || 'image/png',
        data: bytesToBase64(buf),
      });
    }
    post({ type: 'pasteClipboard', text, uris, images });
  })();
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function sendFrom(input: HTMLTextAreaElement): void {
  const text = input.value.trim();
  if ((!text && !ui.state.attachments?.length) || !canType()) {
    return;
  }
  post({ type: 'send', text });
  ui.draft = '';
  ui.menu = undefined;
  ui.stickToBottom = true;
  input.value = '';
  autosize(input);
}

function autosize(input: HTMLTextAreaElement): void {
  input.style.height = 'auto';
  input.style.height = `${Math.min(Math.max(input.scrollHeight, 44), 160)}px`;
}

function composerPlaceholder(): string {
  if (ui.state.status === 'login' || ui.state.status === 'authenticating') {
    return tr('placeholderLogin');
  }
  if (ui.state.status === 'streaming') {
    return tr('placeholderQueue');
  }
  return tr('placeholderAsk');
}

function attachmentChip(attachment: Attachment): HTMLElement {
  const image =
    attachment.data && attachment.mimeType?.startsWith('image/')
      ? `data:${attachment.mimeType};base64,${attachment.data}`
      : undefined;
  if (image) {
    const tile = document.createElement('div');
    tile.className = 'attach-tile';
    const img = document.createElement('img');
    img.alt = attachment.label;
    img.src = image;
    img.addEventListener('click', () => {
      ui.lightboxSrc = image;
      render();
    });
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'attach-x';
    x.title = tr('removeAttach');
    x.textContent = '×';
    x.addEventListener('click', (event) => {
      event.stopPropagation();
      post({ type: 'removeAttachment', id: attachment.id });
    });
    tile.append(img, x);
    return tile;
  }
  const chip = document.createElement('span');
  chip.className = 'chip';
  const label = document.createElement('span');
  label.textContent = attachment.label;
  const x = document.createElement('button');
  x.type = 'button';
  x.className = 'chip-x';
  x.title = tr('removeAttach');
  x.textContent = '×';
  x.addEventListener('click', () => post({ type: 'removeAttachment', id: attachment.id }));
  chip.append(label, x);
  return chip;
}
