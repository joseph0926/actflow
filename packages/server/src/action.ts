import type { z } from 'zod';

import { assertServerOnly, createInvalidate } from './invalidate';
import type { InvalidateFn, TagFns } from './types';
import { assertZodSchema } from './validation';

type Handler<S extends z.ZodType, Out> = (args: {
  input: z.output<S>;
  ctx: { tags: TagFns; invalidate: InvalidateFn };
}) => Promise<Out>;

export function defineAction<S extends z.ZodType, Out>(
  config: {
    name: string;
    input: S;
    handler: Handler<S, Out>;
  },
  opts: {
    tags: TagFns;
    invalidate?: InvalidateFn;
  },
): (payload: z.input<S>) => Promise<Out> {
  assertServerOnly(`defineAction(${config.name})`);
  assertZodSchema(config.name, config.input);

  const tags = opts.tags;
  const invalidate = opts.invalidate ?? createInvalidate();

  return async (payload) => {
    const parsed = config.input.parse(payload);
    return config.handler({ input: parsed, ctx: { tags, invalidate } });
  };
}
