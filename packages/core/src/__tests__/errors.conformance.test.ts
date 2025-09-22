import { describe, expect, it } from 'vitest';

import { AFErrorException, getAFError } from '../aferror';
import { executeWithRetry } from '../retry';

describe('Public boundary always throws AFErrorException for runtime failures', () => {
  it('4xx → AFErrorException(server)', async () => {
    class HttpErr extends Error {
      constructor(public status: number) {
        super(`HTTP ${status}`);
      }
    }
    const p = executeWithRetry(
      async () => {
        throw new HttpErr(400);
      },
      { maxRetries: 0 },
    );
    await expect(p).rejects.toBeInstanceOf(AFErrorException);
    try {
      await p;
    } catch (e) {
      const af = getAFError(e);
      expect(af.kind).toBe('server');
      expect((af as { status: number }).status).toBe(400);
    }
  });

  it('retry exhaustion → rethrow last error normalized', async () => {
    class HttpErr extends Error {
      constructor(public status: number) {
        super(`HTTP ${status}`);
      }
    }
    const p = executeWithRetry(
      async () => {
        throw new HttpErr(503);
      },
      { maxRetries: 1, jitter: 'none' },
    );
    await expect(p).rejects.toBeInstanceOf(AFErrorException);
    try {
      await p;
    } catch (e) {
      const af = getAFError(e);
      expect(af.kind).toBe('server');
      expect((af as { status: number }).status).toBe(503);
    }
  });

  it('pre-aborted signal → AFErrorException(cancelled)', async () => {
    const ac = new AbortController();
    ac.abort('pre');
    const p = executeWithRetry(async () => 'never', { signal: ac.signal });
    await expect(p).rejects.toBeInstanceOf(AFErrorException);
    try {
      await p;
    } catch (e) {
      const af = getAFError(e);
      expect(af.kind).toBe('cancelled');
    }
  });

  it('op throws AbortError → AFErrorException(cancelled)', async () => {
    const p = executeWithRetry(
      async () => {
        throw new DOMException('aborted', 'AbortError');
      },
      { maxRetries: 0 },
    );
    await expect(p).rejects.toBeInstanceOf(AFErrorException);
    try {
      await p;
    } catch (e) {
      const af = getAFError(e);
      expect(af.kind).toBe('cancelled');
    }
  });
});
