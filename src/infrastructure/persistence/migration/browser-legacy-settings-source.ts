import type { LegacySettingsSnapshot, LegacySettingsSource } from './legacy-settings-source';

const legacyDatabaseName = 'AUTOlinguaDB';
const legacyStoreName = 'appSettings';

const openLegacyDatabase = (factory: IDBFactory): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = factory.open(legacyDatabaseName);
    request.onupgradeneeded = () => {
      request.transaction?.abort();
      reject(new Error('The legacy database does not exist.'));
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('Could not open the legacy database.'));
  });

export class BrowserLegacySettingsSource implements LegacySettingsSource {
  public constructor(
    private readonly storage: Storage = localStorage,
    private readonly factory: IDBFactory = indexedDB,
  ) {}

  public async read(signal: AbortSignal): Promise<LegacySettingsSnapshot> {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    const columnWidths: Record<string, string> = {};
    for (let index = 0; index < this.storage.length; index += 1) {
      const key = this.storage.key(index);
      if (key?.startsWith('auto_lingua_col_width_')) {
        const value = this.storage.getItem(key);
        if (value !== null) columnWidths[key.slice('auto_lingua_col_width_'.length)] = value;
      }
    }

    let passphraseSalt: unknown;
    const encryptedCredentials: Record<string, unknown> = {};
    try {
      const database = await openLegacyDatabase(this.factory);
      if (database.objectStoreNames.contains(legacyStoreName)) {
        const store = database
          .transaction(legacyStoreName, 'readonly')
          .objectStore(legacyStoreName);
        const readRequest = <T>(request: IDBRequest<T>): Promise<T> =>
          new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
        const [keys, values] = await Promise.all([
          readRequest(store.getAllKeys()),
          readRequest(store.getAll()),
        ]);
        for (const [index, key] of keys.entries()) {
          if (typeof key !== 'string') continue;
          if (key !== 'passphraseSalt' && !key.startsWith('encryptedApiKey_')) continue;
          const value = values[index];
          if (key === 'passphraseSalt') passphraseSalt = value;
          else encryptedCredentials[key.slice('encryptedApiKey_'.length)] = value;
        }
      }
      database.close();
    } catch {
      // A missing legacy database is equivalent to no legacy credentials.
    }
    return {
      settingsJson: this.storage.getItem('translationAppSettings'),
      columnWidths,
      passphraseSalt,
      encryptedCredentials,
    };
  }
}
