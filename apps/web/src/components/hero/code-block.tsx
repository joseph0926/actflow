'use client';

import { useEffect, useState } from 'react';

import { codeToHtml } from 'shiki';

import { cn } from '@/lib/utils';

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
  highlighted?: boolean;
}

export function CodeBlock({
  code,
  language = 'tsx',
  className,
  highlighted = false,
}: CodeBlockProps) {
  const [html, setHtml] = useState<string>('');

  useEffect(() => {
    async function highlightCode() {
      const result = await codeToHtml(code, {
        lang: language,
        theme: 'github-dark',
      });
      setHtml(result);
    }
    highlightCode();
  }, [code, language]);

  return (
    <div
      className={cn(
        'relative rounded-lg overflow-hidden',
        'bg-zinc-950 border border-zinc-800',
        highlighted && 'ring-1 ring-white/20',
        className,
      )}
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-zinc-700" />
          <div className="w-3 h-3 rounded-full bg-zinc-700" />
          <div className="w-3 h-3 rounded-full bg-zinc-700" />
        </div>
        <span className="text-xs text-zinc-500 font-mono">{language}</span>
      </div>
      <div className="p-4 overflow-x-auto">
        {html ? (
          <div
            dangerouslySetInnerHTML={{ __html: html }}
            className="text-sm [&>pre]:!bg-transparent [&>pre]:!p-0 [&_code]:!bg-transparent"
          />
        ) : (
          <pre className="text-sm text-zinc-400">
            <code>{code}</code>
          </pre>
        )}
      </div>
    </div>
  );
}
