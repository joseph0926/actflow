# actflow

**Next.js 서버 액션(RSC)** 앱에서 변이(mutation) 흐름을 **예측 가능**하게 만듭니다.

- 표준 레일: _낙관적 업데이트 → 서버 → 캐시 무효화 → 조정/롤백 → 재시도/중복 제거_
- **서버 태그**(`revalidateTag`)와 **클라이언트 쿼리 키**(예: React Query)를 **하나의 스키마**로 생성
- 오늘 제공: **서버 전용 액션(`defineAction`, `defineActionWithTags`) + 타입 안전 태그 + Next 캐시 무효화(가드 적용)**
  _(핸들러에서 `ctx.tags`가 정확히 추론되어 자동완성이 동작합니다.)_
- 다음 제공 예정: 재시도, 아웃박스, 탭 간 동기화, 개발 도구

---

## 왜 actflow인가?

- **예측 가능한 변이**: 액션의 입·출력을 한 경로로 통일하고, 캐시 무효화를 **명시적이고 타입 안전**하게 처리합니다.
- **타입 안전 태그/키**: 하나의 스키마에서 **서버 태그**와 **클라이언트 쿼리 키**를 동시에 생성—불일치 감소.
- **DX & 안전성**: `defineActionWithTags`로 태그를 한 번만 바인딩(보일러플레이트 감소, `ctx.tags` 자동완성), 무효화는 **서버 전용 가드 + 동적 `next/cache` 어댑터**로 안전하게 실행됩니다.

---

## 패키지

- **`@actflow/next`** — 앱용 파사드
  - `@actflow/next/server`: `defineAction`, `defineActionWithTags`, `createInvalidate` 재노출(클라이언트 임포트 시 에러)
  - `@actflow/next/core`: `defineKeyFactory` 재노출

- **`@actflow/server`** — 서버 유틸(`defineAction`, `defineActionWithTags`, `createInvalidate`)
- **`@actflow/core`** — 키/태그 팩토리(하나의 스키마 → `tags.*()` + `keys.*()`)

> 선택/예정: `@actflow/react`, `@actflow/adapter-react-query`, `@actflow/devtools`.

---

## 설치

```bash
pnpm add @actflow/next zod
# 또는: npm i @actflow/next zod
```

**요구사항:** Node ≥ 22, TypeScript ≥ 5.9, Next.js ≥ 15(파사드 사용 시), Zod.

---

## 빠른 시작

### 1) 태그/키를 한 번에 정의

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

### 2) 서버 액션 작성 (서버 전용)

#### 권장: 태그를 한 번 바인딩(최소 보일러플레이트, 완벽한 자동완성)

```ts
// app/actions/posts.ts
'use server';

import { defineActionWithTags } from '@actflow/next/server';
import { z } from 'zod';
import { t } from '@/lib/keys';
import { db } from '@/server/db';

const act = defineActionWithTags({ tags: t }); // 한 번 바인딩 → ctx.tags 완전 추론

export const createPost = act({
  name: 'post.create',
  input: z.object({ title: z.string().min(1), body: z.string().min(1) }),
  handler: async ({ input, ctx }) => {
    const row = await db.post.create({ data: input });
    // 타입 안전한 서버 전용 무효화 (내부적으로 Next revalidateTag 사용)
    await ctx.invalidate([ctx.tags.posts(), ctx.tags.post({ id: row.id })]);
    return row;
  },
});

// (선택) 액션별 invalidate 오버라이드:
// export const removePost = act({ ... }, { invalidate: customInvalidate });
```

#### 로우레벨: 액션마다 태그를 명시

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
  { tags: t }, // 여기서 invalidate를 직접 주입할 수도 있습니다.
);
```

### 3) RSC fetch에서 태그 사용 (예시)

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

## API (스냅샷)

### `defineAction(config, { tags, invalidate? })`

```ts
type TagFns = Record<string, (...args: any[]) => string>;
type InvalidateFn = (tags: readonly string[]) => Promise<void>;

defineAction<S extends z.ZodType, Out, T extends TagFns>(
  config: {
    name: string;
    input: S; // Zod 스키마 (필수)
    handler: (args: { input: z.output<S>; ctx: { tags: T; invalidate: InvalidateFn } }) => Promise<Out>;
  },
  opts: {
    tags: T;                    // 필수: 타입 안전 태그 함수 모음
    invalidate?: InvalidateFn;  // 선택: 커스텀 무효화(기본값은 Next revalidateTag)
  }
): (payload: z.input<S>) => Promise<Out>;
```

- **서버 전용**: 클라이언트에서 임포트/실행 시 명확한 에러가 발생합니다.
- **타입 흐름**: 호출자는 `z.input<S>`를 넘기고, 핸들러는 `z.output<S>`를 받습니다.
- **`ctx.tags` 추론**: `T`가 그대로 흘러 `ctx.tags.post({ id })`까지 정확히 체크됩니다.

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

- **한 번 바인딩, 여러 액션 재사용**: 모든 액션에 `tags`를 주입하고 `ctx.tags` 자동완성을 보장합니다.
- **액션별 오버라이드**: 필요 시 `{ invalidate }`를 넘겨 기본 무효화를 대체할 수 있습니다.
- **폴백**: `invalidate`가 없으면 내부 `createInvalidate()`(Next 어댑터)를 사용합니다.

### `createInvalidate(): InvalidateFn`

- 기본 **Next 어댑터**. 런타임에 동적으로 `next/cache`를 임포트(서버 전용).
- `next/cache`를 찾을 수 없으면 **명확한 안내 메시지**로 예외를 던집니다.
- 테스트/로깅/배치 등 커스터마이즈가 필요하면 직접 `invalidate`를 주입하세요.

### `defineKeyFactory(schema)`

- 하나의 스키마에서 `{ tags, keys }`를 생성합니다.
- `tags.*()` → 서버 무효화 문자열.
- `keys.*()` → 클라이언트 쿼리 키(예: React Query).

---

## 보장 & 안전성

- **앱 상태 비소유**: actflow는 DB/세션을 소유하지 않습니다. `tags`(와 선택 `invalidate`)만 주입합니다.
- **서버 전용 가드**: 무효화는 게이트로 보호되며, 클라이언트 사용은 즉시 실패합니다.
- **불일치 방지**: 키/태그가 **하나의 스키마**에서 파생—오타·불일치 감소.

---

## 자주 묻는 질문(FAQ)

- **캐시를 제공하나요?** 아니요. actflow는 *변이 흐름*을 표준화합니다. RSC 태그, React Query 등 기존 캐시를 그대로 쓰세요.
- **React Query가 필수인가요?** 아닙니다. 어댑터는 선택 사항입니다.
- **무효화를 커스터마이즈하려면?** `defineAction(...)`에서 주입하거나, `defineActionWithTags(..., { invalidate })`로 액션별 오버라이드 하세요.
- **재시도/아웃박스는 어디에?** 로드맵에 있습니다. 현재는 **서버 액션 레일과 태그 안전성**에 우선합니다.

---

## 라이선스

MIT
