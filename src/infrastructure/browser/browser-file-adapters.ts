import type {
  EncodedProject,
  FileAccessFailure,
  FileDownloader,
  ProjectSource,
  ReadableTextFile,
  TextFileReader,
} from '../../application';
import { failure, success, type Result } from '../../shared';

export class BrowserTextFileReader implements TextFileReader {
  public async read(
    file: ReadableTextFile,
    signal: AbortSignal,
  ): Promise<Result<ProjectSource, FileAccessFailure>> {
    if (signal.aborted) {
      return failure({ code: 'cancelled', message: 'File reading was cancelled.' });
    }
    try {
      const content = await file.text();
      if (signal.aborted) {
        return failure({ code: 'cancelled', message: 'File reading was cancelled.' });
      }
      return success({
        fileName: file.name,
        mediaType: file.type || 'application/octet-stream',
        content,
      });
    } catch (error) {
      return failure({
        code: 'read_failed',
        message: error instanceof Error ? error.message : 'The file could not be read.',
      });
    }
  }
}

export interface DownloadEnvironment {
  createObjectUrl(blob: Blob): string;
  revokeObjectUrl(url: string): void;
  clickDownload(url: string, fileName: string): void;
}

const browserDownloadEnvironment: DownloadEnvironment = {
  createObjectUrl: (blob) => URL.createObjectURL(blob),
  revokeObjectUrl: (url) => URL.revokeObjectURL(url),
  clickDownload(url, fileName) {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
  },
};

export class BrowserFileDownloader implements FileDownloader {
  public constructor(
    private readonly environment: DownloadEnvironment = browserDownloadEnvironment,
  ) {}

  public download(file: EncodedProject): Result<void, FileAccessFailure> {
    let url: string | null = null;
    try {
      url = this.environment.createObjectUrl(new Blob([file.content], { type: file.mediaType }));
      this.environment.clickDownload(url, file.fileName);
      return success(undefined);
    } catch (error) {
      return failure({
        code: 'download_failed',
        message: error instanceof Error ? error.message : 'The download could not be started.',
      });
    } finally {
      if (url !== null) this.environment.revokeObjectUrl(url);
    }
  }
}
