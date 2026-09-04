import { cancelTranslation, queueTranslation, replaceProjectEntries } from '../../domain';
import { failure, success, type Identifier, type Result } from '../../shared';
import type { ApplicationFailure } from '../failures';
import type { TranslationConfiguration } from '../models/translation-configuration';
import type { ProjectStore } from '../ports/project-store';
import { TranslateEntry, type TranslateEntryOutput } from './translate-entry';

export interface BulkTranslateInput {
  readonly configuration: TranslationConfiguration;
  readonly parallelism: number;
  readonly mode: 'all' | 'untranslated';
  readonly includeStructureGroups?: boolean;
  readonly entryIds?: readonly Identifier<'translation-entry'>[];
  readonly onProgress?: (completed: number, total: number) => void;
}

export interface BulkEntryResult {
  readonly entryId: Identifier<'translation-entry'>;
  readonly result: Result<TranslateEntryOutput, ApplicationFailure>;
}

export interface BulkTranslateOutput {
  readonly total: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly cancelled: number;
  readonly entries: readonly BulkEntryResult[];
}

export class BulkTranslate {
  public constructor(
    private readonly translateEntry: TranslateEntry,
    private readonly projectStore: ProjectStore,
  ) {}

  public async execute(
    input: BulkTranslateInput,
    signal: AbortSignal,
  ): Promise<Result<BulkTranslateOutput, ApplicationFailure>> {
    if (!Number.isInteger(input.parallelism) || input.parallelism < 1 || input.parallelism > 50) {
      return failure({ code: 'invalid_configuration', field: 'parallelism' });
    }
    const project = this.projectStore.get();
    if (!project) return failure({ code: 'project_not_loaded' });

    const requestedIds = input.entryIds ? new Set(input.entryIds) : null;
    const groupKeys = new Set<string>();
    const jobs = project.entries.filter((entry) => {
      if (requestedIds && !requestedIds.has(entry.id)) return false;
      if (input.mode === 'untranslated' && entry.translatedText.trim().length > 0) return false;
      if (input.includeStructureGroups && entry.structureGroup) {
        if (groupKeys.has(entry.structureGroup)) return false;
        groupKeys.add(entry.structureGroup);
      }
      return true;
    });

    this.projectStore.update((current) =>
      replaceProjectEntries(
        current,
        jobs
          .map((job) => current.entries.find((entry) => entry.id === job.id))
          .filter((entry) => entry !== undefined)
          .map(queueTranslation),
      ),
    );

    const results: BulkEntryResult[] = [];
    let cursor = 0;
    const worker = async (): Promise<void> => {
      while (!signal.aborted) {
        const job = jobs[cursor];
        cursor += 1;
        if (!job) return;
        const result = await this.translateEntry.execute(
          {
            entryId: job.id,
            configuration: input.configuration,
            includeStructureGroup: input.includeStructureGroups ?? false,
          },
          signal,
        );
        results.push({ entryId: job.id, result });
        input.onProgress?.(results.length, jobs.length);
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(input.parallelism, jobs.length) }, () => worker()),
    );

    const completedIds = new Set(results.map((entry) => entry.entryId));
    for (const job of jobs) {
      if (!completedIds.has(job.id)) {
        results.push({ entryId: job.id, result: failure({ code: 'cancelled' }) });
      }
    }
    const jobIds = new Set(jobs.map((job) => job.id));
    this.projectStore.update((current) =>
      replaceProjectEntries(
        current,
        current.entries
          .filter((entry) => jobIds.has(entry.id) && entry.operation === 'queued')
          .map(cancelTranslation),
      ),
    );

    const succeeded = results.filter((entry) => entry.result.ok).length;
    const cancelled = results.filter(
      (entry) => !entry.result.ok && entry.result.error.code === 'cancelled',
    ).length;
    return success({
      total: jobs.length,
      succeeded,
      failed: jobs.length - succeeded - cancelled,
      cancelled,
      entries: results,
    });
  }
}
