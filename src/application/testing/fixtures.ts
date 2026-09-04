import {
  createTranslationEntry,
  createTranslationProject,
  type ModifierRule,
  type TranslationEntry,
  type TranslationProject,
} from '../../domain';
import { identifierFrom, instantFrom, type Identifier, type Instant } from '../../shared';
import type { Clock } from '../ports/clock';
import type { TranslationConfiguration } from '../models/translation-configuration';

export const testId = <Tag extends string>(value: string): Identifier<Tag> => {
  const result = identifierFrom<Tag>(value);
  if (!result.ok) throw new Error(`Invalid test identifier: ${value}`);
  return result.value;
};

const testInstant = (value: string): Instant => {
  const result = instantFrom(value);
  if (!result.ok) throw new Error(`Invalid test instant: ${value}`);
  return result.value;
};

export const fixedClock: Clock = {
  now: () => testInstant('2026-09-04T00:00:00Z'),
};

export const bracketModifier: ModifierRule = {
  id: testId('bracket-variable'),
  name: 'Bracket variable',
  pattern: '\\[[^\\]]+\\]',
  enabled: true,
  kind: 'variable',
  category: 'name',
};

export const makeEntry = (
  id: string,
  sourceText: string,
  options: {
    readonly translation?: string;
    readonly structureGroup?: string | null;
  } = {},
): TranslationEntry => {
  const result = createTranslationEntry({
    id: testId(id),
    sourceKey: `key.${id}`,
    sourceText,
    translatedText: options.translation ?? '',
    structureGroup: options.structureGroup ?? null,
  });
  if (!result.ok) throw new Error('Failed to create test entry');
  return result.value;
};

export const makeProject = (entries: readonly TranslationEntry[]): TranslationProject => {
  const result = createTranslationProject({
    id: testId('project'),
    source: { fileName: 'source.yml', mediaType: 'text/yaml' },
    entries,
    rejectedRecords: [],
    log: [],
  });
  if (!result.ok) throw new Error('Failed to create test project');
  return result.value;
};

export const makeConfiguration = (
  overrides: Partial<TranslationConfiguration> = {},
): TranslationConfiguration => ({
  providerId: 'provider',
  modelId: 'model',
  glossary: [],
  tones: [],
  defaultToneId: null,
  modifiers: [],
  ...overrides,
});
