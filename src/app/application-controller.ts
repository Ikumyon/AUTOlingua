import {
  ApplyGroupEdit,
  BulkTranslate,
  CheckCredential,
  ClearTranslationLog,
  DeleteCredential,
  EditEntry,
  ExportLegacySettingsRecovery,
  ExportProject,
  FilterProjectEntries,
  ImportProject,
  LockCredential,
  MigrateLegacySettings,
  RemoveEntries,
  RequestSuggestions,
  SaveCredential,
  TranslateEntry,
  UnlockCredential,
  UpdateEntryMetadata,
  UpdateSettings,
  validateApplicationSettings,
  type ApplicationSettings,
  type Clock,
  type CredentialVault,
  type FileDownloader,
  type IdGenerator,
  type LegacySettingsMigrator,
  type ProjectDecoder,
  type ProjectEncoder,
  type ProjectStore,
  type SettingsRepository,
  type TextFileReader,
  type TranslationProvider,
} from '../application';
import type { GlossaryCodec } from '../application';
import type {
  GlossaryTerm,
  ModifierRule,
  StandardTone,
  ConditionalTone,
  Tone,
  TranslationEntry,
  TranslationStage,
} from '../domain';
import type { Identifier } from '../shared';
import type { ToastMessage } from '../ui/foundation';
import type { UiActions, UiModel, WorkspaceFilterDraft } from '../ui/features/ui-contract';
import { defaultSettings } from './default-settings';

export interface ControllerDependencies {
  readonly projectStore: ProjectStore;
  readonly settingsRepository: SettingsRepository;
  readonly credentialVault: CredentialVault;
  readonly provider: TranslationProvider;
  readonly projectCodec: ProjectDecoder & ProjectEncoder;
  readonly glossaryCodec: GlossaryCodec;
  readonly fileReader: TextFileReader;
  readonly downloader: FileDownloader;
  readonly migrator: LegacySettingsMigrator;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
}

export interface ControllerSnapshot {
  readonly model: UiModel;
  readonly toasts: readonly ToastMessage[];
  readonly initialized: boolean;
}

const initialFilter: WorkspaceFilterDraft = {
  query: '',
  stage: 'all',
  toneId: '',
  caseSensitive: false,
  regularExpression: false,
  advancedExpression: '',
};

const failureMessage = (value: unknown): string => {
  if (value && typeof value === 'object') {
    const message = Reflect.get(value, 'message');
    if (typeof message === 'string') return message;
    const code = Reflect.get(value, 'code');
    if (typeof code === 'string') return code;
  }
  return '処理に失敗しました。';
};

export class ApplicationController implements UiActions {
  private settings: ApplicationSettings = defaultSettings;
  private filter = initialFilter;
  private bulkProgress: number | null = null;
  private bulkController: AbortController | null = null;
  private migrationReport: UiModel['migrationReport'] = null;
  private suggestions: UiModel['suggestions'] = [];
  private toasts: ToastMessage[] = [];
  private initialized = false;
  private snapshot: ControllerSnapshot;
  private readonly listeners = new Set<() => void>();
  private readonly translateEntryCommand: TranslateEntry;
  private readonly bulkTranslateCommand: BulkTranslate;

  public constructor(private readonly dependencies: ControllerDependencies) {
    this.translateEntryCommand = new TranslateEntry(
      dependencies.provider,
      dependencies.projectStore,
      dependencies.clock,
    );
    this.bulkTranslateCommand = new BulkTranslate(
      this.translateEntryCommand,
      dependencies.projectStore,
    );
    this.snapshot = this.createSnapshot();
    dependencies.projectStore.subscribe(() => this.publish());
  }

  public readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public readonly getSnapshot = (): ControllerSnapshot => this.snapshot;

  public async initialize(): Promise<void> {
    const loaded = await this.dependencies.settingsRepository.load(new AbortController().signal);
    if (loaded.ok) this.settings = loaded.value;
    this.initialized = true;
    this.publish();
  }

  public async readAndImportFile(file: File, signal: AbortSignal): Promise<void> {
    const source = await this.dependencies.fileReader.read(file, signal);
    if (!source.ok) return this.notify('danger', source.error.message);
    const result = await new ImportProject(
      this.dependencies.projectCodec,
      this.dependencies.projectStore,
    ).execute(source.value, signal);
    if (!result.ok) return this.notify('danger', failureMessage(result.error));
    this.suggestions = [];
    this.notify('success', `${file.name}を読み込みました。`);
  }

