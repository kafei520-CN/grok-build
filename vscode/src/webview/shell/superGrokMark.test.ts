import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { superGrokKind } from './superGrokMark';

describe('superGrokKind', () => {
  it('hides the wordmark when signed out', () => {
    assert.equal(superGrokKind(undefined, undefined), undefined);
    assert.equal(superGrokKind({}, { usagePercent: 10, products: [] }), undefined);
  });

  it('uses Heavy for SuperGrok Heavy', () => {
    const account = { email: 'a@x.ai' };
    assert.equal(
      superGrokKind(account, { usagePercent: 1, products: [], subscriptionTier: 'SuperGrok Heavy' }),
      'heavy',
    );
    assert.equal(
      superGrokKind(account, { usagePercent: 1, products: [], subscriptionTier: 'SuperGrok' }),
      'supergrok',
    );
  });
});
