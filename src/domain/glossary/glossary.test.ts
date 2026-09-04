import { describe, expect, it } from 'vitest';

import { identifierFrom, type Identifier } from '../../shared';
import { matchGlossaryTerms, type GlossaryTerm } from './glossary';

const id = <Tag extends string>(value: string): Identifier<Tag> => {
  const result = identifierFrom<Tag>(value);
  if (!result.ok) throw new Error('invalid test identifier');
  return result.value;
};

const term = (sourceTerm: string, alternatives: readonly string[] = []): GlossaryTerm => ({
  id: id(sourceTerm),
  sourceTerm,
  alternatives,
  targetTerm: `translated-${sourceTerm}`,
  partOfSpeech: null,
  note: null,
});

describe('matchGlossaryTerms', () => {
  it('matches a primary term or alternative without duplicating a term', () => {
    const terms = [term('empire', ['realm']), term('king')];
    expect(matchGlossaryTerms('The Realm belongs to the king.', terms)).toEqual(terms);
  });

  it('respects ASCII word boundaries', () => {
    expect(matchGlossaryTerms('vampire', [term('empire')])).toEqual([]);
  });

  it('can match case-sensitively', () => {
    expect(matchGlossaryTerms('Empire', [term('empire')], { caseSensitive: true })).toEqual([]);
  });
});
