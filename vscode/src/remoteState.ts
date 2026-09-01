/** One WS text frame Safari can parse without freezing the boot spinner. */
export const REMOTE_STATE_SOFT = 96 * 1024;
/** Target size of each follow-up message batch. */
export const REMOTE_CHUNK = 64 * 1024;

let hydrateSeq = 0;

export function packRemotePayload(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') {
    return [JSON.stringify(payload)];
  }
  const row = payload as { type?: string; state?: Record<string, unknown>; payload?: { files?: unknown[] } };
  if (row.type === 'diff') {
    return packDiff(row);
  }
  if (row.type !== 'state' || !row.state || typeof row.state !== 'object') {
    return [JSON.stringify(payload)];
  }
  const raw = JSON.stringify(payload);
  if (byteLen(raw) <= REMOTE_STATE_SOFT) {
    return [raw];
  }
  const messages = Array.isArray(row.state.messages) ? row.state.messages : [];
  if (messages.length === 0) {
    return [raw];
  }
  return packState(row.state, messages);
}

function packState(state: Record<string, unknown>, messages: unknown[]): string[] {
  const chunks = chunkMessages(messages);
  const id = ++hydrateSeq;
  const tail = chunks.at(-1) ?? [];
  const slim = {
    ...state,
    messages: tail,
    restoringSession: tail.length === 0 && chunks.length > 0 ? true : state.restoringSession,
  };
  const boot = JSON.stringify({ type: 'state', state: slim, hydrate: id });
  if (byteLen(boot) <= REMOTE_STATE_SOFT) {
    const frames = [boot];
    for (let i = chunks.length - 2; i >= 0; i -= 1) {
      frames.push(
        JSON.stringify({
          type: 'messages',
          messages: chunks[i],
          prepend: true,
          hydrate: id,
          done: i === 0,
        }),
      );
    }
    return frames;
  }
  const empty = {
    ...state,
    messages: [],
    restoringSession: true,
  };
  const frames = [JSON.stringify({ type: 'state', state: empty, hydrate: id })];
  for (let i = 0; i < chunks.length; i += 1) {
    frames.push(
      JSON.stringify({
        type: 'messages',
        messages: chunks[i],
        reset: i === 0,
        hydrate: id,
        done: i === chunks.length - 1,
      }),
    );
  }
  return frames;
}

export function chunkMessages(messages: unknown[], maxBytes = REMOTE_CHUNK): unknown[][] {
  const chunks: unknown[][] = [];
  let batch: unknown[] = [];
  let bytes = 0;
  for (const msg of messages) {
    const n = byteLen(JSON.stringify(msg));
    if (batch.length && bytes + n > maxBytes) {
      chunks.push(batch);
      batch = [];
      bytes = 0;
    }
    batch.push(msg);
    bytes += n;
  }
  if (batch.length) {
    chunks.push(batch);
  }
  return chunks;
}

function packDiff(row: { type?: string; payload?: { files?: unknown[] } }): string[] {
  const payload = row.payload;
  const files = Array.isArray(payload?.files) ? payload.files : [];
  const raw = JSON.stringify(row);
  if (files.length <= 1) {
    return [raw];
  }
  const frames = [
    JSON.stringify({
      type: 'diff',
      payload: { ...payload, files: [files[0]] },
    }),
  ];
  for (let i = 1; i < files.length; i += 1) {
    frames.push(JSON.stringify({ type: 'diffMore', files: [files[i]] }));
  }
  return frames;
}

function byteLen(text: string): number {
  return Buffer.byteLength(text, 'utf8');
}
