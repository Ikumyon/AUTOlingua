import type {
  TranslationProvider,
  TranslationProviderRequest,
  TranslationProviderResponse,
  UnlockedCredentialReader,
} from '../../application';
import { failure, success, type Result } from '../../shared';
import type { HttpClient } from '../http/http-client';
import { executeProviderCall, invalidResponse, readCredential } from './provider-support';

export class OpenAiTranslationProvider implements TranslationProvider {
  public constructor(
    private readonly http: HttpClient,
    private readonly credentials: UnlockedCredentialReader,
    private readonly timeoutMs = 60_000,
  ) {}

  public async translate(
    request: TranslationProviderRequest,
    signal: AbortSignal,
  ): Promise<
    Result<TranslationProviderResponse, import('../../application').TranslationProviderFailure>
  > {
    if (request.providerId !== 'openai') {
      return failure({
        code: 'unsupported_provider',
        message: 'Expected openai.',
        retryable: false,
      });
    }
    const credential = readCredential(this.credentials, request.providerId);
    if (!credential.ok) return credential;
    const response = await executeProviderCall(
      this.http,
      {
        url: 'https://api.openai.com/v1/responses',
        headers: {
          Authorization: `Bearer ${credential.value}`,
          'Content-Type': 'application/json',
        },
        body: {
          model: request.modelId,
          instructions: request.prompt.systemInstruction,
          input: request.prompt.userMessage,
          store: false,
        },
      },
      signal,
      this.timeoutMs,
    );
    if (!response.ok) return response;
    const text = extractOpenAiText(response.value.body);
    return text === null ? failure(invalidResponse('OpenAI')) : success({ text });
  }
}

const extractOpenAiText = (body: unknown): string | null => {
  if (!body || typeof body !== 'object') return null;
  const direct = Reflect.get(body, 'output_text');
  if (typeof direct === 'string' && direct.length > 0) return direct;
  const output = Reflect.get(body, 'output');
  if (!Array.isArray(output)) return null;
  const parts: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    const content = Reflect.get(item, 'content');
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== 'object' || Reflect.get(part, 'type') !== 'output_text')
        continue;
      const text = Reflect.get(part, 'text');
      if (typeof text === 'string') parts.push(text);
    }
  }
  return parts.length > 0 ? parts.join('') : null;
};
