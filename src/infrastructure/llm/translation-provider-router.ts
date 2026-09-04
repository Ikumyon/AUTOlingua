import type {
  TranslationProvider,
  TranslationProviderFailure,
  TranslationProviderRequest,
  TranslationProviderResponse,
} from '../../application';
import { failure, type Result } from '../../shared';

export class TranslationProviderRouter implements TranslationProvider {
  private readonly providers: ReadonlyMap<string, TranslationProvider>;

  public constructor(providers: Readonly<Record<string, TranslationProvider>>) {
    this.providers = new Map(Object.entries(providers));
  }

  public translate(
    request: TranslationProviderRequest,
    signal: AbortSignal,
  ): Promise<Result<TranslationProviderResponse, TranslationProviderFailure>> {
    const provider = this.providers.get(request.providerId);
    return provider
      ? provider.translate(request, signal)
      : Promise.resolve(
          failure({
            code: 'unsupported_provider',
            message: `Unknown provider: ${request.providerId}`,
            retryable: false,
          }),
        );
  }
}
