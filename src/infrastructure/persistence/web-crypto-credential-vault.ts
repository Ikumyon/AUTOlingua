import type {
  CredentialVault,
  CredentialVaultFailure,
  UnlockedCredentialReader,
} from '../../application';
import { failure, success, type Result } from '../../shared';
import type { DocumentDatabase } from './document-database';
import {
  isCredentialEnvelope,
  type CredentialEnvelope,
  type CredentialEnvelopeV2,
} from './credential-envelope';

const iterations = 250_000;
const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};
const fromBase64 = (value: string): Uint8Array =>
  Uint8Array.from(atob(value), (character) => character.charCodeAt(0));

const deriveKey = async (
  cryptoApi: Crypto,
  passphrase: string,
  salt: Uint8Array,
  rounds: number,
): Promise<CryptoKey> => {
  const material = await cryptoApi.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return cryptoApi.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: rounds, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
};

const vaultFailure = (code: string, error: unknown): CredentialVaultFailure => ({
  code,
  message: error instanceof Error ? error.message : 'Credential operation failed.',
});

export class WebCryptoCredentialVault implements CredentialVault, UnlockedCredentialReader {
  private readonly unlocked = new Map<string, string>();

  public constructor(
    private readonly database: DocumentDatabase,
    private readonly cryptoApi: Crypto = crypto,
  ) {}

  public async has(
    providerId: string,
    signal: AbortSignal,
  ): Promise<Result<boolean, CredentialVaultFailure>> {
    try {
      return success((await this.database.get('secrets', providerId, signal)) !== undefined);
    } catch (error) {
      return failure(vaultFailure('credential_read_failed', error));
    }
  }

  public async store(
    providerId: string,
    secret: string,
    passphrase: string,
    signal: AbortSignal,
  ): Promise<Result<void, CredentialVaultFailure>> {
    try {
      const envelope = await this.encrypt(providerId, secret, passphrase);
      await this.database.commit(
        [{ kind: 'put', store: 'secrets', key: providerId, value: envelope }],
        signal,
      );
      this.unlocked.set(providerId, secret);
      return success(undefined);
    } catch (error) {
      return failure(vaultFailure('credential_write_failed', error));
    }
  }

  public async unlock(
    providerId: string,
    passphrase: string,
    signal: AbortSignal,
  ): Promise<Result<void, CredentialVaultFailure>> {
    try {
      const raw = await this.database.get('secrets', providerId, signal);
      if (!isCredentialEnvelope(raw)) {
        return failure(vaultFailure('credential_missing', 'No credential exists.'));
      }
      const secret = await this.decrypt(raw, passphrase);
      this.unlocked.set(providerId, secret);
      if (raw.schemaVersion === 1) {
        const upgraded = await this.encrypt(providerId, secret, passphrase);
        await this.database.commit(
          [{ kind: 'put', store: 'secrets', key: providerId, value: upgraded }],
          signal,
        );
      }
      return success(undefined);
    } catch (error) {
      return failure(vaultFailure('credential_unlock_failed', error));
    }
  }

  public lock(providerId: string): void {
    this.unlocked.delete(providerId);
  }

  public async remove(
    providerId: string,
    signal: AbortSignal,
  ): Promise<Result<void, CredentialVaultFailure>> {
    try {
      await this.database.commit([{ kind: 'delete', store: 'secrets', key: providerId }], signal);
      this.unlocked.delete(providerId);
      return success(undefined);
    } catch (error) {
      return failure(vaultFailure('credential_delete_failed', error));
    }
  }

  public read(providerId: string): Result<string, CredentialVaultFailure> {
    const secret = this.unlocked.get(providerId);
    return secret === undefined
      ? failure(vaultFailure('credential_locked', 'The credential is locked.'))
      : success(secret);
  }

  private async encrypt(
    providerId: string,
    secret: string,
    passphrase: string,
  ): Promise<CredentialEnvelopeV2> {
    const salt = this.cryptoApi.getRandomValues(new Uint8Array(16));
    const iv = this.cryptoApi.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(this.cryptoApi, passphrase, salt, iterations);
    const ciphertext = await this.cryptoApi.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      new TextEncoder().encode(secret),
    );
    return {
      schemaVersion: 2,
      providerId,
      algorithm: 'AES-GCM',
      iv: toBase64(iv),
      ciphertext: toBase64(new Uint8Array(ciphertext)),
      kdf: { algorithm: 'PBKDF2', hash: 'SHA-256', iterations, salt: toBase64(salt) },
    };
  }

  private async decrypt(envelope: CredentialEnvelope, passphrase: string): Promise<string> {
    const salt =
      envelope.schemaVersion === 1 ? new Uint8Array(envelope.salt) : fromBase64(envelope.kdf.salt);
    const iv = envelope.schemaVersion === 1 ? new Uint8Array(envelope.iv) : fromBase64(envelope.iv);
    const ciphertext =
      envelope.schemaVersion === 1
        ? new Uint8Array(envelope.ciphertext)
        : fromBase64(envelope.ciphertext);
    const rounds = envelope.schemaVersion === 1 ? 100_000 : envelope.kdf.iterations;
    const key = await deriveKey(this.cryptoApi, passphrase, salt, rounds);
    const plaintext = await this.cryptoApi.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      ciphertext as BufferSource,
    );
    return new TextDecoder().decode(plaintext);
  }
}
