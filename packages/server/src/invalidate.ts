import type { InvalidateFn } from './types';

export function assertServerOnly(where: string): void {
  if (typeof globalThis.window !== 'undefined') {
    throw new Error(
      `[actflow] ${where} is server-only. Move this call into a "use server" module.`,
    );
  }
}

const NEXT_CACHE_MODULE: string = 'next/cache';

type NextCacheLike = { revalidateTag: (tag: string) => Promise<void> };

function hasRevalidateTag(m: unknown): m is NextCacheLike {
  return !!m && typeof (m as { revalidateTag?: unknown }).revalidateTag === 'function';
}

let cached: NextCacheLike | null = null;

export function createInvalidate(): InvalidateFn {
  assertServerOnly('invalidate');

  return async (tags) => {
    if (!cached) {
      const mod: unknown = await import(NEXT_CACHE_MODULE).catch(() => null);

      if (!hasRevalidateTag(mod)) {
        throw new Error(
          '[actflow] Next runtime not detected or "next/cache" is unavailable. ' +
            'Use this in a Next app or inject a custom `invalidate` via defineAction(..., { invalidate }).',
        );
      }

      cached = mod;
    }

    const c = cached;
    await Promise.all(tags.map((t) => c.revalidateTag(t)));
  };
}
