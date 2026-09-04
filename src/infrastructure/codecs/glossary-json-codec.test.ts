import { describe, expect, it } from 'vitest';

import { testId } from '../../application/testing/fixtures';
import { GlossaryJsonCodec } from './glossary-json-codec';

describe('GlossaryJsonCodec', () => {
  it('reads the former array shape and writes the versioned canonical shape', async () => {
    const codec = new GlossaryJsonCodec({ generate: () => testId('generated') });
    const decoded = await codec.decode(
      {
        fileName: 'glossary.json',
        mediaType: 'application/json',
        content: JSON.stringify([
          { term: 'empire', translation: '帝国', pos: 'noun', variants: ['Empire'], note: 'fixed' },
        ]),
      },
      new AbortController().signal,
    );
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.value[0]).toMatchObject({
      sourceTerm: 'empire',
      targetTerm: '帝国',
      alternatives: ['Empire'],
    });
    const encoded = await codec.encode(decoded.value, new AbortController().signal);
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) return;
    expect(JSON.parse(encoded.value.content)).toMatchObject({
      format: 'autolingua-glossary',
      schemaVersion: 1,
    });
  });
});
