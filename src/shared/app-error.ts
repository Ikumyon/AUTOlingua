export type AppErrorCode =
  | 'validation'
  | 'not_found'
  | 'conflict'
  | 'cancelled'
  | 'external_service'
  | 'persistence'
  | 'unauthorized'
  | 'unexpected';

export interface AppErrorOptions {
  readonly cause?: unknown;
  readonly details?: Readonly<Record<string, unknown>>;
}

export class AppError extends Error {
  public readonly code: AppErrorCode;
  public readonly details: Readonly<Record<string, unknown>>;

  public constructor(code: AppErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = 'AppError';
    this.code = code;
    this.details = options.details ?? {};
  }
}
