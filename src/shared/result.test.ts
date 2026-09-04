import { describe, expect, it } from 'vitest';

import { failure, mapResult, success } from './result';

describe('Result', () => {
  it('maps a successful value', () => {
    expect(mapResult(success(2), (value) => value * 3)).toEqual(success(6));
  });

  it('keeps a failure unchanged', () => {
    const result = failure('invalid');
    expect(mapResult(result, (value: number) => value * 3)).toBe(result);
  });
});
