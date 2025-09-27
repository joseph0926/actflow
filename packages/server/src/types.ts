export type TagFns = Record<string, (...args: any[]) => string>;
export type InvalidateFn = (tags: readonly string[]) => Promise<void>;
