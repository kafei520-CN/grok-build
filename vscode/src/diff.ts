export type DiffKind = 'equal' | 'add' | 'del' | 'replace';

export interface DiffOp {
  type: DiffKind;
  value: string;
}

export interface DiffRow {
  type: DiffKind;
  beforeNo?: number;
  afterNo?: number;
  beforeText?: string;
  afterText?: string;
}

export interface DiffGap {
  kind: 'gap';
  count: number;
  rows: DiffRow[];
}

export interface DiffBlock {
  kind: 'block';
  rows: DiffRow[];
}

export type DiffHunk = DiffGap | DiffBlock;

export interface FileDiff {
  path: string;
  absPath: string;
  added: number;
  removed: number;
  created: boolean;
  deleted: boolean;
  hunks: DiffHunk[];
}

const DP_LIMIT = 2_000_000;
const CONTEXT = 2;

export function splitLines(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (normalized === '') {
    return [];
  }
  return normalized.split('\n');
}

export function diffOps(before: string[], after: string[]): DiffOp[] {
  const n = before.length;
  const m = after.length;
  if (n === 0) {
    return after.map((value) => ({ type: 'add', value }));
  }
  if (m === 0) {
    return before.map((value) => ({ type: 'del', value }));
  }
  if (n * m > DP_LIMIT) {
    return [
      ...before.map((value) => ({ type: 'del' as const, value })),
      ...after.map((value) => ({ type: 'add' as const, value })),
    ];
  }
  const dp: Int16Array[] = Array.from({ length: n + 1 }, () => new Int16Array(m + 1));
  for (let i = n - 1; i >= 0; i -= 1) {
    const row = dp[i];
    const next = dp[i + 1];
    for (let j = m - 1; j >= 0; j -= 1) {
      row[j] =
        before[i] === after[j]
          ? (next[j + 1] + 1)
          : Math.max(next[j], row[j + 1]);
    }
  }
  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (before[i] === after[j]) {
      ops.push({ type: 'equal', value: before[i] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: 'del', value: before[i] });
      i += 1;
    } else {
      ops.push({ type: 'add', value: after[j] });
      j += 1;
    }
  }
  while (i < n) {
    ops.push({ type: 'del', value: before[i] });
    i += 1;
  }
  while (j < m) {
    ops.push({ type: 'add', value: after[j] });
    j += 1;
  }
  return ops;
}

export function opsToRows(ops: DiffOp[]): DiffRow[] {
  const rows: DiffRow[] = [];
  let beforeNo = 1;
  let afterNo = 1;
  for (const op of ops) {
    if (op.type === 'equal') {
      rows.push({
        type: 'equal',
        beforeNo,
        afterNo,
        beforeText: op.value,
        afterText: op.value,
      });
      beforeNo += 1;
      afterNo += 1;
    } else if (op.type === 'del') {
      rows.push({ type: 'del', beforeNo, beforeText: op.value });
      beforeNo += 1;
    } else {
      rows.push({ type: 'add', afterNo, afterText: op.value });
      afterNo += 1;
    }
  }
  return rows;
}

/** Put a deleted line on the same split row as the added line that replaces it. */
export function pairReplacements(rows: DiffRow[]): DiffRow[] {
  const out: DiffRow[] = [];
  let index = 0;
  while (index < rows.length) {
    if (rows[index].type !== 'del') {
      out.push(rows[index]);
      index += 1;
      continue;
    }
    const dels: DiffRow[] = [];
    while (index < rows.length && rows[index].type === 'del') {
      dels.push(rows[index]);
      index += 1;
    }
    const adds: DiffRow[] = [];
    while (index < rows.length && rows[index].type === 'add') {
      adds.push(rows[index]);
      index += 1;
    }
    const n = Math.max(dels.length, adds.length);
    for (let i = 0; i < n; i += 1) {
      const del = dels[i];
      const add = adds[i];
      if (del && add) {
        out.push({
          type: 'replace',
          beforeNo: del.beforeNo,
          afterNo: add.afterNo,
          beforeText: del.beforeText,
          afterText: add.afterText,
        });
      } else if (del) {
        out.push(del);
      } else if (add) {
        out.push(add);
      }
    }
  }
  return out;
}

export function collapseRows(rows: DiffRow[], context = CONTEXT): DiffHunk[] {
  if (rows.length === 0) {
    return [];
  }
  const changed = rows.map((row) => row.type !== 'equal');
  const keep = changed.map(() => false);
  for (let i = 0; i < rows.length; i += 1) {
    if (!changed[i]) {
      continue;
    }
    const from = Math.max(0, i - context);
    const to = Math.min(rows.length - 1, i + context);
    for (let j = from; j <= to; j += 1) {
      keep[j] = true;
    }
  }
  if (keep.every((flag) => !flag)) {
    return [
      {
        kind: 'gap',
        count: rows.length,
        rows,
      },
    ];
  }
  const hunks: DiffHunk[] = [];
  let index = 0;
  while (index < rows.length) {
    if (keep[index]) {
      const block: DiffRow[] = [];
      while (index < rows.length && keep[index]) {
        block.push(rows[index]);
        index += 1;
      }
      hunks.push({ kind: 'block', rows: block });
    } else {
      const gap: DiffRow[] = [];
      while (index < rows.length && !keep[index]) {
        gap.push(rows[index]);
        index += 1;
      }
      hunks.push({ kind: 'gap', count: gap.length, rows: gap });
    }
  }
  return hunks;
}

export function countOps(ops: DiffOp[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const op of ops) {
    if (op.type === 'add') {
      added += 1;
    } else if (op.type === 'del') {
      removed += 1;
    }
  }
  return { added, removed };
}

export function buildFileDiff(input: {
  path: string;
  absPath: string;
  before: string;
  after: string;
}): FileDiff {
  const beforeLines = splitLines(input.before);
  const afterLines = splitLines(input.after);
  const ops = diffOps(beforeLines, afterLines);
  const stats = countOps(ops);
  return {
    path: input.path,
    absPath: input.absPath,
    added: stats.added,
    removed: stats.removed,
    created: input.before === '' && input.after !== '',
    deleted: input.after === '' && input.before !== '',
    hunks: collapseRows(pairReplacements(opsToRows(ops))),
  };
}
