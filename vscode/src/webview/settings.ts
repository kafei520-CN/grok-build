import { DEFAULT_SETTINGS, type GrokSettings } from '../types';
import { post, tr, ui } from './app';
import { iconButton } from './dom';
import { iconBack, iconClose, iconStar } from './icons';
import { apisNavRow, mountApiFormBody, mountApisBody } from './settingsApi';
import { mountRulesBody, rulesNavRow } from './settingsRules';
import { mountSkillsBody, skillsNavRow } from './settingsSkills';
import { mcpsNavRow, mountMcpsBody } from './settingsMcps';
import { agentsNavRow, mountAgentsBody } from './settingsAgents';
import { extNavRow, mountExtBody } from './settingsExt';
import { memoryNavRow, mountMemoryBody } from './settingsMemory';
import { mountWorktreesBody, worktreesNavRow } from './settingsWorktrees';
import { mountThemeBody, themeNavRow } from './settingsTheme';

let paintedKey: string | undefined;

export function patchSettings(parent: HTMLElement): void {
  const existing = document.getElementById('grok-settings');
  if (!ui.state.settingsOpen) {
    existing?.remove();
    paintedKey = undefined;
    return;
  }
  const key = [
    ui.state.locale ?? 'en',
    ui.state.settingsPage ?? 'main',
    ui.state.apiEditId ?? '',
    (ui.state.rules ?? []).map((row) => `${row.id}:${row.enabled}`).join('|'),
    (ui.state.skills ?? []).map((row) => `${row.id}:${row.enabled}`).join('|'),
    (ui.state.apis ?? []).map((row) => `${row.id}:${row.enabled ? '1' : '0'}`).join('|'),
    (ui.state.mcps ?? []).map((row) => `${row.id}:${row.enabled}`).join('|'),
    (ui.state.agents ?? []).map((row) => `${row.id}:${row.enabled}`).join('|'),
    (ui.state.personas ?? []).map((row) => `${row.id}:${row.enabled}`).join('|'),
    ui.state.agentProfile ?? '',
    ui.agentsTab,
    ui.state.extTab ?? '',
    (ui.state.worktrees ?? []).map((row) => row.id).join('|'),
    (ui.state.plugins ?? []).map((row) => `${row.id}:${row.enabled}`).join('|'),
    (ui.state.hooks ?? []).map((row) => `${row.id}:${row.enabled}`).join('|'),
    (ui.state.marketplace ?? []).map((row) => row.id).join('|'),
    (ui.state.workflows ?? []).map((row) => row.id).join('|'),
    (ui.state.memoryFiles ?? []).map((row) => row.id).join('|'),
    `${ui.state.theme?.primary ?? ''}|${ui.state.theme?.secondary ?? ''}|${ui.state.theme?.background ?? ''}`,
  ].join(':');
  if (!existing || paintedKey !== key) {
    existing?.remove();
    parent.append(mountSettings());
    paintedKey = key;
    return;
  }
  syncSettings(existing);
}

