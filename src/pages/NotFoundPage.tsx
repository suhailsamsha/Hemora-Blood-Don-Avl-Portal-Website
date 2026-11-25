import { Perspective3DCard } from '../components/SmoothSection.tsx';

interface NotFoundPageProps {
  onNavigate: (path: string) => void;
}

export function NotFoundPage({ onNavigate }: NotFoundPageProps) {
  return (
    <div className="max-w-lg py-8">
      <Perspective3DCard tiltStrength={2.5} className="ios-hero-glass rounded-[26px] p-6 sm:p-8 space-y-4">
        <p className="text-sm font-semibold text-[#B3261E] dark:text-[#F28B82] tabular-nums">404</p>
        <h1 className="text-2xl font-bold text-[#1C1917] dark:text-[#F5F2EE]">Page not found</h1>
        <p className="text-sm text-[#57534E] dark:text-[#A8A29E]">
          The page you requested does not exist. Use the links below to search available donors or check open blood requests.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl bg-[#B3261E] text-white hover:bg-[#961E17] shadow-[0_4px_14px_rgba(179,38,30,0.3)] transition-colors"
          >
            Search available donors
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/requests')}
            className="min-h-[44px] px-4 py-2 text-sm font-medium rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/80 dark:bg-[#141210]/85 text-[#1C1917] dark:text-[#F5F2EE] hover:border-[#B3261E]/50 transition-colors"
          >
            Open Blood Requests
          </button>
        </div>
      </Perspective3DCard>
    </div>
  );
}
