import type { TranslationProject } from '../../domain';
import { failure, success, type Result } from '../../shared';
import type { ApplicationFailure } from '../failures';
import type { ProjectStore } from '../ports/project-store';

export class GetProject {
  public constructor(private readonly projectStore: ProjectStore) {}

  public execute(): Result<TranslationProject, ApplicationFailure> {
    const project = this.projectStore.get();
    return project ? success(project) : failure({ code: 'project_not_loaded' });
  }
}