function mountSettings(): HTMLElement {
  const el = document.createElement('section');
  el.id = 'grok-settings';
  el.className = 'settings';
  const head = document.createElement('header');
  head.className = 'settings-head';
  const brand = document.createElement('div');
  brand.className = 'brand';
  const mark = document.createElement('span');
  mark.className = 'mark';
  mark.innerHTML = iconStar();
  const title = document.createElement('span');
  const page = ui.state.settingsPage ?? 'main';
  title.textContent = settingsTitle(page);
  brand.append(mark, title);
  const tools = document.createElement('div');
  tools.className = 'settings-head-tools';
  if (
    page === 'rules' ||
    page === 'skills' ||
    page === 'apis' ||
    page === 'api-form' ||
    page === 'theme' ||
    page === 'mcps' ||
    page === 'agents' ||
    page === 'worktrees' ||
    page === 'extensions' ||
    page === 'memory'
  ) {
    tools.append(
      iconButton(tr('settingsRulesBack'), iconBack(), () =>
        post({
          type:
            page === 'skills'
              ? 'closeSkills'
              : page === 'api-form'
                ? 'closeApiForm'
                : page === 'apis'
                ? 'closeApis'
                : page === 'theme'
                  ? 'closeTheme'
                  : page === 'mcps'
                    ? 'closeMcps'
                    : page === 'agents'
                      ? 'closeAgents'
                      : page === 'worktrees'
                        ? 'closeWorktrees'
                        : page === 'extensions'
                          ? 'closeExt'
                          : page === 'memory'
                            ? 'closeMemory'
                            : 'closeRules',
        }),
      ),
    );
  }
  tools.append(iconButton(tr('settingsClose'), iconClose(), () => post({ type: 'closeSettings' })));
  head.append(brand, tools);
  if (page === 'rules') {
    el.append(head, mountRulesBody());
    return el;
  }
  if (page === 'skills') {
    el.append(head, mountSkillsBody());
    return el;
  }
  if (page === 'apis') {
    el.append(head, mountApisBody());
    return el;
  }
  if (page === 'api-form') {
    el.append(head, mountApiFormBody());
    return el;
  }
  if (page === 'theme') {
    el.append(head, mountThemeBody());
    return el;
  }
  if (page === 'mcps') {
    el.append(head, mountMcpsBody());
    return el;
  }
  if (page === 'agents') {
    el.append(head, mountAgentsBody());
    return el;
  }
  if (page === 'worktrees') {
    el.append(head, mountWorktreesBody());
    return el;
  }
  if (page === 'extensions') {
    el.append(head, mountExtBody());
    return el;
  }
  if (page === 'memory') {
    el.append(head, mountMemoryBody());
    return el;
  }
  const body = document.createElement('div');
  body.className = 'settings-body';
  body.append(
    section(tr('settingsUi'), [
      themeNavRow(),
      localeRow(),
      toggleRow(
        'compactMode',
        tr('settingsCompact'),
        tr('settingsCompactHint'),
        () => Boolean(ui.state.compactMode),
        () => post({ type: 'toggleFlag', flag: 'compactMode' }),
      ),
      toggleRow(
        'multiline',
        tr('settingsMultiline'),
        tr('settingsMultilineHint'),
        () => Boolean(ui.state.multiline),
        () => post({ type: 'toggleFlag', flag: 'multiline' }),
      ),
      toggleRow(
        'timestamps',
        tr('settingsTimestamps'),
        tr('settingsTimestampsHint'),
        () => Boolean(ui.state.timestamps),
        () => post({ type: 'toggleFlag', flag: 'timestamps' }),
      ),
    ]),
    section(tr('settingsAgent'), [
      permissionRow(),
      toggleRow(
        'alwaysApprove',
        tr('settingsAlways'),
        tr('settingsAlwaysHint'),
        () => Boolean(current().alwaysApprove),
        () => post({ type: 'updateSetting', key: 'alwaysApprove', value: !current().alwaysApprove }),
      ),
      toggleRow(
        'includeSelectionOnSend',
        tr('settingsSelection'),
        tr('settingsSelectionHint'),
        () => Boolean(current().includeSelectionOnSend),
        () =>
          post({
            type: 'updateSetting',
            key: 'includeSelectionOnSend',
            value: !current().includeSelectionOnSend,
          }),
      ),
      rulesNavRow(),
      skillsNavRow(),
      agentsNavRow(),
      worktreesNavRow(),
      extNavRow(),
      memoryNavRow(),
      mcpsNavRow(),
      apisNavRow(),
    ]),
    section(tr('settingsCli'), [
      textRow(
        'cliPath',
        tr('settingsCliPath'),
        tr('settingsCliPathHint'),
        () => current().cliPath,
      ),
      toggleRow(
        'preferWorkspaceBinary',
        tr('settingsPreferBin'),
        tr('settingsPreferBinHint'),
        () => Boolean(current().preferWorkspaceBinary),
        () =>
          post({
            type: 'updateSetting',
            key: 'preferWorkspaceBinary',
            value: !current().preferWorkspaceBinary,
          }),
      ),
      textRow(
        'minCliVersion',
        tr('settingsMinVer'),
        tr('settingsMinVerHint'),
        () => current().minCliVersion,
      ),
    ]),
    accountCard(),
  );
  el.append(head, body);
  syncSettings(el);
  return el;
}

