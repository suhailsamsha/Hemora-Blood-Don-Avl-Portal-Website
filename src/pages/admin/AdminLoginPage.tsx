import { useState, type FormEvent } from 'react';
import { ArrowLeft, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '../../components/BrandLogo.tsx';
import { LiquidCrimsonBackdrop, Perspective3DCard } from '../../components/SmoothSection.tsx';
import { api, ApiError, setAdminToken } from '../../lib/api.ts';
import type { AdminUserSession } from '../../shared/types.ts';

interface AdminLoginPageProps {
  onSuccess: (token: string, user: AdminUserSession) => void;
  onBackPublic: () => void;
}

export function AdminLoginPage({ onSuccess, onBackPublic }: AdminLoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.adminLoginWithPassword(email.trim(), password);
      if (res.user.role !== 'admin') {
        setError('Access denied. Administrator role is required.');
        return;
      }
      setAdminToken(res.token);
      onSuccess(res.token, res.user);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError(err.message);
      } else {
        setError((err as Error).message || 'Unable to sign in.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-[#FAF8F6] dark:bg-[#141210] text-[#1C1917] dark:text-[#F5F2EE] px-4 py-8">
      <LiquidCrimsonBackdrop />
      <div className="relative z-10 max-w-md w-full mx-auto my-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBackPublic}
            className="min-h-[44px] px-3 -ml-3 inline-flex items-center gap-2 text-sm font-medium text-[#57534E] dark:text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-[#F5F2EE] rounded-xl"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to Blood Donation Portal</span>
          </button>
        </div>

        <Perspective3DCard tiltStrength={2.5} className="ios-hero-glass rounded-[26px] p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3.5">
            <BrandLogo size="lg" />
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#B3261E] dark:text-[#F28B82]">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Restricted Admin Portal</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-[#1C1917] dark:text-[#F5F2EE]">
                Administrator Sign In
              </h1>
            </div>
          </div>

          <p className="text-sm text-[#57534E] dark:text-[#A8A29E]">
            Sign in with an active administrator account to manage verified donors, blood bank stock,
            emergency requests, and camps.
          </p>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-[#E6B8B5] bg-[#FBEAE8] dark:border-[#6A2B27] dark:bg-[#3A1513] px-3.5 py-2.5 text-sm font-medium text-[#8E1B15] dark:text-[#F28B82]"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-email"
                className="block text-sm font-medium text-[#1C1917] dark:text-[#F5F2EE] mb-1.5"
              >
                Admin Email
              </label>
              <input
                id="admin-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@bloodportal.org"
                className="w-full min-h-[44px] rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 px-3.5 text-sm text-[#1C1917] dark:text-[#F5F2EE] focus:outline-none focus:ring-2 focus:ring-[#B3261E]/70"
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-sm font-medium text-[#1C1917] dark:text-[#F5F2EE] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full min-h-[44px] rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 pl-3.5 pr-11 text-sm text-[#1C1917] dark:text-[#F5F2EE] focus:outline-none focus:ring-2 focus:ring-[#B3261E]/70"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-[#57534E] dark:text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-[#F5F2EE]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] rounded-xl bg-[#B3261E] hover:bg-[#961E17] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60 shadow-[0_4px_14px_rgba(179,38,30,0.3)] transition-colors"
            >
              <Lock className="h-4 w-4" aria-hidden="true" />
              <span>{loading ? 'Signing in...' : 'Sign In to Admin Console'}</span>
            </button>
          </form>

          <div className="pt-4 border-t border-[#E2DDD6] dark:border-white/10 text-xs text-[#57534E] dark:text-[#A8A29E]">
            Restricted to authorized Blood Donation Portal coordinators configured on the server.
          </div>
        </Perspective3DCard>
      </div>
    </div>
  );
}
