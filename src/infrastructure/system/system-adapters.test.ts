import { describe, expect, it } from 'vitest';

import { CryptoIdGenerator } from './crypto-id-generator';
import { SystemClock } from './system-clock';

describe('system adapters', () => {
  it('produces parseable instants and non-empty unique identifiers', () => {
    const now = new SystemClock().now();
    expect(Number.isNaN(Date.parse(now))).toBe(false);
    const ids = new Set([new CryptoIdGenerator().generate(), new CryptoIdGenerator().generate()]);
    expect(ids.size).toBe(2);
  });
});
