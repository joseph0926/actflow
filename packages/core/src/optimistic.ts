export type CommitBehavior = 'keep' | 'remove';

export interface OptimisticManagerOptions<T> {
  read(): T;
  write(next: T): void;
  clone?: (v: T) => T;
  commitBehavior?: CommitBehavior;
  onEvent?: (e: OptimisticEvent<T>) => void;
}

export type PatchFn<T> = (draft: T) => void;

export interface ApplyResult {
  id: string;
  commit(): void;
  rollback(): void;
}

export type OptimisticEvent<T> =
  | { type: 'apply'; id: string; pending: number; state: T }
  | { type: 'commit'; id: string; pending: number; state: T }
  | { type: 'rollback'; id: string; pending: number; state: T }
  | { type: 'compact'; pending: number; state: T };

type Status = 'pending' | 'committed' | 'rolledback';

interface Entry<T> {
  id: string;
  patch: PatchFn<T>;
  status: Status;
}

export function createOptimisticManager<T>(opts: OptimisticManagerOptions<T>): {
  applyPatch: (patch: PatchFn<T>) => ApplyResult;
  debugSize(): number;
  hasBaseline(): boolean;
} {
  const clone = opts.clone ?? defaultClone;
  const commitBehavior = opts.commitBehavior ?? 'keep';
  const onEvent = opts.onEvent ?? (() => {});

  let baseline: T | null = null;
  let entries: Entry<T>[] = [];

  function applyPatch(patch: PatchFn<T>): ApplyResult {
    const id = genId();
    const e: Entry<T> = { id, patch, status: 'pending' };

    if (baseline === null) baseline = clone(opts.read());

    entries.push(e);
    const next = recompute();
    opts.write(next);
    onEvent({ type: 'apply', id, pending: pendingCount(), state: next });

    return {
      id,
      commit() {
        if (!markStatus(id, 'committed')) return;
        const next2 = recompute();
        opts.write(next2);
        onEvent({ type: 'commit', id, pending: pendingCount(), state: next2 });
        compact();
      },
      rollback() {
        if (!markStatus(id, 'rolledback')) return;
        const next2 = recompute();
        opts.write(next2);
        onEvent({ type: 'rollback', id, pending: pendingCount(), state: next2 });
        compact();
      },
    };
  }

  function recompute(): T {
    if (baseline === null) return opts.read();
    const base = clone(baseline);
    for (const e of entries) {
      if (e.status === 'rolledback') continue;
      if (e.status === 'committed' && commitBehavior === 'remove') continue;
      e.patch(base);
    }
    return base;
  }

  function compact(): void {
    if (baseline === null || entries.length === 0) return;

    if (commitBehavior === 'keep') {
      let i = 0;
      const newBase = clone(baseline);

      while (i < entries.length && entries[i].status === 'committed') {
        entries[i].patch(newBase);
        i++;
      }
      if (i > 0) {
        baseline = newBase;
        entries = entries.slice(i);
      }
    }

    entries = entries.filter((e) => e.status !== 'rolledback');

    if (commitBehavior === 'remove') {
      entries = entries.filter((e) => e.status !== 'committed');
    }

    if (entries.length === 0) {
      baseline = null;
      onEvent({ type: 'compact', pending: 0, state: opts.read() });
      return;
    }

    const next = recompute();
    opts.write(next);
    onEvent({ type: 'compact', pending: pendingCount(), state: next });
  }

  function pendingCount(): number {
    return entries.filter((e) => e.status === 'pending').length;
  }

  function markStatus(id: string, status: Status): boolean {
    const e = entries.find((x) => x.id === id);
    if (!e) return false;
    e.status = status;
    return true;
  }

  return {
    applyPatch,

    debugSize(): number {
      return entries.length;
    },

    hasBaseline(): boolean {
      return baseline !== null;
    },
  };
}

function defaultClone<T>(v: T): T {
  const sc = globalThis.structuredClone;
  if (typeof sc === 'function') return sc(v);
  return JSON.parse(JSON.stringify(v)) as T;
}

let _id = 0;
function genId(): string {
  _id += 1;
  return `opt:${_id}`;
}
