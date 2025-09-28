# actflow

> English version: [`README.md`](../README.md)

**Next.js Server Actions (RSC)** 앱에서 변이 흐름을 **예측 가능**하게 만듭니다.

- 표준 레일: _낙관적 업데이트 → 서버 실행 → 캐시 무효화 → 정합/롤백 → 재시도/중복 제거_
- **서버 태그**(`revalidateTag`)와 **클라이언트 쿼리 키**(예: React Query)를 위한 하나의 스키마
- **폼 우선 + 에러 처리**: React 19 폼 + 자동 에러 매핑 (인증/검증/충돌)
- **타입 안전 태그**: 서버와 클라이언트 간 문자열 불일치 제거
- 다음: 재시도, 아웃박스, 크로스탭 동기화, 개발 도구

---

## 왜 actflow인가?

- **예측 가능한 변이**: 액션의 입출력 경로가 하나; 캐시 무효화가 명시적이고 타입 안전함
- **타입 안전 태그/키**: 단일 스키마에서 **서버 태그**와 **클라이언트 쿼리 키**를 모두 생성—불일치 없음
- **통합 폼 레일 (React 19)**: `<form action>` + `useActionState`/`useFormStatus`를 Zod 검증 자동 매핑과 커스터마이징 가능한 에러 처리와 함께 사용
- **프로덕션 준비 에러 처리**: 일반적인 HTTP 에러(401/403/404/409/429)를 위한 내장 매퍼와 합리적인 기본값
- **DX & 안전성**: `defineActionWithTags`로 태그를 한 번만 바인딩(보일러플레이트 감소, `ctx.tags` 완전 자동완성), 보호된 동적 `next/cache` 어댑터 사용 (클라이언트 import 즉시 실패)

---

## 패키지

- **`@actflow/next`** — 올인원 Next.js 통합
- **`@actflow/server`** — 코어 서버 유틸리티 (액션, 폼, 에러 처리)
- **`@actflow/core`** — 엄격한 키/태그 팩토리

> 옵션/예정: `@actflow/react`, `@actflow/adapter-react-query`, `@actflow/devtools`

---

## 설치

```bash
pnpm add @actflow/next zod
# 또는: npm i @actflow/next zod
```

**요구사항:** Next.js ≥ 14, React ≥ 18.2, Zod ≥ 3.22

---

## 빠른 시작

### 1) 태그/키를 한 번만 정의

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

### 2) Server Actions 작성

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
    // 404나 403을 던질 수 있음
    const post = await db.post.findUniqueOrThrow({ where: { id: input.id } });

    if (post.authorId !== ctx.userId) {
      throw { status: 403 }; // 에러 핸들러가 매핑
    }

    await db.post.delete({ where: { id: input.id } });
    await ctx.invalidate([ctx.tags.posts()]);
    return { ok: true };
  },
});
```

### 3) 에러 처리가 포함된 폼

```ts
// app/actions/posts.ts (계속)
'use server';
import {
  bindFormAction,
  createAuthErrorMapper,
  createNotFoundErrorMapper,
  combineErrorMappers,
} from '@actflow/next';

// 폼용 통합 에러 매퍼 생성
const formErrorMapper = combineErrorMappers(
  createAuthErrorMapper({
    unauthorized: '로그인이 필요합니다',
    forbidden: '권한이 없습니다',
  }),
  createNotFoundErrorMapper({
    message: '게시글을 찾을 수 없습니다',
  }),
);

export const createPostForm = bindFormAction(createPost, {
  fromForm: (fd) => ({
    title: String(fd.get('title') ?? ''),
    body: String(fd.get('body') ?? ''),
  }),
  mapError: formErrorMapper,
  unmappedErrorStrategy: 'generic',
  genericErrorMessage: '문제가 발생했습니다. 다시 시도해주세요.',
});

