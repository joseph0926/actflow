'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';

import { createPostForm } from '@/app/actions/posts';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? 'Creating...' : 'Create Post'}
    </button>
  );
}

export default function PostForm() {
  const [state, formAction] = useActionState(createPostForm, { ok: true });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && state.message) {
      formRef.current?.reset();
    }
  }, [state]);

  if (!state.ok && state.reason === 'AUTH') {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded">
        <p className="text-amber-800">🔒 {state.formError || 'Please sign in to create posts'}</p>
      </div>
    );
  }

  const hasError = !state.ok;
  const fieldErrors = hasError ? state.fieldErrors : undefined;
  const formError = hasError ? state.formError : undefined;
  const reason = hasError ? state.reason : undefined;

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          placeholder="Enter post title"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          aria-invalid={!!fieldErrors?.title}
          aria-describedby={fieldErrors?.title ? 'title-error' : undefined}
        />
        {fieldErrors?.title && (
          <p id="title-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.title}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="body" className="block text-sm font-medium text-gray-700">
          Content
        </label>
        <textarea
          id="body"
          name="body"
          rows={4}
          placeholder="Write your post content (min 10 characters)"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          aria-invalid={!!fieldErrors?.body}
          aria-describedby={fieldErrors?.body ? 'body-error' : undefined}
        />
        {fieldErrors?.body && (
          <p id="body-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.body}
          </p>
        )}
      </div>
      <SubmitButton />
      {formError && !fieldErrors && (
        <div
          className={`p-3 border rounded ${
            reason === 'CONFLICT' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
          }`}
          role="alert"
        >
          <p className={reason === 'CONFLICT' ? 'text-yellow-800' : 'text-red-800'}>
            {reason === 'CONFLICT' && '⚠️ '}
            {formError}
          </p>
        </div>
      )}
      {state.ok && state.message && (
        <div className="p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-green-800">✅ {state.message}</p>
        </div>
      )}
    </form>
  );
}
