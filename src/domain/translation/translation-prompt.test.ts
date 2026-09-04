import { describe, expect, it } from 'vitest';

import { buildTranslationPrompt, extractTranslation } from './translation-prompt';

describe('translation prompt', () => {
  it('includes token, tone, and glossary guidance', () => {
    const prompt = buildTranslationPrompt('Hello ⟦T0001⟧', ['⟦T0001⟧'], {
      toneInstruction: 'Use formal Japanese.',
      glossaryTerms: [
        {
          id: 'empire' as never,
          sourceTerm: 'empire',
          alternatives: [],
          targetTerm: '帝国',
          partOfSpeech: null,
          note: 'political entity',
        },
      ],
    });
    expect(prompt.systemInstruction).toContain('⟦T0001⟧');
    expect(prompt.systemInstruction).toContain('Use formal Japanese.');
    expect(prompt.systemInstruction).toContain('empire => 帝国');
    expect(prompt.userMessage).toContain('Hello ⟦T0001⟧');
  });

  it('extracts a tagged response and falls back to trimmed plain text', () => {
    expect(extractTranslation('prefix <translation> 訳文 </translation> suffix')).toBe('訳文');
    expect(extractTranslation('  訳文  ')).toBe('訳文');
  });
});
