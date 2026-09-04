export type StoreName = 'meta' | 'preferences' | 'secrets' | 'workspaces';

export type DatabaseMutation =
  | {
      readonly kind: 'put';
      readonly store: StoreName;
      readonly key: string;
      readonly value: unknown;
    }
  | { readonly kind: 'delete'; readonly store: StoreName; readonly key: string };

export interface DocumentDatabase {
  get(store: StoreName, key: string, signal: AbortSignal): Promise<unknown | undefined>;
  getAll(store: StoreName, signal: AbortSignal): Promise<readonly unknown[]>;
  commit(mutations: readonly DatabaseMutation[], signal: AbortSignal): Promise<void>;
}
