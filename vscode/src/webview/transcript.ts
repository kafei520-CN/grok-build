import { totals } from '../edits';
import { formatClock, formatDuration, toolKindLabel } from '../i18n';
import { permissionButtonClass, permissionLabelKey } from '../permissions';
import type { ChatMessage, ChatState, FileEdit, PermissionOption, PermissionPrompt } from '../types';
import { loc, post, render, tr, ui } from './app';
import { bootStar, errorCard, home, loginCard, panel, setupCard } from './chrome';
import { button, iconButton } from './dom';
import { iconAskHint, iconCheck, iconChevron, iconClose, iconCopy, iconFork, iconStar, toolIcon } from './icons';
import { fileName, renderMarkdown } from './markdown';

type Turn = { user?: ChatMessage; assistant?: ChatMessage };

export function renderBody(): HTMLElement {
  const el = document.createElement('main');
  el.className = 'body';
  el.dataset.kind = bodyKind(ui.state);
  fillBody(el);
  return el;
}

export function patchBody(parent: HTMLElement): void {
  const kind = bodyKind(ui.state);
  let body = document.getElementById('grok-body') as HTMLElement | null;
  if (!body) {
    body = renderBody();
    body.id = 'grok-body';
    const header = document.getElementById('grok-header');
    const composer = document.getElementById('composer-wrap');
    if (composer) {
      parent.insertBefore(body, composer);
    } else if (header?.nextSibling) {
      parent.insertBefore(body, header.nextSibling);
    } else {
      parent.append(body);
    }
    bindTranscriptScroll();
    return;
  }
  if (body.dataset.kind !== kind) {
    const next = renderBody();
    next.id = 'grok-body';
    body.replaceWith(next);
    bindTranscriptScroll();
    return;
  }
  if (kind === 'chat') {
    patchTranscript();
    patchPermission(body);
    patchAsk(body);
    patchErrorBanner(body);
    return;
  }
  if (kind.startsWith('login') || kind === 'home') {
    const next = renderBody();
    next.id = 'grok-body';
    body.replaceWith(next);
  }
}

function bodyKind(state: ChatState): string {
  if (state.status === 'untrusted') {
    return 'untrusted';
  }
  if (state.status === 'missingCli') {
    return 'missingCli';
  }
  if (state.status === 'connecting') {
    return 'connecting';
  }
  if (state.status === 'login' || state.status === 'authenticating') {
    return `login:${state.status}:${state.login?.url ?? ''}`;
  }
  if (state.status === 'error' && state.messages.length === 0) {
    return `error:${state.error ?? ''}`;
  }
  if (state.restoringSession) {
    return 'restoring';
  }
  if (state.messages.length === 0) {
    return `home:${state.sessions?.length ?? 0}:${state.currentSessionId ?? ''}`;
  }
  return 'chat';
}

function fillBody(el: HTMLElement): void {
  const status = ui.state.status;
  if (status === 'untrusted') {
    el.append(panel(tr('untrustedTitle'), tr('untrustedBody')));
    return;
  }
  if (status === 'missingCli') {
    el.append(setupCard());
    return;
  }
  if (status === 'connecting') {
    el.append(bootStar());
    return;
  }
  if (status === 'login' || status === 'authenticating') {
    el.append(loginCard());
    return;
  }
  if (status === 'error' && ui.state.messages.length === 0) {
    el.append(errorCard());
    return;
  }
  if (ui.state.restoringSession) {
    el.append(bootStar());
    return;
  }
  if (ui.state.messages.length === 0) {
    el.append(home());
  } else {
    const transcript = document.createElement('div');
    transcript.className = 'transcript';
    transcript.id = 'transcript';
    const grouped = groupTurns(ui.state.messages);
    grouped.forEach((turn, index) => {
      transcript.append(turnEl(turn, index < grouped.length - 1));
    });
    el.append(transcript);
  }
  if (ui.state.permission) {
    el.append(permissionBar());
  }
  if (ui.state.ask) {
    el.append(askBar());
  }
  if (ui.state.error && status === 'error') {
    el.append(errorBanner(ui.state.error));
  }
}

