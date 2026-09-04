import type { Result } from '../../shared';

export interface CredentialVaultFailure {
  readonly code: string;
  readonly message: string;
}

export interface UnlockedCredentialReader {
  read(providerId: string): Result<string, CredentialVaultFailure>;
}

export interface CredentialVault {
  has(providerId: string, signal: AbortSignal): Promise<Result<boolean, CredentialVaultFailure>>;
  store(
    providerId: string,
    secret: string,
    passphrase: string,
    signal: AbortSignal,
  ): Promise<Result<void, CredentialVaultFailure>>;
  unlock(
    providerId: string,
    passphrase: string,
    signal: AbortSignal,
  ): Promise<Result<void, CredentialVaultFailure>>;
  lock(providerId: string): void;
  remove(providerId: string, signal: AbortSignal): Promise<Result<void, CredentialVaultFailure>>;
}
