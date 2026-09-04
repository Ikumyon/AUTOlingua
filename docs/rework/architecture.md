# Architecture

## Layers

```text
UI ───────────────┐
                  v
Application ───> Domain
     ^            ^
     │            │
Infrastructure ───┘

App/composition root wires UI, application, and infrastructure together.
Shared contains dependency-free primitives only.
```

### `src/domain`

Owns translation projects, entries, stages, glossary rules, tones, modifiers,
filter expressions, masking, restoration, and prompt inputs. It must be usable
in a JavaScript runtime without DOM, storage, or network globals.

Allowed dependencies: `src/shared` and modules inside `src/domain`.

### `src/application`

Owns commands, queries, orchestration, cancellation, concurrency, and boundary
ports. It operates on domain values and expresses required external behavior as
interfaces.

Allowed dependencies: `src/domain`, `src/shared`, and modules inside
`src/application`.

### `src/infrastructure`

Owns IndexedDB, Web Crypto, browser file APIs, downloads, provider HTTP clients,
and concrete file codecs. It implements application ports and may translate
external data into domain values.

Allowed dependencies: `src/application`, `src/domain`, `src/shared`, and modules
inside `src/infrastructure`.

### `src/ui`

Owns rendering, interaction state, accessibility, design tokens, reusable
components, and feature views. It sends commands and reads query results; it
does not call storage, Web Crypto, provider APIs, or file codecs directly.

Allowed dependencies: `src/application`, `src/domain` value types,
`src/shared`, and modules inside `src/ui`.

### `src/app`

Owns startup and composition only. It is the only layer allowed to construct
concrete adapters and connect them to use cases and UI.

## Mandatory rules

1. DOM nodes and HTML strings cannot appear in domain or application APIs.
2. Domain entities are the canonical state; rendered rows are projections.
3. No exported mutable singleton managers.
4. Feature modules own their types; there is no global catch-all `types.ts`.
5. External payloads are `unknown` until validated at their boundary.
6. Provider selection is explicit metadata, never inferred from a model-name
   prefix.
7. Errors cross boundaries as typed application errors, not localized UI text.
8. Infrastructure adapters cannot display dialogs or notifications.
9. UI components cannot read or write browser storage directly.
10. Imports must follow the layer direction. Temporary legacy imports are not
    allowed under `src/`.

## Composition

The composition root constructs repositories, credential storage, file codecs,
provider clients, and the application controller. Tests replace these boundaries
with fakes. No service locator or global registry is introduced.

## Legacy boundary

The old `script.ts`, `style.css`, `js/`, and unused image assets were removed
after integration. The only retained legacy knowledge is the isolated,
read-only browser-settings source under
`src/infrastructure/persistence/migration`; it exists solely to convert stored
settings to storage v2 and never becomes an application dependency.
