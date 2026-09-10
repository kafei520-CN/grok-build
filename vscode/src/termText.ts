import { type TermEncoding } from './termEncoding';

export {
  DEFAULT_TERM_ENCODING,
  TERM_ENCODINGS,
  normalizeTermEncoding,
  type TermEncoding,
} from './termEncoding';

export function decodeTermUnknown(raw: unknown, encoding: TermEncoding): string {
  if (typeof raw === 'string') {
    return raw;
  }
  const bytes = termBytes(raw);
  if (!bytes) {
    return '';
  }
  return decodeTermBytes(bytes, encoding);
}

export function decodeTermBytes(bytes: Uint8Array, encoding: TermEncoding): string {
  try {
    return new TextDecoder(encoding).decode(bytes);
  } catch {
    if (encoding === 'iso-8859-1' || encoding === 'windows-1252') {
      return Buffer.from(bytes).toString('latin1');
    }
    return Buffer.from(bytes).toString('utf8');
  }
}

export function termBytes(raw: unknown): Uint8Array | undefined {
  if (Array.isArray(raw) && (raw.length === 0 || typeof raw[0] === 'number')) {
    return Uint8Array.from(raw as number[]);
  }
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }
  const row = raw as { type?: string; data?: unknown };
  if (row.type === 'Buffer' && Array.isArray(row.data)) {
    return Uint8Array.from(row.data as number[]);
  }
  return undefined;
}
