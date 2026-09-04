import type { Clock, IdGenerator, ProjectCodecFailure } from '../../application';
import {
  createTranslationEntry,
  createTranslationProject,
  type RejectedRecord,
  type TranslationEntry,
  type TranslationProject,
  type TranslationStage,
} from '../../domain';
import { failure, identifierFrom, type Result } from '../../shared';

export const codecFailure = (code: string, message: string): ProjectCodecFailure => ({
  code,
  message,
});

export const cancelledCodec = (): Result<never, ProjectCodecFailure> =>
  failure(codecFailure('cancelled', 'The codec operation was cancelled.'));

export interface ProjectEntryData {
  readonly id?: string;
  readonly key: string;
  readonly version?: string | null;
  readonly original: string;
  readonly translation?: string;
  readonly stage?: TranslationStage;
  readonly toneId?: string | null;
  readonly structureGroup?: string | null;
}

export const buildProject = (
  fileName: string,
  mediaType: string,
  entries: readonly ProjectEntryData[],
  rejectedRecords: readonly RejectedRecord[],
  idGenerator: IdGenerator,
  clock: Clock,
): Result<TranslationProject, ProjectCodecFailure> => {
  const projectId = identifierFrom<'translation-project'>(idGenerator.generate());
  if (!projectId.ok) return failure(codecFailure('invalid_id', 'Could not create a project ID.'));
  const decodedEntries: TranslationEntry[] = [];
  for (const data of entries) {
    const entryId = identifierFrom<'translation-entry'>(data.id ?? idGenerator.generate());
    if (!entryId.ok) return failure(codecFailure('invalid_id', 'An entry ID is invalid.'));
    const toneId =
      data.toneId === null || data.toneId === undefined
        ? null
        : identifierFrom<'tone'>(data.toneId);
    if (toneId !== null && !toneId.ok) {
      return failure(codecFailure('invalid_tone_id', 'An entry tone ID is invalid.'));
    }
    const entry = createTranslationEntry({
      id: entryId.value,
      sourceKey: data.key,
      sourceVersion: data.version ?? null,
      sourceText: data.original,
      translatedText: data.translation ?? '',
      ...(data.stage === undefined ? {} : { stage: data.stage }),
      toneId: toneId === null ? null : toneId.value,
      structureGroup: data.structureGroup ?? null,
    });
    if (!entry.ok) {
      return failure(codecFailure('invalid_entry', `Invalid entry key: ${data.key}`));
    }
    decodedEntries.push(entry.value);
  }
  const project = createTranslationProject({
    id: projectId.value,
    source: { fileName, mediaType },
    entries: decodedEntries,
    rejectedRecords,
    log: [
      {
        entryId: null,
        occurredAt: clock.now(),
        operation: 'import',
        outcome: 'success',
        details: { accepted: decodedEntries.length, rejected: rejectedRecords.length },
      },
    ],
  });
  return project.ok
    ? project
    : failure(codecFailure('invalid_project', 'The decoded project is invalid.'));
};

export const fileStem = (fileName: string): string =>
  fileName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]+/g, '_') || 'translation';
