import type { FormState } from './form-types';

export const ERROR_REASONS = {
  AUTH: 'AUTH',
  VALIDATION: 'VALIDATION',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT: 'RATE_LIMIT',
} as const;

export type ErrorReason = (typeof ERROR_REASONS)[keyof typeof ERROR_REASONS];

export type ErrorMapper<F extends string = string> = (error: unknown) => FormState<F> | null;
export type ErrorMapperFactory<F extends string = string> = (
  options?: Record<string, string>,
) => ErrorMapper<F>;

function getErrorProperty(error: unknown, key: string): unknown {
  if (!error || typeof error !== 'object') return undefined;
  if (!(key in error)) return undefined;
  return (error as Record<string, unknown>)[key];
}
export function getErrorString(error: unknown, key: string): string | undefined {
  const value = getErrorProperty(error, key);
  return typeof value === 'string' ? value : undefined;
}
export function getErrorNumber(error: unknown, key: string): number | undefined {
  const value = getErrorProperty(error, key);
  return typeof value === 'number' ? value : undefined;
}
function hasErrorCode(error: unknown, code: string): boolean {
  const errorCode = getErrorString(error, 'code');
  return errorCode === code;
}
function hasStatusCode(error: unknown, status: number): boolean {
  const errorStatus = getErrorNumber(error, 'status') ?? getErrorNumber(error, 'statusCode');
  return errorStatus === status;
}

export const createAuthErrorMapper = <F extends string = string>(options?: {
  unauthorized?: string;
  forbidden?: string;
}): ErrorMapper<F> => {
  const messages = {
    unauthorized: options?.unauthorized ?? 'Authentication required',
    forbidden: options?.forbidden ?? 'Access denied',
  };

  return (error: unknown): FormState<F> | null => {
    if (hasErrorCode(error, 'UNAUTHORIZED') || hasStatusCode(error, 401)) {
      return { ok: false, reason: ERROR_REASONS.AUTH, formError: messages.unauthorized };
    }
    if (hasStatusCode(error, 403)) {
      return { ok: false, reason: ERROR_REASONS.AUTH, formError: messages.forbidden };
    }
    return null;
  };
};

export const createValidationErrorMapper = <F extends string = string>(options?: {
  message?: string;
}): ErrorMapper<F> => {
  const message = options?.message ?? 'Please check your input';

  return (error: unknown): FormState<F> | null => {
    if (hasStatusCode(error, 400) || hasErrorCode(error, 'VALIDATION_ERROR')) {
      return { ok: false, reason: ERROR_REASONS.VALIDATION, formError: message };
    }
    return null;
  };
};

export const createNotFoundErrorMapper = <F extends string = string>(options?: {
  message?: string;
}): ErrorMapper<F> => {
  const message = options?.message ?? 'Resource not found';

  return (error: unknown): FormState<F> | null => {
    if (hasStatusCode(error, 404) || hasErrorCode(error, 'NOT_FOUND')) {
      return { ok: false, reason: ERROR_REASONS.NOT_FOUND, formError: message };
    }
    return null;
  };
};

export const createConflictErrorMapper = <F extends string = string>(options?: {
  message?: string;
}): ErrorMapper<F> => {
  const message = options?.message ?? 'Request already processed';

  return (error: unknown): FormState<F> | null => {
    if (hasStatusCode(error, 409) || hasErrorCode(error, 'CONFLICT')) {
      return { ok: false, reason: ERROR_REASONS.CONFLICT, formError: message };
    }
    return null;
  };
};

export const createRateLimitErrorMapper = <F extends string = string>(options?: {
  message?: string;
}): ErrorMapper<F> => {
  const message = options?.message ?? 'Too many requests. Please try again later';

  return (error: unknown): FormState<F> | null => {
    if (hasStatusCode(error, 429) || hasErrorCode(error, 'RATE_LIMIT')) {
      return { ok: false, reason: ERROR_REASONS.RATE_LIMIT, formError: message };
    }
    return null;
  };
};

export function combineErrorMappers<F extends string = string>(
  ...mappers: ErrorMapper<F>[]
): ErrorMapper<F> {
  return (error: unknown): FormState<F> | null => {
    for (const mapper of mappers) {
      const result = mapper(error);
      if (result) return result;
    }
    return null;
  };
}

export const createDefaultErrorMappers = <F extends string = string>(options?: {
  messages?: {
    unauthorized?: string;
    forbidden?: string;
    validation?: string;
    notFound?: string;
    conflict?: string;
    rateLimit?: string;
  };
}): ErrorMapper<F> => {
  return combineErrorMappers(
    createAuthErrorMapper(options?.messages),
    createValidationErrorMapper({ message: options?.messages?.validation }),
    createNotFoundErrorMapper({ message: options?.messages?.notFound }),
    createConflictErrorMapper({ message: options?.messages?.conflict }),
    createRateLimitErrorMapper({ message: options?.messages?.rateLimit }),
  );
};
