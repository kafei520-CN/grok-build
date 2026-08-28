import type { StringKey } from '../i18n';
import { formatRelativeTime } from '../i18n';
import { isBooting, loc, post, render, tr, ui } from './app';
import { button, iconButton } from './dom';
import { iconClock, iconClose, iconEdit, iconGrid, iconMore, iconStar } from './icons';
import { escapeHtml } from './markdown';
import { mountDashboard } from './dashboard';
import { listedSessions, mountSessionsDrawer } from './sessions';
import { mountTasks } from './tasks';

let headerLocale: string | undefined;

export function patchHeader(parent: HTMLElement): void {
  let el = document.getElementById('grok-header');
  if (isBooting()) {
    el?.remove();
    headerLocale = undefined;
    return;
  }
  const locale = ui.state.locale ?? 'en';
  if (!el || headerLocale !== locale) {
    const next = renderHeader();
    next.id = 'grok-header';
    if (el) {
      el.replaceWith(next);
    } else {
      parent.prepend(next);
    }
    headerLocale = locale;
    return;
  }
  const mark = el.querySelector('.brand .mark');
  if (mark) {
    mark.className = ui.state.status === 'streaming' ? 'mark pulse' : 'mark';
  }
  const more = el.querySelector('[data-act="more"]');
  more?.classList.toggle('open', ui.moreOpen);
  const menu = el.querySelector('.more-menu');
  if (ui.moreOpen && !menu) {
    el.querySelector('.header-actions')?.append(moreMenu());
  } else if (!ui.moreOpen) {
    menu?.remove();
  }
}

export function renderHeader(): HTMLElement {
  const el = document.createElement('header');
  el.className = 'topbar';
  const brand = document.createElement('div');
  brand.className = 'brand';
  const mark = document.createElement('span');
  mark.className = ui.state.status === 'streaming' ? 'mark pulse' : 'mark';
  mark.innerHTML = iconStar();
  const name = document.createElement('span');
  name.textContent = tr('grok');
  brand.append(mark, name);
  const actions = document.createElement('div');
  actions.className = 'header-actions';
  const sessions = iconButton(tr('sessions'), iconClock(), () =>
    post({ type: 'openDrawer', drawer: 'sessions' }),
  );
  sessions.dataset.act = 'sessions';
  const dash = iconButton(tr('menuDashboard'), iconGrid(), () =>
    post({ type: 'openDrawer', drawer: 'dashboard' }),
  );
  dash.dataset.act = 'dashboard';
  const more = iconButton(tr('more'), iconMore(), () => {
    ui.moreOpen = !ui.moreOpen;
    ui.picker = undefined;
    render();
  });
  more.dataset.act = 'more';
  more.addEventListener('click', (event) => event.stopPropagation());
  if (ui.moreOpen) {
    more.classList.add('open');
  }
  const fresh = iconButton(tr('newSession'), iconEdit(), () => post({ type: 'newSession' }));
  fresh.dataset.act = 'new';
  actions.append(sessions, dash, more, fresh);
  if (ui.moreOpen) {
    actions.append(moreMenu());
  }
  el.append(brand, actions);
  return el;
}

function moreMenu(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'more-menu';
  el.addEventListener('click', (event) => event.stopPropagation());
  const items: Array<[StringKey, () => void]> = [
    ['menuDashboard', () => post({ type: 'openDrawer', drawer: 'dashboard' })],
    ['drawerTasks', () => post({ type: 'openDrawer', drawer: 'tasks' })],
    ['menuCompact', () => post({ type: 'runSlash', command: 'compact' })],
    ['menuRewind', () => post({ type: 'runSlash', command: 'rewind' })],
    ['menuFork', () => post({ type: 'runSlash', command: 'fork' })],
    ['menuExport', () => post({ type: 'exportChat' })],
    ['menuSettings', () => post({ type: 'openSettings' })],
    ['menuRestart', () => post({ type: 'restart' })],
  ];
  for (const [key, fn] of items) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = tr(key);
    btn.addEventListener('click', () => {
      ui.moreOpen = false;
      fn();
    });
    el.append(btn);
  }
  return el;
}

