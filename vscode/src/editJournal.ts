import { execFile } from 'node:child_process';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { buildFileDiff, splitLines, type FileDiff } from './diff';
import { logError } from './logger';
import { tr } from './locale';
import { plat } from './platform';
import {
  MAX_SNAPSHOT_CHARS,
  addSnapshot,
  alreadyCaptured,
  isFullFileBaseline,
  isProbablyText,
  normalizeFsPath,
  planRevert,
  type FileSnapshot,
} from './snapshots';
import type { ChatMessage } from './types';

const execFileAsync = promisify(execFile);

export class EditJournal {
  private readonly snapshots = new Map<string, FileSnapshot[]>();
  private readonly remembering = new Map<string, Promise<void>>();

  constructor(
    private readonly host: {
      messages: () => ChatMessage[];
      replaying: () => boolean;
      cwd: () => string;
      displayPath: (filePath: string) => string;
      emit: () => void;
    },
  ) {}

  clear(): void {
    this.snapshots.clear();
  }

  resolvePath(filePath: string): string | undefined {
    if (!filePath) {
      return undefined;
    }
    if (/^[A-Za-z]:[\\/]/.test(filePath) || filePath.startsWith('/')) {
      return filePath;
    }
    const folder = plat().workspaceFolders()[0];
    if (folder) {
      return path.join(folder, filePath);
    }
    return filePath;
  }

  assistant(messageId?: string): ChatMessage | undefined {
    const messages = this.host.messages();
    if (messageId) {
      return messages.find((item) => item.id === messageId && item.role === 'assistant');
    }
    return (
      [...messages]
        .reverse()
        .find((item) => item.role === 'assistant' && (item.edits?.length ?? 0) > 0) ??
      messages.filter((item) => item.role === 'assistant').at(-1)
    );
  }

  async remember(filePath: string): Promise<void> {
    const last = this.host.messages().at(-1);
    const assistant =
      last?.role === 'assistant'
        ? last
        : this.host.messages().filter((item) => item.role === 'assistant').at(-1);
    if (!assistant || this.host.replaying()) {
      return;
    }
    const abs = this.resolvePath(filePath);
    if (!abs) {
      return;
    }
    const key = `${assistant.id}:${normalizeFsPath(abs)}`;
    const inflight = this.remembering.get(key);
    if (inflight) {
      await inflight;
      return;
    }
    const current = this.snapshots.get(assistant.id) ?? [];
    if (alreadyCaptured(current, abs)) {
      return;
    }
    const work = this.captureFromDisk(assistant.id, abs);
    this.remembering.set(key, work);
    try {
      await work;
    } finally {
      this.remembering.delete(key);
    }
  }

  private async captureFromDisk(messageId: string, abs: string): Promise<void> {
    const current = this.snapshots.get(messageId) ?? [];
    if (alreadyCaptured(current, abs)) {
      return;
    }
    let snap: FileSnapshot;
    try {
      const bytes = await plat().readFile(abs);
      if (!isProbablyText(bytes) || bytes.byteLength > MAX_SNAPSHOT_CHARS) {
        snap = {
          absPath: abs,
          displayPath: this.host.displayPath(abs),
          existed: true,
          source: 'disk',
        };
      } else {
        snap = {
          absPath: abs,
          displayPath: this.host.displayPath(abs),
          existed: true,
          previous: Buffer.from(bytes).toString('utf8'),
          source: 'disk',
        };
      }
    } catch {
      snap = {
        absPath: abs,
        displayPath: this.host.displayPath(abs),
        existed: false,
        previous: '',
        source: 'disk',
      };
    }
    this.snapshots.set(messageId, addSnapshot(this.snapshots.get(messageId) ?? [], snap));
  }

