import { describe, expect, it } from 'vitest';

import { failure, success } from '../../shared';
import type { TranslationProvider } from '../ports/translation-provider';
import { InMemoryProjectStore } from '../store/in-memory-project-store';
import { fixedClock, makeConfiguration, makeEntry, makeProject } from '../testing/fixtures';
import { BulkTranslate } from './bulk-translate';
import { TranslateEntry } from './translate-entry';

describe('BulkTranslate', () => {
  it('enforces the requested concurrency limit', async () => {
    let active = 0;
    let maximum = 0;
    const provider: TranslationProvider = {
      async translate() {
        active += 1;
        maximum = Math.max(maximum, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
        return success({ text: '<translation>訳</translation>' });
      },
    };
    const store = new InMemoryProjectStore(
      makeProject(Array.from({ length: 5 }, (_, index) => makeEntry(`${index}`, `Text ${index}`))),
    );
    const output = await new BulkTranslate(
      new TranslateEntry(provider, store, fixedClock),
      store,
    ).execute(
      {
        configuration: makeConfiguration(),
        parallelism: 2,
        mode: 'all',
      },
      new AbortController().signal,
    );

    expect(output).toMatchObject({
      ok: true,
      value: { total: 5, succeeded: 5, failed: 0, cancelled: 0 },
    });
    expect(maximum).toBe(2);
  });

  it('stops scheduling and reports untouched jobs as cancelled', async () => {
    const controller = new AbortController();
    let calls = 0;
    const provider: TranslationProvider = {
      async translate() {
        calls += 1;
        controller.abort();
        return failure({ code: 'aborted', message: 'Aborted', retryable: true });
      },
    };
    const store = new InMemoryProjectStore(
      makeProject(Array.from({ length: 4 }, (_, index) => makeEntry(`${index}`, `Text ${index}`))),
    );
    const output = await new BulkTranslate(
      new TranslateEntry(provider, store, fixedClock),
      store,
    ).execute(
      { configuration: makeConfiguration(), parallelism: 1, mode: 'all' },
      controller.signal,
    );

    expect(output).toMatchObject({
      ok: true,
      value: { total: 4, succeeded: 0, failed: 0, cancelled: 4 },
    });
    expect(calls).toBe(1);
    expect(store.get()?.entries.every((entry) => entry.operation === 'idle')).toBe(true);
  });
});
