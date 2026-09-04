import {
  validateModifierRules,
  type GlossaryTerm,
  type ModifierRule,
  type Tone,
} from '../../domain';
import type { Identifier } from '../../shared';

export interface TranslationConfiguration {
  readonly providerId: string;
  readonly modelId: string;
  readonly glossary: readonly GlossaryTerm[];
  readonly tones: readonly Tone[];
  readonly defaultToneId: Identifier<'tone'> | null;
  readonly modifiers: readonly ModifierRule[];
}

export interface ModelConfiguration {
  readonly id: string;
  readonly name: string;
  readonly enabled: boolean;
}

export interface ProviderConfiguration {
  readonly id: string;
  readonly name: string;
  readonly models: readonly ModelConfiguration[];
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppearanceSettings {
  readonly theme: ThemeMode;
  readonly surfaceOpacity: number;
  readonly blurPx: number;
  readonly columnWidths: Readonly<Record<string, number>>;
}

export interface ApplicationSettings {
  readonly translation: TranslationConfiguration;
  readonly providers: readonly ProviderConfiguration[];
  readonly appearance: AppearanceSettings;
  readonly parallelism: number;
  readonly reviewMode: boolean;
}

export const validateApplicationSettings = (settings: ApplicationSettings): string | null => {
  if (
    !Number.isInteger(settings.parallelism) ||
    settings.parallelism < 1 ||
    settings.parallelism > 50
  ) {
    return 'parallelism';
  }
  if (!['light', 'dark', 'system'].includes(settings.appearance.theme)) return 'theme';
  if (
    !Number.isFinite(settings.appearance.surfaceOpacity) ||
    settings.appearance.surfaceOpacity < 0 ||
    settings.appearance.surfaceOpacity > 1
  ) {
    return 'surfaceOpacity';
  }
  if (
    !Number.isFinite(settings.appearance.blurPx) ||
    settings.appearance.blurPx < 0 ||
    settings.appearance.blurPx > 40
  ) {
    return 'blurPx';
  }
  if (
    Object.values(settings.appearance.columnWidths).some(
      (width) => !Number.isFinite(width) || width < 48 || width > 2000,
    )
  ) {
    return 'columnWidths';
  }
  const providerIds = settings.providers.map((provider) => provider.id);
  if (
    settings.providers.some(
      (provider) =>
        provider.id.trim().length === 0 ||
        provider.name.trim().length === 0 ||
        new Set(provider.models.map((model) => model.id)).size !== provider.models.length ||
        provider.models.some((model) => model.id.trim().length === 0),
    ) ||
    new Set(providerIds).size !== providerIds.length
  ) {
    return 'providers';
  }
  if (
    settings.translation.providerId &&
    !settings.providers.some(
      (provider) =>
        provider.id === settings.translation.providerId &&
        provider.models.some((model) => model.id === settings.translation.modelId && model.enabled),
    )
  ) {
    return 'selectedProviderModel';
  }
  if (
    settings.translation.defaultToneId &&
    !settings.translation.tones.some((tone) => tone.id === settings.translation.defaultToneId)
  ) {
    return 'defaultToneId';
  }
  if (validateModifierRules(settings.translation.modifiers).length > 0) return 'modifiers';
  const libraries = [
    settings.translation.glossary.map((term) => term.id as string),
    settings.translation.tones.map((tone) => tone.id as string),
    settings.translation.modifiers.map((modifier) => modifier.id as string),
  ];
  if (libraries.some((identifiers) => new Set(identifiers).size !== identifiers.length)) {
    return 'duplicateIds';
  }
  return null;
};
