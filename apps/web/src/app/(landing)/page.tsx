import { HeroSection } from '@/components/hero/hero-section';
import { MetricsDashboard } from '@/components/hero/metrics-dashboard';
import { ProblemSolutionSection } from '@/components/hero/problem-solution-section';
import { QuickStartSection } from '@/components/hero/quick-start-section';

export default function LandingPage() {
  return (
    <div className="relative h-full mt-4 w-full flex flex-col items-center">
      <HeroSection />
      <ProblemSolutionSection />
      <QuickStartSection />
      <MetricsDashboard />
    </div>
  );
}
