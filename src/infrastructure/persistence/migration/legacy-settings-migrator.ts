import {
  validateApplicationSettings,
  type ApplicationSettings,
  type LegacySettingsMigrator as LegacySettingsMigratorPort,
  type MigrationFailure,
  type MigrationReport,
  type ProviderConfiguration,
} from '../../../application';
import type { GlossaryTerm, ModifierRule, Tone } from '../../../domain';
import { failure, identifierFrom, success, type Identifier, type Result } from '../../../shared';
import type { LegacyCredentialEnvelope } from '../credential-envelope';
import type { DatabaseMutation, DocumentDatabase } from '../document-database';
import { settingsDocument } from '../settings-document';
import type { LegacySettingsSnapshot, LegacySettingsSource } from './legacy-settings-source';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const bytes = (value: unknown): value is readonly number[] =>
  Array.isArray(value) && value.every((item) => Number.isInteger(item) && item >= 0 && item <= 255);
const id = <Tag extends string>(value: string): Identifier<Tag> => {
  const result = identifierFrom<Tag>(value);
  if (!result.ok) throw new Error('Invalid normalized identifier.');
  return result.value;
};
const clamp = (value: unknown, fallback: number, minimum: number, maximum: number): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(maximum, Math.max(minimum, value))
    : fallback;

const digest = async (cryptoApi: Crypto, snapshot: LegacySettingsSnapshot): Promise<string> => {
  const serialized = JSON.stringify(snapshot);
  const hash = await cryptoApi.subtle.digest('SHA-256', new TextEncoder().encode(serialized));
  return [...new Uint8Array(hash)].map((value) => value.toString(16).padStart(2, '0')).join('');
};

const transformProviders = (
  value: unknown,
  warnings: string[],
): readonly ProviderConfiguration[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const providers: ProviderConfiguration[] = [];
  for (const raw of value) {
    if (
      !isRecord(raw) ||
      typeof raw.id !== 'string' ||
      typeof raw.name !== 'string' ||
      seen.has(raw.id)
    ) {
      warnings.push('provider_discarded');
      continue;
    }
    seen.add(raw.id);
    const models = Array.isArray(raw.models)
      ? raw.models.flatMap((model): Array<{ id: string; name: string; enabled: boolean }> => {
          if (!isRecord(model) || typeof model.id !== 'string' || model.id.trim().length === 0)
            return [];
          return [
            {
              id: model.id,
              name: typeof model.name === 'string' ? model.name : model.id,
              enabled: model.enabled === true,
            },
          ];
        })
      : [];
    providers.push({
      id: raw.id,
      name: raw.name,
      models: [...new Map(models.map((model) => [model.id, model])).values()],
    });
  }
  return providers;
};

const transformGlossary = (value: unknown, warnings: string[]): readonly GlossaryTerm[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw, index): GlossaryTerm[] => {
    if (!isRecord(raw) || typeof raw.original !== 'string' || typeof raw.translation !== 'string') {
      warnings.push('glossary_term_discarded');
      return [];
    }
    return [
      {
        id: id(`legacy-glossary-${index}`),
        sourceTerm: raw.original,
        alternatives: Array.isArray(raw.originalAlt)
          ? raw.originalAlt.filter((item): item is string => typeof item === 'string')
          : [],
        targetTerm: raw.translation,
        partOfSpeech: typeof raw.pos === 'string' ? raw.pos : null,
        note: typeof raw.note === 'string' ? raw.note : null,
      },
    ];
  });
};

const transformTones = (value: unknown, warnings: string[]): readonly Tone[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((raw): Tone[] => {
    if (
      !isRecord(raw) ||
      typeof raw.value !== 'string' ||
      typeof raw.name !== 'string' ||
      seen.has(raw.value)
    ) {
      warnings.push('tone_discarded');
      return [];
    }
    seen.add(raw.value);
    if (raw.isConditional === true) {
      const conditions = Array.isArray(raw.conditions)
        ? raw.conditions.flatMap(
            (condition): Array<{ target: 'key'; pattern: string; instruction: string }> =>
              isRecord(condition) &&
              typeof condition.condition === 'string' &&
              typeof condition.instruction === 'string'
                ? [
                    {
                      target: 'key',
                      pattern: condition.condition,
                      instruction: condition.instruction,
                    },
                  ]
                : [],
          )
        : [];
      return [
        {
          kind: 'conditional',
          id: id(raw.value),
          name: raw.name,
          conditions,
          fallbackInstruction: typeof raw.elseInstruction === 'string' ? raw.elseInstruction : '',
        },
      ];
    }
    return [
      {
        kind: 'standard',
        id: id(raw.value),
        name: raw.name,
        instruction: typeof raw.instruction === 'string' ? raw.instruction : '',
      },
    ];
  });
};

