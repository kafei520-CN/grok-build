import * as path from 'node:path';
import { logError, logInfo } from './logger';
import { plat } from './platform';
import { asObject, asString } from './wire';

export async function readWorkspaceFile(
  params: unknown,
): Promise<{ content: string }> {
  const obj = asObject(params);
  const filePath = asString(obj['path']);
  if (!filePath) {
    throw new Error('fs/read_text_file missing path');
  }
  const open = plat().openText?.(filePath);
  if (open !== undefined) {
    return sliceContent(open, obj);
  }
  const bytes = await plat().readFile(filePath);
  return sliceContent(Buffer.from(bytes).toString('utf8'), obj);
}

function sliceContent(
  text: string,
  obj: Record<string, unknown>,
): { content: string } {
  const line = typeof obj['line'] === 'number' ? obj['line'] : undefined;
  const limit = typeof obj['limit'] === 'number' ? obj['limit'] : undefined;
  if (line === undefined && limit === undefined) {
    return { content: text };
  }
  const lines = text.split('\n');
  const start = Math.max(0, (line ?? 1) - 1);
  const end = limit !== undefined ? start + limit : lines.length;
  return { content: lines.slice(start, end).join('\n') };
}

export async function writeWorkspaceFile(
  params: unknown,
): Promise<Record<string, never>> {
  const obj = asObject(params);
  const filePath = asString(obj['path']);
  const content = asString(obj['content']);
  if (!filePath || content === undefined) {
    throw new Error('fs/write_text_file missing path or content');
  }
  const open = plat().openText?.(filePath);
  if (open !== undefined) {
    const applied = await plat().applyText?.(filePath, content);
    if (!applied) {
      throw new Error(`could not apply edit to open file ${filePath}`);
    }
    logInfo(`applied ${filePath}`);
    return {};
  }
  await plat().writeFile(filePath, Buffer.from(content, 'utf8'));
  logInfo(`wrote ${filePath}`);
  return {};
}

export async function openPath(filePath: string): Promise<void> {
  try {
    await plat().openFile(filePath, true);
  } catch (error) {
    logError(`failed to open ${filePath}`, error);
  }
}

export function dirnameOf(filePath: string): string {
  return path.dirname(filePath);
}
