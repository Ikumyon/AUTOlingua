import { describe, expect, it } from 'vitest';

import { instantFrom } from './time';

describe('instantFrom', () => {
  it('normalizes an ISO-compatible instant', () => {
    expect(instantFrom('2026-09-04T00:00:00+09:00')).toEqual({
      ok: true,
      value: '2026-09-03T15:00:00.000Z',
    });
  });

  it('rejects an invalid instant', () => {
    expect(instantFrom('not-a-date')).toEqual({ ok: false, error: 'invalid_instant' });
  });
});
