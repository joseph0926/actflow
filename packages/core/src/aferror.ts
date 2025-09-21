import { createAbortError, InvalidArgumentError, isAbortError } from './errors';

export type AFError =
  | { kind: 'validation'; issues: readonly unknown[] }
  | { kind: 'auth'; code?: string }
  | { kind: 'network'; cause?: unknown }
  | { kind: 'server'; status?: number; code?: string; cause?: unknown }
  | { kind: 'conflict'; reason?: string; cause?: unknown }
  | { kind: 'cancelled'; reason?: unknown }
  | { kind: 'internal'; code?: string; cause?: unknown };

export function isAFError(e: unknown): e is AFError {
  return typeof e === 'object' && e !== null && 'kind' in e;
}

export class AFErrorException extends Error {
  readonly name = 'AFErrorException';
  constructor(public readonly af: AFError) {
    super(formatAFMessage(af), 'cause' in af ? { cause: af.cause } : undefined);
  }
}

export function isAFErrorException(e: unknown): e is AFErrorException {
  return (
    e instanceof AFErrorException ||
    (typeof e === 'object' &&
      e !== null &&
      (e as { name: string }).name === 'AFErrorException' &&
      'af' in e)
  );
}

export function getAFError(e: unknown): AFError {
  if (isAFErrorException(e)) return e.af;
  if (isAFError(e)) return e;
  return asAFError(e);
}

function formatAFMessage(af: AFError): string {
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

function isConflict(e: unknown): { hit: boolean; reason?: string } {
  const status = extractStatus(e);
  if (status === 409) return { hit: true, reason: 'HTTP_409' };
  const code = extractCode(e);
  if (code && /P2002|E?CONFLICT/i.test(code)) return { hit: true, reason: code };
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

export function asAFError(err: unknown): AFError {
  if (isAFError(err)) return err;
  if (isAbortError(err)) return { kind: 'cancelled', reason: err };

  if (err instanceof InvalidArgumentError) {
    return { kind: 'internal', code: err.code, cause: err };
  }

  const status = extractStatus(err);
  if (status === 401) return { kind: 'auth', code: 'UNAUTHENTICATED' };
  if (status === 403) return { kind: 'auth', code: 'FORBIDDEN' };

  const conflict = isConflict(err);
  if (conflict.hit) return { kind: 'conflict', reason: conflict.reason, cause: err };

  if (typeof status === 'number') {
    return { kind: 'server', status, cause: err };
  }

  if (isLikelyNetwork(err)) {
    return { kind: 'network', cause: err };
  }

  return { kind: 'internal', cause: err };
}

export function throwAF(err: unknown): never {
  throw new AFErrorException(asAFError(err));
}

export function abort(reason?: unknown): never {
  throw new AFErrorException({ kind: 'cancelled', reason: createAbortError(reason) });
}
