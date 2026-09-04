import { describe, expect, it, vi } from 'vitest';

import { success } from '../../shared';
import type { CredentialVault } from '../ports/credential-vault';
import {
  CheckCredential,
  DeleteCredential,
  LockCredential,
  SaveCredential,
  UnlockCredential,
} from './manage-credential';

const makeVault = (): CredentialVault => ({
  async has() {
    return success(true);
  },
  async store() {
    return success(undefined);
  },
  async unlock() {
    return success(undefined);
  },
  lock() {},
  async remove() {
    return success(undefined);
  },
});

describe('credential commands', () => {
  it('validates secrets before crossing the vault boundary', async () => {
    const vault = makeVault();
    const store = vi.spyOn(vault, 'store');
    const result = await new SaveCredential(vault).execute(
      'provider',
      '',
      'passphrase',
      new AbortController().signal,
    );
    expect(result).toEqual({
      ok: false,
      error: { code: 'invalid_configuration', field: 'secret' },
    });
    expect(store).not.toHaveBeenCalled();
  });

  it('exposes credential lifecycle operations without plaintext reads', async () => {
    const vault = makeVault();
    const signal = new AbortController().signal;
    expect(await new CheckCredential(vault).execute('provider', signal)).toEqual({
      ok: true,
      value: true,
    });
    expect(await new SaveCredential(vault).execute('provider', 'secret', 'pass', signal)).toEqual({
      ok: true,
      value: undefined,
    });
    expect(await new UnlockCredential(vault).execute('provider', 'pass', signal)).toEqual({
      ok: true,
      value: undefined,
    });
    expect(new LockCredential(vault).execute('provider')).toEqual({ ok: true, value: undefined });
    expect(await new DeleteCredential(vault).execute('provider', signal)).toEqual({
      ok: true,
      value: undefined,
    });
  });
});
