export type InvalidArgumentCode =
  | 'BACKOFF_INVALID_ATTEMPT'
  | 'BACKOFF_INVALID_BASE'
  | 'BACKOFF_INVALID_FACTOR'
  | 'BACKOFF_INVALID_MAX'
  | 'BACKOFF_BASE_GT_MAX'
  | 'SCHEDULE_INVALID_COUNT'
  | 'SCHEDULE_NEGATIVE_COUNT'
  | 'SCHEDULE_TOO_LARGE';

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
  if (typeof DOMException !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    return new DOMException(String(reason ?? 'Aborted'), 'AbortError') as unknown as Error;
  }
  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  const e = new Error(String(reason ?? 'Aborted'));
  (e as Error & { name: string }).name = 'AbortError';
  return e;
}

export function isAbortError(err: unknown): boolean {
  const isDom =
    typeof DOMException !== 'undefined' && err instanceof DOMException && err.name === 'AbortError';
  if (isDom) return true;
  return (
    typeof err === 'object' && err !== null && (err as { name?: unknown }).name === 'AbortError'
  );
}
