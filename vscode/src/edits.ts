import { asObject, asString } from './wire';

export interface FileEdit {
  path: string;
  added: number;
  removed: number;
  previous?: string;
}

export function countUnifiedDiff(text: string): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const line of text.split('\n')) {
    if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@')) {
      continue;
    }
    if (line.startsWith('+')) {
      added += 1;
    } else if (line.startsWith('-')) {
      removed += 1;
    }
  }
  return { added, removed };
}

export function countLineDiff(
  oldText: string,
  newText: string,
): { added: number; removed: number } {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const oldCount = new Map<string, number>();
  for (const line of oldLines) {
    oldCount.set(line, (oldCount.get(line) ?? 0) + 1);
  }
  let added = 0;
  for (const line of newLines) {
    const left = oldCount.get(line) ?? 0;
    if (left > 0) {
      oldCount.set(line, left - 1);
    } else {
      added += 1;
    }
  }
  let removed = 0;
  for (const left of oldCount.values()) {
    removed += left;
  }
  return { added, removed };
}

export function mergeEdits(edits: FileEdit[]): FileEdit[] {
  const byPath = new Map<string, FileEdit>();
  for (const edit of edits) {
    const key = edit.path.replace(/\\/g, '/');
    const current = byPath.get(key);
    if (current) {
      current.added += edit.added;
      current.removed += edit.removed;
      if (edit.previous !== undefined && current.previous === undefined) {
        current.previous = edit.previous;
      }
    } else {
      byPath.set(key, { ...edit, path: edit.path });
    }
  }
  return [...byPath.values()];
}

export function publicEdits(edits: FileEdit[]): Array<{ path: string; added: number; removed: number }> {
  return edits.map(({ path, added, removed }) => ({ path, added, removed }));
}

export function totals(edits: FileEdit[]): { added: number; removed: number } {
  return edits.reduce(
    (acc, edit) => ({
      added: acc.added + edit.added,
      removed: acc.removed + edit.removed,
    }),
    { added: 0, removed: 0 },
  );
}

export function editsFromToolUpdate(update: {
  kind?: string;
  title?: string;
  locations?: Array<{ path?: string }>;
  content?: unknown;
  rawInput?: unknown;
}): FileEdit[] {
  const collected: FileEdit[] = [];
  for (const obj of flattenBlocks(update.content)) {
    const nested = asObject(obj['diff']);
    const path =
      asString(obj['path']) ??
      asString(obj['uri']) ??
      asString(asObject(obj['resource'])['uri']) ??
      asString(nested['path']);
    const oldText =
      asString(obj['oldText']) ??
      asString(obj['old_text']) ??
      asString(nested['oldText']) ??
      asString(nested['old_text']);
    const newText =
      asString(obj['newText']) ??
      asString(obj['new_text']) ??
      asString(nested['newText']) ??
      asString(nested['new_text']);
    const text = asString(obj['text']);
    const type = asString(obj['type']);
    let added = 0;
    let removed = 0;
    if (oldText !== undefined && newText !== undefined) {
      ({ added, removed } = countLineDiff(oldText, newText));
    } else if (type === 'diff' || (text && (text.includes('\n+') || text.startsWith('+')))) {
      ({ added, removed } = countUnifiedDiff(text ?? ''));
    }
    if (path) {
      collected.push({
        path,
        added,
        removed,
        previous: oldText,
      });
    }
  }
  for (const loc of update.locations ?? []) {
    if (loc.path) {
      collected.push({ path: loc.path, added: 0, removed: 0 });
    }
  }
  const raw = asObject(update.rawInput);
  const rawPath =
    asString(raw['path']) ??
    asString(raw['file']) ??
    asString(raw['file_path']) ??
    asString(raw['filePath']) ??
    asString(raw['target_file']);
  if (rawPath) {
    collected.push({ path: rawPath, added: 0, removed: 0 });
  }
  const kind = `${update.kind ?? ''} ${update.title ?? ''}`.toLowerCase();
  const looksLikeEdit = /edit|write|patch|create|delete|apply/.test(kind);
  const hasDiff = collected.some(
    (edit) => edit.added > 0 || edit.removed > 0 || edit.previous !== undefined,
  );
  if (!looksLikeEdit && !hasDiff) {
    return [];
  }
  return mergeEdits(collected);
}

function flattenBlocks(raw: unknown): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) {
        walk(item);
      }
      return;
    }
    const obj = asObject(value);
    if (Object.keys(obj).length === 0) {
      return;
    }
    out.push(obj);
    if (obj['content'] !== undefined) {
      walk(obj['content']);
    }
  };
  walk(raw);
  return out;
}

export function looksLikeFilePath(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || /\n/.test(trimmed)) {
    return false;
  }
  if (/^[A-Za-z]:[\\/]/.test(trimmed)) {
    return true;
  }
  if (trimmed.startsWith('file:')) {
    return true;
  }
  if (trimmed.startsWith('/') && trimmed.includes('.') && !trimmed.includes(' ')) {
    return true;
  }
  return false;
}
