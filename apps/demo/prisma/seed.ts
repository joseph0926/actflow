import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  await prisma.post.deleteMany();

  const posts = [
    {
      title: 'Getting Started with actflow',
      body: 'This is a demo post showing how actflow handles server actions with type-safe cache invalidation.',
      authorId: 'seed-user-1',
    },
    {
      title: 'Testing Error Handling',
      body: 'Try creating a post with this exact title to see conflict detection in action!',
      authorId: 'seed-user-1',
    },
    {
      title: 'Form Validation Demo',
      body: 'Forms validate automatically using Zod schemas. Try submitting with empty fields!',
      authorId: 'seed-user-2',
    },
  ];

  for (const post of posts) {
    await prisma.post.create({ data: post });
  }

  console.log(`Database has been seeded with ${posts.length} posts`);
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