function patchTranscript(): void {
  const transcript = document.getElementById('transcript');
  if (!transcript) {
    return;
  }
  const grouped = groupTurns(ui.state.messages);
  const nodes = [...transcript.children] as HTMLElement[];
  for (let i = 0; i < grouped.length; i++) {
    const turn = grouped[i];
    const id = turnId(turn);
    const split = i < grouped.length - 1;
    const node = nodes[i];
    if (!node || node.dataset.turnId !== id) {
      const fresh = turnEl(turn, split);
      if (node) {
        node.replaceWith(fresh);
      } else {
        transcript.append(fresh);
      }
      continue;
    }
    if (turn.assistant?.streaming) {
      patchStreamingTurn(node, turn);
      continue;
    }
    const sig = turnSig(turn, split);
    if (node.dataset.sig !== sig) {
      node.replaceWith(turnEl(turn, split));
    }
  }
  while (transcript.children.length > grouped.length) {
    transcript.lastElementChild?.remove();
  }
  scrollTranscript();
  syncWorkClock();
}

function patchStreamingTurn(node: HTMLElement, turn: Turn): void {
  const assistant = turn.assistant;
  if (!assistant) {
    return;
  }
  const col = node.querySelector('.msg.assistant') as HTMLElement | null;
  if (!col) {
    node.replaceWith(turnEl(turn, false));
    return;
  }
  if (hasWork(assistant)) {
    let work = col.querySelector('details.work') as HTMLDetailsElement | null;
    if (!work) {
      work = workBlock(assistant);
      col.prepend(work);
    } else {
      work.className = assistant.streaming ? 'work live' : 'work';
      const mark = work.querySelector('summary .mark');
      if (mark) {
        mark.className = assistant.streaming ? 'mark pulse' : 'mark';
      }
      const label = work.querySelector('summary .work-label');
      if (label) {
        label.textContent = workLabel(assistant);
      }
      if (work.open) {
        patchWorkBody(work.querySelector('.work-body') as HTMLElement | null, assistant);
      }
    }
    col.querySelector('.pulse')?.remove();
  }
  if (assistant.text) {
    let answer = col.querySelector('.md.answer') as HTMLElement | null;
    if (!answer) {
      answer = document.createElement('div');
      answer.className = 'md answer';
      const work = col.querySelector('details.work');
      if (work) {
        work.after(answer);
      } else {
        col.prepend(answer);
      }
    }
    if (answer.dataset.len !== String(assistant.text.length)) {
      setMarkdown(answer, assistant.text, Boolean(assistant.streaming));
    }
    col.querySelector('.pulse')?.remove();
  }
}

function patchWorkBody(body: HTMLElement | null, message: ChatMessage): void {
  if (!body) {
    return;
  }
  const streaming = Boolean(message.streaming);
  if (message.thinking) {
    let think = body.querySelector('.md.thinking') as HTMLElement | null;
    if (!think) {
      think = document.createElement('div');
      think.className = 'md thinking';
      body.prepend(think);
    }
    setMarkdown(think, message.thinking, streaming);
  }
  if (message.plan) {
    let plan = body.querySelector('.md.plan') as HTMLElement | null;
    if (!plan) {
      plan = document.createElement('div');
      plan.className = 'md plan';
      const think = body.querySelector('.md.thinking');
      if (think) {
        think.after(plan);
      } else {
        body.prepend(plan);
      }
    }
    setMarkdown(plan, message.plan, streaming);
  }
  const rows = new Map<string, HTMLElement>();
  for (const node of body.querySelectorAll('.tool-row')) {
    if (node instanceof HTMLElement && node.dataset.id) {
      rows.set(node.dataset.id, node);
    }
  }
  for (const tool of message.tools) {
    let row = rows.get(tool.id);
    if (!row) {
      body.append(toolRow(tool));
      continue;
    }
    const sig = `${tool.status}|${tool.kind ?? ''}|${tool.title}|${tool.detail ?? ''}`;
    if (row.dataset.sig === sig) {
      continue;
    }
    row.dataset.sig = sig;
    row.className = `tool-row ${tool.status}`;
    if (tool.kind) {
      row.dataset.kind = tool.kind;
    }
    const title = row.querySelector('.tool-title');
    if (title) {
      const kind = toolKindLabel(loc(), tool.kind);
      const hint = tool.detail ? fileName(tool.detail) : tool.title;
      title.textContent = `${toolIcon(tool.kind)} ${kind}${hint ? ` · ${hint}` : ''}`;
    }
  }
}

