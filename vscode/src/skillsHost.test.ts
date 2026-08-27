import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseSkillMeta, safeSkillDirName } from './skillsHost';

describe('skills files', () => {
  it('reads name and description from frontmatter', () => {
    const meta = parseSkillMeta(
      '---\nname: commit\ndescription: Make a conventional commit.\n---\n\n# Body\n',
    );
    assert.equal(meta.name, 'commit');
    assert.equal(meta.description, 'Make a conventional commit.');
  });

  it('returns empty meta without a frontmatter block', () => {
    assert.deepEqual(parseSkillMeta('# just markdown\n'), {});
  });

  it('sanitizes skill directory names', () => {
    assert.equal(safeSkillDirName('Review PR'), 'Review-PR');
    assert.equal(safeSkillDirName('foo:bar'), 'foo-bar');
  });
});
