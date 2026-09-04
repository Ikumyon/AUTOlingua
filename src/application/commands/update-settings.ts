import { failure, success, type Result } from '../../shared';
import type { ApplicationFailure } from '../failures';
import {
  validateApplicationSettings,
  type ApplicationSettings,
} from '../models/translation-configuration';
import type { SettingsRepository } from '../ports/settings-repository';

export class UpdateSettings {
  public constructor(private readonly repository: SettingsRepository) {}

  public async execute(
    settings: ApplicationSettings,
    signal: AbortSignal,
  ): Promise<Result<void, ApplicationFailure>> {
    const invalidField = validateApplicationSettings(settings);
    if (invalidField) return failure({ code: 'invalid_configuration', field: invalidField });
    if (signal.aborted) return failure({ code: 'cancelled' });
    const saved = await this.repository.save(settings, signal);
    if (signal.aborted) return failure({ code: 'cancelled' });
    return saved.ok
      ? success(undefined)
      : failure({
          code: 'settings',
          repositoryCode: saved.error.code,
          message: saved.error.message,
        });
  }
}
