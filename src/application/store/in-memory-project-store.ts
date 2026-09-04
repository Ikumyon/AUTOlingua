import type { TranslationProject } from '../../domain';
import { failure, type Result } from '../../shared';
import type { ProjectListener, ProjectStore } from '../ports/project-store';

export class InMemoryProjectStore implements ProjectStore {
  private project: TranslationProject | null;
  private readonly listeners = new Set<ProjectListener>();

  public constructor(initialProject: TranslationProject | null = null) {
    this.project = initialProject;
  }

  public get(): TranslationProject | null {
    return this.project;
  }

  public set(project: TranslationProject | null): void {
    this.project = project;
    for (const listener of this.listeners) listener(project);
  }

  public update<E>(
    updater: (project: TranslationProject) => Result<TranslationProject, E>,
  ): Result<TranslationProject, E | 'project_not_loaded'> {
    if (!this.project) return failure('project_not_loaded');
    const result = updater(this.project);
    if (result.ok) this.set(result.value);
    return result;
  }

  public subscribe(listener: ProjectListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
