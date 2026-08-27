export function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function asNum(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return undefined;
}

export function timesFromMeta(meta: Record<string, unknown>): {
  turnStartMs?: number;
  streamStartMs?: number;
  agentTimestampMs?: number;
} {
  return {
    turnStartMs: asNum(meta['turnStartMs']) ?? asNum(meta['turn_start_ms']),
    streamStartMs: asNum(meta['streamStartMs']) ?? asNum(meta['stream_start_ms']),
    agentTimestampMs: asNum(meta['agentTimestampMs']) ?? asNum(meta['agent_timestamp_ms']),
  };
}
