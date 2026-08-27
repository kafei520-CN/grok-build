import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import {
  CLIENT_IDENTIFIER,
  EXT,
  PROTOCOL_VERSION,
} from './constants';
import { logError, logInfo, logWarn } from './logger';
import { JsonRpcConnection } from './rpc';
import { parseSessionRow, sessionHasHistory } from './sessionRow';
import { asNum, asObject, asString, timesFromMeta } from './wire';
import type {
  AccountInfo,
  AuthMethodWire,
  AuthUrlMode,
  ContentBlock,
  InitializeResult,
  SessionNewResult,
  SessionRow,
  SessionUpdate,
  SlashCommandInfo,
} from './types';
import type { AuthMethodInfo } from './authMethods';

export interface AgentOptions {
  cliPath: string;
  cwd: string;
  alwaysApprove: boolean;
  extensionVersion: string;
}

export type IncomingHandler = (
  method: string,
  params: unknown,
  id: number | string,
) => Promise<unknown> | unknown;

export class GrokAgent {
  private child: ChildProcessWithoutNullStreams;
  readonly rpc: JsonRpcConnection;
  initializeResult?: InitializeResult;
  sessionId?: string;
  private extensionVersion = '0.0.0';

  private constructor(
    child: ChildProcessWithoutNullStreams,
    rpc: JsonRpcConnection,
  ) {
    this.child = child;
    this.rpc = rpc;
  }

  static spawn(options: AgentOptions, onIncoming: IncomingHandler): GrokAgent {
    const args = ['agent'];
    if (options.alwaysApprove) {
      args.push('--always-approve');
    }
    args.push('stdio');
    logInfo(`spawning ${options.cliPath} ${args.join(' ')} (cwd=${options.cwd})`);
    const child = spawn(options.cliPath, args, {
      cwd: options.cwd,
      env: {
        ...process.env,
        GROK_NO_AUTO_UPDATE: '1',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    const rpc = new JsonRpcConnection(child.stdin);
    const agent = new GrokAgent(child, rpc);
    agent.extensionVersion = options.extensionVersion;

    rpc.on('log', (message: string) => logWarn(message));
    child.stdout.on('data', (chunk: Buffer) => rpc.feed(chunk));
    child.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf8').trimEnd();
      if (text) {
        logWarn(`agent stderr: ${text}`);
      }
    });
    child.on('error', (error) => {
      logError('failed to spawn grok agent', error);
      rpc.close(error);
    });
    child.on('exit', (code, signal) => {
      logInfo(`agent exited code=${code} signal=${signal ?? ''}`);
      rpc.close(new Error(`grok agent exited (${code ?? signal})`));
    });

    rpc.on('request', (method: string, params: unknown, id: number | string) => {
      Promise.resolve(onIncoming(method, params, id))
        .then((result) => rpc.respond(id, result ?? {}))
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          logError(`client method ${method} failed`, error);
          rpc.respondError(id, message);
        });
    });
    rpc.on('notification', (method: string, params: unknown) => {
      void onIncoming(method, params, /* id */ '');
    });

