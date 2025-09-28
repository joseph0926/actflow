'use server';

import { ZodError } from 'zod';

import type { FormAction, FormDataLike, FormState } from './form-types';
import { assertServerOnly } from './invalidate';

export function bindFormAction<I, O, F extends string = string>(
  action: (input: I) => Promise<O>,
  config: {
    fromForm: (fd: FormDataLike) => I;
    toSuccessState?: (out: O) => FormState<F>;
  },
): FormAction<F> {
  assertServerOnly('bindFormAction');

  const formAction = async (
    ...args: [FormState<F> | FormDataLike, FormDataLike?]
  ): Promise<FormState<F>> => {
    const fd = (args.length === 1 ? args[0] : args[1]) as unknown;
    const hasGet = !!fd && typeof (fd as { get?: unknown }).get === 'function';
    if (!hasGet) throw new TypeError('[actflow] bindFormAction expects FormData-like input.');

    const input = config.fromForm(fd as FormDataLike);
    try {
      const out = await action(input);
      return config.toSuccessState ? config.toSuccessState(out) : { ok: true };
    } catch (e) {
      if (e instanceof ZodError) {
        const fieldErrors = {};
        for (const issue of e.issues) {
          const key = String(issue.path[0] ?? 'form');
          if (!fieldErrors[key]) fieldErrors[key] = issue.message;
        }
        return { ok: false, fieldErrors };
      }
      throw e;
    }
  };

  return formAction as FormAction<F>;
}