export function renderDrawer(): HTMLElement {
  const el = document.createElement('aside');
  el.className = 'drawer';
  const head = document.createElement('div');
  head.className = 'drawer-head';
  const title = document.createElement('strong');
  title.textContent =
    ui.state.drawer === 'sessions'
      ? tr('drawerSessions')
      : ui.state.drawer === 'dashboard'
        ? tr('drawerDashboard')
        : ui.state.drawer === 'tasks'
          ? tr('drawerTasks')
          : ui.state.drawer === 'plan'
            ? tr('drawerPlan')
            : ui.state.drawer === 'history'
              ? tr('drawerHistory')
              : ui.state.drawerTab ?? 'Extensions';
  const close = iconButton(tr('drawerClose'), iconClose(), () => post({ type: 'closeDrawer' }));
  head.append(title, close);
  el.append(head);
  if (ui.state.drawer === 'sessions') {
    mountSessionsDrawer(el);
  } else if (ui.state.drawer === 'dashboard') {
    mountDashboard(el);
  } else if (ui.state.drawer === 'tasks') {
    mountTasks(el);
  } else if (ui.state.drawer === 'plan') {
    const pre = document.createElement('pre');
    pre.className = 'code';
    pre.textContent = ui.state.drawerBody ?? '';
    el.append(pre);
  } else if (ui.state.drawer === 'history') {
    for (const prompt of ui.state.history ?? []) {
      const item = button(prompt.slice(0, 80), () => {
        ui.draft = prompt;
        ui.wantFocus = true;
        post({ type: 'closeDrawer' });
      });
      item.className = 'idea';
      el.append(item);
    }
  } else {
    const pre = document.createElement('pre');
    pre.className = 'code';
    pre.textContent = ui.state.drawerBody ?? '';
    el.append(pre);
  }
  return el;
}

export function renderLightbox(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'lightbox';
  el.title = tr('closePreview');
  el.addEventListener('click', () => {
    ui.lightboxSrc = undefined;
    render();
  });
  const img = document.createElement('img');
  img.alt = tr('previewImage');
  img.src = ui.lightboxSrc ?? '';
  img.addEventListener('click', (event) => event.stopPropagation());
  el.append(img);
  return el;
}

export function panel(title: string, body: string): HTMLElement {
  const el = document.createElement('section');
  el.className = 'card';
  const h = document.createElement('h1');
  h.textContent = title;
  const p = document.createElement('p');
  p.textContent = body;
  el.append(h, p);
  return el;
}

export function setupCard(): HTMLElement {
  const card = document.createElement('section');
  card.className = 'card';
  const mark = document.createElement('div');
  mark.className = 'mark';
  mark.style.width = '36px';
  mark.style.height = '36px';
  mark.style.margin = '0 auto 12px';
  mark.style.color = 'inherit';
  mark.innerHTML = iconStar();
  const title = document.createElement('h1');
  title.textContent = tr('cliTitle');
  const copy = document.createElement('p');
  copy.textContent = tr('cliBody');
  card.append(mark, title, copy);
  const pre = document.createElement('pre');
  pre.className = 'code';
  pre.textContent = ui.state.cliInstallHint ?? '';
  const row = document.createElement('div');
  row.className = 'row';
  row.append(
    button(tr('cliInstall'), () => post({ type: 'installCli' }), true),
    button(tr('cliReady'), () => post({ type: 'restart' })),
  );
  card.append(pre, row);
  return card;
}

