import type { Identifier } from '../../shared';

export interface GlossaryTerm {
  readonly id: Identifier<'glossary-term'>;
  readonly sourceTerm: string;
  readonly alternatives: readonly string[];
  readonly targetTerm: string;
  readonly partOfSpeech: string | null;
  readonly note: string | null;
}

export interface GlossaryMatchOptions {
  readonly caseSensitive?: boolean;
}

const escapeRegularExpression = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const occursInText = (text: string, term: string, caseSensitive: boolean): boolean => {
  if (term.length === 0) return false;
  const startBoundary = /^\w/.test(term) ? '\\b' : '';
  const endBoundary = /\w$/.test(term) ? '\\b' : '';
  return new RegExp(
    `${startBoundary}${escapeRegularExpression(term)}${endBoundary}`,
    caseSensitive ? '' : 'i',
  ).test(text);
};

export const matchGlossaryTerms = (
  text: string,
  terms: readonly GlossaryTerm[],
  options: GlossaryMatchOptions = {},
): readonly GlossaryTerm[] => {
  const caseSensitive = options.caseSensitive ?? false;
  return terms.filter((term) =>
    [term.sourceTerm, ...term.alternatives].some((candidate) =>
      occursInText(text, candidate, caseSensitive),
    ),
  );
};
