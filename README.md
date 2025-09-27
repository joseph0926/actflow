# actflow

> 한국어 버전: [`docs/README.ko.md`](docs/README.ko.md)

Make mutation flows **predictable** in **Next.js Server Actions (RSC)** apps.

- Standard rail: _optimistic → server → cache invalidation → reconcile/rollback → retry/dedupe_
- One schema for **server tags** (`revalidateTag`) and **client query keys** (e.g. React Query)
- Today: **server-only actions (`defineAction`, `defineActionWithTags`) + type-safe tags + Next cache invalidation**
- Next: retries, outbox, cross-tab sync, devtools

---

## Why actflow?

- **Predictable mutations**: One way in/out for actions; cache invalidation is explicit and type-safe.
- **Type-safe tags/keys**: A single schema emits both **server tags** and **client query keys**—no drift.
- **DX & safety**: `defineActionWithTags` binds tags once (less boilerplate, full autocompletion for `ctx.tags`), while invalidation uses a guarded, dynamic `next/cache` adapter (client imports fail fast).

---

## Packages

- **`@actflow/next`** — Facade for apps
  - `@actflow/next/server`: re-exports `defineAction`, `defineActionWithTags`, `createInvalidate` (client import throws)
  - `@actflow/next/core`: re-exports `defineKeyFactory`

- **`@actflow/server`** — Core server utilities (`defineAction`, `defineActionWithTags`, `createInvalidate`)
- **`@actflow/core`** — Strict key/tag factory (one schema → `tags.*()` + `keys.*()`)

> Optional/coming: `@actflow/react`, `@actflow/adapter-react-query`, `@actflow/devtools`.

---

## Install

```bash
pnpm add @actflow/next zod
# or: npm i @actflow/next zod
```

**Requires:** Node ≥ 22, TypeScript ≥ 5.9, Next.js ≥ 15 (for facade), Zod.

---

## Quick Start

### 1) Define tags/keys once

```ts
// lib/keys.ts
import { defineKeyFactory } from '@actflow/next/core';

export const { tags: t, keys: qk } = defineKeyFactory({
  posts: { key: 'posts' },
  post: { key: 'post', params: ['id'] as const },
} as const);
// t.posts() -> 'posts', t.post({ id: 1 }) -> 'post:1'
// qk.posts() -> ['posts'], qk.post({ id: 1 }) -> ['post', 1]
```

### 2) Write Server Actions (server-only)

#### Preferred: bind tags once (best DX)

```ts
// app/actions/posts.ts
'use server';

import { defineActionWithTags } from '@actflow/next/server';
import { z } from 'zod';
import { t } from '@/lib/keys';
import { db } from '@/server/db';

const act = defineActionWithTags({ tags: t }); // binds tags; ctx.tags is fully typed

export const createPost = act({
  name: 'post.create',
  input: z.object({ title: z.string().min(1), body: z.string().min(1) }),
  handler: async ({ input, ctx }) => {
    const row = await db.post.create({ data: input });
    // type-safe, server-only invalidation (Next revalidateTag under the hood)
    await ctx.invalidate([ctx.tags.posts(), ctx.tags.post({ id: row.id })]);
    return row;
  },
});

// (optional) Per-action invalidate override:
// export const removePost = act({ ... }, { invalidate: customInvalidate });
```

#### Low-level: pass tags per action

```ts
import { defineAction } from '@actflow/next/server';

export const deletePost = defineAction(
  {
    name: 'post.delete',
    input: z.object({ id: z.string().uuid() }),
    handler: async ({ input, ctx }) => {
      await db.post.delete({ where: { id: input.id } });
      await ctx.invalidate([ctx.tags.posts()]);
      return { ok: true };
    },
  },
  { tags: t }, // invalidate can be injected here too
);
```

### 3) Use tags in RSC fetch

```ts
// app/(feed)/page.tsx (RSC)
import { unstable_cache as cache } from 'next/cache';
import { t } from '@/lib/keys';
import { listPosts } from '@/server/db';

const getPosts = cache(listPosts, ['posts:list'], { tags: [t.posts()] });

export default async function Page() {
  const posts = await getPosts();
  // ...
}
```

---

## API (snapshot)

### `defineAction(config, { tags, invalidate? })`

```ts
type TagFns = Record<string, (...args: any[]) => string>;
type InvalidateFn = (tags: readonly string[]) => Promise<void>;

defineAction<S extends z.ZodType, Out, T extends TagFns>(
  config: {
    name: string;
    input: S; // Zod schema (required)
    handler: (args: { input: z.output<S>; ctx: { tags: T; invalidate: InvalidateFn } }) => Promise<Out>;
  },
  opts: {
    tags: T;                    // required: your type-safe tag functions
    invalidate?: InvalidateFn;  // optional: custom invalidation (defaults to Next revalidateTag)
  }
): (payload: z.input<S>) => Promise<Out>;
```

- **Server-only**: importing/running on the client throws a clear error.
- **Types flow**: caller passes `z.input<S>`, handler receives `z.output<S>`.
- **`ctx.tags` inference**: `T` flows through so `ctx.tags.post({ id })` is fully typed.

### `defineActionWithTags({ tags, invalidate? })`

```ts
defineActionWithTags<T extends TagFns>(base: {
  tags: T;
  invalidate?: InvalidateFn;
}): <S extends z.ZodType, Out>(config: {
  name: string;
  input: S;
  handler: (args: { input: z.output<S>; ctx: { tags: T; invalidate: InvalidateFn } }) => Promise<Out>;
}, local?: { invalidate?: InvalidateFn }) => (payload: z.input<S>) => Promise<Out>;
```

- **Bind once, use many**: injects `tags` into all actions; `ctx.tags` has full autocompletion.
- **Per-action override**: optionally pass `{ invalidate }` to override the base invalidator.
- **Fallback**: if no invalidator is provided, a built-in Next adapter (`createInvalidate`) is used.

### `createInvalidate(): InvalidateFn`

- Default **Next adapter**. Dynamically imports `next/cache` at runtime (server only).
- If `next/cache` is unavailable, throws a helpful message.
- Useful when you want to plug a custom invalidation strategy in tests or non-Next runtimes.

### `defineKeyFactory(schema)`

- Returns `{ tags, keys }` from one schema.
- `tags.*()` → server invalidation strings.
- `keys.*()` → client query keys (e.g., React Query).

---

## Guarantees & Safety

- **No app state ownership**: actflow never owns DB/session. You inject only `tags` (and optionally `invalidate`).
- **Server-only guard**: invalidation is gated; client use fails fast.
- **Drift-free**: keys/tags originate from one schema; fewer typos, fewer mismatches.

---

## FAQ

- **Does actflow ship a cache?** No. It standardizes _mutation flow_; keep using your existing cache (RSC tags, React Query, etc.).
- **Do I need React Query?** No. Adapters are optional.
- **How do I customize invalidation?** Inject `invalidate` in `defineAction(...)` or per-action via `defineActionWithTags(..., { invalidate })`.
- **Where are retries/outbox?** On the roadmap; current focus is a solid server action rail and tag safety.

---

## License

MIT
