import { ZodError } from 'zod';

import type { ErrorMapper } from './error-mappers';
import type { FormAction, FormDataLike, FormState } from './form-types';
import { assertServerOnly } from './invalidate';

export interface BindFormActionConfig<I, O, F extends string = string> {
  fromForm: (fd: FormDataLike) => I;
  toSuccessState?: (out: O) => FormState<F>;
  mapError?: ErrorMapper<F>;
  unmappedErrorStrategy?: 'throw' | 'generic';
  genericErrorMessage?: string;
}

export function bindFormAction<I, O, F extends string = string>(
  action: (input: I) => Promise<O>,
  config: BindFormActionConfig<I, O, F>,
): FormAction<F> {
  assertServerOnly('bindFormAction');

  const formAction = async (
    ...args: [FormState<F> | FormDataLike, FormDataLike?]
  ): Promise<FormState<F>> => {
    const fd = (args.length === 1 ? args[0] : args[1]) as unknown;
    const hasGet = !!fd && typeof (fd as { get?: unknown }).get === 'function';
    if (!hasGet) {
      throw new TypeError('[actflow] bindFormAction expects FormData-like input.');
    }

    const input = config.fromForm(fd as FormDataLike);

    try {
      const out = await action(input);
      return config.toSuccessState ? config.toSuccessState(out) : { ok: true };
    } catch (e) {
      if (e instanceof ZodError) {
        const fieldErrors: Partial<Record<F, string>> = {};
        for (const issue of e.issues) {
          const key = String(issue.path[0] ?? 'form') as F;
          if (!fieldErrors[key]) {
            fieldErrors[key] = issue.message;
          }
        }
        return { ok: false, fieldErrors, reason: 'VALIDATION' };
      }

      if (config.mapError) {
        const mapped = config.mapError(e);
        if (mapped) return mapped;
      }

      const strategy = config.unmappedErrorStrategy ?? 'throw';

      if (strategy === 'generic') {
        const message = config.genericErrorMessage ?? 'An error occurred';
        return { ok: false, formError: message };
      }

      throw e;
    }
  };

  return formAction as FormAction<F>;
}

export {
  combineErrorMappers,
  createAuthErrorMapper,
  createConflictErrorMapper,
  createDefaultErrorMappers,
  createNotFoundErrorMapper,
  createRateLimitErrorMapper,
  createValidationErrorMapper,
  ERROR_REASONS,
  type ErrorMapper,
  type ErrorReason,
} from './error-mappers';
