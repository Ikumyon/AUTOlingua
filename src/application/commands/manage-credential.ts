import { failure, success, type Result } from '../../shared';
import type { ApplicationFailure } from '../failures';
import type { CredentialVault } from '../ports/credential-vault';

const validateProviderId = (providerId: string): Result<string, ApplicationFailure> => {
  const normalized = providerId.trim();
  return normalized.length > 0
    ? success(normalized)
    : failure({ code: 'invalid_configuration', field: 'providerId' });
};

const mapVaultResult = <T>(
  result: Result<T, { readonly code: string; readonly message: string }>,
): Result<T, ApplicationFailure> =>
  result.ok
    ? result
    : failure({ code: 'credential', vaultCode: result.error.code, message: result.error.message });

export class CheckCredential {
  public constructor(private readonly vault: CredentialVault) {}

  public async execute(
    providerId: string,
    signal: AbortSignal,
  ): Promise<Result<boolean, ApplicationFailure>> {
    const validId = validateProviderId(providerId);
    if (!validId.ok) return validId;
    if (signal.aborted) return failure({ code: 'cancelled' });
    const result = await this.vault.has(validId.value, signal);
    return signal.aborted ? failure({ code: 'cancelled' }) : mapVaultResult(result);
  }
}

export class SaveCredential {
  public constructor(private readonly vault: CredentialVault) {}

  public async execute(
    providerId: string,
    secret: string,
    passphrase: string,
    signal: AbortSignal,
  ): Promise<Result<void, ApplicationFailure>> {
    const validId = validateProviderId(providerId);
    if (!validId.ok) return validId;
    if (secret.length === 0) return failure({ code: 'invalid_configuration', field: 'secret' });
    if (passphrase.length === 0) {
      return failure({ code: 'invalid_configuration', field: 'passphrase' });
    }
    if (signal.aborted) return failure({ code: 'cancelled' });
    const result = await this.vault.store(validId.value, secret, passphrase, signal);
    return signal.aborted ? failure({ code: 'cancelled' }) : mapVaultResult(result);
  }
}

export class UnlockCredential {
  public constructor(private readonly vault: CredentialVault) {}

  public async execute(
    providerId: string,
    passphrase: string,
    signal: AbortSignal,
  ): Promise<Result<void, ApplicationFailure>> {
    const validId = validateProviderId(providerId);
    if (!validId.ok) return validId;
    if (passphrase.length === 0) {
      return failure({ code: 'invalid_configuration', field: 'passphrase' });
    }
    if (signal.aborted) return failure({ code: 'cancelled' });
    const result = await this.vault.unlock(validId.value, passphrase, signal);
    return signal.aborted ? failure({ code: 'cancelled' }) : mapVaultResult(result);
  }
}

export class LockCredential {
  public constructor(private readonly vault: CredentialVault) {}

  public execute(providerId: string): Result<void, ApplicationFailure> {
    const validId = validateProviderId(providerId);
    if (!validId.ok) return validId;
    this.vault.lock(validId.value);
    return success(undefined);
  }
}

export class DeleteCredential {
  public constructor(private readonly vault: CredentialVault) {}

  public async execute(
    providerId: string,
    signal: AbortSignal,
  ): Promise<Result<void, ApplicationFailure>> {
    const validId = validateProviderId(providerId);
    if (!validId.ok) return validId;
    if (signal.aborted) return failure({ code: 'cancelled' });
    const result = await this.vault.remove(validId.value, signal);
    return signal.aborted ? failure({ code: 'cancelled' }) : mapVaultResult(result);
  }
}
