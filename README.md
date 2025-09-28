# actflow

> 한국어 버전: [`docs/README.ko.md`](docs/README.ko.md)

Make mutation flows **predictable** in **Next.js Server Actions (RSC)** apps.

- Standard rail: _optimistic → server → cache invalidation → reconcile/rollback → retry/dedupe_
- One schema for **server tags** (`revalidateTag`) and **client query keys** (e.g. React Query)
- **Form-first with error handling**: React 19 forms + automatic error mapping (auth/validation/conflict)
- **Type-safe tags**: No more string drift between server and client
- Next: retries, outbox, cross-tab sync, devtools

---

## Why actflow?

- **Predictable mutations**: One path in/out for actions; cache invalidation is explicit and type-safe.
- **Type-safe tags/keys**: A single schema emits both **server tags** and **client query keys**—no drift.
- **Unified form rail (React 19)**: Use `<form action>` + `useActionState`/`useFormStatus` with automatic Zod validation mapping and customizable error handling.
- **Production-ready error handling**: Built-in mappers for common HTTP errors (401/403/404/409/429) with sensible defaults.
- **DX & safety**: `defineActionWithTags` binds tags once (less boilerplate, full autocompletion for `ctx.tags`), while invalidation uses a guarded, dynamic `next/cache` adapter (client imports fail fast).

---

## Packages

- **`@actflow/next`** — All-in-one Next.js integration
- **`@actflow/server`** — Core server utilities (actions, forms, error handling)
- **`@actflow/core`** — Strict key/tag factory

> Optional/coming: `@actflow/react`, `@actflow/adapter-react-query`, `@actflow/devtools`.

---

## Install

```bash
pnpm add @actflow/next zod
# or: npm i @actflow/next zod
```

**Requires:** Next.js ≥ 14, React ≥ 18.2, Zod ≥ 3.22

---

## Quick Start

### 1) Define tags/keys once

```ts
// lib/keys.ts
import { defineKeyFactory } from '@actflow/next';

export const { tags: t, keys: qk } = defineKeyFactory({
  posts: { key: 'posts' },
  post: { key: 'post', params: ['id'] as const },
} as const);
// t.posts() -> 'posts', t.post({ id: 1 }) -> 'post:1'
// qk.posts() -> ['posts'], qk.post({ id: 1 }) -> ['post', 1]
```

### 2) Write Server Actions

```ts
// app/actions/posts.ts
'use server';

import { defineActionWithTags } from '@actflow/next';
import { z } from 'zod';
import { t } from '@/lib/keys';
import { db } from '@/server/db';

const act = defineActionWithTags({ tags: t });

export const createPost = act({
  name: 'post.create',
  input: z.object({ title: z.string().min(1), body: z.string().min(1) }),
  handler: async ({ input, ctx }) => {
    const row = await db.post.create({ data: input });
    await ctx.invalidate([ctx.tags.posts(), ctx.tags.post({ id: row.id })]);
    return row;
  },
});

export const deletePost = act({
  name: 'post.delete',
  input: z.object({ id: z.string().uuid() }),
  handler: async ({ input, ctx }) => {
    // This might throw 404 or 403
    const post = await db.post.findUniqueOrThrow({ where: { id: input.id } });

    if (post.authorId !== ctx.userId) {
      throw { status: 403 }; // Will be mapped by error handlers
    }

    await db.post.delete({ where: { id: input.id } });
    await ctx.invalidate([ctx.tags.posts()]);
    return { ok: true };
  },
});
```

### 3) Forms with Error Handling

```ts
// app/actions/posts.ts (continued)
'use server';
import {
  bindFormAction,
  createAuthErrorMapper,
  createNotFoundErrorMapper,
  combineErrorMappers,
} from '@actflow/next';

// Create a combined error mapper for your forms
const formErrorMapper = combineErrorMappers(
  createAuthErrorMapper({
    unauthorized: 'Please sign in to continue',
    forbidden: 'You do not have permission',
  }),
  createNotFoundErrorMapper({
    message: 'Post not found',
  }),
);

export const createPostForm = bindFormAction(createPost, {
  fromForm: (fd) => ({
    title: String(fd.get('title') ?? ''),
    body: String(fd.get('body') ?? ''),
  }),
  mapError: formErrorMapper,
  unmappedErrorStrategy: 'generic',
  genericErrorMessage: 'Something went wrong. Please try again.',
});

export const deletePostForm = bindFormAction(deletePost, {
  fromForm: (fd) => ({
    id: String(fd.get('id') ?? ''),
  }),
  mapError: formErrorMapper,
});
```

