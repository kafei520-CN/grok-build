import { totals } from '../edits';
import { formatDuration, toolKindLabel, turnSourceText } from '../i18n';
import { permissionButtonClass, permissionLabelKey } from '../permissions';
import { permissionActions, permissionNeedsCancel, permissionTarget } from '../permissionView';
import type {
  ChatMessage,
  ChatState,
  FileEdit,
  PermissionOption,
  PermissionPrompt,
  PlanStep,
} from '../types';
import { loc, post, render, tr, ui } from './app';
import { patchJumpBottom } from './composer';
import { restoreScrollTop, shouldPinToBottom, userHeldScroll, type TranscriptScroll } from './scroll';
import { bootStar, errorCard, home, loginCard, panel, setupCard } from './chrome';
import { button, iconButton } from './dom';
import {
  iconAskHint,
  iconCheck,
  iconChevron,
  iconClock,
  iconClose,
  iconCopy,
  iconEdit,
  iconFork,
  iconStar,
  toolIcon,
} from './icons';
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
    if (turn.assistant && thinkingWork(node)?.classList.contains('live')) {
      ui.workOpen.set(turn.assistant.id, false);
    }
    const sig = turnSig(turn, split);
    if (node.dataset.sig !== sig) {
      node.replaceWith(turnEl(turn, split));
    } else if (turn.assistant?.steps?.length && !node.querySelector('.steps-card')) {
      node.replaceWith(turnEl(turn, split));
    } else if (turn.assistant && ui.workOpen.get(turn.assistant.id) === false) {
      const work = thinkingWork(node);
      if (work?.open) {
        work.open = false;
      }
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
  if (assistant.steps?.length && !col.querySelector('.steps-card')) {
    node.replaceWith(turnEl(turn, false));
    return;
  }
  if (hasWork(assistant)) {
    let work = thinkingWork(col);
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
      const work = thinkingWork(col);
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
  patchErrorCard(col, assistant);
  patchStepsCard(col, assistant);
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
    if (title instanceof HTMLElement) {
      fillToolTitle(title, tool);
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
    ui.askPicked.clear();
    ui.askPickStamp = '';
    return;
  }
  const stamp = `${ask.requestId}:${ask.index ?? 0}`;
  if (ui.askPickStamp !== stamp) {
    ui.askPickStamp = stamp;
    ui.askOtherOpen = false;
    ui.askOtherDraft = '';
    ui.askPicked.clear();
  }
  const other = ui.askOtherOpen ? '1' : '0';
  const open = (ui.askOpen.get(ask.requestId) ?? true) ? '1' : '0';
  const picked = [...ui.askPicked].sort().join('|');
  if (
    existing?.dataset.id === ask.requestId &&
    existing.dataset.stamp === stamp &&
    existing.dataset.other === other &&
    existing.dataset.open === open &&
    existing.dataset.picked === picked
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

const scrollState: TranscriptScroll = {
  stickToBottom: true,
  transcriptScroll: 0,
  lastUserScroll: 0,
  pinLock: false,
};

export function scrollTranscript(): void {
  const el = document.getElementById('transcript');
  if (!el) {
    return;
  }
  bindTranscriptScroll(el);
  scrollState.stickToBottom = ui.stickToBottom;
  scrollState.transcriptScroll = ui.transcriptScroll;
  const now = Date.now();
  if (
    shouldPinToBottom({
      stickToBottom: ui.stickToBottom,
      lightbox: Boolean(ui.lightboxSrc),
      now,
      lastUserScroll: scrollState.lastUserScroll,
    })
  ) {
    scrollState.pinLock = true;
    el.scrollTop = el.scrollHeight;
    scrollState.pinLock = false;
    patchJumpBottom();
    return;
  }
  if (ui.lightboxSrc || userHeldScroll(now, scrollState.lastUserScroll)) {
    return;
  }
  const restored = restoreScrollTop(el.scrollTop, ui.transcriptScroll);
  if (restored !== undefined) {
    el.scrollTop = restored;
  }
}

function bindTranscriptScroll(el?: HTMLElement | null): void {
  const node = el ?? document.getElementById('transcript');
  if (!node || node.dataset.scrollBound === '1') {
    return;
  }
  node.dataset.scrollBound = '1';
  const markUser = () => {
    scrollState.lastUserScroll = Date.now();
  };
  node.addEventListener('pointerdown', markUser, { passive: true });
  node.addEventListener('wheel', markUser, { passive: true });
  node.addEventListener(
    'scroll',
    () => {
      if (scrollState.pinLock) {
        return;
      }
      scrollState.lastUserScroll = Date.now();
      ui.stickToBottom =
        node.scrollHeight - node.scrollTop - node.clientHeight < 56;
      ui.transcriptScroll = node.scrollTop;
      patchJumpBottom();
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
    stepsKey(a?.steps),
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
  if (message.steps?.length) {
    el.append(stepsBlock(message));
  }
  if (!message.streaming) {
    el.append(turnMeta(message));
    if (message.edits?.length) {
      el.append(changesBlock(message.id, message.edits));
    }
  }
  return el;
}

function patchErrorCard(col: HTMLElement, message: ChatMessage): void {
  const existing = col.querySelector('.turn-error') as HTMLElement | null;
  if (!message.error) {
    existing?.remove();
    return;
  }
  col.querySelector('.pulse')?.remove();
  const next = turnErrorCard(message);
  if (existing?.dataset.err === next.dataset.err) {
    return;
  }
  if (existing) {
    existing.replaceWith(next);
    return;
  }
  const answer = col.querySelector('.md.answer');
  if (answer) {
    answer.after(next);
    return;
  }
  const work = thinkingWork(col);
  if (work) {
    work.after(next);
    return;
  }
  const later = col.querySelector('.steps-card, .turn-meta, .changes');
  if (later) {
    col.insertBefore(next, later);
    return;
  }
  col.append(next);
}

function turnErrorCard(message: ChatMessage): HTMLElement {
  const error = message.error!;
  const el = document.createElement('div');
  el.className = error.retrying ? 'turn-error live' : 'turn-error';
  el.dataset.err = [
    error.retrying ? '1' : '0',
    error.attempt ?? '',
    error.maxAttempts ?? '',
    error.code ?? '',
    error.message,
  ].join('|');
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

function thinkingWork(root: ParentNode): HTMLDetailsElement | null {
  return root.querySelector('details.work');
}

function stepsKey(steps: PlanStep[] | undefined): string {
  return (steps ?? []).map((step) => `${step.status}:${step.content}`).join('\n');
}

function stepsBlock(message: ChatMessage): HTMLElement {
  const open = ui.stepsOpen.get(message.id) ?? true;
  const el = document.createElement('section');
  el.className = stepsCardClass(message, open);
  el.dataset.mid = message.id;
  el.dataset.open = open ? '1' : '0';
  const head = document.createElement('header');
  head.className = 'ask-head';
  const brand = document.createElement('div');
  brand.className = 'ask-brand';
  const kicker = document.createElement('span');
  kicker.className = 'ask-kicker';
  kicker.textContent = tr('stepsTitle');
  const preview = document.createElement('span');
  preview.className = 'ask-preview';
  preview.textContent = stepsPreview(message.steps ?? []);
  brand.append(kicker, preview);
  const tools = document.createElement('div');
  tools.className = 'ask-head-tools';
  const foldBtn = document.createElement('button');
  foldBtn.type = 'button';
  foldBtn.className = open ? 'icon-btn open' : 'icon-btn';
  foldBtn.title = tr('stepsTitle');
  foldBtn.innerHTML = iconChevron();
  tools.append(foldBtn);
  head.append(brand, tools);
  head.addEventListener('click', () => toggleStepsOpen(el, message.id));
  const list = document.createElement('div');
  list.className = 'ask-actions steps-list';
  fillStepRows(list, message.steps ?? [], Boolean(message.streaming));
  el.append(head, list);
  return el;
}

function stepsStopped(message: ChatMessage): boolean {
  return Boolean(message.steps?.some((step) => step.status === 'abandoned'));
}

function stepsCardClass(message: ChatMessage, open: boolean): string {
  return [
    'ask-card',
    'steps-card',
    message.streaming ? 'live' : '',
    stepsStopped(message) ? 'stopped' : '',
    open ? 'open' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function toggleStepsOpen(el: HTMLElement, messageId: string): void {
  const next = !el.classList.contains('open');
  ui.stepsOpen.set(messageId, next);
  el.classList.toggle('open', next);
  el.dataset.open = next ? '1' : '0';
  el.querySelector('.ask-head-tools .icon-btn')?.classList.toggle('open', next);
}

function patchStepsCard(col: HTMLElement, message: ChatMessage): void {
  const existing = col.querySelector('.steps-card') as HTMLElement | null;
  if (!message.steps?.length) {
    existing?.remove();
    return;
  }
  if (!existing) {
    const card = stepsBlock(message);
    const later = col.querySelector('.turn-meta, .changes');
    if (later) {
      col.insertBefore(card, later);
    } else {
      col.append(card);
    }
    return;
  }
  const open = ui.stepsOpen.get(message.id) ?? existing.classList.contains('open');
  existing.className = stepsCardClass(message, open);
  existing.dataset.open = open ? '1' : '0';
  const preview = existing.querySelector('.ask-preview');
  if (preview) {
    preview.textContent = stepsPreview(message.steps);
  }
  existing.querySelector('.ask-head-tools .icon-btn')?.classList.toggle('open', open);
  const list = existing.querySelector('.steps-list') as HTMLElement | null;
  if (list) {
    fillStepRows(list, message.steps, Boolean(message.streaming));
  }
}

function fillStepRows(body: HTMLElement, steps: PlanStep[], streaming: boolean): void {
  const key = `${streaming ? '1' : '0'}\n${stepsKey(steps)}`;
  if (body.dataset.steps === key) {
    return;
  }
  body.dataset.steps = key;
  body.replaceChildren();
  for (const step of steps) {
    body.append(stepRow(step, streaming));
  }
}

function stepRow(step: PlanStep, streaming: boolean): HTMLElement {
  const row = document.createElement('div');
  row.className = 'step-row';
  row.dataset.status = step.status;
  const icon = document.createElement('span');
  const live = streaming && step.status === 'in_progress';
  icon.className = `step-icon ${stepIconKind(step.status, live)}`;
  icon.innerHTML = stepIcon(step.status, live);
  const text = document.createElement('span');
  text.className = 'step-text';
  text.textContent = step.content;
  row.append(icon, text);
  return row;
}

function stepIconKind(status: PlanStep['status'], live: boolean): string {
  if (status === 'completed') {
    return 'ok';
  }
  if (status === 'failed') {
    return 'fail';
  }
  if (live) {
    return 'run';
  }
  return 'wait';
}

function stepIcon(status: PlanStep['status'], live: boolean): string {
  if (status === 'completed') {
    return iconCheck();
  }
  if (status === 'failed') {
    return iconClose();
  }
  if (live) {
    return iconEdit();
  }
  return iconClock();
}

function stepsPreview(steps: PlanStep[]): string {
  const done = steps.filter((step) => step.status === 'completed' || step.status === 'failed').length;
  const count = tr('stepsCount', { done, n: steps.length });
  const running = steps.find((step) => step.status === 'in_progress');
  if (running) {
    return `${count} · ${running.content}`;
  }
  return count;
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
  if (message.streaming) {
    return time ? tr('elapsedLive', { time }) : tr('thinkingNow');
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
  const title = document.createElement('div');
  title.className = 'tool-title';
  fillToolTitle(title, tool);
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

function fillToolTitle(title: HTMLElement, tool: ChatMessage['tools'][number]): void {
  const kind = toolKindLabel(loc(), tool.kind);
  const hint = tool.detail ? fileName(tool.detail) : tool.title;
  const icon = document.createElement('span');
  icon.className = 'tool-icon';
  if (tool.kind) {
    icon.dataset.kind = tool.kind;
  }
  const glyph = toolIcon(tool.kind);
  if (glyph.startsWith('<svg')) {
    icon.innerHTML = glyph;
  } else {
    icon.textContent = glyph;
  }
  const copy = document.createElement('span');
  copy.className = 'tool-copy';
  copy.textContent = `${kind}${hint ? ` · ${hint}` : ''}`;
  title.replaceChildren(icon, copy);
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
  const stamp = turnSourceText(loc(), message, ui.state.timestamps !== false);
  if (stamp) {
    const time = document.createElement('span');
    time.className = 'turn-time';
    time.title = stamp;
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
  for (const action of permissionActions(perm)) {
    const option = perm.options.find((item) => item.optionId === action.optionId);
    if (option) {
      row.append(permissionButton(option, perm.toolKind));
    }
  }
  if (permissionNeedsCancel(perm)) {
    row.append(button(tr('cancel'), () => post({ type: 'cancelPermission' })));
  }
  bar.append(fold, row);
  return bar;
}

function askBar(): HTMLElement {
  const ask = ui.state.ask!;
  const open = ui.askOpen.get(ask.requestId) ?? true;
  const el = document.createElement('section');
  el.className = 'ask-card';
  el.dataset.id = ask.requestId;
  el.dataset.stamp = `${ask.requestId}:${ask.index ?? 0}`;
  el.dataset.other = ui.askOtherOpen ? '1' : '0';
  el.dataset.open = open ? '1' : '0';
  el.dataset.picked = [...ui.askPicked].sort().join('|');
  const head = document.createElement('header');
  head.className = 'ask-head';
  const brand = document.createElement('div');
  brand.className = 'ask-brand';
  const kicker = document.createElement('span');
  kicker.className = 'ask-kicker';
  kicker.textContent =
    ask.kind === 'plan'
      ? tr('planReadyTitle')
      : ask.multiSelect
        ? tr('askMultiHint')
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
    actions.append(askChoiceButton(choice, ask.kind, Boolean(ask.multiSelect)));
  }
  el.append(actions);
  if (ui.askOtherOpen) {
    el.append(askOtherForm(ask.kind, Boolean(ask.multiSelect)));
  } else if (ask.multiSelect) {
    el.append(askMultiSubmit());
  }
  return el;
}

function askChoiceButton(
  choice: import('../types').AskChoice,
  kind: 'question' | 'plan',
  multiSelect: boolean,
): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className =
    choice.id === 'execute'
      ? 'btn primary ask-choice'
      : choice.id === 'decline'
        ? 'btn reject ask-choice'
        : 'btn allow ask-choice';
  const picked = ui.askPicked.has(choice.id);
  el.classList.toggle('picked', multiSelect && picked);
  el.setAttribute('aria-pressed', multiSelect && picked ? 'true' : 'false');
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
    if (multiSelect) {
      toggleAskChoice(choice);
      return;
    }
    if (choice.other) {
      ui.askOtherOpen = true;
      render();
      return;
    }
    post({ type: 'answerAsk', choiceId: choice.id });
  });
  return el;
}

function toggleAskChoice(choice: import('../types').AskChoice): void {
  if (ui.askPicked.has(choice.id)) {
    ui.askPicked.delete(choice.id);
  } else {
    ui.askPicked.add(choice.id);
  }
  ui.askOtherOpen = [...ui.askPicked].some((id) => {
    const row = ui.state.ask?.choices.find((item) => item.id === id);
    return Boolean(row?.other) || id === 'Other';
  });
  if (!ui.askOtherOpen) {
    ui.askOtherDraft = '';
  }
  render();
}

function askMultiSubmit(): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'ask-other';
  const send = button(tr('askSubmit'), submitAskPicked);
  send.className = 'btn primary';
  send.disabled = ui.askPicked.size === 0;
  wrap.append(send);
  return wrap;
}

function submitAskPicked(): void {
  const ids = [...ui.askPicked];
  if (!ids.length) {
    return;
  }
  const other = ids.some((id) => {
    const row = ui.state.ask?.choices.find((item) => item.id === id);
    return Boolean(row?.other) || id === 'Other';
  });
  const notes = ui.askOtherDraft.trim();
  if (other && !notes) {
    return;
  }
  post({ type: 'answerAsk', choiceIds: ids, notes: notes || undefined });
  ui.askOtherDraft = '';
  ui.askOtherOpen = false;
  ui.askPicked.clear();
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

function askOtherForm(kind: 'question' | 'plan', multiSelect: boolean): HTMLElement {
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
    if (multiSelect) {
      submitAskPicked();
      return;
    }
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
