import { isSomeError } from './utils';

export type InvalidArgumentCode =
  | 'INVALID_ARG'
  | 'BACKOFF_INVALID_ATTEMPT'
  | 'BACKOFF_INVALID_BASE'
  | 'BACKOFF_INVALID_FACTOR'
  | 'BACKOFF_INVALID_MAX'
  | 'BACKOFF_BASE_GT_MAX'
  | 'SCHEDULE_INVALID_COUNT'
  | 'SCHEDULE_NEGATIVE_COUNT'
  | 'SCHEDULE_TOO_LARGE'
  | 'IDEMP_EMPTY'
  | 'IDEMP_CIRCULAR'
  | 'IDEMP_UNSUPPORTED_TYPE';

export class InvalidArgumentError extends Error {
  readonly name = 'InvalidArgumentError';
  constructor(
    public readonly code: InvalidArgumentCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function isInvalidArgumentError(e: unknown): e is InvalidArgumentError {
  return isSomeError(e, 'InvalidArgumentError');
}

export class RetryExhaustedError extends Error {
  readonly name = 'RetryExhaustedError';
  constructor(
    public readonly attempts: number,
    message = 'Retry attempts exhausted',
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function createAbortError(reason?: unknown): Error {
  if (typeof DOMException === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    return new DOMException(String(reason ?? 'Aborted'), 'AbortError');
  }
  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  const err = new Error(String(reason ?? 'Aborted')) as Error & { name: string; code: string };
  err.name = 'AbortError';
  err.code = 'ABORT_ERR';
  return err;
}

export function isAbortError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const isDom =
    typeof DOMException !== 'undefined' &&
    err instanceof DOMException &&
    (err as { name: string }).name === 'AbortError';
  const any = err as { name?: unknown; code?: unknown };
  const byName = any.name === 'AbortError';
  const byCode = any.code === 'ABORT_ERR';
  return isDom || byName || byCode;
}
