import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseSessionUpdate } from './agent';
import {
  applySessionUpdate,
  captureModels,
  finalizeReplayTimes,
  freezeTurnSteps,
  isoFromMs,
  mergeModelCatalog,
  modelsFromResult,
  parsePlanEntries,
  stampTimes,
  stampTurnModel,
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

  it('stamps the current model onto a new assistant turn', () => {
    const session = view({
      replaying: false,
      models: {
        currentId: 'endpoint-2',
        available: [
          {
            id: 'endpoint-2',
            name: '[Hu]Claude-Opus-5',
            currentEffort: 'xhigh',
            efforts: ['low', 'medium', 'high', 'xhigh', 'max'],
          },
        ],
      },
    });
    applySessionUpdate(session, {
      sessionUpdate: 'agent_message_chunk',
      content: { type: 'text', text: '你好' },
    });
    assert.equal(session.messages[0]?.modelId, 'endpoint-2');
    assert.equal(session.messages[0]?.modelName, '[Hu]Claude-Opus-5');
    assert.equal(session.messages[0]?.effort, 'xhigh');
    stampTurnModel(session.messages[0]!, {
      currentId: 'grok-4.6',
      available: [{ id: 'grok-4.6', name: 'Grok 4.6', currentEffort: 'high' }],
    });
    assert.equal(session.messages[0]?.modelId, 'endpoint-2');
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

describe('plan steps', () => {
  it('parses ACP plan entries and statuses', () => {
    const steps = parsePlanEntries([
      { content: 'Wait', status: 'pending' },
      { content: 'Edit files', status: 'in_progress' },
      { content: 'Done', status: 'completed' },
      { content: 'Broke', status: 'failed' },
      { content: 'Dropped', status: 'completed', meta: { cancelled: true } },
      { content: 'Left', status: 'cancelled' },
    ]);
    assert.deepEqual(
      steps?.map((step) => `${step.status}:${step.content}`),
      ['pending:Wait', 'in_progress:Edit files', 'completed:Done', 'failed:Broke'],
    );
  });

  it('replaces the live assistant step card from plan updates', () => {
    const session = view({ replaying: false, messages: [] });
    applySessionUpdate(session, {
      sessionUpdate: 'plan',
      entries: [
        { content: 'One', status: 'in_progress' },
        { content: 'Two', status: 'pending' },
      ],
    });
    assert.equal(session.messages[0]?.steps?.length, 2);
    assert.equal(session.messages[0]?.steps?.[0]?.status, 'in_progress');
    applySessionUpdate(session, {
      sessionUpdate: 'plan',
      entries: [
        { content: 'One', status: 'completed' },
        { content: 'Two', status: 'in_progress' },
      ],
    });
    assert.equal(session.messages[0]?.steps?.[0]?.status, 'completed');
    assert.equal(session.messages[0]?.steps?.[1]?.status, 'in_progress');
  });

  it('builds the step card from todo_write tool output', () => {
    const session = view({ replaying: false, messages: [] });
    applySessionUpdate(session, {
      sessionUpdate: 'tool_call',
      toolCallId: 'todo-1',
      title: 'todo_write',
      kind: 'plan',
      status: 'in_progress',
      rawInput: {
        merge: false,
        todos: [
          { content: 'Fold the card', status: 'in_progress' },
          { content: 'Mute leftover', status: 'pending' },
        ],
      },
    });
    assert.equal(session.messages[0]?.tools.length, 0);
    assert.equal(session.messages[0]?.steps?.length, 2);
    applySessionUpdate(session, {
      sessionUpdate: 'tool_call_update',
      toolCallId: 'todo-1',
      title: 'todo_write',
      kind: 'plan',
      status: 'completed',
      rawOutput: {
        type: 'Todo',
        TodosUpdated: {
          todos: [
            { content: 'Fold the card', status: 'completed' },
            { content: 'Mute leftover', status: 'cancelled' },
          ],
        },
      },
    });
    assert.equal(session.messages[0]?.steps?.[0]?.status, 'completed');
    assert.equal(session.messages[0]?.steps?.length, 1);
  });

  it('does not paint leftover todos onto a finished turn after restore', () => {
    const session = view({
      replaying: false,
      replayUpdate: false,
      messages: [
        {
          id: 'assistant-1',
          role: 'assistant',
          text: 'done',
          tools: [],
          streaming: false,
        },
      ],
    });
    applySessionUpdate(session, {
      sessionUpdate: 'plan',
      entries: [{ content: '停止后卡不消失，未完成变浅色', status: 'cancelled' }],
    });
    assert.equal(session.messages.length, 1);
    assert.equal(session.messages[0]?.steps?.length ?? 0, 0);
  });

  it('reads live todo_write rawInput as plan entries', () => {
    const parsed = parseSessionUpdate({
      sessionId: 's',
      update: {
        sessionUpdate: 'tool_call',
        title: 'todo_write',
        rawInput: {
          todos: [{ content: 'Insert live', status: 'in_progress' }],
        },
      },
    });
    assert.equal(parsed.update.sessionUpdate, 'tool_call');
    const session = view({ replaying: false, messages: [] });
    applySessionUpdate(session, parsed.update);
    assert.equal(session.messages[0]?.steps?.[0]?.content, 'Insert live');
    assert.equal(session.messages[0]?.steps?.[0]?.status, 'in_progress');
  });

  it('keeps the step card and mutes leftover items when the turn stops', () => {
    const session = view({ replaying: false, messages: [] });
    applySessionUpdate(session, {
      sessionUpdate: 'plan',
      entries: [
        { content: 'Done', status: 'completed' },
        { content: 'Running', status: 'in_progress' },
        { content: 'Waiting', status: 'pending' },
      ],
    });
    const assistant = session.messages[0];
    assistant.streaming = false;
    freezeTurnSteps(assistant);
    assert.equal(assistant.steps?.length, 3);
    assert.deepEqual(
      assistant.steps?.map((step) => `${step.status}:${step.content}`),
      ['completed:Done', 'abandoned:Running', 'abandoned:Waiting'],
    );
    assert.equal(
      assistant.steps?.some((step) => step.content.includes('停止后')),
      false,
    );
    applySessionUpdate(session, {
      sessionUpdate: 'plan',
      entries: [
        { content: 'Done', status: 'completed' },
        { content: 'Running', status: 'completed' },
        { content: 'Waiting', status: 'completed' },
      ],
    });
    assert.equal(assistant.steps?.[1]?.status, 'abandoned');
    applySessionUpdate(session, { sessionUpdate: 'plan', entries: [] });
    assert.equal(assistant.steps?.length, 3);
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

