import { describe, expect, it, vi } from 'vitest';

import { InFlightRegistry } from '../inflight';

function deferred<T = void>() {
  let resolve!: (v: T) => void;
  let reject!: (e?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('InFlightRegistry', () => {
  it('dedupes concurrent calls with mode=byKey (joins same promise)', async () => {
    const reg = new InFlightRegistry();
    const d = deferred<string>();
    let calls = 0;

    const op = vi.fn(async () => {
      calls += 1;
      return d.promise;
    });

    const p1 = reg.run('k', op, { mode: 'byKey' });
    const p2 = reg.run('k', op, { mode: 'byKey' });
    const p3 = reg.run('k', op, { mode: 'byKey' });
    expect(reg.isInFlight('k')).toBe(true);

    d.resolve('OK');
    await expect(Promise.all([p1, p2, p3])).resolves.toEqual(['OK', 'OK', 'OK']);
    expect(calls).toBe(1);
    expect(reg.isInFlight('k')).toBe(false);
  });

  it('latestWins aborts previous and runs the new operation', async () => {
    const reg = new InFlightRegistry();

    const never = ({ signal }: { signal: AbortSignal }) =>
      new Promise((_res, rej) => {
        const onAbort = () => {
          rej(new DOMException('aborted', 'AbortError'));
        };
        signal.addEventListener('abort', onAbort, { once: true });
      });

    const p1 = reg.run('k', never, { mode: 'latestWins' });
    const p1Assert = expect(p1).rejects.toMatchObject({ name: 'AbortError' });

    // eslint-disable-next-line @typescript-eslint/require-await
    const op2 = vi.fn(async () => 'B');
    const p2 = reg.run('k', op2, { mode: 'latestWins' });

    await p1Assert;
    await expect(p2).resolves.toBe('B');
    expect(op2).toHaveBeenCalledTimes(1);
  });

  it('caller abort on join does not cancel underlying op (mode=byKey)', async () => {
    const reg = new InFlightRegistry();
    const d = deferred<string>();
    const op = vi.fn(async () => d.promise);

    const p1 = reg.run('k', op, { mode: 'byKey' });

    const ac = new AbortController();
    const p2 = reg.run('k', op, { mode: 'byKey', signal: ac.signal });
    const p2Assert = expect(p2).rejects.toMatchObject({ name: 'AbortError' });
    ac.abort('joiner-cancel');

    d.resolve('OK');
    await expect(p1).resolves.toBe('OK');
    await p2Assert;
    expect(op).toHaveBeenCalledTimes(1);
  });
});
