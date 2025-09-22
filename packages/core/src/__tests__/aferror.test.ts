import { describe, expect, it } from 'vitest';

import {
  abort,
  AFErrorException,
  asAFError,
  getAFError,
  isAFErrorShape,
  isAFErrorStrict,
  isRetryable,
  throwAF,
} from '../aferror';
import { InvalidArgumentError } from '../errors';

class HttpErr extends Error {
  constructor(
    public status: number,
    msg?: string,
  ) {
    super(msg ?? `HTTP ${status}`);
  }
}
class AxiosErr extends Error {
  constructor(
    public response: { status: number },
    msg?: string,
  ) {
    super(msg ?? `Axios`);
  }
}
class PrismaErr extends Error {
  code = 'P2002' as const;
  constructor(msg?: string) {
    super(msg ?? 'Unique constraint failed');
  }
}
class NetErr extends Error {
  constructor(
    public code: string,
    msg?: string,
  ) {
    super(msg ?? code);
  }
}

describe('AFError — shape/strict basics', () => {
  it('isAFErrorShape true', () => {
    const ok = { kind: 'server', message: 'Server error', status: 500 };
    const bad = { kind: 'server', status: 500 };
    expect(isAFErrorShape(ok)).toBe(true);
    expect(isAFErrorShape(bad)).toBe(false);
  });

  it('isAFErrorStrict: kind', () => {
    const serverOk = { kind: 'server', message: 'x', status: 500 };
    const serverBad = { kind: 'server', message: 'x', status: '500' } as any;
    expect(isAFErrorStrict(serverOk)).toBe(true);
    expect(isAFErrorStrict(serverBad)).toBe(false);

    const auth401 = { kind: 'auth', message: 'x', status: 401 };
    const authEmpty = { kind: 'auth', message: 'x' };
    expect(isAFErrorStrict(auth401)).toBe(true);
    expect(isAFErrorStrict(authEmpty)).toBe(true);
  });
});

describe('AFError — asAFError normalizes unknown', () => {
  it('HTTP 500 → server 500', () => {
    const af = asAFError(new HttpErr(500));
    expect(af.kind).toBe('server');
    expect(af.status).toBe(500);
  });

  it('Axios response.status=409 → conflict(HTTP_409)', () => {
    const af = asAFError(new AxiosErr({ status: 409 }));
    expect(af.kind).toBe('conflict');
    expect(af.reason).toBe('HTTP_409');
    expect(af.status).toBe(409);
  });

  it('Prisma P2002 → conflict(UNIQUE_CONSTRAINT)', () => {
    const af = asAFError(new PrismaErr());
    expect(af.kind).toBe('conflict');
    expect(af.reason).toBe('UNIQUE_CONSTRAINT');
  });

  it('ECONNRESET → network(CONNRESET)', () => {
    const af = asAFError(new NetErr('ECONNRESET'));
    expect(af.kind).toBe('network');
    expect(af.reason).toBe('CONNRESET');
    expect(isRetryable(af)).toBe(true);
  });

  it('InvalidArgumentError → internal', () => {
    const err = new InvalidArgumentError('INVALID_ARG', '');
    console.log('1', err.code);

    const af = asAFError(err);
    expect(af.kind).toBe('internal');
    expect(af.code).toBe('INVALID_ARG');
  });
});

describe('AFError — exception helpers', () => {
  it('throwAF/getAFError/AFErrorException roundtrip', async () => {
    try {
      throwAF(new HttpErr(503));
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(AFErrorException);
      const af = getAFError(e);
      expect(af.kind).toBe('server');
      expect(af.status).toBe(503);
    }
  });

  it('abort() → cancelled', () => {
    try {
      abort('stop');
      expect.unreachable();
    } catch (e) {
      const af = getAFError(e);
      expect(af.kind).toBe('cancelled');
      expect(af.message).toBe('Cancelled');
    }
  });
});

describe('AFError — retry policy', () => {
  it('server 500/503/504/429/408 → retryable', () => {
    for (const s of [500, 503, 504, 429, 408] as const) {
      const af = asAFError(new HttpErr(s));
      expect(isRetryable(af)).toBe(true);
    }
  });
  it('server 400/404 → not retryable', () => {
    for (const s of [400, 404] as const) {
      const af = asAFError(new HttpErr(s));
      expect(isRetryable(af)).toBe(false);
    }
  });
});
