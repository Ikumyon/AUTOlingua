# UI

The replaceable application shell, feature views, primitives, and design tokens
live here. UI calls application APIs and never accesses infrastructure directly.

- `foundation` owns semantic tokens and accessible primitives.
- `features` owns drafts and projections for one feature boundary.
- `auto-lingua-ui.tsx` composes features without constructing infrastructure.

The app layer supplies composition and mounting. The Ink & Signal visual
language remains replaceable through tokens and shell composition without
changing feature logic.
