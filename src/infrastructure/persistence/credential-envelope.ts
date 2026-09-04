export interface CredentialEnvelopeV2 {
  readonly schemaVersion: 2;
  readonly providerId: string;
  readonly algorithm: 'AES-GCM';
  readonly iv: string;
  readonly ciphertext: string;
  readonly kdf: {
    readonly algorithm: 'PBKDF2';
    readonly hash: 'SHA-256';
    readonly iterations: number;
    readonly salt: string;
  };
}

export interface LegacyCredentialEnvelope {
  readonly schemaVersion: 1;
  readonly providerId: string;
  readonly algorithm: 'legacy-aes-gcm';
  readonly iv: readonly number[];
  readonly ciphertext: readonly number[];
  readonly salt: readonly number[];
  readonly kdf: {
    readonly algorithm: 'PBKDF2';
    readonly hash: 'SHA-256';
    readonly iterations: 100000;
  };
}

export type CredentialEnvelope = CredentialEnvelopeV2 | LegacyCredentialEnvelope;

const isByteArray = (value: unknown): value is readonly number[] =>
  Array.isArray(value) && value.every((item) => Number.isInteger(item) && item >= 0 && item <= 255);

export const isCredentialEnvelope = (value: unknown): value is CredentialEnvelope => {
  if (!value || typeof value !== 'object' || typeof Reflect.get(value, 'providerId') !== 'string') {
    return false;
  }
  if (Reflect.get(value, 'schemaVersion') === 1) {
    return (
      isByteArray(Reflect.get(value, 'iv')) &&
      isByteArray(Reflect.get(value, 'ciphertext')) &&
      isByteArray(Reflect.get(value, 'salt'))
    );
  }
  const kdf = Reflect.get(value, 'kdf');
  return (
    Reflect.get(value, 'schemaVersion') === 2 &&
    Reflect.get(value, 'algorithm') === 'AES-GCM' &&
    typeof Reflect.get(value, 'iv') === 'string' &&
    typeof Reflect.get(value, 'ciphertext') === 'string' &&
    !!kdf &&
    typeof kdf === 'object' &&
    typeof Reflect.get(kdf, 'salt') === 'string' &&
    typeof Reflect.get(kdf, 'iterations') === 'number'
  );
};
