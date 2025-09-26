# @actkit/server

## 0.0.2

### Patch Changes

- patch: v0.0.2
- Updated dependencies
  - @actkit/core@0.0.2

## 0.0.1

### Patch Changes

- Added **server-only action helper**: `defineAction(name, zodSchema, handler)` in `@actkit/server`.
  - Zod-only: `S extends z.ZodType`.
  - Types: handler gets `z.output<S>`, caller passes `z.input<S>`.

- Added **runtime guards** in `validation.ts`:
  - `assertServerOnly(name)` — throws if evaluated on client.
  - `assertZodSchema(name, schema)` — duck-typing check for `parse/safeParse`.

- Introduced **facade**: `@actkit/next`
  - Server entry: `import { defineAction } from '@actkit/next/server'` (client import throws).
  - React entry: `import { useActionMutation } from '@actkit/next/react'`.

- Wrote **Vitest** coverage for server-only guard, Zod check, parsing/transform, and error propagation.

- **Docs guidance**: Users install and import **only `@actkit/next`** (plus `zod`).
  Future versions will add idempotency, cache invalidation, and retry as options.
