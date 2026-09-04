import type { Result } from '../../shared';
import type { ApplicationSettings } from '../models/translation-configuration';

export interface SettingsRepositoryFailure {
  readonly code: string;
  readonly message: string;
}

export interface SettingsRepository {
  load(signal: AbortSignal): Promise<Result<ApplicationSettings, SettingsRepositoryFailure>>;
  save(
    settings: ApplicationSettings,
    signal: AbortSignal,
  ): Promise<Result<void, SettingsRepositoryFailure>>;
}
