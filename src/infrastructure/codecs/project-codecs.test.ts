import { describe, expect, it } from 'vitest';

import { fixedClock, makeEntry, makeProject, testId } from '../../application/testing/fixtures';
import type { IdGenerator } from '../../application';
import { ProjectCodecRegistry } from './project-codec-registry';

const sequentialIds = (): IdGenerator => {
  let next = 0;
  return { generate: () => testId(`generated-${++next}`) };
};

describe('project codec contracts', () => {
  it('decodes localization YML and retains rejected records with line numbers', async () => {
    const codec = new ProjectCodecRegistry(sequentialIds(), fixedClock);
    const result = await codec.decode(
      {
        fileName: 'source.yml',
        mediaType: 'text/yaml',
        content:
          '\ufeffl_english:\n key.one:0 "Hello\\nworld"\ninvalid line\n key.two: "Quote: \\"ok\\""',
      },
      new AbortController().signal,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.entries.map((entry) => entry.sourceText)).toEqual([
      'Hello\nworld',
      'Quote: "ok"',
    ]);
    expect(result.value.rejectedRecords).toEqual([
      { source: 'invalid line', reason: 'unrecognized_yml_record', line: 3 },
    ]);
  });

  it('round trips the versioned progress format', async () => {
    const codec = new ProjectCodecRegistry(sequentialIds(), fixedClock);
    const project = makeProject([makeEntry('one', 'Hello', { translation: 'こんにちは' })]);
    const encoded = await codec.encode(project, 'progress-json', new AbortController().signal);
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) return;
    expect(JSON.parse(encoded.value.content)).toMatchObject({
      format: 'autolingua-progress',
      schemaVersion: 1,
    });
    const decoded = await codec.decode(encoded.value, new AbortController().signal);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.value.entries[0]).toMatchObject({
      sourceKey: 'key.one',
      sourceText: 'Hello',
      translatedText: 'こんにちは',
      stage: 'translated',
    });
  });

  it('auto-detects ParaTranz arrays and maps review stages', async () => {
    const codec = new ProjectCodecRegistry(sequentialIds(), fixedClock);
    const decoded = await codec.decode(
      {
        fileName: 'paratranz.json',
        mediaType: 'application/json',
        content: JSON.stringify([
          { key: 'a', original: 'A', translation: '甲', stage: 2 },
          { key: 'b', original: 'B', translation: '乙', stage: 3 },
        ]),
      },
      new AbortController().signal,
    );
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.value.entries.map((entry) => entry.stage)).toEqual(['reviewed', 'needs-review']);
    const encoded = await codec.encode(
      decoded.value,
      'paratranz-json',
      new AbortController().signal,
    );
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) return;
    expect(
      JSON.parse(encoded.value.content).map((entry: { stage: number }) => entry.stage),
    ).toEqual([2, 3]);
  });

  it('falls back to source text in YML output and honors cancellation', async () => {
    const codec = new ProjectCodecRegistry(sequentialIds(), fixedClock);
    const project = makeProject([makeEntry('one', 'Original')]);
    const encoded = await codec.encode(project, 'yml', new AbortController().signal);
    expect(encoded).toMatchObject({
      ok: true,
      value: { content: expect.stringContaining('"Original"') },
    });
    const controller = new AbortController();
    controller.abort();
    expect(await codec.encode(project, 'yml', controller.signal)).toMatchObject({
      ok: false,
      error: { code: 'cancelled' },
    });
  });

  it('reports non-translatable localization records and exports logs as CSV', async () => {
    const codec = new ProjectCodecRegistry(sequentialIds(), fixedClock);
    const decoded = await codec.decode(
      {
        fileName: 'mixed.yml',
        mediaType: 'text/yaml',
        content: 'l_english:\n number:0 "123.45"\n japanese:0 "こんにちは"\n text:0 "Translate me"',
      },
      new AbortController().signal,
    );
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.value.entries).toHaveLength(1);
    expect(decoded.value.rejectedRecords.map((record) => record.reason)).toEqual([
      'skipped_numeric_only',
      'skipped_japanese_only',
    ]);
    const csv = await codec.encode(decoded.value, 'log-csv', new AbortController().signal);
    expect(csv).toMatchObject({
      ok: true,
      value: { mediaType: 'text/csv;charset=utf-8', content: expect.stringContaining('"import"') },
    });
  });
});
