import type { ContextMeter } from './contextMeter';
import { editsFromToolUpdate, mergeEdits } from './edits';
import { formatRetryUpdate } from './errors';
import { FALLBACK_COMMANDS } from './slash';
import type {
  ChatMessage,
  ChatState,
  PlanStep,
  PlanStepStatus,
  SessionUpdate,
  SlashCommandInfo,
} from './types';
import { asObject, asString } from './wire';

export interface SessionView {
  replaying: boolean;
  messages: ChatMessage[];
  nextTurn(): number;
  modeId: string;
  models?: ChatState['models'];
  commands: SlashCommandInfo[];
  meter: ContextMeter;
  rememberFile: (filePath: string) => Promise<void>;
  capturePrevious: (filePath: string, previous: string) => void;
  displayPath: (filePath: string) => string;
  emitUnlessReplaying: () => void;
  refreshEditStats?: (assistant: ChatMessage) => void;
}

export function parsePlanEntries(raw: unknown): PlanStep[] | undefined {
  const list = Array.isArray(raw) ? raw : asObject(raw)['entries'];
  if (!Array.isArray(list)) {
    return undefined;
  }
  const steps: PlanStep[] = [];
  for (const item of list) {
    const obj = asObject(item);
    const content =
      asString(obj['content']) ?? asString(obj['title']) ?? asString(obj['text']);
    if (!content) {
      continue;
    }
    steps.push({
      content,
      status: planStepStatus(asString(obj['status']), asObject(obj['_meta'] ?? obj['meta'])),
    });
  }
  return steps;
}

function planStepStatus(raw: string | undefined, meta: Record<string, unknown>): PlanStepStatus {
  const status = (raw ?? '').toLowerCase().replace(/-/g, '_');
  if (status === 'completed' || status === 'complete' || status === 'done') {
    if (meta['cancelled'] === true || meta['failed'] === true) {
      return 'failed';
    }
    return 'completed';
  }
  if (
    status === 'in_progress' ||
    status === 'inprogress' ||
    status === 'running' ||
    status === 'active'
  ) {
    return 'in_progress';
  }
  if (status === 'failed' || status === 'error' || status === 'cancelled' || status === 'canceled') {
    return 'failed';
  }
  if (status === 'abandoned' || status === 'skipped' || status === 'stopped') {
    return 'abandoned';
  }
  return 'pending';
}

export function freezeTurnSteps(message: ChatMessage): void {
  if (!message.steps?.length) {
    return;
  }
  message.steps = message.steps.map((step) => {
    if (step.status === 'completed' || step.status === 'failed' || step.status === 'abandoned') {
      return step;
    }
    return { ...step, status: 'abandoned' };
  });
}

function applySteps(
  assistant: ChatMessage,
  steps: PlanStep[] | undefined,
  replay: boolean,
): void {
  if (!steps?.length) {
    return;
  }
  if (!replay && !assistant.streaming && assistant.steps?.length) {
    return;
  }
  assistant.steps = steps;
}

export function applySessionUpdate(session: SessionView, update: SessionUpdate): void {
  const replay = session.replaying;
  const kind = update.sessionUpdate;
  if (kind === 'current_mode_update') {
    const mode = update.currentModeId ?? update.modeId;
    if (mode) {
      session.modeId = mode;
    }
    session.emitUnlessReplaying();
    return;
  }
  if (kind === 'current_model_update') {
    const id = update.currentModelId;
    if (id && session.models) {
      session.models = { ...session.models, currentId: id };
    }
    session.emitUnlessReplaying();
    return;
  }
  if (kind === 'available_commands_update' && update.availableCommands) {
    session.commands = mergeCommands(update.availableCommands, FALLBACK_COMMANDS);
    session.emitUnlessReplaying();
    return;
  }
  if (session.meter.applyUpdate(update)) {
    session.emitUnlessReplaying();
    return;
  }
  if (kind === 'retry_state' || kind === 'auto_compact_failed') {
    const assistant = ensureAssistant(session, replay, update);
    assistant.error = formatRetryUpdate(update);
    if (!assistant.error.retrying) {
      assistant.streaming = false;
    }
    session.emitUnlessReplaying();
    return;
  }
  if (kind === 'user_message_chunk') {
    if (!replay) {
      return;
    }
    const text = textFromContent(update.content);
    const last = session.messages.at(-1);
    if (last?.role === 'assistant') {
      last.streaming = false;
      stampTimes(last, update, true);
    }
    if (last?.role === 'user') {
      last.text += text;
      stampTimes(last, update, true);
    } else {
      session.messages.push({
        id: `user-replay-${session.nextTurn()}`,
        role: 'user',
        text,
        tools: [],
        createdAt: isoFromMs(update.turnStartMs ?? update.agentTimestampMs) ?? new Date().toISOString(),
      });
    }
    session.emitUnlessReplaying();
    return;
  }
  if (kind === 'diff_review') {
    const last = session.messages.filter((item) => item.role === 'assistant').at(-1);
    if (last) {
      applyTool(session, last, update);
    }
    session.emitUnlessReplaying();
    return;
  }
  if (
    kind !== 'agent_message_chunk' &&
    kind !== 'agent_thought_chunk' &&
    kind !== 'tool_call' &&
    kind !== 'tool_call_update' &&
    kind !== 'plan'
  ) {
    return;
  }
  const assistant = ensureAssistant(session, replay, update);
  if (kind === 'agent_message_chunk') {
    assistant.text += textFromContent(update.content);
    if (assistant.error?.retrying) {
      assistant.error = undefined;
    }
  } else if (kind === 'agent_thought_chunk') {
    assistant.thinking = (assistant.thinking ?? '') + textFromContent(update.content);
  } else if (kind === 'tool_call' || kind === 'tool_call_update') {
    applyTool(session, assistant, update);
    applySteps(assistant, parsePlanEntries(todoListFromUpdate(update)), replay);
  } else if (kind === 'plan') {
    const steps = parsePlanEntries(todoListFromUpdate(update) ?? update.entries);
    if (steps !== undefined) {
      applySteps(assistant, steps, replay);
    } else {
      const planText = textFromContent(update.content);
      if (planText) {
        assistant.plan = (assistant.plan ?? '') + planText;
      }
    }
  }
  const images = imagesFromContent(update.content);
  if (images.length > 0) {
    assistant.images = [...(assistant.images ?? []), ...images];
  }
  session.emitUnlessReplaying();
}

