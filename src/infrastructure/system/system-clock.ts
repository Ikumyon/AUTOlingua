import type { Clock } from '../../application';
import { instantFrom, type Instant } from '../../shared';

export class SystemClock implements Clock {
  public now(): Instant {
    const result = instantFrom(new Date().toISOString());
    if (!result.ok) throw new Error('System clock produced an invalid timestamp.');
    return result.value;
  }
}
