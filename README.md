# ActionFlow

> 한국어 문서는 [`docs/README.ko.md`](docs/README.ko.md) 를 참고하세요.

We aim to make mutation flows **predictable** in **Next.js Server Actions (RSC)** apps.

> In **v0.0.1**, we ship **`actionflow-core` – a strict query-key & tag factory**.

- What we improve
  - A **standard rail** for mutations: _optimistic → server → cache invalidation → reconcile/rollback → retry/dedupe_
  - **One schema** to generate both **server tags** (`revalidateTag`) and **client query keys** (e.g., React Query) to eliminate typos/drift
  - (Next) retries / outbox / cross-tab sync / devtools

---

## Packages (current)

- `actionflow-core` — **Strict query-key & tag factory**
  - Key shape: `readonly [namespace: string, ...atoms]`
  - **Atoms only**: `string | number | boolean` (no objects/arrays)
  - `boolean` normalized to `1/0` for keys and `"1"/"0"` for tags

> Upcoming: `actionflow-server`, `actionflow-react`, `actionflow-adapter-react-query`.

---

## Install

```bash
pnpm add actionflow-core
# or npm i actionflow-core
```

---

## Quick Start

### 1) Define schema

```ts
// lib/keys.ts
import { defineKeyFactory } from 'actionflow-core';

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

### 2) Tag RSC data

```ts
// server/queries.ts
import { unstable_cache as cache } from 'next/cache';
import { t } from '@/lib/keys';
import { listPosts } from '@/server/db';

export const getPosts = cache(() => listPosts(), ['posts.list'], {
  tags: [t.posts()],
});
```

### 3) Invalidate in Server Action

```ts
// app/actions/posts.ts
'use server';

import { revalidateTag } from 'next/cache';
import { t } from '@/lib/keys';
import { createPost } from '@/server/db';

export async function createPostAction(input: { title: string; body: string }) {
  const row = await createPost(input);
  revalidateTag(t.posts());
  return row;
}
```

### 4) (Optional) Use the same keys with React Query

```ts
queryClient.invalidateQueries({ queryKey: qk.posts() });
useQuery({ queryKey: qk.post({ id }), queryFn: fetchPost });
```

---

## Policy (Key Design)

- **Atoms only**: `string | number | boolean`
- **Booleans**: `1/0` in keys, `"1"/"0"` in tags
- **Fixed order**: respects `params` order
- **Family invalidation**: use list/family keys like `['posts']`

---

## Requirements

- Node ≥ 22.19
- TypeScript ≥ 5.9

---

## License

MIT
