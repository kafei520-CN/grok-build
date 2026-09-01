import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { packRemotePayload, REMOTE_STATE_SOFT, chunkMessages } from './remoteState';

describe('remote state packing', () => {
  it('keeps a small snapshot as one frame', () => {
    const frames = packRemotePayload({ type: 'state', state: { status: 'ready', messages: [{ id: '1', text: 'hi' }] } });
    assert.equal(frames.length, 1);
    const row = JSON.parse(frames[0] ?? '') as { type: string; state: { status: string } };
    assert.equal(row.type, 'state');
    assert.equal(row.state.status, 'ready');
  });

  it('does not pack non-state payloads', () => {
    const frames = packRemotePayload({ type: 'tail', message: { id: '1' } });
    assert.equal(frames.length, 1);
    assert.equal(JSON.parse(frames[0] ?? '').type, 'tail');
  });

  it('sends each review file in its own frame after the first', () => {
    const files = [
      { path: 'a.ts', added: 1, removed: 0, hunks: [] },
      { path: 'b.ts', added: 2, removed: 1, hunks: [] },
      { path: 'c.css', added: 3, removed: 2, hunks: [] },
    ];
    const frames = packRemotePayload({
      type: 'diff',
      payload: { locale: 'en', files, messageId: 'm1' },
    });
    assert.equal(frames.length, 3);
    const first = JSON.parse(frames[0] ?? '') as { type: string; payload: { files: Array<{ path: string }> } };
    assert.equal(first.type, 'diff');
    assert.deepEqual(
      first.payload.files.map((file) => file.path),
      ['a.ts'],
    );
    const second = JSON.parse(frames[1] ?? '') as { type: string; files: Array<{ path: string }> };
    assert.equal(second.type, 'diffMore');
    assert.equal(second.files[0]?.path, 'b.ts');
  });

  it('splits a long transcript so the first frame stays under the soft cap', () => {
    const messages = Array.from({ length: 80 }, (_, i) => ({
      id: `m${i}`,
      role: i % 2 === 0 ? 'user' : 'assistant',
      text: 'x'.repeat(2000),
      tools: [],
    }));
    const full = JSON.stringify({ type: 'state', state: { status: 'ready', messages } });
    assert.ok(Buffer.byteLength(full) > REMOTE_STATE_SOFT);
    const frames = packRemotePayload({ type: 'state', state: { status: 'ready', messages } });
    assert.ok(frames.length >= 2);
    const boot = JSON.parse(frames[0] ?? '') as {
      type: string;
      hydrate: number;
      state: { status: string; messages: Array<{ id: string }> };
    };
    assert.equal(boot.type, 'state');
    assert.equal(boot.state.status, 'ready');
    assert.ok(Buffer.byteLength(frames[0] ?? '') <= REMOTE_STATE_SOFT);
    const ids: string[] = boot.state.messages.map((row) => row.id);
    for (let i = 1; i < frames.length; i += 1) {
      const part = JSON.parse(frames[i] ?? '') as {
        type: string;
        prepend?: boolean;
        reset?: boolean;
        done?: boolean;
        messages: Array<{ id: string }>;
      };
      assert.equal(part.type, 'messages');
      if (part.prepend) {
        ids.unshift(...part.messages.map((row) => row.id));
      } else if (part.reset) {
        ids.length = 0;
        ids.push(...part.messages.map((row) => row.id));
      } else {
        ids.push(...part.messages.map((row) => row.id));
      }
    }
    assert.deepEqual(
      ids,
      messages.map((row) => row.id),
    );
  });

  it('chunks messages without dropping a oversized single item', () => {
    const huge = { id: 'big', text: 'y'.repeat(90_000) };
    const chunks = chunkMessages([huge, { id: 'b', text: 'z' }], 8_000);
    assert.equal(chunks[0]?.[0], huge);
    const last = chunks.at(-1)?.at(-1) as { id: string };
    assert.equal(last.id, 'b');
  });
});
