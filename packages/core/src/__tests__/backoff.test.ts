import { describe, expect, it } from 'vitest';

import { type BackoffRuntime, backoffSchedule, exponentialBackoff } from '../backoff';
import { InvalidArgumentError } from '../errors';

const rng = (v: number): BackoffRuntime => ({ random: () => v });

describe('exponentialBackoff', () => {
  it('throws on invalid attempt/base/factor/maxMs', () => {
    expect(() => exponentialBackoff({ attempt: 0, jitter: 'none' })).toThrow(InvalidArgumentError);
    expect(() => exponentialBackoff({ attempt: 1, baseMs: 0, jitter: 'none' })).toThrow(
      InvalidArgumentError,
    );
    expect(() => exponentialBackoff({ attempt: 1, factor: 0.5, jitter: 'none' })).toThrow(
      InvalidArgumentError,
    );
    expect(() => exponentialBackoff({ attempt: 1, maxMs: 0, jitter: 'none' })).toThrow(
      InvalidArgumentError,
    );
    expect(() =>
      exponentialBackoff({ attempt: 1, baseMs: 200, maxMs: 100, jitter: 'none' }),
    ).toThrow(InvalidArgumentError);
  });

  it('scales by factor and respects cap without jitter', () => {
    expect(
      exponentialBackoff({ attempt: 1, baseMs: 100, factor: 2, maxMs: 10_000, jitter: 'none' }),
    ).toBe(100);
    expect(
      exponentialBackoff({ attempt: 2, baseMs: 100, factor: 2, maxMs: 10_000, jitter: 'none' }),
    ).toBe(200);
    expect(
      exponentialBackoff({ attempt: 3, baseMs: 100, factor: 2, maxMs: 10_000, jitter: 'none' }),
    ).toBe(400);
    expect(
      exponentialBackoff({ attempt: 10, baseMs: 1_000, factor: 2, maxMs: 5_000, jitter: 'none' }),
    ).toBe(5_000);
  });

  it('scales by factor and respects cap without jitter', () => {
    expect(
      exponentialBackoff({
        attempt: 1,
        baseMs: 100,
        factor: 2,
        maxMs: 10_000,
        jitter: 'none',
      }),
    ).toBe(100);
    expect(
      exponentialBackoff({
        attempt: 2,
        baseMs: 100,
        factor: 2,
        maxMs: 10_000,
        jitter: 'none',
      }),
    ).toBe(200);
    expect(
      exponentialBackoff({
        attempt: 3,
        baseMs: 100,
        factor: 2,
        maxMs: 10_000,
        jitter: 'none',
      }),
    ).toBe(400);

    expect(
      exponentialBackoff({
        attempt: 10,
        baseMs: 1_000,
        factor: 2,
        maxMs: 5_000,
        jitter: 'none',
      }),
    ).toBe(5_000);
  });

  it('applies full jitter in [0..delay]', () => {
    expect(
      exponentialBackoff(
        { attempt: 3, baseMs: 100, factor: 2, maxMs: 10_000, jitter: 'full' },
        rng(0),
      ),
    ).toBe(0);
    expect(
      exponentialBackoff(
        { attempt: 3, baseMs: 100, factor: 2, maxMs: 10_000, jitter: 'full' },
        rng(0.5),
      ),
    ).toBe(200);
  });

  it('applies half jitter in [0.5..1] of delay', () => {
    expect(
      exponentialBackoff(
        { attempt: 3, baseMs: 100, factor: 2, maxMs: 10_000, jitter: 'half' },
        rng(0),
      ),
    ).toBe(200);
    expect(
      exponentialBackoff(
        { attempt: 3, baseMs: 100, factor: 2, maxMs: 10_000, jitter: 'half' },
        rng(1),
      ),
    ).toBe(400);
  });
});

describe('backoffSchedule', () => {
  it('throws on invalid count', () => {
    expect(() => backoffSchedule(1.5)).toThrow(InvalidArgumentError);
    expect(() => backoffSchedule(-1)).toThrow(InvalidArgumentError);
    expect(() => backoffSchedule(101)).toThrow(InvalidArgumentError);
  });

  it('builds a sequence for given retry count', () => {
    expect(backoffSchedule(3, { baseMs: 100, factor: 2, jitter: 'none' })).toEqual([100, 200, 400]);
  });
});
