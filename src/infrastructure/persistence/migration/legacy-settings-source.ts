export interface LegacySettingsSnapshot {
  readonly settingsJson: string | null;
  readonly columnWidths: Readonly<Record<string, string>>;
  readonly passphraseSalt: unknown;
  readonly encryptedCredentials: Readonly<Record<string, unknown>>;
}

export interface LegacySettingsSource {
  read(signal: AbortSignal): Promise<LegacySettingsSnapshot>;
}
