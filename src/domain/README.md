# Domain

Pure product rules live here. Allowed dependencies are this directory and
`src/shared`. Browser and UI APIs are forbidden.

## Modules

- `project` — canonical project, entry, operation, and stage state
- `modifier` — masking-rule definitions and validation
- `masking` — structure parsing, grouping, token validation, and restoration
- `glossary` — source-term matching
- `tone` — standard and conditional instruction resolution
- `translation` — provider-neutral translation guidance
- `filtering` — typed filter expressions, query parsing, and evaluation