  public async exportProject(format: 'yml' | 'progress-json' | 'paratranz-json'): Promise<void> {
    await this.exportFormat(format);
  }

  public async exportLogCsv(): Promise<void> {
    await this.exportFormat('log-csv');
  }

  private async exportFormat(format: string): Promise<void> {
    const result = await new ExportProject(
      this.dependencies.projectCodec,
      this.dependencies.projectStore,
    ).execute(format, new AbortController().signal);
    if (!result.ok) return this.notify('danger', failureMessage(result.error));
    const downloaded = this.dependencies.downloader.download(result.value);
    if (!downloaded.ok) return this.notify('danger', downloaded.error.message);
    this.notify('success', `${result.value.fileName}を保存しました。`);
  }

  public async exportGlossary(): Promise<void> {
    const result = await this.dependencies.glossaryCodec.encode(
      this.settings.translation.glossary,
      new AbortController().signal,
    );
    if (!result.ok) return this.notify('danger', result.error.message);
    const downloaded = this.dependencies.downloader.download(result.value);
    if (!downloaded.ok) return this.notify('danger', downloaded.error.message);
    this.notify('success', '用語集を保存しました。');
  }

  public async translateEntry(entryId: Identifier<'translation-entry'>): Promise<void> {
    const result = await this.translateEntryCommand.execute(
      { entryId, configuration: this.settings.translation, includeStructureGroup: true },
      new AbortController().signal,
    );
    if (!result.ok) this.notify('danger', failureMessage(result.error));
  }

  public async requestSuggestions(entryId: Identifier<'translation-entry'>): Promise<void> {
    const selected = this.settings.providers.find(
      (provider) => provider.id === this.settings.translation.providerId,
    );
    const models = selected?.models.filter((model) => model.enabled).map((model) => model.id) ?? [];
    const modelIds =
      models.length > 0 ? models : [this.settings.translation.modelId].filter(Boolean);
    const result = await new RequestSuggestions(this.translateEntryCommand).execute(
      { entryId, configuration: this.settings.translation, modelIds },
      new AbortController().signal,
    );
    if (!result.ok) return this.notify('danger', failureMessage(result.error));
    this.suggestions = result.value.flatMap((suggestion) =>
      suggestion.translation
        ? [
            {
              entryId: suggestion.translation.entryId,
              modelId: suggestion.modelId,
              text: suggestion.translation.text,
            },
          ]
        : [],
    );
    this.publish();
  }

  public applySuggestion(entryId: Identifier<'translation-entry'>, text: string): void {
    this.editTranslation(entryId, text);
    this.suggestions = [];
    this.publish();
  }

  public async translateVisible(): Promise<void> {
    await this.translateEntries(this.visibleEntries().map((entry) => entry.id));
  }

  public async translateEntries(
    entryIds: readonly Identifier<'translation-entry'>[],
  ): Promise<void> {
    if (this.bulkController) return;
    this.bulkController = new AbortController();
    this.bulkProgress = 0;
    this.publish();
    const result = await this.bulkTranslateCommand.execute(
      {
        configuration: this.settings.translation,
        parallelism: this.settings.parallelism,
        mode: 'all',
        includeStructureGroups: true,
        entryIds,
        onProgress: (completed, total) => {
          this.bulkProgress = total === 0 ? 100 : (completed / total) * 100;
          this.publish();
        },
      },
      this.bulkController.signal,
    );
    this.bulkController = null;
    this.bulkProgress = null;
    if (!result.ok) this.notify('danger', failureMessage(result.error));
    else
      this.notify('success', `${result.value.succeeded}/${result.value.total}件を翻訳しました。`);
    this.publish();
  }

  public cancelBulk(): void {
    this.bulkController?.abort();
  }

  public editTranslation(entryId: Identifier<'translation-entry'>, text: string): void {
    const result = new EditEntry(this.dependencies.projectStore).execute(entryId, text);
    if (!result.ok) this.notify('danger', failureMessage(result.error));
  }

  public editGroup(entryId: Identifier<'translation-entry'>, text: string): void {
    const result = new ApplyGroupEdit(this.dependencies.projectStore).execute({
      entryId,
      translatedText: text,
      modifiers: this.settings.translation.modifiers,
      allowMissingStructures: true,
    });
    if (!result.ok) this.notify('danger', failureMessage(result.error));
  }

