import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  findInteractiveAuthMethod,
  needsInteractiveLogin,
  selectEagerAuthMethod,
} from './authMethods';

describe('authMethods', () => {
  it('requires login when grok.com is first', () => {
    const methods = [{ id: 'grok.com', name: 'Grok' }];
    assert.equal(needsInteractiveLogin(methods), true);
    assert.equal(findInteractiveAuthMethod(methods)?.id, 'grok.com');
  });

  it('does not require login when a cached token is first', () => {
    const methods = [
      { id: 'cached_token', name: 'cached_token' },
      { id: 'grok.com', name: 'Grok' },
    ];
    assert.equal(needsInteractiveLogin(methods), false);
    assert.equal(selectEagerAuthMethod(methods, 'cached_token'), 'cached_token');
  });

  it('prefers the agent default when it is advertised', () => {
    const methods = [
      { id: 'xai.api_key', name: 'API key' },
      { id: 'cached_token', name: 'cached_token' },
    ];
    assert.equal(selectEagerAuthMethod(methods, 'cached_token'), 'cached_token');
  });

  it('falls back to the first method', () => {
    const methods = [{ id: 'xai.api_key', name: 'API key' }];
    assert.equal(selectEagerAuthMethod(methods), 'xai.api_key');
  });
});
