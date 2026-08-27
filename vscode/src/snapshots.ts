export interface FileSnapshot {
  absPath: string;
  displayPath: string;
  existed: boolean;
  previous?: string;
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
  return list.some((item) => normalizeFsPath(item.absPath) === key);
}

export function addSnapshot(list: FileSnapshot[], snap: FileSnapshot): FileSnapshot[] {
  if (alreadyCaptured(list, snap.absPath)) {
    return list;
  }
  return [...list, snap];
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
