import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import z from 'zod';

import { defineAction } from '../action';

const T = {
  posts: () => 'posts',
  post: ({ id }: { id: string | number }) => `post:${id}`,
} as const;

function stubWindow() {
  (globalThis as any).window = {};
}
function restoreWindow() {
  delete (globalThis as any).window;
}

describe('defineAction — happy path & ctx wiring', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns handler result and calls invalidate with tag strings', async () => {
    const invalidate = vi.fn(async () => {});
    const createPost = defineAction(
      {
        name: 'post.create',
        input: z.object({ title: z.string().min(1), qty: z.number().int().min(1) }),
        handler: async ({ input, ctx }) => {
          await ctx.invalidate([ctx.tags.posts(), ctx.tags.post({ id: 1 })]);
          return { ok: true, input };
        },
      },
      { tags: T, invalidate },
    );

    const out = await createPost({ title: 'hi', qty: 2 });
    expect(out).toEqual({ ok: true, input: { title: 'hi', qty: 2 } });
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenLastCalledWith(['posts', 'post:1']);
  });

  it('uses built-in invalidator when opts.invalidate is omitted (calls next/cache.revalidateTag)', async () => {
    vi.resetModules();
    const revalidateTag = vi.fn(async () => {});

    vi.doMock('next/cache', () => ({
      revalidateTag,
    }));

    const { defineAction } = await import('../action');
    const { z } = await import('zod');

    const createPost = defineAction(
      {
        name: 'post.create',
        input: z.object({ title: z.string().min(1) }),
        handler: async ({ input, ctx }) => {
          await ctx.invalidate([ctx.tags.posts(), ctx.tags.post({ id: '42' })]);
          return input;
        },
      },
      { tags: T },
    );

    await createPost({ title: 'ok' });
    expect(revalidateTag).toHaveBeenCalledTimes(2);
    expect(revalidateTag).toHaveBeenNthCalledWith(1, 'posts');
    expect(revalidateTag).toHaveBeenNthCalledWith(2, 'post:42');
  });

  it('does not call createInvalidate when a custom invalidate is provided', async () => {
    vi.resetModules();

    const createInvalidateSpy = vi.fn();
    vi.doMock('../invalidate', () => ({
      createInvalidate: createInvalidateSpy,
      assertServerOnly: vi.fn(),
    }));

    const { defineAction } = await import('../action');
    const { z } = await import('zod');

    const customInvalidate = vi.fn(async () => {});
    const action = defineAction(
      {
        name: 'x',
        input: z.object({ n: z.number() }),
        handler: async ({ input, ctx }) => {
          await ctx.invalidate([ctx.tags.posts()]);
          return input.n + 1;
        },
      },
      { tags: T, invalidate: customInvalidate },
    );

    const out = await action({ n: 10 });
    expect(out).toBe(11);
    expect(customInvalidate).toHaveBeenCalledOnce();
    expect(createInvalidateSpy).not.toHaveBeenCalled();
  });
});

describe('defineAction — guards & errors', () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    restoreWindow();
  });

  it('throws server-only error when evaluated on the client (window present)', async () => {
    stubWindow();
    expect(() =>
      defineAction({ name: 'bad', input: z.object({}), handler: async () => ({}) }, { tags: T }),
    ).toThrowError(/server-only/i);
  });

  it('throws TypeError when input is not a Zod schema', async () => {
    const badInput = { parse: () => {}, safeParse: 123 };

    expect(() =>
      defineAction(
        // @ts-expect-error test type error
        { name: 'bad', input: badInput, handler: async () => ({}) },
        { tags: T },
      ),
    ).toThrowError(/expects a Zod schema/i);
  });

  it('rejects with ZodError when payload fails validation', async () => {
    const action = defineAction(
      {
        name: 'post.create',
        input: z.object({ title: z.string().min(3) }),
        handler: async ({ input }) => input,
      },
      { tags: T },
    );

    await expect(action({ title: 'no' })).rejects.toMatchObject({
      name: 'ZodError',
    });
  });
});
