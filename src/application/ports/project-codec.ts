import type { TranslationProject } from '../../domain';
import type { GlossaryTerm } from '../../domain';
import type { Result } from '../../shared';

export interface ProjectSource {
  readonly fileName: string;
  readonly mediaType: string;
  readonly content: string;
}

export interface EncodedProject {
  readonly fileName: string;
  readonly mediaType: string;
  readonly content: string;
}

export interface ProjectCodecFailure {
  readonly code: string;
  readonly message: string;
}

export interface ProjectDecoder {
  decode(
    source: ProjectSource,
    signal: AbortSignal,
  ): Promise<Result<TranslationProject, ProjectCodecFailure>>;
}

export interface ProjectEncoder {
  encode(
    project: TranslationProject,
    format: string,
    signal: AbortSignal,
  ): Promise<Result<EncodedProject, ProjectCodecFailure>>;
}

export interface GlossaryCodec {
  decode(
    source: ProjectSource,
    signal: AbortSignal,
  ): Promise<Result<readonly GlossaryTerm[], ProjectCodecFailure>>;
  encode(
    terms: readonly GlossaryTerm[],
    signal: AbortSignal,
  ): Promise<Result<EncodedProject, ProjectCodecFailure>>;
}
