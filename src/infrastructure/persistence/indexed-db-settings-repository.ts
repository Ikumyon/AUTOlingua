import {
  validateApplicationSettings,
  type ApplicationSettings,
  type SettingsRepository,
  type SettingsRepositoryFailure,
} from '../../application';
import { failure, success, type Result } from '../../shared';
import type { DocumentDatabase } from './document-database';
import { isSettingsDocumentV2, settingsDocument } from './settings-document';

const repositoryFailure = (code: string, error: unknown): SettingsRepositoryFailure => ({
  code,
  message: error instanceof Error ? error.message : 'Settings persistence failed.',
});

export class IndexedDbSettingsRepository implements SettingsRepository {
  public constructor(private readonly database: DocumentDatabase) {}

  public async load(
    signal: AbortSignal,
  ): Promise<Result<ApplicationSettings, SettingsRepositoryFailure>> {
    try {
      const value = await this.database.get('preferences', 'settings', signal);
      if (!isSettingsDocumentV2(value)) {
        return failure(
          repositoryFailure('settings_missing_or_invalid', 'No valid settings exist.'),
        );
      }
      const invalid = validateApplicationSettings(value.settings);
      return invalid
        ? failure(repositoryFailure('settings_invalid', `Invalid field: ${invalid}`))
        : success(value.settings);
    } catch (error) {
      return failure(repositoryFailure('settings_read_failed', error));
    }
  }

  public async save(
    settings: ApplicationSettings,
    signal: AbortSignal,
  ): Promise<Result<void, SettingsRepositoryFailure>> {
    const invalid = validateApplicationSettings(settings);
    if (invalid) return failure(repositoryFailure('settings_invalid', `Invalid field: ${invalid}`));
    try {
      await this.database.commit(
        [{ kind: 'put', store: 'preferences', key: 'settings', value: settingsDocument(settings) }],
        signal,
      );
      return success(undefined);
    } catch (error) {
      return failure(repositoryFailure('settings_write_failed', error));
    }
  }
}
