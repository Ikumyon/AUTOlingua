# Functional inventory

This is an inventory of product capabilities found in the current code. It is
not a promise to preserve the current implementation or UI behavior.

## Project input

- Select or drop `.yml`, `.yaml`, `.txt`, and `.json` files.
- Parse the current key/version/quoted-value line format.
- Import AUTOlingua progress JSON.
- Import ParaTranz-compatible JSON arrays.
- Skip Japanese-only, numeric-only, and formatting-only source values.
- Record unparseable and skipped lines for reporting.

## Translation workspace

- Display key, source text, translation, stage, tone, and row actions.
- Edit translated text manually.
- Translate one entry or multiple entries.
- Limit bulk-translation concurrency and cancel pending work.
- Request alternate translation suggestions.
- Apply a structurally compatible result to grouped entries.
- Track untranslated, translated, reviewed, and error states.
- Resize selected table columns.

## Translation behavior

- Select an LLM provider and enabled model.
- Build prompts using glossary entries and tone instructions.
- Select a global tone and override it for an entry.
- Evaluate conditional tones against key, source text, or file name.
- Mask variables and decorations before translation.
- Validate required tokens and restore original structures afterward.
- Keep an in-memory translation log.

## Filtering

- Filter by translation/review status and tone.
- Search key, source, and translated text.
- Toggle case-sensitive and regular-expression search.
- Compose advanced AND, OR, and NOT filter expressions.
- Highlight matching text.

## Editable user data

- Create, edit, delete, search, import, export, and clear glossary terms.
- Create, edit, and delete standard or conditional tones.
- Create, edit, enable, disable, reset, and delete masking modifiers.
- Configure providers, models, default tone, review mode, concurrency, and theme.
- Store provider API keys encrypted with a user passphrase.

## Output

- Download translated YML.
- Export and import AUTOlingua progress JSON.
- Export ParaTranz-compatible JSON.
- Download the translation log as CSV.
- Export the glossary as JSON.

## Cross-cutting UI capabilities

- Light, dark, and system themes.
- Adjustable surface opacity and blur.
- Modal dialogs, transient notifications, confirmations, help, and an about view.

## Decisions deferred to later phases

- Whether skipped entries belong in the editable project.
- Persistence of an active translation project.

Phase 8 selected a replaceable tabbed information architecture. Phase 10
completed its responsive Ink & Signal visual language.

## Decisions resolved in phase 5

- Localization YML accepts a locale header, blank/comment lines, and
  `key:version "value"` records. Unrecognized records are retained with their
  source line and line number instead of being silently discarded.
- Provider calls have a 60-second default timeout. HTTP 408, 429, and 5xx plus
  timeouts and network failures are retryable; authentication, validation,
  unsupported-provider, and malformed-response failures are not.
- Progress files use the explicit `autolingua-progress` format discriminator and
  schema version 1. The legacy progress-file shape is not an implicit fallback.