function setMarkdown(el: HTMLElement, src: string, streaming: boolean): void {
  const len = String(src.length);
  if (el.dataset.len === len) {
    return;
  }
  el.dataset.len = len;
  if (streaming) {
    el.textContent = src;
    return;
  }
  el.innerHTML = renderMarkdown(src);
}

function patchAsk(body: HTMLElement): void {
  const existing = body.querySelector('.ask-card') as HTMLElement | null;
  const ask = ui.state.ask;
  if (!ask) {
    existing?.remove();
    ui.askOtherOpen = false;
    ui.askOtherDraft = '';
    return;
  }
  if (existing?.dataset.id !== ask.requestId) {
    ui.askOtherOpen = false;
    ui.askOtherDraft = '';
  }
  const other = ui.askOtherOpen ? '1' : '0';
  const open = (ui.askOpen.get(ask.requestId) ?? true) ? '1' : '0';
  if (
    existing?.dataset.id === ask.requestId &&
    existing.dataset.other === other &&
    existing.dataset.open === open
  ) {
    return;
  }
  existing?.remove();
  body.append(askBar());
}

function patchPermission(body: HTMLElement): void {
  const existing = body.querySelector('.permission') as HTMLElement | null;
  const perm = ui.state.permission;
  if (!perm) {
    existing?.remove();
    return;
  }
  if (existing?.dataset.id === perm.requestId) {
    return;
  }
  existing?.remove();
  body.append(permissionBar());
}

function patchErrorBanner(body: HTMLElement): void {
  const existing = body.querySelector('.error-banner');
  if (ui.state.error && ui.state.status === 'error') {
    if (existing) {
      existing.textContent = ui.state.error;
      return;
    }
    body.append(errorBanner(ui.state.error));
    return;
  }
  existing?.remove();
}

function errorBanner(text: string): HTMLElement {
  const banner = document.createElement('div');
  banner.className = 'error-banner';
  banner.textContent = text;
  return banner;
}

const USER_SCROLL_HOLD_MS = 480;
let lastUserScroll = 0;
let pinLock = false;

function userHeldScroll(): boolean {
  return Date.now() - lastUserScroll < USER_SCROLL_HOLD_MS;
}

export function scrollTranscript(): void {
  const el = document.getElementById('transcript');
  if (!el) {
    return;
  }
  bindTranscriptScroll(el);
  if (ui.lightboxSrc || userHeldScroll()) {
    return;
  }
  if (ui.stickToBottom) {
    pinLock = true;
    el.scrollTop = el.scrollHeight;
    pinLock = false;
    return;
  }
  if (el.scrollTop === 0 && ui.transcriptScroll > 0) {
    el.scrollTop = ui.transcriptScroll;
  }
}

function bindTranscriptScroll(el?: HTMLElement | null): void {
  const node = el ?? document.getElementById('transcript');
  if (!node || node.dataset.scrollBound === '1') {
    return;
  }
  node.dataset.scrollBound = '1';
  const markUser = () => {
    lastUserScroll = Date.now();
  };
  node.addEventListener('pointerdown', markUser, { passive: true });
  node.addEventListener('wheel', markUser, { passive: true });
  node.addEventListener(
    'scroll',
    () => {
      if (pinLock) {
        return;
      }
      lastUserScroll = Date.now();
      ui.stickToBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 56;
      ui.transcriptScroll = node.scrollTop;
    },
    { passive: true },
  );
}

function turnId(turn: Turn): string {
  return `${turn.user?.id ?? ''}:${turn.assistant?.id ?? ''}`;
}

