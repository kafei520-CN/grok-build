import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatAgentError,
  formatErrorLine,
  formatRetryUpdate,
  extractFromText,
  isCancelError,
} from './errors';
import { RpcError } from './rpc';

describe('agent errors', () => {
  it('pulls HTTP status and body out of ACP error data', () => {
    const error = formatAgentError(
      new RpcError('Internal error', -32603, {
        message: 'invalid JSON request body',
        http_status: 400,
      }),
    );
    assert.equal(error.code, 'HTTP 400');
    assert.equal(error.message, 'invalid JSON request body');
    assert.equal(formatErrorLine(error), '[HTTP 400] invalid JSON request body');
  });

  it('keeps provider error codes from nested envelopes', () => {
    const error = formatAgentError(
      new RpcError('Internal error', -32603, {
        error: { code: 'model_not_found', message: 'unknown model', type: 'new_api_error' },
      }),
    );
    assert.equal(error.code, 'model_not_found');
    assert.equal(error.message, 'unknown model');
  });

  it('labels empty-response reasons as the error code', () => {
    const error = extractFromText(
      'empty response from model (no_visible_content): model=gpt-5.6-terra, had_reasoning=false, finish_reason=',
    );
    assert.equal(error.code, 'no_visible_content');
    assert.match(error.message, /empty response/);
  });

  it('strips the SamplingError API prefix down to HTTP + body', () => {
    const error = extractFromText(
      'API error (status 429 Too Many Requests): You are sending requests too quickly.',
    );
    assert.equal(error.code, 'HTTP 429');
    assert.equal(error.message, 'You are sending requests too quickly.');
  });

  it('formats in-flight retry_state updates', () => {
    const error = formatRetryUpdate({
      sessionUpdate: 'retry_state',
      type: 'retrying',
      attempt: 2,
      maxRetries: 15,
      reason: 'empty response from model (no_visible_content)',
    });
    assert.equal(error.retrying, true);
    assert.equal(error.attempt, 2);
    assert.equal(error.maxAttempts, 15);
    assert.equal(error.code, 'no_visible_content');
  });

  it('treats cancelled ACP errors as cancel', () => {
    assert.equal(isCancelError(new RpcError('Request cancelled', -32000)), true);
    assert.equal(isCancelError(new RpcError('Internal error', -32603, 'cancelled by user')), true);
    assert.equal(isCancelError(new RpcError('Internal error', -32603, { message: 'ok' })), false);
  });

  it('formats terminal retry_state failures with error_type', () => {
    const error = formatRetryUpdate({
      sessionUpdate: 'retry_state',
      type: 'failed',
      errorType: 'auth',
      message: 'Unauthorized (401)',
    });
    assert.equal(error.retrying, undefined);
    assert.equal(error.code, 'HTTP 401');
    assert.match(error.message, /Unauthorized/);
  });
});
