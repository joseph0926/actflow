# actkit

Make mutation flows **predictable** in **Next.js Server Actions (RSC)** apps.

- Standard rail: _optimistic → server → cache invalidation → reconcile/rollback → retry/dedupe_
- One schema for **server tags** (`revalidateTag`) and **client query keys** (e.g. React Query)
- Coming next: retries, outbox, cross-tab sync, devtools

---

## What’s in v0.0.1

- **`@actkit/server`** — `defineAction(name, zodSchema, handler)` (server-only)
  - Zod-only (typed at compile time, checked at runtime)
  - Handler receives `z.output<S>`, caller passes `z.input<S>`

- **`@actkit/next`** — Facade for apps
  - `@actkit/next/server` re-exports `defineAction` (client import throws)
  - `@actkit/next/react` re-exports client hooks (placeholder for now)

- **`@actkit/core`** — strict query-key & tag factory (keys/tags from one schema)

> Packages present in repo: `@actkit/next`, `@actkit/server`, `@actkit/core`, `@actkit/react`, `@actkit/adapter-react-query` (adapter optional).

---

## Install

```bash
pnpm add @actkit/next zod
# or: npm i @actkit/next zod
```

> Library authors can also install `@actkit/server` / `@actkit/core` directly, but apps should prefer the `@actkit/next` facade.

---

## Quick Start

### 1) Server Action (Zod-only)

```ts
// app/actions/posts.ts
'use server';

import { defineAction } from '@actkit/next/server';
import { z } from 'zod';
import { createPost } from '@/server/db';

export const createPostAction = defineAction(
  'post.create',
  z.object({ title: z.string().min(1), body: z.string().min(1) }),
  async ({ input }) => {
    const row = await createPost(input);
    // cache invalidation will be added as an option in future versions
    return row;
  },
);
```

- **Why `name`?** Stable ID for logging, tracing, idempotency namespace, and DevTools.

### 2) (Optional) Keys & Tags from one schema

```ts
// lib/keys.ts
import { defineKeyFactory } from '@actkit/core';

export const { tags: t, keys: qk } = defineKeyFactory({
  posts: { key: 'posts' },
  post: { key: 'post', params: ['id'] as const },
} as const);

// Examples
t.posts(); // 'posts'
t.post({ id: 1 }); // 'post:1'
qk.posts(); // ['posts']
qk.post({ id: 1 }); // ['post', 1]
```

Use `t.*()` with RSC caching/tagging, and `qk.*()` with client caches (e.g., React Query).

---

## API (snapshot)

### `defineAction(name, zodSchema, handler)`

- **Server-only**; importing from client throws an error.
- Zod is **required**:
  - Compile time: `S extends z.ZodType`
  - Runtime: `parse/safeParse` duck-typing check

- Types flow:
  - caller param → `z.input<S>`
  - handler `input` → `z.output<S>`

---

## Requirements

- Node ≥ **22.19**
- TypeScript ≥ **5.9**
- Next.js ≥ **15** (for facade `@actkit/next`)
- Zod ≥ **4** (peer dep)

---

## Roadmap

- `defineAction` options: **idempotency**, **cache invalidation** (tags/paths), **retry/backoff**
- Outbox (IndexedDB), cross-tab sync (BroadcastChannel)
- DevTools timeline
- React Query adapter refinements

---

## License

MIT
