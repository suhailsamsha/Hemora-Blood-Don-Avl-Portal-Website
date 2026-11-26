import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  BarChart3,
  Bell,
  Calendar,
  ClipboardList,
  Droplets,
  ExternalLink,
  FileText,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { BrandLogo } from '../../components/BrandLogo.tsx';
import { LiquidCrimsonBackdrop, ScrollProgressBar } from '../../components/SmoothSection.tsx';
import { ToastContainer, type ToastItem } from '../../components/Toast.tsx';
import { api, ApiError, getAdminToken, setAdminToken } from '../../lib/api.ts';
import type { AdminOverviewPayload, AdminUserSession } from '../../shared/types.ts';
import { AdminCampsSection } from './AdminCampsSection.tsx';
import { AdminContentSection } from './AdminContentSection.tsx';
import { AdminDonationsSection } from './AdminDonationsSection.tsx';
import { AdminNotificationsSection } from './AdminNotificationsSection.tsx';
import { AdminOverviewSection } from './AdminOverviewSection.tsx';
import { AdminReportsSection } from './AdminReportsSection.tsx';
import { AdminRequestsSection } from './AdminRequestsSection.tsx';
import { AdminSettingsSection } from './AdminSettingsSection.tsx';
import { AdminStockSection } from './AdminStockSection.tsx';
import { AdminUsersSection } from './AdminUsersSection.tsx';

export type AdminSectionKey =
  | 'dashboard'
  | 'users'
  | 'stock'
  | 'requests'
  | 'donations'
  | 'camps'
  | 'notifications'
  | 'reports'
  | 'content'
  | 'settings';

const NAV_ITEMS: Array<{ key: AdminSectionKey; label: string; icon: typeof LayoutDashboard }> = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'users', label: 'User Management', icon: Users },
  { key: 'stock', label: 'Blood Stock', icon: Droplets },
  { key: 'requests', label: 'Blood Requests', icon: ClipboardList },
  { key: 'donations', label: 'Donations', icon: HeartHandshake },
  { key: 'camps', label: 'Donation Camps', icon: Calendar },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'reports', label: 'Reports & Export', icon: BarChart3 },
  { key: 'content', label: 'Content (CMS)', icon: FileText },
  { key: 'settings', label: 'Logs & Settings', icon: Settings },
];

interface AdminLayoutProps {
  section: AdminSectionKey;
  dark: boolean;
  onToggleDark: () => void;
  onNavigate: (path: string) => void;
}

