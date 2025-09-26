import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { defineAction } from '../action';

function withClientWindow<T>(fn: () => T): T {
  const g = globalThis as unknown as { window?: unknown };
  const prev = g.window;
  g.window = {};
  try {
    return fn();
  } finally {
    if (prev === undefined) delete g.window;
    else g.window = prev;
  }
}

describe('defineAction (minimal)', () => {
  it('parses payload and passes transformed output to handler', async () => {
    const S = z.object({
      n: z.string().transform((s) => Number(s) * 2),
    });
    const act = defineAction('x.double', S, async ({ input }) => {
      return input.n + 1;
    });
    await expect(act({ n: '21' })).resolves.toBe(43);
  });

  it('rejects invalid payload with a thrown error from zod.parse', async () => {
    const S = z.object({ n: z.number().int().min(0) });
    const act = defineAction('x.invalid', S, async ({ input }) => input.n);
    await expect(act({ n: -1 } as any)).rejects.toBeInstanceOf(Error);
    await expect(act({ n: 1.2 } as any)).rejects.toBeInstanceOf(Error);
    await expect(act({} as any)).rejects.toBeInstanceOf(Error);
  });

  it('bubbles handler errors', async () => {
    const S = z.object({ ok: z.boolean() });
    const act = defineAction('x.fail', S, async ({ input }) => {
      if (!input.ok) throw new Error('boom');
      return 'ok';
    });
    await expect(act({ ok: true })).resolves.toBe('ok');
    await expect(act({ ok: false })).rejects.toThrow('boom');
  });

  it('throws at definition time when evaluated on client (server-only)', () => {
    const S = z.object({ n: z.number() });
    expect(() =>
      withClientWindow(() => defineAction('x.client', S, async ({ input }) => input.n)),
    ).toThrowError(/server-only/i);
  });
});
