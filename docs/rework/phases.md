# Feature phases

Phases are work-scope boundaries, not runnable-release milestones. Intermediate
phases may depend on later composition and do not need to start as an
application. Checks only verify the artifacts owned by that phase.

## Phase 1 — design and specification

Deliverables:

- Functional inventory.
- Layer boundaries and dependency rules.
- Target model ownership.
- Storage v2 and conversion contract.
- UI shell and design-language responsibilities.

Scope check: decisions are explicit, contradictions are resolved, and deferred items
are listed rather than silently assumed.

## Phase 2 — source foundation and tooling

Deliverables:

- New `src/app`, `src/domain`, `src/application`, `src/infrastructure`, `src/ui`,
  and `src/shared` boundaries.
- Dependency-free Result, error, identifier, and time primitives.
- Clock and identifier-generator application ports.
- A strict TypeScript configuration for the new source tree.
- Unit test, lint, and formatting commands.
- Automated import restrictions for the new layers.

Scope check: `npm run check` passes. The new tree does not import the legacy tree. No
phase 3 domain behavior is implemented.

## Phase 3 — domain

Scope check: domain behavior and invariants pass isolated unit tests with no browser or
infrastructure dependency.

Status: complete. The project model, stages, glossary matching, tones, modifier
validation, structure parsing, deterministic masking, translation guidance, and
filter parsing/evaluation are implemented under `src/domain`.

## Phase 4 — application

Scope check: commands and queries pass with fake ports, including cancellation and
concurrency behavior.

Status: complete. Project I/O, translation, bounded bulk execution, cancellation,
manual/group editing, filtering, settings, credentials, and the observable
project session are implemented against ports under `src/application`.

## Phase 5 — infrastructure

Scope check: provider, codec, browser, clock, and identifier adapters pass their
contracts.

Status: complete. OpenAI, Gemini, and Anthropic HTTP adapters normalize
credentials, cancellation, timeouts, HTTP failures, and response text behind a
single provider port. Localization YML, versioned progress JSON, ParaTranz JSON,
and glossary JSON codecs validate external payloads and produce domain values.
Browser file reading/download plus system clock and cryptographic ID adapters
are implemented under `src/infrastructure`.

Durable settings and credential persistence is intentionally not implemented in
this phase. Its schema, encryption, atomic conversion, and legacy settings
reader form one indivisible Phase 6 storage boundary.

## Phase 6 — storage v2 and conversion

Scope check: every required migration fixture passes and failure cannot
overwrite active or legacy data.

Status: complete. Versioned settings documents and per-provider credential
envelopes are stored in the new IndexedDB boundary. Credentials use explicit
AES-GCM/PBKDF2 metadata and are readable only while unlocked. Legacy browser
settings, column widths, salt, and encrypted provider keys are normalized
through staged verification followed by an atomic active commit. Legacy sources
are never deleted. Repeated, interrupted, invalid, incomplete, and existing-v2
cases are covered by tests.
An explicit recovery export preserves the untouched legacy snapshot without
decrypting credentials.

## Phase 7 — UI foundation

Scope check: the shell and accessible primitives consume application-facing contracts
without direct infrastructure access.

Status: complete. The React shell, semantic light/dark design tokens,
responsive layout utilities, accessible controls, dialog, tabs, toast, progress,
and data-grid primitives live under `src/ui/foundation`. Token values are
were finalized in Phase 10; feature components do not embed visual constants.

## Phase 8 — feature UI

Scope check: all approved capabilities are represented in the new UI.

Status: complete. Import, translation workspace, filters, glossary, tones,
modifiers, provider/model settings, credentials, appearance, export, migration,
help, about, progress, and notifications are represented through UI-facing
models and actions.

## Phase 9 — integration and legacy removal

Scope check: production build and end-to-end flows pass, then the legacy source and
runtime CDN dependencies are removed.

Status: complete. The composition root wires storage v2, encrypted credentials,
provider routing, codecs, browser file I/O, migration, the application controller,
and React. The old runtime source, unused assets, CDN dependencies, and temporary
dual TypeScript setup were removed.

## Phase 10 — final visual design

Scope check: the approved visual language is applied consistently and accessibility,
responsive behavior, and interaction states are verified.

Status: complete. Ink & Signal semantic tokens define light/dark color roles,
typography, density, controls, status, focus, dialogs, tables, responsive
breakpoints, reduced motion, and increased contrast. Browser QA covers every
feature tab, semantic naming, desktop layout, and the compact breakpoint.
