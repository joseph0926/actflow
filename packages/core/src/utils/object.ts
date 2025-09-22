export function isPlainObject(x: unknown): x is Record<string, unknown> {
  if (typeof x !== 'object' || x === null) return false;
  const proto = Object.getPrototypeOf(x) as object | null;
  return proto === Object.prototype || proto === null;
}
