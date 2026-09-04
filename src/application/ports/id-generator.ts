import type { Identifier } from '../../shared/identifier';

export interface IdGenerator {
  generate(): Identifier;
}
