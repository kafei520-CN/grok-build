import { collectDropUris } from '../clipboard';
import { post, root, tr } from './app';

let dragDepth = 0;

export function bindFileDrop(): void {
  syncDropHint();
  const target = document;
  target.addEventListener('dragenter', onDragEnter, true);
  target.addEventListener('dragover', onDragOver, true);
  target.addEventListener('dragleave', onDragLeave, true);
  target.addEventListener('drop', onDrop, true);
}

export function syncDropHint(): void {
  root.dataset.drop = tr('dropFiles');
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
  const images: Array<{ name: string; mimeType: string; data: string }> = [];
  for (const file of [...data.files]) {
    const nativePath = (file as File & { path?: string }).path;
    if (nativePath) {
      extra.push(nativePath);
      continue;
    }
    if (file.type.startsWith('image/')) {
      const buf = new Uint8Array(await file.arrayBuffer());
      images.push({
        name: file.name || 'drop.png',
        mimeType: file.type || 'image/png',
        data: bytesToBase64(buf),
      });
    }
  }
  const uris = collectDropUris((type) => {
    try {
      return data.getData(type);
    } catch {
      return '';
    }
  }, extra);
  if (uris.length === 0 && images.length === 0) {
    return;
  }
  post({ type: 'pasteClipboard', uris, images });
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
