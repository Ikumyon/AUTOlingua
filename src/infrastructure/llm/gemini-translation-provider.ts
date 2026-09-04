import type {
  TranslationProvider,
  TranslationProviderFailure,
  TranslationProviderRequest,
  TranslationProviderResponse,
  UnlockedCredentialReader,
} from '../../application';
import { failure, success, type Result } from '../../shared';
import type { HttpClient } from '../http/http-client';
import { executeProviderCall, invalidResponse, readCredential } from './provider-support';

export class GeminiTranslationProvider implements TranslationProvider {
  public constructor(
    private readonly http: HttpClient,
    private readonly credentials: UnlockedCredentialReader,
    private readonly timeoutMs = 60_000,
  ) {}

  public async translate(
    request: TranslationProviderRequest,
    signal: AbortSignal,
  ): Promise<Result<TranslationProviderResponse, TranslationProviderFailure>> {
    if (request.providerId !== 'gemini') {
      return failure({
        code: 'unsupported_provider',
        message: 'Expected gemini.',
        retryable: false,
      });
    }
    const credential = readCredential(this.credentials, request.providerId);
    if (!credential.ok) return credential;
    const model = encodeURIComponent(request.modelId.replace(/^models\//, ''));
    const response = await executeProviderCall(
      this.http,
      {
        url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': credential.value },
        body: {
          systemInstruction: { parts: [{ text: request.prompt.systemInstruction }] },
          contents: [{ role: 'user', parts: [{ text: request.prompt.userMessage }] }],
        },
      },
      signal,
      this.timeoutMs,
    );
    if (!response.ok) return response;
    const text = extractGeminiText(response.value.body);
    return text === null ? failure(invalidResponse('Gemini')) : success({ text });
  }
}

const extractGeminiText = (body: unknown): string | null => {
  if (!body || typeof body !== 'object') return null;
  const candidates = Reflect.get(body, 'candidates');
  if (!Array.isArray(candidates)) return null;
  const parts: string[] = [];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    const content = Reflect.get(candidate, 'content');
    if (!content || typeof content !== 'object') continue;
    const contentParts = Reflect.get(content, 'parts');
    if (!Array.isArray(contentParts)) continue;
    for (const part of contentParts) {
      if (!part || typeof part !== 'object') continue;
      const text = Reflect.get(part, 'text');
      if (typeof text === 'string') parts.push(text);
    }
  }
  return parts.length > 0 ? parts.join('') : null;
};
