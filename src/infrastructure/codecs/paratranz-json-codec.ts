import type {
  Clock,
  EncodedProject,
  IdGenerator,
  ProjectCodecFailure,
  ProjectDecoder,
  ProjectEncoder,
  ProjectSource,
} from '../../application';
import type { TranslationProject, TranslationStage } from '../../domain';
import { failure, success, type Result } from '../../shared';
import { buildProject, cancelledCodec, codecFailure, fileStem } from './codec-support';

const stageFromParaTranz = (stage: number, translated: string): TranslationStage => {
  if (stage === 2) return 'reviewed';
  if (stage === 3) return 'needs-review';
  return stage === 0 && translated.trim().length === 0 ? 'untranslated' : 'translated';
};

const stageToParaTranz = (stage: TranslationStage): number => {
  if (stage === 'reviewed') return 2;
  if (stage === 'needs-review') return 3;
  return stage === 'untranslated' ? 0 : 1;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export class ParaTranzJsonCodec implements ProjectDecoder, ProjectEncoder {
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
      return failure(codecFailure('invalid_json', 'The ParaTranz file is not valid JSON.'));
    }
    if (!Array.isArray(raw)) {
      return failure(codecFailure('invalid_paratranz', 'ParaTranz data must be an array.'));
    }
    const entries = [];
    for (const item of raw) {
      if (
        !isRecord(item) ||
        typeof item.key !== 'string' ||
        typeof item.original !== 'string' ||
        typeof item.translation !== 'string' ||
        typeof item.stage !== 'number'
      ) {
        return failure(codecFailure('invalid_paratranz', 'A ParaTranz record is invalid.'));
      }
      entries.push({
        key: item.key,
        original: item.original,
        translation: item.translation,
        stage: stageFromParaTranz(item.stage, item.translation),
      });
    }
    return buildProject(
      source.fileName,
      source.mediaType,
      entries,
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
    if (format !== 'paratranz-json') return failure(codecFailure('unsupported_format', format));
    const content = JSON.stringify(
      project.entries.map((entry) => ({
        key: entry.sourceKey,
        original: entry.sourceText,
        translation: entry.translatedText,
        stage: stageToParaTranz(entry.stage),
      })),
      null,
      2,
    );
    return success({
      fileName: `${fileStem(project.source.fileName)}.paratranz.json`,
      mediaType: 'application/json;charset=utf-8',
      content,
    });
  }
}
