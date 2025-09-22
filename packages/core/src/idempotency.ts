import { InvalidArgumentError } from './errors';
import { isPlainObject } from './utils';

export interface IdempotencyKeyOptions {
  prefix?: string;
  namespace?: string;
}

type JSONLike =
  | null
  | boolean
  | number
  | string
  | bigint
  | Date
  | Uint8Array
  | ArrayBuffer
  | JSONLike[]
  | { [k: string]: JSONLike };

export function stableStringify(value: unknown): string {
  const seen = new WeakSet();
  const normalized = normalize(value as JSONLike, seen);

  return JSON.stringify(normalized);
}

export function makeIdempotencyKey(parts: unknown[], opts: IdempotencyKeyOptions = {}): string {
  if (!Array.isArray(parts) || parts.length === 0) {
    throw new InvalidArgumentError('IDEMP_EMPTY', 'parts must be a non-empty array');
  }
  const prefix = opts.prefix ?? 'idem:';
  const payload = { v: 1, ns: opts.namespace ?? '', parts };
  const json = stableStringify(payload);
  const hex = sha1Hex(json);
  return `${prefix}${hex}`;
}

function normalize(value: JSONLike, seen: WeakSet<object>): unknown {
  if (value === null) return null;
  const t = typeof value;
  if (t === 'boolean' || t === 'string') return value;
  if (t === 'number') return Number.isFinite(value as number) ? (value as number) : null;
  if (t === 'bigint') return { $bigint: (value as bigint).toString() };

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return { $date: 'InvalidDate' };
    }
    return { $date: value.toISOString() };
  }

  if (value instanceof ArrayBuffer) {
    return { $binary: base64FromU8(new Uint8Array(value)) };
  }
  if (value instanceof Uint8Array) {
    return { $binary: base64FromU8(value) };
  }

  if (Array.isArray(value)) {
    return value.map((v) => {
      if (typeof v === 'undefined' || typeof v === 'function' || typeof v === 'symbol') return null;
      return normalize(v, seen);
    });
  }

  if (isPlainObject(value)) {
    if (seen.has(value)) {
      throw new InvalidArgumentError('IDEMP_CIRCULAR', 'circular structure detected');
    }
    seen.add(value);
    const out: Record<string, unknown> = {};
    const keys = Object.keys(value).sort();
    for (const k of keys) {
      const v = (value as Record<string, unknown>)[k];
      if (typeof v === 'undefined' || typeof v === 'function' || typeof v === 'symbol') {
        continue;
      }
      out[k] = normalize(v as JSONLike, seen);
    }
    return out;
  }

  const name =
    typeof value === 'object'
      ? (() => {
          const tag = (value as { [Symbol.toStringTag]?: string })[Symbol.toStringTag];
          if (tag) return `[object ${tag}]`;
          const ctor = (value as { constructor?: { name?: string } }).constructor;
          return `[object ${ctor?.name ?? 'Object'}]`;
        })()
      : typeof value;
  throw new InvalidArgumentError(
    'IDEMP_UNSUPPORTED_TYPE',
    `unsupported type for stringify: ${name}`,
  );
}

function base64FromU8(u8: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(u8).toString('base64');
  }

  let s = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < u8.length; i += CHUNK) {
    s += String.fromCharCode(...u8.subarray(i, i + CHUNK));
  }

  return btoa(s);
}

function sha1Hex(input: string): string {
  const bytes = utf8(input);
  const words = bytesToWords(bytes);
  const bitLen = bytes.length * 8;

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  words[bitLen >> 5] |= 0x80 << (24 - (bitLen % 32));
  words[(((bitLen + 64) >> 9) << 4) + 15] = bitLen;

  const w = new Array<number>(80);
  for (let i = 0; i < words.length; i += 16) {
    for (let t = 0; t < 80; t++) {
      if (t < 16) w[t] = words[i + t] | 0;
      else w[t] = rol(w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16], 1);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let t = 0; t < 80; t++) {
      let f: number, k: number;
      if (t < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (t < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (t < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const temp = (rol(a, 5) + f + e + k + w[t]) | 0;
      e = d;
      d = c;
      c = rol(b, 30);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
  }

  return [h0, h1, h2, h3, h4].map(toHex32).join('');
}

function utf8(s: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s);
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) {
    let c = s.charCodeAt(i);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) {
      out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c < 0xd800 || c >= 0xe000) {
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    } else {
      i++;

      c = 0x10000 + (((c & 0x3ff) << 10) | (s.charCodeAt(i) & 0x3ff));
      out.push(
        0xf0 | (c >> 18),
        0x80 | ((c >> 12) & 0x3f),
        0x80 | ((c >> 6) & 0x3f),
        0x80 | (c & 0x3f),
      );
    }
  }
  return new Uint8Array(out);
}

function bytesToWords(bytes: Uint8Array): number[] {
  const words: number[] = [];
  for (let i = 0; i < bytes.length; i++) {
    words[i >> 2] = (words[i >> 2] || 0) | (bytes[i] << (24 - (i % 4) * 8));
  }
  return words;
}

function rol(n: number, bits: number): number {
  return ((n << bits) | (n >>> (32 - bits))) >>> 0;
}

function toHex32(n: number): string {
  return (n >>> 0).toString(16).padStart(8, '0');
}