function settingsTitle(page: string): string {
  if (page === 'rules') {
    return tr('settingsRules');
  }
  if (page === 'skills') {
    return tr('settingsSkills');
  }
  if (page === 'apis') {
    return tr('settingsApis');
  }
  if (page === 'api-form') {
    return ui.state.apiEditId ? tr('settingsApisEdit') : tr('settingsApisAdd');
  }
  if (page === 'theme') {
    return tr('settingsTheme');
  }
  if (page === 'mcps') {
    return tr('settingsMcps');
  }
  if (page === 'agents') {
    return tr('settingsAgents');
  }
  if (page === 'worktrees') {
    return tr('settingsWorktrees');
  }
  if (page === 'extensions') {
    return tr('settingsExt');
  }
  if (page === 'memory') {
    return tr('settingsMemory');
  }
  return tr('settingsTitle');
}

function current(): GrokSettings {
  return ui.state.settings ?? DEFAULT_SETTINGS;
}

function section(title: string, rows: HTMLElement[]): HTMLElement {
  const wrap = document.createElement('section');
  wrap.className = 'settings-block';
  const kicker = document.createElement('div');
  kicker.className = 'settings-kicker';
  kicker.textContent = title;
  const card = document.createElement('div');
  card.className = 'settings-card';
  for (const row of rows) {
    card.append(row);
  }
  wrap.append(kicker, card);
  return wrap;
}

function localeRow(): HTMLElement {
  return choiceRow(
    'locale',
    tr('settingsLang'),
    [
      ['auto', tr('settingsLangAuto')],
      ['en', tr('settingsLangEn')],
      ['zh-CN', tr('settingsLangZh')],
    ],
    () => current().locale,
    (value) => post({ type: 'updateSetting', key: 'locale', value }),
  );
}

function permissionRow(): HTMLElement {
  return choiceRow(
    'permissionMode',
    tr('settingsPermission'),
    [
      ['ask', tr('settingsPermissionAsk')],
      ['acceptEdits', tr('settingsPermissionEdits')],
      ['auto', tr('settingsPermissionAuto')],
    ],
    () => current().permissionMode,
    (value) => post({ type: 'updateSetting', key: 'permissionMode', value }),
  );
}

function choiceRow(
  key: string,
  label: string,
  options: Array<[string, string]>,
  read: () => string,
  pick: (value: string) => void,
): HTMLElement {
  const row = document.createElement('div');
  row.className = 'settings-row stack';
  row.dataset.key = key;
  const name = document.createElement('div');
  name.className = 'settings-label';
  name.textContent = label;
  const seg = document.createElement('div');
  seg.className = 'seg settings-seg';
  for (const [id, text] of options) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.id = id;
    btn.textContent = text;
    btn.addEventListener('click', () => {
      if (read() !== id) {
        pick(id);
      }
    });
    seg.append(btn);
  }
  row.append(name, seg);
  return row;
}

function toggleRow(
  key: string,
  label: string,
  hint: string,
  read: () => boolean,
  toggle: () => void,
): HTMLElement {
  const row = document.createElement('div');
  row.className = 'settings-row';
  row.dataset.key = key;
  const copy = document.createElement('div');
  copy.className = 'settings-copy';
  const name = document.createElement('div');
  name.className = 'settings-label';
  name.textContent = label;
  const help = document.createElement('div');
  help.className = 'settings-hint';
  help.textContent = hint;
  copy.append(name, help);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'switch';
  btn.setAttribute('role', 'switch');
  const knob = document.createElement('span');
  knob.className = 'knob';
  btn.append(knob);
  btn.addEventListener('click', toggle);
  row.append(copy, btn);
  return row;
}

function textRow(key: keyof GrokSettings, label: string, hint: string, read: () => string): HTMLElement {
  const row = document.createElement('div');
  row.className = 'settings-row stack';
  row.dataset.key = key;
  const name = document.createElement('div');
  name.className = 'settings-label';
  name.textContent = label;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'settings-field';
  input.dataset.field = key;
  input.value = read();
  input.addEventListener('change', () => {
    post({ type: 'updateSetting', key, value: input.value });
  });
  const help = document.createElement('div');
  help.className = 'settings-hint';
  help.dataset.hint = key;
  help.textContent = hint;
  row.append(name, input, help);
  return row;
}

