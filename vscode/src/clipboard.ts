import { looksLikeFilePath } from './edits';

export function splitClipboardPaths(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && looksLikeFilePath(line));
}

export function clipboardToPath(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.startsWith('file:')) {
    return decodeURIComponent(
      trimmed.replace(/^file:\/\//, '').replace(/^\/([A-Za-z]:)/, '$1'),
    );
  }
  if (looksLikeFilePath(trimmed)) {
    return trimmed;
  }
  return undefined;
}
