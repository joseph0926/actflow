# @actflow/core

## 0.2.3

### Patch Changes

- Add comprehensive error handling with built-in mappers for common HTTP errors and simplify package exports for better DX

## 0.2.2

### Patch Changes

- delete "use server" directives

## 0.2.1

### Patch Changes

- delete "use server" directives

## 0.2.0

### Minor Changes

- Bind to React 19 form (unified form rail)

## 0.1.5

### Patch Changes

- Fix the phenomenon in which defineActionWithTags were not exported

## 0.1.4

### Patch Changes

- Implemented precise ctx.tags type inference by threading a generic TTags through defineAction, and added defineActionWithTags—a server-only factory that binds a tag schema (and optional invalidator, defaulting to the built-in createInvalidate)—so actions get full autocompletion and minimal boilerplate.

## 0.1.3

### Patch Changes

- Implemented a minimal Server Actions toolkit: a single defineAction(config, { tags }) API that enforces Zod-validated inputs and wires type-safe tags to server-only cache invalidation via a dynamic next/cache adapter (createInvalidate), with guards and Vitest coverage to verify behavior and module caching.

## 0.1.2

### Patch Changes

- delete: provenance

## 0.1.1

### Patch Changes

- release: v0.1.1

## 0.1.0

### Minor Changes

- release: v0.1.0
