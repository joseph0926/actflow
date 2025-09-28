export type FormState<F extends string = string> =
  | { ok: true; message?: string }
  | { ok: false; formError?: string; fieldErrors?: Partial<Record<F, string>> };

export type FormDataLike = { get(name: string): unknown };

export type FormAction<F extends string = string> = {
  (fd: FormDataLike): Promise<FormState<F>>;
  (prev: FormState<F>, fd: FormDataLike): Promise<FormState<F>>;
};
