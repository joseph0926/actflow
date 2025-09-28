import { describe, expect, it, vi } from 'vitest';

import {
  combineErrorMappers,
  createAuthErrorMapper,
  createValidationErrorMapper,
  ERROR_REASONS,
} from '../error-mappers';

describe('Error Mappers', () => {
  describe('createAuthErrorMapper', () => {
    it('should map 401 status code', () => {
      const mapper = createAuthErrorMapper();
      const error = { status: 401 };

      expect(mapper(error)).toEqual({
        ok: false,
        reason: ERROR_REASONS.AUTH,
        formError: 'Authentication required',
      });
    });

    it('should map 403 status code', () => {
      const mapper = createAuthErrorMapper();
      const error = { status: 403 };

      expect(mapper(error)).toEqual({
        ok: false,
        reason: ERROR_REASONS.AUTH,
        formError: 'Access denied',
      });
    });

    it('should map UNAUTHORIZED code', () => {
      const mapper = createAuthErrorMapper();
      const error = { code: 'UNAUTHORIZED' };

      expect(mapper(error)).toEqual({
        ok: false,
        reason: ERROR_REASONS.AUTH,
        formError: 'Authentication required',
      });
    });

    it('should use custom messages', () => {
      const mapper = createAuthErrorMapper({
        unauthorized: 'Please log in',
        forbidden: 'Not allowed',
      });

      expect(mapper({ status: 401 })).toEqual({
        ok: false,
        reason: ERROR_REASONS.AUTH,
        formError: 'Please log in',
      });

      expect(mapper({ status: 403 })).toEqual({
        ok: false,
        reason: ERROR_REASONS.AUTH,
        formError: 'Not allowed',
      });
    });

    it('should return null for non-auth errors', () => {
      const mapper = createAuthErrorMapper();

      expect(mapper({ status: 404 })).toBeNull();
      expect(mapper({ code: 'SOMETHING_ELSE' })).toBeNull();
      expect(mapper(new Error('Random error'))).toBeNull();
    });

    it('should handle statusCode variant', () => {
      const mapper = createAuthErrorMapper();
      const error = { statusCode: 401 };

      expect(mapper(error)).toEqual({
        ok: false,
        reason: ERROR_REASONS.AUTH,
        formError: 'Authentication required',
      });
    });
  });

  describe('createValidationErrorMapper', () => {
    it('should map 400 status code', () => {
      const mapper = createValidationErrorMapper();
      const error = { status: 400 };

      expect(mapper(error)).toEqual({
        ok: false,
        reason: ERROR_REASONS.VALIDATION,
        formError: 'Please check your input',
      });
    });

    it('should NOT map ZodError', () => {
      const mapper = createValidationErrorMapper();
      const zodError = new Error('Validation failed');
      zodError.name = 'ZodError';

      expect(mapper(zodError)).toBeNull();
    });
  });

  describe('combineErrorMappers', () => {
    it('should try mappers in order', () => {
      const mapper1 = vi.fn().mockReturnValue(null);
      const mapper2 = vi.fn().mockReturnValue({ ok: false, reason: 'TEST' });
      const mapper3 = vi.fn();

      const combined = combineErrorMappers(mapper1, mapper2, mapper3);
      const error = { status: 500 };

      const result = combined(error);

      expect(mapper1).toHaveBeenCalledWith(error);
      expect(mapper2).toHaveBeenCalledWith(error);
      expect(mapper3).not.toHaveBeenCalled();
      expect(result).toEqual({ ok: false, reason: 'TEST' });
    });

    it('should return null if no mapper matches', () => {
      const mapper1 = vi.fn().mockReturnValue(null);
      const mapper2 = vi.fn().mockReturnValue(null);

      const combined = combineErrorMappers(mapper1, mapper2);

      expect(combined({ status: 999 })).toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('should handle null/undefined errors gracefully', () => {
      const mapper = createAuthErrorMapper();

      expect(mapper(null)).toBeNull();
      expect(mapper(undefined)).toBeNull();
    });

    it('should handle non-object errors', () => {
      const mapper = createAuthErrorMapper();

      expect(mapper('string error')).toBeNull();
      expect(mapper(123)).toBeNull();
      expect(mapper(true)).toBeNull();
    });

    it('should handle errors with wrong type properties', () => {
      const mapper = createAuthErrorMapper();

      expect(mapper({ status: '401' })).toBeNull();
      expect(mapper({ code: 401 })).toBeNull();
    });
  });
});
