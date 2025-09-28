import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z, ZodError } from 'zod';

import { defineAction } from '../action';
import {
  bindFormAction,
  createAuthErrorMapper,
  createDefaultErrorMappers,
} from '../bind-form-action';
import { createRateLimitErrorMapper, getErrorString } from '../error-mappers';
import type { InvalidateFn, TagFns } from '../types';

const tags = {
  posts: () => 'posts',
  post: ({ id }: { id: string }) => `post:${id}`,
} satisfies TagFns;
const invalidate: InvalidateFn = async () => {
  /* no-op for tests */
};

class FD {
  private m = new Map<string, unknown>();
  set(k: string, v: unknown) {
    this.m.set(k, v);
  }
  get(k: string) {
    return this.m.get(k);
  }
}

describe('bindFormAction', () => {
  beforeEach(() => {
    delete globalThis.window;
  });

  it('returns { ok:true } on success (default toSuccessState)', async () => {
    const createPost = defineAction(
      {
        name: 'post.create',
        input: z.object({ title: z.string().min(1), body: z.string().min(1) }),
        handler: async ({ input }) => ({ id: '1', ...input }),
      },
      { tags, invalidate },
    );

    const formAction = bindFormAction(createPost, {
      fromForm: (fd) => ({
        title: String(fd.get('title')),
        body: String(fd.get('body')),
      }),
    });

    const fd = new FD();
    fd.set('title', 'hello');
    fd.set('body', 'world');

    const state = await formAction({ ok: true }, fd);
    expect(state).toEqual({ ok: true });
  });

  it('maps ZodError to fieldErrors (1-depth)', async () => {
    const createPost = defineAction(
      {
        name: 'post.create',
        input: z.object({ title: z.string().min(3), body: z.string().min(1) }),
        handler: async ({ input }) => ({ id: '1', ...input }),
      },
      { tags, invalidate },
    );

    const formAction = bindFormAction(createPost, {
      fromForm: (fd) => ({
        title: String(fd.get('title')),
        body: String(fd.get('body')),
      }),
    });

    const fd = new FD();
    fd.set('title', 'x');
    fd.set('body', '');

    const state = await formAction({ ok: true }, fd);
    expect(state.ok).toBe(false);
    expect(state).toMatchObject({
      fieldErrors: { title: expect.any(String), body: expect.any(String) },
    });
  });

  it('rethrows non-Zod errors', async () => {
    const boom = new Error('DB down');
    const createPost = defineAction(
      {
        name: 'post.create',
        input: z.object({ title: z.string(), body: z.string() }),
        handler: async () => {
          throw boom;
        },
      },
      { tags, invalidate },
    );

    const formAction = bindFormAction(createPost, {
      fromForm: (fd) => ({
        title: String(fd.get('title')),
        body: String(fd.get('body')),
      }),
    });

    const fd = new FD();
    fd.set('title', 'a');
    fd.set('body', 'b');

    await expect(formAction({ ok: true }, fd)).rejects.toBe(boom);
  });

  it('throws on client-evaluated bind (server-only guard)', () => {
    globalThis.window = {};
    const mockAction = async (input: any) => input;

    expect(() =>
      bindFormAction(mockAction, {
        fromForm: (fd) => ({ title: String(fd.get('title')), body: String(fd.get('body')) }),
      }),
    ).toThrowError(/server-only/i);

    delete globalThis.window;
  });

  it('throws if argument is not FormData-like (no get)', async () => {
    const createPost = defineAction(
      {
        name: 'post.create',
        input: z.object({ title: z.string(), body: z.string() }),
        handler: async ({ input }) => input,
      },
      { tags, invalidate },
    );

    const formAction = bindFormAction(createPost, {
      fromForm: (fd) => ({ title: String(fd.get('title')), body: String(fd.get('body')) }),
    });

    // @ts-expect-error test type error
    await expect(formAction({ ok: true }, {})).rejects.toThrowError(/FormData-like/);
  });
});

