import type { z } from 'zod';

import { assertServerOnly, assertZodSchema } from './validation';

type Handler<S extends z.ZodType, Out> = (args: { input: z.output<S> }) => Promise<Out>;

export function defineAction<S extends z.ZodType, Out>(
  name: string,
  schema: S,
  handler: Handler<S, Out>,
): (payload: z.input<S>) => Promise<Out> {
  assertServerOnly(name);
  assertZodSchema(name, schema);

  return async (payload) => {
    const parsed = schema.parse(payload);
    return handler({ input: parsed });
  };
}
