# @actkit/core

## 0.0.2

### Patch Changes

- patch: v0.0.2

## 0.0.1

### Patch Changes

- Added **strict query-key & tag factory**: `defineKeyFactory(schema)` in `@actkit/core`.
  - One schema → **server tags** (`t.*()`) and **client query keys** (`qk.*()`).
  - **Atoms-only**: `string | number | boolean` (objects/arrays rejected at runtime).
  - **Boolean normalization**: keys use `1/0`, tags use `"1"/"0"`.
  - **Fixed param order**; per-resource `separator` support (default `:`).
  - **Typed returns**: `tags.foo(...) → string`, `keys.foo(...) → readonly [string, ...]`.

- Wrote **Vitest** coverage in `key-factory.test.ts`:
  - Base shapes (tags/keys), boolean normalization, param order, and non-atom rejection.

- **Docs guidance**:
  - Use `t.*()` with Next RSC caching/tagging (`revalidateTag`).
  - Use `qk.*()` with client caches (e.g., React Query `invalidateQueries`, `useQuery`).

- Future work:
  - Optional params, value encoders (sets/records/json/iso), server integration with `defineAction`, Tag schema helpers.