describe('bindFormAction - error mapping integration', () => {
  describe('Error mapping priority', () => {
    it('should handle ZodError before custom mappers', async () => {
      const zodError = new ZodError([
        { path: ['email'], message: 'Invalid email', code: 'invalid_type', expected: 'string' },
      ]);

      const mockAction = vi.fn().mockRejectedValue(zodError);
      const customMapper = vi.fn().mockReturnValue({ ok: false, reason: 'CUSTOM' });

      const boundAction = bindFormAction(mockAction, {
        fromForm: (fd) => ({ email: fd.get('email') }),
        mapError: customMapper,
      });

      const formData = new FormData();
      formData.set('email', 'bad');
      const result = await boundAction(formData);

      expect(customMapper).not.toHaveBeenCalled();
      expect(result).toEqual({
        ok: false,
        fieldErrors: { email: 'Invalid email' },
        reason: 'VALIDATION',
      });
    });

    it('should use custom mapper for non-Zod errors', async () => {
      const customError = { status: 401 };
      const mockAction = vi.fn().mockRejectedValue(customError);

      const boundAction = bindFormAction(mockAction, {
        fromForm: (fd) => ({ data: fd.get('data') }),
        mapError: createAuthErrorMapper(),
      });

      const formData = new FormData();
      formData.set('data', 'test');
      const result = await boundAction(formData);

      expect(result).toEqual({
        ok: false,
        reason: 'AUTH',
        formError: 'Authentication required',
      });
    });
  });

  describe('unmappedErrorStrategy', () => {
    it('should throw unmapped errors by default', async () => {
      const unknownError = new Error('Unknown');
      const mockAction = vi.fn().mockRejectedValue(unknownError);

      const boundAction = bindFormAction(mockAction, {
        fromForm: () => ({}),
        mapError: createAuthErrorMapper(),
      });

      const formData = new FormData();

      await expect(boundAction(formData)).rejects.toThrow('Unknown');
    });

    it('should return generic message when strategy is "generic"', async () => {
      const unknownError = new Error('Unknown');
      const mockAction = vi.fn().mockRejectedValue(unknownError);

      const boundAction = bindFormAction(mockAction, {
        fromForm: () => ({}),
        mapError: createAuthErrorMapper(),
        unmappedErrorStrategy: 'generic',
      });

      const formData = new FormData();
      const result = await boundAction(formData);

      expect(result).toEqual({
        ok: false,
        formError: 'An error occurred',
      });
    });

    it('should use custom generic message', async () => {
      const unknownError = new Error('Unknown');
      const mockAction = vi.fn().mockRejectedValue(unknownError);

      const boundAction = bindFormAction(mockAction, {
        fromForm: () => ({}),
        mapError: createAuthErrorMapper(),
        unmappedErrorStrategy: 'generic',
        genericErrorMessage: 'Something went wrong',
      });

      const formData = new FormData();
      const result = await boundAction(formData);

      expect(result).toEqual({
        ok: false,
        formError: 'Something went wrong',
      });
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle fetch API errors', async () => {
      const fetchError = {
        status: 429,
        statusText: 'Too Many Requests',
        headers: {},
      };

      const mockAction = vi.fn().mockRejectedValue(fetchError);

      const boundAction = bindFormAction(mockAction, {
        fromForm: (fd) => ({ data: fd.get('data') }),
        mapError: createRateLimitErrorMapper(),
      });

      const formData = new FormData();
      formData.set('data', 'test');
      const result = await boundAction(formData);

      expect(result).toEqual({
        ok: false,
        reason: 'RATE_LIMIT',
        formError: 'Too many requests. Please try again later',
      });
    });

    it('should handle Prisma-like errors', async () => {
      const prismaError = {
        code: 'P2002',
        meta: { target: ['email'] },
        message: 'Unique constraint failed',
      };

      const mockAction = vi.fn().mockRejectedValue(prismaError);

      const prismaMapper = (error: unknown) => {
        const code = getErrorString(error, 'code');
        if (code === 'P2002') {
          return { ok: false, reason: 'CONFLICT', formError: 'This already exists' };
        }
        return null;
      };

      const boundAction = bindFormAction(mockAction, {
        fromForm: (fd) => ({ email: fd.get('email') }),
        mapError: prismaMapper,
      });

      const formData = new FormData();
      formData.set('email', 'existing@example.com');
      const result = await boundAction(formData);

      expect(result).toEqual({
        ok: false,
        reason: 'CONFLICT',
        formError: 'This already exists',
      });
    });

    it('should chain multiple mappers with default set', async () => {
      const mockAction = vi.fn().mockRejectedValue({ status: 404 });

      const boundAction = bindFormAction(mockAction, {
        fromForm: (fd) => ({ id: fd.get('id') }),
        mapError: createDefaultErrorMappers(),
      });

      const formData = new FormData();
      formData.set('id', '123');
      const result = await boundAction(formData);

      expect(result).toEqual({
        ok: false,
        reason: 'NOT_FOUND',
        formError: 'Resource not found',
      });
    });
  });

  describe('Form action overloads', () => {
    it('should work with 1-argument signature', async () => {
      const mockAction = vi.fn().mockRejectedValue({ status: 401 });

      const boundAction = bindFormAction(mockAction, {
        fromForm: (fd) => ({ data: fd.get('data') }),
        mapError: createAuthErrorMapper(),
      });

      const formData = new FormData();
      formData.set('data', 'test');

      const result = await boundAction(formData);

      expect(result).toEqual({
        ok: false,
        reason: 'AUTH',
        formError: 'Authentication required',
      });
    });

    it('should work with 2-argument signature (useActionState)', async () => {
      const mockAction = vi.fn().mockRejectedValue({ status: 403 });

      const boundAction = bindFormAction(mockAction, {
        fromForm: (fd) => ({ data: fd.get('data') }),
        mapError: createAuthErrorMapper(),
      });

      const prevState = { ok: true, message: 'Previous success' };
      const formData = new FormData();
      formData.set('data', 'test');

      const result = await boundAction(prevState, formData);

      expect(result).toEqual({
        ok: false,
        reason: 'AUTH',
        formError: 'Access denied',
      });
    });
  });

  describe('Error cases', () => {
    it('should handle mapError throwing an error', async () => {
      const mockAction = vi.fn().mockRejectedValue(new Error('Original'));

      const faultyMapper = () => {
        throw new Error('Mapper failed!');
      };

      const boundAction = bindFormAction(mockAction, {
        fromForm: () => ({}),
        mapError: faultyMapper,
        unmappedErrorStrategy: 'throw',
      });

      const formData = new FormData();

      await expect(boundAction(formData)).rejects.toThrow('Mapper failed!');
    });

    it('should handle circular error objects', async () => {
      const circularError: any = { status: 401 };
      circularError.self = circularError;

      const mockAction = vi.fn().mockRejectedValue(circularError);

      const boundAction = bindFormAction(mockAction, {
        fromForm: () => ({}),
        mapError: createAuthErrorMapper(),
      });

      const formData = new FormData();
      const result = await boundAction(formData);

      expect(result).toEqual({
        ok: false,
        reason: 'AUTH',
        formError: 'Authentication required',
      });
    });
  });
});
