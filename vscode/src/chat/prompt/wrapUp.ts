import * as path from 'node:path';
import { plat } from '../../core/platform';
import type { ContentBlock } from '../../core/types';

export const WRAP_UP_RULE_FILE = 'opengrok-wrap-up.md';

/** Standing wrap-up prompt. Grok loads ~/.grok/rules; we also send it with each turn. */
export const WRAP_UP_NOTE = `# OpenGrok wrap-up

Write like Codex. Do not glue the whole answer into one paragraph.

- Keep the reasoning process in thinking. The panel shows that text.
- The cause, the result, and file chips belong in the assistant reply. Do not leave them only in thinking.
- Do not state a cause, a finished fix, or a recap until you have actually found it in the code or in tool output.
- Once it is found, write it in the conversation as well. Do not wait until every edit is done.
- Use short paragraphs and indented bullets. Break lines after each point.
- Mark a file or folder only as @File:"path", for example @File:"plugin/src/foo.ts".
- Mark a method only as @Line:"name(line 12)", for example @Line:"updateTarget(line 12)".
- Do not use a bare @path. Fractions, versions, and ordinary words stay plain text.
- Skip this recap for greetings or simple Q&A.

After real work, end the reply with:
1. What changed and why (the cause you found).
2. Bullets of concrete effects.
3. Real file chips, one per line, e.g. @File:"path/to/artifact.jar".
`;

export function wrapUpMeta(): { instructions: string } {
  return { instructions: WRAP_UP_NOTE };
}

export function wrapUpPromptBlock(): ContentBlock {
  return { type: 'text', text: WRAP_UP_NOTE };
}

const WRAP_UP_MARK = '# OpenGrok wrap-up';

/** CLI persists extra prompt blocks onto the user turn; strip them for display. */
export function stripWrapUpText(text: string): string {
  const idx = text.indexOf(WRAP_UP_MARK);
  if (idx < 0) {
    return text;
  }
  return text.slice(0, idx).replace(/[#\s]+$/u, '').trimEnd();
}

export function wrapUpRulePath(homeDir: string): string {
  return path.join(homeDir, '.grok', 'rules', WRAP_UP_RULE_FILE);
}

export async function ensureWrapUpRule(): Promise<void> {
  const filePath = wrapUpRulePath(plat().homeDir());
  const next = Buffer.from(WRAP_UP_NOTE, 'utf8');
  try {
    const prev = await plat().readFile(filePath);
    if (Buffer.from(prev).equals(next)) {
      return;
    }
  } catch {
    /* create */
  }
  await plat().writeFile(filePath, next);
}
