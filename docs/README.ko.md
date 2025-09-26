# actflow

**Next.js Server Actions(RSC)** 환경에서 변이 흐름을 **예측 가능하게** 만드는 툴킷입니다.

- 표준 레일: _낙관 적용 → 서버 실행 → 캐시 무효화 → 정합화/롤백 → 재시도/중복 방지_
- **한 스키마**로 서버 태그(`revalidateTag`)와 클라이언트 쿼리키(예: React Query)를 동시 생성
- (다음 버전 예정) 재시도/백오프, 아웃박스(IndexedDB), 멀티 탭 동기화(BroadcastChannel), DevTools

---

- **`@actflow/next`** — 앱을 위한 파사드
  - `@actflow/next/server` 에서 `defineAction` 재-export (클라이언트에서 임포트 시 즉시 에러)
  - `@actflow/next/core` 에서 `defineKeyFactory` 재-export(초기 스텁)

- **`@actflow/server`** — 서버 전용 `defineAction(name, zodSchema, handler)`
  - Zod 전용 강제(컴파일/런타임), 핸들러에는 `z.output<S>`, 호출자는 `z.input<S>`

- **`@actflow/core`** — **Strict 쿼리키 & 태그 팩토리**(키/태그를 한 스키마로 생성)

> 레포 내 패키지: `@actflow/next`, `@actflow/server`, `@actflow/core`, `@actflow/react`, `@actflow/adapter-react-query`(선택).

---

## 설치

```bash
pnpm add @actflow/next zod
# 또는 npm i @actflow/next zod
```

---

## 빠른 시작

### 1) 서버 액션(Zod 전용)

```ts
// app/actions/posts.ts
'use server';

import { defineAction } from '@actflow/next/server';
import { z } from 'zod';
import { createPost } from '@/server/db';

export const createPostAction = defineAction(
  'post.create',
  z.object({ title: z.string().min(1), body: z.string().min(1) }),
  async ({ input }) => {
    const row = await createPost(input);
    // 캐시 무효화 옵션은 차기 버전에서 제공 예정
    return row;
  },
);
```

- **왜 `name`?** 로깅/트레이싱/멱등 네임스페이스/DevTools용 **안정 식별자**입니다.

### 2) (선택) 쿼리키 & 태그를 한 스키마로

```ts
// lib/keys.ts
import { defineKeyFactory } from '@actflow/next/core';

export const { tags: t, keys: qk } = defineKeyFactory({
  posts: { key: 'posts' },
  post: { key: 'post', params: ['id'] as const },
} as const);

// 예시
t.posts(); // 'posts'
t.post({ id: 1 }); // 'post:1'
qk.posts(); // ['posts']
qk.post({ id: 1 }); // ['post', 1]
```

- RSC 캐시/태깅에는 `t.*()`, 클라이언트 캐시(React Query 등)에는 `qk.*()`를 사용하세요.

---

## API 스냅샷

### `defineAction(name, zodSchema, handler)`

- **서버 전용**(클라이언트에서 임포트 시 즉시 에러).
- Zod **필수**:
  - 컴파일 타임: `S extends z.ZodType`
  - 런타임: `parse/safeParse` 존재 확인(덕 타이핑)

- 타입 흐름:
  - 호출 인자: `z.input<S>`
  - 핸들러 `input`: `z.output<S>`

### 키 설계 정책(`@actflow/core`)

- **원자만 허용**: `string | number | boolean`
- **boolean 표준화**: 키에서는 `1/0`, 태그에서는 `"1"/"0"`
- **순서 고정**: `params` 정의 순서 준수
- **패밀리 무효화**: 리스트/패밀리 키(`['posts']`)로 범위 무효화

---

## 요구 사항

- Node ≥ **22.19**
- TypeScript ≥ **5.9**
- Next.js ≥ **15** (파사드 `@actflow/next` 사용 시)
- Zod ≥ **4** (peer)

---

## 로드맵

- `defineAction` 옵션: **멱등성**, **태그/경로 무효화**, **재시도/백오프**
- 아웃박스(IndexedDB), 멀티 탭 동기화(BroadcastChannel)
- DevTools 타임라인
- React Query 어댑터 고도화

---

## 라이선스

MIT

```

```
