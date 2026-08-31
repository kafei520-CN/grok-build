import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { GrokController } from './controller';
import { dispatchUi } from './dispatch';

describe('dispatchUi', () => {
  it('routes editUserPrompt so confirm can rewind and resend', async () => {
    const seen: string[] = [];
    const controller = {
      async editUserPrompt(messageId: string, text: string) {
        seen.push(`${messageId}:${text}`);
      },
    } as unknown as GrokController;
    await dispatchUi(controller, { type: 'editUserPrompt', messageId: 'u1', text: 'hello' });
    assert.deepEqual(seen, ['u1:hello']);
  });

  it('routes pasteClipboard so dropped files attach', async () => {
    const seen: string[][] = [];
    const controller = {
      async pasteClipboard(payload: { uris?: string[] }) {
        seen.push(payload.uris ?? []);
      },
    } as unknown as GrokController;
    await dispatchUi(controller, {
      type: 'pasteClipboard',
      uris: ['file:///C:/work/a.ts'],
    });
    assert.deepEqual(seen, [['file:///C:/work/a.ts']]);
  });

  it('routes skipLogin so the start screen is not required', async () => {
    const seen: string[] = [];
    const controller = {
      async skipLogin() {
        seen.push('skip');
      },
    } as unknown as GrokController;
    await dispatchUi(controller, { type: 'skipLogin' });
    assert.deepEqual(seen, ['skip']);
  });

  it('routes wallpaper preview open and close', async () => {
    const seen: string[] = [];
    const controller = {
      openThemePreview() {
        seen.push('open');
      },
      closeThemePreview() {
        seen.push('close');
      },
    } as unknown as GrokController;
    await dispatchUi(controller, { type: 'openThemePreview' });
    await dispatchUi(controller, { type: 'closeThemePreview' });
    assert.deepEqual(seen, ['open', 'close']);
  });
});
