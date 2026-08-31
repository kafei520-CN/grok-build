import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { Socket } from 'node:net';
import type { WebviewToHost } from './types';

export const DEFAULT_REMOTE_PORT = 8787;
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_FRAME = 8 * 1024 * 1024;
const MAX_CLIENTS = 1;
const COOKIE = 'grok_sess';

export interface RemoteAssets {
  webviewJs: string;
  chatCss: string;
  symbol?: string;
}

export type RemoteBindHost = '0.0.0.0' | '127.0.0.1';

export interface RemoteStartOpts {
  local?: boolean;
  public?: boolean;
  publicUrl?: string;
}

export interface RemoteInfo {
  running: boolean;
  port: number;
  bind: RemoteBindHost;
  local: boolean;
  public: boolean;
  code: string;
  localCode?: string;
  publicUrl: string;
  urls: string[];
  clients: number;
  error?: string;
}

export interface RemoteHandlers {
  onClientMessage: (message: WebviewToHost) => void;
  snapshot: () => unknown;
  onClients?: () => void;
}

export function clampRemotePort(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : Number.NaN;
  if (!Number.isInteger(n)) {
    return DEFAULT_REMOTE_PORT;
  }
  if (n === 0) {
    return 0;
  }
  return Math.max(1024, Math.min(65535, n));
}

export function generatePairCode(): string {
  const n = randomBytes(4).readUInt32BE(0) % 1_000_000;
  return n.toString().padStart(6, '0');
}

export function lanUrls(port: number): string[] {
  const urls = [`http://127.0.0.1:${port}`];
  for (const rows of Object.values(os.networkInterfaces())) {
    for (const row of rows ?? []) {
      if (row.internal || (row.family !== 'IPv4' && row.family !== 4)) {
        continue;
      }
      urls.push(`http://${row.address}:${port}`);
    }
  }
  return [...new Set(urls)];
}

/** Host header used in CSP connect-src. Safari ignores a bare `ws:` scheme. */
export function safeCspHost(raw: unknown): string {
  const host = String(raw ?? '').trim();
  if (/^(\[[0-9A-Fa-f:.]+\]|\d{1,3}(?:\.\d{1,3}){3}|[A-Za-z0-9.-]+)(?::\d{1,5})?$/.test(host)) {
    return host;
  }
  return '127.0.0.1';
}

/** LAN listens on every interface. Public-only listens on loopback for SSH/frp. */
export function remoteBindHost(local: boolean): RemoteBindHost {
  return local ? '0.0.0.0' : '127.0.0.1';
}

export function normalizePublicUrl(raw: unknown): string {
  const text = String(raw ?? '').trim();
  if (!text) {
    return '';
  }
  try {
    const url = new URL(text.includes('://') ? text : `http://${text}`);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return '';
    }
    return url.origin;
  } catch {
    return '';
  }
}

export function resolveRemoteAssets(fromFile = __dirname): RemoteAssets {
  const env = process.env.GROK_REMOTE_ASSETS?.trim();
  if (env && fs.existsSync(path.join(env, 'webview.js'))) {
    return {
      webviewJs: path.join(env, 'webview.js'),
      chatCss: path.join(env, 'chat.css'),
      symbol: path.join(env, 'grok-symbol.png'),
    };
  }
  const dir = path.dirname(fromFile);
  const root = path.basename(dir) === 'dist' ? path.join(dir, '..') : dir;
  return {
    webviewJs: path.join(dir, 'webview.js'),
    chatCss: path.join(root, 'media', 'chat.css'),
    symbol: path.join(root, 'media', 'grok-symbol.png'),
  };
}

export class RemoteGateway {
  private server?: Server;
  private readonly tokens = new Map<string, { kind: 'local' | 'public' }>();
  private readonly sockets = new Set<Socket>();
  private readonly socketToken = new Map<Socket, string>();
  private code = '';
  private localOn = false;
  private publicOn = false;
  private publicUrl = '';
  private port = DEFAULT_REMOTE_PORT;
  private bind: RemoteBindHost = '127.0.0.1';
  private fails = 0;
  private failReset?: ReturnType<typeof setTimeout>;
  private error?: string;
  private readonly unsub: Array<{ dispose(): void }> = [];

