import { describe, expect, it } from 'vitest';

import { InvalidArgumentError } from '../errors';
import { makeIdempotencyKey, stableStringify } from '../idempotency';

describe('stableStringify', () => {
  it('sorts object keys deterministically', () => {
    const a = { x: 1, y: 2 };
    const b = { y: 2, x: 1 };
    expect(stableStringify(a)).toBe(stableStringify(b));
  });

  it('handles nested arrays/objects with key order normalization', () => {
    const a = [
      { a: 1, b: 2 },
      { d: 4, c: 3 },
    ];
    const b = [
      { b: 2, a: 1 },
      { c: 3, d: 4 },
    ];
    expect(stableStringify(a)).toBe(stableStringify(b));
  });

  it('encodes Date/BigInt/Uint8Array specially', () => {
    const d = new Date('2020-01-01T00:00:00.000Z');
    const u8 = new Uint8Array([1, 2, 3]);
    const s = stableStringify({ d, n: 10n, u8 });
    expect(s).toContain('"$date":"2020-01-01T00:00:00.000Z"');
    expect(s).toContain('"$bigint":"10"');
    expect(s).toContain('"$binary"');
  });

  it('throws on circular structures', () => {
    const x: any = { a: 1 };
    x.self = x;
    expect(() => stableStringify(x)).toThrow(InvalidArgumentError);
  });

  it('throws on unsupported types', () => {
    expect(() => stableStringify(new Map())).toThrow(InvalidArgumentError);
  });

  it('shows readable tag for unsupported types', () => {
    expect(() => stableStringify(new Map())).toThrowError(
      /unsupported type for stringify: \[object Map\]/,
    );
    expect(() => stableStringify(new Set())).toThrowError(
      /unsupported type for stringify: \[object Set\]/,
    );
  });
});

describe('makeIdempotencyKey', () => {
  it('returns fixed-length key (prefix + 40 hex)', () => {
    const k = makeIdempotencyKey([{ a: 1 }, 'foo']);
    expect(k).toMatch(/^idem:[0-9a-f]{40}$/);
  });

  it('same logical payload → same key, regardless of key order', () => {
    const k1 = makeIdempotencyKey([{ a: 1, b: 2 }, 'foo']);
    const k2 = makeIdempotencyKey([{ b: 2, a: 1 }, 'foo']);
    expect(k1).toBe(k2);
  });

  it('namespace changes the key space', () => {
    const a = makeIdempotencyKey([{ a: 1 }], { namespace: 'A' });
    const b = makeIdempotencyKey([{ a: 1 }], { namespace: 'B' });
    expect(a).not.toBe(b);
  });

  it('requires non-empty parts', () => {
    expect(() => makeIdempotencyKey([])).toThrow(InvalidArgumentError);
  });
});
