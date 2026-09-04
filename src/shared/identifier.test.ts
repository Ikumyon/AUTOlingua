import { describe, expect, it } from 'vitest';

import { identifierFrom } from './identifier';

describe('identifierFrom', () => {
  it('normalizes a non-empty identifier', () => {
    expect(identifierFrom('  entry-1  ')).toEqual({ ok: true, value: 'entry-1' });
  });

  it('rejects an empty identifier', () => {
    expect(identifierFrom('   ')).toEqual({ ok: false, error: 'empty_identifier' });
  });
});