  constructor(
    private readonly assets: RemoteAssets,
    private readonly handlers: RemoteHandlers,
  ) {}

  info(): RemoteInfo {
    const urls: string[] = [];
    if (this.localOn && this.server?.listening) {
      urls.push(...lanUrls(this.port));
    }
    if (this.publicOn && this.publicUrl) {
      urls.push(this.publicUrl);
    }
    return {
      running: Boolean(this.server?.listening),
      port: this.port,
      bind: this.bind,
      local: this.localOn,
      public: this.publicOn,
      code: this.code,
      localCode: this.localOn ? this.code : undefined,
      publicUrl: this.publicUrl,
      urls: [...new Set(urls)],
      clients: this.sockets.size,
      error: this.error,
    };
  }

  async start(port = DEFAULT_REMOTE_PORT, opts: RemoteStartOpts = {}): Promise<RemoteInfo> {
    return this.apply({
      port,
      local: opts.local ?? true,
      public: opts.public ?? false,
      publicUrl: opts.publicUrl,
    });
  }

  async apply(opts: {
    port?: number;
    local: boolean;
    public: boolean;
    publicUrl?: string;
  }): Promise<RemoteInfo> {
    if (!opts.local && !opts.public) {
      await this.stop();
      return this.info();
    }
    if (opts.publicUrl !== undefined) {
      this.publicUrl = normalizePublicUrl(opts.publicUrl);
    }
    const port = clampRemotePort(opts.port ?? this.port);
    const bind = remoteBindHost(opts.local);
    if (!this.code) {
      this.code = generatePairCode();
    }
    this.localOn = opts.local;
    this.publicOn = opts.public;
    const rebound = !this.server?.listening || this.port !== port || this.bind !== bind;
    if (rebound) {
      await this.listen(port, bind);
    }
    return this.info();
  }

