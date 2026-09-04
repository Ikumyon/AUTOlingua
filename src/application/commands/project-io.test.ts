import { describe, expect, it } from 'vitest';

import { success } from '../../shared';
import type { ProjectDecoder, ProjectEncoder } from '../ports/project-codec';
import { InMemoryProjectStore } from '../store/in-memory-project-store';
import { makeEntry, makeProject } from '../testing/fixtures';
import { ExportProject } from './export-project';
import { ImportProject } from './import-project';

describe('project I/O commands', () => {
  it('imports decoded data into the session store', async () => {
    const project = makeProject([makeEntry('one', 'One')]);
    const decoder: ProjectDecoder = {
      async decode() {
        return success(project);
      },
    };
    const store = new InMemoryProjectStore();
    const result = await new ImportProject(decoder, store).execute(
      { fileName: 'source.yml', mediaType: 'text/yaml', content: 'ignored by fake' },
      new AbortController().signal,
    );
    expect(result.ok).toBe(true);
    expect(store.get()).toBe(project);
  });

  it('exports the latest project snapshot', async () => {
    const project = makeProject([makeEntry('one', 'One')]);
    let received = null;
    const encoder: ProjectEncoder = {
      async encode(value, format) {
        received = value;
        return success({
          fileName: `output.${format}`,
          mediaType: 'text/plain',
          content: 'encoded',
        });
      },
    };
    const result = await new ExportProject(encoder, new InMemoryProjectStore(project)).execute(
      'yml',
      new AbortController().signal,
    );
    expect(result).toMatchObject({ ok: true, value: { fileName: 'output.yml' } });
    expect(received).toBe(project);
  });
});
