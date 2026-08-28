import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { handleIncoming, type IncomingHost } from './incoming';

function host(over: Partial<IncomingHost> = {}): IncomingHost {
  return {
    applyIncomingUpdate() {},
    async requestToolPermission() {
      return {};
    },
    journal: { remember: async () => {} },
    ...over,
  };
}

describe('handleIncoming', () => {
  it('applies x.ai/models/update with or without the ext underscore', async () => {
    const payloads: unknown[] = [];
    const controller = host({
      applyModelsUpdate(params) {
        payloads.push(params);
      },
    });
    const params = {
      currentModelId: 'openai-gpt',
      availableModels: [{ modelId: 'openai-gpt', name: 'GPT' }],
    };
    await handleIncoming(controller, '_x.ai/models/update', params, 1);
    await handleIncoming(controller, 'x.ai/models/update', params, '');
    assert.equal(payloads.length, 2);
    assert.deepEqual(payloads[0], params);
  });
});
