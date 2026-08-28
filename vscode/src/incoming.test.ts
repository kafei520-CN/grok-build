import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { handleIncoming, METHOD_NOT_FOUND, type IncomingHost } from './incoming';
import { RpcError } from './rpc';

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

  it('rejects unknown client requests instead of acking them', async () => {
    await assert.rejects(
      () => handleIncoming(host(), 'session/foo', {}, 7),
      (error: unknown) =>
        error instanceof RpcError &&
        error.code === METHOD_NOT_FOUND &&
        error.message.includes('session/foo'),
    );
  });

  it('ignores unknown notifications', async () => {
    const result = await handleIncoming(host(), 'x.ai/fs/index', {}, '');
    assert.deepEqual(result, {});
  });

  it('refreshes MCP rows on catalog notifications', async () => {
    let n = 0;
    await handleIncoming(host({ refreshMcps: () => { n += 1; } }), 'x.ai/mcp/servers_updated', {}, '');
    assert.equal(n, 1);
  });
});
