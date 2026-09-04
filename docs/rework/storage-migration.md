# Storage v2 and legacy conversion

## Scope

“Legacy format” means settings stored by the browser. Progress JSON and
ParaTranz files are separate external file formats and are not part of this
migration unless a later phase explicitly adds importers for them.

## Legacy sources

### localStorage

- `translationAppSettings`
- keys beginning with `auto_lingua_col_width_`

The settings object may contain default tone, custom tones, glossary terms,
modifiers, review mode, theme values, LLM providers/models, selected provider
and model, and concurrency.

### IndexedDB

- Database: `AUTOlinguaDB`
- Version: `1`
- Object store: `appSettings`
- Salt key: `passphraseSalt`
- Credential keys beginning with `encryptedApiKey_`

## Target database

The new database is `AUTOlingua`, IndexedDB version `2`. It is separate from the
legacy `AUTOlinguaDB` database. Its logical schema is:

```text
meta
  schemaVersion
  migrationRuns

preferences
  one versioned SettingsDocument

secrets
  CredentialEnvelope records keyed by provider identity

workspaces
  reserved for an explicitly approved project-persistence feature
```

Every stored document contains a schema version. Credentials contain encryption
algorithm and key-derivation metadata rather than relying on implicit global
constants.

## Conversion pipeline

1. Detect whether v2 is initialized and whether legacy sources exist.
2. Read legacy data without modifying it.
3. Parse all external values as `unknown` and validate a `LegacySettingsV1`
   boundary schema.
4. Normalize missing values, invalid numeric ranges, duplicate IDs, and stale
   provider/model references while collecting warnings.
5. Transform into a staged v2 settings document and secret envelopes.
6. Write a non-active staging record and read it back for validation.
7. Atomically write active settings, credential envelopes, schema metadata, and
   a completed migration record while deleting the staging record. The record contains source fingerprints and a
   report. Only committed data becomes active.
8. Preserve the legacy sources. Deletion requires a separate explicit action.

Staging records cannot become active settings. An interruption after staging
leaves current active data untouched and a later run can safely resume. The
importer is idempotent. A repeated run with the same source fingerprint must
produce the same active result and must not duplicate records.

## Credentials

Legacy AES-GCM ciphertext, IV, and PBKDF2 salt can initially be copied as an
opaque legacy envelope. After the user successfully supplies the passphrase,
the credential is decrypted and re-encrypted using the v2 envelope parameters.
Plaintext API keys are never written to general settings, logs, migration
reports, or backups.

## Failure behavior

- Failure before commit leaves the current v2 data unchanged.
- Valid sections may be offered as a partial migration, but require a report
  listing every discarded or defaulted field.
- Corrupt legacy data is exportable for recovery analysis.
- No error path silently replaces existing user data with defaults.
- Migration telemetry must not contain configuration contents or credentials.

The recovery export is a user-triggered JSON document containing the untouched
legacy snapshot, including opaque encrypted credential values. It never
decrypts credentials and is not written automatically.

## Required migration fixtures

- Complete legacy settings and all credential providers.
- Missing optional properties.
- Invalid JSON.
- Invalid theme and numeric ranges.
- Duplicate custom IDs and missing selected references.
- Credential ciphertext without a salt and salt without ciphertext.
- Interrupted staging and repeated migration.
- Existing v2 data alongside legacy data.
