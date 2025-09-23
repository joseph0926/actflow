import { describe, expect, it } from 'vitest';

import { asAFError } from '../aferror';
import { backoffSchedule, exponentialBackoff } from '../backoff';
import { InvalidArgumentError } from '../errors';

describe('exponentialBackoff - jitter:none', () => {
  it('should increase exponentially.', () => {
    const baseMs = 200;
    const factor = 2;
    const jitter = 'none';

    const values = [1, 2, 3, 4].map((attempt) =>
      exponentialBackoff({ attempt, baseMs, factor, jitter }),
    );
    expect(values).toEqual([200, 400, 800, 1600]);
  });

  it('should when the raw value exceeds the upper limit, it must be restricted to the maximum value.', () => {
    const v = exponentialBackoff({
      attempt: 4,
      baseMs: 1000,
      factor: 10,
      maxMs: 30_000,
      jitter: 'none',
    });
    expect(v).toBe(30_000);
  });

  it('sholud always returns an integer number of milliseconds (rounded)', () => {
    const v = exponentialBackoff({
      attempt: 2,
      baseMs: 1.2,
      factor: 2,
      jitter: 'none',
    });
    expect(Number.isInteger(v)).toBe(true);
    expect(v).toBe(2);
  });
});

const rng = (v: number) => ({ random: () => v });

describe('exponentialBackoff - jitter:half or full', () => {
  it('should full jitter: returns round(capped * r)', () => {
    const baseMs = 200;
    const factor = 2;
    const attempt = 1;

    expect(exponentialBackoff({ attempt, baseMs, factor, jitter: 'full' }, rng(0))).toBe(0);
    expect(exponentialBackoff({ attempt, baseMs, factor, jitter: 'full' }, rng(0.42))).toBe(84);
    expect(exponentialBackoff({ attempt, baseMs, factor, jitter: 'full' }, rng(1))).toBe(200);
  });

  it('should half jitter: returns round(min + (capped - min) * r), min = 0.5 * capped', () => {
    const baseMs = 200;
    const factor = 2;
    const attempt = 3;

    expect(exponentialBackoff({ attempt, baseMs, factor, jitter: 'half' }, rng(0))).toBe(400);
    expect(exponentialBackoff({ attempt, baseMs, factor, jitter: 'half' }, rng(0.42))).toBe(568);
    expect(exponentialBackoff({ attempt, baseMs, factor, jitter: 'half' }, rng(1))).toBe(800);
  });

  it('should even if r is NaN/negative and greater than 1, it is corrected to 0..1.', () => {
    const baseMs = 200,
      factor = 2,
      attempt = 2;

    expect(
      exponentialBackoff({ attempt, baseMs, factor, jitter: 'full' }, { random: () => NaN }),
    ).toBe(0);
    expect(exponentialBackoff({ attempt, baseMs, factor, jitter: 'full' }, rng(-0.5))).toBe(0);
    expect(exponentialBackoff({ attempt, baseMs, factor, jitter: 'full' }, rng(1.7))).toBe(400);
  });

  it('should fractional result becomes an integer ms using Math.round.', () => {
    const baseMs = 999;
    const factor = 2;
    const attempt = 1;

    expect(exponentialBackoff({ attempt, baseMs, factor, jitter: 'full' }, rng(0.501))).toBe(500);
    expect(exponentialBackoff({ attempt, baseMs, factor, jitter: 'half' }, rng(0.501))).toBe(750);
  });
});

describe('exponentialBackoff: invalid options throw InvalidArgumentError', () => {
  it('attempt must be positive finite', () => {
    expect(() => exponentialBackoff({ attempt: 0 })).toThrowError(InvalidArgumentError);
    try {
      exponentialBackoff({ attempt: 0 });
    } catch (e) {
      const err = e as InvalidArgumentError;
      expect(err.code).toBe('BACKOFF_INVALID_ATTEMPT');

      const af = asAFError(err);
      expect(af.kind).toBe('internal');
    }
  });

  it('baseMs must be > 0', () => {
    expect(() => exponentialBackoff({ attempt: 1, baseMs: 0 })).toThrowError(InvalidArgumentError);
    try {
      exponentialBackoff({ attempt: 1, baseMs: 0 });
    } catch (e) {
      expect((e as InvalidArgumentError).code).toBe('BACKOFF_INVALID_BASE');
    }
  });

  it('factor must be >= 1', () => {
    expect(() => exponentialBackoff({ attempt: 1, factor: 0.9 })).toThrowError(
      InvalidArgumentError,
    );
    try {
      exponentialBackoff({ attempt: 1, factor: 0.9 });
    } catch (e) {
      expect((e as InvalidArgumentError).code).toBe('BACKOFF_INVALID_FACTOR');
    }
  });

  it('maxMs must be > 0', () => {
    expect(() => exponentialBackoff({ attempt: 1, maxMs: 0 })).toThrowError(InvalidArgumentError);
    try {
      exponentialBackoff({ attempt: 1, maxMs: 0 });
    } catch (e) {
      expect((e as InvalidArgumentError).code).toBe('BACKOFF_INVALID_MAX');
    }
  });

  it('baseMs cannot be greater than maxMs', () => {
    expect(() => exponentialBackoff({ attempt: 1, baseMs: 5000, maxMs: 1000 })).toThrowError(
      InvalidArgumentError,
    );
    try {
      exponentialBackoff({ attempt: 1, baseMs: 5000, maxMs: 1000 });
    } catch (e) {
      expect((e as InvalidArgumentError).code).toBe('BACKOFF_BASE_GT_MAX');
    }
  });
});

describe('backoffSchedule: count validation and output', () => {
  it('count must be an integer', () => {
    expect(() => backoffSchedule(1.1)).toThrowError(InvalidArgumentError);
    try {
      backoffSchedule(1.1);
    } catch (e) {
      expect((e as InvalidArgumentError).code).toBe('SCHEDULE_INVALID_COUNT');
    }
  });

  it('count must be non-negative', () => {
    expect(() => backoffSchedule(-1)).toThrowError(InvalidArgumentError);
    try {
      backoffSchedule(-1);
    } catch (e) {
      expect((e as InvalidArgumentError).code).toBe('SCHEDULE_NEGATIVE_COUNT');
    }
  });

  it('count must be <= 100', () => {
    expect(() => backoffSchedule(101)).toThrowError(InvalidArgumentError);
    try {
      backoffSchedule(101);
    } catch (e) {
      expect((e as InvalidArgumentError).code).toBe('SCHEDULE_TOO_LARGE');
    }
  });

  it('count=0 returns empty array', () => {
    expect(backoffSchedule(0, { jitter: 'none' })).toEqual([]);
  });

  it('produces deterministic sequence with jitter:none', () => {
    expect(backoffSchedule(5, { baseMs: 100, factor: 2, jitter: 'none' })).toEqual([
      100, 200, 400, 800, 1600,
    ]);
  });
});