export function loginCard(): HTMLElement {
  const card = document.createElement('section');
  card.className = 'card';
  const authenticating = ui.state.status === 'authenticating';
  const mark = document.createElement('div');
  mark.className = 'mark';
  mark.style.width = '36px';
  mark.style.height = '36px';
  mark.style.margin = '0 auto 12px';
  mark.innerHTML = iconStar();
  const title = document.createElement('h1');
  title.textContent = authenticating ? tr('loginWaitTitle') : tr('loginTitle');
  const copy = document.createElement('p');
  copy.textContent = authenticating ? tr('loginWaitBody') : tr('loginBody');
  card.append(mark, title, copy);
  if (ui.state.login?.url) {
    const url = document.createElement('div');
    url.className = 'login-url';
    url.textContent = ui.state.login.url;
    card.append(url);
    if (ui.state.login.mode === 'device') {
      const note = document.createElement('p');
      note.textContent = tr('loginDevice');
      card.append(note);
    }
  }
  const row = document.createElement('div');
  row.className = 'row';
  if (authenticating) {
    row.append(
      button(tr('loginReopen'), () => post({ type: 'openLoginUrl' }), true),
      button(tr('cancel'), () => post({ type: 'cancelLogin' })),
    );
  } else {
    row.append(
      button(
        ui.state.login?.label
          ? tr('loginWith', { label: ui.state.login.label })
          : tr('loginGrok'),
        () => post({ type: 'login' }),
        true,
      ),
    );
  }
  card.append(row);
  if (authenticating && ui.state.login?.mode !== 'device') {
    const paste = document.createElement('form');
    paste.className = 'paste';
    paste.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = paste.querySelector('input') as HTMLInputElement | null;
      if (input?.value.trim()) {
        post({ type: 'submitAuthCode', code: input.value });
      }
    });
    const codeInput = document.createElement('input');
    codeInput.type = 'text';
    codeInput.placeholder = tr('pasteCode');
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.textContent = tr('submit');
    paste.append(codeInput, submit);
    card.append(paste);
  }
  const api = document.createElement('button');
  api.className = 'linkish';
  api.type = 'button';
  api.textContent = tr('useApiKey');
  api.addEventListener('click', () => {
    const key = window.prompt(tr('promptApiKey'));
    if (key) {
      post({ type: 'setApiKey', key });
    }
  });
  card.append(api);
  return card;
}

export function bootStar(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'boot';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-label', tr('startingTitle'));
  const mark = document.createElement('div');
  mark.className = 'mark pulse';
  mark.innerHTML = iconStar();
  el.append(mark);
  return el;
}

export function errorCard(): HTMLElement {
  const card = document.createElement('section');
  card.className = 'card';
  const title = document.createElement('h1');
  title.textContent = tr('errorTitle');
  const copy = document.createElement('p');
  copy.textContent = ui.state.error ?? '';
  card.append(title, copy, button(tr('retry'), () => post({ type: 'restart' }), true));
  return card;
}

export function home(): HTMLElement {
  const el = document.createElement('section');
  el.className = 'home';
  const halo = document.createElement('div');
  halo.className = 'home-star';
  const mark = document.createElement('div');
  mark.className = 'mark';
  mark.innerHTML = iconStar();
  halo.append(mark);
  const title = document.createElement('h1');
  title.textContent = tr('homeTitle');
  const blurb = document.createElement('p');
  blurb.textContent = tr('homeBody');
  el.append(halo, title, blurb);
  const starters = document.createElement('div');
  starters.className = 'starters';
  for (const idea of [tr('starter1'), tr('starter2'), tr('starter3')]) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'starter';
    btn.textContent = idea;
    btn.addEventListener('click', () => {
      ui.stickToBottom = true;
      post({ type: 'send', text: idea });
    });
    starters.append(btn);
  }
  el.append(starters);
  if (ui.state.hideSessionPreview) {
    return el;
  }
  const preview = listedSessions().slice(0, 4);
  if (preview.length > 0) {
    const recent = document.createElement('div');
    recent.className = 'recent';
    const label = document.createElement('div');
    label.className = 'recent-label';
    label.textContent = tr('recent');
    recent.append(label);
    for (const row of preview) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        row.id === ui.state.currentSessionId ? 'recent-card active' : 'recent-card';
      btn.innerHTML = `<span class="session-title">${escapeHtml(row.title)}</span><span class="session-time">${escapeHtml(formatRelativeTime(loc(), row.updatedAt))}</span>`;
      btn.addEventListener('click', () =>
        post({ type: 'loadSession', sessionId: row.id, cwd: row.cwd }),
      );
      recent.append(btn);
    }
    el.append(recent);
  }
  return el;
}


