import {
  clearProjectLog,
  removeProjectEntries,
  replaceProjectEntries,
  setEntryTone,
  setTranslationStage,
  type TranslationEntry,
  type TranslationStage,
} from '../../domain';
import { failure, success, type Identifier, type Result } from '../../shared';
import type { ApplicationFailure } from '../failures';
import type { ProjectStore } from '../ports/project-store';

const mapUpdateFailure = <T>(
  result: Result<T, 'project_not_loaded' | 'entry_not_found'>,
  entryId: string,
): Result<void, ApplicationFailure> =>
  result.ok
    ? success(undefined)
    : result.error === 'project_not_loaded'
      ? failure({ code: 'project_not_loaded' })
      : failure({ code: 'entry_not_found', entryId });

export interface EntryMetadataPatch {
  readonly stage?: TranslationStage;
  readonly toneId?: Identifier<'tone'> | null;
}

export class UpdateEntryMetadata {
  public constructor(private readonly projectStore: ProjectStore) {}

  public execute(
    entryId: Identifier<'translation-entry'>,
    patch: EntryMetadataPatch,
  ): Result<void, ApplicationFailure> {
    const result = this.projectStore.update((project) => {
      const entry = project.entries.find((candidate) => candidate.id === entryId);
      if (!entry) return failure('entry_not_found' as const);
      let updated: TranslationEntry = entry;
      if (patch.stage !== undefined) updated = setTranslationStage(updated, patch.stage);
      if (patch.toneId !== undefined) updated = setEntryTone(updated, patch.toneId);
      return replaceProjectEntries(project, [updated]);
    });
    return mapUpdateFailure(result, entryId);
  }
}

export class RemoveEntries {
  public constructor(private readonly projectStore: ProjectStore) {}

  public execute(
    entryIds: readonly Identifier<'translation-entry'>[],
  ): Result<void, ApplicationFailure> {
    const result = this.projectStore.update((project) => removeProjectEntries(project, entryIds));
    return mapUpdateFailure(result, entryIds[0] ?? '');
  }
}

export class ClearTranslationLog {
  public constructor(private readonly projectStore: ProjectStore) {}

  public execute(): Result<void, ApplicationFailure> {
    const result = this.projectStore.update((project) => success(clearProjectLog(project)));
    return result.ok ? success(undefined) : failure({ code: 'project_not_loaded' });
  }
}
