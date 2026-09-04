import type {
  Clock,
  IdGenerator,
  ProjectCodecFailure,
  ProjectDecoder,
  ProjectEncoder,
  ProjectSource,
  EncodedProject,
} from '../../application';
import type { TranslationProject } from '../../domain';
import { failure, success, type Result } from '../../shared';
import { buildProject, cancelledCodec, codecFailure } from './codec-support';

const entryPattern = /^\s*([^\s#][^:]*):(\d*)\s+"((?:\\.|[^"\\])*)"\s*(?:#.*)?$/;
const headerPattern = /^\s*\ufeff?l_[a-z0-9_-]+:\s*$/i;

const unescapeText = (value: string): string =>
  value.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');

const escapeText = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n');

const skipReason = (value: string): string | null => {
  const normalized = value.trim();
  if (/^[\d\s.,+\-/%:]+$/.test(normalized)) return 'skipped_numeric_only';
  if (
    /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(normalized) &&
    !/[\p{Script=Latin}]/u.test(normalized)
  ) {
    return 'skipped_japanese_only';
  }
  if (/^(?:\s|\\n|\$[^$]*\$|§.|[{}[\]<>%:;,.!?"'`~_+=*/|-])+$/.test(normalized)) {
    return 'skipped_formatting_only';
  }
  return null;
};

export class LocalizationYmlCodec implements ProjectDecoder, ProjectEncoder {
  public constructor(
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  public async decode(
    source: ProjectSource,
    signal: AbortSignal,
  ): Promise<Result<TranslationProject, ProjectCodecFailure>> {
    if (signal.aborted) return cancelledCodec();
    const entries: Array<{ key: string; version: string | null; original: string }> = [];
    const rejectedRecords: Array<{ source: string; reason: string; line: number }> = [];
    for (const [index, rawLine] of source.content.split(/\r?\n/).entries()) {
      const line = rawLine.replace(/^\ufeff/, '');
      if (
        line.trim().length === 0 ||
        line.trimStart().startsWith('#') ||
        headerPattern.test(line)
      ) {
        continue;
      }
      const match = entryPattern.exec(line);
      if (!match || match[1] === undefined || match[2] === undefined || match[3] === undefined) {
        rejectedRecords.push({
          source: rawLine,
          reason: 'unrecognized_yml_record',
          line: index + 1,
        });
        continue;
      }
      const original = unescapeText(match[3]);
      const skipped = skipReason(original);
      if (skipped) {
        rejectedRecords.push({ source: rawLine, reason: skipped, line: index + 1 });
        continue;
      }
      entries.push({
        key: match[1].trim(),
        version: match[2].length > 0 ? match[2] : null,
        original,
      });
    }
    if (entries.length === 0) {
      return failure(codecFailure('empty_project', 'No localization records were found.'));
    }
    return buildProject(
      source.fileName,
      source.mediaType || 'text/yaml',
      entries,
      rejectedRecords,
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
    if (format !== 'yml') return failure(codecFailure('unsupported_format', format));
    const records = project.entries.map((entry) => {
      const text = entry.translatedText.trim().length > 0 ? entry.translatedText : entry.sourceText;
      return ` ${entry.sourceKey}:${entry.sourceVersion ?? ''} "${escapeText(text)}"`;
    });
    return success({
      fileName: project.source.fileName.replace(/\.(yaml|txt|json)$/i, '.yml'),
      mediaType: 'text/yaml;charset=utf-8',
      content: `\ufeffl_japanese:\n${records.join('\n')}\n`,
    });
  }
}
