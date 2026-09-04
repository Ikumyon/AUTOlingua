# UI shell and design-language foundation

The UI is a shell over application capabilities. Phase 7 established the React
foundation, Phase 8 added feature views, Phase 9 mounted them through the
composition root, and Phase 10 applied the final visual language.

## Shell responsibilities

- Bootstrap application commands and query subscriptions supplied by the app
  composition root.
- Choose feature views and application-level layout.
- Coordinate focus, navigation, dialogs, notifications, and error presentation.
- Provide theme tokens and accessibility defaults.

The shell does not own translation rules, persistence, codecs, credentials, or
provider communication.

## Feature boundaries

- Project import
- Translation workspace
- Filters
- Settings and credentials
- Glossary
- Tones
- Modifiers
- Export
- Legacy-settings migration

Features communicate through application commands and query models, not by
locating or mutating another feature's DOM.

## Design language contract

Visual values are expressed through semantic tokens:

- color: surfaces, text, border, accent, success, warning, danger, focus
- typography: family, size, weight, line height
- space and sizing
- radius and border width
- elevation and overlay
- motion duration and easing
- layer order

Feature views cannot introduce arbitrary colors, shadows, radii, or animation
timings. Light and dark modes replace token values without changing component
semantics.

## Primitive components

The later UI foundation will own Button, IconButton, Field, Input, Textarea,
Select, Checkbox, Dialog, Tabs, Menu, Toast, Tooltip, Progress, and data-grid
primitives. Each primitive defines keyboard behavior, focus appearance,
disabled/loading/error states, and accessible names.

## Implemented foundation

- A compact header and tabbed feature shell that collapses to one column.
- Semantic light/dark tokens for every visual value used by components.
- Native-control-based keyboard behavior plus arrow-key tab navigation, visible
  focus, reduced-motion handling, dialog dismissal, and live toast regions.
- Project input, translation grid, filters, editable libraries, settings,
  credentials, exports, migration, help, and about feature views.

No component imports infrastructure. IDs, persistence, codecs, provider calls,
and migrations enter through UI action contracts.

## Final visual language: Ink & Signal

The product uses deep ink surfaces with a restrained cyan-to-violet signal
accent, compact editorial typography, softly elevated panels, and rounded
control geometry. Light, dark, and system themes share the same semantic token
roles. Density, opacity, blur, focus, status, motion, and responsive behavior are
defined centrally, so later UI redesigns do not reach into business logic.
