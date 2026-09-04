import { failure, success, type Identifier, type Result } from '../../shared';
import { stageAfterTextEdit, type TranslationStage } from './translation-stage';

export type TranslationOperationState = 'idle' | 'queued' | 'translating' | 'failed';

export interface TranslationFailure {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
}

export interface TranslationEntry {
  readonly id: Identifier<'translation-entry'>;
  readonly sourceKey: string;
  readonly sourceVersion: string | null;
  readonly sourceText: string;
  readonly translatedText: string;
  readonly stage: TranslationStage;
  readonly toneId: Identifier<'tone'> | null;
  readonly structureGroup: string | null;
  readonly operation: TranslationOperationState;
  readonly lastError: TranslationFailure | null;
}

export interface NewTranslationEntry {
  readonly id: Identifier<'translation-entry'>;
  readonly sourceKey: string;
  readonly sourceVersion?: string | null;
  readonly sourceText: string;
  readonly translatedText?: string;
  readonly stage?: TranslationStage;
  readonly toneId?: Identifier<'tone'> | null;
  readonly structureGroup?: string | null;
}

export type TranslationEntryError = 'empty_source_key';

export const createTranslationEntry = (
  input: NewTranslationEntry,
): Result<TranslationEntry, TranslationEntryError> => {
  const sourceKey = input.sourceKey.trim();
  if (sourceKey.length === 0) {
    return failure('empty_source_key');
  }

  const translatedText = input.translatedText ?? '';
  const requestedStage = input.stage ?? 'untranslated';

  return success({
    id: input.id,
    sourceKey,
    sourceVersion: input.sourceVersion ?? null,
    sourceText: input.sourceText,
    translatedText,
    stage: stageAfterTextEdit(requestedStage, translatedText),
    toneId: input.toneId ?? null,
    structureGroup: input.structureGroup ?? null,
    operation: 'idle',
    lastError: null,
  });
};

export const editTranslation = (
  entry: TranslationEntry,
  translatedText: string,
): TranslationEntry => ({
  ...entry,
  translatedText,
  stage: stageAfterTextEdit(entry.stage, translatedText),
  operation: 'idle',
  lastError: null,
});

export const queueTranslation = (entry: TranslationEntry): TranslationEntry => ({
  ...entry,
  operation: 'queued',
  lastError: null,
});

export const startTranslation = (entry: TranslationEntry): TranslationEntry => ({
  ...entry,
  operation: 'translating',
  lastError: null,
});

export const failTranslation = (
  entry: TranslationEntry,
  translationFailure: TranslationFailure,
): TranslationEntry => ({
  ...entry,
  operation: 'failed',
  lastError: translationFailure,
});

export const cancelTranslation = (entry: TranslationEntry): TranslationEntry => ({
  ...entry,
  operation: 'idle',
  lastError: null,
});

export const setTranslationStage = (
  entry: TranslationEntry,
  stage: TranslationStage,
): TranslationEntry => ({ ...entry, stage });

export const setEntryTone = (
  entry: TranslationEntry,
  toneId: Identifier<'tone'> | null,
): TranslationEntry => ({ ...entry, toneId });
