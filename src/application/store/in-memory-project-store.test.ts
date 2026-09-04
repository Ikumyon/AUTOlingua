import { describe, expect, it, vi } from 'vitest';

import { success } from '../../shared';
import { makeEntry, makeProject } from '../testing/fixtures';
import { InMemoryProjectStore } from './in-memory-project-store';

describe('InMemoryProjectStore', () => {
  it('updates atomically and notifies subscribers', () => {
    const initial = makeProject([makeEntry('one', 'One')]);
    const replacement = makeProject([makeEntry('two', 'Two')]);
    const store = new InMemoryProjectStore(initial);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    expect(store.update(() => success(replacement))).toEqual(success(replacement));
    expect(store.get()).toBe(replacement);
    expect(listener).toHaveBeenCalledWith(replacement);

    unsubscribe();
    store.set(initial);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
