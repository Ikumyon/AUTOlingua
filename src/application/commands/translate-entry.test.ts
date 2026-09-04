import { describe, expect, it } from 'vitest';

import { failure, success, type Result } from '../../shared';
import type {
  TranslationProvider,
  TranslationProviderFailure,
  TranslationProviderRequest,
  TranslationProviderResponse,
} from '../ports/translation-provider';
import { InMemoryProjectStore } from '../store/in-memory-project-store';
import {
  bracketModifier,
  fixedClock,
  makeConfiguration,
  makeEntry,
  makeProject,
  testId,
} from '../testing/fixtures';
import { EditEntry } from './edit-entry';
import { TranslateEntry } from './translate-entry';

class FakeProvider implements TranslationProvider {
  public readonly requests: TranslationProviderRequest[] = [];

  public constructor(
    private readonly respond: (
      request: TranslationProviderRequest,
      signal: AbortSignal,
    ) => Promise<Result<TranslationProviderResponse, TranslationProviderFailure>>,
  ) {}

  public async translate(
    request: TranslationProviderRequest,
    signal: AbortSignal,
  ): Promise<Result<TranslationProviderResponse, TranslationProviderFailure>> {
    this.requests.push(request);
    return this.respond(request, signal);
  }
}

describe('TranslateEntry', () => {
  it('translates and restores all compatible entries in a structure group', async () => {
    const store = new InMemoryProjectStore(
      makeProject([
        makeEntry('alice', 'Hello [Alice]', { structureGroup: 'greeting' }),
        makeEntry('bob', 'Hello [Bob]', { structureGroup: 'greeting' }),
      ]),
    );
    const provider = new FakeProvider(async (request) =>
      success({
        text: `<translation>こんにちは ${request.prompt.userMessage.match(/⟦T\d+⟧/)?.[0]}</translation>`,
      }),
    );
    const result = await new TranslateEntry(provider, store, fixedClock).execute(
      {
        entryId: testId('alice'),
        configuration: makeConfiguration({ modifiers: [bracketModifier] }),
        includeStructureGroup: true,
      },
      new AbortController().signal,
    );

    expect(result).toMatchObject({ ok: true, value: { translatedEntryIds: ['alice', 'bob'] } });
    expect(store.get()?.entries.map((entry) => entry.translatedText)).toEqual([
      'こんにちは [Alice]',
      'こんにちは [Bob]',
    ]);
    expect(store.get()?.entries.every((entry) => entry.operation === 'idle')).toBe(true);
    expect(provider.requests).toHaveLength(1);
    expect(store.get()?.log).toHaveLength(2);
  });

  it('marks an entry failed when the provider changes protected tokens', async () => {
    const store = new InMemoryProjectStore(
      makeProject([makeEntry('alice', 'Hello [Alice]', { structureGroup: 'greeting' })]),
    );
    const provider = new FakeProvider(async () =>
      success({ text: '<translation>こんにちは</translation>' }),
    );
    const result = await new TranslateEntry(provider, store, fixedClock).execute(
      {
        entryId: testId('alice'),
        configuration: makeConfiguration({ modifiers: [bracketModifier] }),
      },
      new AbortController().signal,
    );

    expect(result).toMatchObject({ ok: false, error: { code: 'invalid_translation_tokens' } });
    expect(store.get()?.entries[0]).toMatchObject({
      operation: 'failed',
      lastError: { code: 'invalid_translation_tokens', retryable: true },
    });
  });

  it('maps provider failures without putting display text in the translation', async () => {
    const store = new InMemoryProjectStore(makeProject([makeEntry('one', 'One')]));
    const provider = new FakeProvider(async () =>
      failure({ code: 'rate_limited', message: 'Try later', retryable: true }),
    );
    const result = await new TranslateEntry(provider, store, fixedClock).execute(
      { entryId: testId('one'), configuration: makeConfiguration() },
      new AbortController().signal,
    );

    expect(result).toEqual({
      ok: false,
      error: { code: 'provider', providerCode: 'rate_limited', retryable: true },
    });
    expect(store.get()?.entries[0]?.translatedText).toBe('');
  });

  it('does not overwrite a manual edit made while a provider request is pending', async () => {
    let release!: (value: Result<TranslationProviderResponse, TranslationProviderFailure>) => void;
    const response = new Promise<Result<TranslationProviderResponse, TranslationProviderFailure>>(
      (resolve) => {
        release = resolve;
      },
    );
    const provider = new FakeProvider(() => response);
    const store = new InMemoryProjectStore(makeProject([makeEntry('one', 'One')]));
    const pending = new TranslateEntry(provider, store, fixedClock).execute(
      { entryId: testId('one'), configuration: makeConfiguration() },
      new AbortController().signal,
    );

    expect(store.get()?.entries[0]?.operation).toBe('translating');
    new EditEntry(store).execute(testId('one'), '手動編集');
    release(success({ text: '<translation>自動翻訳</translation>' }));

    expect(await pending).toEqual({
      ok: false,
      error: { code: 'entry_changed', entryId: 'one' },
    });
    expect(store.get()?.entries[0]?.translatedText).toBe('手動編集');
  });
});
