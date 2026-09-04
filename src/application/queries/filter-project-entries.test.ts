import { describe, expect, it } from 'vitest';

import { InMemoryProjectStore } from '../store/in-memory-project-store';
import { makeEntry, makeProject } from '../testing/fixtures';
import { FilterProjectEntries } from './filter-project-entries';

describe('FilterProjectEntries', () => {
  it('filters domain entries without reading rendered rows', () => {
    const query = new FilterProjectEntries(
      new InMemoryProjectStore(
        makeProject([makeEntry('one', 'First'), makeEntry('two', 'Second')]),
      ),
    );
    const result = query.execute({ query: 'source:starts-with:sec' });
    expect(result).toMatchObject({ ok: true, value: [{ sourceText: 'Second' }] });
  });
});
