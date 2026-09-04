import { failure, success, type Result } from '../../shared';
import { matchGlossaryTerms, type GlossaryTerm } from '../glossary/glossary';
import {
  resolveToneInstruction,
  type Tone,
  type ToneContext,
  type ToneResolutionError,
} from '../tone/tone';

export interface TranslationGuidance {
  readonly toneInstruction: string;
  readonly glossaryTerms: readonly GlossaryTerm[];
}

export const createTranslationGuidance = (
  context: ToneContext,
  tone: Tone | null,
  glossary: readonly GlossaryTerm[],
): Result<TranslationGuidance, ToneResolutionError> => {
  const instruction = tone ? resolveToneInstruction(tone, context) : success('');
  if (!instruction.ok) return failure(instruction.error);
  return success({
    toneInstruction: instruction.value,
    glossaryTerms: matchGlossaryTerms(context.sourceText, glossary),
  });
};