export const deletePostForm = bindFormAction(deletePost, {
  fromForm: (fd) => ({
    id: String(fd.get('id') ?? ''),
  }),
  mapError: formErrorMapper,
});
```

### 4) 에러 상태가 포함된 React 컴포넌트

```tsx
// app/(feed)/PostForm.tsx
'use client';
import { useActionState } from 'react';
import { createPostForm } from '@/app/actions/posts';

export default function PostForm() {
  const [state, formAction] = useActionState(createPostForm, { ok: true });

  // 다양한 에러 이유 처리
  if (!state.ok && state.reason === 'AUTH') {
    return <div>게시글을 작성하려면 로그인하세요.</div>;
  }

  return (
    <form action={formAction}>
      <input name="title" placeholder="제목" aria-invalid={!!state.fieldErrors?.title} />
      {state.fieldErrors?.title && <span className="error">{state.fieldErrors.title}</span>}

      <textarea name="body" placeholder="내용" aria-invalid={!!state.fieldErrors?.body} />
      {state.fieldErrors?.body && <span className="error">{state.fieldErrors.body}</span>}

      <button type="submit">게시글 작성</button>

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

### 5) RSC fetch에서 태그 사용

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

## 에러 처리

actflow는 일반적인 시나리오를 위한 내장 에러 매퍼를 제공합니다:

### 사용 가능한 에러 매퍼

```ts
import {
  createAuthErrorMapper, // 401/403
  createValidationErrorMapper, // 400 (Zod 외)
  createNotFoundErrorMapper, // 404
  createConflictErrorMapper, // 409
  createRateLimitErrorMapper, // 429
  createDefaultErrorMappers, // 모두 통합
  ERROR_REASONS, // 타입 안전 reason 상수
} from '@actflow/next';
```

### 커스텀 에러 매핑

```ts
// 도메인 에러용 커스텀 매퍼 생성
const customMapper = (error: unknown): FormState | null => {
  if (error instanceof PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return {
        ok: false,
        reason: 'CONFLICT',
        formError: '이미 존재합니다',
      };
    }
  }
  return null;
};

// 내장 매퍼와 결합
const appErrorMapper = combineErrorMappers(customMapper, createDefaultErrorMappers());

// 폼에서 사용
export const myForm = bindFormAction(myAction, {
  fromForm: (fd) => ({
    /* ... */
  }),
  mapError: appErrorMapper,
  unmappedErrorStrategy: 'generic', // 또는 'throw'
});
```

### 에러 이유

FormState는 에러 분류를 위한 타입이 지정된 `reason` 필드를 포함합니다:

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

## API 레퍼런스

### 핵심 함수

- `defineAction(config, { tags, invalidate? })` - 서버 액션 정의
- `defineActionWithTags({ tags })` - 태그가 바인딩된 액션 팩토리 생성
- `bindFormAction(action, config)` - React 19 폼용 액션 래핑
- `defineKeyFactory(schema)` - 하나의 스키마에서 타입 안전 태그/키 생성

### 에러 처리

- `createAuthErrorMapper(options?)` - 401/403 에러 매핑
- `createValidationErrorMapper(options?)` - 400/검증 에러 매핑
- `createNotFoundErrorMapper(options?)` - 404 에러 매핑
- `createConflictErrorMapper(options?)` - 409 에러 매핑
- `createRateLimitErrorMapper(options?)` - 429 에러 매핑
- `createDefaultErrorMappers(options?)` - 모든 매퍼 통합
- `combineErrorMappers(...mappers)` - 여러 매퍼 체이닝

### 타입

- `FormState<F>` - 폼 제출 결과 타입
- `FormAction<F>` - React 19 폼 액션 시그니처
- `ErrorMapper<F>` - 에러 매핑 함수 타입
- `ERROR_REASONS` - 에러 이유 상수

---

## v0.2에서 마이그레이션

공개 API에는 breaking change가 없습니다.

- 내장 매퍼를 포함한 에러 처리 시스템
- 간소화된 import (서브 경로 불필요)
- 에러 분류를 위한 FormState의 `reason` 필드

---

## 라이선스

MIT
