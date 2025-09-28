# actflow

> 한국어 버전: [`docs/README.ko.md`](docs/README.ko.md)

Make mutation flows **predictable** in **Next.js Server Actions (RSC)** apps.

- Standard rail: _optimistic → server → cache invalidation → reconcile/rollback → retry/dedupe_
- One schema for **server tags** (`revalidateTag`) and **client query keys** (e.g. React Query)
- Today: **server-only actions (`defineAction`, `defineActionWithTags`) + type-safe tags + Next cache invalidation + React 19 form binding (`bindFormAction`)**
- Next: retries, outbox, cross-tab sync, devtools

---

## Why actflow?

- **Predictable mutations**: One path in/out for actions; cache invalidation is explicit and type-safe.
- **Type-safe tags/keys**: A single schema emits both **server tags** and **client query keys**—no drift.
- **Unified form rail (React 19)**: Use `<form action>` + `useActionState`/`useFormStatus` with a tiny binder that maps Zod validation errors to field errors.
- **DX & safety**: `defineActionWithTags` binds tags once (less boilerplate, full autocompletion for `ctx.tags`), while invalidation uses a guarded, dynamic `next/cache` adapter (client imports fail fast).

---

## Packages

- **`@actflow/next`** — Facade for apps
  - `@actflow/next/server`: re-exports `defineAction`, `defineActionWithTags`, `createInvalidate` (client import throws)
  - `@actflow/next/core`: re-exports `defineKeyFactory`

- **`@actflow/server`** — Core server utilities
  - `defineAction`, `defineActionWithTags`, `createInvalidate`
  - **`bindFormAction`** (React 19 form binder) + `FormState` types

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
    await ctx.invalidate([ctx.tags.posts(), ctx.tags.post({ id: row.id })]); // Next revalidateTag under the hood
    return row;
  },
});
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
  { tags: t }, // optional override: { invalidate: customInvalidate }
);
```

### 3) Bind to React 19 form (unified form rail)

```ts
// app/actions/posts.ts (server)
'use server';
import { bindFormAction } from '@actflow/server';
import { createPost } from './posts';

export const createPostForm = bindFormAction(createPost, {
  fromForm: (fd) => ({
    title: String(fd.get('title') ?? ''),
    body: String(fd.get('body') ?? ''),
  }),
  toSuccessState: () => ({ ok: true, message: 'Created!' }), // optional
});
```

```tsx
// app/(feed)/NewPostForm.tsx (client)
'use client';
import { useActionState, useFormStatus } from 'react';
import { createPostForm } from '@/app/actions/posts';

export default function NewPostForm() {
  const [state, formAction] = useActionState(createPostForm, { ok: true } as const);
  const { pending } = useFormStatus();

  return (
    <form action={formAction}>
      <input name="title" placeholder="Title" aria-invalid={!!state.fieldErrors?.title} />
      {state.fieldErrors?.title && <small>{state.fieldErrors.title}</small>}

      <textarea name="body" placeholder="Body" aria-invalid={!!state.fieldErrors?.body} />
      {state.fieldErrors?.body && <small>{state.fieldErrors.body}</small>}

      <button disabled={pending}>{pending ? 'Posting…' : 'Post'}</button>
      {state.formError && <p role="alert">{state.formError}</p>}
      {'message' in state && state.message && <p>{state.message}</p>}
    </form>
  );
}
```

- Zod validation errors are **auto-mapped to `fieldErrors`**.
- Non-Zod errors are thrown (use your error boundary). Auth/conflict mapping can be added later.

### 4) Use tags in RSC fetch (drift-free)

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

### `createInvalidate(): InvalidateFn`

- Default **Next adapter**. Dynamically imports `next/cache` at runtime (server only).
- If `next/cache` is unavailable, throws a helpful message.

### `defineKeyFactory(schema)`

- `{ tags, keys }` from one schema (`tags.*()` for server invalidation; `keys.*()` for client caches).

### `bindFormAction(action, { fromForm, toSuccessState? })`

- Wrap a server action into a **React 19 form action** compatible with both `<form action={fn}>` and `useActionState`.
- **Maps `ZodError` to `{ ok:false, fieldErrors }`**; other errors are thrown (can be mapped later via an option).

### Types

- `FormState<F = string> = { ok:true; message? } | { ok:false; formError?; fieldErrors?: Partial<Record<F,string>> }`
- `FormAction` (overloaded): `(fd) => Promise<FormState>` **or** `(prevState, fd) => Promise<FormState>`

---

## Guarantees & Safety

- **No app state ownership**: actflow never owns DB/session. You inject only `tags` (and optionally `invalidate`).
- **Server-only guard**: invalidation and action helpers are gated; client use fails fast.
- **Drift-free**: keys/tags originate from one schema; fewer typos, fewer mismatches.
- **React 19–first**: we standardize the **form rail**; non-form mutation hooks remain optional.

---

## FAQ

- **Does actflow ship a cache?** No. It standardizes _mutation flow_; keep using your existing cache (RSC tags, React Query, etc.).
- **Do I need React Query?** No. Adapters are optional.
- **How do I customize invalidation?** Inject `invalidate` in `defineAction(...)` or per-action via `defineActionWithTags(..., { invalidate })`.
- **Where are retries/outbox?** On the roadmap; current focus is a solid server action rail, tag safety, and form rail.

---

## License

MIT
