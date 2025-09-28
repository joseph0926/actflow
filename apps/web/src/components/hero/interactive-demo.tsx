'use client';

import { useEffect, useState } from 'react';

import { RefreshCw } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { Button } from '@/components/ui/button';

interface InteractiveDemoProps {
  type: 'duplicate' | 'optimistic';
  showActFlow: boolean;
}

export function InteractiveDemo({ type, showActFlow }: InteractiveDemoProps) {
  if (type === 'duplicate') {
    return <DuplicateDemo showActFlow={showActFlow} />;
  }
  return <OptimisticDemo showActFlow={showActFlow} />;
}

function DuplicateDemo({ showActFlow }: { showActFlow: boolean }) {
  const [tags, setTags] = useState<string[]>([]);
  const [isInvalidating, setIsInvalidating] = useState(false);

  const handleInvalidate = async () => {
    if (showActFlow) {
      if (isInvalidating) return;
      setIsInvalidating(true);
      const tag = 'post:123';
      setTags([tag]);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setIsInvalidating(false);
      setTimeout(() => {
        setTags([]);
      }, 1000);
    } else {
      const randomId = Math.floor(Math.random() * 1000);
      const tag = `post-${randomId}`;
      setTags((prev) => [...prev, tag]);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setTimeout(() => {
        setTags((prev) => prev.filter((t) => t !== tag));
      }, 1000);
    }
  };

  useEffect(() => {
    setTags([]);
  }, [showActFlow]);

  return (
    <div className="mt-8 p-6 rounded-lg bg-zinc-900 border border-zinc-800">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-zinc-400">Live Demo - Cache Invalidation</h4>
        <div className="text-xs text-zinc-500">
          {showActFlow ? 'Type-safe tags' : 'String-based tags'}
        </div>
      </div>

      <div className="flex items-center gap-8">
        <Button
          variant="outline"
          size="lg"
          onClick={handleInvalidate}
          className="group relative border-zinc-700 hover:bg-zinc-800"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Invalidate Cache
        </Button>

        <div className="flex-1">
          <div className="text-xs text-zinc-500 mb-2">Tags Invalidated:</div>
          <div className="flex flex-wrap gap-2">
            <AnimatePresence mode="popLayout">
              {tags.map((tag, index) => (
                <motion.div
                  key={`${tag}-${index}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className={`px-2 py-1 rounded text-xs font-mono ${
                    showActFlow
                      ? 'bg-green-900/50 text-green-400'
                      : 'bg-yellow-900/50 text-yellow-400'
                  }`}
                >
                  {tag}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {tags.length === 0 && (
            <div className="text-xs text-zinc-600">No active invalidations</div>
          )}
        </div>
      </div>

      <div className="mt-4 text-xs text-zinc-500">
        {showActFlow
          ? 'Type-safe tags with autocomplete. No typos possible!'
          : 'Manual string concatenation. Prone to typos and errors.'}
      </div>
    </div>
  );
}

function OptimisticDemo({ showActFlow }: { showActFlow: boolean }) {
  const [serverState, setServerState] = useState({ title: 'Original Post' });
  const [formState, setFormState] = useState({ title: 'Original Post' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (newTitle: string) => {
    setError(null);
    setIsSubmitting(true);

    if (showActFlow) {
      try {
        await new Promise((resolve, reject) => {
          setTimeout(() => {
            if (newTitle.toLowerCase().includes('error')) {
              reject(new Error('Validation failed'));
            } else {
              resolve(true);
            }
          }, 1000);
        });

        setServerState({ title: newTitle });
        setFormState({ title: newTitle });
      } catch (err) {
        console.log(err);
        setError('Zod validation: title must not contain "error"');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      try {
        if (newTitle.length < 1) {
          setError('Title is required');
          setIsSubmitting(false);
          return;
        }

        await new Promise((resolve, reject) => {
          setTimeout(() => {
            if (newTitle.toLowerCase().includes('error')) {
              reject(new Error('Server error'));
            } else {
              resolve(true);
            }
          }, 1000);
        });

        setServerState({ title: newTitle });
        setFormState({ title: newTitle });
      } catch (err) {
        console.log(err);
        setError('Manual validation failed. No automatic handling.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="mt-8 p-6 rounded-lg bg-zinc-900 border border-zinc-800">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-zinc-400">Live Demo - Form Validation</h4>
        <div className="text-xs text-zinc-500">
          {showActFlow ? 'Zod validation' : 'Manual validation'}
        </div>
      </div>
      <div className="space-y-4">
        <input
          type="text"
          value={formState.title}
          onChange={(e) => {
            setFormState({ title: e.target.value });
          }}
          placeholder="Enter title (type 'error' to trigger validation)"
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white placeholder-zinc-500"
        />
        <Button
          variant="outline"
          onClick={() => handleSubmit(formState.title)}
          disabled={isSubmitting}
          className="w-full border-zinc-700 hover:bg-zinc-800"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Form'
          )}
        </Button>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Server State:</span>
            <span className="text-zinc-400 font-mono">{serverState.title}</span>
          </div>
        </div>
      </div>
      {error && (
        <div
          className={`mt-4 p-2 rounded text-xs ${
            showActFlow
              ? 'bg-green-950/50 border border-green-900/50 text-green-400'
              : 'bg-red-950/50 border border-red-900/50 text-red-400'
          }`}
        >
          {error}
        </div>
      )}
      <div className="mt-4 text-xs text-zinc-500">
        {showActFlow
          ? 'Automatic Zod validation with typed errors.'
          : 'Manual validation logic required for each field.'}
      </div>
    </div>
  );
}
