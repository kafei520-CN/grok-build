import { copyText, post, tr, ui } from './app';
import { iconChevron } from './icons';

export function remoteNavRow(): HTMLElement {
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'settings-row settings-link';
  const copy = document.createElement('div');
  copy.className = 'settings-copy';
  const name = document.createElement('div');
  name.className = 'settings-label';
  name.textContent = tr('settingsRemote');
  const hint = document.createElement('div');
  hint.className = 'settings-hint';
  hint.textContent = navHint();
  copy.append(name, hint);
  const chevron = document.createElement('span');
  chevron.className = 'settings-chevron';
  chevron.innerHTML = iconChevron();
  row.append(copy, chevron);
  row.addEventListener('click', () => post({ type: 'openRemote' }));
  return row;
}

export function mountRemoteBody(): HTMLElement {
  const remote = ui.state.remote;
  const localOn = Boolean(remote?.running && remote.local);
  const publicOn = Boolean(remote?.running && remote.public);
  const running = localOn || publicOn;
  const body = document.createElement('div');
  body.className = 'settings-body';
  const hint = document.createElement('div');
  hint.className = 'settings-hint';
  hint.textContent = tr('settingsRemoteHint');
  const shared = document.createElement('div');
  shared.className = 'settings-card';
  shared.append(portRow(remote?.port ?? 8787, running), authBlock(remote));
  if (remote?.error) {
    const err = document.createElement('div');
    err.className = 'settings-hint';
    err.textContent = tr('settingsRemoteError', { error: remote.error });
    shared.append(err);
  }
  if (running) {
    shared.append(bindRow(remote?.bind ?? '127.0.0.1', remote?.port ?? 8787), clientsRow(remote?.clients ?? 0));
  }
  body.append(
    hint,
    block(tr('settingsRemote'), [shared]),
    block(tr('settingsRemoteLocal'), [localCard(localOn, publicOn)]),
    block(tr('settingsRemotePublic'), [publicCard(localOn, publicOn)]),
  );
  return body;
}

function navHint(): string {
  const remote = ui.state.remote;
  if (!remote?.running) {
    return tr('settingsRemoteOff');
  }
  const n = remote.clients;
  if (remote.local && remote.public) {
    return tr('settingsRemoteNavBoth', { n });
  }
  if (remote.public) {
    return tr('settingsRemoteNavPublic', { n });
  }
  return tr('settingsRemoteNavLocal', { n });
}

function block(title: string, nodes: HTMLElement[]): HTMLElement {
  const wrap = document.createElement('section');
  wrap.className = 'settings-block';
  const kicker = document.createElement('div');
  kicker.className = 'settings-kicker';
  kicker.textContent = title;
  wrap.append(kicker, ...nodes);
  return wrap;
}

function localCard(localOn: boolean, publicOn: boolean): HTMLElement {
  const card = document.createElement('div');
  card.className = 'settings-card';
  card.append(
    switchRow(tr('settingsRemoteLocal'), tr('settingsRemoteLocalHint'), localOn, () => {
      post({ type: 'startRemote', port: currentPort(), local: !localOn, public: publicOn });
    }),
  );
  const remote = ui.state.remote;
  if (localOn && remote) {
    card.append(urlBlock(lanOnly(remote.urls, remote.publicUrl)));
  }
  return card;
}

function publicCard(localOn: boolean, publicOn: boolean): HTMLElement {
  const remote = ui.state.remote;
  const card = document.createElement('div');
  card.className = 'settings-card';
  card.append(
    switchRow(tr('settingsRemotePublic'), tr('settingsRemotePublicHint'), publicOn, () => {
      post({ type: 'startRemote', port: currentPort(), local: localOn, public: !publicOn });
    }),
  );
  if (publicOn) {
    const status = document.createElement('div');
    status.className = 'settings-hint';
    status.textContent = tunnelStatus(remote);
    card.append(status);
    if (remote?.publicUrl) {
      card.append(urlBlock([remote.publicUrl]));
    }
  }
  return card;
}

function tunnelStatus(remote: { tunnel?: string; tunnelError?: string } | undefined): string {
  if (remote?.tunnel === 'up') {
    return tr('settingsRemoteTunnelUp');
  }
  if (remote?.tunnel === 'connecting') {
    return tr('settingsRemoteTunnelConnecting');
  }
  switch (remote?.tunnelError) {
    case 'auth':
      return tr('settingsRemoteTunnelErrAuth');
    case 'host':
      return tr('settingsRemoteTunnelErrHost');
    case 'forward':
      return tr('settingsRemoteTunnelErrForward');
    case 'network':
      return tr('settingsRemoteTunnelErrNetwork');
    case 'missing':
    case 'missing-host':
      return tr('settingsRemoteTunnelErrMissing');
    default:
      return tr('settingsRemoteTunnelErrClosed');
  }
}

function switchRow(label: string, help: string, on: boolean, toggle: () => void): HTMLElement {
  const row = document.createElement('div');
  row.className = 'settings-row';
  const copy = document.createElement('div');
  copy.className = 'settings-copy';
  const name = document.createElement('div');
  name.className = 'settings-label';
  name.textContent = label;
  const hint = document.createElement('div');
  hint.className = 'settings-hint';
  hint.textContent = help;
  copy.append(name, hint);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = on ? 'switch on' : 'switch';
  btn.setAttribute('role', 'switch');
  btn.setAttribute('aria-checked', on ? 'true' : 'false');
  const knob = document.createElement('span');
  knob.className = 'knob';
  btn.append(knob);
  btn.addEventListener('click', toggle);
  row.append(copy, btn);
  return row;
}

