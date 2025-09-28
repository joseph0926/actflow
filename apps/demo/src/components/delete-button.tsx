'use client';

import { useActionState, useState } from 'react';

import { deletePostForm } from '@/app/actions/posts';

interface DeleteButtonProps {
  postId: string;
}

export default function DeleteButton({ postId }: DeleteButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [state, formAction] = useActionState(deletePostForm, { ok: true });

  if (showConfirm) {
    return (
      <div className="flex gap-2">
        <form action={formAction}>
          <input type="hidden" name="id" value={postId} />
          <button
            type="submit"
            className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
          >
            Confirm
          </button>
        </form>
        <button
          onClick={() => {
            setShowConfirm(false);
          }}
          className="px-3 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => {
          setShowConfirm(true);
        }}
        className="px-3 py-1 text-xs text-red-600 border border-red-600 rounded hover:bg-red-50"
        aria-label="Delete post"
      >
        Delete
      </button>
      {!state.ok && state.formError && (
        <div className="absolute z-10 mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {state.formError}
        </div>
      )}
    </>
  );
}
