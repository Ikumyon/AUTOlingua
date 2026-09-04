import type { Result } from '../../shared';
import type { EncodedProject } from './project-codec';

export interface MigrationReport {
  readonly status: 'migrated' | 'already-migrated' | 'v2-preserved' | 'no-legacy-data';
  readonly sourceFingerprint: string | null;
  readonly warningCodes: readonly string[];
  readonly migratedCredentialProviders: readonly string[];
}

export interface MigrationFailure {
  readonly code: string;
  readonly message: string;
}

export interface LegacySettingsMigrator {
  migrate(signal: AbortSignal): Promise<Result<MigrationReport, MigrationFailure>>;
  exportRecovery(signal: AbortSignal): Promise<Result<EncodedProject, MigrationFailure>>;
}
