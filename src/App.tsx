import { useCallback, useEffect, useState } from 'react';
import { ArrowUp, Cloud, Menu, Moon, Sun, X } from 'lucide-react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { AuthProvider, useFirebaseAuth } from './contexts/AuthContext.tsx';
import {
  GlassSegmentedControl,
  IOS_EASE,
  IOS_SPRING,
  LiquidCrimsonBackdrop,
  ScrollProgressBar,
} from './components/SmoothSection.tsx';
import { LANGUAGE_LABELS, TRANSLATIONS, type Language } from './i18n/translations.ts';
import type { BloodGroup } from './shared/types.ts';
import { HomePage } from './pages/HomePage.tsx';
import { RequestsPage } from './pages/RequestsPage.tsx';
import { RegisterDonorPage } from './pages/RegisterDonorPage.tsx';
import { DonorDashboardPage } from './pages/DonorDashboardPage.tsx';
import { PartnersPage } from './pages/PartnersPage.tsx';
import { AwarenessPage } from './pages/AwarenessPage.tsx';
import { QrPosterPage } from './pages/QrPosterPage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';
import { RequestBloodModal } from './components/RequestBloodModal.tsx';
import { BrandLogo } from './components/BrandLogo.tsx';
import { ThreeBloodLab } from './components/three/ThreeBloodLab.tsx';
import { AdminLoginPage } from './pages/admin/AdminLoginPage.tsx';
import { AdminLayout, type AdminSectionKey } from './pages/admin/AdminLayout.tsx';

function getInitialLang(): Language {
  const saved = localStorage.getItem('bdp_lang');
  if (saved === 'en' || saved === 'ta' || saved === 'hi' || saved === 'kn') return saved;
  return 'en';
}

function getInitialDark(): boolean {
  const saved = localStorage.getItem('bdp_theme_mode');
  if (saved === 'light') return false;
  return true;
}

