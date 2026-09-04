import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildStreamTail, emptyStreamCursor, mergeStreamTail } from './streamTail';
import type { ChatMessage } from './types';

function assistant(partial: Partial<ChatMessage> & Pick<ChatMessage, 'id' | 'text'>): ChatMessage {
  return {
    role: 'assistant',
    tools: [],
    streaming: true,
    ...partial,
  };
}

describe('streamTail', () => {
  it('sends the first body as appendText and omits edits', () => {
    const last = assistant({
      id: 'a1',
      text: 'hello world',
      tools: [{ id: 't1', title: 'read', status: 'done' }],
      edits: [{ path: 'a.ts', added: 1, removed: 0, previous: 'x'.repeat(20_000), next: 'y'.repeat(20_000) }],
    });
    const { tail } = buildStreamTail(emptyStreamCursor(), last, { status: 'streaming' });
    assert.equal(tail.appendText, 'hello world');
    assert.equal(tail.message.text, '');
    assert.equal(tail.message.edits, undefined);
    assert.equal(tail.message.tools.length, 1);
  });

  it('later ticks only carry the new bytes and reuse tools', () => {
    const first = assistant({
      id: 'a1',
      text: 'hello',
      tools: [{ id: 't1', title: 'read', status: 'done', detail: 'a.ts' }],
    });
    const { tail: t1, cursor } = buildStreamTail(emptyStreamCursor(), first, { status: 'streaming' });
    const web = mergeStreamTail(undefined, t1);
    const next = assistant({
      ...first,
      text: 'hello world',
      edits: [{ path: 'a.ts', added: 2, removed: 0, previous: 'old'.repeat(30_000), next: 'new'.repeat(30_000) }],
    });
    const { tail: t2 } = buildStreamTail(cursor, next, { status: 'streaming' });
    assert.equal(t2.appendText, ' world');
    assert.equal(t2.message.text, '');
    assert.equal(t2.message.tools.length, 0);
    assert.ok(JSON.stringify(t2).length < 800);
    const merged = mergeStreamTail(web, t2);
    assert.equal(merged.text, 'hello world');
    assert.equal(merged.tools.length, 1);
    assert.equal(merged.tools[0]?.title, 'read');
  });

  it('appends thinking without resending the prefix', () => {
    const first = assistant({ id: 'a1', text: '', thinking: 'why' });
    const { tail: t1, cursor } = buildStreamTail(emptyStreamCursor(), first, { status: 'streaming' });
    const web = mergeStreamTail(undefined, t1);
    assert.equal(web.thinking, 'why');
    const next = assistant({ id: 'a1', text: '', thinking: 'why not' });
    const { tail: t2 } = buildStreamTail(cursor, next, { status: 'streaming' });
    assert.equal(t2.appendThinking, ' not');
    assert.equal(t2.message.thinking, undefined);
    assert.equal(mergeStreamTail(web, t2).thinking, 'why not');
  });

  it('keeps webview edits when the host omits them', () => {
    const first = assistant({
      id: 'a1',
      text: 'hi',
      edits: [{ path: 'a.ts', added: 1, removed: 0 }],
    });
    const { tail: t1, cursor } = buildStreamTail(emptyStreamCursor(), first, { status: 'streaming' });
    const web = { ...mergeStreamTail(undefined, t1), edits: first.edits };
    const { tail: t2 } = buildStreamTail(cursor, assistant({ id: 'a1', text: 'hi!' }), {
      status: 'streaming',
    });
    const merged = mergeStreamTail(web, t2);
    assert.equal(merged.text, 'hi!');
    assert.equal(merged.edits?.[0]?.path, 'a.ts');
  });

  it('resends tools when the stamp changes', () => {
    const first = assistant({
      id: 'a1',
      text: 'x',
      tools: [{ id: 't1', title: 'read', status: 'running' }],
    });
    const { cursor } = buildStreamTail(emptyStreamCursor(), first, { status: 'streaming' });
    const next = assistant({
      id: 'a1',
      text: 'x',
      tools: [{ id: 't1', title: 'read', status: 'done' }],
    });
    const { tail } = buildStreamTail(cursor, next, { status: 'streaming' });
    assert.equal(tail.message.tools[0]?.status, 'done');
  });
});
