import { describe, expect, it } from 'vitest';

import { identifierFrom, instantFrom, type Identifier, type Instant } from '../../shared';
import { createTranslationEntry, editTranslation } from './translation-entry';
import { createTranslationProject, replaceProjectEntry } from './translation-project';
import { stageAfterTextEdit } from './translation-stage';

const id = <Tag extends string>(value: string): Identifier<Tag> => {
  const result = identifierFrom<Tag>(value);
  if (!result.ok) throw new Error('invalid test identifier');
  return result.value;
};

const instant = (value: string): Instant => {
  const result = instantFrom(value);
  if (!result.ok) throw new Error('invalid test instant');
  return result.value;
};

describe('translation project', () => {
  it('creates an entry and derives its initial stage from translated text', () => {
    const result = createTranslationEntry({
      id: id('entry-1'),
      sourceKey: ' greeting ',
      sourceText: 'Hello',
      translatedText: 'こんにちは',
    });

    expect(result).toMatchObject({
      ok: true,
      value: { sourceKey: 'greeting', stage: 'translated', operation: 'idle' },
    });
  });

  it('preserves an explicit review stage when text changes and resets empty text', () => {
    expect(stageAfterTextEdit('reviewed', 'updated')).toBe('reviewed');
    expect(stageAfterTextEdit('reviewed', '  ')).toBe('untranslated');
  });

  it('rejects duplicate entry identity and replaces entries immutably', () => {
    const entryResult = createTranslationEntry({
      id: id('entry-1'),
      sourceKey: 'greeting',
      sourceText: 'Hello',
    });
    if (!entryResult.ok) throw new Error('test entry creation failed');
    const duplicate = createTranslationProject({
      id: id('project-1'),
      source: { fileName: 'source.yml', mediaType: 'text/yaml' },
      entries: [entryResult.value, entryResult.value],
      rejectedRecords: [],
      log: [],
    });
    expect(duplicate).toEqual({ ok: false, error: 'duplicate_entry_id' });

    const projectResult = createTranslationProject({
      id: id('project-1'),
      source: { fileName: 'source.yml', mediaType: 'text/yaml' },
      entries: [entryResult.value],
      rejectedRecords: [],
      log: [
        {
          entryId: entryResult.value.id,
          occurredAt: instant('2026-09-04T00:00:00Z'),
          operation: 'import',
          outcome: 'success',
          details: {},
        },
      ],
    });
    if (!projectResult.ok) throw new Error('test project creation failed');
    const edited = editTranslation(entryResult.value, 'こんにちは');
    const replaced = replaceProjectEntry(projectResult.value, edited);

    expect(replaced).toMatchObject({
      ok: true,
      value: { entries: [{ translatedText: 'こんにちは', stage: 'translated' }] },
    });
    expect(projectResult.value.entries[0]?.translatedText).toBe('');
  });
});
