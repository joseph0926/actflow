'use server';

/* eslint-disable @typescript-eslint/only-throw-error */

import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { z } from 'zod';

import {
  bindFormAction,
  combineErrorMappers,
  createAuthErrorMapper,
  createConflictErrorMapper,
  createNotFoundErrorMapper,
  createValidationErrorMapper,
  defineActionWithTags,
} from '@actflow/next';

import { t } from '@/lib/keys';
import { getCurrentUser } from '@/server/auth';
import { db } from '@/server/db';

const act = defineActionWithTags({ tags: t });

export const createPost = act({
  name: 'post.create',
  input: z.object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(100, 'Title must be less than 100 characters'),
    body: z
      .string()
      .min(10, 'Body must be at least 10 characters')
      .max(1000, 'Body must be less than 1000 characters'),
  }),
  handler: async ({ input, ctx }) => {
    const user = await getCurrentUser();
    if (!user) {
      throw { status: 401, message: 'Please sign in to create posts' };
    }

    const existing = await db.post.findFirst({
      where: { title: input.title },
    });

    if (existing) {
      throw { status: 409, message: `A post with title "${input.title}" already exists` };
    }

    const post = await db.post.create({
      data: {
        ...input,
        authorId: user.id,
      },
    });

    await ctx.invalidate([
      ctx.tags.posts(),
      ctx.tags.userPosts({ userId: user.id }),
      ctx.tags.post({ id: post.id }),
    ]);

    return post;
  },
});

export const updatePost = act({
  name: 'post.update',
  input: z.object({
    id: z.string().min(1),
    title: z.string().min(1).max(100).optional(),
    body: z.string().min(10).max(1000).optional(),
  }),
  handler: async ({ input, ctx }) => {
    const user = await getCurrentUser();
    if (!user) {
      throw { status: 401, message: 'Authentication required' };
    }

    const post = await db.post.findUnique({
      where: { id: input.id },
    });

    if (!post) {
      throw { status: 404, message: 'Post not found' };
    }

    if (post.authorId !== user.id) {
      throw { status: 403, message: 'You can only edit your own posts' };
    }

    const updated = await db.post.update({
      where: { id: input.id },
      data: {
        title: input.title ?? post.title,
        body: input.body ?? post.body,
      },
    });

    await ctx.invalidate([
      ctx.tags.posts(),
      ctx.tags.post({ id: post.id }),
      ctx.tags.userPosts({ userId: user.id }),
    ]);

    return updated;
  },
});

export const deletePost = act({
  name: 'post.delete',
  input: z.object({
    id: z.string().min(1),
  }),
  handler: async ({ input, ctx }) => {
    const user = await getCurrentUser();
    if (!user) {
      throw { status: 401, message: 'Please sign in to delete posts' };
    }

    const post = await db.post.findUnique({
      where: { id: input.id },
    });

    if (!post) {
      throw { status: 404, message: 'Post not found' };
    }

    if (post.authorId !== user.id) {
      throw { status: 403, message: 'You can only delete your own posts' };
    }

    await db.post.delete({
      where: { id: input.id },
    });

    await ctx.invalidate([ctx.tags.posts(), ctx.tags.userPosts({ userId: user.id })]);

    return { ok: true, id: input.id };
  },
});

const postErrorMapper = combineErrorMappers(
  createAuthErrorMapper({
    unauthorized: 'Please sign in to continue',
    forbidden: 'You do not have permission to perform this action',
  }),
  createNotFoundErrorMapper({
    message: 'The requested post could not be found',
  }),
  createConflictErrorMapper({
    message: 'This title is already taken',
  }),
  createValidationErrorMapper({
    message: 'Please check your input',
  }),

  (error) => {
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return {
          ok: false,
          reason: 'CONFLICT',
          formError: 'This record already exists',
        };
      }
      if (error.code === 'P2025') {
        return {
          ok: false,
          reason: 'NOT_FOUND',
          formError: 'Record not found',
        };
      }
    }
    return null;
  },
);

export const createPostForm = bindFormAction(createPost, {
  fromForm: (fd) => ({
    title: String(fd.get('title')).trim(),
    body: String(fd.get('body')).trim(),
  }),
  toSuccessState: (post) => ({
    ok: true,
    message: `Post "${post.title}" created successfully!`,
  }),
  mapError: postErrorMapper,
  unmappedErrorStrategy: 'generic',
  genericErrorMessage: 'Something went wrong. Please try again.',
});

export const updatePostForm = bindFormAction(updatePost, {
  fromForm: (fd) => ({
    id: String(fd.get('id')),
    title: fd.get('title') ? String(fd.get('title')).trim() : undefined,
    body: fd.get('body') ? String(fd.get('body')).trim() : undefined,
  }),
  toSuccessState: () => ({
    ok: true,
    message: 'Post updated successfully!',
  }),
  mapError: postErrorMapper,
});

export const deletePostForm = bindFormAction(deletePost, {
  fromForm: (fd) => ({
    id: String(fd.get('id')),
  }),
  toSuccessState: () => ({
    ok: true,
    message: 'Post deleted successfully',
  }),
  mapError: postErrorMapper,
});
