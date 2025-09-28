'use client';

import { signInAction, signOutAction } from '@/app/actions/auth';
import type { User } from '@/server/auth';

export function SignInForm() {
  return (
    <form action={signInAction} className="flex gap-2">
      <input
        type="email"
        name="email"
        placeholder="Enter any email to sign in"
        className="px-3 py-1 border rounded"
        required
      />
      <button type="submit" className="px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
        Sign In
      </button>
    </form>
  );
}

export function UserMenu({ user }: { user: User }) {
  return (
    <form action={signOutAction} className="flex items-center gap-4">
      <span className="text-sm text-gray-600">
        Signed in as <strong>{user.email}</strong>
      </span>
      <button type="submit" className="px-3 py-1 text-sm border rounded hover:bg-gray-50">
        Sign Out
      </button>
    </form>
  );
}
