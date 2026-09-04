import { evaluateFilter, parseFilterQuery, type TranslationEntry } from '../../domain';
import { failure, success, type Result } from '../../shared';
import type { ApplicationFailure } from '../failures';
import type { ProjectStore } from '../ports/project-store';

export interface FilterProjectEntriesInput {
  readonly query: string;
  readonly caseSensitive?: boolean;
}

export class FilterProjectEntries {
  public constructor(private readonly projectStore: ProjectStore) {}

  public execute(
    input: FilterProjectEntriesInput,
  ): Result<readonly TranslationEntry[], ApplicationFailure> {
    const project = this.projectStore.get();
    if (!project) return failure({ code: 'project_not_loaded' });
    const expression = parseFilterQuery(input.query);
    if (!expression.ok) return failure({ code: 'filter', cause: expression.error });
    if (!expression.value) return success(project.entries);
    return success(
      project.entries.filter((entry) =>
        evaluateFilter(
          expression.value!,
          {
            key: entry.sourceKey,
            source: entry.sourceText,
            translation: entry.translatedText,
            tone: entry.toneId,
            stage: entry.stage,
          },
          { caseSensitive: input.caseSensitive ?? false },
        ),
      ),
    );
  }
}
