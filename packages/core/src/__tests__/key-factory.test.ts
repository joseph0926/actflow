import { describe, expect, expectTypeOf, it } from 'vitest';

import { defineKeyFactory } from '../key-factory';

describe('defineKeyFactory (strict key policy)', () => {
  const { tags: t, keys: qk } = defineKeyFactory({
    posts: { key: 'posts' },
    post: { key: 'post', params: ['id'] as const },
    entity: { key: 'entity', params: ['id', 'lang'] as const },
    visible: { key: 'visible', params: ['flag'] as const },
    item: { key: 'item', params: ['id'] as const, separator: '/' },
  } as const);

  it('builds 0-arity tag/key', () => {
    expect(t.posts()).toBe('posts');
    expect(qk.posts()).toEqual(['posts']);
  });

  it('builds 1-arity tag/key', () => {
    expect(t.post({ id: 123 })).toBe('post:123');
    expect(qk.post({ id: 123 })).toEqual(['post', 123]);
  });

  it('respects parameter order for multi-arity', () => {
    expect(t.entity({ id: '42', lang: 'ko' })).toBe('entity:42:ko');
    expect(qk.entity({ id: '42', lang: 'ko' })).toEqual(['entity', '42', 'ko']);
  });

  it('normalizes boolean to 1/0 in keys and to "1"/"0" in tags', () => {
    expect(qk.visible({ flag: true })).toEqual(['visible', 1]);
    expect(qk.visible({ flag: false })).toEqual(['visible', 0]);
    expect(t.visible({ flag: true })).toBe('visible:1');
    expect(t.visible({ flag: false })).toBe('visible:0');
  });

  it('supports custom tag separator per resource', () => {
    expect(t.item({ id: 'x' })).toBe('item/x');
  });

  it('throws on invalid param type at runtime (when bypassing TS)', () => {
    // @ts-expect-error: force wrong type at compile time to ensure runtime guard
    expect(() => t.post({ id: { x: 1 } })).toThrow(/Invalid type/);
    // @ts-expect-error: force wrong type at compile time to ensure runtime guard
    expect(() => t.post({})).toThrow(/Invalid type/);
  });

  it('type-level: readonly tuple for keys', () => {
    const k = qk.post({ id: 1 });
    expectTypeOf(k).toEqualTypeOf<readonly [string, ...(string | number)[]]>();
    function _compileOnly() {
      // @ts-expect-error - keys are readonly tuples; mutation should be rejected by TS
      k[1] = 2;
    }
    void _compileOnly;
  });

  it('type-level: exact required params and names (compile-only)', () => {
    function _compileOnly() {
      // @ts-expect-error - missing required param "id"
      qk.post({});
      // @ts-expect-error - extra/unknown param "extra" not allowed
      qk.post({ id: 1, extra: 2 });
      // @ts-expect-error - wrong param name "slug"
      t.post({ slug: 'a' });
    }
    void _compileOnly;
  });
});
