import type {
  FilterParseError,
  MaskingError,
  StructureParseError,
  ToneResolutionError,
} from '../domain';

export type ApplicationFailure =
  | { readonly code: 'project_not_loaded' }
  | { readonly code: 'entry_not_found'; readonly entryId: string }
  | { readonly code: 'entry_busy'; readonly entryId: string }
  | { readonly code: 'entry_changed'; readonly entryId: string }
  | { readonly code: 'cancelled' }
  | { readonly code: 'invalid_configuration'; readonly field: string }
  | { readonly code: 'structure'; readonly cause: StructureParseError }
  | { readonly code: 'masking'; readonly cause: MaskingError }
  | { readonly code: 'tone'; readonly cause: ToneResolutionError }
  | {
      readonly code: 'invalid_translation_tokens';
      readonly missingTokens: readonly string[];
      readonly duplicatedTokens: readonly string[];
    }
  | { readonly code: 'provider'; readonly providerCode: string; readonly retryable: boolean }
  | { readonly code: 'filter'; readonly cause: FilterParseError }
  | { readonly code: 'codec'; readonly codecCode: string; readonly message: string }
  | { readonly code: 'settings'; readonly repositoryCode: string; readonly message: string }
  | { readonly code: 'credential'; readonly vaultCode: string; readonly message: string }
  | { readonly code: 'missing_structures'; readonly originals: readonly string[] };
