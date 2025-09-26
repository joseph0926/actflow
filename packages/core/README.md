# @actflow/core

Strict **query-key & tag factory** for **Next.js Server Actions (RSC)**.
Generate **client query keys** (e.g., React Query) and **server cache tags** (`revalidateTag`) **from a single schema** to avoid drift and typos.

- **Atoms only**: `string | number | boolean` (no objects/arrays)
- **Boolean normalization**: keys use `1/0`, tags use `"1"/"0"`
- **Fixed param order**: follows your schema tuple order
- **ESM + types**, tiny footprint

> This package is part of **actflow** (mutation “rail”: optimistic → server → cache invalidation → reconcile/rollback → retry/dedupe).
> In v0.0.1, only `@actflow/core` is published.

---

## Install

```bash
pnpm add @actflow/core
# or npm i @actflow/core
```

## Quick Start

### 1) Define your schema once

```ts
// lib/keys.ts
import { defineKeyFactory } from '@actflow/core';

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

### 2) Tag RSC data (Next.js)

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
// invalidate
queryClient.invalidateQueries({ queryKey: qk.posts() });

// query
useQuery({ queryKey: qk.post({ id }), queryFn: fetchPost });
```

---

## API

### `defineKeyFactory(schema)`

Create **tags** (server invalidation strings) and **keys** (client cache keys) from one schema.

```ts
type KeyAtom = string | number | boolean;

interface ResourceSpec<P extends readonly string[] | undefined = undefined> {
  key: string; // base namespace, e.g. 'post'
  params?: P; // ordered param names, e.g. ['id'] as const
  separator?: string; // tag joiner (default ':') → 'post:123'
}

const { tags, keys } = defineKeyFactory({
  post: { key: 'post', params: ['id'] as const },
  items: { key: 'items' }, // 0-arity
} as const);

// Usage
tags.post({ id: 123 }); // 'post:123'
keys.post({ id: 123 }); // ['post', 123]
tags.items(); // 'items'
keys.items(); // ['items']
```

**Policy**

- **Atoms only**: each param must be `string | number | boolean`
- **Booleans**: normalized to `1/0` in keys, `"1"/"0"` in tags
- **Order matters**: key equality is full tuple deep equality; param order is your `params` order
- **Custom tag separator**: per resource via `separator` (e.g., `'/'` → `'item/42'`)

---

## Requirements

- Node ≥ 22.19
- TypeScript ≥ 5.9
- Next.js App Router (for RSC + tags), optional but recommended

## License

MIT

---

# @actflow/core (Ko)

**`@actflow/core`**는 **Next.js Server Actions(RSC)** 환경에서 **클라이언트 쿼리키**와 **서버 캐시 태그**를 **한 스키마로 동시에 생성**하는 작은 유틸입니다.

- **원자만 허용**: `string | number | boolean` (객체/배열 X)
- **불리언 표준화**: 키 `1/0`, 태그 `"1"/"0"`
- **순서 고정**: `params`에 적은 순서를 그대로 사용
- **설치**: `pnpm add @actflow/core`

빠른 예시:

```ts
import { defineKeyFactory } from '@actflow/core';

export const { tags: t, keys: qk } = defineKeyFactory({
  posts: { key: 'posts' },
  post: { key: 'post', params: ['id'] as const },
} as const);

t.post({ id: 1 }); // 'post:1'
qk.post({ id: 1 }); // ['post', 1]
```

Next.js에서 태그 부여/무효화:

```ts
import { unstable_cache as cache, revalidateTag } from 'next/cache';
// ...t 생략

export const getPosts = cache(fetchPosts, ['posts.list'], { tags: [t.posts()] });

export async function createPostAction(input: { title: string; body: string }) {
  await createPost(input);
  revalidateTag(t.posts());
}
```

라이선스: MIT