  capturePrevious(filePath: string, previous: string): void {
    const last = this.host.messages().at(-1);
    const assistant =
      last?.role === 'assistant'
        ? last
        : this.host.messages().filter((item) => item.role === 'assistant').at(-1);
    if (!assistant) {
      return;
    }
    const abs = this.resolvePath(filePath);
    if (!abs) {
      return;
    }
    const current = this.snapshots.get(assistant.id) ?? [];
    if (alreadyCaptured(current, abs)) {
      return;
    }
    this.snapshots.set(
      assistant.id,
      addSnapshot(current, {
        absPath: abs,
        displayPath: this.host.displayPath(abs),
        existed: previous.length > 0,
        previous,
        source: 'tool',
      }),
    );
  }

  async hydrateFromGit(): Promise<void> {
    for (const message of this.host.messages()) {
      if (message.role !== 'assistant') {
        continue;
      }
      for (const edit of message.edits ?? []) {
        const abs = this.resolvePath(edit.path);
        if (!abs) {
          continue;
        }
        const current = this.snapshots.get(message.id) ?? [];
        if (alreadyCaptured(current, abs)) {
          continue;
        }
        const previous = await this.readGitHead(abs);
        if (previous === undefined) {
          continue;
        }
        this.snapshots.set(
          message.id,
          addSnapshot(current, {
            absPath: abs,
            displayPath: this.host.displayPath(abs),
            existed: true,
            previous,
            source: 'disk',
          }),
        );
      }
    }
  }

  async revert(
    messageId?: string,
    opts?: { silent?: boolean },
  ): Promise<'empty' | 'cancelled' | { restored: number; failed: number }> {
    const assistant = this.assistant(messageId);
    if (assistant && (this.snapshots.get(assistant.id) ?? []).length === 0) {
      await this.hydrateFromGit();
    }
    const snaps = assistant ? (this.snapshots.get(assistant.id) ?? []) : [];
    const plans = planRevert(snaps);
    if (plans.length === 0) {
      if (!opts?.silent) {
        plat().info(tr('revertNone'));
      }
      return 'empty';
    }
    if (!opts?.silent) {
      const ok = await plat().confirm(tr('revertConfirm', { n: plans.length }), tr('revertAction'));
      if (!ok) {
        return 'cancelled';
      }
    }
    const outcomes: Array<{ absPath: string; ok: boolean }> = [];
    for (const plan of plans) {
      try {
        if (plan.action === 'restore') {
          await this.restoreFile(plan.absPath, plan.previous);
          outcomes.push({ absPath: plan.absPath, ok: true });
        } else if (plan.action === 'delete') {
          await plat().deleteFile(plan.absPath, true);
          outcomes.push({ absPath: plan.absPath, ok: true });
        } else {
          outcomes.push({ absPath: plan.absPath, ok: false });
        }
      } catch (error) {
        outcomes.push({ absPath: plan.absPath, ok: false });
        logError(`revert ${plan.absPath}`, error);
      }
    }
    const restored = outcomes.filter((item) => item.ok).length;
    const failed = outcomes.filter((item) => !item.ok).length;
    if (assistant) {
      const failedPaths = new Set(
        outcomes.filter((item) => !item.ok).map((item) => normalizeFsPath(item.absPath)),
      );
      if (failedPaths.size > 0) {
        this.snapshots.set(
          assistant.id,
          snaps.filter((snap) => failedPaths.has(normalizeFsPath(snap.absPath))),
        );
        assistant.edits = (assistant.edits ?? []).filter((edit) => {
          const abs = this.resolvePath(edit.path) ?? edit.path;
          return failedPaths.has(normalizeFsPath(abs));
        });
      } else {
        this.snapshots.delete(assistant.id);
        assistant.edits = undefined;
      }
      this.host.emit();
    }
    if (!opts?.silent) {
      if (failed > 0) {
        plat().warn(tr('revertFailed', { n: failed }));
      } else {
        plat().info(tr('revertDone', { n: restored }));
      }
    }
    return { restored, failed };
  }

