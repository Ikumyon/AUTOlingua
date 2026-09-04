import { describe, expect, it } from 'vitest';

import { identifierFrom, type Identifier } from '../../shared';
import { validateModifierRules, type ModifierRule } from './modifier';

const id = <Tag extends string>(value: string): Identifier<Tag> => {
  const result = identifierFrom<Tag>(value);
  if (!result.ok) throw new Error('invalid test identifier');
  return result.value;
};

const rule = (pattern: string): ModifierRule => ({
  id: id(`rule-${pattern}`),
  name: pattern,
  pattern,
  enabled: true,
  kind: 'variable',
  category: 'test',
});

describe('validateModifierRules', () => {
  it('rejects invalid and zero-length patterns', () => {
    expect(validateModifierRules([rule('['), rule('a*')])).toEqual([
      { ruleId: 'rule-[', code: 'invalid_pattern' },
      { ruleId: 'rule-a*', code: 'empty_match' },
    ]);
  });

  it('ignores disabled invalid rules', () => {
    expect(validateModifierRules([{ ...rule('['), enabled: false }])).toEqual([]);
  });
});
