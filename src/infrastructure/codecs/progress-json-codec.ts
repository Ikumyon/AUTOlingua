import type {
  Clock,
  EncodedProject,
  IdGenerator,
  ProjectCodecFailure,
  ProjectDecoder,
  ProjectEncoder,
  ProjectSource,
} from '../../application';
import { isTranslationStage, type TranslationProject, type TranslationStage } from '../../domain';
import { failure, success, type Result } from '../../shared';
import { buildProject, cancelledCodec, codecFailure, fileStem } from './codec-support';

interface ProgressRecord {
  readonly id?: string;
  readonly key: string;
  readonly version?: string | null;
  readonly original: string;
  readonly translation: string;
  readonly stage: TranslationStage;
  readonly toneId?: string | null;
  readonly structureGroup?: string | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const parseProgressRecord = (value: unknown): ProgressRecord | null => {
  if (
    !isRecord(value) ||
    typeof value.key !== 'string' ||
    typeof value.original !== 'string' ||
    typeof value.translation !== 'string' ||
    typeof value.stage !== 'string' ||
    !isTranslationStage(value.stage)
  ) {
    return null;
  }
  if (value.id !== undefined && typeof value.id !== 'string') return null;
  if (value.version !== undefined && value.version !== null && typeof value.version !== 'string') {
    return null;
  }
  if (value.toneId !== undefined && value.toneId !== null && typeof value.toneId !== 'string') {
    return null;
  }
  if (
    value.structureGroup !== undefined &&
    value.structureGroup !== null &&
    typeof value.structureGroup !== 'string'
  ) {
    return null;
  }
  return value as unknown as ProgressRecord;
};

export class ProgressJsonCodec implements ProjectDecoder, ProjectEncoder {
  public constructor(
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  public async decode(
    source: ProjectSource,
    signal: AbortSignal,
  ): Promise<Result<TranslationProject, ProjectCodecFailure>> {
    if (signal.aborted) return cancelledCodec();
    let raw: unknown;
    try {
      raw = JSON.parse(source.content) as unknown;
    } catch {
      return failure(codecFailure('invalid_json', 'The progress file is not valid JSON.'));
    }
    if (
      !isRecord(raw) ||
      raw.format !== 'autolingua-progress' ||
      raw.schemaVersion !== 1 ||
      !isRecord(raw.project) ||
      !isRecord(raw.project.source) ||
      typeof raw.project.source.fileName !== 'string' ||
      typeof raw.project.source.mediaType !== 'string' ||
      !Array.isArray(raw.project.entries)
    ) {
      return failure(codecFailure('invalid_progress', 'The progress schema is not supported.'));
    }
    const entries = raw.project.entries.map(parseProgressRecord);
    if (entries.some((entry) => entry === null)) {
      return failure(codecFailure('invalid_progress', 'A progress entry is invalid.'));
    }
    return buildProject(
      raw.project.source.fileName,
      raw.project.source.mediaType,
      entries as ProgressRecord[],
      [],
      this.idGenerator,
      this.clock,
    );
  }

  public async encode(
    project: TranslationProject,
    format: string,
    signal: AbortSignal,
  ): Promise<Result<EncodedProject, ProjectCodecFailure>> {
    if (signal.aborted) return cancelledCodec();
    if (format !== 'progress-json') return failure(codecFailure('unsupported_format', format));
    const content = JSON.stringify(
      {
        format: 'autolingua-progress',
        schemaVersion: 1,
        exportedAt: this.clock.now(),
        project: {
          source: project.source,
          entries: project.entries.map((entry) => ({
            id: entry.id,
            key: entry.sourceKey,
            version: entry.sourceVersion,
            original: entry.sourceText,
            translation: entry.translatedText,
            stage: entry.stage,
            toneId: entry.toneId,
            structureGroup: entry.structureGroup,
          })),
        },
      },
      null,
      2,
    );
    return success({
      fileName: `${fileStem(project.source.fileName)}.progress.json`,
      mediaType: 'application/json;charset=utf-8',
      content,
    });
  }
}