  async diffs(messageId?: string, onlyPath?: string): Promise<FileDiff[]> {
    const assistant = this.assistant(messageId);
    const edits = assistant?.edits ?? [];
    const paths = onlyPath ? [onlyPath] : edits.map((edit) => edit.path);
    const files: FileDiff[] = [];
    const seen = new Set<string>();
    for (const filePath of paths) {
      const pair = await this.readBeforeAfter(assistant, filePath);
      if (!pair) {
        continue;
      }
      const key = normalizeFsPath(pair.absPath);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const file = buildFileDiff({
        path: this.host.displayPath(pair.absPath),
        absPath: pair.absPath,
        before: pair.before,
        after: pair.after,
      });
      if (file.added === 0 && file.removed === 0 && !file.created && !file.deleted) {
        continue;
      }
      files.push(file);
    }
    return files;
  }

  private async readBeforeAfter(
    assistant: ChatMessage | undefined,
    filePath: string,
  ): Promise<{ absPath: string; before: string; after: string } | undefined> {
    const abs = this.resolvePath(filePath);
    if (!abs) {
      return undefined;
    }
    const pool = assistant
      ? (this.snapshots.get(assistant.id) ?? [])
      : [...this.snapshots.values()].flat();
    const snap = pool.find((item) => normalizeFsPath(item.absPath) === normalizeFsPath(abs));
    const edit = assistant?.edits?.find(
      (item) => normalizeFsPath(this.resolvePath(item.path) ?? item.path) === normalizeFsPath(abs),
    );
    const afterDisk = (await this.readCurrentText(abs)) ?? '';
    if (snap && !snap.existed) {
      return { absPath: abs, before: '', after: afterDisk };
    }
    if (
      snap?.source !== 'tool' &&
      snap?.previous !== undefined &&
      !textEqual(snap.previous, afterDisk) &&
      isFullFileBaseline(snap.previous, afterDisk)
    ) {
      return { absPath: abs, before: snap.previous, after: afterDisk };
    }
    if (edit?.previous !== undefined && edit.next !== undefined) {
      return { absPath: abs, before: edit.previous, after: edit.next };
    }
    if (
      edit?.previous !== undefined &&
      !textEqual(edit.previous, afterDisk) &&
      isFullFileBaseline(edit.previous, afterDisk)
    ) {
      return { absPath: abs, before: edit.previous, after: afterDisk };
    }
    return undefined;
  }

  private async readCurrentText(abs: string): Promise<string | undefined> {
    const open = plat().openText?.(abs);
    if (open !== undefined) {
      return open;
    }
    try {
      const bytes = await plat().readFile(abs);
      if (!isProbablyText(bytes)) {
        return undefined;
      }
      return Buffer.from(bytes).toString('utf8');
    } catch {
      return undefined;
    }
  }

  private async readGitHead(absPath: string): Promise<string | undefined> {
    const folders = plat().workspaceFolders();
    const cwd =
      folders.find((folder) => isInside(folder, absPath)) ?? this.host.cwd();
    const rel = path.relative(cwd, absPath).replace(/\\/g, '/');
    if (!rel || rel.startsWith('..')) {
      return undefined;
    }
    try {
      const { stdout } = await execFileAsync('git', ['show', `HEAD:${rel}`], {
        cwd,
        windowsHide: true,
        maxBuffer: MAX_SNAPSHOT_CHARS,
      });
      return stdout;
    } catch {
      return undefined;
    }
  }

  private async restoreFile(absPath: string, previous: string): Promise<void> {
    const applied = await plat().applyText?.(absPath, previous);
    if (applied) {
      return;
    }
    await plat().writeFile(absPath, Buffer.from(previous, 'utf8'));
  }
}

function textEqual(left: string, right: string): boolean {
  return splitLines(left).join('\n') === splitLines(right).join('\n');
}

function isInside(root: string, filePath: string): boolean {
  const rel = path.relative(root, filePath);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}
