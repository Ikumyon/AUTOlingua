import { failure, type Result } from '../../shared';
import type { ApplicationFailure } from '../failures';
import type { EncodedProject, ProjectEncoder } from '../ports/project-codec';
import type { ProjectStore } from '../ports/project-store';

export class ExportProject {
  public constructor(
    private readonly encoder: ProjectEncoder,
    private readonly projectStore: ProjectStore,
  ) {}

  public async execute(
    format: string,
    signal: AbortSignal,
  ): Promise<Result<EncodedProject, ApplicationFailure>> {
    const project = this.projectStore.get();
    if (!project) return failure({ code: 'project_not_loaded' });
    if (signal.aborted) return failure({ code: 'cancelled' });
    const encoded = await this.encoder.encode(project, format, signal);
    if (signal.aborted) return failure({ code: 'cancelled' });
    return encoded.ok
      ? encoded
      : failure({
          code: 'codec',
          codecCode: encoded.error.code,
          message: encoded.error.message,
        });
  }
}
