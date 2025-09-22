import { createAbortError, InvalidArgumentError, isAbortError } from './errors';
import { isSomeError } from './utils';

export type AFErrorKind =
  | 'validation'
  | 'auth'
  | 'server'
  | 'conflict'
  | 'network'
  | 'cancelled'
  | 'internal';

export interface AFErrorBase {
  kind: AFErrorKind;
  message: string;
  code?: string;
  status?: number;
  reason?: string;
  issues?: readonly unknown[];
  cause?: unknown;
}

type AFConflictReason = 'HTTP_409' | 'UNIQUE_CONSTRAINT' | 'REVISION_MISMATCH';
type AFNetworkReason = 'TIMEOUT' | 'CONNRESET' | 'DNS' | 'UNREACHABLE';

type AFErrorTightening =
  | { kind: 'validation'; issues: readonly unknown[] }
  | { kind: 'auth'; status?: 401 | 403 }
  | { kind: 'server'; status: number }
  | { kind: 'conflict'; reason?: AFConflictReason }
  | { kind: 'network'; reason?: AFNetworkReason }
  | { kind: 'cancelled' }
  | { kind: 'internal' };

export type AFError = AFErrorBase & AFErrorTightening;

const KINDS = new Set<AFErrorKind>([
  'validation',
  'auth',
  'server',
  'conflict',
  'network',
  'cancelled',
  'internal',
]);
const CONFLICT_REASONS = new Set<AFConflictReason>([
  'HTTP_409',
  'UNIQUE_CONSTRAINT',
  'REVISION_MISMATCH',
]);
const NETWORK_REASONS = new Set<AFNetworkReason>(['TIMEOUT', 'CONNRESET', 'DNS', 'UNREACHABLE']);

const hasOwn = (o: object, k: PropertyKey): boolean => Object.hasOwn(o, k);

function cleanFreeze(a: AFError): AFError {
  const { kind, message, code, status, reason, issues, cause } = a;
  const out = { kind, message, code, status, reason, issues, cause };
  return Object.freeze(out) as AFError;
}

export function isAFErrorShape(e: unknown): e is AFError {
  if (typeof e !== 'object' || e === null) return false;
  const any = e as Record<string, unknown>;
  return (
    hasOwn(any, 'kind') &&
    typeof any.kind === 'string' &&
    KINDS.has(any.kind as AFErrorKind) &&
    hasOwn(any, 'message') &&
    typeof any.message === 'string'
  );
}

export function isAFErrorStrict(x: unknown): x is AFError {
  if (!isAFErrorShape(x)) return false;
  const a = x;

  if (a.code !== undefined && typeof a.code !== 'string') return false;
  if (a.status !== undefined && typeof a.status !== 'number') return false;
  if (a.issues !== undefined && !Array.isArray(a.issues)) return false;

  switch (a.kind) {
    case 'server':
      return typeof a.status === 'number';
    case 'validation':
      return Array.isArray(a.issues);
    case 'auth':
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      return a.status === 401 || a.status === 403 || a.status === undefined;
    case 'conflict':
      return a.reason === undefined || CONFLICT_REASONS.has(a.reason as AFConflictReason);
    case 'network':
      return a.reason === undefined || NETWORK_REASONS.has(a.reason as AFNetworkReason);
    case 'cancelled':
    case 'internal':
      return true;
  }
}

export type ParseMode = 'repair' | 'reject';
export interface ParseOptions {
  mode?: ParseMode;
  onViolation?: (v: { field: string; issue: string; got: unknown; fixedTo?: unknown }) => void;
}

export function parseAFErrorFromWire(x: unknown, opts: ParseOptions = {}): AFError {
  const mode = opts.mode ?? 'repair';

  if (isAFErrorStrict(x)) return cleanFreeze(x);

  if (mode === 'reject') {
    throw new Error('Invalid AFError payload');
  }

  return asAFError(x);
}

export class AFErrorException extends Error {
  readonly name = 'AFErrorException';
  constructor(public readonly af: AFError) {
    super(af.message, af.cause ? { cause: af.cause } : undefined);
  }
}

export function isAFErrorException(e: unknown): e is AFErrorException {
  return isSomeError(e, 'AFErrorException');
}
export function isAFError(e: unknown): e is AFError {
  return isAFErrorShape(e);
}

export function getAFError(e: unknown): AFError {
  if (isAFErrorException(e)) return e.af;
  if (isAFErrorShape(e)) return e;
  return asAFError(e);
}

