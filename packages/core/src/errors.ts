export type InvalidArgumentCode =
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
    public code: InvalidArgumentCode,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export class RetryExhaustedError extends Error {
  readonly name = 'RetryExhaustedError';
  constructor(
    public attempts: number,
    message = 'Retry attempts exhausted',
  ) {
    super(message);
  }
}

export function createAbortError(reason?: unknown): Error {
  if (typeof DOMException === 'undefined') {
    throw new Error('This library requires Node.js 18+ or a modern browser');
  }
  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  return new DOMException(String(reason ?? 'Aborted'), 'AbortError');
}

export function isAbortError(err: unknown): boolean {
  const isDom =
    typeof DOMException !== 'undefined' && err instanceof DOMException && err.name === 'AbortError';

  return (
    isDom ||
    (typeof err === 'object' && err !== null && (err as { name?: unknown }).name === 'AbortError')
  );
}