    return agent;
  }

  get pid(): number | undefined {
    return this.child.pid;
  }

  async initialize(): Promise<InitializeResult> {
    const result = (await this.rpc.request('initialize', {
      protocolVersion: PROTOCOL_VERSION,
      clientInfo: {
        name: 'grok-vscode',
        version: this.extensionVersion,
      },
      clientCapabilities: {
        fs: { readTextFile: true, writeTextFile: true },
        terminal: false,
      },
      _meta: {
        clientType: 'extension',
        clientIdentifier: CLIENT_IDENTIFIER,
        clientVersion: this.extensionVersion,
      },
    })) as InitializeResult;
    this.initializeResult = result;
    return result;
  }

  authMethods(): AuthMethodInfo[] {
    const raw = this.initializeResult?.authMethods ?? [];
    return raw.map(normalizeAuthMethod).filter((m): m is AuthMethodInfo => Boolean(m));
  }

  defaultAuthMethodId(): string | undefined {
    const meta = this.initializeResult?._meta;
    return asString(meta?.['defaultAuthMethodId']);
  }

  agentVersion(): string | undefined {
    return asString(this.initializeResult?._meta?.['agentVersion']);
  }

  async authenticate(
    methodId: string,
    meta?: Record<string, unknown>,
  ): Promise<unknown> {
    return this.rpc.request('authenticate', {
      methodId,
      _meta: meta,
    });
  }

  async extMethod(method: string, params: unknown = {}): Promise<unknown> {
    const rpcMethod = method.startsWith('_') ? method : `_${method}`;
    return this.rpc.request(rpcMethod, params ?? {});
  }

  async getAuthUrl(): Promise<{ url?: string; mode?: AuthUrlMode }> {
    const raw = await this.extMethod(EXT.authGetUrl, {});
    const value = unwrapExt(raw);
    const url = asString(value['auth_url']);
    const mode = asString(value['mode']) as AuthUrlMode | undefined;
    return { url, mode };
  }

  async submitAuthCode(code: string): Promise<void> {
    await this.extMethod(EXT.authSubmitCode, { code });
  }

  async cancelAuth(requestSeq?: number): Promise<void> {
    await this.extMethod(EXT.authCancel, { request_seq: requestSeq });
  }

  async logout(): Promise<void> {
    await this.extMethod(EXT.authLogout, {});
  }

  async authInfo(): Promise<AccountInfo> {
    const raw = await this.extMethod(EXT.authInfo, {});
    const value = unwrapExt(raw);
    return {
      email: asString(value['email']),
      firstName: asString(value['firstName']) ?? asString(value['first_name']),
      lastName: asString(value['lastName']) ?? asString(value['last_name']),
      methodId: asString(value['methodId']) ?? asString(value['method_id']),
    };
  }

  async setApiKey(key: string): Promise<void> {
    await this.extMethod(EXT.setApiKey, { key });
  }

  async newSession(
    cwd: string,
    extraMeta?: Record<string, unknown>,
  ): Promise<SessionNewResult> {
    const result = (await this.rpc.request('session/new', {
      cwd,
      mcpServers: [],
      _meta: extraMeta,
    })) as SessionNewResult;
    this.sessionId = result.sessionId;
    return result;
  }

  async prompt(blocks: ContentBlock[]): Promise<unknown> {
    if (!this.sessionId) {
      throw new Error('No active session');
    }
    return this.rpc.request('session/prompt', {
      sessionId: this.sessionId,
      prompt: blocks,
    });
  }

  cancelTurn(): void {
    if (!this.sessionId) {
      return;
    }
    this.rpc.notify('session/cancel', { sessionId: this.sessionId });
  }

  async setModel(modelId: string, meta?: Record<string, unknown>): Promise<void> {
    if (!this.sessionId) {
      return;
    }
    await this.rpc.request('session/set_model', {
      sessionId: this.sessionId,
      modelId,
      _meta: meta,
    });
  }

  async setMode(modeId: string): Promise<void> {
    if (!this.sessionId) {
      return;
    }
    await this.rpc.request('session/set_mode', {
      sessionId: this.sessionId,
      modeId,
    });
  }

  async loadSession(sessionId: string, cwd: string): Promise<SessionNewResult> {
    const result = (await this.rpc.request('session/load', {
      sessionId,
      cwd,
      mcpServers: [],
    })) as SessionNewResult;
    this.sessionId = result.sessionId ?? sessionId;
    return result;
  }

  async compact(note?: string): Promise<void> {
    if (!this.sessionId) {
      return;
    }
    await this.extMethod(EXT.compact, {
      sessionId: this.sessionId,
      userContext: note,
    });
  }

  async listRecentSessions(limit = 40): Promise<SessionRow[]> {
    const raw = await this.extMethod(EXT.sessionRecent, { limit });
    const value = unwrapExt(raw);
    const list = Array.isArray(value)
      ? value
      : Array.isArray(value['session_summaries'])
        ? (value['session_summaries'] as unknown[])
        : Array.isArray(value['sessions'])
          ? (value['sessions'] as unknown[])
          : [];
    return list
      .map(parseSessionRow)
      .filter((row): row is SessionRow => Boolean(row) && sessionHasHistory(row));
  }

  async sessionInfo(): Promise<Record<string, unknown>> {
    const raw = await this.extMethod(EXT.sessionInfo, {
      sessionId: this.sessionId,
    });
    return unwrapExt(raw);
  }

  async renameSession(title: string, resetToAuto = false): Promise<void> {
    if (!this.sessionId) {
      return;
    }
    await this.extMethod(EXT.sessionRename, {
      sessionId: this.sessionId,
      title,
      resetToAuto,
    });
  }

  async deleteSession(sessionId?: string): Promise<void> {
    const id = sessionId ?? this.sessionId;
    if (!id) {
      return;
    }
    await this.extMethod(EXT.sessionDelete, { sessionId: id });
  }

  async forkSession(): Promise<string | undefined> {
    if (!this.sessionId) {
      return undefined;
    }
    const raw = await this.extMethod(EXT.sessionFork, { sessionId: this.sessionId });
    const value = unwrapExt(raw);
    return asString(value['sessionId']) ?? asString(value['session_id']);
  }

  async usage(): Promise<Record<string, unknown>> {
    const raw = await this.extMethod(EXT.sessionUsage, {
      sessionId: this.sessionId,
    });
    return unwrapExt(raw);
  }

  async rewindPoints(): Promise<Array<{ index: number; preview?: string }>> {
    if (!this.sessionId) {
      return [];
    }
    const raw = await this.extMethod(EXT.rewindPoints, { sessionId: this.sessionId });
    const value = unwrapExt(raw);
    const points = value['rewind_points'] ?? value['rewindPoints'] ?? value;
    if (!Array.isArray(points)) {
      return [];
    }
    return points.map((item, i) => {
      const obj = asObject(item);
      return {
        index:
          typeof obj['prompt_index'] === 'number'
            ? obj['prompt_index']
            : typeof obj['index'] === 'number'
              ? obj['index']
              : i,
        preview:
          asString(obj['preview']) ??
          asString(obj['text']) ??
          asString(obj['prompt']) ??
          `Turn ${i + 1}`,
      };
    });
  }

  async rewindTo(index: number): Promise<void> {
    if (!this.sessionId) {
      return;
    }
    await this.extMethod(EXT.rewindExecute, {
      sessionId: this.sessionId,
      targetPromptIndex: index,
    });
  }

  async commandsList(): Promise<SlashCommandInfo[]> {
    try {
      const raw = await this.extMethod(EXT.commandsList, {
        sessionId: this.sessionId,
      });
      const value = unwrapExt(raw);
      const list =
        (value['availableCommands'] as unknown[]) ??
        (value['commands'] as unknown[]) ??
        (Array.isArray(value) ? value : []);
      if (!Array.isArray(list)) {
        return this.availableCommands();
      }
      return list
        .map(parseCommand)
        .filter((cmd): cmd is SlashCommandInfo => Boolean(cmd?.name));
    } catch {
      return this.availableCommands();
    }
  }

  availableCommands(): SlashCommandInfo[] {
    const raw = this.initializeResult?._meta?.['availableCommands'];
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw
      .map(parseCommand)
      .filter((cmd): cmd is SlashCommandInfo => Boolean(cmd?.name));
  }

  async promptHistory(): Promise<string[]> {
    const raw = await this.extMethod(EXT.promptHistory, {
      sessionId: this.sessionId,
      cwd: undefined,
    });
    const value = unwrapExt(raw);
    const list =
      (value['prompts'] as unknown[]) ??
      (value['history'] as unknown[]) ??
      (Array.isArray(value) ? value : []);
    if (!Array.isArray(list)) {
      return [];
    }
    return list
      .map((item) =>
        typeof item === 'string' ? item : asString(asObject(item)['text']) ?? '',
      )
      .filter(Boolean);
  }

  async extDump(method: string, extra?: Record<string, unknown>): Promise<string> {
    const raw = await this.extMethod(method, {
      sessionId: this.sessionId,
      ...extra,
    });
    return JSON.stringify(unwrapExt(raw), null, 2);
  }

  async interject(text: string): Promise<void> {
    if (!this.sessionId) {
      return;
    }
    await this.extMethod(EXT.interject, {
      sessionId: this.sessionId,
      text,
    });
  }

  async sendFeedback(text: string): Promise<void> {
    await this.extMethod(EXT.feedback, {
      session_id: this.sessionId,
      feedback_text: text,
    });
  }

  async setPrivacyOptOut(optOut: boolean): Promise<void> {
    await this.extMethod(EXT.privacySet, { optOut });
  }

  dispose(): void {
    this.rpc.close();
    if (!this.child.killed) {
      this.child.kill();
    }
  }
}