  private async listen(port: number, bind: RemoteBindHost): Promise<void> {
    await this.closeServer();
    this.port = port;
    this.bind = bind;
    this.error = undefined;
    const server = createServer((req, res) => {
      void this.http(req, res);
    });
    server.on('upgrade', (req, socket) => this.upgrade(req, socket as Socket));
    this.server = server;
    await new Promise<void>((resolve, reject) => {
      server.once('error', (err) => {
        this.error = err.message;
        reject(err);
      });
      server.listen(this.port, bind, () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          this.port = addr.port;
        }
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    for (const d of this.unsub.splice(0)) {
      d.dispose();
    }
    this.dropAllSessions();
    this.localOn = false;
    this.publicOn = false;
    this.code = '';
    if (this.failReset) {
      clearTimeout(this.failReset);
      this.failReset = undefined;
    }
    this.fails = 0;
    await this.closeServer();
    this.error = undefined;
  }

  private async closeServer(): Promise<void> {
    const server = this.server;
    this.server = undefined;
    if (!server) {
      return;
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  rotateCode(): string {
    this.dropAllSessions();
    this.code = generatePairCode();
    return this.code;
  }

  broadcast(payload: unknown): void {
    if (!this.sockets.size) {
      return;
    }
    const raw = JSON.stringify(payload);
    for (const sock of this.sockets) {
      sendText(sock, raw);
    }
  }

  attach(listener: { dispose(): void }): void {
    this.unsub.push(listener);
  }

  private dropAllSessions(): void {
    for (const sock of this.sockets) {
      sock.destroy();
    }
    this.sockets.clear();
    this.socketToken.clear();
    this.tokens.clear();
  }

  private dropToken(token: string): void {
    this.tokens.delete(token);
    for (const [sock, tied] of [...this.socketToken]) {
      if (tied === token) {
        this.socketToken.delete(sock);
        this.sockets.delete(sock);
        sock.destroy();
      }
    }
  }

  private matchCode(input: string): { kind: 'local' | 'public' } | undefined {
    if (!this.code || !codesEqual(input, this.code)) {
      return undefined;
    }
    return { kind: this.publicOn ? 'public' : 'local' };
  }

  private async http(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? '127.0.0.1'}`);
    if (req.method === 'POST' && url.pathname === '/pair') {
      this.pair(req, res);
      return;
    }
    if (url.pathname === '/webview.js') {
      this.file(res, this.assets.webviewJs, 'application/javascript; charset=utf-8');
      return;
    }
    if (url.pathname === '/chat.css') {
      this.file(res, this.assets.chatCss, 'text/css; charset=utf-8');
      return;
    }
    if (url.pathname === '/grok-symbol.png' && this.assets.symbol) {
      this.file(res, this.assets.symbol, 'image/png');
      return;
    }
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const token = this.sessionToken(req, url);
      if (!token) {
        this.html(res, pairPage(zh(req)));
        return;
      }
      this.html(res, chatPage(token, safeCspHost(req.headers.host), zh(req)));
      return;
    }
    res.writeHead(404);
    res.end('not found');
  }

  private pair(req: IncomingMessage, res: ServerResponse): void {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c as Buffer));
    req.on('end', () => {
      if (this.fails >= 8) {
        res.writeHead(429);
        res.end('too many attempts');
        return;
      }
      let code = '';
      const raw = Buffer.concat(chunks).toString('utf8');
      try {
        const json = JSON.parse(raw) as { code?: string };
        code = String(json.code ?? '');
      } catch {
        code = new URLSearchParams(raw).get('code') ?? '';
      }
      const matched = this.matchCode(code);
      if (matched && (this.sockets.size >= 1 || this.tokens.size >= 1)) {
        res.writeHead(409, { 'content-type': 'text/plain; charset=utf-8' });
        res.end(zh(req) ? '已有人在线，一个插件只允许一个连接。' : 'Already in use. One plugin allows one connection.');
        return;
      }
      if (!matched) {
        this.fails += 1;
        if (!this.failReset) {
          this.failReset = setTimeout(() => {
            this.fails = 0;
            this.failReset = undefined;
          }, 10 * 60_000);
          this.failReset.unref?.();
        }
        res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('bad code');
        return;
      }
      const token = randomBytes(24).toString('hex');
      this.tokens.set(token, matched);
      res.writeHead(302, {
        Location: `/?s=${token}`,
        'Set-Cookie': `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`,
      });
      res.end();
    });
  }

  private sessionToken(req: IncomingMessage, url?: URL): string | undefined {
    const fromCookie = cookie(req, COOKIE);
    if (fromCookie && this.tokens.has(fromCookie)) {
      return fromCookie;
    }
    let parsed = url;
    if (!parsed) {
      try {
        parsed = new URL(req.url ?? '/', `http://${req.headers.host ?? '127.0.0.1'}`);
      } catch {
        return undefined;
      }
    }
    const q = parsed.searchParams.get('s') ?? '';
    return q && this.tokens.has(q) ? q : undefined;
  }

  private authed(req: IncomingMessage): boolean {
    return Boolean(this.sessionToken(req));
  }

  private upgrade(req: IncomingMessage, socket: Socket): void {
    const pathName = (req.url ?? '/').split('?')[0];
    if (pathName !== '/ws') {
      socket.destroy();
      return;
    }
    if (req.headers.upgrade?.toLowerCase() !== 'websocket' || !this.authed(req)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    if (this.sockets.size >= MAX_CLIENTS) {
      socket.write('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    const key = req.headers['sec-websocket-key'];
    if (typeof key !== 'string') {
      socket.destroy();
      return;
    }
    const accept = createHash('sha1').update(key + WS_GUID).digest('base64');
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
    );
    const token = this.sessionToken(req);
    if (token) {
      this.socketToken.set(socket, token);
    }
    this.sockets.add(socket);
    this.handlers.onClients?.();
    sendText(socket, JSON.stringify({ type: 'state', state: this.handlers.snapshot() }));
    let buf = Buffer.alloc(0);
    socket.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      while (true) {
        const frame = readFrame(buf);
        if (!frame) {
          break;
        }
        buf = buf.subarray(frame.consumed);
        if (frame.opcode === 8) {
          socket.destroy();
          return;
        }
        if (frame.opcode === 9) {
          sendPong(socket, frame.payload);
          continue;
        }
        if (frame.opcode !== 1) {
          continue;
        }
        try {
          const msg = JSON.parse(frame.payload.toString('utf8')) as WebviewToHost;
          if (msg && typeof msg.type === 'string') {
            this.handlers.onClientMessage(msg);
          }
        } catch {
          /* ignore bad client json */
        }
      }
    });
    const drop = (): void => {
      this.socketToken.delete(socket);
      if (this.sockets.delete(socket)) {
        if (this.sockets.size === 0) {
          this.tokens.clear();
        }
        this.handlers.onClients?.();
      }
    };
    socket.on('close', drop);
    socket.on('error', () => {
      drop();
      socket.destroy();
    });
  }

  private file(res: ServerResponse, file: string, type: string): void {
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('missing');
        return;
      }
      res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
      res.end(data);
    });
  }

  private html(res: ServerResponse, body: string): void {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(body);
  }
}

