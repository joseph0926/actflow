import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function stubWindow() {
  (globalThis as any).window = {};
}
function restoreWindow() {
  delete (globalThis as any).window;
}

describe('createInvalidate — server-only & dynamic import behavior', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    restoreWindow();
    vi.restoreAllMocks();
  });

  it('throws a helpful error when next/cache is unavailable', async () => {
    vi.doMock('next/cache', () => {
      throw new Error('Module not found');
    });

    const { createInvalidate } = await import('../invalidate');
    const invalidate = createInvalidate();

    await expect(invalidate(['posts'])).rejects.toThrowError(
      /Next runtime not detected|next\/cache.*unavailable/i,
    );
  });

  it('calls next/cache.revalidateTag for each provided tag (virtual module)', async () => {
    const revalidateTag = vi.fn().mockResolvedValue(undefined);

    vi.doMock('next/cache', () => ({
      revalidateTag,
    }));

    const { createInvalidate } = await import('../invalidate');
    const invalidate = createInvalidate();

    await invalidate(['a', 'b', 'c']);

    expect(revalidateTag).toHaveBeenCalledTimes(3);
    expect(revalidateTag).toHaveBeenNthCalledWith(1, 'a');
    expect(revalidateTag).toHaveBeenNthCalledWith(2, 'b');
    expect(revalidateTag).toHaveBeenNthCalledWith(3, 'c');
  });

  it('throws server-only error when called on the client (window present)', async () => {
    stubWindow();

    const { createInvalidate } = await import('../invalidate');
    expect(() => createInvalidate()).toThrowError(/server-only/i);
  });
});

describe('createInvalidate — module cache behavior', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('imports next/cache only once across multiple calls', async () => {
    const revalidateTag = vi.fn().mockResolvedValue(undefined);
    let factoryCount = 0;

    vi.doMock('next/cache', () => {
      factoryCount++;
      return { revalidateTag };
    });

    const { createInvalidate } = await import('../invalidate');
    const invalidate = createInvalidate();

    await invalidate(['x']);
    await invalidate(['y', 'z']);

    expect(revalidateTag).toHaveBeenCalledTimes(3);
    expect(factoryCount).toBe(1);
  });

  it('multiple invalidate functions still reuse the cached module sequentially', async () => {
    const revalidateTag = vi.fn().mockResolvedValue(undefined);
    let factoryCount = 0;

    vi.doMock('next/cache', () => {
      factoryCount++;
      return { revalidateTag };
    });

    const { createInvalidate } = await import('../invalidate');
    const inv1 = createInvalidate();
    const inv2 = createInvalidate();

    await inv1(['a']);
    await inv2(['b']);

    expect(revalidateTag).toHaveBeenCalledTimes(2);
    expect(factoryCount).toBe(1);
  });
});
