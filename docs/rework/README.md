# AUTOlingua rework

This directory is the source of truth for the rework. The objective is a clean
replacement, not compatibility with the internal structure, DOM contract, CSS
classes, or runtime storage schema of the current application.

The application is allowed to be incomplete or temporarily non-runnable between
phases. A phase boundary means that its owned design or implementation is
complete and independently verifiable; it does not mean that the complete
product must start.

## Fixed decisions

- The DOM is never the canonical project state.
- Domain code has no browser, network, persistence, or UI dependencies.
- Application use cases depend on ports; infrastructure implements those ports.
- UI is an replaceable shell over application commands and queries.
- Runtime compatibility with the old browser schema is not maintained.
- A dedicated, one-time importer converts legacy browser settings to the new
  schema without deleting the source automatically.
- The final visual language is designed only after the UI foundation exists.
- Existing behavior is retained only when it is listed as a product capability
  or explicitly accepted by a later specification. Incidental legacy behavior
  is not a contract.

## Documents

- [Functional inventory](functional-inventory.md)
- [Architecture and dependency rules](architecture.md)
- [Target data model](data-model.md)
- [Storage v2 and legacy conversion](storage-migration.md)
- [UI shell and design-language foundation](ui-foundation.md)
- [Infrastructure contracts](infrastructure-contracts.md)
- [Phases and completion gates](phases.md)
