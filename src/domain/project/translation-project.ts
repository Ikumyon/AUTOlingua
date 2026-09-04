import { failure, success, type Identifier, type Instant, type Result } from '../../shared';
import type { TranslationEntry } from './translation-entry';

export interface SourceDocument {
  readonly fileName: string;
  readonly mediaType: string;
}

export interface RejectedRecord {
  readonly source: string;
  readonly reason: string;
  readonly line: number | null;
}

export interface TranslationLogEntry {
  readonly entryId: Identifier<'translation-entry'> | null;
  readonly occurredAt: Instant;
  readonly operation: string;
  readonly outcome: 'success' | 'failure' | 'skipped';
  readonly details: Readonly<Record<string, unknown>>;
}

export interface TranslationProject {
  readonly id: Identifier<'translation-project'>;
  readonly source: SourceDocument;
  readonly entries: readonly TranslationEntry[];
  readonly rejectedRecords: readonly RejectedRecord[];
  readonly log: readonly TranslationLogEntry[];
}

export type TranslationProjectError = 'empty_file_name' | 'duplicate_entry_id';

export const createTranslationProject = (
  project: TranslationProject,
): Result<TranslationProject, TranslationProjectError> => {
  if (project.source.fileName.trim().length === 0) {
    return failure('empty_file_name');
  }

  const identifiers = project.entries.map((entry) => entry.id as string);
  if (new Set(identifiers).size !== identifiers.length) {
    return failure('duplicate_entry_id');
  }

  return success({
    ...project,
    source: { ...project.source, fileName: project.source.fileName.trim() },
    entries: [...project.entries],
    rejectedRecords: [...project.rejectedRecords],
    log: [...project.log],
  });
};

export const replaceProjectEntry = (
  project: TranslationProject,
  replacement: TranslationEntry,
): Result<TranslationProject, 'entry_not_found'> => {
  const index = project.entries.findIndex((entry) => entry.id === replacement.id);
  if (index < 0) {
    return failure('entry_not_found');
  }

  const entries = [...project.entries];
  entries[index] = replacement;
  return success({ ...project, entries });
};

export const replaceProjectEntries = (
  project: TranslationProject,
  replacements: readonly TranslationEntry[],
): Result<TranslationProject, 'entry_not_found'> => {
  const byId = new Map(replacements.map((entry) => [entry.id, entry]));
  if ([...byId.keys()].some((id) => !project.entries.some((entry) => entry.id === id))) {
    return failure('entry_not_found');
  }
  return success({
    ...project,
    entries: project.entries.map((entry) => byId.get(entry.id) ?? entry),
  });
};

export const appendProjectLog = (
  project: TranslationProject,
  entry: TranslationLogEntry,
): TranslationProject => ({ ...project, log: [...project.log, entry] });

export const removeProjectEntries = (
  project: TranslationProject,
  entryIds: readonly Identifier<'translation-entry'>[],
): Result<TranslationProject, 'entry_not_found'> => {
  const identifiers = new Set(entryIds);
  if ([...identifiers].some((id) => !project.entries.some((entry) => entry.id === id))) {
    return failure('entry_not_found');
  }
  return success({
    ...project,
    entries: project.entries.filter((entry) => !identifiers.has(entry.id)),
  });
};

export const clearProjectLog = (project: TranslationProject): TranslationProject => ({
  ...project,
  log: [],
});
