import type { ApplicationSettings } from '../application';
import { identifierFrom } from '../shared';

const requiredId = <Tag extends string>(value: string) => {
  const result = identifierFrom<Tag>(value);
  if (!result.ok) throw new Error('Invalid built-in identifier.');
  return result.value;
};

export const defaultSettings: ApplicationSettings = {
  translation: {
    providerId: '',
    modelId: '',
    glossary: [],
    tones: [
      {
        kind: 'standard',
        id: requiredId('formal'),
        name: '標準',
        instruction: '原文の意味と構造を保ち、自然で一貫した日本語にしてください。',
      },
    ],
    defaultToneId: requiredId('formal'),
    modifiers: [
      {
        id: requiredId('dollar-variable'),
        name: 'ドル記号変数',
        pattern: '\\$[^$]+\\$',
        enabled: true,
        kind: 'variable',
        category: 'variable',
      },
      {
        id: requiredId('format-code'),
        name: '書式コード',
        pattern: '§.',
        enabled: true,
        kind: 'decoration',
        category: 'formatting',
      },
    ],
  },
  providers: [
    { id: 'openai', name: 'OpenAI', models: [] },
    { id: 'gemini', name: 'Google Gemini', models: [] },
    { id: 'anthropic', name: 'Anthropic', models: [] },
  ],
  appearance: {
    theme: 'system',
    surfaceOpacity: 0.96,
    blurPx: 12,
    columnWidths: { key: 180, source: 360, translation: 360 },
  },
  parallelism: 4,
  reviewMode: true,
};
