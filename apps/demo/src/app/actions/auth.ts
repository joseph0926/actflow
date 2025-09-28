'use server';

import { redirect } from 'next/navigation';

import { signIn as authSignIn, signOut as authSignOut } from '@/server/auth';

export async function signInAction(formData: FormData): Promise<void> {
  const email = formData.get('email') as string;

  if (!email || !email.includes('@')) {
    throw new Error('Please enter a valid email address');
  }

  await authSignIn(email);
  redirect('/');
}

export async function signOutAction(): Promise<void> {
  await authSignOut();
  redirect('/');
}
