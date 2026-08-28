import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  deleteModelEndpoint,
  normalizeBaseUrl,
  parseModelEndpoints,
  repairCustomModelDefaults,
  repairModelEndpointUrls,
  safeModelId,
  upsertModelEndpoint,
} from './apiEndpoints';

describe('api endpoints toml', () => {
  it('parses model tables and leaves other config alone', () => {
    const toml = `
[models]
default = "grok-4.5"

[model.gpt-4o]
name = "GPT-4o"
model = "gpt-4o"
base_url = "https://api.openai.com/v1"
api_backend = "chat_completions"
api_key = "sk-test"
`;
    const rows = parseModelEndpoints(toml);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.id, 'gpt-4o');
    assert.equal(rows[0]?.baseUrl, 'https://api.openai.com/v1');
    assert.equal(rows[0]?.hasKey, true);
  });

  it('inserts a model table without dropping existing sections', () => {
    const next = upsertModelEndpoint('[models]\ndefault = "grok-4.5"\n', {
      name: 'Local',
      model: 'llama',
      baseUrl: 'http://127.0.0.1:11434/v1',
      backend: 'chat_completions',
      apiKey: 'ollama',
    });
    assert.match(next, /\[models\]/);
    assert.match(next, /\[model\.local\]/);
    assert.match(next, /base_url = "http:\/\/127.0.0.1:11434\/v1"/);
  });

  it('updates and deletes a model table', () => {
    const first = upsertModelEndpoint('', {
      name: 'GPT',
      model: 'gpt-4o',
      baseUrl: 'https://api.openai.com/v1',
      backend: 'chat_completions',
      apiKey: 'sk-1',
    });
    const updated = upsertModelEndpoint(first, {
      id: 'gpt',
      name: 'GPT',
      model: 'gpt-4o-mini',
      baseUrl: 'https://api.openai.com/v1',
      backend: 'responses',
    });
    assert.match(updated, /gpt-4o-mini/);
    assert.match(updated, /api_key = "sk-1"/);
    const gone = deleteModelEndpoint(updated, 'gpt');
    assert.equal(parseModelEndpoints(gone).length, 0);
  });

  it('sanitizes model ids', () => {
    assert.equal(safeModelId('GPT 4o'), 'gpt-4o');
  });

  it('normalizes origin-only OpenAI compatible URLs to /v1', () => {
    assert.equal(normalizeBaseUrl('https://huskyapi.com'), 'https://huskyapi.com/v1');
    assert.equal(
      normalizeBaseUrl('https://huskyapi.com/chat/completions'),
      'https://huskyapi.com/v1',
    );
    assert.equal(normalizeBaseUrl('https://api.openai.com/v1'), 'https://api.openai.com/v1');
    assert.equal(
      normalizeBaseUrl('https://openrouter.ai/api/v1'),
      'https://openrouter.ai/api/v1',
    );
  });

  it('repairs origin-only base_url in existing toml', () => {
    const next = repairModelEndpointUrls(`
[model.huskyapi-gpt]
name = "HuskyAPI-GPT"
model = "gpt-5.6-terra"
base_url = "https://huskyapi.com"
api_backend = "chat_completions"
api_key = "sk-test"
`);
    assert.match(next, /base_url = "https:\/\/huskyapi.com\/v1"/);
    assert.match(next, /api_key = "sk-test"/);
  });

  it('writes identity and default reasoning effort for custom models', () => {
    const next = upsertModelEndpoint('', {
      name: 'HuskyAPI-GPT',
      model: 'gpt-5.6-terra',
      baseUrl: 'https://huskyapi.com/v1',
      backend: 'chat_completions',
      apiKey: 'sk-test',
    });
    assert.match(next, /system_prompt_label = "HuskyAPI-GPT"/);
    assert.match(next, /supports_reasoning_effort = true/);
    assert.match(next, /reasoning_effort = "high"/);
    assert.match(next, /reasoning_efforts = \["low", "medium", "high", "xhigh"\]/);
  });

  it('fills missing identity and effort on existing endpoints', () => {
    const next = repairCustomModelDefaults(`
[model.huskyapi-gpt]
name = "HuskyAPI-GPT"
model = "gpt-5.6-terra"
base_url = "https://huskyapi.com/v1"
api_backend = "chat_completions"
api_key = "sk-test"
`);
    assert.match(next, /system_prompt_label = "HuskyAPI-GPT"/);
    assert.match(next, /supports_reasoning_effort = true/);
    assert.match(next, /reasoning_effort = "high"/);
    assert.match(next, /api_key = "sk-test"/);
  });
});
