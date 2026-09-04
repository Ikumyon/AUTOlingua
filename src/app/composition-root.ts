import { InMemoryProjectStore } from '../application';
import {
  AnthropicTranslationProvider,
  BrowserFileDownloader,
  BrowserLegacySettingsSource,
  BrowserTextFileReader,
  CryptoIdGenerator,
  FetchHttpClient,
  GeminiTranslationProvider,
  GlossaryJsonCodec,
  IndexedDbDocumentDatabase,
  IndexedDbSettingsRepository,
  LegacySettingsMigrator,
  OpenAiTranslationProvider,
  ProjectCodecRegistry,
  SystemClock,
  TranslationProviderRouter,
  WebCryptoCredentialVault,
} from '../infrastructure';
import { ApplicationController } from './application-controller';

export const createBrowserApplicationController = (): ApplicationController => {
  const database = new IndexedDbDocumentDatabase();
  const settingsRepository = new IndexedDbSettingsRepository(database);
  const credentialVault = new WebCryptoCredentialVault(database);
  const http = new FetchHttpClient();
  const clock = new SystemClock();
  const idGenerator = new CryptoIdGenerator();
  const projectStore = new InMemoryProjectStore();
  const projectCodec = new ProjectCodecRegistry(idGenerator, clock);
  const glossaryCodec = new GlossaryJsonCodec(idGenerator);
  const provider = new TranslationProviderRouter({
    openai: new OpenAiTranslationProvider(http, credentialVault),
    gemini: new GeminiTranslationProvider(http, credentialVault),
    anthropic: new AnthropicTranslationProvider(http, credentialVault),
  });
  const migrator = new LegacySettingsMigrator(new BrowserLegacySettingsSource(), database);

  return new ApplicationController({
    projectStore,
    settingsRepository,
    credentialVault,
    provider,
    projectCodec,
    glossaryCodec,
    fileReader: new BrowserTextFileReader(),
    downloader: new BrowserFileDownloader(),
    migrator,
    clock,
    idGenerator,
  });
};
