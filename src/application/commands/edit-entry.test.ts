import { describe, expect, it } from 'vitest';

import { InMemoryProjectStore } from '../store/in-memory-project-store';
import { bracketModifier, makeEntry, makeProject, testId } from '../testing/fixtures';
import { ApplyGroupEdit, EditEntry } from './edit-entry';

describe('entry editing', () => {
  it('edits one entry through an atomic store update', () => {
    const store = new InMemoryProjectStore(makeProject([makeEntry('one', 'One')]));
    expect(new EditEntry(store).execute(testId('one'), '一')).toEqual({
      ok: true,
      value: undefined,
    });
    expect(store.get()?.entries[0]).toMatchObject({ translatedText: '一', stage: 'translated' });
  });

  it('applies a structurally masked manual edit to a group', () => {
    const store = new InMemoryProjectStore(
      makeProject([
        makeEntry('alice', 'Hello [Alice]', { structureGroup: 'greeting' }),
        makeEntry('bob', 'Hello [Bob]', { structureGroup: 'greeting' }),
      ]),
    );
    const result = new ApplyGroupEdit(store).execute({
      entryId: testId('alice'),
      translatedText: 'こんにちは [Alice]',
      modifiers: [bracketModifier],
    });
    expect(result).toMatchObject({ ok: true, value: { updatedEntryIds: ['alice', 'bob'] } });
    expect(store.get()?.entries.map((entry) => entry.translatedText)).toEqual([
      'こんにちは [Alice]',
      'こんにちは [Bob]',
    ]);
  });

  it('requires explicit permission when a manual edit removes a protected structure', () => {
    const initial = makeProject([
      makeEntry('alice', 'Hello [Alice]', { structureGroup: 'greeting' }),
      makeEntry('bob', 'Hello [Bob]', { structureGroup: 'greeting' }),
    ]);
    const store = new InMemoryProjectStore(initial);
    const result = new ApplyGroupEdit(store).execute({
      entryId: testId('alice'),
      translatedText: 'こんにちは',
      modifiers: [bracketModifier],
    });
    expect(result).toEqual({
      ok: false,
      error: { code: 'missing_structures', originals: ['[Alice]'] },
    });
    expect(store.get()).toBe(initial);
  });
});
