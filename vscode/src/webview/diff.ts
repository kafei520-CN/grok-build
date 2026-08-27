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
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.innerHTML = `<span class="mark">${iconStar()}</span><p>${escapeHtml(tr('reviewEmpty'))}</p>`;
    root.append(empty);
    return;
  }
  const stage = document.createElement('div');
  stage.className = 'stage';
  for (const file of files) {
    stage.append(fileSection(file));
  }
  root.append(stage);
}

function toolbar(count: number, added: number, removed: number): HTMLElement {
  const el = document.createElement('header');
  el.className = 'toolbar';
  const brand = document.createElement('div');
  brand.className = 'brand';
  brand.innerHTML = `<span class="mark">${iconStar()}</span><strong>Grok Diff</strong>`;
  const summary = document.createElement('div');
  summary.className = 'summary';
  summary.innerHTML = `<span class="pill">${escapeHtml(tr('diffFiles', { n: count }))}</span><span class="pill add">+${added}</span><span class="pill del">−${removed}</span>`;
  const actions = document.createElement('div');
  actions.className = 'actions';
  const modes = document.createElement('div');
  modes.className = 'modes';
  modes.append(
    modeBtn('split', tr('diffSplit'), !unified),
    modeBtn('unified', tr('diffUnified'), unified),
  );
  const revert = document.createElement('button');
  revert.type = 'button';
  revert.className = 'ghost-btn';
  revert.textContent = tr('undo');
  revert.addEventListener('click', () => vscode.postMessage({ type: 'revert' }));
  actions.append(modes, revert);
  el.append(brand, summary, actions);
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
  const head = document.createElement('div');
  head.className = 'file-head';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'file-toggle';
  const parts = splitPath(file.path);
  toggle.innerHTML = `<span class="chevron">${iconChevron()}</span><span class="file-name">${escapeHtml(parts.name)}</span>${
    parts.dir ? `<span class="file-dir">${escapeHtml(parts.dir)}</span>` : ''
  }`;
  const stats = document.createElement('span');
  stats.className = 'file-stats';
  const tag = file.created ? tr('diffCreated') : file.deleted ? tr('diffDeleted') : '';
  stats.innerHTML = `${tag ? `<em class="tag ${file.created ? 'new' : 'gone'}">${escapeHtml(tag)}</em>` : ''}<span class="add">+${file.added}</span><span class="del">−${file.removed}</span>`;
  const open = document.createElement('button');
  open.type = 'button';
  open.className = 'open-btn';
  open.textContent = tr('diffOpen');
  open.addEventListener('click', () => vscode.postMessage({ type: 'openFile', path: file.absPath }));
  head.append(toggle, stats, open);
  const pane = document.createElement('div');
  pane.className = 'file-pane';
  if (!unified) {
    const cols = document.createElement('div');
    cols.className = 'col-heads';
    cols.innerHTML = `<span>${escapeHtml(tr('diffBefore'))}</span><span>${escapeHtml(tr('diffAfter'))}</span>`;
    pane.append(cols);
  }
  const stage = document.createElement('div');
  stage.className = 'file-stage';
  const rail = document.createElement('div');
  rail.className = 'rail';
  const body = document.createElement('div');
  body.className = 'file-body';
  for (const [index, hunk] of file.hunks.entries()) {
    const hunkNode = hunkEl(file.absPath, index, hunk);
    hunkNode.dataset.hunk = String(index);
    body.append(hunkNode);
    rail.append(railDot(index, hunk, hunkNode));
  }
  stage.append(rail, body);
  pane.append(stage);
  toggle.addEventListener('click', () => {
    el.classList.toggle('closed');
  });
  el.append(head, pane);
  return el;
}

function railDot(
  index: number,
  hunk: DiffHunk,
  target: HTMLElement,
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `dot ${hunkTone(hunk)}`;
  btn.title = hunk.kind === 'gap' ? tr('diffGap', { n: hunk.count }) : `#${index + 1}`;
  btn.addEventListener('click', () => {
    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
  return btn;
}

function hunkTone(hunk: DiffHunk): string {
  if (hunk.kind === 'gap') {
    return 'quiet';
  }
  let add = false;
  let del = false;
  for (const row of hunk.rows) {
    if (row.type === 'add' || row.type === 'replace') {
      add = true;
    }
    if (row.type === 'del' || row.type === 'replace') {
      del = true;
    }
  }
  if (add && del) {
    return 'mix';
  }
  if (add) {
    return 'add';
  }
  if (del) {
    return 'del';
  }
  return 'quiet';
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

function splitPath(filePath: string): { dir: string; name: string } {
  const norm = filePath.replace(/\\/g, '/');
  const at = norm.lastIndexOf('/');
  if (at < 0) {
    return { dir: '', name: norm };
  }
  return { dir: norm.slice(0, at), name: norm.slice(at + 1) };
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

function iconChevron(): string {
  return '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 6l4 4 4-4"/></svg>';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

vscode.postMessage({ type: 'ready' });
