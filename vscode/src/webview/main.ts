import type { ChatState, StreamTail } from '../types';
import { applyThemeTo } from '../theme';
import { bindRender, isBooting, normalizeState, persistUi, post, root, ui } from './app';
import { patchHeader, renderDrawer, renderLightbox } from './chrome';
import { mountComposer, patchComposer } from './composer';
import { removeSlot, replaceSlot } from './dom';
import { patchSettings } from './settings';
import { patchBody, scrollTranscript, syncWorkClock } from './transcript';

bindRender(render);

window.addEventListener(
  'message',
  (event: MessageEvent<{ type: string; state?: ChatState } & Partial<StreamTail>>) => {
    if (event.data?.type === 'state' && event.data.state) {
      ui.state = normalizeState(event.data.state);
      persistUi();
      render();
      return;
    }
    if (event.data?.type === 'tail' && event.data.message) {
      applyTail(event.data as StreamTail);
    }
  },
);

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
    applyThemeTo(document.documentElement.style, ui.state.theme);
    root.dataset.status = ui.state.status;
    root.classList.toggle('compact', Boolean(ui.state.compactMode));
    root.classList.toggle('focused', ui.composerFocused);
    if (!isBooting() && !document.getElementById('grok-header')) {
      root.replaceChildren();
    }
    patchHeader(root);
    patchBody(root);
    const booting = isBooting();
    if (!booting && !document.getElementById('composer-wrap')) {
      mountComposer(root);
    }
    patchComposer();
    const composer = document.getElementById('composer-wrap');
    if (composer) {
      composer.hidden = booting || Boolean(ui.state.settingsOpen);
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
    scrollTranscript();
    syncWorkClock();
  } catch (error) {
    root.textContent = `Grok UI error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function boot(): void {
  post({ type: 'ready' });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return;
    }
    if (ui.lightboxSrc) {
      ui.lightboxSrc = undefined;
      render();
      return;
    }
    if (ui.state.settingsOpen) {
      post({
        type:
          ui.state.settingsPage === 'rules'
            ? 'closeRules'
            : ui.state.settingsPage === 'skills'
              ? 'closeSkills'
              : ui.state.settingsPage === 'apis'
                ? 'closeApis'
                : ui.state.settingsPage === 'theme'
                  ? 'closeTheme'
                  : 'closeSettings',
      });
    }
  });
  document.addEventListener('click', (event) => {
    const href = hrefFromEvent(event);
    if (href) {
      event.preventDefault();
      post({ type: 'openUrl', url: href });
    }
    if (!ui.picker) {
      return;
    }
    ui.picker = undefined;
    render();
  });
  root.addEventListener('dragover', (event) => {
    event.preventDefault();
    root.classList.add('drop');
  });
  root.addEventListener('dragleave', () => root.classList.remove('drop'));
  root.addEventListener('drop', (event) => {
    event.preventDefault();
    root.classList.remove('drop');
    const uriList = event.dataTransfer?.getData('text/uri-list') ?? '';
    const first = uriList
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith('#'));
    if (first?.startsWith('file:')) {
      const path = decodeURIComponent(
        first.replace(/^file:\/\//, '').replace(/^\/([A-Za-z]:)/, '$1'),
      );
      post({ type: 'pickFile', path });
    }
  });
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
