import type { ApplicationSettings, MigrationReport } from '../../application';
import type {
  GlossaryTerm,
  ModifierRule,
  StandardTone,
  ConditionalTone,
  Tone,
  TranslationProject,
  TranslationStage,
} from '../../domain';
import type { Identifier } from '../../shared';

export interface WorkspaceFilterDraft {
  readonly query: string;
  readonly stage: TranslationStage | 'all';
  readonly toneId: string;
  readonly caseSensitive: boolean;
  readonly regularExpression: boolean;
  readonly advancedExpression: string;
}

export interface UiModel {
  readonly project: TranslationProject | null;
  readonly visibleEntries: TranslationProject['entries'];
  readonly settings: ApplicationSettings;
  readonly filter: WorkspaceFilterDraft;
  readonly bulkProgress: number | null;
  readonly migrationReport: MigrationReport | null;
  readonly suggestions: readonly {
    readonly entryId: Identifier<'translation-entry'>;
    readonly modelId: string;
    readonly text: string;
  }[];
}

export interface UiActions {
  readonly readAndImportFile: (file: File, signal: AbortSignal) => Promise<void>;
  readonly exportProject: (format: 'yml' | 'progress-json' | 'paratranz-json') => Promise<void>;
  readonly exportGlossary: () => Promise<void>;
  readonly exportLogCsv: () => Promise<void>;
  readonly translateEntry: (entryId: Identifier<'translation-entry'>) => Promise<void>;
  readonly requestSuggestions: (entryId: Identifier<'translation-entry'>) => Promise<void>;
  readonly applySuggestion: (entryId: Identifier<'translation-entry'>, text: string) => void;
  readonly translateVisible: () => Promise<void>;
  readonly translateEntries: (
    entryIds: readonly Identifier<'translation-entry'>[],
  ) => Promise<void>;
  readonly cancelBulk: () => void;
  readonly editTranslation: (entryId: Identifier<'translation-entry'>, text: string) => void;
  readonly editGroup: (entryId: Identifier<'translation-entry'>, text: string) => void;
  readonly deleteEntry: (entryId: Identifier<'translation-entry'>) => void;
  readonly setEntryStage: (
    entryId: Identifier<'translation-entry'>,
    stage: TranslationStage,
  ) => void;
  readonly setEntryTone: (entryId: Identifier<'translation-entry'>, toneId: string | null) => void;
  readonly setFilter: (filter: WorkspaceFilterDraft) => void;
  readonly saveSettings: (settings: ApplicationSettings) => Promise<void>;
  readonly setColumnWidth: (columnId: string, width: number) => void;
  readonly saveCredential: (
    providerId: string,
    secret: string,
    passphrase: string,
  ) => Promise<void>;
  readonly unlockCredential: (providerId: string, passphrase: string) => Promise<void>;
  readonly lockCredential: (providerId: string) => void;
  readonly deleteCredential: (providerId: string) => Promise<void>;
  readonly replaceGlossary: (terms: readonly GlossaryTerm[]) => void;
  readonly addGlossaryTerm: (term: Omit<GlossaryTerm, 'id'>) => void;
  readonly importGlossaryFile: (file: File, signal: AbortSignal) => Promise<void>;
  readonly replaceTones: (tones: readonly Tone[]) => void;
  readonly addTone: (tone: Omit<StandardTone, 'id'> | Omit<ConditionalTone, 'id'>) => void;
  readonly replaceModifiers: (modifiers: readonly ModifierRule[]) => void;
  readonly addModifier: (modifier: Omit<ModifierRule, 'id'>) => void;
  readonly resetModifiers: () => void;
  readonly migrateLegacySettings: () => Promise<void>;
  readonly exportLegacySettingsRecovery: () => Promise<void>;
  readonly clearLog: () => void;
}
