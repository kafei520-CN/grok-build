import { collectDropUris } from '../clipboard';
import { post, root, tr } from './app';

const IMAGE_MAX = 4 * 1024 * 1024;
const TEXT_MAX = 256_000;

let dragDepth = 0;
let picker: HTMLInputElement | undefined;

export function bindFileDrop(): void {
  syncDropHint();
  const target = document;
  target.addEventListener('dragenter', onDragEnter, true);
  target.addEventListener('dragover', onDragOver, true);
  target.addEventListener('dragleave', onDragLeave, true);
  target.addEventListener('drop', onDrop, true);
}

export function pickRemoteFiles(): void {
  const input = ensurePicker();
  input.value = '';
  input.click();
}

export function syncDropHint(): void {
  root.dataset.drop = tr('dropFiles');
}

export async function sendBrowserFiles(
  list: File[],
  extra?: { text?: string; uris?: string[] },
): Promise<void> {
  const images: Array<{ name: string; mimeType: string; data: string }> = [];
  const files: Array<{ name: string; mimeType?: string; text?: string }> = [];
  for (const file of list) {
    if (file.type.startsWith('image/')) {
      if (file.size > IMAGE_MAX) {
        continue;
      }
      const buf = new Uint8Array(await file.arrayBuffer());
      images.push({
        name: file.name || 'image.png',
        mimeType: file.type || 'image/png',
        data: bytesToBase64(buf),
      });
      continue;
    }
    if (file.size > TEXT_MAX) {
      continue;
    }
    const buf = new Uint8Array(await file.arrayBuffer());
    if (buf.includes(0)) {
      continue;
    }
    files.push({
      name: file.name || 'file.txt',
      mimeType: file.type || undefined,
      text: new TextDecoder('utf-8', { fatal: false }).decode(buf),
    });
  }
  if (images.length === 0 && files.length === 0 && !extra?.uris?.length && !extra?.text) {
    return;
  }
  post({ type: 'pasteClipboard', images, files, text: extra?.text, uris: extra?.uris });
}

function ensurePicker(): HTMLInputElement {
  if (picker?.isConnected) {
    return picker;
  }
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.className = 'remote-file-pick';
  input.setAttribute('aria-hidden', 'true');
  input.tabIndex = -1;
  input.addEventListener('change', () => {
    const chosen = input.files ? [...input.files] : [];
    input.value = '';
    void sendBrowserFiles(chosen);
  });
  document.body.append(input);
  picker = input;
  return input;
}

function onDragEnter(event: DragEvent): void {
  if (!hasFiles(event.dataTransfer)) {
    return;
  }
  event.preventDefault();
  dragDepth += 1;
  root.classList.add('drop');
}

function onDragOver(event: DragEvent): void {
  if (!hasFiles(event.dataTransfer)) {
    return;
  }
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy';
  }
  root.classList.add('drop');
}

function onDragLeave(event: DragEvent): void {
  if (!root.contains(event.relatedTarget as Node | null)) {
    dragDepth = 0;
    root.classList.remove('drop');
    return;
  }
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) {
    root.classList.remove('drop');
  }
}

function onDrop(event: DragEvent): void {
  const data = event.dataTransfer;
  if (!data || !hasFiles(data)) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  dragDepth = 0;
  root.classList.remove('drop');
  void sendDrop(data);
}

function hasFiles(data: DataTransfer | null): boolean {
  if (!data) {
    return false;
  }
  if (data.files.length > 0) {
    return true;
  }
  const types = Array.from(data.types);
  if (types.includes('Files')) {
    return true;
  }
  return types.some(
    (type) =>
      type === 'text/uri-list' ||
      type === 'application/vnd.code.uri-list' ||
      type === 'resourceurls' ||
      type === 'ResourceURLs',
  );
}

async function sendDrop(data: DataTransfer): Promise<void> {
  const extra: string[] = [];
  const browser: File[] = [];
  for (const file of [...data.files]) {
    const nativePath = (file as File & { path?: string }).path;
    if (nativePath) {
      extra.push(nativePath);
      continue;
    }
    browser.push(file);
  }
  const uris = collectDropUris((type) => {
    try {
      return data.getData(type);
    } catch {
      return '';
    }
  }, extra);
  await sendBrowserFiles(browser, { uris });
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
