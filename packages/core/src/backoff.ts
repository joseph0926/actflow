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
    throw new Error('attempt must be a positive finite number');
  }
  if (!Number.isFinite(baseMs) || baseMs <= 0) {
    throw new Error('baseMs must be a positive finite number');
  }
  if (!Number.isFinite(factor) || factor < 1) {
    throw new Error('factor must be finite and >= 1');
  }
  if (!Number.isFinite(maxMs) || maxMs <= 0) {
    throw new Error('maxMs must be a positive finite number');
  }

  if (baseMs > maxMs) {
    throw new Error('baseMs cannot be greater than maxMs');
  }

  const raw = baseMs * Math.pow(factor, attempt - 1);
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
  if (!Number.isInteger(count)) {
    throw new Error('count must be an integer');
  }
  if (count < 0) {
    throw new Error('count must be non-negative');
  }
  if (count > 100) {
    throw new Error('count must be <= 100 (consider pagination for larger schedules)');
  }

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
