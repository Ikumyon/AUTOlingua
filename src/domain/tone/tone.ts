import { failure, success, type Identifier, type Result } from '../../shared';

export interface ToneContext {
  readonly sourceKey: string;
  readonly sourceText: string;
  readonly fileName: string;
}

export interface StandardTone {
  readonly kind: 'standard';
  readonly id: Identifier<'tone'>;
  readonly name: string;
  readonly instruction: string;
}

export type ToneConditionTarget = 'key' | 'source' | 'file-name';

export interface ToneCondition {
  readonly target: ToneConditionTarget;
  readonly pattern: string;
  readonly instruction: string;
}

export interface ConditionalTone {
  readonly kind: 'conditional';
  readonly id: Identifier<'tone'>;
  readonly name: string;
  readonly conditions: readonly ToneCondition[];
  readonly fallbackInstruction: string;
}

export type Tone = StandardTone | ConditionalTone;

export type ToneResolutionError =
  | { readonly code: 'invalid_pattern'; readonly conditionIndex: number; readonly pattern: string }
  | { readonly code: 'ambiguous_match'; readonly conditionIndexes: readonly number[] };

const conditionTarget = (condition: ToneCondition, context: ToneContext): string => {
  switch (condition.target) {
    case 'key':
      return context.sourceKey;
    case 'source':
      return context.sourceText;
    case 'file-name':
      return context.fileName;
  }
};

export const resolveToneInstruction = (
  tone: Tone,
  context: ToneContext,
): Result<string, ToneResolutionError> => {
  if (tone.kind === 'standard') {
    return success(tone.instruction);
  }

  const matches: number[] = [];
  for (const [index, condition] of tone.conditions.entries()) {
    let expression: RegExp;
    try {
      expression = new RegExp(condition.pattern);
    } catch {
      return failure({
        code: 'invalid_pattern',
        conditionIndex: index,
        pattern: condition.pattern,
      });
    }
    if (expression.test(conditionTarget(condition, context))) {
      matches.push(index);
    }
  }

  if (matches.length > 1) {
    return failure({ code: 'ambiguous_match', conditionIndexes: matches });
  }
  const matchingIndex = matches[0];
  return success(
    matchingIndex === undefined
      ? tone.fallbackInstruction
      : tone.conditions[matchingIndex]!.instruction,
  );
};
