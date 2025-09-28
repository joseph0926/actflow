import { unstable_cache as cache } from 'next/cache';

import { t } from '@/lib/keys';
import { db } from '@/server/db';

const findPost = (id: string) => {
  return db.post.findUnique({
    where: { id },
  });
};
const findUserPosts = async (userId: string) => {
  return db.post.findMany({
    where: { authorId: userId },
    orderBy: { createdAt: 'desc' },
  });
};

export const getPosts = cache(
  async () => {
    return db.post.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  },
  ['posts:list'],
  {
    tags: [t.posts()],
    revalidate: 60,
  },
);

export async function getPost(id: string) {
  const cached = cache(() => findPost(id), ['post:detail'], { tags: [t.post({ id })] });
  return cached();
}

export async function getUserPosts(userId: string) {
  const cached = cache(() => findUserPosts(userId), ['user:posts'], {
    tags: [t.userPosts({ userId })],
  });
  return cached();
}
