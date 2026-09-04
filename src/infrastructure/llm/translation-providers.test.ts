import { describe, expect, it } from 'vitest';

import type { TranslationProvider, UnlockedCredentialReader } from '../../application';
import { failure, success } from '../../shared';
import type { HttpClient, HttpRequest, HttpResponse } from '../http/http-client';
import { AnthropicTranslationProvider } from './anthropic-translation-provider';
import { GeminiTranslationProvider } from './gemini-translation-provider';
import { OpenAiTranslationProvider } from './openai-translation-provider';
import { TranslationProviderRouter } from './translation-provider-router';

class RecordingHttpClient implements HttpClient {
  public requestValue: HttpRequest | null = null;

  public constructor(private readonly response: HttpResponse) {}

  public async request(request: HttpRequest): Promise<HttpResponse> {
    this.requestValue = request;
    return this.response;
  }
}

const credentials: UnlockedCredentialReader = {
  read: () => success('secret'),
};

const requestFor = (providerId: string) => ({
  providerId,
  modelId: 'model/latest',
  prompt: { systemInstruction: 'system', userMessage: 'user' },
});

describe('translation provider contracts', () => {
  it('maps OpenAI Responses API fields and nested output text', async () => {
    const http = new RecordingHttpClient({
      status: 200,
      body: { output: [{ content: [{ type: 'output_text', text: 'openai text' }] }] },
    });
    const provider = new OpenAiTranslationProvider(http, credentials);
    const result = await provider.translate(requestFor('openai'), new AbortController().signal);
    expect(result).toEqual(success({ text: 'openai text' }));
    expect(http.requestValue).toMatchObject({
      url: 'https://api.openai.com/v1/responses',
      headers: { Authorization: 'Bearer secret' },
      body: { model: 'model/latest', instructions: 'system', input: 'user', store: false },
    });
  });

  it('maps Gemini generateContent fields and concatenates text parts', async () => {
    const http = new RecordingHttpClient({
      status: 200,
      body: { candidates: [{ content: { parts: [{ text: 'one' }, { text: 'two' }] } }] },
    });
    const provider = new GeminiTranslationProvider(http, credentials);
    const result = await provider.translate(requestFor('gemini'), new AbortController().signal);
    expect(result).toEqual(success({ text: 'onetwo' }));
    expect(http.requestValue).toMatchObject({
      url: 'https://generativelanguage.googleapis.com/v1beta/models/model%2Flatest:generateContent',
      headers: { 'x-goog-api-key': 'secret' },
      body: {
        systemInstruction: { parts: [{ text: 'system' }] },
        contents: [{ role: 'user', parts: [{ text: 'user' }] }],
      },
    });
  });

  it('maps Anthropic Messages API fields and text blocks', async () => {
    const http = new RecordingHttpClient({
      status: 200,
      body: { content: [{ type: 'text', text: 'anthropic text' }] },
    });
    const provider = new AnthropicTranslationProvider(http, credentials);
    const result = await provider.translate(requestFor('anthropic'), new AbortController().signal);
    expect(result).toEqual(success({ text: 'anthropic text' }));
    expect(http.requestValue).toMatchObject({
      url: 'https://api.anthropic.com/v1/messages',
      headers: { Authorization: 'Bearer secret', 'anthropic-version': '2023-06-01' },
      body: {
        model: 'model/latest',
        max_tokens: 4096,
        system: 'system',
        messages: [{ role: 'user', content: 'user' }],
      },
    });
  });

  it('normalizes retryable HTTP failures and missing credentials', async () => {
    const retrying = new OpenAiTranslationProvider(
      new RecordingHttpClient({ status: 429, body: { error: { message: 'rate limited' } } }),
      credentials,
    );
    expect(await retrying.translate(requestFor('openai'), new AbortController().signal)).toEqual(
      failure({ code: 'http_429', message: 'rate limited', retryable: true }),
    );

    const locked = new OpenAiTranslationProvider(
      new RecordingHttpClient({ status: 200, body: {} }),
      {
        read: () => failure({ code: 'credential_locked', message: 'Unlock it.' }),
      },
    );
    expect(await locked.translate(requestFor('openai'), new AbortController().signal)).toEqual(
      failure({ code: 'credential_locked', message: 'Unlock it.', retryable: false }),
    );
  });

  it('honors cancellation and routes by provider id', async () => {
    const controller = new AbortController();
    controller.abort();
    const provider = new OpenAiTranslationProvider(
      new RecordingHttpClient({ status: 200, body: { output_text: 'unused' } }),
      credentials,
    );
    expect(await provider.translate(requestFor('openai'), controller.signal)).toMatchObject({
      ok: false,
      error: { code: 'cancelled' },
    });

    const fake: TranslationProvider = {
      translate: async () => success({ text: 'routed' }),
    };
    const router = new TranslationProviderRouter({ custom: fake });
    expect(await router.translate(requestFor('custom'), new AbortController().signal)).toEqual(
      success({ text: 'routed' }),
    );
    expect(
      await router.translate(requestFor('missing'), new AbortController().signal),
    ).toMatchObject({ ok: false, error: { code: 'unsupported_provider' } });
  });

  it('distinguishes adapter timeouts from caller cancellation', async () => {
    const hangingHttp: HttpClient = {
      request: ({ signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            {
              once: true,
            },
          );
        }),
    };
    const provider = new OpenAiTranslationProvider(hangingHttp, credentials, 1);
    expect(await provider.translate(requestFor('openai'), new AbortController().signal)).toEqual(
      failure({ code: 'timeout', message: 'The provider request timed out.', retryable: true }),
    );
  });
});
