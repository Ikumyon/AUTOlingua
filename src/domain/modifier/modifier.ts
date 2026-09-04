import type { Identifier } from '../../shared';

export type ModifierKind = 'variable' | 'decoration';
export type ModifierRole = 'value' | 'open' | 'close' | 'marker';

export interface ModifierRule {
  readonly id: Identifier<'modifier-rule'>;
  readonly name: string;
  readonly pattern: string;
  readonly enabled: boolean;
  readonly kind: ModifierKind;
  readonly category: string;
  readonly role?: ModifierRole;
}

export interface InvalidModifierRule {
  readonly ruleId: Identifier<'modifier-rule'>;
  readonly code: 'invalid_pattern' | 'empty_match';
}

export const validateModifierRules = (
  rules: readonly ModifierRule[],
): readonly InvalidModifierRule[] => {
  const errors: InvalidModifierRule[] = [];
  for (const rule of rules) {
    if (!rule.enabled) continue;
    try {
      const expression = new RegExp(rule.pattern);
      if (expression.test('')) {
        errors.push({ ruleId: rule.id, code: 'empty_match' });
      }
    } catch {
      errors.push({ ruleId: rule.id, code: 'invalid_pattern' });
    }
  }
  return errors;
};

export const modifierRole = (rule: ModifierRule, matchedText: string): ModifierRole => {
  if (rule.role) return rule.role;
  if (rule.kind === 'variable') return 'value';
  if (matchedText === '§!') return 'close';
  return 'open';
};
