import { AFErrorException, asAFError } from './aferror';

export type DedupeMode = 'byKey' | 'latestWins' | 'none';

interface Entry {
  controller: AbortController;
  promise: Promise<unknown>;
}

export class InFlightRegistry {
  private readonly entries = new Map<string, Entry>();

  isInFlight(key: string): boolean {
    return this.entries.has(key);
  }

  size(): number {
    return this.entries.size;
  }

  run<T>(
    key: string,
    op: (ctx: { signal: AbortSignal }) => Promise<T>,
    options: { mode?: DedupeMode; signal?: AbortSignal } = {},
  ): Promise<T> {
    const mode = options.mode ?? 'byKey';
    const parent = options.signal;

    const existing = this.entries.get(key);
    if (mode === 'byKey' && existing) {
      return join<T>(existing.promise as Promise<T>, parent);
    }
    if (mode === 'latestWins' && existing) {
      existing.controller.abort('replaced');
      this.entries.delete(key);
    }

    const controller = new AbortController();
    const unlink = linkSignals(parent, controller);

    const p = (async () => {
      try {
        return await op({ signal: controller.signal });
      } catch (e) {
        throw new AFErrorException(asAFError(e));
      } finally {
        unlink();
      }
    })();

    const wrapped = p.catch((e: unknown) => {
      if (e instanceof AFErrorException) throw e;
      throw new AFErrorException(asAFError(e));
    });

    this.entries.set(key, { controller, promise: wrapped });

    wrapped
      .finally(() => {
        const e = this.entries.get(key);
        if (e && e.promise === wrapped) this.entries.delete(key);
      })
      .catch(() => {
        /* no-op */
      });

    return join<T>(wrapped, parent);
  }
}

function linkSignals(parent: AbortSignal | undefined, child: AbortController): () => void {
  if (!parent) return () => {};
  const onAbort = (): void => {
    child.abort(parent.reason);
  };
  parent.addEventListener('abort', onAbort, { once: true });
  if (parent.aborted) child.abort(parent.reason);
  return () => {
    parent.removeEventListener('abort', onAbort);
  };
}

function join<T>(underlying: Promise<T>, caller?: AbortSignal): Promise<T> {
  if (!caller) return underlying;
  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => {
      reject(
        new AFErrorException({
          kind: 'cancelled',
          reason: String(caller.reason ?? 'Aborted'),
          message: '',
        }),
      );
    };
    if (caller.aborted) {
      onAbort();
      return;
    }
    caller.addEventListener('abort', onAbort, { once: true });
    underlying.then(
      (v) => {
        caller.removeEventListener('abort', onAbort);
        resolve(v);
      },
      (e: unknown) => {
        caller.removeEventListener('abort', onAbort);
        reject(e instanceof AFErrorException ? e : new AFErrorException(asAFError(e)));
      },
    );
  });
}