function AppShell() {
  const { user: firebaseUser } = useFirebaseAuth();
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);

  const [locationState, setLocationState] = useState<{ pathname: string; search: string }>(() => ({
    pathname: window.location.pathname || '/',
    search: window.location.search || '',
  }));
  const [lang, setLang] = useState<Language>(getInitialLang);
  const [dark, setDark] = useState<boolean>(getInitialDark);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [requestModalDefaults, setRequestModalDefaults] = useState<{
    bloodGroup?: BloodGroup;
    city?: string;
  } | null>(null);
  const [requestsRefreshSignal, setRequestsRefreshSignal] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const onQuotaExceeded = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 420);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    localStorage.setItem('bdp_lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('bdp_theme_mode', dark ? 'dark' : 'light');
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [dark]);

  useEffect(() => {
    const onPopState = () => {
      setLocationState({
        pathname: window.location.pathname || '/',
        search: window.location.search || '',
      });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleToggleDark = useCallback(() => {
    setDark((prev) => !prev);
  }, []);

  const navigate = useCallback((path: string) => {
    const url = new URL(path, window.location.origin);
    window.history.pushState({}, '', `${url.pathname}${url.search}`);
    setLocationState({ pathname: url.pathname, search: url.search });
    setMobileMenuOpen(false);
    const isAdminSubRoute =
      url.pathname === '/admin' || url.pathname.startsWith('/admin/');
    if (!isAdminSubRoute) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []);

  const pathname = locationState.pathname.replace(/\/+$/, '') || '/';
  const searchParams = new URLSearchParams(locationState.search);
  const queryCity = searchParams.get('city') ?? '';
  const queryBloodGroup = searchParams.get('bloodGroup') ?? 'ALL';

  const navItems = [
    { path: '/', label: t.navFindDonors },
    { path: '/requests', label: t.navRequests },
    { path: '/register', label: t.navBecomeDonor },
    { path: '/donor', label: t.navDonorLogin },
    { path: '/awareness', label: t.navAwareness },
    { path: '/3d-studio', label: '3D Blood Lab' },
  ];

  const validAdminSections: AdminSectionKey[] = [
    'dashboard',
    'users',
    'stock',
    'requests',
    'donations',
    'camps',
    'notifications',
    'reports',
    'content',
    'settings',
  ];

  if (pathname === '/3d-studio') {
    return (
      <MotionConfig reducedMotion="user">
        <ThreeBloodLab onBack={() => navigate('/')} />
      </MotionConfig>
    );
  }

  if (pathname === '/admin/login') {
    return (
      <MotionConfig reducedMotion="user">
        <AdminLoginPage
          onSuccess={() => navigate('/admin')}
          onBackPublic={() => navigate('/')}
        />
      </MotionConfig>
    );
  }

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const sub = pathname === '/admin' ? 'dashboard' : pathname.slice('/admin/'.length);
    const activeSection: AdminSectionKey = validAdminSections.includes(sub as AdminSectionKey)
      ? (sub as AdminSectionKey)
      : 'dashboard';

    return (
      <MotionConfig reducedMotion="user">
        <AdminLayout
          section={activeSection}
          dark={dark}
          onToggleDark={handleToggleDark}
          onNavigate={navigate}
        />
      </MotionConfig>
    );
  }

  function renderPage() {
    switch (pathname) {
      case '/':
        return (
          <HomePage
            lang={lang}
            initialCity={queryCity}
            initialBloodGroup={queryBloodGroup}
            onOpenRequestBlood={(defaults) => setRequestModalDefaults(defaults ?? {})}
            onNavigate={navigate}
          />
        );
      case '/requests':
        return (
          <RequestsPage
            lang={lang}
            onOpenRequestBlood={() => setRequestModalDefaults({})}
            refreshSignal={requestsRefreshSignal}
          />
        );
      case '/register':
        return <RegisterDonorPage onNavigate={navigate} />;
      case '/donor':
        return <DonorDashboardPage lang={lang} onNavigate={navigate} />;
      case '/partners':
        return <PartnersPage onNavigate={navigate} />;
      case '/awareness':
        return <AwarenessPage onNavigate={navigate} />;
      case '/qr':
        return <QrPosterPage />;
      default:
        return <NotFoundPage onNavigate={navigate} />;
    }
  }

  return (
    <MotionConfig reducedMotion="user">
    <div className="relative min-h-screen flex flex-col bg-[#FAF8F6] text-[#1C1917] dark:bg-[#141210] dark:text-[#F5F2EE]">
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      <ScrollProgressBar />
      <LiquidCrimsonBackdrop />

      {/* Non-sticky utility bar for Language, Theme, and Secondary Institutional Links */}
      <div className="no-print relative z-20 border-b border-[#E2DDD6]/80 dark:border-white/10 bg-[#F3EFEA]/75 dark:bg-[#191614]/75 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 min-h-[44px] flex flex-wrap items-center justify-between gap-2 py-1 text-xs">
          <GlassSegmentedControl
            ariaLabel="Language switcher"
            layoutId="app-lang-segment"
            size="sm"
            value={lang}
            onChange={setLang}
            options={(['en', 'ta', 'hi', 'kn'] as const).map((code) => ({
              value: code,
              label: LANGUAGE_LABELS[code],
            }))}
          />

          <div className="flex items-center gap-3">
            <a
              href="/donor"
              onClick={(e) => {
                e.preventDefault();
                navigate('/donor');
              }}
              className="hidden sm:inline-flex items-center gap-1.5 py-1 text-[#57534E] dark:text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-[#F5F2EE] whitespace-nowrap"
            >
              <Cloud className="h-3.5 w-3.5 text-[#B3261E] dark:text-[#F28B82]" aria-hidden="true" />
              <span>
                {firebaseUser
                  ? firebaseUser.displayName || firebaseUser.email || 'Cloud Synced'
                  : 'Google Sync'}
              </span>
            </a>
            <a
              href="/partners"
              onClick={(e) => {
                e.preventDefault();
                navigate('/partners');
              }}
              className="hidden sm:inline-block py-1 text-[#57534E] dark:text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-[#F5F2EE] whitespace-nowrap"
            >
              {t.navPartners}
            </a>
            <a
              href="/qr"
              onClick={(e) => {
                e.preventDefault();
                navigate('/qr');
              }}
              className="hidden sm:inline-block py-1 text-[#57534E] dark:text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-[#F5F2EE] whitespace-nowrap"
            >
              {t.navQrPosters}
            </a>
            <a
              href="/admin"
              onClick={(e) => {
                e.preventDefault();
                navigate('/admin');
              }}
              className="py-1 text-[#57534E] dark:text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-[#F5F2EE] whitespace-nowrap"
            >
              {t.navAdmin}
            </a>
            <button
              type="button"
              onClick={() => setDark((prev) => !prev)}
              aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
              className="min-h-[36px] px-3 py-1 rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white dark:bg-[#262220] text-[#1C1917] dark:text-[#F5F2EE] inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              {dark ? (
                <>
                  <Sun className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t.themeLight}</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t.themeDark}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Header: 3-Zone Top Bar Contract */}
      <header className="no-print sticky top-0 z-30 border-b border-[#E2DDD6]/80 dark:border-white/10 bg-white/80 dark:bg-[#191614]/80 backdrop-blur-2xl backdrop-saturate-150">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
            className="inline-flex items-center gap-2.5 text-base sm:text-lg font-bold tracking-tight text-[#B3261E] dark:text-[#F28B82] whitespace-nowrap shrink-0"
          >
            <BrandLogo size="sm" />
            <span>{t.brand}</span>
          </a>

          <nav className="hidden md:flex items-center gap-6" aria-label="Primary navigation">
            {navItems.map((item) => {
              const active = pathname === item.path;
              return (
                <a
                  key={item.path}
                  href={item.path}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(item.path);
                  }}
                  className={`text-sm whitespace-nowrap shrink-0 transition-colors duration-150 ${
                    active
                      ? 'font-semibold text-[#B3261E] dark:text-[#F28B82] underline underline-offset-4'
                      : 'font-medium text-[#57534E] dark:text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-[#F5F2EE] hover:underline underline-offset-4'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setRequestModalDefaults({})}
              className="min-h-[44px] px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-[#B3261E] text-white hover:bg-[#961E17] active:scale-[0.98] transition-[background-color,transform] duration-150 whitespace-nowrap shrink-0 shadow-sm"
            >
              {t.ctaRequestBlood}
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md border border-[#E2DDD6] dark:border-[#38322E]"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <nav
            aria-label="Mobile navigation"
            className="md:hidden border-t border-[#E2DDD6]/80 dark:border-white/10 bg-white/95 dark:bg-[#191614]/95 backdrop-blur-xl px-4 py-3 space-y-1"
          >
            {[
              ...navItems,
              { path: '/partners', label: t.navPartners },
              { path: '/qr', label: t.navQrPosters },
            ].map((item) => (
              <a
                key={item.path}
                href={item.path}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.path);
                }}
                className={`block min-h-[44px] px-3 py-2.5 rounded-xl text-sm font-medium ${
                  pathname === item.path
                    ? 'bg-[#FBEAE8] dark:bg-[#3A1513] text-[#B3261E] dark:text-[#F28B82]'
                    : 'text-[#1C1917] dark:text-[#F5F2EE]'
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>
        )}
      </header>

      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: IOS_EASE }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.85, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 12 }}
            transition={IOS_SPRING}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Scroll back to top"
            className="no-print fixed bottom-5 right-5 z-40 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl ios-glass text-[#1C1917] dark:text-[#F5F2EE] hover:opacity-90 active:scale-[0.96] transition-opacity duration-150"
          >
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="no-print relative z-10 border-t border-[#E2DDD6]/80 dark:border-white/10 bg-white/75 dark:bg-[#191614]/75 backdrop-blur-xl mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">
          <p className="text-sm font-semibold text-[#B3261E] dark:text-[#F28B82]">
            {t.emergencyFooter}
          </p>
          <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">{t.medicalDisclaimer}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#57534E] dark:text-[#A8A29E] pt-1">
            <a
              href="/partners"
              onClick={(e) => {
                e.preventDefault();
                navigate('/partners');
              }}
              className="py-2 hover:text-[#1C1917] dark:hover:text-[#F5F2EE] underline-offset-4 hover:underline"
            >
              {t.navPartners}
            </a>
            <a
              href="/awareness"
              onClick={(e) => {
                e.preventDefault();
                navigate('/awareness');
              }}
              className="py-2 hover:text-[#1C1917] dark:hover:text-[#F5F2EE] underline-offset-4 hover:underline"
            >
              {t.navAwareness} &amp; FAQ
            </a>
            <a
              href="/qr"
              onClick={(e) => {
                e.preventDefault();
                navigate('/qr');
              }}
              className="py-2 hover:text-[#1C1917] dark:hover:text-[#F5F2EE] underline-offset-4 hover:underline"
            >
              {t.navQrPosters}
            </a>
            <a
              href="/admin"
              onClick={(e) => {
                e.preventDefault();
                navigate('/admin');
              }}
              className="py-2 hover:text-[#1C1917] dark:hover:text-[#F5F2EE] underline-offset-4 hover:underline"
            >
              {t.navAdmin}
            </a>
          </div>
        </div>
      </footer>

      {requestModalDefaults && (
        <RequestBloodModal
          defaultBloodGroup={requestModalDefaults.bloodGroup}
          defaultCity={requestModalDefaults.city}
          onClose={() => setRequestModalDefaults(null)}
          onCreated={() => {
            setRequestsRefreshSignal((n) => n + 1);
            navigate('/requests');
          }}
        />
      )}
    </div>
    </MotionConfig>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
