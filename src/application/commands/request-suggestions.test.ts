import { describe, expect, it } from 'vitest';

import { success } from '../../shared';
import type { TranslationProvider } from '../ports/translation-provider';
import { InMemoryProjectStore } from '../store/in-memory-project-store';
import { fixedClock, makeConfiguration, makeEntry, makeProject, testId } from '../testing/fixtures';
import { RequestSuggestions } from './request-suggestions';
import { TranslateEntry } from './translate-entry';

describe('RequestSuggestions', () => {
  it('returns model-labelled candidates without applying them', async () => {
    const provider: TranslationProvider = {
      async translate(request) {
        return success({ text: `<translation>${request.modelId}の候補</translation>` });
      },
    };
    const store = new InMemoryProjectStore(makeProject([makeEntry('one', 'One')]));
    const result = await new RequestSuggestions(
      new TranslateEntry(provider, store, fixedClock),
    ).execute(
      {
        entryId: testId('one'),
        configuration: makeConfiguration(),
        modelIds: ['model-a', 'model-b'],
      },
      new AbortController().signal,
    );

    expect(result).toMatchObject({
      ok: true,
      value: [
        { modelId: 'model-a', translation: { text: 'model-aの候補' } },
        { modelId: 'model-b', translation: { text: 'model-bの候補' } },
      ],
    });
    expect(store.get()?.entries[0]).toMatchObject({ translatedText: '', operation: 'idle' });
  });
});
