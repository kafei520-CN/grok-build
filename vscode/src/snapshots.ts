export interface FileSnapshot {
  absPath: string;
  displayPath: string;
  existed: boolean;
  previous?: string;
  source?: 'disk' | 'tool';
}

export type RevertPlan =
  | { action: 'restore'; absPath: string; previous: string }
  | { action: 'delete'; absPath: string }
  | { action: 'skip'; absPath: string; reason: 'missing-original' };

export const MAX_SNAPSHOT_CHARS = 1_500_000;

export function normalizeFsPath(filePath: string): string {
  const trimmed = filePath.trim().replace(/\\/g, '/');
  return trimmed.replace(/^([a-zA-Z]):/, (_, drive: string) => `${drive.toUpperCase()}:`);
}

export function alreadyCaptured(list: FileSnapshot[], absPath: string): boolean {
  const key = normalizeFsPath(absPath);
  return list.some(
    (item) => normalizeFsPath(item.absPath) === key && item.source !== 'tool',
  );
}

export function addSnapshot(list: FileSnapshot[], snap: FileSnapshot): FileSnapshot[] {
  const key = normalizeFsPath(snap.absPath);
  const index = list.findIndex((item) => normalizeFsPath(item.absPath) === key);
  if (index < 0) {
    return [...list, snap];
  }
  const existing = list[index];
  if (existing.source !== 'tool' && snap.source === 'tool') {
    return list;
  }
  if (existing.source === 'tool' && snap.source !== 'tool') {
    const next = [...list];
    next[index] = snap;
    return next;
  }
  return list;
}

/** Tool oldText is often a hunk, not the whole file. Reject that as a baseline. */
export function isFullFileBaseline(before: string, after: string): boolean {
  if (before === '') {
    return true;
  }
  const beforeLines = before.split('\n').length;
  const afterLines = after.split('\n').length;
  if (afterLines >= 30 && beforeLines * 2 + 20 < afterLines) {
    return false;
  }
  if (beforeLines >= 30 && afterLines * 2 + 20 < beforeLines) {
    return false;
  }
  return true;
}

export function planRevert(list: FileSnapshot[]): RevertPlan[] {
  return list.map((snap) => {
    if (!snap.existed) {
      return { action: 'delete', absPath: snap.absPath };
    }
    if (snap.previous === undefined) {
      return { action: 'skip', absPath: snap.absPath, reason: 'missing-original' };
    }
    return { action: 'restore', absPath: snap.absPath, previous: snap.previous };
  });
}

export function isProbablyText(bytes: Uint8Array): boolean {
  const sample = bytes.subarray(0, Math.min(bytes.length, 8000));
  return !sample.includes(0);
}
