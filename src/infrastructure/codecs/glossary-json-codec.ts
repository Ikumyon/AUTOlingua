import type {
  EncodedProject,
  GlossaryCodec,
  IdGenerator,
  ProjectCodecFailure,
  ProjectSource,
} from '../../application';
import type { GlossaryTerm } from '../../domain';
import { failure, identifierFrom, success, type Result } from '../../shared';
import { cancelledCodec, codecFailure } from './codec-support';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export class GlossaryJsonCodec implements GlossaryCodec {
  public constructor(private readonly idGenerator: IdGenerator) {}

  public async decode(
    source: ProjectSource,
    signal: AbortSignal,
  ): Promise<Result<readonly GlossaryTerm[], ProjectCodecFailure>> {
    if (signal.aborted) return cancelledCodec();
    let raw: unknown;
    try {
      raw = JSON.parse(source.content) as unknown;
    } catch {
      return failure(codecFailure('invalid_json', 'The glossary file is not valid JSON.'));
    }
    const items =
      isRecord(raw) && raw.format === 'autolingua-glossary' && raw.schemaVersion === 1
        ? raw.terms
        : raw;
    if (!Array.isArray(items)) {
      return failure(codecFailure('invalid_glossary', 'Glossary terms must be an array.'));
    }
    const terms: GlossaryTerm[] = [];
    for (const item of items) {
      if (!isRecord(item)) return failure(codecFailure('invalid_glossary', 'Invalid term.'));
      const sourceTerm = typeof item.sourceTerm === 'string' ? item.sourceTerm : item.term;
      const targetTerm = typeof item.targetTerm === 'string' ? item.targetTerm : item.translation;
      const alternatives = Array.isArray(item.alternatives) ? item.alternatives : item.variants;
      if (
        typeof sourceTerm !== 'string' ||
        sourceTerm.trim().length === 0 ||
        typeof targetTerm !== 'string' ||
        targetTerm.trim().length === 0 ||
        !Array.isArray(alternatives) ||
        alternatives.some((value) => typeof value !== 'string')
      ) {
        return failure(codecFailure('invalid_glossary', 'A glossary term is invalid.'));
      }
      const id = identifierFrom<'glossary-term'>(
        typeof item.id === 'string' ? item.id : this.idGenerator.generate(),
      );
      if (!id.ok) return failure(codecFailure('invalid_id', 'A glossary ID is invalid.'));
      terms.push({
        id: id.value,
        sourceTerm: sourceTerm.trim(),
        alternatives: alternatives as string[],
        targetTerm: targetTerm.trim(),
        partOfSpeech:
          typeof item.partOfSpeech === 'string'
            ? item.partOfSpeech
            : typeof item.pos === 'string'
              ? item.pos
              : null,
        note: typeof item.note === 'string' ? item.note : null,
      });
    }
    return success(terms);
  }

  public async encode(
    terms: readonly GlossaryTerm[],
    signal: AbortSignal,
  ): Promise<Result<EncodedProject, ProjectCodecFailure>> {
    if (signal.aborted) return cancelledCodec();
    return success({
      fileName: 'autolingua.glossary.json',
      mediaType: 'application/json;charset=utf-8',
      content: JSON.stringify({ format: 'autolingua-glossary', schemaVersion: 1, terms }, null, 2),
    });
  }
}