export function AdminLayout({ section, dark, onToggleDark, onNavigate }: AdminLayoutProps) {
  const [token] = useState<string | null>(() => getAdminToken());
  const [adminUser, setAdminUser] = useState<AdminUserSession | null>(null);
  const [overview, setOverview] = useState<AdminOverviewPayload | null>(null);
  const [verifying, setVerifying] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;

  const mainScrollRef = useRef<HTMLDivElement | null>(null);
  const scrollPositionsRef = useRef<Partial<Record<AdminSectionKey, number>>>({});
  const prevSectionRef = useRef<AdminSectionKey>(section);

  const addToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const handleAuthError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setAdminToken(null);
          onNavigateRef.current('/admin/login');
          return;
        }
        if (err.status === 403) {
          setAdminToken(null);
          onNavigateRef.current('/');
          return;
        }
      }
      addToast('error', (err as Error).message || 'Request failed.');
    },
    [addToast]
  );

  useEffect(() => {
    if (!token) {
      onNavigateRef.current('/admin/login');
      return;
    }

    let cancelled = false;
    async function bootstrap() {
      setVerifying(true);
      try {
        const [meData, ovData] = await Promise.all([
          api.adminMe(token!),
          api.getAdminOverview(token!),
        ]);
        if (cancelled) return;
        if (meData.user.role !== 'admin') {
          setAdminToken(null);
          onNavigateRef.current('/');
          return;
        }
        setAdminUser(meData.user);
        setOverview(ovData);
      } catch (err) {
        if (!cancelled) handleAuthError(err);
      } finally {
        if (!cancelled) setVerifying(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [token, handleAuthError]);

  useLayoutEffect(() => {
    const scroller = mainScrollRef.current;
    if (!scroller) return;
    if (prevSectionRef.current !== section) {
      prevSectionRef.current = section;
      const savedTop = scrollPositionsRef.current[section] ?? 0;
      scroller.scrollTop = savedTop;
    }
  }, [section]);

  async function refreshOverview() {
    if (!token) return;
    try {
      const ovData = await api.getAdminOverview(token);
      setOverview(ovData);
    } catch (err) {
      handleAuthError(err);
    }
  }

  async function handleLogout() {
    if (token) {
      try {
        await api.adminLogout(token);
      } catch {
        // Proceed with local token cleanup regardless
      }
    }
    setAdminToken(null);
    onNavigate('/admin/login');
  }

  function goToSection(next: string) {
    if (mainScrollRef.current) {
      scrollPositionsRef.current[section] = mainScrollRef.current.scrollTop;
    }
    setSidebarOpen(false);
    const path = next === 'dashboard' ? '/admin' : `/admin/${next}`;
    onNavigate(path);
    if (next === 'dashboard') {
      void refreshOverview();
    }
  }

  if (verifying || !token || !adminUser) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-[#FAF8F6] dark:bg-[#141210] text-sm text-[#57534E] dark:text-[#A8A29E]">
        <LiquidCrimsonBackdrop />
        <span className="relative z-10 ios-glass rounded-2xl px-5 py-3">
          Verifying administrator session...
        </span>
      </div>
    );
  }

  const activeNav = NAV_ITEMS.find((n) => n.key === section) ?? NAV_ITEMS[0];

  return (
    <div className="relative h-screen w-full overflow-hidden flex bg-[#FAF8F6] dark:bg-[#141210] text-[#1C1917] dark:text-[#F5F2EE]">
      <ScrollProgressBar containerRef={mainScrollRef} />
      <LiquidCrimsonBackdrop containerRef={mainScrollRef} />

      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`no-print fixed lg:static inset-y-0 left-0 z-50 lg:z-20 w-64 h-full shrink-0 border-r border-[#E2DDD6] dark:border-white/10 bg-white/80 dark:bg-[#191614]/80 backdrop-blur-2xl flex flex-col transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-16 px-4 border-b border-[#E2DDD6] dark:border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <BrandLogo size="sm" />
            <div className="min-w-0">
              <div className="text-sm font-bold tracking-tight text-[#B3261E] dark:text-[#F28B82] truncate">
                Admin Console
              </div>
              <div className="text-[11px] text-[#57534E] dark:text-[#A8A29E] truncate">
                Blood Donation Portal
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Admin navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = section === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => goToSection(item.key)}
                className={`w-full min-h-[42px] px-3 rounded-xl text-sm font-medium flex items-center gap-2.5 transition-colors ${
                  active
                    ? 'bg-[#FBEAE8] text-[#B3261E] dark:bg-[#3A1513] dark:text-[#F28B82] border border-[#E6B8B5] dark:border-[#B3261E]/40 font-semibold'
                    : 'text-[#57534E] dark:text-[#A8A29E] hover:bg-[#F3EFEA] dark:hover:bg-white/5 hover:text-[#1C1917] dark:hover:text-[#F5F2EE]'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[#E2DDD6] dark:border-white/10 space-y-1.5">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/');
            }}
            className="w-full min-h-[40px] px-3 rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/60 dark:bg-[#141210]/70 text-xs font-medium flex items-center justify-between hover:bg-[#F3EFEA] dark:hover:bg-white/10 transition-colors"
          >
            <span>Public Portal</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="no-print shrink-0 h-16 px-4 sm:px-6 border-b border-[#E2DDD6] dark:border-white/10 bg-white/75 dark:bg-[#191614]/75 backdrop-blur-2xl flex items-center justify-between gap-4 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open admin menu"
              className="lg:hidden min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-[#E2DDD6] dark:border-white/10"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-base sm:text-lg font-bold tracking-tight truncate">{activeNav.label}</h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => goToSection('notifications')}
              aria-label="Open notifications"
              className="relative min-h-[40px] px-2.5 rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/70 dark:bg-[#141210]/70 inline-flex items-center gap-1.5 text-xs font-medium hover:bg-[#F3EFEA] dark:hover:bg-white/10 transition-colors"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              <span className="tabular-nums font-semibold text-[#B3261E] dark:text-[#F28B82]">
                {overview?.unreadNotificationsCount ?? 0}
              </span>
            </button>

            <button
              type="button"
              onClick={onToggleDark}
              aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/70 dark:bg-[#141210]/70 hover:bg-[#F3EFEA] dark:hover:bg-white/10 transition-colors"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <div className="hidden sm:block text-right leading-tight">
              <div className="text-xs font-semibold text-[#1C1917] dark:text-[#F5F2EE]">{adminUser.name}</div>
              <div className="text-[11px] text-[#57534E] dark:text-[#A8A29E]">{adminUser.email}</div>
            </div>

            <button
              type="button"
              onClick={() => void handleLogout()}
              className="min-h-[40px] px-3 rounded-xl border border-[#E6B8B5] dark:border-[#B3261E]/40 dark:bg-[#3A1513]/70 text-xs font-semibold text-[#B3261E] dark:text-[#F28B82] hover:bg-[#FBEAE8] dark:hover:bg-[#3A1513] inline-flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <div
          ref={mainScrollRef}
          className="flex-1 overflow-y-auto overscroll-contain"
        >
          <main className="p-4 sm:p-6 max-w-7xl w-full mx-auto">
            {section === 'dashboard' && overview && (
              <AdminOverviewSection overview={overview} onNavigateSection={goToSection} />
            )}
            {section === 'users' && (
              <AdminUsersSection token={token} onToast={addToast} onAuthError={handleAuthError} />
            )}
            {section === 'stock' && (
              <AdminStockSection token={token} onToast={addToast} onAuthError={handleAuthError} />
            )}
            {section === 'requests' && (
              <AdminRequestsSection token={token} onToast={addToast} onAuthError={handleAuthError} />
            )}
            {section === 'donations' && (
              <AdminDonationsSection token={token} onToast={addToast} onAuthError={handleAuthError} />
            )}
            {section === 'camps' && (
              <AdminCampsSection token={token} onToast={addToast} onAuthError={handleAuthError} />
            )}
            {section === 'notifications' && (
              <AdminNotificationsSection token={token} onToast={addToast} onAuthError={handleAuthError} />
            )}
            {section === 'reports' && (
              <AdminReportsSection token={token} onToast={addToast} onAuthError={handleAuthError} />
            )}
            {section === 'content' && (
              <AdminContentSection token={token} onToast={addToast} onAuthError={handleAuthError} />
            )}
            {section === 'settings' && (
              <AdminSettingsSection
                token={token}
                currentAdmin={adminUser}
                onToast={addToast}
                onAuthError={handleAuthError}
              />
            )}
          </main>
        </div>
      </div>

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
