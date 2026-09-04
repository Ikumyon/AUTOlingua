import {
  buildTranslationPrompt,
  appendProjectLog,
  cancelTranslation,
  createTranslationGuidance,
  editTranslation,
  extractTranslation,
  failTranslation,
  maskStructureGroup,
  parseStructure,
  replaceProjectEntries,
  restoreMaskedText,
  startTranslation,
  validateMaskedText,
  type Tone,
  type TranslationEntry,
  type TranslationProject,
} from '../../domain';
import { failure, success, type Identifier, type Result } from '../../shared';
import type { ApplicationFailure } from '../failures';
import type { TranslationConfiguration } from '../models/translation-configuration';
import type { Clock } from '../ports/clock';
import type { ProjectStore } from '../ports/project-store';
import type { TranslationProvider } from '../ports/translation-provider';

export interface TranslateEntryInput {
  readonly entryId: Identifier<'translation-entry'>;
  readonly configuration: TranslationConfiguration;
  readonly includeStructureGroup?: boolean;
  readonly applyResult?: boolean;
}

export interface EntryTranslation {
  readonly entryId: Identifier<'translation-entry'>;
  readonly text: string;
}

export interface TranslateEntryOutput {
  readonly translatedEntryIds: readonly Identifier<'translation-entry'>[];
  readonly maskedSource: string;
  readonly maskedTranslation: string;
  readonly translations: readonly EntryTranslation[];
}

const findTone = (
  entry: TranslationEntry,
  configuration: TranslationConfiguration,
): Result<Tone | null, ApplicationFailure> => {
  const toneId = entry.toneId ?? configuration.defaultToneId;
  if (!toneId) return success(null);
  const tone = configuration.tones.find((candidate) => candidate.id === toneId);
  return tone ? success(tone) : failure({ code: 'invalid_configuration', field: 'toneId' });
};

export class TranslateEntry {
  public constructor(
    private readonly provider: TranslationProvider,
    private readonly projectStore: ProjectStore,
    private readonly clock: Clock,
  ) {}

  public async execute(
    input: TranslateEntryInput,
    signal: AbortSignal,
  ): Promise<Result<TranslateEntryOutput, ApplicationFailure>> {
    if (signal.aborted) return failure({ code: 'cancelled' });
    if (input.configuration.providerId.trim().length === 0) {
      return failure({ code: 'invalid_configuration', field: 'providerId' });
    }
    if (input.configuration.modelId.trim().length === 0) {
      return failure({ code: 'invalid_configuration', field: 'modelId' });
    }

    const project = this.projectStore.get();
    if (!project) return failure({ code: 'project_not_loaded' });
    const selected = project.entries.find((entry) => entry.id === input.entryId);
    if (!selected) return failure({ code: 'entry_not_found', entryId: input.entryId });

    const targets =
      input.includeStructureGroup && selected.structureGroup
        ? project.entries.filter((entry) => entry.structureGroup === selected.structureGroup)
        : [selected];
    const structures = [];
    for (const target of targets) {
      const parsed = parseStructure(target.sourceText, input.configuration.modifiers);
      if (!parsed.ok) return failure({ code: 'structure', cause: parsed.error });
      structures.push(parsed.value);
    }
    const masked = maskStructureGroup(structures);
    if (!masked.ok) return failure({ code: 'masking', cause: masked.error });

    const tone = findTone(selected, input.configuration);
    if (!tone.ok) return tone;
    const guidance = createTranslationGuidance(
      {
        sourceKey: selected.sourceKey,
        sourceText: selected.sourceText,
        fileName: project.source.fileName,
      },
      tone.value,
      input.configuration.glossary,
    );
    if (!guidance.ok) return failure({ code: 'tone', cause: guidance.error });

    const prompt = buildTranslationPrompt(
      masked.value.maskedText,
      masked.value.tokens,
      guidance.value,
    );
    const targetIds = targets.map((entry) => entry.id);
    const started = this.startTargets(targetIds);
    if (!started.ok) return started;

    let providerResult: Awaited<ReturnType<TranslationProvider['translate']>>;
    try {
      providerResult = await this.provider.translate(
        {
          providerId: input.configuration.providerId,
          modelId: input.configuration.modelId,
          prompt,
        },
        signal,
      );
    } catch {
      if (signal.aborted) {
        this.updateTargets(targetIds, cancelTranslation, 'translating');
        this.recordOutcome(targetIds, 'failure', { code: 'cancelled' });
        return failure({ code: 'cancelled' });
      }
      const unexpected = { code: 'unexpected_provider_error', retryable: true } as const;
      const failed = this.updateTargets(
        targetIds,
        (entry) => failTranslation(entry, { ...unexpected, message: unexpected.code }),
        'translating',
      );
      if (!failed.ok) return failed;
      this.recordOutcome(targetIds, 'failure', { code: unexpected.code });
      return failure({ code: 'provider', providerCode: unexpected.code, retryable: true });
    }

    if (signal.aborted) {
      this.updateTargets(targetIds, cancelTranslation, 'translating');
      this.recordOutcome(targetIds, 'failure', { code: 'cancelled' });
      return failure({ code: 'cancelled' });
    }
    if (!providerResult.ok) {
      const failed = this.updateTargets(
        targetIds,
        (entry) => failTranslation(entry, providerResult.error),
        'translating',
      );
      if (!failed.ok) return failed;
      this.recordOutcome(targetIds, 'failure', { code: providerResult.error.code });
      return failure({
        code: 'provider',
        providerCode: providerResult.error.code,
        retryable: providerResult.error.retryable,
      });
    }

    const translated = extractTranslation(providerResult.value.text);
    const validation = validateMaskedText(translated, masked.value.tokens);
    if (!validation.valid) {
      const failed = this.updateTargets(
        targetIds,
        (entry) =>
          failTranslation(entry, {
            code: 'invalid_translation_tokens',
            message: 'The provider response changed protected tokens.',
            retryable: true,
          }),
        'translating',
      );
      if (!failed.ok) return failed;
      this.recordOutcome(targetIds, 'failure', { code: 'invalid_translation_tokens' });
      return failure({
        code: 'invalid_translation_tokens',
        missingTokens: validation.missingTokens,
        duplicatedTokens: validation.duplicatedTokens,
      });
    }

    const translations = targets.map((entry, index): EntryTranslation => ({
      entryId: entry.id,
      text: restoreMaskedText(translated, masked.value.sentences[index]!),
    }));
    if (input.applyResult ?? true) {
      const replacements = targets.map((entry, index) =>
        editTranslation(entry, translations[index]!.text),
      );
      const completed = this.replaceTargets(replacements);
      if (!completed.ok) return completed;
    } else {
      const released = this.updateTargets(targetIds, cancelTranslation, 'translating');
      if (!released.ok) return released;
    }
    this.recordOutcome(targetIds, 'success', {
      providerId: input.configuration.providerId,
      modelId: input.configuration.modelId,
      mode: (input.applyResult ?? true) ? 'apply' : 'suggestion',
    });
    return success({
      translatedEntryIds: targetIds,
      maskedSource: masked.value.maskedText,
      maskedTranslation: translated,
      translations,
    });
  }