  public deleteEntry(entryId: Identifier<'translation-entry'>): void {
    const result = new RemoveEntries(this.dependencies.projectStore).execute([entryId]);
    if (!result.ok) this.notify('danger', failureMessage(result.error));
  }

  public setEntryStage(entryId: Identifier<'translation-entry'>, stage: TranslationStage): void {
    const result = new UpdateEntryMetadata(this.dependencies.projectStore).execute(entryId, {
      stage,
    });
    if (!result.ok) this.notify('danger', failureMessage(result.error));
  }

  public setEntryTone(entryId: Identifier<'translation-entry'>, toneId: string | null): void {
    const normalized = toneId as Identifier<'tone'> | null;
    const result = new UpdateEntryMetadata(this.dependencies.projectStore).execute(entryId, {
      toneId: normalized,
    });
    if (!result.ok) this.notify('danger', failureMessage(result.error));
  }

  public setFilter(filter: WorkspaceFilterDraft): void {
    this.filter = filter;
    this.publish();
  }

  public async saveSettings(settings: ApplicationSettings): Promise<void> {
    const result = await new UpdateSettings(this.dependencies.settingsRepository).execute(
      settings,
      new AbortController().signal,
    );
    if (!result.ok) return this.notify('danger', failureMessage(result.error));
    this.settings = settings;
    this.notify('success', '設定を保存しました。');
  }

  public setColumnWidth(columnId: string, width: number): void {
    this.commitSettings({
      ...this.settings,
      appearance: {
        ...this.settings.appearance,
        columnWidths: { ...this.settings.appearance.columnWidths, [columnId]: width },
      },
    });
  }

  public async saveCredential(
    providerId: string,
    secret: string,
    passphrase: string,
  ): Promise<void> {
    const result = await new SaveCredential(this.dependencies.credentialVault).execute(
      providerId,
      secret,
      passphrase,
      new AbortController().signal,
    );
    if (!result.ok) return this.notify('danger', failureMessage(result.error));
    this.notify('success', 'API資格情報を保存し、解除しました。');
  }

  public async unlockCredential(providerId: string, passphrase: string): Promise<void> {
    const exists = await new CheckCredential(this.dependencies.credentialVault).execute(
      providerId,
      new AbortController().signal,
    );
    if (!exists.ok || !exists.value)
      return this.notify('warning', '保存済み資格情報がありません。');
    const result = await new UnlockCredential(this.dependencies.credentialVault).execute(
      providerId,
      passphrase,
      new AbortController().signal,
    );
    if (!result.ok) return this.notify('danger', failureMessage(result.error));
    this.notify('success', 'API資格情報を解除しました。');
  }

  public lockCredential(providerId: string): void {
    new LockCredential(this.dependencies.credentialVault).execute(providerId);
    this.notify('info', 'API資格情報をロックしました。');
  }

  public async deleteCredential(providerId: string): Promise<void> {
    const result = await new DeleteCredential(this.dependencies.credentialVault).execute(
      providerId,
      new AbortController().signal,
    );
    if (!result.ok) return this.notify('danger', failureMessage(result.error));
    this.notify('success', 'API資格情報を削除しました。');
  }

  public replaceGlossary(terms: readonly GlossaryTerm[]): void {
    this.commitTranslation({ ...this.settings.translation, glossary: terms });
  }

  public addGlossaryTerm(term: Omit<GlossaryTerm, 'id'>): void {
    this.replaceGlossary([
      ...this.settings.translation.glossary,
      { ...term, id: this.dependencies.idGenerator.generate() as Identifier<'glossary-term'> },
    ]);
  }

  public async importGlossaryFile(file: File, signal: AbortSignal): Promise<void> {
    const source = await this.dependencies.fileReader.read(file, signal);
    if (!source.ok) return this.notify('danger', source.error.message);
    const result = await this.dependencies.glossaryCodec.decode(source.value, signal);
    if (!result.ok) return this.notify('danger', result.error.message);
    this.replaceGlossary(result.value);
  }

  public replaceTones(tones: readonly Tone[]): void {
    const defaultToneId = tones.some((tone) => tone.id === this.settings.translation.defaultToneId)
      ? this.settings.translation.defaultToneId
      : null;
    this.commitTranslation({ ...this.settings.translation, tones, defaultToneId });
  }

