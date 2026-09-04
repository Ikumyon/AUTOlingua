import type { DatabaseMutation, DocumentDatabase, StoreName } from './document-database';

export const databaseName = 'AUTOlingua';
export const databaseVersion = 2;
const stores: readonly StoreName[] = ['meta', 'preferences', 'secrets', 'workspaces'];

const requestResult = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });

const transactionDone = (transaction: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
  });

export class IndexedDbDocumentDatabase implements DocumentDatabase {
  private connection: Promise<IDBDatabase> | null = null;

  public constructor(private readonly factory: IDBFactory = indexedDB) {}

  private open(): Promise<IDBDatabase> {
    this.connection ??= new Promise((resolve, reject) => {
      const request = this.factory.open(databaseName, databaseVersion);
      request.onupgradeneeded = () => {
        for (const store of stores) {
          if (!request.result.objectStoreNames.contains(store))
            request.result.createObjectStore(store);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Could not open IndexedDB.'));
    });
    return this.connection;
  }

  public async get(
    store: StoreName,
    key: string,
    signal: AbortSignal,
  ): Promise<unknown | undefined> {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    const database = await this.open();
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    return requestResult(database.transaction(store, 'readonly').objectStore(store).get(key));
  }

  public async getAll(store: StoreName, signal: AbortSignal): Promise<readonly unknown[]> {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    const database = await this.open();
    return requestResult(database.transaction(store, 'readonly').objectStore(store).getAll());
  }

  public async commit(mutations: readonly DatabaseMutation[], signal: AbortSignal): Promise<void> {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    if (mutations.length === 0) return;
    const database = await this.open();
    const affectedStores = [...new Set(mutations.map((mutation) => mutation.store))];
    const transaction = database.transaction(affectedStores, 'readwrite');
    const abort = (): void => transaction.abort();
    signal.addEventListener('abort', abort, { once: true });
    try {
      for (const mutation of mutations) {
        const store = transaction.objectStore(mutation.store);
        if (mutation.kind === 'put') store.put(mutation.value, mutation.key);
        else store.delete(mutation.key);
      }
      await transactionDone(transaction);
    } finally {
      signal.removeEventListener('abort', abort);
    }
  }
}
