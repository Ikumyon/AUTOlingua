import type {
  Clock,
  EncodedProject,
  IdGenerator,
  ProjectCodecFailure,
  ProjectDecoder,
  ProjectEncoder,
  ProjectSource,
} from '../../application';
import type { TranslationProject } from '../../domain';
import { failure, type Result } from '../../shared';
import { codecFailure } from './codec-support';
import { LocalizationYmlCodec } from './localization-yml-codec';
import { ParaTranzJsonCodec } from './paratranz-json-codec';
import { ProgressJsonCodec } from './progress-json-codec';
import { TranslationLogCsvCodec } from './translation-log-csv-codec';

export class ProjectCodecRegistry implements ProjectDecoder, ProjectEncoder {
  private readonly yml: LocalizationYmlCodec;
  private readonly progress: ProgressJsonCodec;
  private readonly paraTranz: ParaTranzJsonCodec;
  private readonly log = new TranslationLogCsvCodec();

  public constructor(idGenerator: IdGenerator, clock: Clock) {
    this.yml = new LocalizationYmlCodec(idGenerator, clock);
    this.progress = new ProgressJsonCodec(idGenerator, clock);
    this.paraTranz = new ParaTranzJsonCodec(idGenerator, clock);
  }

  public async decode(
    source: ProjectSource,
    signal: AbortSignal,
  ): Promise<Result<TranslationProject, ProjectCodecFailure>> {
    if (/\.(yml|yaml|txt)$/i.test(source.fileName)) return this.yml.decode(source, signal);
    if (/\.json$/i.test(source.fileName)) {
      let raw: unknown;
      try {
        raw = JSON.parse(source.content) as unknown;
      } catch {
        return failure(codecFailure('invalid_json', 'The JSON file is invalid.'));
      }
      return Array.isArray(raw)
        ? this.paraTranz.decode(source, signal)
        : this.progress.decode(source, signal);
    }
    return failure(codecFailure('unsupported_format', `Unsupported file: ${source.fileName}`));
  }

  public encode(
    project: TranslationProject,
    format: string,
    signal: AbortSignal,
  ): Promise<Result<EncodedProject, ProjectCodecFailure>> {
    if (format === 'yml') return this.yml.encode(project, format, signal);
    if (format === 'progress-json') return this.progress.encode(project, format, signal);
    if (format === 'paratranz-json') return this.paraTranz.encode(project, format, signal);
    if (format === 'log-csv') return this.log.encode(project, format, signal);
    return Promise.resolve(failure(codecFailure('unsupported_format', format)));
  }
}