export function parseSessionUpdate(params: unknown): {
  sessionId?: string;
  isReplay: boolean;
  update: SessionUpdate;
} {
  const obj = asObject(params);
  const update = asObject(obj['update']);
  const meta = asObject(obj['_meta'] ?? obj['meta']);
  const updateMeta = asObject(update['_meta'] ?? update['meta']);
  const noticeTimes = timesFromMeta(meta);
  const updateTimes = timesFromMeta(updateMeta);
  return {
    sessionId: asString(obj['sessionId']),
    isReplay:
      meta['isReplay'] === true ||
      updateMeta['isReplay'] === true ||
      meta['is_replay'] === true,
    update: {
      sessionUpdate: asString(update['sessionUpdate']),
      content: update['content'] as SessionUpdate['content'],
      toolCallId: asString(update['toolCallId']),
      title: asString(update['title']),
      kind: asString(update['kind']),
      status: asString(update['status']),
      rawInput: update['rawInput'],
      rawOutput: update['rawOutput'],
      locations: update['locations'] as SessionUpdate['locations'],
      currentModelId: asString(update['currentModelId']),
      currentModeId:
        asString(update['currentModeId']) ?? asString(update['modeId']),
      modeId: asString(update['modeId']),
      availableCommands: Array.isArray(update['availableCommands'])
        ? (update['availableCommands'] as SlashCommandInfo[])
        : undefined,
      used: asNum(update['used']),
      size: asNum(update['size']),
      total: asNum(update['total']),
      turnStartMs: updateTimes.turnStartMs ?? noticeTimes.turnStartMs,
      streamStartMs: updateTimes.streamStartMs ?? noticeTimes.streamStartMs,
      agentTimestampMs: updateTimes.agentTimestampMs ?? noticeTimes.agentTimestampMs,
    },
  };
}

