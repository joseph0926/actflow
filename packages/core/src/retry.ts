import {
  type BackoffJitter,
  type BackoffRuntime,
  exponentialBackoff,
  MathRandomRuntime,
} from './backoff';

export interface RetryOptions {
  maxRetries?: number;
  baseMs?: number;
  factor?: number;
  maxMs?: number;
  jitter?: BackoffJitter;
  signal?: AbortSignal;
  shouldRetry?: (
    err: unknown,
    meta: { attempt: number; maxRetries: number },
  ) => boolean | Promise<boolean>;
  onAttemptStart?: (meta: { attempt: number; maxRetries: number }) => void;
  onAttemptSuccess?: (meta: { attempt: number; maxRetries: number; elapsedMs: number }) => void;
  onAttemptFailure?: (
    err: unknown,
    meta: { attempt: number; maxRetries: number; elapsedMs: number },
  ) => void;
  runtime?: BackoffRuntime;
}

export interface OperationContext {
  attempt: number;
  signal: AbortSignal;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined = undefined;
    const onAbort = (): void => {
      if (timer) clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      reject(createAbortError(signal?.reason));
    };

    if (signal?.aborted) {
      onAbort();
      return;
    }

    timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    if (signal) signal.addEventListener('abort', onAbort, { once: true });
  });
}

function createAbortError(reason?: unknown): Error {
  if (typeof DOMException !== 'undefined') {
    // eslint-disable-next-line
    return new DOMException(String(reason ?? 'Aborted'), 'AbortError') as unknown as Error;
  }
  // eslint-disable-next-line
  const e = new Error(String(reason ?? 'Aborted'));
  (e as Error & { name: string }).name = 'AbortError';
  return e;
}

function isAbortError(err: unknown): boolean {
  const isDomAbort =
    typeof DOMException !== 'undefined' && err instanceof DOMException && err.name === 'AbortError';
  if (isDomAbort) return true;

  if (typeof err === 'object' && err !== null && 'name' in err) {
    const name = (err as { name?: unknown }).name;
    return typeof name === 'string' && name === 'AbortError';
  }
  return false;
}

function hasNumberStatus(x: unknown): x is { status: number } {
  return (
    typeof x === 'object' && x !== null && typeof (x as { status?: unknown }).status === 'number'
  );
}
function hasResponseStatus(x: unknown): x is { response: { status: number } } {
  if (typeof x !== 'object' || x === null) return false;
  const r = (x as { response?: unknown }).response;
  return (
    typeof r === 'object' && r !== null && typeof (r as { status?: unknown }).status === 'number'
  );
}
function errorMessage(x: unknown): string | undefined {
  return typeof x === 'object' &&
    x !== null &&
    typeof (x as { message?: unknown }).message === 'string'
    ? (x as { message: string }).message
    : undefined;
}
function hasStringCode(x: unknown): x is { code: string } {
  return typeof x === 'object' && x !== null && typeof (x as { code?: unknown }).code === 'string';
}

export function defaultShouldRetry(err: unknown): boolean {
  if (isAbortError(err)) return false;

  if (hasNumberStatus(err)) {
    const s = err.status;
    return s >= 500 && s < 600;
  }
  if (hasResponseStatus(err)) {
    const s = err.response.status;
    return s >= 500 && s < 600;
  }

  if (hasStringCode(err)) {
    const code = err.code;
    if (
      /^E(AI_AGAIN|CONN(RESET|REFUSED)|HOSTUNREACH|PIPE|TIMEDOUT|NET(UNREACH|DOWN)|DNS).*$/i.test(
        code,
      )
    ) {
      return true;
    }
  }

  const msg = errorMessage(err);
  if (
    typeof msg === 'string' &&
    /(Network|fetch|socket|timeout|timed out|ECONN|ENET|EAI)/i.test(msg)
  ) {
    return true;
  }

  return false;
}

export async function executeWithRetry<T>(
  op: (ctx: OperationContext) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    baseMs = 200,
    factor = 2,
    maxMs = 30_000,
    jitter = 'full' as BackoffJitter,
    signal,
    shouldRetry = defaultShouldRetry,
    onAttemptStart,
    onAttemptSuccess,
    onAttemptFailure,
    runtime = MathRandomRuntime,
  } = options;

  if (signal?.aborted) {
    throw createAbortError(signal.reason);
  }

  for (let attempt = 1; attempt <= 1 + maxRetries; attempt += 1) {
    const startedAt = Date.now();
    onAttemptStart?.({ attempt, maxRetries });

    const controller = new AbortController();
    const cleanup = linkSignals(signal, controller);
    try {
      const result = await op({ attempt, signal: controller.signal });
      onAttemptSuccess?.({ attempt, maxRetries, elapsedMs: Date.now() - startedAt });
      return result;
    } catch (err) {
      onAttemptFailure?.(err, { attempt, maxRetries, elapsedMs: Date.now() - startedAt });

      if (isAbortError(err)) {
        throw err;
      }

      const more = attempt <= maxRetries;
      const retryable = more ? await shouldRetry(err, { attempt, maxRetries }) : false;
      if (!retryable) {
        throw err;
      }

      const delay = exponentialBackoff({ attempt, baseMs, factor, maxMs, jitter }, runtime);
      await sleep(delay, signal);
    } finally {
      cleanup();
    }
  }

  throw new Error(`Retry attempts exhausted unexpectedly`);
}

function linkSignals(parent: AbortSignal | undefined, child: AbortController): () => void {
  if (!parent) return () => {};
  const onAbort = (): void => {
    child.abort(parent.reason);
  };
  parent.addEventListener('abort', onAbort, { once: true });
  if (parent.aborted) {
    child.abort(parent.reason);
  }
  return () => {
    parent.removeEventListener('abort', onAbort);
  };
}
