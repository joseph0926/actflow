export type BackoffJitter = 'none' | 'full' | 'half';

export interface ExponentialBackoffOptions {
  attempt: number;
  baseMs?: number;
  factor?: number;
  maxMs?: number;
  jitter?: BackoffJitter;
}

export interface BackoffRuntime {
  random(): number;
}

export const MathRandomRuntime: BackoffRuntime = { random: Math.random };

export function exponentialBackoff(
  { attempt, baseMs = 200, factor = 2, maxMs = 30_000, jitter = 'full' }: ExponentialBackoffOptions,
  runtime: BackoffRuntime = MathRandomRuntime,
): number {
  if (!Number.isFinite(attempt) || attempt <= 0) {
    return 0;
  }

  if (baseMs <= 0) {
    throw new Error('baseMs must be positive');
  }
  const safeFactor = factor < 1 ? 1 : factor;
  const raw = baseMs * Math.pow(safeFactor, attempt - 1);
  const capped = Math.min(raw, maxMs);

  if (jitter === 'none') {
    return Math.round(capped);
  }

  const r = clamp01(runtime.random());
  if (jitter === 'full') {
    return Math.round(capped * r);
  }

  const min = 0.5 * capped;
  return Math.round(min + (capped - min) * r);
}

export function backoffSchedule(
  count: number,
  opts: Omit<ExponentialBackoffOptions, 'attempt'> = {},
  runtime: BackoffRuntime = MathRandomRuntime,
): number[] {
  const n = Math.max(0, Math.floor(count));
  const out: number[] = [];
  for (let i = 1; i <= n; i += 1) {
    out.push(exponentialBackoff({ ...opts, attempt: i }, runtime));
  }
  return out;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
