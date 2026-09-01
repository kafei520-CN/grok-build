/** If `incoming` is a live tail of `had` (same last id, plus optional new ids), merge in place. */
export function mergeLiveMessages<T extends { id?: string }>(had: T[], incoming: T[]): T[] | undefined {
  if (!had.length || !incoming.length) {
    return undefined;
  }
  const lastHad = had[had.length - 1]?.id;
  if (!lastHad) {
    return undefined;
  }
  const incomingIds = new Set(incoming.map((row) => row.id).filter(Boolean) as string[]);
  if (!incomingIds.has(lastHad)) {
    return undefined;
  }
  const byId = new Map<string, T>();
  for (const row of had) {
    if (row.id) {
      byId.set(row.id, row);
    }
  }
  for (const row of incoming) {
    if (row.id) {
      byId.set(row.id, row);
    }
  }
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of had) {
    const next = row.id ? byId.get(row.id) : row;
    out.push(next ?? row);
    if (row.id) {
      seen.add(row.id);
    }
  }
  for (const row of incoming) {
    if (row.id && !seen.has(row.id)) {
      out.push(row);
      seen.add(row.id);
    }
  }
  return out;
}
