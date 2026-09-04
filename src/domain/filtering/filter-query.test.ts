import { describe, expect, it } from 'vitest';

import { evaluateFilter } from './filter-evaluator';
import type { FilterableEntry } from './filter-expression';
import { parseFilterQuery } from './filter-query';

const entry: FilterableEntry = {
  key: 'event.title',
  source: 'The Grand Event',
  translation: '壮大なイベント',
  tone: 'formal',
  stage: 'needs-review',
};

const evaluate = (query: string): boolean => {
  const result = parseFilterQuery(query);
  if (!result.ok || !result.value) throw new Error('test query parsing failed');
  return evaluateFilter(result.value, entry);
};

describe('filter query', () => {
  it('parses implicit AND, OR, NOT, aliases, and quoted values', () => {
    expect(evaluate('key:starts_with:event source:"grand event"')).toBe(true);
    expect(evaluate('stage:reviewed | stage:needs-review')).toBe(true);
    expect(evaluate('!tone:casual')).toBe(true);
    expect(evaluate('original:matches:"^The"')).toBe(true);
  });

  it('evaluates field lengths', () => {
    expect(evaluate('length:key:>=:10')).toBe(true);
    expect(evaluate('length:translation:<:3')).toBe(false);
  });

  it('supports grouped expressions', () => {
    expect(evaluate('(tone:formal | tone:royal) !stage:reviewed')).toBe(true);
  });

  it('returns structured parse errors', () => {
    expect(parseFilterQuery('(key:event')).toMatchObject({
      ok: false,
      error: { code: 'mismatched_parenthesis' },
    });
    expect(parseFilterQuery('source:"unfinished')).toMatchObject({
      ok: false,
      error: { code: 'unterminated_quote' },
    });
    expect(parseFilterQuery('source:matches:[')).toMatchObject({
      ok: false,
      error: { code: 'invalid_predicate' },
    });
  });
});
