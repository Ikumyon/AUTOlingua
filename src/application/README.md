# Application

Use cases, commands, queries, orchestration, and external-service ports live
here. This layer depends only on domain and shared code.

## Current commands and queries

- Import and export a translation project through codec ports.
- Translate one entry or one compatible structure group.
- Run bounded concurrent bulk translation with cooperative cancellation.
- Apply single-entry and structure-aware group edits.
- Parse and evaluate project filters.
- Load and update validated settings through a repository port.
- Check, save, unlock, lock, and delete credentials through a vault port.
- Expose an observable in-memory project session without global singletons.
