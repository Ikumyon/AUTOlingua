import { failure, success, type Result } from '../../shared';
import type { ApplicationFailure } from '../failures';
import type { ProjectDecoder, ProjectSource } from '../ports/project-codec';
import type { ProjectStore } from '../ports/project-store';

export class ImportProject {
  public constructor(
    private readonly decoder: ProjectDecoder,
    private readonly projectStore: ProjectStore,
  ) {}

  public async execute(
    source: ProjectSource,
    signal: AbortSignal,
  ): Promise<Result<void, ApplicationFailure>> {
    if (signal.aborted) return failure({ code: 'cancelled' });
    const decoded = await this.decoder.decode(source, signal);
    if (signal.aborted) return failure({ code: 'cancelled' });
    if (!decoded.ok) {
      return failure({
        code: 'codec',
        codecCode: decoded.error.code,
        message: decoded.error.message,
      });
    }
    this.projectStore.set(decoded.value);
    return success(undefined);
  }
}
