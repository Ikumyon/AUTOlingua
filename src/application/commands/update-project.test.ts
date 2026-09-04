import { describe, expect, it } from 'vitest';

import { appendProjectLog } from '../../domain';
import { InMemoryProjectStore } from '../store/in-memory-project-store';
import { fixedClock, makeEntry, makeProject, testId } from '../testing/fixtures';
import { ClearTranslationLog, RemoveEntries, UpdateEntryMetadata } from './update-project';

describe('project update commands', () => {
  it('updates stage and tone through domain operations', () => {
    const store = new InMemoryProjectStore(makeProject([makeEntry('one', 'One')]));
    const result = new UpdateEntryMetadata(store).execute(testId('one'), {
      stage: 'needs-review',
      toneId: testId('formal'),
    });
    expect(result.ok).toBe(true);
    expect(store.get()?.entries[0]).toMatchObject({ stage: 'needs-review', toneId: 'formal' });
  });

  it('removes entries and clears the log', () => {
    const withLog = appendProjectLog(
      makeProject([makeEntry('one', 'One'), makeEntry('two', 'Two')]),
      {
        entryId: testId('one'),
        occurredAt: fixedClock.now(),
        operation: 'test',
        outcome: 'success',
        details: {},
      },
    );
    const store = new InMemoryProjectStore(withLog);
    expect(new RemoveEntries(store).execute([testId('one')]).ok).toBe(true);
    expect(new ClearTranslationLog(store).execute().ok).toBe(true);
    expect(store.get()?.entries.map((entry) => entry.id)).toEqual(['two']);
    expect(store.get()?.log).toEqual([]);
  });
});
