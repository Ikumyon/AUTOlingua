import type { Instant } from '../../shared/time';

export interface Clock {
  now(): Instant;
}