function codesEqual(a: string, b: string): boolean {
  const left = Buffer.from(a.trim());
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

function cookie(req: IncomingMessage, name: string): string | undefined {
  const raw = req.headers.cookie ?? '';
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) {
      return rest.join('=');
    }
  }
  return undefined;
}

function zh(req: IncomingMessage): boolean {
  return (req.headers['accept-language'] ?? '').toLowerCase().includes('zh');
}

function pairPage(chinese: boolean): string {
  const title = chinese ? 'Grok 远程校验' : 'Grok remote pair';
  const hint = chinese
    ? '浏览器会连到本机工作区并可以改文件、跑命令。只把校验码给信任的人。'
    : 'This browser session can edit the workspace and run commands. Share the code only with people you trust.';
  const label = chinese ? '校验码' : 'Pairing code';
  const go = chinese ? '进入' : 'Enter';
  return `<!DOCTYPE html><html lang="${chinese ? 'zh-CN' : 'en'}"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${title}</title>
<style>body{font:15px/1.45 system-ui,sans-serif;background:#111;color:#eee;display:grid;place-items:center;min-height:100vh;margin:0}form{width:min(360px,92vw);display:grid;gap:12px}input{font:inherit;padding:10px 12px;border-radius:10px;border:1px solid #444;background:#1c1c1c;color:#fff}button{font:inherit;padding:10px;border:0;border-radius:10px;background:#b9d4ff;color:#111;cursor:pointer}p{color:#aaa}</style></head>
<body><form method="post" action="/pair"><h1>${title}</h1><p>${hint}</p><label>${label}<input name="code" inputmode="numeric" autocomplete="one-time-code" required/></label><button type="submit">${go}</button></form></body></html>`;
}

