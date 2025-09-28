import { defineKeyFactory } from '@actflow/next';

export const { tags: t, keys: qk } = defineKeyFactory({
  posts: {
    key: 'posts',
  },

  post: {
    key: 'post',
    params: ['id'] as const,
  },

  userPosts: {
    key: 'user-posts',
    params: ['userId'] as const,
  },

  postByTitle: {
    key: 'post-title',
    params: ['title'] as const,
  },

  userProfile: {
    key: 'user-profile',
    params: ['userId'] as const,
  },

  users: {
    key: 'users',
  },
} as const);
