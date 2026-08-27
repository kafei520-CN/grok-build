import type { DiffHunk, DiffRow, FileDiff } from '../diff';
import { t, type StringKey, type UiLocale } from '../i18n';

type Payload = { locale: UiLocale; files: FileDiff[]; messageId?: string };

const vscode = (
  window as unknown as {
    acquireVsCodeApi: () => {
      postMessage(message: unknown): void;
    };
  }
).acquireVsCodeApi();

const root = document.getElementById('app') ?? document.body;
let payload: Payload = { locale: 'en', files: [] };
let unified = false;
const openGaps = new Set<string>();

window.addEventListener('message', (event: MessageEvent<{ type: string; payload: Payload }>) => {
  if (event.data?.type === 'diff') {
    payload = event.data.payload;
    render();
  }
});

function loc(): UiLocale {
  return payload.locale === 'zh-CN' ? 'zh-CN' : 'en';
}

function tr(key: StringKey, vars?: Record<string, string | number>): string {
  return t(loc(), key, vars);
}

function render(): void {
  const files = payload.files ?? [];
  const added = files.reduce((sum, file) => sum + file.added, 0);
  const removed = files.reduce((sum, file) => sum + file.removed, 0);
  root.innerHTML = '';
  root.append(toolbar(files.length, added, removed));
  if (files.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = tr('reviewEmpty');
    root.append(empty);
    return;
  }
  for (const file of files) {
    root.append(fileSection(file));
  }
}

function toolbar(count: number, added: number, removed: number): HTMLElement {
  const el = document.createElement('header');
  el.className = 'toolbar';
  const brand = document.createElement('div');
  brand.className = 'brand';
  brand.innerHTML = `<span class="mark">${iconStar()}</span><strong>Grok Diff</strong>`;
  const summary = document.createElement('div');
  summary.className = 'summary';
  summary.innerHTML = `${escapeHtml(tr('diffFiles', { n: count }))} <span class="add">+${added}</span> <span class="del">−${removed}</span>`;
  const modes = document.createElement('div');
  modes.className = 'modes';
  modes.append(
    modeBtn('split', tr('diffSplit'), !unified),
    modeBtn('unified', tr('diffUnified'), unified),
  );
  const revert = document.createElement('button');
  revert.type = 'button';
  revert.className = 'text-btn';
  revert.textContent = tr('undo');
  revert.addEventListener('click', () => vscode.postMessage({ type: 'revert' }));
  el.append(brand, summary, modes, revert);
  return el;
}

function modeBtn(id: string, label: string, on: boolean): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = on ? 'mode on' : 'mode';
  btn.textContent = label;
  btn.addEventListener('click', () => {
    unified = id === 'unified';
    render();
  });
  return btn;
}

function fileSection(file: FileDiff): HTMLElement {
  const el = document.createElement('section');
  el.className = 'file';
  const head = document.createElement('button');
  head.type = 'button';
  head.className = 'file-head';
  const title = document.createElement('span');
  title.className = 'file-path';
  title.textContent = file.path;
  const stats = document.createElement('span');
  stats.className = 'file-stats';
  const tag = file.created ? tr('diffCreated') : file.deleted ? tr('diffDeleted') : '';
  stats.innerHTML = `${tag ? `<em>${escapeHtml(tag)}</em> ` : ''}<span class="add">+${file.added}</span> <span class="del">−${file.removed}</span>`;
  const open = document.createElement('button');
  open.type = 'button';
  open.className = 'open-btn';
  open.textContent = tr('diffOpen');
  open.addEventListener('click', (event) => {
    event.stopPropagation();
    vscode.postMessage({ type: 'openFile', path: file.absPath });
  });
  head.append(title, stats, open);
  let bodyOpen = true;
  const body = document.createElement('div');
  body.className = 'file-body';
  for (const [index, hunk] of file.hunks.entries()) {
    body.append(hunkEl(file.absPath, index, hunk));
  }
  head.addEventListener('click', () => {
    bodyOpen = !bodyOpen;
    body.hidden = !bodyOpen;
    el.classList.toggle('closed', !bodyOpen);
  });
  el.append(head, body);
  return el;
}

function hunkEl(fileId: string, index: number, hunk: DiffHunk): HTMLElement {
  if (hunk.kind === 'gap') {
    const id = `${fileId}:${index}`;
    const wrap = document.createElement('div');
    wrap.className = 'gap';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gap-btn';
    btn.innerHTML = `<span class="mark">${iconStar()}</span>${escapeHtml(tr('diffGap', { n: hunk.count }))}`;
    const inner = document.createElement('div');
    inner.hidden = !openGaps.has(id);
    inner.append(rowsEl(hunk.rows));
    btn.addEventListener('click', () => {
      if (openGaps.has(id)) {
        openGaps.delete(id);
      } else {
        openGaps.add(id);
      }
      inner.hidden = !openGaps.has(id);
      wrap.classList.toggle('open', openGaps.has(id));
    });
    wrap.append(btn, inner);
    return wrap;
  }
  return rowsEl(hunk.rows);
}

function rowsEl(rows: DiffRow[]): HTMLElement {
  const el = document.createElement('div');
  el.className = unified ? 'rows unified' : 'rows split';
  for (const row of rows) {
    if (unified) {
      el.append(unifiedRow(row));
    } else {
      el.append(splitRow(row));
    }
  }
  return el;
}

function splitRow(row: DiffRow): HTMLElement {
  const el = document.createElement('div');
  el.className = `pair ${row.type}`;
  const leftKind = row.type === 'add' ? 'ghost' : row.type === 'replace' ? 'del' : row.type;
  const rightKind = row.type === 'del' ? 'ghost' : row.type === 'replace' ? 'add' : row.type;
  el.append(
    cell('before', leftKind, row.beforeNo, row.beforeText),
    cell('after', rightKind, row.afterNo, row.afterText),
  );
  return el;
}

function unifiedRow(row: DiffRow): HTMLElement {
  if (row.type === 'replace') {
    const wrap = document.createElement('div');
    wrap.append(
      unifiedLine('del', row.beforeNo, row.beforeText),
      unifiedLine('add', row.afterNo, row.afterText),
    );
    return wrap;
  }
  return unifiedLine(row.type, row.type === 'add' ? row.afterNo : row.beforeNo, row.type === 'add' ? row.afterText : row.beforeText);
}

function unifiedLine(
  type: DiffRow['type'],
  no: number | undefined,
  text: string | undefined,
): HTMLElement {
  const el = document.createElement('div');
  el.className = `uni ${type}`;
  const sign = type === 'add' ? '+' : type === 'del' ? '−' : '·';
  el.innerHTML = `<span class="no">${no ?? ''}</span><span class="sign">${sign}</span><pre>${escapeHtml(text ?? '')}</pre>`;
  return el;
}

function cell(side: string, kind: string, no: number | undefined, text: string | undefined): HTMLElement {
  const el = document.createElement('div');
  el.className = `cell ${side} ${kind}`;
  const num = document.createElement('span');
  num.className = 'no';
  num.textContent = no ? String(no) : '';
  const pre = document.createElement('pre');
  pre.textContent = text ?? '';
  el.append(num, pre);
  return el;
}

function iconStar(): string {
  return '<svg viewBox="0 0 24 24" width="12" height="12"><path fill="currentColor" d="M12 1.1 14.35 9.65 22.9 12 14.35 14.35 12 22.9 9.65 14.35 1.1 12 9.65 9.65z"/></svg>';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

vscode.postMessage({ type: 'ready' });