### 4) React Component with Error States

```tsx
// app/(feed)/PostForm.tsx
'use client';
import { useActionState } from 'react';
import { createPostForm } from '@/app/actions/posts';

export default function PostForm() {
  const [state, formAction] = useActionState(createPostForm, { ok: true });

  // Handle different error reasons
  if (!state.ok && state.reason === 'AUTH') {
    return <div>Please sign in to create posts.</div>;
  }

  return (
    <form action={formAction}>
      <input name="title" placeholder="Title" aria-invalid={!!state.fieldErrors?.title} />
      {state.fieldErrors?.title && <span className="error">{state.fieldErrors.title}</span>}

      <textarea name="body" placeholder="Body" aria-invalid={!!state.fieldErrors?.body} />
      {state.fieldErrors?.body && <span className="error">{state.fieldErrors.body}</span>}

      <button type="submit">Create Post</button>

      {!state.ok && state.formError && (
        <div className="error" role="alert">
          {state.formError}
        </div>
      )}

      {state.ok && state.message && <div className="success">{state.message}</div>}
    </form>
  );
}
```

### 5) Use tags in RSC fetch

```ts
// app/(feed)/page.tsx
import { unstable_cache as cache } from 'next/cache';
import { t } from '@/lib/keys';

const getPosts = cache(
  async () => db.post.findMany(),
  ['posts:list'],
  { tags: [t.posts()] }
);

export default async function Page() {
  const posts = await getPosts();
  return <PostList posts={posts} />;
}
```

---

## Error Handling

actflow provides built-in error mappers for common scenarios:

### Available Error Mappers

```ts
import {
  createAuthErrorMapper, // 401/403
  createValidationErrorMapper, // 400 (non-Zod)
  createNotFoundErrorMapper, // 404
  createConflictErrorMapper, // 409
  createRateLimitErrorMapper, // 429
  createDefaultErrorMappers, // All combined
  ERROR_REASONS, // Type-safe reason constants
} from '@actflow/next';
```

### Custom Error Mapping

```ts
// Create custom mapper for your domain errors
const customMapper = (error: unknown): FormState | null => {
  if (error instanceof PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return {
        ok: false,
        reason: 'CONFLICT',
        formError: 'This already exists',
      };
    }
  }
  return null;
};

// Combine with built-in mappers
const appErrorMapper = combineErrorMappers(customMapper, createDefaultErrorMappers());

// Use in forms
export const myForm = bindFormAction(myAction, {
  fromForm: (fd) => ({
    /* ... */
  }),
  mapError: appErrorMapper,
  unmappedErrorStrategy: 'generic', // or 'throw'
});
```

### Error Reasons

Form state includes typed `reason` field for error categorization:

```ts
type FormState<F = string> =
  | { ok: true; message?: string }
  | {
      ok: false;
      reason?: 'AUTH' | 'VALIDATION' | 'NOT_FOUND' | 'CONFLICT' | 'RATE_LIMIT' | string;
      formError?: string;
      fieldErrors?: Partial<Record<F, string>>;
    };
```

---

## API Reference

### Core Functions

- `defineAction(config, { tags, invalidate? })` - Define a server action
- `defineActionWithTags({ tags })` - Create action factory with bound tags
- `bindFormAction(action, config)` - Wrap action for React 19 forms
- `defineKeyFactory(schema)` - Create typed tags/keys from one schema

### Error Handling

- `createAuthErrorMapper(options?)` - Map 401/403 errors
- `createValidationErrorMapper(options?)` - Map 400/validation errors
- `createNotFoundErrorMapper(options?)` - Map 404 errors
- `createConflictErrorMapper(options?)` - Map 409 errors
- `createRateLimitErrorMapper(options?)` - Map 429 errors
- `createDefaultErrorMappers(options?)` - All mappers combined
- `combineErrorMappers(...mappers)` - Chain multiple mappers

### Types

- `FormState<F>` - Form submission result type
- `FormAction<F>` - React 19 form action signature
- `ErrorMapper<F>` - Error mapping function type
- `ERROR_REASONS` - Constants for error reasons

---

## Migration from v0.2

No breaking changes in the public API

- Error handling system with built-in mappers
- Simplified imports (no more subpaths needed)
- `reason` field in FormState for error categorization

---

## License

MIT
