import { describe, expect, it } from 'vitest';

import { identifierFrom, type Identifier } from '../../shared';
import type { ModifierRule } from '../modifier/modifier';
import { parseStructure } from './structure-parser';
import {
  maskStructureGroup,
  restoreMaskedText,
  reverseMask,
  validateMaskedText,
} from './translation-masker';

const id = <Tag extends string>(value: string): Identifier<Tag> => {
  const result = identifierFrom<Tag>(value);
  if (!result.ok) throw new Error('invalid test identifier');
  return result.value;
};

const rules: readonly ModifierRule[] = [
  {
    id: id('decoration'),
    name: 'Decoration',
    pattern: '§[A-Z!]',
    enabled: true,
    kind: 'decoration',
    category: 'style',
  },
  {
    id: id('variable'),
    name: 'Bracket variable',
    pattern: '\\[[^\\]]+\\]',
    enabled: true,
    kind: 'variable',
    category: 'name',
  },
];

const parse = (text: string) => {
  const result = parseStructure(text, rules);
  if (!result.ok) throw new Error('test structure parsing failed');
  return result.value;
};

describe('translation masking', () => {
  it('parses structure and groups decoration variants deterministically', () => {
    const decorated = parse('Hello §Y[Alice]§!');
    const plain = parse('Hello [Bob]');
    expect(decorated.baseText).toBe('Hello ');
    expect(decorated.groupKey).toBe(plain.groupKey);

    const groupResult = maskStructureGroup([decorated, plain]);
    if (!groupResult.ok) throw new Error('test masking failed');
    expect(groupResult.value.maskedText).toBe('Hello ⟦T0001⟧⟦T0002⟧⟦T0003⟧');
    expect(restoreMaskedText(groupResult.value.maskedText, groupResult.value.sentences[0]!)).toBe(
      'Hello §Y[Alice]§!',
    );
    expect(restoreMaskedText(groupResult.value.maskedText, groupResult.value.sentences[1]!)).toBe(
      'Hello [Bob]',
    );
  });

  it('detects missing and duplicated tokens', () => {
    expect(validateMaskedText('x ⟦T0001⟧ ⟦T0001⟧', ['⟦T0001⟧', '⟦T0002⟧'])).toEqual({
      valid: false,
      missingTokens: ['⟦T0002⟧'],
      duplicatedTokens: ['⟦T0001⟧'],
    });
  });

  it('reverse-masks a manual edit and reports removed structures', () => {
    const structure = parse('Hello [Alice]');
    const groupResult = maskStructureGroup([structure]);
    if (!groupResult.ok) throw new Error('test masking failed');
    const sentence = groupResult.value.sentences[0]!;
    expect(reverseMask('こんにちは [Alice]', sentence)).toEqual({
      maskedText: 'こんにちは ⟦T0001⟧',
      missingReplacements: [],
    });
    expect(reverseMask('こんにちは', sentence).missingReplacements).toHaveLength(1);
  });

  it('restores dollar sequences literally rather than as replacement patterns', () => {
    const dollarRules: readonly ModifierRule[] = [
      {
        id: id('dollar-variable'),
        name: 'Dollar variable',
        pattern: '\\$[^$]+\\$',
        enabled: true,
        kind: 'variable',
        category: 'dollar',
      },
    ];
    const structureResult = parseStructure('Cost $&$', dollarRules);
    if (!structureResult.ok) throw new Error('test structure parsing failed');
    const groupResult = maskStructureGroup([structureResult.value]);
    if (!groupResult.ok) throw new Error('test masking failed');
    expect(restoreMaskedText(groupResult.value.maskedText, groupResult.value.sentences[0]!)).toBe(
      'Cost $&$',
    );
  });

  it('rejects structures with different base text', () => {
    expect(maskStructureGroup([parse('Hello [Alice]'), parse('Goodbye [Bob]')])).toEqual({
      ok: false,
      error: 'incompatible_base_text',
    });
  });
});
