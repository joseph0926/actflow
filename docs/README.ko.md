# actkit

**Next.js Server Actions(RSC)** 환경에서 변이 흐름을 **예측 가능하게** 만드는 툴킷을 지향합니다.

> 현재 v0.0.1은 **쿼리키 & 태그 팩토리(`@actkit/core`)**만 제공합니다.

- 개선하려는 것
  - “낙관 적용 → 서버 실행 → 캐시 무효화 → 정합화/롤백 → 재시도/중복방지”의 **표준 레일** 확립
  - **서버 태그(revalidateTag)**와 **클라이언트 쿼리키(React Query 등)**를 **한 스키마에서 동시 생성**해 오타·불일치 제거
  - (차기) 재시도 / 아웃박스 / 멀티 탭 동기화 / DevTools

---

## Packages (현재)

- `@actkit/core` — **Strict 쿼리키 & 태그 팩토리**
  - 키 형태: `readonly [namespace: string, ...atoms]`
  - **원자만 허용**: `string | number | boolean` (객체/배열 금지)
  - `boolean`은 키에서 `1/0`, 태그에서 `"1"/"0"`으로 표준화

> 앞으로 `@actkit/server`, `@actkit/react`, `@actkit/adapter-react-query` 제공 예정.

---

## 설치

```bash
pnpm add @actkit/core
# or npm i @actkit/core
```

---

## 빠른 시작

### 1) 키/태그 스키마 정의

```ts
// lib/keys.ts
import { defineKeyFactory } from '@actkit/core';

export const { tags: t, keys: qk } = defineKeyFactory({
  posts: { key: 'posts' },
  post: { key: 'post', params: ['id'] as const },
} as const);

// 사용 예
t.posts(); // 'posts'
t.post({ id: 1 }); // 'post:1'
qk.posts(); // ['posts']
qk.post({ id: 1 }); // ['post', 1]
```

### 2) RSC 서버 데이터에 태그 부여

```ts
// server/queries.ts
import { unstable_cache as cache } from 'next/cache';
import { t } from '@/lib/keys';
import { listPosts } from '@/server/db';

export const getPosts = cache(() => listPosts(), ['posts.list'], {
  tags: [t.posts()],
});
```

### 3) Server Action에서 무효화

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

### 4) (선택) React Query에서 동일 쿼리키 사용

```ts
queryClient.invalidateQueries({ queryKey: qk.posts() });
useQuery({ queryKey: qk.post({ id }), queryFn: fetchPost });
```

---

## 정책 (키 설계)

- **Strict 원자**: `string | number | boolean`만 허용
- **불리언**: 키에서는 1/0, 태그에서는 "1"/"0"
- **순서 고정**: `params` 정의 순서를 그대로 사용
- **부분 무효화**: 리스트/패밀리 키(`['posts']`)로 범위 무효화

---

## 요구 사항

- Node ≥ 22.19
- TypeScript ≥ 5.9

---

## 라이선스

MIT
