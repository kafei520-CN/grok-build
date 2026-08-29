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
  enabled?: boolean;
}

/** Plugin-owned endpoint row. Source of truth in ~/.grok/vscode-apis.json. */
export interface StoredEndpoint {
  id: string;
  name: string;
  model: string;
  baseUrl: string;
  backend: ApiBackend;
  apiKey?: string;
  enabled: boolean;
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
/** Claude `output_config.effort` — same strings Grok sends on Messages. */
export const CLAUDE_CUSTOM_EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];
export const ANTHROPIC_VERSION = '2023-06-01';

export function looksLikeClaude(input: {
  id?: string;
  name?: string;
  model?: string;
}): boolean {
  return [input.id, input.name, input.model].some((value) =>
    (value ?? '').toLowerCase().includes('claude'),
  );
}

export function usesClaudeEffort(input: ApiEndpointInput): boolean {
  return input.backend === 'messages' || looksLikeClaude(input);
}

export const BACKEND_PATHS: Record<ApiBackend, string> = {
  chat_completions: 'chat/completions',
  responses: 'responses',
  messages: 'messages',
};

const DISABLED_SECTION = 'model-disabled';

export function grokConfigPath(): string {
  return path.join(plat().homeDir(), '.grok', 'config.toml');
}

export function grokApisPath(): string {
  return path.join(plat().homeDir(), '.grok', 'vscode-apis.json');
}

export function safeModelId(raw: string): string {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned.slice(0, 48) || 'model';
}

/** Protocol paths Grok appends itself — never eat a user-supplied /v1. */
const ENDPOINT_SUFFIXES = ['/chat/completions', '/responses', '/messages'];

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
  let pathName = parsed.pathname.replace(/\/+$/, '') || '/';
  for (const suffix of ENDPOINT_SUFFIXES) {
    if (pathName === suffix || pathName.endsWith(suffix)) {
      pathName = pathName.slice(0, pathName.length - suffix.length) || '/';
      break;
    }
  }
  parsed.pathname = pathName === '/' ? '' : pathName;
  parsed.hash = '';
  return parsed.toString().replace(/\/+$/, '');
}

export function previewRequestUrl(raw: string, backend: ApiBackend): string {
  const base = normalizeBaseUrl(raw, backend);
  if (!base) {
    return '';
  }
  return `${base}/${BACKEND_PATHS[backend]}`;
}

/** True when Messages would POST /messages instead of the usual /v1/messages. */
export function messagesBaseUrlMissingVersion(raw: string): boolean {
  try {
    const parsed = new URL(normalizeBaseUrl(raw, 'messages'));
    const pathName = parsed.pathname.replace(/\/+$/, '') || '/';
    return pathName === '/';
  } catch {
    return false;
  }
}

export function validateBaseUrl(raw: string): string {
  const normalized = normalizeBaseUrl(raw);
  if (!normalized) {
    throw new Error('empty url');
  }
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error('invalid url');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('url must be http(s)');
  }
  if (!parsed.hostname) {
    throw new Error('url missing host');
  }
  return normalized;
}