export function textFromContent(content: SessionUpdate['content']): string {
  if (!content) {
    return '';
  }
  const blocks = Array.isArray(content) ? content : [content];
  return blocks.map((block) => block.text ?? '').join('');
}

export function imagesFromContent(
  content: SessionUpdate['content'],
): Array<{ mimeType: string; data?: string; uri?: string }> {
  if (!content) {
    return [];
  }
  const blocks = Array.isArray(content) ? content : [content];
  return blocks
    .filter((block) => block.type === 'image' || Boolean(block.data) || Boolean(block.mimeType))
    .filter((block) => block.type === 'image' || (block.mimeType?.startsWith('image/') ?? false))
    .map((block) => ({
      mimeType: block.mimeType ?? 'image/png',
      data: block.data,
      uri: block.uri,
    }));
}

function normalizeAuthMethod(raw: AuthMethodWire): AuthMethodInfo | undefined {
  const record = raw as unknown as Record<string, unknown>;
  const nested = asObject(record['agent'] ?? record);
  const id = raw.id ?? asString(nested['id']) ?? asString(record['methodId']);
  if (!id) {
    return undefined;
  }
  return {
    id,
    name: raw.name ?? asString(nested['name']) ?? id,
    description: raw.description ?? asString(nested['description']),
    meta: raw._meta ?? raw.meta ?? asObject(nested['_meta'] ?? nested['meta']),
  };
}

function unwrapExt(raw: unknown): Record<string, unknown> {
  if (Array.isArray(raw)) {
    return { sessions: raw };
  }
  const obj = asObject(raw);
  const inner = obj['result'];
  if (Array.isArray(inner)) {
    return { sessions: inner };
  }
  if (inner && typeof inner === 'object') {
    return asObject(inner);
  }
  return obj;
}

function parseCommand(item: unknown): SlashCommandInfo | undefined {
  const obj = asObject(item);
  const name = asString(obj['name']);
  if (!name) {
    return undefined;
  }
  const input = asObject(obj['input']);
  return {
    name,
    description: asString(obj['description']) ?? name,
    hint: asString(obj['hint']) ?? asString(input['hint']),
  };
}
