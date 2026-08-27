import { EventEmitter } from 'node:events';
import type { Writable } from 'node:stream';

type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

export class RpcError extends Error {
  constructor(
    message: string,
    readonly code?: number,
    readonly data?: unknown,
  ) {
    super(message);
    this.name = 'RpcError';
  }
}

export class JsonRpcConnection extends EventEmitter {
  private nextId = 1;
  private buffer = '';
  private readonly pending = new Map<number, Pending>();
  private readonly stdin: Writable;
  private closed = false;

  constructor(stdin: Writable) {
    super();
    this.stdin = stdin;
  }

  feed(chunk: Buffer | string): void {
    this.buffer += chunk.toString('utf8');
    if (this.buffer.length > 4_000_000) {
      this.buffer = '';
      this.emit('log', 'ACP stdout overflow, dropping buffer');
      return;
    }
    while (true) {
      const idx = this.buffer.indexOf('\n');
      if (idx < 0) {
        break;
      }
      const line = this.buffer.slice(0, idx).trim();
      this.buffer = this.buffer.slice(idx + 1);
      if (line) {
        this.handleLine(line);
      }
    }
  }

  request(method: string, params?: unknown): Promise<unknown> {
    if (this.closed) {
      return Promise.reject(new Error('ACP connection is closed'));
    }
    const id = this.nextId++;
    this.write({ jsonrpc: '2.0', id, method, params: params ?? {} });
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  notify(method: string, params?: unknown): void {
    this.write({ jsonrpc: '2.0', method, params: params ?? {} });
  }

  respond(id: number | string, result: unknown): void {
    this.write({ jsonrpc: '2.0', id, result });
  }

  respondError(id: number | string, message: string, code = -32000): void {
    this.write({
      jsonrpc: '2.0',
      id,
      error: { code, message },
    });
  }

  close(error?: Error): void {
    if (this.closed) {
      return;
    }
    this.closed = true;
    for (const [id, pending] of this.pending) {
      pending.reject(error ?? new Error('ACP connection closed'));
      this.pending.delete(id);
    }
  }

  private write(payload: unknown): void {
    if (this.closed) {
      return;
    }
    this.stdin.write(`${JSON.stringify(payload)}\n`);
  }

  private handleLine(line: string): void {
    let message: Record<string, unknown>;
    try {
      message = JSON.parse(line) as Record<string, unknown>;
    } catch {
      this.emit('log', `skipping non-JSON ACP line: ${line.slice(0, 200)}`);
      return;
    }
    const id = message['id'];
    const method = message['method'];
    if (typeof method === 'string') {
      if (id === undefined) {
        this.emit('notification', method, message['params']);
        return;
      }
      this.emit('request', method, message['params'], id);
      return;
    }
    if (id === undefined || typeof id !== 'number') {
      return;
    }
    const pending = this.pending.get(id);
    if (!pending) {
      this.emit('log', `no pending RPC for id ${id}`);
      return;
    }
    this.pending.delete(id);
    if (message['error']) {
      const err = message['error'] as { message?: string; code?: number; data?: unknown };
      pending.reject(
        new RpcError(err.message ?? 'ACP error', err.code, err.data),
      );
      return;
    }
    pending.resolve(message['result']);
  }
}

export { asObject, asString } from './wire';

export function catchRpc(error: unknown): never {
  throw error;
}
