import type { EncodedProject, ProjectCodecFailure, ProjectEncoder } from '../../application';
import type { TranslationProject } from '../../domain';
import { failure, success, type Result } from '../../shared';
import { cancelledCodec, codecFailure, fileStem } from './codec-support';

const cell = (value: unknown): string => `"${String(value).replace(/"/g, '""')}"`;

export class TranslationLogCsvCodec implements ProjectEncoder {
  public async encode(
    project: TranslationProject,
    format: string,
    signal: AbortSignal,
  ): Promise<Result<EncodedProject, ProjectCodecFailure>> {
    if (signal.aborted) return cancelledCodec();
    if (format !== 'log-csv') return failure(codecFailure('unsupported_format', format));
    const lines = [
      ['occurredAt', 'entryId', 'operation', 'outcome', 'details'].map(cell).join(','),
      ...project.log.map((entry) =>
        [
          entry.occurredAt,
          entry.entryId ?? '',
          entry.operation,
          entry.outcome,
          JSON.stringify(entry.details),
        ]
          .map(cell)
          .join(','),
      ),
    ];
    return success({
      fileName: `${fileStem(project.source.fileName)}.translation-log.csv`,
      mediaType: 'text/csv;charset=utf-8',
      content: `\ufeff${lines.join('\r\n')}\r\n`,
    });
  }
}
