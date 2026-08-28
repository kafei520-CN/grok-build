import { parseSessionUpdate } from './agent';
import { readWorkspaceFile, writeWorkspaceFile } from './clientHandlers';
import { logInfo } from './logger';
import type { PermissionOption, SessionUpdate } from './types';
import { asObject, asString } from './wire';

export interface IncomingHost {
  applyIncomingUpdate(update: SessionUpdate, isReplay: boolean, sessionId?: string): void;
  requestToolPermission(params: unknown): Promise<unknown>;
  journal: { remember(filePath: string): Promise<void> };
  applyModelsUpdate?(params: unknown): void;
}

export async function handleIncoming(
  controller: IncomingHost,
  method: string,
  params: unknown,
  id: number | string,
): Promise<unknown> {
  const name = method.startsWith('_') ? method.slice(1) : method;
  if (name === 'session/update' || name === 'x.ai/session_notification' || name === 'x.ai/session/update') {
    const parsed = parseSessionUpdate(params);
    controller.applyIncomingUpdate(parsed.update, parsed.isReplay, parsed.sessionId);
    return {};
  }
  if (name === 'x.ai/models/update') {
    controller.applyModelsUpdate?.(params);
    return {};
  }
  if (name === 'session/request_permission') {
    return controller.requestToolPermission(params);
  }
  if (name === 'fs/read_text_file') {
    return readWorkspaceFile(params);
  }
  if (name === 'fs/write_text_file') {
    const filePath = asString(asObject(params)['path']);
    if (filePath) {
      await controller.journal.remember(filePath);
    }
    return writeWorkspaceFile(params);
  }
  if (id !== '') {
    logInfo(`unhandled ACP client method ${method}`);
  }
  return {};
}

export function parsePermissionOptions(params: unknown): {
  title: string;
  details?: string;
  options: PermissionOption[];
} {
  const obj = asObject(params);
  const toolCall = asObject(obj['toolCall']);
  const options = Array.isArray(obj['options'])
    ? (obj['options'] as Record<string, unknown>[])
        .map((option) => ({
          optionId:
            asString(option['optionId']) ?? asString(option['option_id']) ?? '',
          name: asString(option['name']) ?? 'Allow',
          kind: asString(option['kind']) ?? 'allow_once',
        }))
        .filter((option) => option.optionId)
    : [];
  return {
    title:
      asString(toolCall['title']) ?? asString(toolCall['kind']) ?? 'Grok wants to run a tool',
    details: describeToolInput(toolCall['rawInput']),
    options,
  };
}

function describeToolInput(raw: unknown): string | undefined {
  if (!raw) {
    return undefined;
  }
  if (typeof raw === 'string') {
    return raw;
  }
  const obj = asObject(raw);
  return (
    asString(obj['command']) ??
    asString(obj['path']) ??
    asString(obj['query']) ??
    JSON.stringify(raw)
  );
}
