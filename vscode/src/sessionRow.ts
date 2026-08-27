import type { SessionRow } from './types';
import { asNum, asObject, asString } from './wire';

/** Parse ACP session summary rows and drop empty / hidden history. */

export function parseSessionRow(item: unknown): SessionRow | undefined {
  const obj = asObject(item);
  const info = asObject(obj['info']);
  const legacy = asObject(obj['legacy']);
  const nestedInfo = asObject(legacy['info']);
  const id =
    asString(obj['id']) ??
    asString(obj['sessionId']) ??
    asString(obj['session_id']) ??
    asString(info['id']) ??
    asString(nestedInfo['id']) ??
    asString(asObject(info['id'])['id']) ??
    '';
  if (!id) {
    return undefined;
  }
  const generated = asString(obj['generated_title']) ?? asString(obj['generatedTitle']);
  const summary = asString(obj['session_summary']) ?? asString(obj['sessionSummary']);
  const named = asString(obj['title']) ?? asString(legacy['title']);
  const title = humanTitle(id, generated, summary, named);
  const hidden = obj['hidden'] === true;
  const sessionKind = asString(obj['session_kind']) ?? asString(obj['sessionKind']);
  const numChatMessages =
    asNum(obj['num_chat_messages']) ?? asNum(obj['numChatMessages']);
  const numMessages = asNum(obj['num_messages']) ?? asNum(obj['numMessages']);
  return {
    id,
    title,
    updatedAt: asString(obj['updated_at']) ?? asString(obj['updatedAt']),
    cwd: asString(info['cwd']) ?? asString(nestedInfo['cwd']),
    hidden,
    sessionKind,
    numChatMessages,
    numMessages,
  };
}

export function sessionHasHistory(row: SessionRow): boolean {
  if (row.hidden) {
    return false;
  }
  const kind = row.sessionKind ?? '';
  if (kind.startsWith('subagent') || kind === 'headless') {
    return false;
  }
  const chats = row.numChatMessages ?? row.numMessages;
  if (chats !== undefined) {
    return chats > 0;
  }
  return Boolean(row.title.trim());
}

function humanTitle(id: string, ...candidates: Array<string | undefined>): string {
  for (const raw of candidates) {
    const text = raw?.trim() ?? '';
    if (text && text !== id) {
      return text;
    }
  }
  return '';
}