export function parseApiStore(raw: string): StoredEndpoint[] {
  const text = raw.trim();
  if (!text) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return [];
  }
  const rows = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object'
      ? (parsed as { endpoints?: unknown }).endpoints
      : undefined;
  if (!Array.isArray(rows)) {
    return [];
  }
  const out: StoredEndpoint[] = [];
  const seen = new Set<string>();
  for (const item of rows) {
    const row = storedFromUnknown(item);
    if (!row || seen.has(row.id)) {
      continue;
    }
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

export function serializeApiStore(rows: StoredEndpoint[]): string {
  return `${JSON.stringify({ version: 1, endpoints: rows }, null, 2)}\n`;
}

export function upsertStoredEndpoint(
  rows: StoredEndpoint[],
  input: ApiEndpointInput,
): { rows: StoredEndpoint[]; saved: StoredEndpoint } {
  const id = resolveEndpointId(
    rows.map((row) => row.id),
    input.id,
  );
  const existing = rows.find((row) => row.id === id);
  const saved: StoredEndpoint = {
    id,
    name: input.name.trim() || id,
    model: input.model.trim(),
    baseUrl: validateBaseUrl(input.baseUrl),
    backend: input.backend,
    apiKey:
      input.apiKey?.trim() ||
      (input.apiKey === '' ? undefined : existing?.apiKey),
    enabled: input.enabled ?? existing?.enabled ?? true,
  };
  if (!existing) {
    return { rows: [...rows, saved], saved };
  }
  return { rows: rows.map((row) => (row.id === id ? saved : row)), saved };
}

export function applyStoreToToml(toml: string, rows: StoredEndpoint[]): string {
  const managed = new Set(rows.map((row) => row.id));
  let next = toml;
  for (const table of collectTables(next)) {
    if (managed.has(table.id)) {
      next = deleteModelEndpoint(next, table.id);
    }
  }
  for (const row of rows) {
    if (!row.enabled) {
      continue;
    }
    next = appendModelTable(next, row);
  }
  return next;
}

export function parseModelEndpoints(toml: string): ApiEndpoint[] {
  return collectTables(toml).map((table) => toEndpoint(table));
}

export function upsertModelEndpoint(toml: string, input: ApiEndpointInput): string {
  const tables = collectTables(toml);
  const id = resolveEndpointId(
    tables.map((table) => table.id),
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

export function toggleModelEndpoint(toml: string, id: string): string {
  const tables = collectTables(toml);
  const existing = tables.find((table) => table.id === id);
  if (!existing) {
    return toml;
  }
  return upsertModelEndpoint(toml, inputFromTable(existing, { enabled: !existing.enabled }));
}

export function setModelEndpointEnabled(toml: string, id: string, enabled: boolean): string {
  const tables = collectTables(toml);
  const existing = tables.find((table) => table.id === id);
  if (!existing || existing.enabled === enabled) {
    return toml;
  }
  return upsertModelEndpoint(toml, inputFromTable(existing, { enabled }));
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
    next = upsertModelEndpoint(next, inputFromTable(table, { baseUrl: fixed }));
  }
  return next;
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
    next = upsertModelEndpoint(next, inputFromTable(table));
  }
  return next;
}

export async function listApiEndpoints(): Promise<ApiEndpoint[]> {
  const rows = await loadStore();
  await persistStore(rows);
  return rows.map(toPublic);
}

export async function saveApiEndpoint(input: ApiEndpointInput): Promise<ApiEndpoint> {
  validateBaseUrl(input.baseUrl);
  const next = upsertStoredEndpoint(await loadStore(), input);
  await persistStore(next.rows);
  return toPublic(next.saved);
}

export async function removeApiEndpoint(id: string): Promise<void> {
  const rows = (await loadStore()).filter((row) => row.id !== id);
  await persistStore(rows);
}

export async function toggleApiEndpoint(id: string): Promise<ApiEndpoint> {
  const rows = await loadStore();
  const existing = rows.find((row) => row.id === id);
  if (!existing) {
    throw new Error('failed to toggle API endpoint');
  }
  const next = rows.map((row) =>
    row.id === id ? { ...row, enabled: !row.enabled } : row,
  );
  await persistStore(next);
  const saved = next.find((row) => row.id === id);
  if (!saved) {
    throw new Error('failed to toggle API endpoint');
  }
  return toPublic(saved);
}

export async function setApiEndpointEnabled(
  id: string,
  enabled: boolean,
): Promise<ApiEndpoint | undefined> {
  const rows = await loadStore();
  const existing = rows.find((row) => row.id === id);
  if (!existing) {
    return undefined;
  }
  if (existing.enabled === enabled) {
    return toPublic(existing);
  }
  const next = rows.map((row) => (row.id === id ? { ...row, enabled } : row));
  await persistStore(next);
  const saved = next.find((row) => row.id === id);
  return saved ? toPublic(saved) : undefined;
}

interface ModelTable {
  id: string;
  enabled: boolean;
  start: number;
  end: number;
  values: Record<string, string>;
  extra: string[];
}

async function loadStore(): Promise<StoredEndpoint[]> {
  const raw = await readText(grokApisPath());
  if (raw.trim()) {
    return parseApiStore(raw);
  }
  const toml = await readText(grokConfigPath());
  return collectTables(toml).map(storedFromTable);
}

async function persistStore(rows: StoredEndpoint[]): Promise<void> {
  await writeText(grokApisPath(), serializeApiStore(rows));
  const toml = await readText(grokConfigPath());
  const next = applyStoreToToml(toml, rows);
  if (next !== toml) {
    await writeText(grokConfigPath(), next);
  }
}

function storedFromUnknown(raw: unknown): StoredEndpoint | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }
  const obj = raw as Record<string, unknown>;
  const id = typeof obj.id === 'string' ? obj.id.trim() : '';
  const name = typeof obj.name === 'string' ? obj.name.trim() : '';
  const model = typeof obj.model === 'string' ? obj.model.trim() : '';
  const baseUrl = typeof obj.baseUrl === 'string' ? obj.baseUrl.trim() : '';
  if (!id || !model || !baseUrl) {
    return undefined;
  }
  try {
    return {
      id,
      name: name || id,
      model,
      baseUrl: validateBaseUrl(baseUrl),
      backend: normalizeBackend(typeof obj.backend === 'string' ? obj.backend : undefined),
      apiKey: typeof obj.apiKey === 'string' && obj.apiKey.trim() ? obj.apiKey : undefined,
      enabled: obj.enabled !== false,
    };
  } catch {
    return undefined;
  }
}

function storedFromTable(table: ModelTable): StoredEndpoint {
  return {
    id: table.id,
    name: table.values['name'] || table.id,
    model: table.values['model'] || table.id,
    baseUrl: table.values['base_url'] || '',
    backend: normalizeBackend(table.values['api_backend']),
    apiKey: table.values['api_key'] || undefined,
    enabled: table.enabled,
  };
}