function portRow(port: number, running: boolean): HTMLElement {
  const row = document.createElement('div');
  row.className = 'settings-row stack';
  const name = document.createElement('div');
  name.className = 'settings-label';
  name.textContent = tr('settingsRemotePort');
  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'settings-field';
  input.dataset.field = 'remotePort';
  input.min = '1024';
  input.max = '65535';
  input.value = String(port);
  input.disabled = running;
  row.append(name, input);
  return row;
}

function bindRow(bind: string, port: number): HTMLElement {
  const row = document.createElement('div');
  row.className = 'settings-hint';
  row.textContent = tr('settingsRemoteBind', { bind, port });
  return row;
}

let customDraft: string | undefined;

function authBlock(remote: typeof ui.state.remote): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'settings-row stack';
  const mode = remote?.codeMode === 'custom' ? 'custom' : 'random';
  const name = document.createElement('div');
  name.className = 'settings-label';
  name.textContent = tr('settingsRemoteAuth');
  const seg = document.createElement('div');
  seg.className = 'seg settings-seg';
  for (const [id, label] of [
    ['random', tr('settingsRemoteAuthRandom')],
    ['custom', tr('settingsRemoteAuthCustom')],
  ] as const) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    if (id === mode) {
      btn.classList.add('on');
    }
    btn.addEventListener('click', () => {
      if (id !== mode) {
        customDraft = undefined;
        post({ type: 'setRemoteAuth', mode: id });
      }
    });
    seg.append(btn);
  }
  const hint = document.createElement('div');
  hint.className = 'settings-hint';
  hint.textContent = tr('settingsRemoteAuthHint');
  wrap.append(name, seg, hint);
  if (mode === 'custom') {
    wrap.append(customSecretRow(remote));
  } else {
    wrap.append(randomCodeRow(remote));
  }
  return wrap;
}

function randomCodeRow(remote: typeof ui.state.remote): HTMLElement {
  const row = document.createElement('div');
  row.className = 'settings-row';
  const copy = document.createElement('div');
  copy.className = 'settings-copy';
  const name = document.createElement('div');
  name.className = 'settings-label';
  name.textContent = tr('settingsRemoteCode');
  const help = document.createElement('div');
  help.className = 'settings-hint';
  help.textContent = tr('settingsRemoteCodeHint');
  copy.append(name);
  const code = remote?.running ? remote.code : '';
  if (code) {
    const value = document.createElement('div');
    value.className = 'settings-label remote-code';
    value.textContent = code;
    copy.append(value);
  }
  copy.append(help);
  row.append(copy);
  if (code) {
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'btn';
    copyBtn.textContent = tr('settingsRemoteCopy');
    copyBtn.addEventListener('click', () => copyText(code));
    const regen = document.createElement('button');
    regen.type = 'button';
    regen.className = 'btn';
    regen.textContent = tr('settingsRemoteRegen');
    regen.addEventListener('click', () => post({ type: 'rotateRemoteCode' }));
    row.append(copyBtn, regen);
  }
  return row;
}

function customSecretRow(remote: typeof ui.state.remote): HTMLElement {
  const row = document.createElement('div');
  row.className = 'settings-row stack';
  const name = document.createElement('div');
  name.className = 'settings-label';
  name.textContent = tr('settingsRemoteAuthCustom');
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'settings-field';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.maxLength = 64;
  input.placeholder = '4–64';
  input.value = customDraft ?? remote?.code ?? '';
  input.addEventListener('input', () => {
    customDraft = input.value;
  });
  const help = document.createElement('div');
  help.className = 'settings-hint';
  help.textContent =
    remote?.running && !remote.code ? tr('settingsRemoteCustomNeed') : tr('settingsRemoteCustomHint');
  if (remote?.running && !remote.code) {
    help.classList.add('warn');
  }
  const actions = document.createElement('div');
  actions.className = 'settings-row';
  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'btn';
  save.textContent = tr('settingsRemoteCustomSave');
  save.addEventListener('click', () => {
    customDraft = input.value;
    post({ type: 'setRemoteAuth', mode: 'custom', secret: input.value });
  });
  actions.append(save);
  const live = remote?.code ?? '';
  if (live) {
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'btn';
    copyBtn.textContent = tr('settingsRemoteCopy');
    copyBtn.addEventListener('click', () => copyText(live));
    actions.append(copyBtn);
  }
  row.append(name, input, actions, help);
  return row;
}

function urlBlock(urls: string[]): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'settings-row stack';
  const name = document.createElement('div');
  name.className = 'settings-label';
  name.textContent = tr('settingsRemoteUrls');
  wrap.append(name);
  for (const url of urls) {
    const line = document.createElement('div');
    line.className = 'settings-row';
    const text = document.createElement('div');
    text.className = 'settings-hint';
    text.textContent = url;
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'btn';
    copy.textContent = tr('settingsRemoteCopy');
    copy.addEventListener('click', () => copyText(url));
    line.append(text, copy);
    wrap.append(line);
  }
  return wrap;
}

function clientsRow(n: number): HTMLElement {
  const row = document.createElement('div');
  row.className = 'settings-hint';
  row.textContent = tr('settingsRemoteClients', { n });
  return row;
}

function currentPort(): number {
  return Number(document.querySelector<HTMLInputElement>('[data-field="remotePort"]')?.value);
}

function lanOnly(urls: string[], publicUrl?: string): string[] {
  if (!publicUrl) {
    return urls;
  }
  return urls.filter((url) => url !== publicUrl);
}
