import { describe, expect, it } from 'vitest';

import { identifierFrom, type Identifier } from '../../shared';
import type { GlossaryTerm } from '../glossary/glossary';
import type { StandardTone } from '../tone/tone';
import { createTranslationGuidance } from './translation-guidance';

const id = <Tag extends string>(value: string): Identifier<Tag> => {
  const result = identifierFrom<Tag>(value);
  if (!result.ok) throw new Error('invalid test identifier');
  return result.value;
};

describe('createTranslationGuidance', () => {
  it('resolves tone and only includes relevant glossary terms', () => {
    const tone: StandardTone = {
      kind: 'standard',
      id: id('formal'),
      name: 'Formal',
      instruction: 'Use a formal register.',
    };
    const glossary: readonly GlossaryTerm[] = [
      {
        id: id('empire'),
        sourceTerm: 'empire',
        alternatives: [],
        targetTerm: '帝国',
        partOfSpeech: 'noun',
        note: null,
      },
      {
        id: id('republic'),
        sourceTerm: 'republic',
        alternatives: [],
        targetTerm: '共和国',
        partOfSpeech: 'noun',
        note: null,
      },
    ];

    const result = createTranslationGuidance(
      { sourceKey: 'country.name', sourceText: 'The empire', fileName: 'country.yml' },
      tone,
      glossary,
    );
    expect(result).toMatchObject({
      ok: true,
      value: { toneInstruction: 'Use a formal register.', glossaryTerms: [glossary[0]] },
    });
  });
});
