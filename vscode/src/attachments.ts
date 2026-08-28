import * as path from 'node:path';
import { clipboardToPath, splitClipboardPaths } from './clipboard';
import { plat } from './platform';
import type { Attachment } from './types';

/** Inline file text above this size is dropped; the chip stays path-only. */
export const ATTACH_TEXT_MAX = 256_000;

export interface AttachmentHost {
  attachments: Attachment[];
  fileHits?: Array<{ path: string; label: string }>;
  emit(): void;
}

export function addSelection(host: AttachmentHost): void {
  const selection = plat().getActiveSelection();
  if (!selection) {
    plat().info('Select some code first.');
    return;
  }
  const label = `${path.basename(selection.path)}:${selection.startLine}-${selection.endLine}`;
  upsert(host, {
    id: label,
    label,
    path: selection.path,
    text: selection.text,
  });
  plat().focusChat();
}

export function addActiveFile(host: AttachmentHost): void {
  const file = plat().getActiveFile();
  if (!file) {
    return;
  }
  upsert(host, {
    id: file.path,
    label: path.basename(file.path),
    path: file.path,
    text: Buffer.byteLength(file.text, 'utf8') < ATTACH_TEXT_MAX ? file.text : undefined,
  });
  plat().focusChat();
}

export function removeAttachment(host: AttachmentHost, id: string): void {
  host.attachments = host.attachments.filter((item) => item.id !== id);
  host.emit();
}

export async function attachFromUi(host: AttachmentHost): Promise<void> {
  const picked = await plat().openFiles();
  if (!picked?.length) {
    addActiveFile(host);
    return;
  }
  for (const filePath of picked) {
    await attachPath(host, filePath);
  }
}

export async function attachPath(host: AttachmentHost, filePath: string): Promise<void> {
  let text: string | undefined;
  try {
    const bytes = await plat().readFile(filePath);
    if (bytes.byteLength < ATTACH_TEXT_MAX) {
      text = Buffer.from(bytes).toString('utf8');
    }
  } catch {
    /* path-only chip */
  }
  host.attachments = [
    ...host.attachments.filter((item) => item.id !== filePath),
    { id: filePath, label: path.basename(filePath), path: filePath, text },
  ];
  host.fileHits = undefined;
  host.emit();
}

export async function pasteClipboard(
  host: AttachmentHost,
  payload: {
    text?: string;
    uris?: string[];
    images?: Array<{ name: string; mimeType: string; data: string }>;
  },
): Promise<void> {
  for (const image of payload.images ?? []) {
    const id = `img-${Date.now()}-${image.name}`;
    upsert(
      host,
      {
        id,
        label: image.name || 'image',
        mimeType: image.mimeType,
        data: image.data,
      },
      false,
    );
  }
  const uris = [...(payload.uris ?? []), ...splitClipboardPaths(payload.text ?? '')];
  for (const uri of uris) {
    const filePath = clipboardToPath(uri);
    if (filePath) {
      await attachPath(host, filePath);
    }
  }
  host.emit();
}

function upsert(host: AttachmentHost, next: Attachment, emit = true): void {
  host.attachments = [...host.attachments.filter((item) => item.id !== next.id), next];
  if (emit) {
    host.emit();
  }
}
