import * as path from 'node:path';
import { plat } from './platform';
import type { RuleItem } from './types';

const DISABLED = '.disabled';

export function parseRuleFileName(fileName: string): { name: string; enabled: boolean } | undefined {
  if (fileName.endsWith(`.md${DISABLED}`)) {
    return { name: fileName.slice(0, -(3 + DISABLED.length)), enabled: false };
  }
  if (fileName.toLowerCase().endsWith('.md')) {
    return { name: fileName.slice(0, -3), enabled: true };
  }
  return undefined;
}

export function safeRuleStem(filePath: string): string {
  const base = path.basename(filePath).replace(/\.(md|txt)$/i, '');
  const cleaned = base.replace(/[<>:"/\\|?*\u0000]/g, '-').trim() || 'rule';
  return cleaned.slice(0, 80);
}

export function globalRulesDir(): string {
  return path.join(plat().homeDir(), '.grok', 'rules');
}

export function projectRulesDir(): string {
  return path.join(plat().cwd(), '.grok', 'rules');
}

export async function listRules(): Promise<RuleItem[]> {
  const rows = [
    ...(await collectRules(globalRulesDir(), 'global')),
    ...(await collectRules(projectRulesDir(), 'project')),
  ];
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export async function importRuleFiles(paths: string[]): Promise<number> {
  let imported = 0;
  const destDir = globalRulesDir();
  for (const filePath of paths) {
    if (!/\.(md|txt)$/i.test(filePath)) {
      continue;
    }
    const bytes = await plat().readFile(filePath);
    const stem = await uniqueStem(destDir, safeRuleStem(filePath));
    await plat().writeFile(path.join(destDir, `${stem}.md`), bytes);
    imported += 1;
  }
  return imported;
}

export async function toggleRule(filePath: string): Promise<void> {
  if (filePath.endsWith(DISABLED)) {
    await moveFile(filePath, filePath.slice(0, -DISABLED.length));
    return;
  }
  await moveFile(filePath, `${filePath}${DISABLED}`);
}

export async function deleteRule(filePath: string): Promise<void> {
  await plat().deleteFile(filePath, true);
}

async function collectRules(dir: string, scope: RuleItem['scope']): Promise<RuleItem[]> {
  const names = await plat().readDir(dir);
  const rows: RuleItem[] = [];
  for (const fileName of names) {
    const parsed = parseRuleFileName(fileName);
    if (!parsed) {
      continue;
    }
    const filePath = path.join(dir, fileName);
    rows.push({
      id: filePath,
      name: parsed.name,
      filePath,
      scope,
      enabled: parsed.enabled,
    });
  }
  return rows;
}

async function uniqueStem(dir: string, stem: string): Promise<string> {
  const existing = new Set(await plat().readDir(dir));
  if (!existing.has(`${stem}.md`) && !existing.has(`${stem}.md${DISABLED}`)) {
    return stem;
  }
  for (let n = 2; n < 100; n += 1) {
    const next = `${stem}-${n}`;
    if (!existing.has(`${next}.md`) && !existing.has(`${next}.md${DISABLED}`)) {
      return next;
    }
  }
  return `${stem}-${Date.now()}`;
}

async function moveFile(from: string, to: string): Promise<void> {
  const bytes = await plat().readFile(from);
  await plat().writeFile(to, bytes);
  await plat().deleteFile(from, false);
}
