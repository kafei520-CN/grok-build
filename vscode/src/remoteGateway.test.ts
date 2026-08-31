import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { connect } from 'node:net';
import { describe, it } from 'node:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  clampRemotePort,
  DEFAULT_REMOTE_PORT,
  generatePairCode,
  lanUrls,
  normalizePublicUrl,
  remoteBindHost,
  RemoteGateway,
  safeCspHost,
} from './remoteGateway';

describe('remote gateway helpers', () => {
  it('clamps listen ports', () => {
    assert.equal(clampRemotePort(80), 1024);
    assert.equal(clampRemotePort(8787), 8787);
    assert.equal(clampRemotePort(99999), 65535);
    assert.equal(clampRemotePort('nope'), DEFAULT_REMOTE_PORT);
    assert.equal(clampRemotePort(0), 0);
  });

  it('makes a 6-digit pairing code', () => {
    const code = generatePairCode();
    assert.match(code, /^\d{6}$/);
  });

  it('always lists loopback among LAN urls', () => {
    const urls = lanUrls(8787);
    assert.ok(urls.includes('http://127.0.0.1:8787'));
  });

  it('keeps CSP hosts free of header injection', () => {
    assert.equal(safeCspHost('192.168.1.8:8787'), '192.168.1.8:8787');
    assert.equal(safeCspHost('[::1]:8787'), '[::1]:8787');
    assert.equal(safeCspHost('evil.com; script-src *'), '127.0.0.1');
  });

  it('binds LAN on every interface and public-only on loopback', () => {
    assert.equal(remoteBindHost(true), '0.0.0.0');
    assert.equal(remoteBindHost(false), '127.0.0.1');
  });

  it('keeps advertised public urls as origins', () => {
    assert.equal(normalizePublicUrl('https://chat.example.com/app'), 'https://chat.example.com');
    assert.equal(normalizePublicUrl('1.2.3.4:8787'), 'http://1.2.3.4:8787');
    assert.equal(normalizePublicUrl('javascript:alert(1)'), '');
  });
});

describe('remote gateway http', () => {
  it('rejects a bad code and accepts the live pairing code', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grok-remote-'));
    fs.writeFileSync(path.join(dir, 'webview.js'), 'window.__grok=1;');
    fs.writeFileSync(path.join(dir, 'chat.css'), 'body{}');
    const seen: string[] = [];
    const gw = new RemoteGateway(
      { webviewJs: path.join(dir, 'webview.js'), chatCss: path.join(dir, 'chat.css') },
      {
        onClientMessage: (msg) => seen.push(msg.type),
        snapshot: () => ({ status: 'ready', messages: [] }),
      },
    );
    const info = await gw.start(0);
    const port = (gw.info().port || info.port) as number;
    const live = gw.info();
    const actualPort = new URL(live.urls[0] ?? `http://127.0.0.1:${port}`).port;
    const base = `http://127.0.0.1:${actualPort}`;
    const bad = await fetch(`${base}/pair`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'code=000000',
      redirect: 'manual',
    });
    assert.equal(bad.status, 403);
    const ok = await fetch(`${base}/pair`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: `code=${live.code}`,
      redirect: 'manual',
    });
    assert.equal(ok.status, 302);
    const cookie = ok.headers.get('set-cookie') ?? '';
    const location = ok.headers.get('location') ?? '';
    assert.match(cookie, /grok_sess=/);
    assert.match(location, /^\/\?s=[0-9a-f]+$/);
    const token = new URL(location, base).searchParams.get('s') ?? '';
    const page = await fetch(`${base}${location}`);
    const html = await page.text();
    assert.match(html, /webview\.js/);
    assert.match(html, /\/ws\?s=/);
    assert.match(html, /ws:\/\/127\.0\.0\.1:/);
    assert.doesNotMatch(html, /name="code"/);
    const portNum = Number(actualPort);
    const authed = await wsUpgrade(portNum, `/ws?s=${token}`);
    assert.equal(authed.status, 101);
    authed.socket.destroy();
    const denied = await wsUpgrade(portNum, '/ws');
    assert.equal(denied.status, 401);
    denied.socket.destroy();
    await gw.stop();
  });

  it('rejects a second pairing while one session is already in', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grok-remote-'));
    fs.writeFileSync(path.join(dir, 'webview.js'), 'window.__grok=1;');
    fs.writeFileSync(path.join(dir, 'chat.css'), 'body{}');
    const gw = new RemoteGateway(
      { webviewJs: path.join(dir, 'webview.js'), chatCss: path.join(dir, 'chat.css') },
      { onClientMessage: () => undefined, snapshot: () => ({}) },
    );
    const live = await gw.start(0, { local: false, public: true, publicUrl: 'http://vps:8787' });
    assert.equal(live.bind, '127.0.0.1');
    const port = live.port;
    const first = await fetch(`http://127.0.0.1:${port}/pair`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: `code=${live.code}`,
      redirect: 'manual',
    });
    assert.equal(first.status, 302);
    const second = await fetch(`http://127.0.0.1:${port}/pair`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: `code=${live.code}`,
      redirect: 'manual',
    });
    assert.equal(second.status, 409);
    await gw.stop();
  });
});

function wsUpgrade(
  port: number,
  pathName: string,
  extraHeaders = '',
): Promise<{ status: number; socket: ReturnType<typeof connect> }> {
  return new Promise((resolve, reject) => {
    const socket = connect(port, '127.0.0.1', () => {
      const key = randomBytes(16).toString('base64');
      socket.write(
        `GET ${pathName} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nUpgrade: websocket\r\n` +
          `Connection: Upgrade\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: ${key}\r\n${extraHeaders}\r\n`,
      );
    });
    let buf = Buffer.alloc(0);
    socket.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      const idx = buf.indexOf('\r\n\r\n');
      if (idx === -1) {
        return;
      }
      const status = Number(buf.subarray(0, idx).toString('utf8').split(' ')[1]);
      socket.removeAllListeners('data');
      resolve({ status, socket });
    });
    socket.on('error', reject);
  });
}
