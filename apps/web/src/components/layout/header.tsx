'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Moon, Sun } from 'lucide-react';
import { motion, useMotionValueEvent, useScroll } from 'motion/react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Playground', href: '/playground' },
  { name: 'Docs', href: '/docs' },
  { name: 'Blog', href: '/blog' },
  { name: 'About', href: '/about' },
];

export function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setIsScrolled(latest > 10);
  });

  return (
    <motion.header
      className={cn(
        'fixed top-0 z-50 w-full transition-all duration-200',
        isScrolled ? 'bg-black/80 backdrop-blur-sm border-b border-zinc-900' : 'bg-transparent',
      )}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="w-full px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-sm bg-white" />
              <span className="font-medium text-white text-sm">ActFlow</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'text-sm transition-colors',
                    pathname === item.href ? 'text-white' : 'text-zinc-400 hover:text-white',
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="https://github.com/joseph0926/actflow"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <title>GitHub</title>
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
              <span>GitHub</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setTheme(theme === 'dark' ? 'light' : 'dark');
              }}
              className="w-8 h-8 text-zinc-400 hover:text-white hover:bg-zinc-900"
            >
              <Sun className="w-4 h-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute w-4 h-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden w-8 h-8 text-zinc-400 hover:text-white hover:bg-zinc-900"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
