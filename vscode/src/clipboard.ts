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
  if (trimmed.startsWith('vscode-file://')) {
    const path = decodeURIComponent(trimmed.replace(/^vscode-file:\/\/[^/]*/, ''));
    return path.replace(/^\/([A-Za-z]:)/, '$1');
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

const DROP_MIME = [
  'application/vnd.code.uri-list',
  'text/uri-list',
  'text/plain',
  'resourceurls',
  'ResourceURLs',
];

/** Collect file URIs from a webview/OS drop, including VS Code explorer MIME types. */
export function collectDropUris(getData: (type: string) => string, extra: string[] = []): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (raw: string) => {
    const text = raw.trim();
    if (!text) {
      return;
    }
    if (text.startsWith('[')) {
      try {
        const parsed = JSON.parse(text) as unknown;
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (typeof item === 'string') {
              add(item);
            }
          }
          return;
        }
      } catch {
        /* fall through */
      }
    }
    for (const line of text.split(/\r?\n/)) {
      const item = line.trim();
      if (!item || item.startsWith('#')) {
        continue;
      }
      const path = clipboardToPath(item) ?? (looksLikeFilePath(item) ? item : undefined);
      if (path && !seen.has(path)) {
        seen.add(path);
        out.push(path);
      }
    }
  };
  for (const type of DROP_MIME) {
    try {
      add(getData(type));
    } catch {
      /* some hosts throw on unknown MIME */
    }
  }
  for (const item of extra) {
    const text = item.trim();
    if (!text) {
      continue;
    }
    const path = clipboardToPath(text) ?? text;
    if (!seen.has(path)) {
      seen.add(path);
      out.push(path);
    }
  }
  return out;
}