  private updateTargets(
    targetIds: readonly Identifier<'translation-entry'>[],
    update: (entry: TranslationEntry) => TranslationEntry,
    expectedOperation?: TranslationEntry['operation'],
  ): Result<TranslationProject, ApplicationFailure> {
    const targetSet = new Set(targetIds);
    const result = this.projectStore.update((project) => {
      const matches = project.entries.filter((entry) => targetSet.has(entry.id));
      if (matches.length !== targetSet.size) return failure('entry_not_found' as const);
      if (expectedOperation && matches.some((entry) => entry.operation !== expectedOperation)) {
        return failure('entry_changed' as const);
      }
      return replaceProjectEntries(project, matches.map(update));
    });
    if (result.ok) return result;
    return result.error === 'project_not_loaded'
      ? failure({ code: 'project_not_loaded' })
      : result.error === 'entry_changed'
        ? failure({ code: 'entry_changed', entryId: targetIds[0] ?? '' })
        : failure({ code: 'entry_not_found', entryId: targetIds[0] ?? '' });
  }

  private startTargets(
    targetIds: readonly Identifier<'translation-entry'>[],
  ): Result<TranslationProject, ApplicationFailure> {
    const targetSet = new Set(targetIds);
    const result = this.projectStore.update((project) => {
      const matches = project.entries.filter((entry) => targetSet.has(entry.id));
      if (matches.length !== targetSet.size) return failure('entry_not_found' as const);
      if (matches.some((entry) => entry.operation === 'translating')) {
        return failure('entry_busy' as const);
      }
      return replaceProjectEntries(project, matches.map(startTranslation));
    });
    if (result.ok) return result;
    return result.error === 'project_not_loaded'
      ? failure({ code: 'project_not_loaded' })
      : result.error === 'entry_busy'
        ? failure({ code: 'entry_busy', entryId: targetIds[0] ?? '' })
        : failure({ code: 'entry_not_found', entryId: targetIds[0] ?? '' });
  }

  private replaceTargets(
    entries: readonly TranslationEntry[],
  ): Result<TranslationProject, ApplicationFailure> {
    const ids = new Set(entries.map((entry) => entry.id));
    const result = this.projectStore.update((project) => {
      const currentEntries = project.entries.filter((entry) => ids.has(entry.id));
      if (currentEntries.length !== ids.size) return failure('entry_not_found' as const);
      if (currentEntries.some((entry) => entry.operation !== 'translating')) {
        return failure('entry_changed' as const);
      }
      return replaceProjectEntries(project, entries);
    });
    if (result.ok) return result;
    return result.error === 'project_not_loaded'
      ? failure({ code: 'project_not_loaded' })
      : result.error === 'entry_changed'
        ? failure({ code: 'entry_changed', entryId: entries[0]?.id ?? '' })
        : failure({ code: 'entry_not_found', entryId: entries[0]?.id ?? '' });
  }

  private recordOutcome(
    targetIds: readonly Identifier<'translation-entry'>[],
    outcome: 'success' | 'failure',
    details: Readonly<Record<string, unknown>>,
  ): void {
    this.projectStore.update((project) =>
      success(
        targetIds.reduce(
          (current, entryId) =>
            appendProjectLog(current, {
              entryId,
              occurredAt: this.clock.now(),
              operation: 'translate',
              outcome,
              details,
            }),
          project,
        ),
      ),
    );
  }
}