function accountCard(): HTMLElement {
  const wrap = document.createElement('section');
  wrap.className = 'settings-block';
  const kicker = document.createElement('div');
  kicker.className = 'settings-kicker';
  kicker.textContent = tr('settingsAccount');
  const card = document.createElement('div');
  card.className = 'settings-card';
  const status = document.createElement('div');
  status.className = 'settings-row stack';
  status.dataset.key = 'account';
  const label = document.createElement('div');
  label.className = 'settings-label';
  label.dataset.account = 'label';
  const hint = document.createElement('div');
  hint.className = 'settings-hint';
  hint.dataset.account = 'hint';
  status.append(label, hint);
  const actions = document.createElement('div');
  actions.className = 'settings-actions';
  const login = document.createElement('button');
  login.type = 'button';
  login.className = 'btn primary';
  login.dataset.account = 'login';
  login.textContent = tr('loginGrok');
  login.addEventListener('click', () => post({ type: 'login' }));
  const logout = document.createElement('button');
  logout.type = 'button';
  logout.className = 'btn';
  logout.dataset.account = 'logout';
  logout.textContent = tr('settingsLogout');
  logout.addEventListener('click', () => post({ type: 'logout' }));
  const restart = document.createElement('button');
  restart.type = 'button';
  restart.className = 'btn';
  restart.textContent = tr('settingsRestart');
  restart.addEventListener('click', () => post({ type: 'restart' }));
  const restartHint = document.createElement('div');
  restartHint.className = 'settings-hint';
  restartHint.textContent = tr('settingsRestartHint');
  actions.append(login, logout, restart);
  card.append(status, actions, restartHint);
  wrap.append(kicker, card);
  return wrap;
}

function syncSettings(root: HTMLElement): void {
  const settings = current();
  syncSwitch(root, 'compactMode', Boolean(ui.state.compactMode));
  syncSwitch(root, 'multiline', Boolean(ui.state.multiline));
  syncSwitch(root, 'timestamps', Boolean(ui.state.timestamps));
  syncSwitch(root, 'alwaysApprove', settings.alwaysApprove);
  syncSwitch(root, 'includeSelectionOnSend', settings.includeSelectionOnSend);
  syncSwitch(root, 'preferWorkspaceBinary', settings.preferWorkspaceBinary);
  syncChoice(root, 'locale', settings.locale);
  syncChoice(root, 'permissionMode', settings.permissionMode);
  syncField(root, 'cliPath', settings.cliPath);
  syncField(root, 'minCliVersion', settings.minCliVersion);
  const pathHint = root.querySelector('[data-hint="cliPath"]');
  if (pathHint) {
    pathHint.textContent = ui.state.cliPath
      ? `${tr('settingsCliPathHint')} ${tr('settingsCliCurrent', { path: ui.state.cliPath })}`
      : tr('settingsCliMissing');
  }
  const verHint = root.querySelector('[data-hint="minCliVersion"]');
  if (verHint) {
    verHint.textContent = tr('settingsMinVerHint');
  }
  const account = ui.state.account;
  const label = root.querySelector('[data-account="label"]');
  const hint = root.querySelector('[data-account="hint"]');
  const login = root.querySelector('[data-account="login"]') as HTMLButtonElement | null;
  const logout = root.querySelector('[data-account="logout"]') as HTMLButtonElement | null;
  const signedIn = Boolean(account?.email || account?.methodId);
  if (label) {
    label.textContent = signedIn
      ? tr('settingsSignedIn', {
          name: account?.email || account?.firstName || account?.methodId || 'Grok',
        })
      : tr('settingsSignedOut');
  }
  if (hint) {
    hint.textContent = ui.state.agentVersion
      ? tr('settingsAgentVer', { version: ui.state.agentVersion })
      : '';
  }
  if (login) {
    login.hidden = signedIn;
  }
  if (logout) {
    logout.hidden = !signedIn;
  }
}

function syncSwitch(root: HTMLElement, key: string, on: boolean): void {
  const btn = root.querySelector(`[data-key="${key}"] .switch`) as HTMLButtonElement | null;
  if (!btn) {
    return;
  }
  btn.classList.toggle('on', on);
  btn.setAttribute('aria-checked', on ? 'true' : 'false');
}

function syncChoice(root: HTMLElement, key: string, value: string): void {
  for (const btn of root.querySelectorAll(`[data-key="${key}"] .seg button`)) {
    btn.classList.toggle('on', (btn as HTMLElement).dataset.id === value);
  }
}

function syncField(root: HTMLElement, key: string, value: string): void {
  const input = root.querySelector(`[data-field="${key}"]`) as HTMLInputElement | null;
  if (!input || document.activeElement === input) {
    return;
  }
  if (input.value !== value) {
    input.value = value;
  }
}
