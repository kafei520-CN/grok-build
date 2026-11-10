import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyDeprecated,
  conversationRecall,
  deprecateClickedTurn,
  deprecatedNotice,
  stripDeprecatedText,
} from './deprecatedTurn';

describe('deprecateClickedTurn', () => {
  const turns = () => [
    { id: 'u1', role: 'user', text: '11', promptIndex: 0 },
    { id: 'a1', role: 'assistant', text: 'one' },
    { id: 'u2', role: 'user', text: '12', promptIndex: 2 },
    { id: 'a2', role: 'assistant', text: 'two' },
    { id: 'u3', role: 'user', text: '13', promptIndex: 4 },
    { id: 'a3', role: 'assistant', text: 'three' },
  ];

  it('marks the clicked turn and leaves the neighbors', () => {
    const messages = turns();
    assert.equal(deprecateClickedTurn(messages, 'a2'), true);
    assert.deepEqual(
      messages.map((message) => message.deprecated === true),
      [false, false, true, true, false, false],
    );
  });

  it('marks the latest turn from its own user bubble', () => {
    const messages = turns();
    deprecateClickedTurn(messages, 'a3');
    assert.equal(messages[4]?.deprecated, true);
    assert.equal(messages[5]?.deprecated, true);
    assert.equal(messages[3]?.deprecated, undefined);
  });

  it('does not treat a user click as a turn', () => {
    const messages = turns();
    assert.equal(deprecateClickedTurn(messages, 'u2'), false);
  });
});

describe('applyDeprecated', () => {
  it('restores by that bubble prompt index, not by how many bubbles came first', () => {
    const messages = [
      { id: 'u1', role: 'user', text: '11', promptIndex: 0 },
      { id: 'a1', role: 'assistant', text: 'one' },
      { id: 'u2', role: 'user', text: '12', promptIndex: 2 },
      { id: 'a2', role: 'assistant', text: 'two' },
    ];
    applyDeprecated(messages, [{ promptIndex: 2, text: '12' }]);
    assert.equal(messages[0]?.deprecated, undefined);
    assert.equal(messages[2]?.deprecated, true);
    assert.equal(messages[3]?.deprecated, true);
  });

  it('matches duplicate text from the end', () => {
    const messages = [
      { id: 'u1', role: 'user', text: '11' },
      { id: 'a1', role: 'assistant', text: 'one' },
      { id: 'u2', role: 'user', text: '11' },
      { id: 'a2', role: 'assistant', text: 'again' },
    ];
    applyDeprecated(messages, [{ text: '11' }]);
    assert.equal(messages[0]?.deprecated, undefined);
    assert.equal(messages[2]?.deprecated, true);
  });
});

describe('deprecatedNotice', () => {
  it('removes the reminder from a stored user turn', () => {
    const text =
      '第二个数字是多少\n\n[deprecated]\nRemember it.\n- 18\n[/deprecated]\n\n[conversation]\n- 15\n[/conversation]';
    assert.equal(stripDeprecatedText(text), '第二个数字是多少');
  });

  it('restates recent turns as memory, including a withdrawn one', () => {
    const text = conversationRecall([
      { id: 'u1', role: 'user', text: '第一个数字是15' },
      { id: 'a1', role: 'assistant', text: '15' },
      { id: 'u2', role: 'user', text: '第二个数字是18', deprecated: true },
    ]);
    assert.match(text, /第一个数字是15/);
    assert.match(text, /\(withdrawn\) 第二个数字是18/);
    assert.match(text, /ignore that note/);
  });

  it('mentions a deprecated turn once', () => {
    const messages = [{ id: 'u1', role: 'user', text: '12', deprecated: true }];
    const first = deprecatedNotice(messages);
    assert.match(first, /12/);
    assert.equal(deprecatedNotice(messages), '');
  });
});
