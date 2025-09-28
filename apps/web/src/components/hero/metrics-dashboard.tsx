'use client';

import { useEffect, useState } from 'react';

import { Activity, Shield, TrendingUp, Zap } from 'lucide-react';
import { motion } from 'motion/react';

import { Card } from '@/components/ui/card';

export function MetricsDashboard() {
  const [metrics, setMetrics] = useState({
    prevented: 0,
    optimized: 0,
    errors: 0,
    performance: 100,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => ({
        prevented: prev.prevented + Math.floor(Math.random() * 3),
        optimized: prev.optimized + Math.floor(Math.random() * 2),
        errors: prev.errors,
        performance: 98 + Math.random() * 2,
      }));
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <section className="py-24 sm:py-32 bg-black border-t border-zinc-900">
      <div className="w-full px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Real-Time Metrics</h2>
            <p className="text-zinc-500">ActFlow is actively protecting your application</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={Shield}
              label="Duplicate Requests Prevented"
              value={metrics.prevented}
              suffix="today"
              color="text-green-400"
              delay={0}
            />
            <MetricCard
              icon={Zap}
              label="Optimistic Updates"
              value={metrics.optimized}
              suffix="handled"
              color="text-blue-400"
              delay={0.1}
            />
            <MetricCard
              icon={Activity}
              label="Error Rate"
              value={0}
              suffix="%"
              color="text-purple-400"
              delay={0.2}
            />
            <MetricCard
              icon={TrendingUp}
              label="Performance Score"
              value={metrics.performance.toFixed(1)}
              suffix="%"
              color="text-white"
              delay={0.3}
            />
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-12 p-6 rounded-lg bg-zinc-950 border border-zinc-800"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-zinc-400">Bundle Size Comparison</h3>
              <span className="text-xs text-zinc-500">vs traditional approach</span>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-500">Traditional Approach</span>
                  <span className="text-zinc-400 font-mono">45.2kb</span>
                </div>
                <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: '100%' }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full bg-red-500/50"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-500">With ActFlow</span>
                  <span className="text-zinc-400 font-mono">8.7kb</span>
                </div>
                <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: '19%' }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.7 }}
                    className="h-full bg-green-500/50"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-center">
              <span className="text-2xl font-bold text-green-400 font-mono">-81%</span>
              <span className="text-sm text-zinc-500 ml-2 mt-1">smaller bundle</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  suffix?: string;
  color: string;
  delay: number;
}

function MetricCard({ icon: Icon, label, value, suffix, color, delay }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className="bg-zinc-950 border-zinc-800 p-6">
        <div className="flex items-start justify-between mb-4">
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-mono ${color}`}>{value}</span>
            {suffix && <span className="text-xs text-zinc-500">{suffix}</span>}
          </div>
          <p className="text-xs text-zinc-500">{label}</p>
        </div>
      </Card>
    </motion.div>
  );
}