function toPublic(row: StoredEndpoint): ApiEndpoint {
  return {
    id: row.id,
    name: row.name,
    model: row.model,
    baseUrl: row.baseUrl,
    backend: row.backend,
    hasKey: Boolean(row.apiKey),
    enabled: row.enabled,
  };
}

function collectTables(toml: string): ModelTable[] {
  const lines = splitLines(toml);
  const tables: ModelTable[] = [];
  let i = 0;
  while (i < lines.length) {
    const header = modelHeader(lines[i]);
    if (!header) {
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
    tables.push({ id: header.id, enabled: header.enabled, start, end, values, extra });
  }
  return tables;
}

function toEndpoint(table: ModelTable): ApiEndpoint {
  const stored = storedFromTable(table);
  return toPublic(stored);
}

function inputFromTable(
  table: ModelTable,
  patch?: Partial<ApiEndpointInput>,
): ApiEndpointInput {
  return {
    id: table.id,
    name: table.values['name'] || table.id,
    model: table.values['model'] || table.id,
    baseUrl: table.values['base_url'] || '',
    backend: normalizeBackend(table.values['api_backend']),
    enabled: table.enabled,
    ...patch,
  };
}

function appendModelTable(toml: string, row: StoredEndpoint): string {
  const body = toml.trimEnd();
  const table = serializeTable(row.id, {
    id: row.id,
    name: row.name,
    model: row.model,
    baseUrl: row.baseUrl,
    backend: row.backend,
    apiKey: row.apiKey,
    enabled: true,
  });
  return `${body}${body ? '\n\n' : ''}${table}\n`;
}

function serializeTable(id: string, input: ApiEndpointInput, existing?: ModelTable): string {
  const key =
    input.apiKey?.trim() ||
    (input.apiKey === '' ? '' : existing?.values['api_key'] ?? '');
  const label = input.name.trim() || input.model.trim() || id;
  const effort = clampEffort(input, existing?.values['reasoning_effort']);
  const efforts = usesClaudeEffort(input)
    ? tomlEffortList(input)
    : existing?.values['reasoning_efforts'] || tomlEffortList(input);
  const enabled = input.enabled ?? existing?.enabled ?? true;
  const section = enabled ? 'model' : DISABLED_SECTION;
  const rows = [
    `[${section}.${tomlTableKey(id)}]`,
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
  const headers = extraHeadersLine(input.backend);
  if (headers) {
    rows.push(headers);
  }
  if (existing?.extra.length) {
    rows.push(
      ...existing.extra.filter((line) => {
        if (isExtraHeadersLine(line)) {
          return false;
        }
        const parsed = parseAssignment(line);
        return !parsed || !MANAGED.has(parsed.key);
      }),
    );
  }
  return rows.join('\n');
}

function clampEffort(input: ApiEndpointInput, raw?: string): string {
  const efforts = effortListFor(input);
  const effort = raw || DEFAULT_CUSTOM_EFFORT;
  return efforts.includes(effort) ? effort : DEFAULT_CUSTOM_EFFORT;
}

function extraHeadersLine(backend: ApiBackend): string | undefined {
  if (backend !== 'messages') {
    return undefined;
  }
  return `extra_headers = { "anthropic-version" = ${tomlString(ANTHROPIC_VERSION)} }`;
}

function isExtraHeadersLine(line: string): boolean {
  return /^\s*extra_headers\s*=/.test(line);
}

function effortListFor(input: ApiEndpointInput): string[] {
  return usesClaudeEffort(input) ? CLAUDE_CUSTOM_EFFORTS : DEFAULT_CUSTOM_EFFORTS;
}

function tomlEffortList(input: ApiEndpointInput): string {
  return `[${effortListFor(input).map((item) => tomlString(item)).join(', ')}]`;
}

function resolveEndpointId(ids: string[], keep?: string): string {
  const keepId = keep?.trim();
  if (keepId && ids.includes(keepId)) {
    return keepId;
  }
  const used = new Set(ids);
  for (let n = 1; n < 10_000; n += 1) {
    const next = `endpoint-${n}`;
    if (!used.has(next)) {
      return next;
    }
  }
  return `endpoint-${Date.now()}`;
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

function modelHeader(line: string): { id: string; enabled: boolean } | undefined {
  const match = line.trim().match(/^\[(model-disabled|model)\.(.+)\]$/);
  if (!match) {
    return undefined;
  }
  return { enabled: match[1] === 'model', id: unquote(match[2]) };
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

function tomlTableKey(id: string): string {
  return JSON.stringify(id);
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

async function readText(file: string): Promise<string> {
  try {
    const bytes = await plat().readFile(file);
    return Buffer.from(bytes).toString('utf8');
  } catch {
    return '';
  }
}

async function writeText(file: string, text: string): Promise<void> {
  const body = text.endsWith('\n') ? text : `${text}\n`;
  await plat().writeFile(file, Buffer.from(body, 'utf8'));
}
