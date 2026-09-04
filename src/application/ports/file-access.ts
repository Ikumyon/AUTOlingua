import type { Result } from '../../shared';
import type { EncodedProject, ProjectSource } from './project-codec';

export interface ReadableTextFile {
  readonly name: string;
  readonly type: string;
  text(): Promise<string>;
}

export interface FileAccessFailure {
  readonly code: 'cancelled' | 'read_failed' | 'download_failed';
  readonly message: string;
}

export interface TextFileReader {
  read(
    file: ReadableTextFile,
    signal: AbortSignal,
  ): Promise<Result<ProjectSource, FileAccessFailure>>;
}

export interface FileDownloader {
  download(file: EncodedProject): Result<void, FileAccessFailure>;
}
