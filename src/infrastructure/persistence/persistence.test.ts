import { describe, expect, it } from 'vitest';

import { makeConfiguration } from '../../application/testing/fixtures';
import type { ApplicationSettings } from '../../application';
import type { DatabaseMutation, DocumentDatabase, StoreName } from './document-database';
import { IndexedDbSettingsRepository } from './indexed-db-settings-repository';
import { WebCryptoCredentialVault } from './web-crypto-credential-vault';

class MemoryDatabase implements DocumentDatabase {
  public readonly values = new Map<string, unknown>();

  private address(store: StoreName, key: string): string {
    return `${store}/${key}`;
  }

  public async get(store: StoreName, key: string): Promise<unknown | undefined> {
    return this.values.get(this.address(store, key));
  }

  public async getAll(store: StoreName): Promise<readonly unknown[]> {
    return [...this.values.entries()]
      .filter(([key]) => key.startsWith(`${store}/`))
      .map(([, value]) => value);
  }

  public async commit(mutations: readonly DatabaseMutation[]): Promise<void> {
    const next = new Map(this.values);
    for (const mutation of mutations) {
      const address = this.address(mutation.store, mutation.key);
      if (mutation.kind === 'put') next.set(address, structuredClone(mutation.value));
      else next.delete(address);
    }
    this.values.clear();
    for (const entry of next) this.values.set(...entry);
  }
}

const settings: ApplicationSettings = {
  translation: { ...makeConfiguration(), providerId: '', modelId: '' },
  providers: [],
  appearance: { theme: 'system', surfaceOpacity: 0.9, blurPx: 8, columnWidths: {} },
  parallelism: 10,
  reviewMode: false,
};

describe('phase 6 persistence contracts', () => {
  it('stores and validates schema-versioned settings documents', async () => {
    const database = new MemoryDatabase();
    const repository = new IndexedDbSettingsRepository(database);
    expect(await repository.save(settings, new AbortController().signal)).toEqual({
      ok: true,
      value: undefined,
    });
    expect(database.values.get('preferences/settings')).toMatchObject({ schemaVersion: 2 });
    expect(await repository.load(new AbortController().signal)).toEqual({
      ok: true,
      value: settings,
    });
  });

  it('encrypts secrets at rest and only exposes them while unlocked', async () => {
    const database = new MemoryDatabase();
    const vault = new WebCryptoCredentialVault(database);
    expect(
      await vault.store('openai', 'sk-secret', 'passphrase', new AbortController().signal),
    ).toEqual({
      ok: true,
      value: undefined,
    });
    const persisted = JSON.stringify(database.values.get('secrets/openai'));
    expect(persisted).not.toContain('sk-secret');
    expect(vault.read('openai')).toEqual({ ok: true, value: 'sk-secret' });
    vault.lock('openai');
    expect(vault.read('openai')).toMatchObject({ ok: false, error: { code: 'credential_locked' } });
    expect(await vault.unlock('openai', 'passphrase', new AbortController().signal)).toEqual({
      ok: true,
      value: undefined,
    });
    expect(vault.read('openai')).toEqual({ ok: true, value: 'sk-secret' });
  });
});
