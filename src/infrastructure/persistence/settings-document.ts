import type { ApplicationSettings } from '../../application';

export interface SettingsDocumentV2 {
  readonly schemaVersion: 2;
  readonly settings: ApplicationSettings;
}

export const settingsDocument = (settings: ApplicationSettings): SettingsDocumentV2 => ({
  schemaVersion: 2,
  settings,
});

export const isSettingsDocumentV2 = (value: unknown): value is SettingsDocumentV2 => {
  if (!value || typeof value !== 'object') return false;
  return (
    Reflect.get(value, 'schemaVersion') === 2 && typeof Reflect.get(value, 'settings') === 'object'
  );
};
