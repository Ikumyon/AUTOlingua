import { failure, success, type Result } from './result';

declare const instantBrand: unique symbol;

export type Instant = string & { readonly [instantBrand]: true };

export const instantFrom = (value: string): Result<Instant, 'invalid_instant'> => {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp)
    ? failure('invalid_instant')
    : success(new Date(timestamp).toISOString() as Instant);
};
