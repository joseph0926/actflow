import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { defineAction } from '../action';
import { bindFormAction } from '../bind-form-action';
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

    // @ts-expect-error intentionally wrong
    await expect(formAction({ ok: true }, {})).rejects.toThrowError(/FormData-like/);
  });
});
