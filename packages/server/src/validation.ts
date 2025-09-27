import type { z } from 'zod';

export type ZodOnly<S> = S extends z.ZodType
  ? S
  : [
      '⛔ Expected a Zod schema.',
      "👉 import { z } from 'zod' and pass z.object(...).",
      'Received:',
      S,
    ];

function isFunction(value: unknown): value is (...args: never[]) => unknown {
  return typeof value === 'function';
}

function isZodSchema(schema: unknown): schema is z.ZodType {
  if (typeof schema !== 'object' || schema === null) return false;
  const rec = schema as Record<string, unknown>;
  return isFunction(rec.parse) && isFunction(rec.safeParse);
}

export function assertZodSchema(name: string, schema: unknown): asserts schema is z.ZodType {
  if (!isZodSchema(schema)) {
    throw new TypeError(
      `[actflow] defineAction("${name}") expects a Zod schema as the second argument.\n` +
        `👉 import { z } from 'zod' and pass z.object({...}).`,
    );
  }
}
