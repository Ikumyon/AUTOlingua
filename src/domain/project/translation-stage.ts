export const translationStages = [
  'untranslated',
  'translated',
  'needs-review',
  'reviewed',
] as const;

export type TranslationStage = (typeof translationStages)[number];

export const isTranslationStage = (value: string): value is TranslationStage =>
  translationStages.some((stage) => stage === value);

export const stageAfterTextEdit = (
  current: TranslationStage,
  translatedText: string,
): TranslationStage => {
  if (translatedText.trim().length === 0) {
    return 'untranslated';
  }
  return current === 'untranslated' ? 'translated' : current;
};