export function captureModels(meta: Record<string, unknown> | undefined): ChatState['models'] | undefined {
  const modelState = asObject(meta?.['modelState'] ?? meta);
  const currentId =
    asString(modelState['currentModelId']) ??
    asString(asObject(modelState['currentModelId'])['currentModelId']);
  const availableRaw = modelState['availableModels'];
  const available = Array.isArray(availableRaw)
    ? availableRaw
        .map((item) => {
          const obj = asObject(item);
          const id =
            asString(obj['modelId']) ??
            asString(asObject(obj['modelId'])['modelId']) ??
            asString(obj['id']);
          const name = asString(obj['name']) ?? id;
          const extra = asObject(obj['_meta'] ?? obj['meta']);
          const effort = asString(extra['reasoningEffort']);
          const effortsRaw = extra['reasoningEfforts'];
          const efforts = Array.isArray(effortsRaw)
            ? effortsRaw
                .map((entry) => asString(asObject(entry)['id']) ?? asString(asObject(entry)['value']))
                .filter((value): value is string => Boolean(value))
            : undefined;
          return id ? { id, name: name ?? id, currentEffort: effort, efforts } : undefined;
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
    : [];
  if (available.length === 0) {
    return undefined;
  }
  return { currentId: currentId ?? available[0].id, available };
}

export function modelsFromResult(result: {
  models?: unknown;
  _meta?: Record<string, unknown>;
}): ChatState['models'] | undefined {
  const obj = asObject(result);
  if (obj['models'] !== undefined && obj['models'] !== null) {
    return captureModels(asObject(obj['models']));
  }
  if (obj['_meta'] !== undefined && obj['_meta'] !== null) {
    const fromMeta = captureModels(asObject(obj['_meta']));
    if (fromMeta) {
      return fromMeta;
    }
  }
  const nested = obj['result'];
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const fromResult = captureModels(asObject(nested));
    if (fromResult) {
      return fromResult;
    }
  }
  return captureModels(obj);
}

export function mergeModelCatalog(
  prev: ChatState['models'] | undefined,
  incoming: unknown,
): ChatState['models'] | undefined {
  const obj = asObject(incoming);
  const nested = obj['result'];
  const payload =
    nested && typeof nested === 'object' && !Array.isArray(nested) ? asObject(nested) : obj;
  const parsed = captureModels(payload);
  if (!parsed) {
    return undefined;
  }
  const prevById = new Map((prev?.available ?? []).map((model) => [model.id, model]));
  const available = parsed.available.map((model) => {
    const old = prevById.get(model.id);
    if (!old?.currentEffort) {
      return model;
    }
    return {
      ...model,
      currentEffort: old.currentEffort,
      efforts: model.efforts ?? old.efforts,
    };
  });
  return { currentId: prev?.currentId ?? parsed.currentId, available };
}

export function mergeCommands(
  primary: SlashCommandInfo[],
  fallback: SlashCommandInfo[],
): SlashCommandInfo[] {
  const seen = new Set<string>();
  const out: SlashCommandInfo[] = [];
  for (const cmd of [...primary, ...fallback]) {
    const key = cmd.name.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(cmd);
  }
  return out;
}

function ensureAssistant(
  session: SessionView,
  replay: boolean,
  update: SessionUpdate,
): ChatMessage {
  const last = session.messages.at(-1);
  if (last?.role === 'assistant') {
    stampTimes(last, update, replay);
    stampTurnModel(last, session.models);
    return last;
  }
  const assistant: ChatMessage = {
    id: `assistant-${session.nextTurn()}`,
    role: 'assistant',
    text: '',
    thinking: '',
    tools: [],
    streaming: !replay,
    createdAt:
      isoFromMs(update.turnStartMs ?? update.streamStartMs ?? update.agentTimestampMs) ??
      (replay ? undefined : new Date().toISOString()),
  };
  stampTimes(assistant, update, replay);
  stampTurnModel(assistant, session.models);
  session.messages.push(assistant);
  return assistant;
}

export function catalogTurnModel(models: ChatState['models'] | undefined): {
  modelId?: string;
  modelName?: string;
  effort?: string;
} {
  const id = models?.currentId;
  const model = models?.available.find((item) => item.id === id);
  if (!id && !model) {
    return {};
  }
  return {
    modelId: id ?? model?.id,
    modelName: model?.name ?? id,
    effort: model?.currentEffort,
  };
}

export function stampTurnModel(
  message: ChatMessage,
  models: ChatState['models'] | undefined,
): void {
  if (message.role !== 'assistant') {
    return;
  }
  const stamp = catalogTurnModel(models);
  if (!message.modelId && stamp.modelId) {
    message.modelId = stamp.modelId;
  }
  if (!message.modelName && stamp.modelName) {
    message.modelName = stamp.modelName;
  }
  if (!message.effort && stamp.effort) {
    message.effort = stamp.effort;
  }
}

function todoListFromUpdate(update: SessionUpdate): unknown {
  if (update.entries !== undefined) {
    return update.entries;
  }
  return listFromRaw(update.rawOutput) ?? listFromRaw(update.rawInput);
}

function listFromRaw(raw: unknown): unknown {
  if (raw == null) {
    return undefined;
  }
  if (Array.isArray(raw)) {
    return raw;
  }
  const obj = asObject(raw);
  if (Array.isArray(obj['todos'])) {
    return obj['todos'];
  }
  if (Array.isArray(obj['entries'])) {
    return obj['entries'];
  }
  const updated = asObject(obj['TodosUpdated']);
  if (Array.isArray(updated['todos'])) {
    return updated['todos'];
  }
  const nested = asObject(obj['output']);
  if (Array.isArray(nested['todos'])) {
    return nested['todos'];
  }
  if (Array.isArray(nested['entries'])) {
    return nested['entries'];
  }
  return undefined;
}

function isTodoTool(update: SessionUpdate): boolean {
  const text = `${update.kind ?? ''} ${update.title ?? ''} ${update.toolCallId ?? ''}`.toLowerCase();
  if (text.includes('todo') || text.includes('updating plan')) {
    return true;
  }
  return false;
}

function applyTool(session: SessionView, assistant: ChatMessage, update: SessionUpdate): void {
  if (isTodoTool(update)) {
    return;
  }
  const id = update.toolCallId ?? `tool-${assistant.tools.length}`;
  let card = assistant.tools.find((tool) => tool.id === id);
  if (!card) {
    card = {
      id,
      title: update.title ?? id,
      kind: update.kind,
      status: update.status ?? 'pending',
    };
    assistant.tools.push(card);
  }
  if (update.title) {
    card.title = update.title;
  }
  if (update.kind) {
    card.kind = update.kind;
  }
  if (update.status) {
    card.status = update.status;
  }
  const location = update.locations?.[0]?.path;
  if (location) {
    card.detail = location;
  }
  const found = editsFromToolUpdate(update);
  const status = update.status ?? card.status;
  for (const edit of found) {
    if (edit.previous !== undefined) {
      session.capturePrevious(edit.path, edit.previous);
    } else if (!session.replaying && status !== 'completed' && status !== 'failed') {
      void session.rememberFile(edit.path);
    }
  }
  const labeled = found.map((edit) => ({
    ...edit,
    path: session.displayPath(edit.path),
  }));
  if (labeled.length > 0) {
    assistant.edits = mergeEdits([...(assistant.edits ?? []), ...labeled]);
    if (status === 'completed') {
      session.refreshEditStats?.(assistant);
    }
  }
}

export function isoFromMs(ms?: number): string | undefined {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) {
    return undefined;
  }
  return new Date(ms).toISOString();
}

export function stampTimes(message: ChatMessage, update: SessionUpdate, replay: boolean): void {
  const start = isoFromMs(update.turnStartMs ?? update.streamStartMs ?? update.agentTimestampMs);
  if (start && !message.createdAt) {
    message.createdAt = start;
  }
  const at = isoFromMs(update.agentTimestampMs);
  if (replay && at) {
    message.endedAt = at;
  }
}

export function finalizeReplayTimes(messages: ChatMessage[]): void {
  for (const message of messages) {
    message.streaming = false;
    if (message.createdAt && !message.endedAt) {
      message.endedAt = message.createdAt;
    }
  }
}

function textFromContent(content: SessionUpdate['content']): string {
  if (!content) {
    return '';
  }
  const blocks = Array.isArray(content) ? content : [content];
  return blocks.map((block) => block.text ?? '').join('');
}

function imagesFromContent(
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
