import * as fs from 'node:fs';
import * as path from 'node:path';

/** Where a file chip or a line chip should open. Lines are 1-based, as in the chip. */
export type ChipTarget = {
  path: string;
  line?: number;
  kind: 'file' | 'dir';
};

export type ChipQuery = {
  path?: string;
  line?: number;
  symbol?: string;
};

const SKIP_DIRS = new Set([
  'node_modules',
  'target',
  'dist',
  'build',
  'out',
  'bin',
  'coverage',
  'vendor',
  '.gradle',
  '.next',
  '__pycache__',
]);

const SOURCE_EXTS = new Set([
  'ts',
  'tsx',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'kt',
  'kts',
  'java',
  'py',
  'go',
  'rs',
  'cs',
  'c',
  'h',
  'cpp',
  'hpp',
  'cc',
  'vue',
  'svelte',
  'php',
  'rb',
  'swift',
  'scala',
  'dart',
  'lua',
  'zig',
  'sql',
]);

const MAX_VISITS = 8000;
const MAX_BYTES = 512 * 1024;

/** Turn a chip path into an existing workspace file and the line to reveal. */
export function locateChip(query: ChipQuery, roots: string[]): ChipTarget | undefined {
  const split = splitCitedPath(query.path ?? '');
  const line = positiveLine(query.line) ?? split.line;
  const raw = split.path.replace(/[/\\]+$/, '');
  if (raw) {
    const hit = resolveExisting(raw, roots) ?? findBySuffix(raw, roots);
    if (hit) {
      return located(hit, line);
    }
  }
  const symbol = query.symbol?.trim();
  if (!symbol) {
    return undefined;
  }
  const found = findSymbol(symbol, line, roots);
  if (!found) {
    return undefined;
  }
  return { path: found.path, line: found.line, kind: 'file' };
}

export function splitCitedPath(raw: string): { path: string; line?: number } {
  let text = stripFileUrl(raw.trim());
  if (!text) {
    return { path: '' };
  }
  let line: number | undefined;
  const lined = text.match(/\s*\(\s*line\s+(\d+)\s*\)$/i);
  if (lined?.index !== undefined) {
    line = Number(lined[1]);
    text = text.slice(0, lined.index).trim();
  }
  const suffix = takeLineSuffix(text);
  if (suffix) {
    line = line ?? suffix.line;
    text = suffix.path;
  }
  return { path: text, line: positiveLine(line) };
}

function located(filePath: string, line?: number): ChipTarget {
  let kind: ChipTarget['kind'] = 'file';
  try {
    if (fs.statSync(filePath).isDirectory()) {
      kind = 'dir';
    }
  } catch {
    kind = 'file';
  }
  return { path: filePath, line: kind === 'file' ? line : undefined, kind };
}

