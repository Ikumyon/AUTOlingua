import { failure, success, type Identifier, type Result } from '../../shared';
import type { ApplicationFailure } from '../failures';
import type { TranslationConfiguration } from '../models/translation-configuration';
import { TranslateEntry, type EntryTranslation } from './translate-entry';

export interface RequestSuggestionsInput {
  readonly entryId: Identifier<'translation-entry'>;
  readonly configuration: TranslationConfiguration;
  readonly modelIds: readonly string[];
}

export interface TranslationSuggestion {
  readonly modelId: string;
  readonly translation: EntryTranslation;
}

export class RequestSuggestions {
  public constructor(private readonly translateEntry: TranslateEntry) {}

  public async execute(
    input: RequestSuggestionsInput,
    signal: AbortSignal,
  ): Promise<Result<readonly TranslationSuggestion[], ApplicationFailure>> {
    const modelIds = [...new Set(input.modelIds.map((modelId) => modelId.trim()))].filter(Boolean);
    if (modelIds.length === 0) {
      return failure({ code: 'invalid_configuration', field: 'modelIds' });
    }

    const suggestions: TranslationSuggestion[] = [];
    for (const modelId of modelIds) {
      if (signal.aborted) return failure({ code: 'cancelled' });
      const result = await this.translateEntry.execute(
        {
          entryId: input.entryId,
          configuration: { ...input.configuration, modelId },
          includeStructureGroup: false,
          applyResult: false,
        },
        signal,
      );
      if (!result.ok) return result;
      const translation = result.value.translations[0];
      if (!translation) return failure({ code: 'entry_not_found', entryId: input.entryId });
      suggestions.push({ modelId, translation });
    }
    return success(suggestions);
  }
}
