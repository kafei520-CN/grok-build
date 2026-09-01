import type { ChatState, StreamTail } from '../types';
import { applyEditStatsToMessages, type EditStatsItem } from '../editStats';
import { mergeLiveMessages } from '../messageMerge';
import { applyThemeTo } from '../theme';
import { bindRender, isBooting, isRemoteWeb, normalizeState, persistUi, post, root, ui } from './app';
import { patchHeader, renderDrawer, renderLightbox } from './chrome';
import { mountComposer, patchComposer } from './composer';
import { removeSlot, replaceSlot } from './dom';
import { patchSettings, settingsBackMessage } from './settings';
import { bindFileDrop, syncDropHint } from './drop';
import { patchBody, scrollTranscript, syncWorkClock } from './transcript';
import { chromeKeepers, overlayKind, syncSurface, syncWallpaper } from './wallpaper';
import { playNotify } from './notify';
import { hideRemoteOverlays, showRemoteDiff, showRemoteFile } from './remoteOverlay';
import { reflowFloating } from './popover';
import {
  appendWorkspaceDiff,
  applyWorkspaceFile,
  applyWorkspaceGone,
  applyWorkspaceIndex,
  applyWorkspaceMoved,
  applyWorkspaceSave,
  hideWorkspace,
  patchWorkspace,
} from './workspace';

bindRender(render);

type HostMsg = {
  type: string;
  state?: ChatState;
  files?: unknown;
  truncated?: boolean;
  messages?: ChatState['messages'];
  hydrate?: number;
  merge?: boolean;
  prepend?: boolean;
  reset?: boolean;
  done?: boolean;
  items?: EditStatsItem[];
} & Partial<StreamTail>;

let hydrateGen = 0;
let skipHydrate = 0;

function onHostMessage(data: HostMsg | null | undefined): void {
  if (!data || typeof data !== 'object') {
    return;
  }
  if (data.type === 'state' && data.state) {
    if (typeof data.hydrate === 'number') {
      hydrateGen = data.hydrate;
    }
    const incoming = normalizeState(data.state);
    const merged = mergeLiveMessages(ui.state.messages, incoming.messages);
    if (merged && (data.merge || typeof data.hydrate === 'number')) {
      incoming.messages = merged;
      incoming.restoringSession = false;
      if (typeof data.hydrate === 'number') {
        skipHydrate = data.hydrate;
      }
    }
    ui.state = incoming;
    persistUi();
    const cue = ui.state.notify;
    if (cue && ui.state.settings?.notifySound !== false) {
      playNotify(cue);
    }
    render();
    return;
  }
  if (data.type === 'messages') {
    if (typeof data.hydrate === 'number' && data.hydrate !== hydrateGen) {
      return;
    }
    if (typeof data.hydrate === 'number' && data.hydrate === skipHydrate && data.prepend) {
      if (data.done) {
        ui.state.restoringSession = false;
        render();
      }
      return;
    }
    const batch = Array.isArray(data.messages) ? data.messages : [];
    if (data.reset) {
      ui.state.messages = batch;
    } else if (data.prepend) {
      ui.state.messages = batch.concat(ui.state.messages);
    } else {
      ui.state.messages = ui.state.messages.concat(batch);
    }
    if (data.done || ui.state.messages.length > 0) {
      ui.state.restoringSession = false;
    }
    render();
    return;
  }
  if (data.type === 'tail' && data.message) {
    applyTail(data as StreamTail);
    return;
  }
  if (data.type === 'editStats' && Array.isArray(data.items)) {
    const next = applyEditStatsToMessages(ui.state.messages, data.items);
    if (next !== ui.state.messages) {
      ui.state = { ...ui.state, messages: next };
      persistUi();
      render();
    }
    return;
  }
  if (!isRemoteWeb()) {
    return;
  }
  if (data.type === 'diff' && 'payload' in data) {
    showRemoteDiff((data as { payload: Parameters<typeof showRemoteDiff>[0] }).payload);
    return;
  }
  if (data.type === 'diffMore' && Array.isArray((data as { files?: unknown[] }).files)) {
    appendWorkspaceDiff((data as { files: unknown[] }).files);
    return;
  }
  if (data.type === 'filePreview') {
    showRemoteFile(data as Parameters<typeof showRemoteFile>[0]);
    return;
  }
  if (data.type === 'workspaceIndex') {
    applyWorkspaceIndex(data as Parameters<typeof applyWorkspaceIndex>[0]);
    return;
  }
  if (data.type === 'workspaceFile') {
    applyWorkspaceFile(data as Parameters<typeof applyWorkspaceFile>[0]);
    return;
  }
  if (data.type === 'workspaceSaveResult') {
    applyWorkspaceSave(data as Parameters<typeof applyWorkspaceSave>[0]);
    return;
  }
  if (data.type === 'workspaceMoved') {
    applyWorkspaceMoved(data as Parameters<typeof applyWorkspaceMoved>[0]);
    return;
  }
  if (data.type === 'workspaceGone') {
    applyWorkspaceGone(data as Parameters<typeof applyWorkspaceGone>[0]);
  }
}