function turnSig(turn: Turn, split: boolean): string {
  const a = turn.assistant;
  const sum = totals(a?.edits ?? []);
  return [
    split ? '1' : '0',
    a?.streaming ? '1' : '0',
    a?.text.length ?? 0,
    a?.thinking?.length ?? 0,
    a?.plan?.length ?? 0,
    a?.tools.length ?? 0,
    a?.edits?.length ?? 0,
    sum.added,
    sum.removed,
    a?.images?.length ?? 0,
    a?.error?.code ?? '',
    a?.error?.message ?? '',
    a?.error?.retrying ? 'r' : '',
    a?.error?.attempt ?? 0,
    ui.copiedId === a?.id ? 'c' : '',
  ].join(':');
}

function groupTurns(messages: ChatMessage[]): Turn[] {
  const turns: Turn[] = [];
  for (const message of messages) {
    if (message.role === 'user') {
      turns.push({ user: message });
    } else {
      const last = turns.at(-1);
      if (last && !last.assistant) {
        last.assistant = message;
      } else {
        turns.push({ assistant: message });
      }
    }
  }
  return turns;
}

function turnEl(turn: Turn, split: boolean): HTMLElement {
  const el = document.createElement('section');
  el.className = 'turn';
  el.dataset.turnId = turnId(turn);
  el.dataset.sig = turnSig(turn, split);
  if (turn.user) {
    el.append(userBubble(turn.user));
  }
  if (turn.assistant) {
    el.append(assistantColumn(turn.assistant));
  }
  if (split) {
    el.append(turnSplit());
  }
  return el;
}

function turnSplit(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'turn-split';
  el.innerHTML = `<span></span><span class="mark">${iconStar('10')}</span><span></span>`;
  return el;
}

function userBubble(message: ChatMessage): HTMLElement {
  const el = document.createElement('article');
  el.className = 'msg user';
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  if (message.text) {
    const body = document.createElement('div');
    body.className = 'md';
    body.innerHTML = renderMarkdown(message.text);
    bubble.append(body);
  }
  if (message.images?.length) {
    bubble.append(imageGallery(message.images));
  }
  el.append(bubble);
  return el;
}

function assistantColumn(message: ChatMessage): HTMLElement {
  const el = document.createElement('article');
  el.className = 'msg assistant';
  if (hasWork(message)) {
    el.append(workBlock(message));
  }
  if (message.text) {
    const body = document.createElement('div');
    body.className = 'md answer';
    body.dataset.len = String(message.text.length);
    body.innerHTML = renderMarkdown(message.text);
    el.append(body);
  } else if (message.error?.retrying) {
    el.append(turnErrorCard(message));
  } else if (message.streaming && !hasWork(message) && !message.error) {
    const pulse = document.createElement('div');
    pulse.className = 'pulse';
    const star = document.createElement('span');
    star.className = 'mark pulse';
    star.innerHTML = iconStar();
    pulse.append(star, document.createTextNode(tr('working')));
    el.append(pulse);
  }
  if (message.images?.length) {
    el.append(imageGallery(message.images));
  }
  if (message.error && !message.error.retrying) {
    el.append(turnErrorCard(message));
  }
  if (!message.streaming) {
    el.append(turnMeta(message));
    if (message.edits?.length) {
      el.append(changesBlock(message.id, message.edits));
    }
  }
  return el;
}

function turnErrorCard(message: ChatMessage): HTMLElement {
  const error = message.error!;
  const el = document.createElement('div');
  el.className = error.retrying ? 'turn-error live' : 'turn-error';
  const title = document.createElement('div');
  title.className = 'turn-error-title';
  title.textContent = error.retrying
    ? tr('turnRetrying', { n: error.attempt ?? 1, max: error.maxAttempts ?? '?' })
    : tr('turnError');
  el.append(title);
  if (error.code) {
    const code = document.createElement('div');
    code.className = 'turn-error-code';
    code.textContent = tr('errorCode', { code: error.code });
    el.append(code);
  }
  const body = document.createElement('div');
  body.className = 'turn-error-msg';
  body.textContent = error.message;
  el.append(body);
  return el;
}

