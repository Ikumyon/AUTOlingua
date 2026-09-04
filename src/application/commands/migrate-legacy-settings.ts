import { failure, type Result } from '../../shared';
import type {
  LegacySettingsMigrator,
  MigrationFailure,
  MigrationReport,
} from '../ports/legacy-settings-migrator';
import type { EncodedProject } from '../ports/project-codec';

export class MigrateLegacySettings {
  public constructor(private readonly migrator: LegacySettingsMigrator) {}

  public async execute(signal: AbortSignal): Promise<Result<MigrationReport, MigrationFailure>> {
    if (signal.aborted) return failure({ code: 'cancelled', message: 'Migration was cancelled.' });
    return this.migrator.migrate(signal);
  }
}

export class ExportLegacySettingsRecovery {
  public constructor(private readonly migrator: LegacySettingsMigrator) {}

  public async execute(signal: AbortSignal): Promise<Result<EncodedProject, MigrationFailure>> {
    if (signal.aborted) return failure({ code: 'cancelled', message: 'Export was cancelled.' });
    return this.migrator.exportRecovery(signal);
  }
}
