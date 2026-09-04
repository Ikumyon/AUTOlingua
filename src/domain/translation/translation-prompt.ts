import type { TranslationGuidance } from './translation-guidance';

export interface TranslationPrompt {
  readonly systemInstruction: string;
  readonly userMessage: string;
}

const normalizeLine = (value: string): string => value.replace(/\r?\n/g, ' ').trim();

export const buildTranslationPrompt = (
  maskedSource: string,
  tokens: readonly string[],
  guidance: TranslationGuidance,
): TranslationPrompt => {
  const tokenRule =
    tokens.length === 0
      ? 'There are no protected tokens in this source.'
      : `Preserve each protected token exactly once without modification: ${tokens.join(', ')}`;
  const glossary =
    guidance.glossaryTerms.length === 0
      ? 'No glossary terms apply.'
      : guidance.glossaryTerms
          .map(
            (term) =>
              `- ${normalizeLine(term.sourceTerm)} => ${normalizeLine(term.targetTerm)}` +
              (term.note ? ` (${normalizeLine(term.note)})` : ''),
          )
          .join('\n');

  return {
    systemInstruction: [
      'Translate the supplied source text into natural Japanese.',
      'Return only the translation enclosed in <translation> and </translation>.',
      tokenRule,
      `Tone instruction: ${guidance.toneInstruction || 'No additional tone instruction.'}`,
      'Glossary:',
      glossary,
    ].join('\n'),
    userMessage: `Source:\n"""\n${maskedSource}\n"""`,
  };
};

export const extractTranslation = (responseText: string): string => {
  const tagged = responseText.match(/<translation>([\s\S]*?)<\/translation>/i);
  return (tagged?.[1] ?? responseText).trim();
};
