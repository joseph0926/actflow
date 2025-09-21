import { beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultShouldRetry, executeWithRetry } from '../retry';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2025, 0, 1, 0, 0, 0));
});

describe('executeWithRetry', () => {
  it('resolves on first attempt', async () => {
    // eslint-disable-next-line
    const op = vi.fn(async () => 'ok');
    const p = executeWithRetry(op);
    vi.runAllTicks();
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

  it('does not retry on 4xx-like error', async () => {
    class HttpErr extends Error {
      constructor(public status: number) {
        super(`HTTP ${status}`);
      }
    }
    const op = vi.fn().mockRejectedValue(new HttpErr(400));
    await expect(executeWithRetry(op)).rejects.toBeInstanceOf(HttpErr);
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

    const promise = executeWithRetry(op, { signal: ac.signal, jitter: 'none', baseMs: 100 });
    const assertion = expect(promise).rejects.toMatchObject({ name: 'AbortError' });

    ac.abort('stop');
    await vi.runOnlyPendingTimersAsync();

    await assertion;
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

    const promise = executeWithRetry(op, { signal: ac.signal });
    const assertion = expect(promise).rejects.toMatchObject({ name: 'AbortError' });

    ac.abort('cancel');
    await assertion;
    vi.runOnlyPendingTimersAsync();
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('defaultShouldRetry treats common network messages as retryable', () => {
    const err = new TypeError('NetworkError: request failed');
    expect(defaultShouldRetry(err)).toBe(true);
  });
});