const transformModifiers = (value: unknown, warnings: string[]): readonly ModifierRule[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw, index): ModifierRule[] => {
    if (!isRecord(raw) || typeof raw.regex !== 'string' || typeof raw.name !== 'string') {
      warnings.push('modifier_discarded');
      return [];
    }
    return [
      {
        id: id(typeof raw.id === 'string' && raw.id ? raw.id : `legacy-modifier-${index}`),
        name: raw.name,
        pattern: raw.regex,
        enabled: raw.enabled !== false,
        kind: raw.type === 'decoration' ? 'decoration' : 'variable',
        category: typeof raw.category === 'string' ? raw.category : 'legacy',
      },
    ];
  });
};

const transformSettings = (
  raw: unknown,
  widths: Readonly<Record<string, string>>,
  warnings: string[],
): ApplicationSettings => {
  const source = isRecord(raw) ? raw : {};
  const providers = transformProviders(source.llmProviders, warnings);
  let providerId =
    typeof source.currentLlmProviderId === 'string' ? source.currentLlmProviderId : '';
  let modelId = typeof source.currentLlmModelId === 'string' ? source.currentLlmModelId : '';
  const selected = providers.find((provider) => provider.id === providerId);
  if (!selected?.models.some((model) => model.id === modelId && model.enabled)) {
    if (providerId || modelId) warnings.push('selected_provider_model_cleared');
    providerId = '';
    modelId = '';
  }
  const tones = transformTones(source.customTones, warnings);
  const requestedTone = typeof source.defaultTone === 'string' ? source.defaultTone : '';
  const defaultToneId = tones.some((tone) => tone.id === requestedTone)
    ? id<'tone'>(requestedTone)
    : null;
  if (requestedTone && defaultToneId === null) warnings.push('default_tone_cleared');
  const theme = source.currentTheme;
  if (theme !== undefined && theme !== 'light' && theme !== 'dark' && theme !== 'system')
    warnings.push('theme_defaulted');
  const columnWidths = Object.fromEntries(
    Object.entries(widths).flatMap(([key, width]) => {
      const parsed = Number(width);
      return Number.isFinite(parsed) && parsed >= 48 && parsed <= 2000 ? [[key, parsed]] : [];
    }),
  );
  const settings: ApplicationSettings = {
    translation: {
      providerId,
      modelId,
      glossary: transformGlossary(source.glossaryTerms, warnings),
      tones,
      defaultToneId,
      modifiers: transformModifiers(source.modifierCharacters, warnings),
    },
    providers,
    appearance: {
      theme: theme === 'light' || theme === 'dark' || theme === 'system' ? theme : 'system',
      surfaceOpacity: clamp(source.themeOpacity, 0.9, 0, 1),
      blurPx: clamp(source.themeBlur, 8, 0, 40),
      columnWidths,
    },
    parallelism: Math.round(clamp(source.parallelCount, 10, 1, 50)),
    reviewMode: source.isReviewModeEnabled === true,
  };
  const invalid = validateApplicationSettings(settings);
  if (invalid) throw new Error(`Normalized settings are invalid: ${invalid}`);
  return settings;
};

export class LegacySettingsMigrator implements LegacySettingsMigratorPort {
  public constructor(
    private readonly source: LegacySettingsSource,
    private readonly database: DocumentDatabase,
    private readonly cryptoApi: Crypto = crypto,
  ) {}