function hasWork(message: ChatMessage): boolean {
  return Boolean(message.thinking || message.plan || message.tools.length);
}

function workBlock(message: ChatMessage): HTMLDetailsElement {
  const el = document.createElement('details');
  el.className = message.streaming ? 'work live' : 'work';
  el.dataset.mid = message.id;
  el.open = ui.workOpen.get(message.id) ?? Boolean(message.streaming);
  el.addEventListener('toggle', (event) => {
    if (!event.isTrusted) {
      return;
    }
    ui.workOpen.set(message.id, el.open);
    if (el.open) {
      const live = ui.state.messages.find((item) => item.id === message.id);
      if (live) {
        patchWorkBody(el.querySelector('.work-body'), live);
      }
    }
  });
  const summary = document.createElement('summary');
  const mark = document.createElement('span');
  mark.className = message.streaming ? 'mark pulse' : 'mark';
  mark.innerHTML = iconStar();
  const label = document.createElement('span');
  label.className = 'work-label';
  label.textContent = workLabel(message);
  summary.append(mark, label);
  const body = document.createElement('div');
  body.className = 'work-body';
  if (message.thinking) {
    const think = document.createElement('div');
    think.className = 'md thinking';
    setMarkdown(think, message.thinking, Boolean(message.streaming));
    body.append(think);
  }
  if (message.plan) {
    const plan = document.createElement('div');
    plan.className = 'md plan';
    setMarkdown(plan, message.plan, Boolean(message.streaming));
    body.append(plan);
  }
  for (const tool of message.tools) {
    body.append(toolRow(tool));
  }
  el.append(summary, body);
  return el;
}

let workClock: ReturnType<typeof setInterval> | undefined;

export function syncWorkClock(): void {
  const live = ui.state.messages.some(
    (message) => message.role === 'assistant' && message.streaming,
  );
  if (live) {
    if (workClock === undefined) {
      workClock = setInterval(paintWorkLabels, 1000);
    }
    paintWorkLabels();
    return;
  }
  if (workClock !== undefined) {
    clearInterval(workClock);
    workClock = undefined;
  }
}

function paintWorkLabels(): void {
  for (const node of document.querySelectorAll('details.work[data-mid]')) {
    const id = node instanceof HTMLElement ? node.dataset.mid : undefined;
    const message = ui.state.messages.find((item) => item.id === id);
    if (!message || message.role !== 'assistant') {
      continue;
    }
    const label = node.querySelector('.work-label');
    if (label) {
      label.textContent = workLabel(message);
    }
  }
}

function workLabel(message: ChatMessage): string {
  const time = durationText(message);
  if (message.streaming && !time) {
    return tr('thinkingNow');
  }
  if (time) {
    return tr('elapsed', { time });
  }
  return tr('thinking');
}

function durationText(message: ChatMessage): string {
  if (!message.createdAt) {
    return '';
  }
  const start = Date.parse(message.createdAt);
  if (Number.isNaN(start)) {
    return '';
  }
  const end = message.endedAt ? Date.parse(message.endedAt) : Date.now();
  if (Number.isNaN(end)) {
    return '';
  }
  const ms = Math.max(0, end - start);
  if (message.streaming && ms < 1000) {
    return '';
  }
  return formatDuration(ms);
}

function toolRow(tool: ChatMessage['tools'][number]): HTMLElement {
  const el = document.createElement('div');
  el.className = `tool-row ${tool.status}`;
  el.dataset.id = tool.id;
  if (tool.kind) {
    el.dataset.kind = tool.kind;
  }
  const kind = toolKindLabel(loc(), tool.kind);
  const hint = tool.detail ? fileName(tool.detail) : tool.title;
  const title = document.createElement('div');
  title.className = 'tool-title';
  title.textContent = `${toolIcon(tool.kind)} ${kind}${hint ? ` · ${hint}` : ''}`;
  el.append(title);
  if (tool.detail) {
    const detail = document.createElement('button');
    detail.className = 'tool-detail';
    detail.type = 'button';
    detail.textContent = tool.detail;
    detail.addEventListener('click', () => post({ type: 'openFile', path: tool.detail! }));
    el.append(detail);
  }
  return el;
}

