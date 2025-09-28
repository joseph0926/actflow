import { Suspense } from 'react';

import { SignInForm, UserMenu } from '@/components/auth-form';
import PostForm from '@/components/post-form';
import PostList from '@/components/post-list';
import { getCurrentUser } from '@/server/auth';

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">actflow Demo</h1>
            <div>{user ? <UserMenu user={user} /> : <SignInForm />}</div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <section className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h2 className="text-lg font-semibold mb-3 text-blue-900">🧪 Test actflow Features</h2>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>
              • <strong>Validation:</strong> Try submitting with empty fields or short content
            </li>
            <li>
              • <strong>Conflict Detection:</strong> Create two posts with the same title
            </li>
            <li>
              • <strong>Auth Errors:</strong> Try creating a post without signing in
            </li>
            <li>
              • <strong>Cache Invalidation:</strong> Posts update instantly after actions
            </li>
            <li>
              • <strong>Form States:</strong> Watch loading states and error messages
            </li>
            <li>
              • <strong>SQLite Storage:</strong> All data persists locally in dev.db
            </li>
          </ul>
        </section>
        {user && (
          <section className="mb-12 bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Create New Post</h2>
            <PostForm />
          </section>
        )}
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Recent Posts</h2>
          <Suspense fallback={<div className="text-gray-500">Loading posts...</div>}>
            <PostList />
          </Suspense>
        </section>
      </main>
    </div>
  );
}
