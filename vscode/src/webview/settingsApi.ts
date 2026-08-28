import type { ApiBackend, ApiEndpoint } from '../types';
import { post, tr, ui } from './app';
import { iconChevron } from './icons';

let editingId: string | undefined;

export function apiEditStamp(): string {
  return editingId ?? '';
}

export function apisNavRow(): HTMLElement {
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'settings-row settings-link';
  const copy = document.createElement('div');
  copy.className = 'settings-copy';
  const name = document.createElement('div');
  name.className = 'settings-label';
  name.textContent = tr('settingsApis');
  const hint = document.createElement('div');
  hint.className = 'settings-hint';
  const n = ui.state.apis?.length ?? 0;
  hint.textContent = n > 0 ? tr('settingsApisCount', { n }) : tr('settingsApisHint');
  copy.append(name, hint);
  const chevron = document.createElement('span');
  chevron.className = 'settings-chevron';
  chevron.innerHTML = iconChevron();
  row.append(copy, chevron);
  row.addEventListener('click', () => post({ type: 'openApis' }));
  return row;
}

export function mountApisBody(): HTMLElement {
  const body = document.createElement('div');
  body.className = 'settings-body';
  const hint = document.createElement('div');
  hint.className = 'settings-hint';
  hint.textContent = tr('settingsApisHint');
  const form = endpointForm();
  const card = document.createElement('div');
  card.className = 'settings-card';
  const apis = ui.state.apis ?? [];
  if (apis.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'settings-row stack';
    empty.textContent = tr('settingsApisEmpty');
    card.append(empty);
  } else {
    for (const item of apis) {
      card.append(endpointRow(item));
    }
  }
  body.append(hint, form, card);
  return body;
}

function endpointForm(): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'settings-card api-form';
  const title = document.createElement('div');
  title.className = 'settings-label';
  title.dataset.apiTitle = '1';
  title.textContent = editingId ? tr('settingsApisEdit') : tr('settingsApisAdd');
  const name = field(tr('settingsApisName'), 'text', 'api-name');
  const model = field(tr('settingsApisModel'), 'text', 'api-model');
  const url = field(tr('settingsApisUrl'), 'text', 'api-url');
  url.querySelector('input')!.placeholder = 'https://api.example.com/v1';
  const urlHint = document.createElement('div');
  urlHint.className = 'settings-hint';
  urlHint.textContent = tr('settingsApisUrlHint');
  url.append(urlHint);
  const key = field(tr('settingsApisKey'), 'password', 'api-key');
  key.querySelector('input')!.placeholder = editingId ? tr('settingsApisKeyKeep') : '';
  const proto = document.createElement('div');
  proto.className = 'settings-row stack';
  const protoLabel = document.createElement('div');
  protoLabel.className = 'settings-label';
  protoLabel.textContent = tr('settingsApisProtocol');
  const seg = document.createElement('div');
  seg.className = 'seg settings-seg';
  seg.dataset.apiBackend = 'chat_completions';
  const backends: Array<[ApiBackend, string]> = [
    ['chat_completions', tr('settingsApisChat')],
    ['responses', tr('settingsApisResponses')],
    ['messages', tr('settingsApisMessages')],
  ];
  for (const [id, label] of backends) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.id = id;
    btn.textContent = label;
    if (id === 'chat_completions') {
      btn.classList.add('on');
    }
    btn.addEventListener('click', () => {
      seg.dataset.apiBackend = id;
      for (const child of [...seg.children]) {
        child.classList.toggle('on', (child as HTMLElement).dataset.id === id);
      }
    });
    seg.append(btn);
  }
  proto.append(protoLabel, seg);
  const actions = document.createElement('div');
  actions.className = 'settings-actions';
  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'btn primary';
  save.textContent = tr('settingsApisSave');
  save.addEventListener('click', () => {
    const nameVal = (name.querySelector('input') as HTMLInputElement).value.trim();
    const modelVal = (model.querySelector('input') as HTMLInputElement).value.trim();
    const urlVal = (url.querySelector('input') as HTMLInputElement).value.trim();
    const keyVal = (key.querySelector('input') as HTMLInputElement).value;
    if (!nameVal || !modelVal || !urlVal) {
      return;
    }
    post({
      type: 'saveApi',
      id: editingId,
      name: nameVal,
      model: modelVal,
      baseUrl: urlVal,
      backend: (seg.dataset.apiBackend as ApiBackend) || 'chat_completions',
      apiKey: keyVal.trim() ? keyVal : undefined,
    });
    editingId = undefined;
  });
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'btn';
  cancel.textContent = tr('settingsApisCancel');
  cancel.addEventListener('click', () => {
    editingId = undefined;
    post({ type: 'openApis' });
  });
  actions.append(save, cancel);
  wrap.append(title, name, model, proto, url, key, actions);
  if (editingId) {
    const current = (ui.state.apis ?? []).find((item) => item.id === editingId);
    if (current) {
      (name.querySelector('input') as HTMLInputElement).value = current.name;
      (model.querySelector('input') as HTMLInputElement).value = current.model;
      (url.querySelector('input') as HTMLInputElement).value = current.baseUrl;
      seg.dataset.apiBackend = current.backend;
      for (const child of [...seg.children]) {
        child.classList.toggle('on', (child as HTMLElement).dataset.id === current.backend);
      }
    }
  }
  return wrap;
}

function endpointRow(item: ApiEndpoint): HTMLElement {
  const row = document.createElement('div');
  row.className = 'settings-row rule-row';
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'settings-copy rule-open';
  const name = document.createElement('div');
  name.className = 'settings-label';
  name.textContent = item.name;
  const hint = document.createElement('div');
  hint.className = 'settings-hint';
  const proto =
    item.backend === 'messages'
      ? tr('settingsApisMessages')
      : item.backend === 'responses'
        ? tr('settingsApisResponses')
        : tr('settingsApisChat');
  hint.textContent = `${proto} · ${item.model} · ${item.baseUrl}${item.hasKey ? ` · ${tr('settingsApisHasKey')}` : ''}`;
  copy.append(name, hint);
  copy.addEventListener('click', () => {
    editingId = item.id;
    post({ type: 'openApis' });
  });
  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'btn';
  del.textContent = tr('settingsApisDelete');
  del.addEventListener('click', (event) => {
    event.stopPropagation();
    post({ type: 'deleteApi', id: item.id });
  });
  row.append(copy, del);
  return row;
}

function field(label: string, type: string, id: string): HTMLElement {
  const row = document.createElement('div');
  row.className = 'settings-row stack';
  const name = document.createElement('div');
  name.className = 'settings-label';
  name.textContent = label;
  const input = document.createElement('input');
  input.type = type;
  input.className = 'settings-field';
  input.dataset.apiField = id;
  row.append(name, input);
  return row;
}
