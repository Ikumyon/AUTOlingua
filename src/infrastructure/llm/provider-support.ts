import type { TranslationProviderFailure, UnlockedCredentialReader } from '../../application';
import { failure, success, type Result } from '../../shared';
import type { HttpClient, HttpResponse } from '../http/http-client';

export interface ProviderCall {
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: unknown;
}

const messageFromBody = (body: unknown): string | null => {
  if (!body || typeof body !== 'object') return typeof body === 'string' ? body : null;
  const error = Reflect.get(body, 'error');
  if (error && typeof error === 'object') {
    const message = Reflect.get(error, 'message');
    if (typeof message === 'string') return message;
  }
  const message = Reflect.get(body, 'message');
  return typeof message === 'string' ? message : null;
};

export const executeProviderCall = async (
  http: HttpClient,
  call: ProviderCall,
  signal: AbortSignal,
  timeoutMs: number,
): Promise<Result<HttpResponse, TranslationProviderFailure>> => {
  if (signal.aborted) {
    return failure({ code: 'cancelled', message: 'The request was cancelled.', retryable: false });
  }
  const timeout = new AbortController();
  const relay = (): void => timeout.abort();
  signal.addEventListener('abort', relay, { once: true });
  const timer = setTimeout(() => timeout.abort(), timeoutMs);
  try {
    const response = await http.request({
      url: call.url,
      method: 'POST',
      headers: call.headers,
      body: call.body,
      signal: timeout.signal,
    });
    if (response.status < 200 || response.status >= 300) {
      return failure({
        code: `http_${response.status}`,
        message: messageFromBody(response.body) ?? `Provider returned HTTP ${response.status}.`,
        retryable: response.status === 408 || response.status === 429 || response.status >= 500,
      });
    }
    return success(response);
  } catch (error) {
    if (signal.aborted) {
      return failure({
        code: 'cancelled',
        message: 'The request was cancelled.',
        retryable: false,
      });
    }
    if (timeout.signal.aborted) {
      return failure({
        code: 'timeout',
        message: 'The provider request timed out.',
        retryable: true,
      });
    }
    return failure({
      code: 'network',
      message: error instanceof Error ? error.message : 'The provider request failed.',
      retryable: true,
    });
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', relay);
  }
};

export const readCredential = (
  credentials: UnlockedCredentialReader,
  providerId: string,
): Result<string, TranslationProviderFailure> => {
  const result = credentials.read(providerId);
  return result.ok
    ? result
    : failure({
        code: result.error.code,
        message: result.error.message,
        retryable: false,
      });
};

export const invalidResponse = (providerId: string): TranslationProviderFailure => ({
  code: 'invalid_response',
  message: `${providerId} returned no text response.`,
  retryable: false,
});
