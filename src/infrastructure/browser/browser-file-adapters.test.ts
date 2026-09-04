import { describe, expect, it, vi } from 'vitest';

import { BrowserFileDownloader, BrowserTextFileReader } from './browser-file-adapters';

describe('browser file adapters', () => {
  it('reads structural File values without exposing DOM types to application code', async () => {
    const reader = new BrowserTextFileReader();
    await expect(
      reader.read(
        { name: 'source.yml', type: 'text/yaml', text: async () => 'content' },
        new AbortController().signal,
      ),
    ).resolves.toEqual({
      ok: true,
      value: { fileName: 'source.yml', mediaType: 'text/yaml', content: 'content' },
    });
  });

  it('revokes temporary object URLs after triggering a download', () => {
    const environment = {
      createObjectUrl: vi.fn(() => 'blob:test'),
      revokeObjectUrl: vi.fn(),
      clickDownload: vi.fn(),
    };
    const downloader = new BrowserFileDownloader(environment);
    expect(
      downloader.download({ fileName: 'output.yml', mediaType: 'text/yaml', content: 'body' }),
    ).toEqual({ ok: true, value: undefined });
    expect(environment.clickDownload).toHaveBeenCalledWith('blob:test', 'output.yml');
    expect(environment.revokeObjectUrl).toHaveBeenCalledWith('blob:test');
  });
});
