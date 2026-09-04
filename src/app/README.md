# App

Startup and dependency composition live here. This layer may construct concrete
infrastructure adapters; it must not contain product rules.

- `composition-root.ts` constructs infrastructure and application services.
- `application-controller.ts` adapts commands and observable state to UI actions.
- `application-root.tsx` applies runtime appearance and renders the UI.
- `main.tsx` is the single browser entry point.