function chatPage(token: string, host: string, chinese: boolean): string {
  const wsPath = `/ws?s=${encodeURIComponent(token)}`;
  const csp =
    `default-src 'none'; img-src data: blob: https: http:; media-src blob: http: https:; ` +
    `style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; ` +
    `connect-src 'self' http://${host} https://${host} ws://${host} wss://${host} ws: wss: http: https:`;
  const lang = chinese ? 'zh-CN' : 'en';
  const stalled = chinese
    ? '页面开了，但会话通道没连上。请刷新后重新输入校验码。'
    : 'The page loaded, but the session channel did not. Refresh and pair again.';
  return `<!DOCTYPE html>
<html lang="${lang}"><head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta http-equiv="Content-Security-Policy" content="${csp}"/>
<link rel="stylesheet" href="/chat.css"/>
<title>Grok Build</title>
</head><body>
<div id="app"></div>
<script>
window.acquireVsCodeApi = function() {
  if (window.__grokApi) return window.__grokApi;
  var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  var path = ${JSON.stringify(wsPath)};
  var ws;
  var queue = [];
  var opened = false;
  var retryTimer;
  var state;
  try { state = JSON.parse(sessionStorage.getItem('grok-ui') || 'null'); } catch (e) {}
  try { if (/[?&]s=/.test(location.search)) history.replaceState(null, '', location.pathname); } catch (e) {}
  function retry() {
    if (retryTimer) return;
    retryTimer = setTimeout(function() { retryTimer = 0; open(); }, opened ? 800 : 1500);
  }
  function bind(sock) {
    sock.onmessage = function(ev) {
      try {
        window.dispatchEvent(new MessageEvent('message', { data: JSON.parse(ev.data), origin: location.origin }));
      } catch (e) {}
    };
    sock.onopen = function() {
      opened = true;
      while (queue.length) sock.send(JSON.stringify(queue.shift()));
    };
    sock.onerror = function() { try { sock.close(); } catch (e) {} };
    sock.onclose = function() {
      if (!opened) {
        var app = document.getElementById('app');
        if (app && !document.getElementById('grok-header')) {
          app.textContent = ${JSON.stringify(stalled)};
        }
      }
      retry();
    };
  }
  function open() {
    ws = new WebSocket(proto + '//' + location.host + path);
    bind(ws);
  }
  open();
  window.__grokApi = {
    postMessage: function(msg) {
      if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
      else queue.push(msg);
    },
    getState: function() { return state; },
    setState: function(next) {
      state = next;
      try { sessionStorage.setItem('grok-ui', JSON.stringify(next)); } catch (e) {}
    }
  };
  return window.__grokApi;
};
</script>
<script src="/webview.js"></script>
</body></html>`;
}

function sendText(socket: Socket, text: string): void {
  const payload = Buffer.from(text);
  socket.write(Buffer.concat([wsHeader(1, payload.length), payload]));
}

function sendPong(socket: Socket, payload: Buffer): void {
  socket.write(Buffer.concat([wsHeader(10, payload.length), payload]));
}

function wsHeader(opcode: number, len: number): Buffer {
  if (len < 126) {
    const h = Buffer.alloc(2);
    h[0] = 0x80 | opcode;
    h[1] = len;
    return h;
  }
  if (len < 65536) {
    const h = Buffer.alloc(4);
    h[0] = 0x80 | opcode;
    h[1] = 126;
    h.writeUInt16BE(len, 2);
    return h;
  }
  const h = Buffer.alloc(10);
  h[0] = 0x80 | opcode;
  h[1] = 127;
  h.writeUInt32BE(Math.floor(len / 0x100000000), 2);
  h.writeUInt32BE(len >>> 0, 6);
  return h;
}

function readFrame(buf: Buffer): { consumed: number; opcode: number; payload: Buffer } | undefined {
  if (buf.length < 2) {
    return undefined;
  }
  const opcode = buf[0] & 0x0f;
  const masked = (buf[1] & 0x80) !== 0;
  let len = buf[1] & 0x7f;
  let offset = 2;
  if (len === 126) {
    if (buf.length < 4) {
      return undefined;
    }
    len = buf.readUInt16BE(2);
    offset = 4;
  } else if (len === 127) {
    if (buf.length < 10) {
      return undefined;
    }
    len = buf.readUInt32BE(6);
    offset = 10;
  }
  if (len > MAX_FRAME) {
    return { consumed: buf.length, opcode: 8, payload: Buffer.alloc(0) };
  }
  const maskLen = masked ? 4 : 0;
  if (buf.length < offset + maskLen + len) {
    return undefined;
  }
  let payload = buf.subarray(offset + maskLen, offset + maskLen + len);
  if (masked) {
    const mask = buf.subarray(offset, offset + 4);
    const copy = Buffer.from(payload);
    for (let i = 0; i < copy.length; i += 1) {
      copy[i] ^= mask[i & 3];
    }
    payload = copy;
  }
  return { consumed: offset + maskLen + len, opcode, payload };
}
