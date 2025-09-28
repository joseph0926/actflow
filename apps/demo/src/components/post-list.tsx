import { getPosts } from '@/app/actions/queries';
import { getCurrentUser } from '@/server/auth';

import DeleteButton from './delete-button';

export default async function PostList() {
  const [posts, currentUser] = await Promise.all([getPosts(), getCurrentUser()]);

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No posts yet</p>
        <p className="text-sm mt-2">
          {currentUser ? 'Be the first to create a post!' : 'Sign in to create the first post!'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <article
          key={post.id}
          className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-xl font-semibold text-gray-900">{post.title}</h3>
            {currentUser?.id === post.authorId && (
              <div className="flex gap-2">
                <DeleteButton postId={post.id} />
              </div>
            )}
          </div>
          <p className="text-gray-700 mb-4 whitespace-pre-wrap">{post.body}</p>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>By user: {post.authorId}</span>
            {/* eslint-disable */}
            <time dateTime={post.createdAt?.toString()}>
              {new Date(post.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </time>
          </div>
        </article>
      ))}
    </div>
  );
}
