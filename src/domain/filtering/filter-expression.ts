import type { TranslationStage } from '../project/translation-stage';

export type TextField = 'key' | 'source' | 'translation' | 'tone';
export type TextOperator = 'contains' | 'equals' | 'starts-with' | 'ends-with' | 'matches';
export type LengthOperator = '>' | '>=' | '<' | '<=' | '=';

export type FilterExpression =
  | { readonly kind: 'and'; readonly left: FilterExpression; readonly right: FilterExpression }
  | { readonly kind: 'or'; readonly left: FilterExpression; readonly right: FilterExpression }
  | { readonly kind: 'not'; readonly operand: FilterExpression }
  | {
      readonly kind: 'text';
      readonly field: TextField | 'any';
      readonly operator: TextOperator;
      readonly value: string;
    }
  | { readonly kind: 'stage'; readonly value: TranslationStage }
  | {
      readonly kind: 'length';
      readonly field: Exclude<TextField, 'tone'>;
      readonly operator: LengthOperator;
      readonly value: number;
    };

export interface FilterableEntry {
  readonly key: string;
  readonly source: string;
  readonly translation: string;
  readonly tone: string | null;
  readonly stage: TranslationStage;
}

export interface FilterOptions {
  readonly caseSensitive?: boolean;
}