export function asAFError(err: unknown): AFError {
  if (isAFErrorShape(err)) {
    return cleanFreeze(err);
  }
  if (isAbortError(err)) return withMessage({ kind: 'cancelled', cause: err });

  console.log(err instanceof InvalidArgumentError);
  if (err instanceof InvalidArgumentError) {
    return withMessage({ kind: 'internal', code: err.code, cause: err });
  }

  const status = extractStatus(err);
  if (status === 401) return withMessage({ kind: 'auth', status, code: 'UNAUTHENTICATED' });
  if (status === 403) return withMessage({ kind: 'auth', status, code: 'FORBIDDEN' });

  const { hit, reason, code } = detectConflict(err);
  if (hit)
    return withMessage({ kind: 'conflict', reason, code, status: status ?? 409, cause: err });

  if (typeof status === 'number') {
    return withMessage({ kind: 'server', status, cause: err });
  }

  if (isLikelyNetwork(err)) {
    const code = extractCode(err);
    const reason: AFNetworkReason | undefined = inferNetworkReason(code, extractMessage(err));
    return withMessage({ kind: 'network', reason, code, cause: err });
  }

  return withMessage({ kind: 'internal', cause: err });
}

function withMessage(af: Omit<AFError, 'message'>): AFError {
  return cleanFreeze({ ...af, message: formatAFMessage(af) } as AFError);
}
function formatAFMessage(af: Omit<AFError, 'message'>): string {
  switch (af.kind) {
    case 'cancelled':
      return 'Cancelled';
    case 'auth':
      return `Auth error${af.code ? ` (${af.code})` : ''}`;
    case 'network':
      return 'Network error';
    case 'conflict':
      return `Conflict${af.reason ? ` (${af.reason})` : ''}`;
    case 'server':
      return `Server error${af.status ? ` (${af.status})` : ''}`;
    case 'validation':
      return 'Validation error';
    case 'internal':
      return `Internal error${af.code ? ` (${af.code})` : ''}`;
  }
}

function extractStatus(e: unknown): number | undefined {
  if (typeof e !== 'object' || e === null) return undefined;
  const st = (e as { status?: unknown }).status;
  if (typeof st === 'number') return st;
  const resp = (e as { response?: unknown }).response;
  if (typeof resp === 'object' && resp !== null) {
    const rs = (resp as { status?: unknown }).status;
    if (typeof rs === 'number') return rs;
  }
  return undefined;
}
function extractCode(e: unknown): string | undefined {
  if (typeof e === 'object' && e !== null) {
    const c = (e as { code?: unknown }).code;
    if (typeof c === 'string') return c;
  }
  return undefined;
}
function extractMessage(e: unknown): string | undefined {
  if (typeof e === 'object' && e !== null) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return undefined;
}
function detectConflict(e: unknown): { hit: boolean; reason?: AFConflictReason; code?: string } {
  const status = extractStatus(e);
  if (status === 409) return { hit: true, reason: 'HTTP_409' };
  const code = extractCode(e);
  if (code && /P2002|E?CONFLICT/i.test(code))
    return { hit: true, reason: 'UNIQUE_CONSTRAINT', code };
  const msg = extractMessage(e);
  if (msg && /unique constraint|conflict/i.test(msg))
    return { hit: true, reason: 'UNIQUE_CONSTRAINT' };
  return { hit: false };
}
function isLikelyNetwork(e: unknown): boolean {
  const code = extractCode(e);
  if (
    code &&
    /^E(AI_AGAIN|CONN(RESET|REFUSED)|HOSTUNREACH|PIPE|TIMEDOUT|NET(UNREACH|DOWN)|DNS)/i.test(code)
  ) {
    return true;
  }
  const msg = extractMessage(e);
  return (
    typeof msg === 'string' && /(Network|fetch|socket|timeout|timed out|ECONN|ENET|EAI)/i.test(msg)
  );
}
function inferNetworkReason(code?: string, msg?: string): AFNetworkReason | undefined {
  if (!code && !msg) return undefined;
  const s = (code ?? msg ?? '').toUpperCase();
  if (s.includes('TIMEDOUT') || s.includes('TIMEOUT')) return 'TIMEOUT';
  if (s.includes('CONNRESET')) return 'CONNRESET';
  if (s.includes('DNS')) return 'DNS';
  if (s.includes('UNREACH')) return 'UNREACHABLE';
  return undefined;
}

export function isRetryable(af: AFError): boolean {
  if (af.kind === 'network') return true;
  if (
    af.kind === 'server' &&
    typeof af.status === 'number' &&
    [408, 429, 500, 502, 503, 504].includes(af.status)
  )
    return true;
  return false;
}

export function throwAF(err: unknown): never {
  throw new AFErrorException(asAFError(err));
}

export function abort(reason?: unknown): never {
  throw new AFErrorException(withMessage({ kind: 'cancelled', cause: createAbortError(reason) }));
}
