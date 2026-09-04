# AUTOlingua

AUTOlingua is a browser-based localization workspace built around a
UI-independent translation domain. The application is composed from replaceable
application ports, browser infrastructure adapters, and a React UI under `src/`.

## Commands

- `npm run dev` — run the application locally
- `npm run build` — type-check and create the production build
- `npm run typecheck` — type-check the source tree
- `npm run test` — run unit tests once
- `npm run lint` — lint TypeScript and configuration files
- `npm run format:check` — check formatting
- `npm run check` — run all non-building verification

## Rework status

- Phase 1: architecture and specifications — complete
- Phase 2: source foundation and development tooling — complete
- Phase 3: UI-independent domain — complete
- Phase 4: application commands, queries, and ports — complete
- Phase 5: provider, codec, browser, clock, and identifier adapters — complete
- Phase 6: storage v2 and legacy browser-settings conversion — complete
- Phase 7: replaceable UI foundation and semantic design tokens — complete
- Phase 8: feature UI — complete
- Phase 9: runtime integration and legacy removal — complete
- Phase 10: final visual design and verification — complete

See [`docs/rework/README.md`](docs/rework/README.md) for scope and phase gates.
