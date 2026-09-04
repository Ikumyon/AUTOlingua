import type { TranslationProject } from '../../domain';
import type { Result } from '../../shared';

export type ProjectListener = (project: TranslationProject | null) => void;

export interface ProjectStore {
  get(): TranslationProject | null;
  set(project: TranslationProject | null): void;
  update<E>(
    updater: (project: TranslationProject) => Result<TranslationProject, E>,
  ): Result<TranslationProject, E | 'project_not_loaded'>;
  subscribe(listener: ProjectListener): () => void;
}
