import { describe, expect, it } from 'vitest';
import z from 'zod';

import { assertZodSchema } from '../validation';

describe('assertZodSchema', () => {
  it('passes for a valid Zod schema', async () => {
    expect(() => {
      assertZodSchema('ok', z.object({ a: z.string() }));
    }).not.toThrow();
  });

  it('throws TypeError for non-Zod objects (duck typing fails)', async () => {
    const bad1 = { parse: () => true };
    const bad2 = { parse: () => true, safeParse: 42 };

    expect(() => {
      assertZodSchema('bad1', bad1);
    }).toThrowError(/expects a Zod schema/i);
    expect(() => {
      assertZodSchema('bad2', bad2);
    }).toThrowError(/expects a Zod schema/i);
  });
});