function imageGallery(images: ChatMessage['images']): HTMLElement {
  const gallery = document.createElement('div');
  gallery.className = 'gallery';
  for (const image of images ?? []) {
    const src = image.uri ? image.uri : `data:${image.mimeType};base64,${image.data ?? ''}`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'thumb';
    btn.title = tr('previewImage');
    const img = document.createElement('img');
    img.alt = tr('imgGenerated');
    img.src = src;
    btn.append(img);
    btn.addEventListener('click', () => {
      ui.lightboxSrc = src;
      render();
    });
    gallery.append(btn);
  }
  return gallery;
}

function turnMeta(message: ChatMessage): HTMLElement {
  const el = document.createElement('div');
  el.className = 'turn-meta';
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'meta-btn';
  const copied = ui.copiedId === message.id;
  if (copied) {
    copy.classList.add('copied');
  }
  copy.title = copied ? tr('copied') : tr('copy');
  copy.innerHTML = copied ? iconCheck() : iconCopy();
  copy.disabled = !message.text;
  copy.addEventListener('click', () => {
    if (!message.text) {
      return;
    }
    post({ type: 'copyText', text: message.text });
    ui.copiedId = message.id;
    if (ui.copiedTimer !== undefined) {
      window.clearTimeout(ui.copiedTimer);
    }
    ui.copiedTimer = window.setTimeout(() => {
      ui.copiedId = undefined;
      ui.copiedTimer = undefined;
      render();
    }, 1400);
    render();
  });
  const fork = document.createElement('button');
  fork.type = 'button';
  fork.className = 'meta-btn';
  fork.title = tr('menuFork');
  fork.innerHTML = iconFork();
  fork.addEventListener('click', () => post({ type: 'runSlash', command: 'fork' }));
  el.append(copy, fork);
  const stamp =
    ui.state.timestamps === false
      ? ''
      : formatClock(loc(), message.endedAt ?? message.createdAt);
  if (stamp) {
    const time = document.createElement('span');
    time.className = 'turn-time';
    time.textContent = stamp;
    el.append(time);
  }
  return el;
}

function changesBlock(messageId: string, edits: FileEdit[]): HTMLElement {
  const el = document.createElement('section');
  el.className = 'changes';
  const sum = totals(edits);
  const expanded = ui.editsExpanded.has(messageId);
  const shown = expanded ? edits : edits.slice(0, 6);
  const hidden = Math.max(0, edits.length - shown.length);
  const line = document.createElement('div');
  line.className = 'changes-line';
  const mark = document.createElement('span');
  mark.className = 'mark';
  mark.innerHTML = iconStar();
  const count = document.createElement('span');
  count.className = 'changes-count';
  count.textContent = tr('editsTitle', { n: edits.length });
  const diff = document.createElement('span');
  diff.className = 'changes-diff';
  diff.innerHTML = `<span class="add">+${sum.added}</span> <span class="del">−${sum.removed}</span>`;
  const undo = document.createElement('button');
  undo.type = 'button';
  undo.className = 'text-btn';
  undo.textContent = tr('undo');
  undo.addEventListener('click', () => post({ type: 'undoEdits', messageId }));
  const review = document.createElement('button');
  review.type = 'button';
  review.className = 'text-btn';
  review.textContent = tr('review');
  review.addEventListener('click', () => post({ type: 'reviewEdits', messageId }));
  line.append(mark, count, diff, undo, review);
  const chips = document.createElement('div');
  chips.className = 'change-chips';
  for (const edit of shown) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'change-chip';
    chip.title = edit.path;
    const name = document.createElement('span');
    name.className = 'change-name';
    name.textContent = fileName(edit.path);
    chip.append(name);
    if (edit.added || edit.removed) {
      const stat = document.createElement('span');
      stat.className = 'change-stat';
      stat.innerHTML = `<span class="add">+${edit.added}</span> <span class="del">−${edit.removed}</span>`;
      chip.append(stat);
    }
    chip.addEventListener('click', () =>
      post({ type: 'openEdit', path: edit.path, messageId }),
    );
    chips.append(chip);
  }
  if (hidden > 0) {
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'change-chip more';
    more.textContent = tr('editsMore', { n: hidden });
    more.addEventListener('click', () => {
      ui.editsExpanded.add(messageId);
      render();
    });
    chips.append(more);
  }
  el.append(line, chips);
  return el;
}

