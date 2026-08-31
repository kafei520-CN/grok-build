import { spawn, type ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  AUTO_FORWARD_MAX,
  AUTO_FORWARD_MIN,
  DEFAULT_FORWARD_PORT,
  DEFAULT_PUBLIC_HOST,
  DEFAULT_PUBLIC_USER,
  DEFAULT_SSH_PORT,
} from './remoteDefaults';
import { randomBytes } from 'node:crypto';

export {
  AUTO_FORWARD_MAX,
  AUTO_FORWARD_MIN,
  DEFAULT_FORWARD_PORT,
  DEFAULT_PUBLIC_HOST,
  DEFAULT_PUBLIC_USER,
  DEFAULT_SSH_PORT,
} from './remoteDefaults';

export type TunnelState = 'off' | 'connecting' | 'up' | 'error';

export interface TunnelConfig {
  host: string;
  user: string;
  sshPort: number;
  remotePort: number;
  localPort: number;
}

export interface TunnelInfo {
  state: TunnelState;
  error?: string;
  host: string;
  user: string;
  sshPort: number;
  remotePort: number;
}

const AUTH_FAIL = /permission denied|no matching host key|host key verification failed|too many authentication/i;
const BAD_HOST = /could not resolve hostname|name or service not known/i;

export function sanitizeTunnelHost(raw: unknown): string {
  const text = String(raw ?? '').trim();
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(text) || /^[A-Za-z0-9.-]+$/.test(text)) {
    return text;
  }
  return '';
}

export function sanitizeTunnelUser(raw: unknown): string {
  const text = String(raw ?? '').trim();
  return /^[A-Za-z0-9._-]+$/.test(text) ? text : DEFAULT_PUBLIC_USER;
}

export function clampSshPort(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : Number.NaN;
  if (!Number.isInteger(n)) {
    return DEFAULT_SSH_PORT;
  }
  return Math.max(1, Math.min(65535, n));
}

export function resolvePublicHost(raw: unknown): string {
  return sanitizeTunnelHost(raw) || DEFAULT_PUBLIC_HOST;
}

export function resolveForwardPort(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : Number.NaN;
  if (!Number.isInteger(n) || n <= 0) {
    return DEFAULT_FORWARD_PORT;
  }
  return Math.max(1024, Math.min(65535, n));
}

export function pickAutoForwardPort(): number {
  const span = AUTO_FORWARD_MAX - AUTO_FORWARD_MIN + 1;
  return AUTO_FORWARD_MIN + (randomBytes(2).readUInt16BE(0) % span);
}

export function advertisedPublicUrl(host: string, remotePort: number): string {
  if (!host) {
    return '';
  }
  return remotePort === 80 ? `http://${host}` : `http://${host}:${remotePort}`;
}

export function sshBinary(): string {
  if (process.platform === 'win32') {
    const root = process.env.SystemRoot ?? 'C:\\Windows';
    const bundled = path.join(root, 'System32', 'OpenSSH', 'ssh.exe');
    if (fs.existsSync(bundled)) {
      return bundled;
    }
  }
  return 'ssh';
}

/** Reverse tunnel: local machine dials the VPS, VPS listens, browsers hit the VPS. */
export function buildSshArgs(cfg: TunnelConfig): string[] {
  return [
    '-N',
    '-T',
    '-o', 'BatchMode=yes',
    '-o', 'ExitOnForwardFailure=yes',
    '-o', 'ServerAliveInterval=30',
    '-o', 'ServerAliveCountMax=3',
    '-o', 'StrictHostKeyChecking=accept-new',
    '-p', String(cfg.sshPort),
    '-R', `0.0.0.0:${cfg.remotePort}:127.0.0.1:${cfg.localPort}`,
    `${cfg.user}@${cfg.host}`,
  ];
}

export class ReverseTunnel {
  private child?: ChildProcess;
  private wanted = false;
  private cfg?: TunnelConfig;
  private autoPort = false;
  private boundPort = 0;
  private state: TunnelState = 'off';
  private error?: string;
  private retry?: ReturnType<typeof setTimeout>;
  private ready?: ReturnType<typeof setTimeout>;
  private delay = 1500;
  private readonly listeners = new Set<() => void>();

