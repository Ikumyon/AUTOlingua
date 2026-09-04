# Infrastructure contracts

Infrastructure supplies external adapters selected by the app composition root;
UI code never constructs or imports them.

## Translation providers

All providers implement one application port and receive an explicit
`providerId`, model ID, system instruction, user message, and cancellation
signal. API keys come from an unlocked-credential reader and are never part of a
command input or domain object.

- OpenAI uses `POST /v1/responses`, with `instructions`, `input`, and
  `store: false`. Text is collected from response output-text blocks.
- Gemini uses `models.generateContent`, with `systemInstruction`, user content,
  and the `x-goog-api-key` header. Text parts from candidates are concatenated.
- Anthropic uses `POST /v1/messages`, with the top-level system prompt and user
  message. Text content blocks are concatenated.

The browser-only deployment necessarily sends unlocked credentials from the
browser process. Phase 6 encrypts credentials at rest, but cannot protect them
from script executing in an already unlocked page. A future server proxy can
implement the same provider port without changing domain, application, or UI
code.

## Failure policy

The adapters normalize provider-specific failures into `code`, `message`, and
`retryable`. The default timeout is 60 seconds. Caller cancellation is distinct
from timeout. HTTP 408, 429, and 5xx responses, network errors, and timeouts are
retryable. Malformed successful responses and credential failures are not.

## File formats

- `yml`: localization records. Missing translations fall back to source text on
  export. Rejected input lines remain visible in `rejectedRecords`.
- `progress-json`: canonical, versioned AUTOlingua work interchange. It starts
  with `format: "autolingua-progress"` and `schemaVersion: 1`.
- `paratranz-json`: ParaTranz array interchange. Numeric stages are translated at
  the boundary instead of entering the domain.
- Glossary JSON: the canonical output starts with
  `format: "autolingua-glossary"` and `schemaVersion: 1`. The former glossary
  array shape is accepted as a narrowly scoped import convenience.

Progress files are user-selected import/export documents, not browser storage.
The Phase 6 storage schema and the one-time legacy browser-settings conversion
remain separate.