window.addEventListener('message', (event: MessageEvent<HostMsg>) => {
  onHostMessage(event.data);
});
(window as unknown as { __grokDeliver?: (data: unknown) => void }).__grokDeliver = (data) => {
  onHostMessage(data as HostMsg);
};

function applyTail(tail: StreamTail): void {
  const messages = ui.state.messages;
  const last = messages.at(-1);
  if (last?.id === tail.message.id) {
    messages[messages.length - 1] = tail.message;
  } else {
    messages.push(tail.message);
  }
  ui.state.status = tail.status;
  ui.state.context = tail.context;
  ui.state.queue = tail.queue;
  render();
}

function render(): void {
  try {
    document.documentElement.lang = ui.state.locale === 'zh-CN' ? 'zh-CN' : 'en';
    applyThemeTo(
      document.documentElement.style,
      ui.state.theme,
      isRemoteWeb() ? ui.state.hostChrome : undefined,
    );
    syncSurface(
      root,
      ui.state.theme,
      overlayKind({
        settingsOpen: ui.state.settingsOpen,
        settingsPage: ui.state.settingsPage,
        drawer: ui.state.drawer,
      }),
    );
    root.dataset.status = ui.state.status;
    root.classList.toggle('compact', Boolean(ui.state.compactMode));
    root.classList.toggle('focused', ui.composerFocused);
    if (!isBooting() && !document.getElementById('grok-header')) {
      const keep = chromeKeepers();
      root.replaceChildren();
      for (const node of keep) {
        root.append(node);
      }
    }
    patchHeader(root);
    patchBody(root);
    const booting = isBooting();
    if (!booting && !document.getElementById('composer-wrap')) {
      mountComposer(root);
    }
    patchComposer();
    syncDropHint();
    const composer = document.getElementById('composer-wrap');
    if (composer) {
      composer.hidden = booting || Boolean(ui.state.settingsOpen);
    }
    const workspaceOn =
      isRemoteWeb() && ui.remoteView === 'workspace' && !booting && !ui.state.settingsOpen;
    root.classList.toggle('ws-on', workspaceOn);
    if (workspaceOn) {
      patchWorkspace(root);
    } else {
      hideWorkspace();
    }
    if (ui.state.drawer) {
      replaceSlot('grok-drawer', renderDrawer(), root);
    } else {
      removeSlot('grok-drawer');
    }
    patchSettings(root);
    if (ui.lightboxSrc) {
      replaceSlot('grok-lightbox', renderLightbox(), root);
    } else {
      removeSlot('grok-lightbox');
    }
    syncWallpaper(root, ui.state.theme);
    scrollTranscript();
    syncWorkClock();
    reflowFloating();
  } catch (error) {
    root.textContent = `Grok UI error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function boot(): void {
  (window as unknown as { __grokPrime?: () => void }).__grokPrime?.();
  post({ type: 'ready' });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return;
    }
    if (hideRemoteOverlays()) {
      event.preventDefault();
      return;
    }
    if (ui.lightboxSrc) {
      event.preventDefault();
      ui.lightboxSrc = undefined;
      render();
      return;
    }
    if (ui.moreOpen || ui.picker || ui.menu) {
      event.preventDefault();
      ui.moreOpen = false;
      ui.picker = undefined;
      ui.menu = undefined;
      render();
      return;
    }
    if (ui.state.settingsOpen) {
      event.preventDefault();
      post(settingsBackMessage(ui.state.settingsPage ?? 'main'));
      return;
    }
    if (ui.state.drawer) {
      event.preventDefault();
      post({ type: 'closeDrawer' });
    }
  });
  document.addEventListener('click', (event) => {
    const href = hrefFromEvent(event);
    if (href) {
      event.preventDefault();
      post({ type: 'openUrl', url: href });
    }
    if (ui.moreOpen || ui.picker) {
      ui.moreOpen = false;
      ui.picker = undefined;
      render();
    }
  });
  bindFileDrop();
  render();
}

function hrefFromEvent(event: MouseEvent): string | undefined {
  const target = event.target;
  if (!(target instanceof Element)) {
    return undefined;
  }
  const link = target.closest('a[href]');
  if (!(link instanceof HTMLAnchorElement)) {
    return undefined;
  }
  const href = link.getAttribute('href') ?? '';
  if (/^https?:/i.test(href) || href.toLowerCase().startsWith('mailto:')) {
    return href;
  }
  return undefined;
}

try {
  boot();
} catch (error) {
  root.textContent = `Grok failed to start: ${error instanceof Error ? error.message : String(error)}`;
}
