import { describe, expect, it, vi } from 'vitest';

import { success } from '../../shared';
import type { ApplicationSettings } from '../models/translation-configuration';
import type { SettingsRepository } from '../ports/settings-repository';
import { makeConfiguration } from '../testing/fixtures';
import { UpdateSettings } from './update-settings';

const settings = (parallelism: number): ApplicationSettings => ({
  translation: makeConfiguration(),
  providers: [
    { id: 'provider', name: 'Provider', models: [{ id: 'model', name: 'Model', enabled: true }] },
  ],
  appearance: { theme: 'system', surfaceOpacity: 0.9, blurPx: 8, columnWidths: {} },
  parallelism,
  reviewMode: false,
});

describe('UpdateSettings', () => {
  it('validates before calling the repository', async () => {
    const save = vi.fn(async () => success(undefined));
    const repository: SettingsRepository = {
      async load() {
        return success(settings(10));
      },
      save,
    };
    const command = new UpdateSettings(repository);
    expect(await command.execute(settings(0), new AbortController().signal)).toEqual({
      ok: false,
      error: { code: 'invalid_configuration', field: 'parallelism' },
    });
    expect(save).not.toHaveBeenCalled();
    expect(await command.execute(settings(5), new AbortController().signal)).toEqual({
      ok: true,
      value: undefined,
    });
    expect(save).toHaveBeenCalledOnce();
  });

  it('allows preferences to be saved before a provider is selected', async () => {
    const save = vi.fn(async () => success(undefined));
    const repository: SettingsRepository = {
      async load() {
        return success(settings(10));
      },
      save,
    };
    const unconfigured = settings(10);
    const result = await new UpdateSettings(repository).execute(
      {
        ...unconfigured,
        translation: { ...unconfigured.translation, providerId: '', modelId: '' },
      },
      new AbortController().signal,
    );
    expect(result.ok).toBe(true);
  });
});
