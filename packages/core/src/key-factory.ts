export type KeyAtom = string | number | boolean;
type ParamTuple = readonly string[];
type ArgOf<P extends ParamTuple> = { [K in P[number]]: KeyAtom };

export interface ResourceSpec<P extends ParamTuple | undefined = undefined> {
  key: string;
  params?: P;
  separator?: string;
}

type TagsOf<S extends Record<string, ResourceSpec<any>>> = {
  [K in keyof S]: S[K]['params'] extends ParamTuple
    ? (arg: ArgOf<NonNullable<S[K]['params']>>) => string
    : () => string;
};
type KeysOf<S extends Record<string, ResourceSpec<any>>> = {
  [K in keyof S]: S[K]['params'] extends ParamTuple
    ? (arg: ArgOf<NonNullable<S[K]['params']>>) => readonly [string, ...Array<string | number>]
    : () => readonly [string];
};

const isAtom = (x: unknown): x is KeyAtom =>
  x === true || x === false || typeof x === 'string' || typeof x === 'number';
function toKeyAtom(a: KeyAtom): string | number {
  return typeof a === 'boolean' ? (a ? 1 : 0) : a;
}
function toTagPart(a: KeyAtom): string {
  return String(toKeyAtom(a));
}

/**
 * defineKeyFactory
 * @description tags: server-side invalidation strings (e.g., 'post:123')
 * @description keys: client-side cache keys (e.g., ['post', 123])
 * @example```ts
 * import { defineKeyFactory } from '@actionflow/core';

export const { tags: t, keys: qk } = defineKeyFactory({
  posts: { key: 'posts' },
  post:  { key: 'post', params: ['id'] as const },
} as const);

// t.posts() → 'posts'
// t.post({ id: 'a' }) → 'post:a'
// qk.posts() → ['posts']
// qk.post({ id: 1 }) → ['post', 1]
 * ```
 */
export function defineKeyFactory<
  const S extends Record<string, ResourceSpec<readonly string[] | undefined>>,
>(schema: S): { readonly tags: TagsOf<S>; readonly keys: KeysOf<S> } {
  const tags: Record<string, unknown> = {};
  const keys: Record<string, unknown> = {};

  for (const name of Object.keys(schema)) {
    const { key, params, separator = ':' } = schema[name];

    if (params && params.length > 0) {
      const ps = params;

      tags[name] = (arg: ArgOf<typeof ps>) => {
        const parts = ps.map((p) => {
          const v = arg[p];
          if (!isAtom(v)) {
            throw new Error(
              `Invalid type for param "${p}" in tag "${name}": expected string|number|boolean`,
            );
          }
          return toTagPart(v);
        });
        return [key, ...parts].join(separator);
      };

      keys[name] = (arg: ArgOf<typeof ps>) => {
        const parts = ps.map((p) => {
          const v = arg[p];
          if (!isAtom(v)) {
            throw new Error(
              `Invalid type for param "${p}" in key "${name}": expected string|number|boolean`,
            );
          }
          return toKeyAtom(v);
        });
        return [key, ...parts] as const;
      };
    } else {
      tags[name] = () => key;
      keys[name] = () => [key] as const;
    }
  }

  type Tags = {
    [K in keyof S]: S[K]['params'] extends ParamTuple
      ? (arg: ArgOf<NonNullable<S[K]['params']>>) => string
      : () => string;
  };

  type Keys = {
    [K in keyof S]: S[K]['params'] extends ParamTuple
      ? (arg: ArgOf<NonNullable<S[K]['params']>>) => readonly [string, ...Array<string | number>]
      : () => readonly [string];
  };

  return { tags: tags as Tags, keys: keys as Keys } as const;
}
