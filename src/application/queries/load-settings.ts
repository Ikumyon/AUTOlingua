import { failure, type Result } from '../../shared';
import type { ApplicationFailure } from '../failures';
import {
  validateApplicationSettings,
  type ApplicationSettings,
} from '../models/translation-configuration';
import type { SettingsRepository } from '../ports/settings-repository';

export class LoadSettings {
  public constructor(private readonly repository: SettingsRepository) {}

  public async execute(
    signal: AbortSignal,
  ): Promise<Result<ApplicationSettings, ApplicationFailure>> {
    if (signal.aborted) return failure({ code: 'cancelled' });
    const loaded = await this.repository.load(signal);
    if (signal.aborted) return failure({ code: 'cancelled' });
    if (!loaded.ok) {
      return failure({
        code: 'settings',
        repositoryCode: loaded.error.code,
        message: loaded.error.message,
      });
    }
    const invalidField = validateApplicationSettings(loaded.value);
    return invalidField ? failure({ code: 'invalid_configuration', field: invalidField }) : loaded;
  }
}
