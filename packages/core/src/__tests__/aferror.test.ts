import { describe, expect, it } from 'vitest';

import { abort, AFErrorException, getAFError, throwAF } from '../aferror';

describe('AFErrorException & helpers', () => {
  it('throwAF wraps unknown error as AFErrorException', () => {
    expect(() => throwAF(new Error('x'))).toThrow(AFErrorException);
    try {
      throwAF(new Error('x'));
    } catch (e) {
      const af = getAFError(e);
      expect(af.kind).toBe('internal');
    }
  });

  it('abort throws AFErrorException with kind=cancelled', () => {
    expect(() => abort('stop')).toThrow(AFErrorException);
    try {
      abort('stop');
    } catch (e) {
      const af = getAFError(e);
      expect(af.kind).toBe('cancelled');
    }
  });
});
