'use client';

import { useRef } from 'react';
import Link from 'next/link';

import { ArrowRight, GitBranch, Layers, Zap } from 'lucide-react';
import { motion, useScroll, useTransform } from 'motion/react';

import { Button } from '@/components/ui/button';

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen w-full flex items-center overflow-hidden bg-black"
    >
      <div className="absolute inset-0 w-full -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>
      <motion.div style={{ y, opacity }} className="w-full relative z-10">
        <div className="w-full px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center mb-12"
          >
            <Link
              href="https://github.com/joseph0926/actflow"
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <GitBranch className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-xs font-medium text-zinc-400">joseph0926/actflow</span>
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-center mb-6"
          >
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white">
              Next.js Actions,
              <br />
              <span className="text-zinc-400">Standardized.</span>
            </h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center text-base sm:text-lg text-zinc-500 max-w-2xl mx-auto mb-12 leading-relaxed"
          >
            A production-ready library that unifies Server Actions, RSC, and React hooks with
            standardized patterns.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-24"
          >
            <Button
              size="lg"
              className="bg-white text-black hover:bg-zinc-200 font-medium h-11 px-6"
              asChild
            >
              <Link href="#quick-start">
                Get Started
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-zinc-800 text-white bg-transparent hover:bg-zinc-900 hover:border-zinc-700 font-medium h-11 px-6"
              asChild
            >
              <Link href="/playground">Live Demo</Link>
            </Button>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-zinc-800 rounded-lg overflow-hidden">
              <div className="bg-black p-8 text-center">
                <div className="text-3xl font-bold text-white mb-2 font-mono">1</div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider">Line of Code</div>
                <div className="text-xs text-zinc-600 mt-1">Duplicate Prevention</div>
              </div>
              <div className="bg-black p-8 text-center">
                <div className="text-3xl font-bold text-white mb-2 font-mono">80%</div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider">Less Code</div>
                <div className="text-xs text-zinc-600 mt-1">Reduced Boilerplate</div>
              </div>
              <div className="bg-black p-8 text-center">
                <div className="text-3xl font-bold text-white mb-2 font-mono">0ms</div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider">Overhead</div>
                <div className="text-xs text-zinc-600 mt-1">Runtime Performance</div>
              </div>
            </div>
            <div className="mt-16 flex items-center justify-center gap-8 text-xs text-zinc-600">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                <span>TypeScript Native</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span>Zero Dependencies</span>
              </div>
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                <span>MIT License</span>
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-4 h-6 rounded-full border border-zinc-800 flex justify-center py-1"
            >
              <div className="w-0.5 h-1.5 bg-zinc-600 rounded-full" />
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
