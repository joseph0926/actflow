import { describe, expect, it } from 'vitest';

import { createOptimisticManager } from '../optimistic';

type Post = { id: number };
interface State {
  posts: Post[];
}

function createStore(initial: State) {
  let state = initial;
  return {
    read: () => state,
    write: (next: State) => {
      state = next;
    },
    get: () => state,
  };
}

describe('OptimisticManager', () => {
  it('applies a single patch and keeps it on commit by default', () => {
    const store = createStore({ posts: [{ id: 1 }] });
    const mgr = createOptimisticManager<State>({ read: store.read, write: store.write });

    const h = mgr.applyPatch((d) => {
      d.posts.unshift({ id: 2 });
    });
    expect(store.get().posts.map((p) => p.id)).toEqual([2, 1]);

    h.commit();
    expect(store.get().posts.map((p) => p.id)).toEqual([2, 1]);

    const h2 = mgr.applyPatch((d) => {
      d.posts.unshift({ id: 3 });
    });
    expect(store.get().posts.map((p) => p.id)).toEqual([3, 2, 1]);
    h2.rollback();
    expect(store.get().posts.map((p) => p.id)).toEqual([2, 1]);
  });

  it('rolls back a middle patch by rebasing from baseline', () => {
    const store = createStore({ posts: [{ id: 1 }] });
    const mgr = createOptimisticManager<State>({ read: store.read, write: store.write });

    const a = mgr.applyPatch((d) => {
      d.posts.unshift({ id: 2 });
    });
    const b = mgr.applyPatch((d) => {
      d.posts.unshift({ id: 3 });
    });
    const c = mgr.applyPatch((d) => {
      d.posts.unshift({ id: 4 });
    });
    expect(store.get().posts.map((p) => p.id)).toEqual([4, 3, 2, 1]);

    b.rollback();
    expect(store.get().posts.map((p) => p.id)).toEqual([4, 2, 1]);

    a.rollback();
    c.rollback();
    expect(store.get().posts.map((p) => p.id)).toEqual([1]);
  });

  it('commitBehavior=remove removes optimistic effect on commit', () => {
    const store = createStore({ posts: [{ id: 1 }] });
    const mgr = createOptimisticManager<State>({
      read: store.read,
      write: store.write,
      commitBehavior: 'remove',
    });

    const h = mgr.applyPatch((d) => {
      d.posts.unshift({ id: 2 });
    });
    expect(store.get().posts.map((p) => p.id)).toEqual([2, 1]);

    h.commit();
    expect(store.get().posts.map((p) => p.id)).toEqual([1]);
  });

  it('compacts committed prefix into baseline (keep) without losing pending patches', () => {
    const store = createStore({ posts: [{ id: 1 }] });
    const events: string[] = [];
    const mgr = createOptimisticManager<State>({
      read: store.read,
      write: store.write,
      onEvent: (e) => {
        events.push(e.type);
      },
    });

    const a = mgr.applyPatch((d) => {
      d.posts.unshift({ id: 2 });
    });
    const b = mgr.applyPatch((d) => {
      d.posts.unshift({ id: 3 });
    });
    a.commit();

    expect(store.get().posts.map((p) => p.id)).toEqual([3, 2, 1]);

    b.rollback();
    expect(store.get().posts.map((p) => p.id)).toEqual([2, 1]);

    expect(events.length).toBeGreaterThan(0);
  });
});
