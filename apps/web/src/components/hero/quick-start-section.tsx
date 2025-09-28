'use client';

import { FileCode2, Rocket, Terminal } from 'lucide-react';
import { motion } from 'motion/react';

import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { CodeBlock } from './code-block';

const steps = [
  {
    id: 'install',
    title: 'Install',
    icon: Terminal,
    content: {
      npm: 'npm install @actflow/next',
      pnpm: 'pnpm add @actflow/next',
      yarn: 'yarn add @actflow/next',
    },
  },
  {
    id: 'create',
    title: 'Define Keys & Actions',
    icon: FileCode2,
    code: `// lib/keys.ts
import { defineKeyFactory } from '@actflow/core';

export const { tags: t, keys: qk } = defineKeyFactory({
  posts: { key: 'posts' },
  post: { key: 'post', params: ['id'] as const },
} as const);

// app/actions/post.ts
'use server';
import { defineAction } from '@actflow/next/server';
import { z } from 'zod';
import { t } from '@/lib/keys';

export const createPost = defineAction({
  name: 'post.create',
  input: z.object({
    title: z.string().min(1),
    body: z.string().min(1)
  }),
  handler: async ({ input, ctx }) => {
    const post = await db.post.create({ data: input });
    await ctx.invalidate([ctx.tags.posts()]);
    return post;
  }
}, { tags: t });`,
  },
  {
    id: 'use',
    title: 'Use with Forms',
    icon: Rocket,
    code: `// app/components/post-form.tsx
'use client';
import { useFormState } from 'react-dom';
import { bindFormAction } from '@actflow/next/server';
import { createPost } from '@/app/actions/post';

const submitPost = bindFormAction(createPost, {
  fromForm: (fd) => ({
    title: fd.get('title') as string,
    body: fd.get('body') as string
  })
});

export function PostForm() {
  const [state, formAction] = useFormState(submitPost, { ok: false });
  
  return (
    <form action={formAction}>
      <input name="title" placeholder="Title" />
      <textarea name="body" placeholder="Body" />
      <button type="submit">Create Post</button>
      {state.fieldErrors?.title && (
        <p className="error">{state.fieldErrors.title}</p>
      )}
    </form>
  );
}`,
  },
];

export function QuickStartSection() {
  return (
    <section id="quick-start" className="py-24 sm:py-32 bg-zinc-950">
      <div className="w-full px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Get Started in 3 Steps
            </h2>
            <p className="text-zinc-500">From installation to production in under 5 minutes</p>
          </motion.div>

          <div className="grid gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="bg-black border-zinc-800">
                  <div className="p-6">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800">
                        <step.icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs font-mono text-zinc-500">Step {index + 1}</span>
                          <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                        </div>

                        {step.id === 'install' ? (
                          <Tabs defaultValue="npm" className="w-full">
                            <TabsList className="bg-zinc-900 border border-zinc-800">
                              <TabsTrigger value="npm">npm</TabsTrigger>
                              <TabsTrigger value="pnpm">pnpm</TabsTrigger>
                              <TabsTrigger value="yarn">yarn</TabsTrigger>
                            </TabsList>
                            {Object.entries(step.content ?? {}).map(([key, value]) => (
                              <TabsContent key={key} value={key} className="mt-4">
                                <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800">
                                  <code className="text-sm text-zinc-300 font-mono">{value}</code>
                                </div>
                              </TabsContent>
                            ))}
                          </Tabs>
                        ) : (
                          <CodeBlock code={step.code ?? ''} />
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-12 text-center"
          >
            <p className="text-sm text-zinc-500 mb-4">
              That's it! You're now using standardized Server Actions.
            </p>
            <div className="flex items-center justify-center gap-4">
              <a href="/docs" className="text-sm text-white hover:text-zinc-300 transition-colors">
                Read the docs →
              </a>
              <a
                href="https://github.com/joseph0926/actflow/tree/main/examples"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-white hover:text-zinc-300 transition-colors"
              >
                View examples →
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
