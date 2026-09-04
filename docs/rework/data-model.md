# Target data model

This document defines ownership and identity. Exact TypeScript structures are
implemented in phase 3 after behavior tests and invariants are agreed.

## Translation project

```text
TranslationProject
├─ id: ProjectId
├─ source: SourceDocument
├─ entries: TranslationEntry[]
├─ rejectedRecords: RejectedRecord[]
└─ log: TranslationLogEntry[]
```

`TranslationProject` is the canonical workspace. It does not contain table
selection, open dialogs, toast messages, or other UI state.

## Translation entry

```text
TranslationEntry
├─ id: EntryId
├─ sourceKey: string
├─ sourceVersion: string | null
├─ sourceText: string
├─ translatedText: string
├─ stage: TranslationStage
├─ toneId: ToneId | null
├─ structureGroup: StructureGroupId | null
├─ operation: TranslationOperationState
└─ lastError: TranslationFailure | null
```

Entry identity is separate from the source key. Duplicate keys and malformed
records therefore remain representable and diagnosable.

## Configuration ownership

- Translation preferences: selected provider/model, default tone, concurrency,
  review behavior.
- Glossary library: versioned glossary entries with stable IDs.
- Tone library: standard and conditional tone definitions with stable IDs.
- Modifier library: ordered masking rules with stable IDs.
- Appearance preferences: theme mode and component-specific presentation data.
- Credentials: secret envelopes referenced by provider ID, never embedded in
  general settings.

## State categories

- Domain state: projects, entries, stages, glossary, tones, and modifiers.
- Application state: running jobs, cancellation, import/export progress, and
  currently loaded configuration.
- UI state: focus, selection, active panel, dialog visibility, and drafts.
- Persisted state: explicitly versioned settings and credentials.

Moving values between categories requires a documented product decision. UI
state must not accidentally become persisted because it happens to live in the
same store.
