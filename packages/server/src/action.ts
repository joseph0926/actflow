import type { z } from 'zod';

import { assertServerOnly, createInvalidate } from './invalidate';
import type { InvalidateFn, TagFns } from './types';
import { assertZodSchema } from './validation';

type Handler<S extends z.ZodType, Out, TTags extends TagFns> = (args: {
  input: z.output<S>;
  ctx: { tags: Readonly<TTags>; invalidate: InvalidateFn };
}) => Promise<Out>;

/**
 * Defines a **server-only** action with Zod input validation.
 * Accepts the action config and explicit context options (`tags`, optional `invalidate`),
 * returning a callable `(payload) => Promise<Out>`.
 *
 * @param config.name - Unique action name for debugging/observability.
 * @param config.input - Zod schema used to parse/validate the payload.
 * @param config.handler - Async function that receives parsed `input` and `{ tags, invalidate }`.
 * @param opts.tags - Tag function map injected into `ctx.tags`.
 * @param opts.invalidate - Optional invalidation function. Defaults to Next's `revalidateTag` adapter.
 *
 * @example
 * import { z } from 'zod';
 * import { defineAction } from '@actflow/server';
 * import { t } from './tags'; // from defineKeyFactory(...)
 *
 * export const createPost = defineAction(
 *   {
 *     name: 'post.create',
 *     input: z.object({ title: z.string().min(1), body: z.string().min(1) }),
 *     handler: async ({ input, ctx }) => {
 *       const row = await db.post.create({ data: input });
 *       await ctx.invalidate([ctx.tags.posts(), ctx.tags.post({ id: row.id })]);
 *       return row;
 *     },
 *   },
 *   { tags: t }
 * );
 */
export function defineAction<S extends z.ZodType, Out, TTags extends TagFns>(
  config: {
    name: string;
    input: S;
    handler: Handler<S, Out, TTags>;
  },
  opts: {
    tags: TTags;
    invalidate?: InvalidateFn;
  },
): (payload: z.input<S>) => Promise<Out> {
  assertServerOnly(`defineAction(${config.name})`);
  assertZodSchema(config.name, config.input);

  const tags = opts.tags as Readonly<TTags>;
  const invalidate = opts.invalidate ?? createInvalidate();

  return async (payload) => {
    const parsed = config.input.parse(payload);
    return config.handler({ input: parsed, ctx: { tags, invalidate } });
  };
}

/**
 * Binds a tag schema (and optional invalidator) once, and returns a factory
 * to define **server-only** actions without repeating `{ tags }`.
 * The resulting actions have fully inferred `ctx.tags` (autocompletion-safe).
 *
 * @param base.tags - Tag function map to inject into every action's `ctx.tags`.
 * @param base.invalidate - Optional default invalidation function.
 *
 * @example
 * import { z } from 'zod';
 * import { defineActionWithTags } from '@actflow/server';
 * import { t } from './tags';
 *
 * const act = defineActionWithTags({ tags: t });
 *
 * export const deletePost = act({
 *   name: 'post.delete',
 *   input: z.object({ id: z.string().uuid() }),
 *   handler: async ({ input, ctx }) => {
 *     await db.post.delete({ where: { id: input.id } });
 *     await ctx.invalidate([ctx.tags.posts()]);
 *     return { ok: true };
 *   },
 * });
 */
export function defineActionWithTags<TTags extends TagFns>(base: {
  tags: TTags;
  invalidate?: InvalidateFn;
}) {
  assertServerOnly('defineActionWithTags');
  const frozen = base.tags as Readonly<TTags>;

  return function make<S extends z.ZodType, Out>(
    config: {
      name: string;
      input: S;
      handler: Handler<S, Out, TTags>;
    },
    local?: { invalidate?: InvalidateFn },
  ) {
    return defineAction<S, Out, TTags>(config, {
      tags: frozen,
      invalidate: local?.invalidate ?? base.invalidate,
    });
  };
}
