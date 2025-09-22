export function isPlainObject(x: unknown): x is Record<string, unknown> {
  if (typeof x !== 'object' || x === null) return false;
  const proto = Object.getPrototypeOf(x) as object | null;
  return proto === Object.prototype || proto === null;
}

export function isSomeError(e: unknown, name: string): boolean {
  return typeof e === 'object' && e !== null && (e as { name: string }).name === name;
}
