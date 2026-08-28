import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applySessionUpdate,
  captureModels,
  finalizeReplayTimes,
  isoFromMs,
  mergeModelCatalog,
  modelsFromResult,
  stampTimes,
  type SessionView,
} from './sessionUpdates';
import type { ChatMessage } from './types';

function view(over: Partial<SessionView> = {}): SessionView {
  return {
    replaying: true,
    messages: [],
    nextTurn: (() => {
      let n = 0;
      return () => {
        n += 1;
        return n;
      };
    })(),
    modeId: 'default',
    commands: [],
    meter: { applyUpdate: () => false } as unknown as SessionView['meter'],
    rememberFile: async () => {},
    capturePrevious: () => {},
    displayPath: (filePath) => filePath,
    emitUnlessReplaying: () => {},
    ...over,
  };
}

describe('session replay times', () => {
  it('converts agent timestamps to ISO', () => {
    assert.equal(isoFromMs(1_700_000_000_000), new Date(1_700_000_000_000).toISOString());
    assert.equal(isoFromMs(0), undefined);
  });

  it('stamps createdAt once and endedAt on replay', () => {
    const message: ChatMessage = { id: 'a', role: 'assistant', text: '', tools: [] };
    stampTimes(
      message,
      { turnStartMs: 1_700_000_000_000, agentTimestampMs: 1_700_000_003_200 },
      true,
    );
    assert.equal(message.createdAt, new Date(1_700_000_000_000).toISOString());
    assert.equal(message.endedAt, new Date(1_700_000_003_200).toISOString());
    stampTimes(message, { turnStartMs: 9, agentTimestampMs: 1_700_000_004_000 }, true);
    assert.equal(message.createdAt, new Date(1_700_000_000_000).toISOString());
    assert.equal(message.endedAt, new Date(1_700_000_004_000).toISOString());
  });

  it('applies replay thought times from ACP meta', () => {
    const session = view();
    applySessionUpdate(session, {
      sessionUpdate: 'agent_thought_chunk',
      content: { type: 'text', text: 'hmm' },
      turnStartMs: 1_700_000_000_000,
      agentTimestampMs: 1_700_000_002_500,
    });
    const assistant = session.messages[0];
    assert.equal(assistant.role, 'assistant');
    assert.equal(assistant.streaming, false);
    assert.equal(assistant.createdAt, new Date(1_700_000_000_000).toISOString());
    assert.equal(assistant.endedAt, new Date(1_700_000_002_500).toISOString());
  });

  it('fills missing endedAt after replay', () => {
    const messages: ChatMessage[] = [
      { id: 'a', role: 'assistant', text: 'hi', tools: [], createdAt: '2026-01-01T00:00:00.000Z' },
    ];
    finalizeReplayTimes(messages);
    assert.equal(messages[0].endedAt, '2026-01-01T00:00:00.000Z');
    assert.equal(messages[0].streaming, false);
  });
});

describe('session replay edits', () => {
  it('captures previous text from replayed diffs', () => {
    const captured: Array<{ path: string; previous: string }> = [];
    const session = view({
      capturePrevious: (filePath, previous) => {
        captured.push({ path: filePath, previous });
      },
    });
    applySessionUpdate(session, {
      sessionUpdate: 'tool_call_update',
      kind: 'edit',
      status: 'completed',
      title: 'foo.ts',
      content: {
        type: 'diff',
        path: 'src/foo.ts',
        oldText: 'let x = 1;\n',
        newText: 'let x = 2;\n',
      },
    });
    assert.equal(captured.length, 1);
    assert.equal(captured[0].path, 'src/foo.ts');
    assert.equal(captured[0].previous, 'let x = 1;\n');
    assert.equal(session.messages[0].edits?.[0].path, 'src/foo.ts');
    assert.equal(session.messages[0].edits?.[0].added, 1);
  });
});

describe('model catalog', () => {
  it('captures a SessionModelState payload', () => {
    const models = captureModels({
      currentModelId: 'grok-4',
      availableModels: [
        { modelId: 'grok-4', name: 'Grok 4' },
        { modelId: 'openai-gpt', name: 'GPT' },
      ],
    });
    assert.equal(models?.currentId, 'grok-4');
    assert.equal(models?.available.length, 2);
    assert.equal(models?.available[1].id, 'openai-gpt');
  });

  it('reads x.ai/models/list wrapped in ExtMethodResult', () => {
    const models = modelsFromResult({
      result: {
        currentModelId: 'custom',
        availableModels: [{ modelId: 'custom', name: 'Custom' }],
      },
    });
    assert.equal(models?.currentId, 'custom');
    assert.equal(models?.available[0].name, 'Custom');
  });

  it('keeps the session model and effort across catalog refresh', () => {
    const next = mergeModelCatalog(
      {
        currentId: 'grok-4',
        available: [{ id: 'grok-4', name: 'Grok 4', currentEffort: 'xhigh', efforts: ['high'] }],
      },
      {
        currentModelId: 'openai-gpt',
        availableModels: [
          {
            modelId: 'grok-4',
            name: 'Grok 4',
            _meta: { reasoningEffort: 'high', reasoningEfforts: [{ id: 'high' }, { id: 'xhigh' }] },
          },
          { modelId: 'openai-gpt', name: 'GPT' },
        ],
      },
    );
    assert.equal(next?.currentId, 'grok-4');
    assert.equal(next?.available.length, 2);
    assert.equal(next?.available[0].currentEffort, 'xhigh');
    assert.deepEqual(next?.available[0].efforts, ['high', 'xhigh']);
  });
});

describe('unknown session updates', () => {
  it('does not open a blank streaming turn for non-content updates', () => {
    const session = view({ replaying: false, messages: [] });
    applySessionUpdate(session, { sessionUpdate: 'git_branch_update' });
    applySessionUpdate(session, { sessionUpdate: 'session_info_update' });
    assert.equal(session.messages.length, 0);
  });
});

describe('retry errors', () => {
  it('attaches retry_state to the live assistant turn', () => {
    const session = view({ replaying: false, messages: [] });
    applySessionUpdate(session, {
      sessionUpdate: 'agent_message_chunk',
      content: { type: 'text', text: '' },
    });
    applySessionUpdate(session, {
      sessionUpdate: 'retry_state',
      type: 'retrying',
      attempt: 1,
      maxRetries: 15,
      reason: 'empty response from model (no_visible_content)',
    });
    const assistant = session.messages[0];
    assert.equal(assistant.role, 'assistant');
    assert.equal(assistant.error?.retrying, true);
    assert.equal(assistant.error?.code, 'no_visible_content');
    applySessionUpdate(session, {
      sessionUpdate: 'retry_state',
      type: 'failed',
      errorType: 'empty_response',
      message: 'empty response from model (no_visible_content)',
    });
    assert.equal(assistant.error?.retrying, undefined);
    assert.equal(assistant.streaming, false);
    assert.equal(assistant.error?.code, 'no_visible_content');
  });
});