function resolveExisting(filePath: string, roots: string[]): string | undefined {
  const direct = path.normalize(filePath);
  if (path.isAbsolute(direct) && fs.existsSync(direct)) {
    return direct;
  }
  for (const root of roots) {
    if (!root) {
      continue;
    }
    const candidate = path.normalize(path.resolve(root, filePath));
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

function findBySuffix(suffix: string, roots: string[]): string | undefined {
  const tail = suffix.replace(/\\/g, '/').replace(/^\.\//, '');
  if (!tail || tail === '.' || tail.includes('..')) {
    return undefined;
  }
  for (const root of roots) {
    if (!root) {
      continue;
    }
    const hit = walk(root, (file) => endsWithPath(file, tail));
    if (hit) {
      return hit;
    }
  }
  return undefined;
}

function findSymbol(
  symbol: string,
  line: number | undefined,
  roots: string[],
): { path: string; line: number } | undefined {
  const full = findNamed([symbol], line, roots);
  if (full) {
    return full;
  }
  const dot = symbol.lastIndexOf('.');
  const tail = dot >= 0 ? symbol.slice(dot + 1) : '';
  if (!tail || tail === symbol) {
    return undefined;
  }
  return findNamed([tail], line, roots);
}

function findNamed(
  names: string[],
  line: number | undefined,
  roots: string[],
): { path: string; line: number } | undefined {
  let best: { path: string; line: number; rank: number } | undefined;
  for (const root of roots) {
    if (!root) {
      continue;
    }
    const stopped = walk(root, (file) => {
      if (!isSource(file)) {
        return false;
      }
      const hit = scoreFile(file, names, line);
      if (!hit) {
        return false;
      }
      if (!best || hit.rank < best.rank) {
        best = hit;
      }
      return hit.rank === 0;
    });
    if (stopped) {
      break;
    }
  }
  return best ? { path: best.path, line: best.line } : undefined;
}

function scoreFile(
  file: string,
  names: string[],
  cited?: number,
): { path: string; line: number; rank: number } | undefined {
  let text: string;
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size === 0 || stat.size > MAX_BYTES) {
      return undefined;
    }
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return undefined;
  }
  if (text.includes('\0')) {
    return undefined;
  }
  const lines = text.split(/\r?\n/);
  const citedIndex = cited && cited > 0 ? cited - 1 : -1;
  if (citedIndex >= 0 && citedIndex < lines.length && lineHasName(lines[citedIndex] ?? '', names)) {
    const row = lines[citedIndex] ?? '';
    return { path: file, line: cited ?? citedIndex + 1, rank: looksLikeDef(row, names) ? 0 : 1 };
  }
  if (cited && citedIndex >= 0) {
    const from = Math.max(0, citedIndex - 8);
    const to = Math.min(lines.length - 1, citedIndex + 8);
    for (let i = from; i <= to; i += 1) {
      if (lineHasName(lines[i] ?? '', names)) {
        return { path: file, line: cited, rank: 2 };
      }
    }
  }
  for (let i = 0; i < lines.length; i += 1) {
    const row = lines[i] ?? '';
    if (looksLikeDef(row, names)) {
      return { path: file, line: i + 1, rank: 3 };
    }
  }
  return undefined;
}

function looksLikeDef(line: string, names: string[]): boolean {
  return names.some((name) => {
    if (!wordIn(line, name)) {
      return false;
    }
    return (
      new RegExp(
        `(^|[\\s.>])${escapeReg(name)}\\s*(?:<[^>]*>)?\\s*\\(`,
      ).test(line) ||
      /\b(function|func|fun|def|fn|class|interface|struct|enum|trait|object|const|let|var|val)\b/.test(
        line,
      )
    );
  });
}

function lineHasName(line: string, names: string[]): boolean {
  return names.some((name) => wordIn(line, name));
}

function wordIn(line: string, name: string): boolean {
  if (!name) {
    return false;
  }
  let from = 0;
  while (from <= line.length - name.length) {
    const at = line.indexOf(name, from);
    if (at < 0) {
      return false;
    }
    const before = at === 0 ? '' : line[at - 1] ?? '';
    const after = line[at + name.length] ?? '';
    if (!isIdent(before) && !isIdent(after)) {
      return true;
    }
    from = at + name.length;
  }
  return false;
}

function isIdent(ch: string): boolean {
  return ch !== '' && /[\p{L}\p{N}_$]/u.test(ch);
}

function escapeReg(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function walk(root: string, visit: (file: string) => boolean): string | undefined {
  let seen = 0;
  const stack = [root];
  while (stack.length > 0 && seen < MAX_VISITS) {
    const dir = stack.pop();
    if (!dir) {
      break;
    }
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (seen >= MAX_VISITS) {
        return undefined;
      }
      if (entry.isSymbolicLink()) {
        continue;
      }
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) {
          continue;
        }
        stack.push(full);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      seen += 1;
      if (visit(full)) {
        return full;
      }
    }
  }
  return undefined;
}

function endsWithPath(file: string, suffix: string): boolean {
  const norm = file.replace(/\\/g, '/').toLowerCase();
  const tail = suffix.replace(/\\/g, '/').toLowerCase();
  return norm === tail || norm.endsWith(`/${tail}`);
}

function isSource(file: string): boolean {
  return SOURCE_EXTS.has(path.extname(file).slice(1).toLowerCase());
}

function positiveLine(line: number | undefined): number | undefined {
  return line && Number.isFinite(line) && line > 0 ? Math.floor(line) : undefined;
}

function takeLineSuffix(text: string): { path: string; line: number } | undefined {
  const hash = text.match(/#L(\d+)$/i);
  if (hash?.index !== undefined && hash.index > 0) {
    return { path: text.slice(0, hash.index), line: Number(hash[1]) };
  }
  const colon = text.match(/:(\d+)(?::\d+)?$/);
  if (colon?.index !== undefined && colon.index > 1) {
    return { path: text.slice(0, colon.index), line: Number(colon[1]) };
  }
  return undefined;
}

function stripFileUrl(value: string): string {
  if (!/^file:/i.test(value)) {
    return value;
  }
  try {
    let text = decodeURIComponent(value.replace(/^file:\/\//i, ''));
    if (/^\/[A-Za-z]:/.test(text)) {
      text = text.slice(1);
    }
    return text;
  } catch {
    return value;
  }
}