function permissionBar(): HTMLElement {
  const bar = document.createElement('section');
  bar.className = 'permission';
  const perm = ui.state.permission!;
  bar.dataset.id = perm.requestId;
  const fold = document.createElement('details');
  fold.className = 'permission-fold';
  fold.open = ui.permissionOpen.get(perm.requestId) ?? false;
  fold.addEventListener('toggle', (event) => {
    if (event.isTrusted) {
      ui.permissionOpen.set(perm.requestId, fold.open);
    }
  });
  const head = document.createElement('summary');
  const kicker = document.createElement('span');
  kicker.className = 'permission-kind';
  kicker.textContent = toolKindLabel(loc(), perm.toolKind);
  const name = document.createElement('span');
  name.className = 'permission-file';
  name.textContent = permissionTarget(perm);
  head.append(kicker, name);
  fold.append(head);
  if (perm.details) {
    const pre = document.createElement('pre');
    pre.textContent = perm.details;
    fold.append(pre);
  } else if (perm.title && perm.title !== name.textContent) {
    const copy = document.createElement('div');
    copy.className = 'permission-copy';
    copy.textContent = perm.title;
    fold.append(copy);
  }
  const row = document.createElement('div');
  row.className = 'permission-actions';
  for (const option of perm.options) {
    row.append(permissionButton(option, perm.toolKind));
  }
  if (perm.options.length === 0) {
    row.append(button(tr('cancel'), () => post({ type: 'cancelPermission' })));
  }
  bar.append(fold, row);
  return bar;
}

