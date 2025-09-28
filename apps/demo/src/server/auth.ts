import { cookies } from 'next/headers';

export type User = {
  id: string;
  name: string;
  email: string;
};

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('demo-user');

  if (!userCookie) {
    return null;
  }

  try {
    return JSON.parse(userCookie.value) as User;
  } catch {
    return null;
  }
}

export async function signIn(email: string): Promise<User> {
  const user: User = {
    id: `user-${Date.now()}`,
    name: email.split('@')[0],
    email,
  };

  const cookieStore = await cookies();
  cookieStore.set('demo-user', JSON.stringify(user), {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  });

  return user;
}

export async function signOut(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('demo-user');
}
