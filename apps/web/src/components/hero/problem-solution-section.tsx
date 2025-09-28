'use client';

import { useState } from 'react';

import { Check, X } from 'lucide-react';
import { motion, useScroll, useTransform } from 'motion/react';

import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { CodeBlock } from './code-block';
import { InteractiveDemo } from './interactive-demo';

const sections = [
  {
    id: 'duplicate',
    title: 'Server Action Tags',
    problem: 'Manual cache invalidation',
    solution: 'Type-safe tag system',
    beforeCode: `// Manual string-based cache tags
await revalidateTag('posts');
await revalidateTag('post-123');
await revalidateTag('user-456-posts');

// Error-prone, no type safety
const tag = \`post-\${id}\`; // typos possible`,
    afterCode: `import { defineKeyFactory } from '@actflow/core';

export const { tags: t, keys: qk } = defineKeyFactory({
  posts: { key: 'posts' },
  post: { key: 'post', params: ['id'] as const },
  userPosts: { key: 'user-posts', params: ['userId'] as const }
} as const);

// Type-safe, autocomplete enabled
t.post({ id: '123' }); // 'post:123'
t.userPosts({ userId: '456' }); // 'user-posts:456'`,
    metrics: { before: '10 lines', after: '3 lines', improvement: '70%' },
  },
  {
    id: 'optimistic',
    title: 'Server Actions',
    problem: 'Boilerplate for validation',
    solution: 'Built-in Zod validation',
    beforeCode: `export async function createPost(formData: FormData) {
  'use server';
  
  const title = formData.get('title');
  const body = formData.get('body');
  
  if (!title || typeof title !== 'string') {
    throw new Error('Title is required');
  }
  if (!body || typeof body !== 'string') {
    throw new Error('Body is required');
  }
  
  const post = await db.post.create({
    data: { title, body }
  });
  
  revalidateTag('posts');
  return post;
}`,
    afterCode: `import { defineAction } from '@actflow/server';
import { z } from 'zod';

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
    metrics: { before: '20 lines', after: '10 lines', improvement: '50%' },
  },
  {
    id: 'error',
    title: 'Form Actions',
    problem: 'Complex form handling',
    solution: 'Unified form pattern',
    beforeCode: `export async function submitForm(prevState: any, formData: FormData) {
  'use server';
  
  try {
    const data = Object.fromEntries(formData);
    const parsed = schema.parse(data);
    
    const result = await db.save(parsed);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        errors: error.issues.reduce((acc, issue) => {
          acc[issue.path[0]] = issue.message;
          return acc;
        }, {})
      };
    }
    throw error;
  }
}`,
    afterCode: `import { bindFormAction } from '@actflow/server';

export const submitForm = bindFormAction(
  createPost, // reuse existing action
  {
    fromForm: (fd) => ({
      title: fd.get('title') as string,
      body: fd.get('body') as string
    }),
    toSuccessState: (post) => ({
      ok: true,
      data: post
    })
  }
);

// Automatic Zod error handling included!`,
    metrics: { before: '25 lines', after: '10 lines', improvement: '60%' },
  },
];

export function ProblemSolutionSection() {
  const [activeTab, setActiveTab] = useState('duplicate');
  const [showActFlow, setShowActFlow] = useState(false);
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0.1, 0.2, 0.8, 0.9], [0, 1, 1, 1]);

  return (
    <section className="relative py-24 sm:py-32 bg-black">
      <motion.div style={{ opacity }} className="w-full px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Before & After</h2>
            <p className="text-zinc-500">Real problems. Real solutions. Less code.</p>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-zinc-950 border border-zinc-800">
              {sections.map((section) => (
                <TabsTrigger
                  key={section.id}
                  value={section.id}
                  className="data-[state=active]:bg-zinc-900 data-[state=active]:text-white text-zinc-400"
                >
                  {section.title}
                </TabsTrigger>
              ))}
            </TabsList>
            {sections.map((section) => (
              <TabsContent key={section.id} value={section.id} className="mt-8">
                <Card className="bg-zinc-950 border-zinc-800">
                  <div className="p-6 border-b border-zinc-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2">{section.title}</h3>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-2 text-red-400">
                            <X className="w-3 h-3" />
                            {section.problem}
                          </span>
                          <span className="flex items-center gap-2 text-green-400">
                            <Check className="w-3 h-3" />
                            {section.solution}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-zinc-500">ActFlow</span>
                        <Switch checked={showActFlow} onCheckedChange={setShowActFlow} />
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className={showActFlow ? 'opacity-30' : ''}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-zinc-400">
                            Traditional Approach
                          </h4>
                          <span className="text-xs text-red-400 font-mono">
                            {section.metrics.before}
                          </span>
                        </div>
                        <CodeBlock code={section.beforeCode} />
                      </div>
                      <div className={!showActFlow ? 'opacity-30' : ''}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-zinc-400">With ActFlow</h4>
                          <span className="text-xs text-green-400 font-mono">
                            {section.metrics.after}
                          </span>
                        </div>
                        <CodeBlock code={section.afterCode} highlighted={showActFlow} />
                      </div>
                    </div>
                    <div className="mt-6 p-4 rounded-lg bg-zinc-900 border border-zinc-800">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-white font-mono">
                            {section.metrics.improvement}
                          </div>
                          <div className="text-xs text-zinc-500 mt-1">Less Code</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-white font-mono">100%</div>
                          <div className="text-xs text-zinc-500 mt-1">Type Safe</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-white font-mono">0ms</div>
                          <div className="text-xs text-zinc-500 mt-1">Overhead</div>
                        </div>
                      </div>
                    </div>
                    {(section.id === 'duplicate' || section.id === 'optimistic') && (
                      <InteractiveDemo type={section.id} showActFlow={showActFlow} />
                    )}
                  </div>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </motion.div>
    </section>
  );
}
