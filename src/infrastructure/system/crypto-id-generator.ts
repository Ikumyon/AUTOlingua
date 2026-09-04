import type { IdGenerator } from '../../application';
import { identifierFrom, type Identifier } from '../../shared';

export class CryptoIdGenerator implements IdGenerator {
  public generate(): Identifier {
    const result = identifierFrom(crypto.randomUUID());
    if (!result.ok) throw new Error('Crypto API produced an empty identifier.');
    return result.value;
  }
}
