import { describe, expect, it } from 'vitest';

import type { DatabaseMutation, DocumentDatabase, StoreName } from '../document-database';
import { settingsDocument } from '../settings-document';
import { LegacySettingsMigrator } from './legacy-settings-migrator';
import type { LegacySettingsSnapshot, LegacySettingsSource } from './legacy-settings-source';

class MemoryDatabase implements DocumentDatabase {
  public readonly values = new Map<string, unknown>();
  public commits = 0;

  public async get(store: StoreName, key: string): Promise<unknown | undefined> {
    return this.values.get(`${store}/${key}`);
  }
  public async getAll(): Promise<readonly unknown[]> {
    return [...this.values.values()];
  }
  public async commit(mutations: readonly DatabaseMutation[]): Promise<void> {
    const next = new Map(this.values);
    for (const mutation of mutations) {
      const key = `${mutation.store}/${mutation.key}`;
      if (mutation.kind === 'put') next.set(key, structuredClone(mutation.value));
      else next.delete(key);
    }
    this.values.clear();
    for (const entry of next) this.values.set(...entry);
    this.commits += 1;
  }
}

class InterruptingDatabase extends MemoryDatabase {
  private interruptFinalCommit = true;

  public override async commit(mutations: readonly DatabaseMutation[]): Promise<void> {
    if (this.commits === 1 && this.interruptFinalCommit) {
      this.interruptFinalCommit = false;
      throw new Error('simulated interruption');
    }
    await super.commit(mutations);
  }
}

const source = (snapshot: LegacySettingsSnapshot): LegacySettingsSource => ({
  read: async () => snapshot,
});

const completeSnapshot = (): LegacySettingsSnapshot => ({
  settingsJson: JSON.stringify({
    defaultTone: 'formal',
    customTones: [
      { value: 'formal', name: 'Formal', instruction: 'Formal.', isConditional: false },
      { value: 'formal', name: 'Duplicate', instruction: 'Duplicate.', isConditional: false },
    ],
    glossaryTerms: [
      { original: 'empire', originalAlt: ['Empire'], translation: '帝国', pos: 'noun', note: '' },
    ],
    modifierCharacters: [
      {
        id: 'variable',
        name: 'Variable',
        regex: '\\$[^$]+\\$',
        enabled: true,
        type: 'variable',
        category: 'variable',
      },
    ],
    llmProviders: [
      { id: 'openai', name: 'OpenAI', models: [{ id: 'gpt', name: 'GPT', enabled: true }] },
    ],
    currentLlmProviderId: 'openai',
    currentLlmModelId: 'gpt',
    currentTheme: 'neon',
    themeOpacity: 9,
    themeBlur: -2,
    parallelCount: 200,
    isReviewModeEnabled: true,
  }),
  columnWidths: { source: '320', broken: 'nope' },
  passphraseSalt: [1, 2, 3],
  encryptedCredentials: { openai: { iv: [4, 5], ciphertext: [6, 7] } },
});

describe('LegacySettingsMigrator', () => {
  it('normalizes a complete legacy snapshot and commits settings, secrets, and report atomically', async () => {
    const database = new MemoryDatabase();
    const migrator = new LegacySettingsMigrator(source(completeSnapshot()), database);
    const result = await migrator.migrate(new AbortController().signal);
    expect(result).toMatchObject({
      ok: true,
      value: {
        status: 'migrated',
        migratedCredentialProviders: ['openai'],
        warningCodes: expect.arrayContaining(['tone_discarded', 'theme_defaulted']),
      },
    });
    expect(database.commits).toBe(2);
    expect(database.values.get('preferences/settings')).toMatchObject({
      schemaVersion: 2,
      settings: {
        appearance: {
          theme: 'system',
          surfaceOpacity: 1,
          blurPx: 0,
          columnWidths: { source: 320 },
        },
        parallelism: 50,
      },
    });
    expect(database.values.get('secrets/openai')).toMatchObject({
      schemaVersion: 1,
      providerId: 'openai',
    });
  });

  it('is idempotent for the same fingerprint', async () => {
    const database = new MemoryDatabase();
    const migrator = new LegacySettingsMigrator(source(completeSnapshot()), database);
    await migrator.migrate(new AbortController().signal);
    const result = await migrator.migrate(new AbortController().signal);
    expect(result).toMatchObject({ ok: true, value: { status: 'already-migrated' } });
    expect(database.commits).toBe(2);
  });

  it('does not commit invalid JSON or overwrite existing v2 settings', async () => {
    const invalidDatabase = new MemoryDatabase();
    const invalid = new LegacySettingsMigrator(
      source({
        settingsJson: '{',
        columnWidths: {},
        passphraseSalt: undefined,
        encryptedCredentials: {},
      }),
      invalidDatabase,
    );
    expect(await invalid.migrate(new AbortController().signal)).toMatchObject({
      ok: false,
      error: { code: 'invalid_legacy_json' },
    });
    expect(invalidDatabase.commits).toBe(0);

    const existingDatabase = new MemoryDatabase();
    existingDatabase.values.set(
      'preferences/settings',
      settingsDocument({
        translation: {
          providerId: '',
          modelId: '',
          glossary: [],
          tones: [],
          defaultToneId: null,
          modifiers: [],
        },
        providers: [],
        appearance: { theme: 'dark', surfaceOpacity: 1, blurPx: 0, columnWidths: {} },
        parallelism: 1,
        reviewMode: false,
      }),
    );
    const existing = new LegacySettingsMigrator(source(completeSnapshot()), existingDatabase);
    expect(await existing.migrate(new AbortController().signal)).toMatchObject({
      ok: true,
      value: { status: 'v2-preserved' },
    });
    expect(existingDatabase.commits).toBe(0);
  });

  it('reports incomplete credential pairs without writing a secret', async () => {
    const database = new MemoryDatabase();
    const snapshot = completeSnapshot();
    const migrator = new LegacySettingsMigrator(
      source({ ...snapshot, passphraseSalt: undefined }),
      database,
    );
    const result = await migrator.migrate(new AbortController().signal);
    expect(result).toMatchObject({
      ok: true,
      value: { warningCodes: expect.arrayContaining(['credential_pair_incomplete']) },
    });
    expect(database.values.has('secrets/openai')).toBe(false);
  });

  it('exports the untouched legacy snapshot for recovery analysis', async () => {
    const snapshot = completeSnapshot();
    const migrator = new LegacySettingsMigrator(source(snapshot), new MemoryDatabase());
    const exported = await migrator.exportRecovery(new AbortController().signal);
    expect(exported).toMatchObject({
      ok: true,
      value: {
        fileName: 'autolingua-legacy-settings-recovery.json',
        content: expect.stringContaining('autolingua-legacy-settings-recovery'),
      },
    });
    if (exported.ok) expect(JSON.parse(exported.value.content).snapshot).toEqual(snapshot);
  });

  it('leaves active data untouched when interrupted after staging and can resume', async () => {
    const database = new InterruptingDatabase();
    const migrator = new LegacySettingsMigrator(source(completeSnapshot()), database);
    expect(await migrator.migrate(new AbortController().signal)).toMatchObject({ ok: false });
    expect(database.values.has('preferences/settings')).toBe(false);
    expect([...database.values.keys()].some((key) => key.startsWith('meta/staging:'))).toBe(true);

    expect(await migrator.migrate(new AbortController().signal)).toMatchObject({
      ok: true,
      value: { status: 'migrated' },
    });
    expect(database.values.has('preferences/settings')).toBe(true);
    expect([...database.values.keys()].some((key) => key.startsWith('meta/staging:'))).toBe(false);
  });
});
