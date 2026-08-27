import * as path from 'node:path';
import { plat } from './platform';

/** True when two filesystem paths point at the same directory. */
export function sameFsPath(a: string, b: string, os: NodeJS.Platform): boolean {
  const left = path.normalize(path.resolve(a));
  const right = path.normalize(path.resolve(b));
  return os === 'win32' ? left.toLowerCase() === right.toLowerCase() : left === right;
}

/**
 * Project `.grok/<kind>` directory, or undefined when there is no workspace
 * or it would be the same as `~/.grok/<kind>` (empty window, home folder).
 */
export function resolveProjectGrokDir(
  workspaceFolders: string[],
  homeDir: string,
  kind: 'skills' | 'rules',
  os: NodeJS.Platform,
): string | undefined {
  const folder = workspaceFolders[0];
  if (!folder) {
    return undefined;
  }
  const dir = path.join(folder, '.grok', kind);
  if (sameFsPath(dir, path.join(homeDir, '.grok', kind), os)) {
    return undefined;
  }
  return dir;
}

export function projectGrokDir(kind: 'skills' | 'rules'): string | undefined {
  return resolveProjectGrokDir(
    plat().workspaceFolders(),
    plat().homeDir(),
    kind,
    plat().os(),
  );
}
