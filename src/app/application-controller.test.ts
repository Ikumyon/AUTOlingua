import { describe, expect, it } from 'vitest';

import {
  InMemoryProjectStore,
  type CredentialVault,
  type EncodedProject,
  type FileDownloader,
  type LegacySettingsMigrator,
  type SettingsRepository,
  type TranslationProvider,
} from '../application';
import { fixedClock, testId } from '../application/testing/fixtures';
import { BrowserTextFileReader, GlossaryJsonCodec, ProjectCodecRegistry } from '../infrastructure';
import { failure, success } from '../shared';
import { ApplicationController } from './application-controller';
import { defaultSettings } from './default-settings';

describe('ApplicationController integration', () => {
  it('connects import, configuration, translation, observable state, and export', async () => {
    let sequence = 0;
    const idGenerator = { generate: () => testId(`runtime-${++sequence}`) };
    const projectStore = new InMemoryProjectStore();
    const projectCodec = new ProjectCodecRegistry(idGenerator, fixedClock);
    let savedSettings = defaultSettings;
    const settingsRepository: SettingsRepository = {
      load: async () => failure({ code: 'missing', message: 'missing' }),
      save: async (settings) => {
        savedSettings = settings;
        return success(undefined);
      },
    };
    const credentialVault: CredentialVault = {
      has: async () => success(false),
      store: async () => success(undefined),
      unlock: async () => success(undefined),
      lock() {},
      remove: async () => success(undefined),
    };
    const provider: TranslationProvider = {
      translate: async () => success({ text: '<translation>こんにちは</translation>' }),
    };
    let download: EncodedProject | null = null;
    const downloader: FileDownloader = {
      download(file) {
        download = file;
        return success(undefined);
      },
    };
    const migrator: LegacySettingsMigrator = {
      migrate: async () =>
        success({
          status: 'no-legacy-data',
          sourceFingerprint: null,
          warningCodes: [],
          migratedCredentialProviders: [],
        }),
      exportRecovery: async () =>
        success({ fileName: 'recovery.json', mediaType: 'application/json', content: '{}' }),
    };
    const controller = new ApplicationController({
      projectStore,
      settingsRepository,
      credentialVault,
      provider,
      projectCodec,
      glossaryCodec: new GlossaryJsonCodec(idGenerator),
      fileReader: new BrowserTextFileReader(),
      downloader,
      migrator,
      clock: fixedClock,
      idGenerator,
    });

    await controller.initialize();
    await controller.readAndImportFile(
      {
        name: 'source.yml',
        type: 'text/yaml',
        text: async () => 'l_english:\n greeting:0 "Hello"',
      } as File,
      new AbortController().signal,
    );
    const entry = controller.getSnapshot().model.project?.entries[0];
    expect(entry?.sourceText).toBe('Hello');

    await controller.saveSettings({
      ...defaultSettings,
      providers: [
        {
          id: 'openai',
          name: 'OpenAI',
          models: [{ id: 'test-model', name: 'Test', enabled: true }],
        },
      ],
      translation: {
        ...defaultSettings.translation,
        providerId: 'openai',
        modelId: 'test-model',
      },
    });
    expect(savedSettings.translation.modelId).toBe('test-model');
    if (!entry) throw new Error('Imported entry missing.');
    await controller.translateEntry(entry.id);
    expect(controller.getSnapshot().model.project?.entries[0]?.translatedText).toBe('こんにちは');

    await controller.exportProject('yml');
    expect(download).toMatchObject({
      fileName: 'source.yml',
      content: expect.stringContaining('こんにちは'),
    });
  });
});
