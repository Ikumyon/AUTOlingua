import type { TranslationPrompt } from '../../domain';
import type { Result } from '../../shared';

export interface TranslationProviderRequest {
  readonly providerId: string;
  readonly modelId: string;
  readonly prompt: TranslationPrompt;
}

export interface TranslationProviderResponse {
  readonly text: string;
}

export interface TranslationProviderFailure {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
}

export interface TranslationProvider {
  translate(
    request: TranslationProviderRequest,
    signal: AbortSignal,
  ): Promise<Result<TranslationProviderResponse, TranslationProviderFailure>>;
}