  public addTone(tone: Omit<StandardTone, 'id'> | Omit<ConditionalTone, 'id'>): void {
    this.replaceTones([
      ...this.settings.translation.tones,
      { ...tone, id: this.dependencies.idGenerator.generate() as Identifier<'tone'> },
    ]);
  }

  public replaceModifiers(modifiers: readonly ModifierRule[]): void {
    this.commitTranslation({ ...this.settings.translation, modifiers });
  }

  public addModifier(modifier: Omit<ModifierRule, 'id'>): void {
    this.replaceModifiers([
      ...this.settings.translation.modifiers,
      { ...modifier, id: this.dependencies.idGenerator.generate() as Identifier<'modifier-rule'> },
    ]);
  }

  public resetModifiers(): void {
    this.replaceModifiers(defaultSettings.translation.modifiers);
  }

  public async migrateLegacySettings(): Promise<void> {
    const result = await new MigrateLegacySettings(this.dependencies.migrator).execute(
      new AbortController().signal,
    );
    if (!result.ok) return this.notify('danger', result.error.message);
    this.migrationReport = result.value;
    if (result.value.status === 'migrated' || result.value.status === 'already-migrated') {
      const loaded = await this.dependencies.settingsRepository.load(new AbortController().signal);
      if (loaded.ok) this.settings = loaded.value;
    }
    this.notify('success', `設定変換: ${result.value.status}`);
  }

  public async exportLegacySettingsRecovery(): Promise<void> {
    const result = await new ExportLegacySettingsRecovery(this.dependencies.migrator).execute(
      new AbortController().signal,
    );
    if (!result.ok) return this.notify('danger', result.error.message);
    const downloaded = this.dependencies.downloader.download(result.value);
    if (!downloaded.ok) return this.notify('danger', downloaded.error.message);
    this.notify('success', '旧設定の復旧用JSONを保存しました。');
  }

  public clearLog(): void {
    const result = new ClearTranslationLog(this.dependencies.projectStore).execute();
    if (!result.ok) this.notify('danger', failureMessage(result.error));
  }

  private commitTranslation(translation: ApplicationSettings['translation']): void {
    this.commitSettings({ ...this.settings, translation });
  }

  private commitSettings(settings: ApplicationSettings): void {
    const invalidField = validateApplicationSettings(settings);
    if (invalidField) {
      this.notify('danger', `設定値が不正です: ${invalidField}`);
      return;
    }
    this.updateLocalSettings(settings);
    void this.saveSettings(settings);
  }

  private updateLocalSettings(settings: ApplicationSettings): void {
    this.settings = settings;
    this.publish();
  }

  private notify(tone: ToastMessage['tone'], message: string): void {
    const id = this.dependencies.idGenerator.generate() as string;
    this.toasts = [...this.toasts.slice(-3), { id, tone, message }];
    this.publish();
  }

  private visibleEntries(): readonly TranslationEntry[] {
    const project = this.dependencies.projectStore.get();
    if (!project) return [];
    let entries = project.entries;
    if (this.filter.advancedExpression.trim()) {
      const result = new FilterProjectEntries(this.dependencies.projectStore).execute({
        query: this.filter.advancedExpression,
        caseSensitive: this.filter.caseSensitive,
      });
      if (result.ok) entries = result.value;
    }
    if (this.filter.stage !== 'all') {
      entries = entries.filter((entry) => entry.stage === this.filter.stage);
    }
    if (this.filter.toneId) {
      entries = entries.filter((entry) => entry.toneId === this.filter.toneId);
    }
    const query = this.filter.query;
    if (!query) return entries;
    try {
      const flags = this.filter.caseSensitive ? '' : 'i';
      const expression = this.filter.regularExpression
        ? new RegExp(query, flags)
        : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
      return entries.filter((entry) =>
        [entry.sourceKey, entry.sourceText, entry.translatedText].some((value) =>
          expression.test(value),
        ),
      );
    } catch {
      return entries;
    }
  }

  private createSnapshot(): ControllerSnapshot {
    return {
      initialized: this.initialized,
      toasts: this.toasts,
      model: {
        project: this.dependencies.projectStore.get(),
        visibleEntries: this.visibleEntries(),
        settings: this.settings,
        filter: this.filter,
        bulkProgress: this.bulkProgress,
        migrationReport: this.migrationReport,
        suggestions: this.suggestions,
      },
    };
  }

  private publish(): void {
    this.snapshot = this.createSnapshot();
    for (const listener of this.listeners) listener();
  }
}
