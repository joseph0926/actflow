import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AFErrorException, getAFError } from '../aferror';
import { defaultShouldRetry, executeWithRetry } from '../retry';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2025, 0, 1, 0, 0, 0));
});
afterEach(() => {
  vi.useRealTimers();
});

describe('executeWithRetry', () => {
  it('resolves on first attempt', async () => {
    const op = vi.fn(async () => Promise.resolve('ok'));
    const p = executeWithRetry(op);
    await expect(p).resolves.toBe('ok');
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('retries on 5xx-like error and succeeds on second attempt', async () => {
    class HttpErr extends Error {
      constructor(public status: number) {
        super(`HTTP ${status}`);
      }
    }
    const op = vi.fn().mockRejectedValueOnce(new HttpErr(503)).mockResolvedValueOnce('ok');

    const p = executeWithRetry(op, { jitter: 'none', baseMs: 100, factor: 2 });
    await vi.runOnlyPendingTimersAsync();
    await expect(p).resolves.toBe('ok');
    expect(op).toHaveBeenCalledTimes(2);
  });

  it('does not retry on 4xx-like error (normalized AFErrorException)', async () => {
    class HttpErr extends Error {
      constructor(public status: number) {
        super(`HTTP ${status}`);
      }
    }
    const op = vi.fn().mockRejectedValue(new HttpErr(400));

    const p = executeWithRetry(op);
    await expect(p).rejects.toBeInstanceOf(AFErrorException);

    try {
      await p;
    } catch (e) {
      const af = getAFError(e);
      expect(af.kind).toBe('server');
      expect((af as { status: number }).status).toBe(400);
    }
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('aborts during sleep and stops further attempts', async () => {
    class HttpErr extends Error {
      constructor(public status: number) {
        super(`HTTP ${status}`);
      }
    }
    const ac = new AbortController();
    const op = vi.fn().mockRejectedValueOnce(new HttpErr(503)).mockResolvedValueOnce('ok');

    const p = executeWithRetry(op, { signal: ac.signal, jitter: 'none', baseMs: 100 });
    const assertion = expect(p).rejects.toBeInstanceOf(AFErrorException);

    ac.abort('stop');
    await assertion;

    try {
      await p;
    } catch (e) {
      const af = getAFError(e);
      expect(af.kind).toBe('cancelled');
    }
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('passes a child AbortSignal to the operation', async () => {
    const ac = new AbortController();
    const op = vi.fn(async ({ signal }: { signal: AbortSignal }) => {
      return new Promise((resolve, reject) => {
        const onAbort = () => {
          reject(new DOMException('aborted', 'AbortError'));
        };
        signal.addEventListener('abort', onAbort, { once: true });
        setTimeout(() => {
          signal.removeEventListener('abort', onAbort);
          resolve('late-ok');
        }, 10);
      });
    });

    const p = executeWithRetry(op, { signal: ac.signal });
    const assertion = expect(p).rejects.toBeInstanceOf(AFErrorException);

    ac.abort('cancel');
    await assertion;

    try {
      await p;
    } catch (e) {
      const af = getAFError(e);
      expect(af.kind).toBe('cancelled');
    }
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('defaultShouldRetry treats common network messages as retryable', () => {
    const err = new TypeError('NetworkError: request failed');
    expect(defaultShouldRetry(err)).toBe(true);
  });
});
