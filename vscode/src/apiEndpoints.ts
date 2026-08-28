import * as path from 'node:path';
import { plat } from './platform';
import type { ApiBackend, ApiEndpoint } from './types';

export type { ApiBackend, ApiEndpoint };

export interface ApiEndpointInput {
  id?: string;
  name: string;
  model: string;
  baseUrl: string;
  backend: ApiBackend;
  apiKey?: string;
}

const MANAGED = new Set([
  'model',
  'base_url',
  'name',
  'api_key',
  'api_backend',
  'system_prompt_label',
  'supports_reasoning_effort',
  'reasoning_effort',
  'reasoning_efforts',
]);

export const DEFAULT_CUSTOM_EFFORT = 'high';
export const DEFAULT_CUSTOM_EFFORTS = ['low', 'medium', 'high', 'xhigh'];

export function grokConfigPath(): string {
  return path.join(plat().homeDir(), '.grok', 'config.toml');
}

export function safeModelId(raw: string): string {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned.slice(0, 48) || 'model';
}

const ENDPOINT_SUFFIXES = [
  '/v1/chat/completions',
  '/v1/responses',
  '/v1/messages',
  '/chat/completions',
  '/responses',
  '/messages',
];

export function normalizeBaseUrl(raw: string, _backend: ApiBackend = 'chat_completions'): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return trimmed;
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
  let path = parsed.pathname.replace(/\/+$/, '') || '/';
  for (const suffix of ENDPOINT_SUFFIXES) {
    if (path === suffix || path.endsWith(suffix)) {
      path = path.slice(0, path.length - suffix.length) || '/';
      break;
    }
  }
  if (path === '/' || path === '') {
    path = '/v1';
  }
  parsed.pathname = path;
  parsed.hash = '';
  return parsed.toString().replace(/\/+$/, '');
}

export function repairModelEndpointUrls(toml: string): string {
  let next = toml;
  for (const table of collectTables(toml)) {
    const backend = normalizeBackend(table.values['api_backend']);
    const current = table.values['base_url'] || '';
    const fixed = normalizeBaseUrl(current, backend);
    if (!current || fixed === current) {
      continue;
    }
    next = upsertModelEndpoint(next, {
      id: table.id,
      name: table.values['name'] || table.id,
      model: table.values['model'] || table.id,
      baseUrl: fixed,
      backend,
    });
  }
  return next;
}

export function parseModelEndpoints(toml: string): ApiEndpoint[] {
  return collectTables(toml).map((table) => toEndpoint(table));
}

export function upsertModelEndpoint(toml: string, input: ApiEndpointInput): string {
  const tables = collectTables(toml);
  const id = uniqueId(
    tables,
    input.id?.trim() || safeModelId(input.name || input.model),
    input.id,
  );
  const existing = tables.find((table) => table.id === id);
  const nextTable = serializeTable(id, input, existing);
  if (!existing) {
    const body = toml.trimEnd();
    return `${body}${body ? '\n\n' : ''}${nextTable}\n`;
  }
  return spliceLines(toml, existing.start, existing.end, nextTable.split('\n'));
}

export function deleteModelEndpoint(toml: string, id: string): string {
  const tables = collectTables(toml);
  const existing = tables.find((table) => table.id === id);
  if (!existing) {
    return toml;
  }
  return spliceLines(toml, existing.start, existing.end, []);
}

export function repairCustomModelDefaults(toml: string): string {
  let next = toml;
  for (const table of collectTables(toml)) {
    if (
      table.values['system_prompt_label'] &&
      table.values['supports_reasoning_effort'] === 'true' &&
      table.values['reasoning_effort']
    ) {
      continue;
    }
    const backend = normalizeBackend(table.values['api_backend']);
    next = upsertModelEndpoint(next, {
      id: table.id,
      name: table.values['name'] || table.id,
      model: table.values['model'] || table.id,
      baseUrl: table.values['base_url'] || '',
      backend,
    });
  }
  return next;
}

export async function listApiEndpoints(): Promise<ApiEndpoint[]> {
  const text = await readConfig();
  const next = repairCustomModelDefaults(repairModelEndpointUrls(text));
  if (next !== text) {
    await writeConfig(next);
  }
  return parseModelEndpoints(next);
}

export async function saveApiEndpoint(input: ApiEndpointInput): Promise<ApiEndpoint> {
  const text = await readConfig();
  const next = upsertModelEndpoint(text, input);
  await writeConfig(next);
  const id = uniqueId(
    collectTables(text),
    input.id?.trim() || safeModelId(input.name || input.model),
    input.id,
  );
  const saved = parseModelEndpoints(next).find((item) => item.id === id);
  if (!saved) {
    throw new Error('failed to save API endpoint');
  }
  return saved;
}

export async function removeApiEndpoint(id: string): Promise<void> {
  const text = await readConfig();
  await writeConfig(deleteModelEndpoint(text, id));
}

interface ModelTable {
  id: string;
  start: number;
  end: number;
  values: Record<string, string>;
  extra: string[];
}