  info(): TunnelInfo {
    return {
      state: this.state,
      error: this.error,
      host: this.cfg?.host ?? '',
      user: this.cfg?.user ?? 'root',
      sshPort: this.cfg?.sshPort ?? 22,
      remotePort: this.boundPort || this.cfg?.remotePort || 0,
    };
  }

  onChange(listener: () => void): { dispose(): void } {
    this.listeners.add(listener);
    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  }

  start(cfg: TunnelConfig): void {
    this.autoPort = cfg.remotePort <= 0;
    this.boundPort = this.autoPort ? pickAutoForwardPort() : cfg.remotePort;
    this.cfg = { ...cfg, remotePort: this.boundPort };
    this.wanted = true;
    this.delay = 1500;
    this.spawn();
  }

  stop(): void {
    this.wanted = false;
    this.clearTimers();
    this.kill();
    this.state = 'off';
    this.error = undefined;
    this.emit();
  }

  private spawn(): void {
    this.kill();
    this.clearTimers();
    const cfg = this.cfg;
    if (!this.wanted || !cfg?.host) {
      this.state = 'error';
      this.error = 'missing-host';
      this.emit();
      return;
    }
    this.state = 'connecting';
    this.error = undefined;
    this.emit();
    const child = spawn(sshBinary(), buildSshArgs(cfg), {
      stdio: ['ignore', 'ignore', 'pipe'],
      windowsHide: true,
    });
    this.child = child;
    let stderr = '';
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr = `${stderr}${chunk.toString('utf8')}`.slice(-2000);
      const msg = classifySshError(stderr);
      if (msg) {
        this.error = msg;
      }
    });
    child.on('error', (err) => {
      if (this.child !== child) {
        return;
      }
      this.fail(err.message, false);
    });
    child.on('close', () => {
      if (this.child !== child) {
        return;
      }
      this.child = undefined;
      const msg = classifySshError(stderr) ?? this.error ?? 'tunnel-closed';
      this.fail(msg, !isAuthFailure(msg));
    });
    this.ready = setTimeout(() => {
      this.ready = undefined;
      if (this.child === child && this.state === 'connecting') {
        this.state = 'up';
        this.error = undefined;
        this.delay = 1500;
        this.emit();
      }
    }, 1200);
  }

  private fail(message: string, retry: boolean): void {
    this.clearTimers();
    this.kill();
    this.state = 'error';
    this.error = message;
    this.emit();
    if (!this.wanted || !retry) {
      return;
    }
    if (this.autoPort && this.cfg && message === 'forward') {
      this.boundPort = pickAutoForwardPort();
      this.cfg = { ...this.cfg, remotePort: this.boundPort };
    }
    this.retry = setTimeout(() => {
      this.retry = undefined;
      this.spawn();
    }, this.delay);
    this.retry.unref?.();
    this.delay = Math.min(30_000, Math.round(this.delay * 1.6));
  }

  private kill(): void {
    const child = this.child;
    this.child = undefined;
    if (!child || child.killed) {
      return;
    }
    child.kill();
  }

  private clearTimers(): void {
    if (this.retry) {
      clearTimeout(this.retry);
      this.retry = undefined;
    }
    if (this.ready) {
      clearTimeout(this.ready);
      this.ready = undefined;
    }
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export function classifySshError(raw: string): string | undefined {
  const text = raw.trim();
  if (!text) {
    return undefined;
  }
  if (AUTH_FAIL.test(text)) {
    return 'auth';
  }
  if (BAD_HOST.test(text)) {
    return 'host';
  }
  if (/remote port forwarding failed/i.test(text)) {
    return 'forward';
  }
  if (/connection timed out|connection reset|network is unreachable/i.test(text)) {
    return 'network';
  }
  return undefined;
}

function isAuthFailure(code: string): boolean {
  return code === 'auth' || code === 'host';
}
