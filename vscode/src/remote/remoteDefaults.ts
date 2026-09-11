/** Built-in public relay. Users can replace these in Settings. */
export const DEFAULT_PUBLIC_HOST = '189.24.78.197';
export const DEFAULT_PUBLIC_USER = 'root';
export const DEFAULT_SSH_PORT = 22;
/** HTTP port the built-in WebSocket relay listens on. 8788 is the fallback. */
export const DEFAULT_RELAY_PORT = 80;
export const RELAY_FALLBACK_PORT = 8788;
/** 0 = pick a free port on the VPS so many plugins can share one relay. */
export const DEFAULT_FORWARD_PORT = 0;
export const AUTO_FORWARD_MIN = 20000;
export const AUTO_FORWARD_MAX = 29999;
