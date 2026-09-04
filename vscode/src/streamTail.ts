import type { ChatMessage, ChatStatus, ContextUsage, StreamTail } from './types';

/** 流式游标：只记已下发过的前缀，用来切增量。 */
export type StreamDeltaCursor = {
  id: string;
  text: string;
  thinking: string;
  plan: string;
  meta: string;
};

export function emptyStreamCursor(): StreamDeltaCursor {
  return { id: '', text: '', thinking: '', plan: '', meta: '' };
}

/** 全量 snapshot 之后对齐游标，避免下一次 delta 把已有正文再拼一次。 */
export function cursorFromMessage(message: ChatMessage): StreamDeltaCursor {
  return {
    id: message.id,
    text: message.text,
    thinking: message.thinking ?? '',
    plan: message.plan ?? '',
    meta: streamMetaStamp(message),
  };
}

/** tools/steps/error/images 是否变化；不含正文，避免长输出反复全量序列化。 */
export function streamMetaStamp(message: ChatMessage): string {
  const tools = message.tools
    .map((tool) => `${tool.id}:${tool.status}:${tool.title}:${tool.detail ?? ''}`)
    .join('|');
  const steps = (message.steps ?? []).map((step) => `${step.status}:${step.content}`).join('|');
  const err = message.error
    ? `${message.error.message}:${message.error.retrying ? 1 : 0}:${message.error.attempt ?? ''}`
    : '';
  return `${tools}\n${steps}\n${err}\n${message.images?.length ?? 0}`;
}

/** 把当前助手消息压成 IPC 增量，不携带 edits / 已发送过的正文。 */
export function buildStreamTail(
  cursor: StreamDeltaCursor,
  last: ChatMessage,
  extras: { status: ChatStatus; context?: ContextUsage; queue?: string[] },
): { tail: StreamTail; cursor: StreamDeltaCursor } {
  const reset = last.id !== cursor.id;
  const prevText = reset ? '' : cursor.text;
  const prevThinking = reset ? '' : cursor.thinking;
  const prevPlan = reset ? '' : cursor.plan;
  const prevMeta = reset ? '' : cursor.meta;
  const text = last.text;
  const thinking = last.thinking ?? '';
  const plan = last.plan ?? '';
  const meta = streamMetaStamp(last);
  const canAppendText = text.startsWith(prevText);
  const canAppendThinking = thinking.startsWith(prevThinking);
  const canAppendPlan = plan.startsWith(prevPlan);
  const metaChanged = meta !== prevMeta;
  const textDelta = canAppendText ? text.slice(prevText.length) : '';
  const thinkingDelta = canAppendThinking ? thinking.slice(prevThinking.length) : '';
  const planDelta = canAppendPlan ? plan.slice(prevPlan.length) : '';
  const slim: ChatMessage = {
    id: last.id,
    role: 'assistant',
    text: canAppendText ? '' : text,
    tools: metaChanged ? last.tools.map((tool) => ({ ...tool })) : [],
    streaming: last.streaming,
    createdAt: last.createdAt,
    endedAt: last.endedAt,
    error: last.error,
    modelId: last.modelId,
    modelName: last.modelName,
    effort: last.effort,
  };
  if (!canAppendThinking) {
    slim.thinking = last.thinking;
  }
  if (!canAppendPlan) {
    slim.plan = last.plan;
  }
  if (metaChanged) {
    if (last.steps) {
      slim.steps = last.steps.map((step) => ({ ...step }));
    }
    if (last.images?.length) {
      slim.images = last.images;
    }
  }
  const tail: StreamTail = {
    type: 'tail',
    message: slim,
    status: extras.status,
    context: extras.context,
    queue: extras.queue,
  };
  if (canAppendText) {
    if (textDelta) {
      tail.appendText = textDelta;
    }
  }
  if (canAppendThinking && thinkingDelta) {
    tail.appendThinking = thinkingDelta;
  }
  if (canAppendPlan && planDelta) {
    tail.appendPlan = planDelta;
  }
  return {
    tail,
    cursor: { id: last.id, text, thinking, plan, meta },
  };
}

/** 在 webview 里把增量贴回已有消息，保留 edits / tools。 */
export function mergeStreamTail(last: ChatMessage | undefined, tail: StreamTail): ChatMessage {
  const incoming = tail.message;
  const same = last?.id === incoming.id;
  const text = joinText(same ? last?.text : incoming.text, incoming.text, tail.appendText, same);
  const thinking = joinOptional(
    same ? last?.thinking : incoming.thinking,
    incoming.thinking,
    tail.appendThinking,
    same,
  );
  const plan = joinOptional(same ? last?.plan : incoming.plan, incoming.plan, tail.appendPlan, same);
  const tools = incoming.tools.length > 0 || !same ? incoming.tools : (last?.tools ?? []);
  if (!same || !last) {
    return { ...incoming, text, thinking, plan, tools };
  }
  return {
    ...last,
    ...incoming,
    text,
    thinking,
    plan,
    tools,
    steps: incoming.steps ?? last.steps,
    edits: last.edits,
    images: incoming.images ?? last.images,
  };
}

function joinText(
  base: string | undefined,
  incoming: string | undefined,
  append: string | undefined,
  same: boolean,
): string {
  if (append !== undefined) {
    return `${same ? (base ?? '') : (incoming ?? '')}${append}`;
  }
  if (incoming) {
    return incoming;
  }
  return same ? (base ?? '') : (incoming ?? '');
}

function joinOptional(
  base: string | undefined,
  incoming: string | undefined,
  append: string | undefined,
  same: boolean,
): string | undefined {
  if (append !== undefined) {
    const prefix = same ? (base ?? '') : (incoming ?? '');
    return `${prefix}${append}`;
  }
  if (incoming) {
    return incoming;
  }
  return same ? base : incoming;
}