  public async migrate(signal: AbortSignal): Promise<Result<MigrationReport, MigrationFailure>> {
    try {
      const snapshot = await this.source.read(signal);
      const hasLegacy =
        snapshot.settingsJson !== null ||
        Object.keys(snapshot.encryptedCredentials).length > 0 ||
        Object.keys(snapshot.columnWidths).length > 0;
      if (!hasLegacy)
        return success({
          status: 'no-legacy-data',
          sourceFingerprint: null,
          warningCodes: [],
          migratedCredentialProviders: [],
        });
      const fingerprint = await digest(this.cryptoApi, snapshot);
      const existingRun = await this.database.get('meta', `migration:${fingerprint}`, signal);
      if (existingRun !== undefined)
        return success({
          status: 'already-migrated',
          sourceFingerprint: fingerprint,
          warningCodes: [],
          migratedCredentialProviders: [],
        });
      if ((await this.database.get('preferences', 'settings', signal)) !== undefined) {
        return success({
          status: 'v2-preserved',
          sourceFingerprint: fingerprint,
          warningCodes: ['existing_v2_preserved'],
          migratedCredentialProviders: [],
        });
      }
      let parsed: unknown = {};
      if (snapshot.settingsJson !== null) {
        try {
          parsed = JSON.parse(snapshot.settingsJson) as unknown;
        } catch {
          return failure({
            code: 'invalid_legacy_json',
            message: 'Legacy settings JSON is invalid.',
          });
        }
      }
      const warnings: string[] = [];
      const settings = transformSettings(parsed, snapshot.columnWidths, warnings);
      const settingsValue = settingsDocument(settings);
      const credentialMutations: DatabaseMutation[] = [];
      const migratedCredentialProviders: string[] = [];
      for (const [providerId, raw] of Object.entries(snapshot.encryptedCredentials)) {
        if (
          !bytes(snapshot.passphraseSalt) ||
          !isRecord(raw) ||
          !bytes(raw.iv) ||
          !bytes(raw.ciphertext)
        ) {
          warnings.push('credential_pair_incomplete');
          continue;
        }
        const envelope: LegacyCredentialEnvelope = {
          schemaVersion: 1,
          providerId,
          algorithm: 'legacy-aes-gcm',
          iv: raw.iv,
          ciphertext: raw.ciphertext,
          salt: snapshot.passphraseSalt,
          kdf: { algorithm: 'PBKDF2', hash: 'SHA-256', iterations: 100000 },
        };
        credentialMutations.push({
          kind: 'put',
          store: 'secrets',
          key: providerId,
          value: envelope,
        });
        migratedCredentialProviders.push(providerId);
      }
      const report: MigrationReport = {
        status: 'migrated',
        sourceFingerprint: fingerprint,
        warningCodes: warnings,
        migratedCredentialProviders,
      };
      const stagingKey = `staging:${fingerprint}`;
      await this.database.commit(
        [
          {
            kind: 'put',
            store: 'meta',
            key: stagingKey,
            value: { settings: settingsValue, credentials: credentialMutations, report },
          },
        ],
        signal,
      );
      const staged = await this.database.get('meta', stagingKey, signal);
      if (
        !isRecord(staged) ||
        !isRecord(staged.settings) ||
        Reflect.get(staged.settings, 'schemaVersion') !== 2 ||
        !Array.isArray(staged.credentials)
      ) {
        throw new Error('Migration staging verification failed.');
      }
      await this.database.commit(
        [
          { kind: 'put', store: 'preferences', key: 'settings', value: settingsValue },
          ...credentialMutations,
          { kind: 'put', store: 'meta', key: 'schemaVersion', value: 2 },
          { kind: 'put', store: 'meta', key: `migration:${fingerprint}`, value: report },
          { kind: 'delete', store: 'meta', key: stagingKey },
        ],
        signal,
      );
      return success(report);
    } catch (error) {
      return failure({
        code: signal.aborted ? 'cancelled' : 'migration_failed',
        message: error instanceof Error ? error.message : 'Migration failed.',
      });
    }
  }

  public async exportRecovery(
    signal: AbortSignal,
  ): Promise<Result<import('../../../application').EncodedProject, MigrationFailure>> {
    try {
      const snapshot = await this.source.read(signal);
      return success({
        fileName: 'autolingua-legacy-settings-recovery.json',
        mediaType: 'application/json;charset=utf-8',
        content: JSON.stringify(
          { format: 'autolingua-legacy-settings-recovery', schemaVersion: 1, snapshot },
          null,
          2,
        ),
      });
    } catch (error) {
      return failure({
        code: signal.aborted ? 'cancelled' : 'recovery_export_failed',
        message: error instanceof Error ? error.message : 'Recovery export failed.',
      });
    }
  }
}
