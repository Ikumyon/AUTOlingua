import { describe, expect, it } from 'vitest';

import { identifierFrom, type Identifier } from '../../shared';
import { resolveToneInstruction, type ConditionalTone, type ToneContext } from './tone';

const id = <Tag extends string>(value: string): Identifier<Tag> => {
  const result = identifierFrom<Tag>(value);
  if (!result.ok) throw new Error('invalid test identifier');
  return result.value;
};

const context: ToneContext = {
  sourceKey: 'event.title',
  sourceText: 'A grand event',
  fileName: 'events.yml',
};

const conditionalTone = (conditions: ConditionalTone['conditions']): ConditionalTone => ({
  kind: 'conditional',
  id: id('event-tone'),
  name: 'Event',
  conditions,
  fallbackInstruction: 'fallback',
});

describe('resolveToneInstruction', () => {
  it('selects one matching condition', () => {
    const result = resolveToneInstruction(
      conditionalTone([
        { target: 'key', pattern: '\\.title$', instruction: 'title instruction' },
        { target: 'file-name', pattern: '^characters', instruction: 'character instruction' },
      ]),
      context,
    );
    expect(result).toEqual({ ok: true, value: 'title instruction' });
  });

  it('uses the fallback when no condition matches', () => {
    const result = resolveToneInstruction(
      conditionalTone([{ target: 'source', pattern: '^Missing$', instruction: 'never' }]),
      context,
    );
    expect(result).toEqual({ ok: true, value: 'fallback' });
  });

  it('reports invalid and ambiguous conditions', () => {
    expect(
      resolveToneInstruction(
        conditionalTone([{ target: 'key', pattern: '[', instruction: 'invalid' }]),
        context,
      ),
    ).toMatchObject({ ok: false, error: { code: 'invalid_pattern', conditionIndex: 0 } });

    expect(
      resolveToneInstruction(
        conditionalTone([
          { target: 'key', pattern: 'event', instruction: 'one' },
          { target: 'file-name', pattern: 'events', instruction: 'two' },
        ]),
        context,
      ),
    ).toEqual({ ok: false, error: { code: 'ambiguous_match', conditionIndexes: [0, 1] } });
  });
});
