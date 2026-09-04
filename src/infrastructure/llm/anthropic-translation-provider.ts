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

export class AnthropicTranslationProvider implements TranslationProvider {
  public constructor(
    private readonly http: HttpClient,
    private readonly credentials: UnlockedCredentialReader,
    private readonly timeoutMs = 60_000,
    private readonly maxTokens = 4096,
  ) {}

  public async translate(
    request: TranslationProviderRequest,
    signal: AbortSignal,
  ): Promise<Result<TranslationProviderResponse, TranslationProviderFailure>> {
    if (request.providerId !== 'anthropic') {
      return failure({
        code: 'unsupported_provider',
        message: 'Expected anthropic.',
        retryable: false,
      });
    }
    const credential = readCredential(this.credentials, request.providerId);
    if (!credential.ok) return credential;
    const response = await executeProviderCall(
      this.http,
      {
        url: 'https://api.anthropic.com/v1/messages',
        headers: {
          Authorization: `Bearer ${credential.value}`,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: {
          model: request.modelId,
          max_tokens: this.maxTokens,
          system: request.prompt.systemInstruction,
          messages: [{ role: 'user', content: request.prompt.userMessage }],
        },
      },
      signal,
      this.timeoutMs,
    );
    if (!response.ok) return response;
    const text = extractAnthropicText(response.value.body);
    return text === null ? failure(invalidResponse('Anthropic')) : success({ text });
  }
}

const extractAnthropicText = (body: unknown): string | null => {
  if (!body || typeof body !== 'object') return null;
  const content = Reflect.get(body, 'content');
  if (!Array.isArray(content)) return null;
  const parts = content.flatMap((part): string[] => {
    if (!part || typeof part !== 'object' || Reflect.get(part, 'type') !== 'text') return [];
    const text = Reflect.get(part, 'text');
    return typeof text === 'string' ? [text] : [];
  });
  return parts.length > 0 ? parts.join('') : null;
};
