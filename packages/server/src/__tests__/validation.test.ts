import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { assertServerOnly, assertZodSchema } from '../validation';

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

describe('assertServerOnly', () => {
  it('does nothing on server (no window)', () => {
    expect(() => {
      assertServerOnly('x.test');
    }).not.toThrow();
  });
  it('throws when window exists (client)', () => {
    expect(() => {
      withClientWindow(() => {
        assertServerOnly('x.test');
      });
    }).toThrowError(/server-only/i);
  });
});

describe('assertZodSchema', () => {
  it('accepts a real Zod schema', () => {
    const S = z.object({ n: z.number().int() });
    expect(() => {
      assertZodSchema('x.test', S);
    }).not.toThrow();
  });
  it('rejects non-object', () => {
    expect(() => {
      assertZodSchema('x.test', null as unknown);
    }).toThrowError(/expects a Zod schema/i);
    expect(() => {
      assertZodSchema('x.test', 123 as unknown);
    }).toThrowError(/expects a Zod schema/i);
  });
  it('rejects object without parse/safeParse', () => {
    expect(() => {
      assertZodSchema('x.test', {});
    }).toThrowError(/expects a Zod schema/i);
    expect(() => {
      assertZodSchema('x.test', { parse: () => {} });
    }).toThrowError(/expects a Zod schema/i);
    expect(() => {
      assertZodSchema('x.test', { safeParse: () => {} });
    }).toThrowError(/expects a Zod schema/i);
  });
});