function permissionTarget(perm: PermissionPrompt): string {
  const tick = perm.title.match(/`([^`]+)`/);
  if (tick) {
    return fileName(tick[1]);
  }
  if (perm.details && !perm.details.trim().startsWith('{')) {
    const first = perm.details.trim().split(/[\s\n]/)[0];
    if (first.includes('/') || first.includes('\\')) {
      return fileName(first);
    }
  }
  return perm.title;
}

function askBar(): HTMLElement {
  const ask = ui.state.ask!;
  const open = ui.askOpen.get(ask.requestId) ?? true;
  const el = document.createElement('section');
  el.className = 'ask-card';
  el.dataset.id = ask.requestId;
  el.dataset.other = ui.askOtherOpen ? '1' : '0';
  el.dataset.open = open ? '1' : '0';
  const head = document.createElement('header');
  head.className = 'ask-head';
  const brand = document.createElement('div');
  brand.className = 'ask-brand';
  const kicker = document.createElement('span');
  kicker.className = 'ask-kicker';
  kicker.textContent =
    ask.kind === 'plan'
      ? tr('planReadyTitle')
      : ask.total && ask.total > 1
        ? tr('askQuestionOf', { n: (ask.index ?? 0) + 1, total: ask.total })
        : tr('askTitle');
  const preview = document.createElement('span');
  preview.className = 'ask-preview';
  preview.textContent =
    ask.kind === 'question' ? ask.title : (ask.body ?? '').replace(/\s+/g, ' ').trim().slice(0, 72);
  brand.append(kicker, preview);
  const tools = document.createElement('div');
  tools.className = 'ask-head-tools';
  const foldBtn = iconButton(open ? tr('permDetails') : tr('planReadyTitle'), iconChevron(), () => {
    ui.askOpen.set(ask.requestId, !open);
    render();
  });
  foldBtn.classList.toggle('open', open);
  const closeBtn = iconButton(tr('settingsClose'), iconClose(), () => post({ type: 'cancelAsk' }));
  tools.append(foldBtn, closeBtn);
  head.append(brand, tools);
  el.append(head);
  if (!open) {
    return el;
  }
  if (ask.kind === 'question' && ask.title) {
    const title = document.createElement('div');
    title.className = 'ask-title';
    title.textContent = ask.title;
    el.append(title);
  }
  if (ask.kind === 'plan') {
    const body = document.createElement('div');
    body.className = 'ask-plan';
    if (ask.body) {
      body.innerHTML = renderMarkdown(ask.body);
    } else {
      body.textContent = tr('planReadyEmpty');
    }
    el.append(body);
  }
  const actions = document.createElement('div');
  actions.className = 'ask-actions';
  for (const choice of ask.choices) {
    actions.append(askChoiceButton(choice, ask.kind));
  }
  el.append(actions);
  if (ui.askOtherOpen) {
    el.append(askOtherForm(ask.kind));
  }
  return el;
}

function askChoiceButton(
  choice: import('../types').AskChoice,
  kind: 'question' | 'plan',
): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className =
    choice.id === 'execute'
      ? 'btn primary ask-choice'
      : choice.id === 'decline'
        ? 'btn reject ask-choice'
        : 'btn allow ask-choice';
  const label = document.createElement('span');
  label.className = 'ask-choice-label';
  label.textContent = askChoiceLabel(choice, kind);
  el.append(label);
  const hint = askChoiceHint(choice, kind);
  if (hint) {
    const mark = document.createElement('span');
    mark.className = 'ask-hint';
    mark.setAttribute('aria-label', tr('askHint'));
    mark.dataset.tip = hint.replace(/"/g, "'");
    mark.innerHTML = iconAskHint();
    mark.addEventListener('click', (event) => event.stopPropagation());
    el.append(mark);
  }
  el.addEventListener('click', () => {
    if (choice.other) {
      ui.askOtherOpen = true;
      render();
      return;
    }
    post({ type: 'answerAsk', choiceId: choice.id });
  });
  return el;
}

function askChoiceHint(choice: import('../types').AskChoice, kind: 'question' | 'plan'): string {
  if (kind === 'plan') {
    if (choice.id === 'execute') {
      return tr('planExecuteHint');
    }
    if (choice.id === 'decline') {
      return tr('planDeclineHint');
    }
    if (choice.id === 'supplement') {
      return tr('planSupplementHint');
    }
  }
  if (choice.other) {
    return choice.description ?? tr('askOtherHint');
  }
  return choice.description ?? '';
}

function askChoiceLabel(choice: import('../types').AskChoice, kind: 'question' | 'plan'): string {
  if (kind === 'plan') {
    if (choice.id === 'execute') {
      return tr('planExecute');
    }
    if (choice.id === 'decline') {
      return tr('planDecline');
    }
    if (choice.id === 'supplement') {
      return tr('planSupplement');
    }
  }
  return choice.other ? tr('askOther') : choice.label;
}

function askOtherForm(kind: 'question' | 'plan'): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'ask-other';
  const input = document.createElement('textarea');
  input.rows = 3;
  input.placeholder = kind === 'plan' ? tr('planSupplementHint') : tr('askOtherHint');
  input.value = ui.askOtherDraft;
  input.addEventListener('input', () => {
    ui.askOtherDraft = input.value;
  });
  const send = button(tr('askSubmit'), () => {
    const notes = ui.askOtherDraft.trim();
    if (!notes) {
      return;
    }
    post({
      type: 'answerAsk',
      choiceId: kind === 'plan' ? 'supplement' : 'Other',
      notes,
    });
    ui.askOtherDraft = '';
    ui.askOtherOpen = false;
  });
  send.className = 'btn primary';
  wrap.append(input, send);
  queueMicrotask(() => input.focus());
  return wrap;
}

function permissionButton(option: PermissionOption, toolKind?: string): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = permissionButtonClass(option.kind);
  el.textContent = tr(permissionLabelKey(option, toolKind));
  el.title = option.name;
  el.addEventListener('click', () => post({ type: 'choosePermission', optionId: option.optionId }));
  return el;
}
