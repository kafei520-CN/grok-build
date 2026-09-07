import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyStoredTurnModels,
  assistantStamps,
  isCustomModelId,
  isOfficialGrokStamp,
  overlayApiModels,
} from './turnModels';
import type { ChatMessage } from './types';

describe('turn model stamps', () => {
  it('treats endpoint-* as custom and Grok 4.6 as official', () => {
    assert.equal(isCustomModelId('endpoint-1'), true);
    assert.equal(isCustomModelId('grok-4.6'), false);
    assert.equal(isOfficialGrokStamp({ modelId: 'grok-4.6', modelName: 'Grok 4.6' }), true);
    assert.equal(
      isOfficialGrokStamp({ modelId: 'endpoint-1', modelName: '[La]Grok 4.6' }),
      false,
    );
  });

  it('overlays API manager names onto the catalog', () => {
    const next = overlayApiModels(
      {
        currentId: 'grok-4.6',
        available: [{ id: 'grok-4.6', name: 'Grok 4.6', currentEffort: 'high' }],
      },
      [
        {
          id: 'endpoint-1',
          name: '[La]Grok 4.6',
          model: 'grok-4.6',
          baseUrl: 'https://relay.example/v1',
          backend: 'chat_completions',
          hasKey: true,
          enabled: true,
        },
      ],
    );
    assert.equal(next?.available.some((model) => model.id === 'endpoint-1'), true);
    assert.equal(next?.available.find((model) => model.id === 'endpoint-1')?.name, '[La]Grok 4.6');
  });

  it('replays stored model_name onto restored assistant turns', () => {
    const messages: ChatMessage[] = [
      { id: 'u', role: 'user', text: 'hi', tools: [] },
      { id: 'a', role: 'assistant', text: 'ok', tools: [] },
    ];
    applyStoredTurnModels(messages, [
      { modelId: 'endpoint-1', modelName: '[La]Grok 4.6', effort: 'high' },
    ]);
    assert.equal(messages[1]?.modelId, 'endpoint-1');
    assert.equal(messages[1]?.modelName, '[La]Grok 4.6');
    assert.equal(messages[1]?.effort, 'high');
    assert.deepEqual(assistantStamps(messages), [
      { modelId: 'endpoint-1', modelName: '[La]Grok 4.6', effort: 'high' },
    ]);
  });
});