function collectTables(toml: string): ModelTable[] {
  const lines = splitLines(toml);
  const tables: ModelTable[] = [];
  let i = 0;
  while (i < lines.length) {
    const id = modelHeader(lines[i]);
    if (!id) {
      i += 1;
      continue;
    }
    const start = i;
    i += 1;
    const values: Record<string, string> = {};
    const extra: string[] = [];
    while (i < lines.length && !isTableHeader(lines[i])) {
      const parsed = parseAssignment(lines[i]);
      if (parsed && MANAGED.has(parsed.key)) {
        values[parsed.key] = parsed.value;
      } else if (lines[i].trim()) {
        extra.push(lines[i]);
      }
      i += 1;
    }
    let end = i;
    while (end > start + 1 && lines[end - 1].trim() === '') {
      end -= 1;
    }
    tables.push({ id, start, end, values, extra });
  }
  return tables;
}

function toEndpoint(table: ModelTable): ApiEndpoint {
  const backend = normalizeBackend(table.values['api_backend']);
  return {
    id: table.id,
    name: table.values['name'] || table.id,
    model: table.values['model'] || table.id,
    baseUrl: table.values['base_url'] || '',
    backend,
    hasKey: Boolean(table.values['api_key']),
  };
}

function serializeTable(id: string, input: ApiEndpointInput, existing?: ModelTable): string {
  const key =
    input.apiKey?.trim() ||
    (input.apiKey === '' ? '' : existing?.values['api_key'] ?? '');
  const label = input.name.trim() || input.model.trim() || id;
  const effort = existing?.values['reasoning_effort'] || DEFAULT_CUSTOM_EFFORT;
  const efforts = existing?.values['reasoning_efforts'] || tomlEffortList();
  const rows = [
    `[model.${id}]`,
    `name = ${tomlString(input.name.trim() || id)}`,
    `model = ${tomlString(input.model.trim())}`,
    `base_url = ${tomlString(normalizeBaseUrl(input.baseUrl, input.backend))}`,
    `api_backend = ${tomlString(input.backend)}`,
    `system_prompt_label = ${tomlString(label)}`,
    'supports_reasoning_effort = true',
    `reasoning_effort = ${tomlString(effort)}`,
    `reasoning_efforts = ${efforts}`,
  ];
  if (key) {
    rows.push(`api_key = ${tomlString(key)}`);
  }
  if (existing?.extra.length) {
    rows.push(
      ...existing.extra.filter((line) => {
        const parsed = parseAssignment(line);
        return !parsed || !MANAGED.has(parsed.key);
      }),
    );
  }
  return rows.join('\n');
}

function tomlEffortList(): string {
  return `[${DEFAULT_CUSTOM_EFFORTS.map((item) => tomlString(item)).join(', ')}]`;
}

function uniqueId(tables: ModelTable[], wanted: string, keep?: string): string {
  if (keep && tables.some((table) => table.id === keep)) {
    return keep;
  }
  const used = new Set(tables.map((table) => table.id));
  if (!used.has(wanted)) {
    return wanted;
  }
  for (let n = 2; n < 100; n += 1) {
    const next = `${wanted}-${n}`;
    if (!used.has(next)) {
      return next;
    }
  }
  return `${wanted}-${Date.now()}`;
}

function spliceLines(toml: string, start: number, end: number, insert: string[]): string {
  const lines = splitLines(toml);
  const head = lines.slice(0, start);
  let tail = lines.slice(end);
  while (head.length && head[head.length - 1] === '') {
    head.pop();
  }
  while (tail.length && tail[0] === '') {
    tail = tail.slice(1);
  }
  const body = insert.filter((line, index) => !(index === insert.length - 1 && line === ''));
  const parts = [head.join('\n').trimEnd(), body.join('\n').trim(), tail.join('\n').trimStart()];
  return `${parts.filter(Boolean).join('\n\n')}\n`;
}

function modelHeader(line: string): string | undefined {
  const match = line.trim().match(/^\[model\.(.+)\]$/);
  if (!match) {
    return undefined;
  }
  return unquote(match[1]);
}

function isTableHeader(line: string): boolean {
  return /^\s*\[[^\]]+\]\s*$/.test(line);
}

function parseAssignment(line: string): { key: string; value: string } | undefined {
  const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.+?)\s*$/);
  if (!match) {
    return undefined;
  }
  const value = match[2].trim();
  if (value.startsWith('{')) {
    return undefined;
  }
  return { key: match[1], value: unquote(value) };
}

function unquote(raw: string): string {
  const text = raw.trim();
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    return text.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n');
  }
  return text;
}

function tomlString(value: string): string {
  return JSON.stringify(value);
}

function normalizeBackend(raw?: string): ApiBackend {
  if (raw === 'responses' || raw === 'messages' || raw === 'chat_completions') {
    return raw;
  }
  return 'chat_completions';
}

function splitLines(text: string): string[] {
  return text.replace(/\r\n/g, '\n').split('\n');
}

async function readConfig(): Promise<string> {
  try {
    const bytes = await plat().readFile(grokConfigPath());
    return Buffer.from(bytes).toString('utf8');
  } catch {
    return '';
  }
}

async function writeConfig(text: string): Promise<void> {
  const file = grokConfigPath();
  await plat().writeFile(file, Buffer.from(text.endsWith('\n') ? text : `${text}\n`, 'utf8'));
}
