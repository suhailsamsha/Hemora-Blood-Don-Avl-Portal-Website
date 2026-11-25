import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  Flag,
  PhoneForwarded,
  Search,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import heroDonorImg from '../assets/images/hero_blood_donor_1795620237130.jpg';
import { api, getSavedContactTracks, type SavedContactTrack } from '../lib/api.ts';
import { BLOOD_GROUPS, type AvailabilitySummary, type BloodGroup, type DonorPublic } from '../shared/types.ts';
import { TRANSLATIONS, type Language } from '../i18n/translations.ts';
import { ContactDonorModal } from '../components/ContactDonorModal.tsx';
import { MangaloreDirectorySection } from '../components/MangaloreDirectorySection.tsx';
import { ReportModal } from '../components/ReportModal.tsx';
import {
  GlassSegmentedControl,
  IOS_SPRING,
  Perspective3DCard,
  SmoothReveal,
  SmoothRow,
} from '../components/SmoothSection.tsx';
import { GlassAreaCombobox } from '../components/GlassAreaCombobox.tsx';
import { GlassSelect } from '../components/GlassSelect.tsx';

interface HomePageProps {
  lang: Language;
  initialCity?: string;
  initialBloodGroup?: string;
  onOpenRequestBlood: (defaults?: { bloodGroup?: BloodGroup; city?: string }) => void;
  onNavigate: (path: string) => void;
}

export function HomePage({
  lang,
  initialCity = '',
  initialBloodGroup = 'ALL',
  onOpenRequestBlood,
  onNavigate,
}: HomePageProps) {
  const t = TRANSLATIONS[lang];
  const reducedMotion = useReducedMotion();

  const [bloodGroup, setBloodGroup] = useState<string>(initialBloodGroup || 'ALL');
  const [city, setCity] = useState<string>(initialCity || '');
  const [area, setArea] = useState<string>('');
  const [availableOnly, setAvailableOnly] = useState<boolean>(true);
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);

  const [summary, setSummary] = useState<AvailabilitySummary | null>(null);
  const [donors, setDonors] = useState<DonorPublic[]>([]);
  const [loadingDonors, setLoadingDonors] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [contactDonor, setContactDonor] = useState<DonorPublic | null>(null);
  const [activeTrack, setActiveTrack] = useState<{ id: string; token: string } | null>(null);
  const [reportTarget, setReportTarget] = useState<DonorPublic | null>(null);
  const [savedTracks, setSavedTracks] = useState<SavedContactTrack[]>(() => getSavedContactTracks());

  const loadData = useCallback(
    async (filters: {
      bloodGroup: string;
      city: string;
      area: string;
      availableOnly: boolean;
      verifiedOnly: boolean;
    }) => {
      setLoadingDonors(true);
      setError(null);
      try {
        const [sumRes, donorRes] = await Promise.all([
          api.getSummary(),
          api.searchDonors(filters),
        ]);
        setSummary(sumRes);
        setDonors(donorRes.donors);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load donor directory.');
      } finally {
        setLoadingDonors(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadData({ bloodGroup, city, area, availableOnly, verifiedOnly });
  }, [loadData, bloodGroup, city, availableOnly, verifiedOnly]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    void loadData({ bloodGroup, city, area, availableOnly, verifiedOnly });
  }

  function applyQuickFilter(nextGroup: string, nextCity: string) {
    setBloodGroup(nextGroup);
    setCity(nextCity);
    setArea('');
    setAvailableOnly(true);
  }

  function applyDonorFilterFromDirectory(params: {
    bloodGroup?: string;
    area?: string;
    city?: string;
  }) {
    const nextGroup = params.bloodGroup || 'ALL';
    const nextCity = params.city ?? 'Mangaluru';
    const nextArea = params.area ?? '';
    setBloodGroup(nextGroup);
    setCity(nextCity);
    setArea(nextArea);
    setAvailableOnly(true);
    void loadData({
      bloodGroup: nextGroup,
      city: nextCity,
      area: nextArea,
      availableOnly: true,
      verifiedOnly,
    });
    const el = document.getElementById('donor-search-results');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const cityOptions = summary?.cityList ?? [
    'Mangaluru',
    'Bengaluru',
    'Chennai',
    'Coimbatore',
    'Delhi',
    'Hyderabad',
    'Madurai',
    'Mumbai',
  ];

  return (
    <div className="space-y-8">
      {/* iOS 26 Liquid Glass Editorial Hero + Search Block */}
      <section className="space-y-6 pb-2" aria-label="Community blood network overview">
        <div className="ios-hero-glass rounded-[28px] p-6 sm:p-8 lg:p-10 relative overflow-hidden">
          {/* Flowing organic crimson ribbon SVG echoing reference composition */}
          <svg
            aria-hidden="true"
            viewBox="0 0 800 420"
            fill="none"
            className="pointer-events-none absolute -right-12 -top-6 w-[580px] sm:w-[700px] lg:w-[760px] h-auto opacity-85 dark:opacity-55 select-none"
          >
            <path
              d="M36 392C118 336 168 184 268 182C356 180 398 312 496 296C596 280 638 82 778 96"
              stroke="url(#heroCrimsonWave)"
              strokeWidth="44"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="heroCrimsonWave" x1="36" y1="392" x2="778" y2="96" gradientUnits="userSpaceOnUse">
                <stop stopColor="#B3261E" stopOpacity="0.06" />
                <stop offset="0.48" stopColor="#B3261E" stopOpacity="0.22" />
                <stop offset="1" stopColor="#F28B82" stopOpacity="0.28" />
              </linearGradient>
            </defs>
          </svg>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center relative z-10">
            {/* Left Copy & Primary Decision Column */}
            <motion.div
              initial={reducedMotion ? undefined : { opacity: 0, y: 14 }}
              animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={IOS_SPRING}
              className="lg:col-span-6 space-y-5"
            >
              <p className="text-xs font-semibold tracking-wide text-[#57534E] dark:text-[#A8A29E] tabular-nums">
                Verified Community Blood Network · {summary ? summary.citiesCount : 8} Cities Live
              </p>

              <h1 className="text-[clamp(2.15rem,4.1vw,3.45rem)] font-extrabold leading-[1.07] tracking-tight text-[#1C1917] dark:text-[#F5F2EE] [text-wrap:balance]">
                Blood care built for{' '}
                <span className="text-[#B3261E] dark:text-[#F28B82]">urgent lives</span>
              </h1>

              <p className="text-sm sm:text-base text-[#57534E] dark:text-[#C7BFB6] leading-relaxed max-w-xl">
                {t.homeSubnote} Connect directly with verified donors nearby, monitor real-time component stock, and schedule safe donations protected by a 90-day recovery lock.
              </p>

              <div className="flex flex-wrap items-center gap-3.5 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    onOpenRequestBlood({
                      bloodGroup: bloodGroup !== 'ALL' ? (bloodGroup as BloodGroup) : 'O+',
                      city: city || 'Mangaluru',
                    })
                  }
                  className="w-full sm:w-auto min-h-[48px] px-6 py-3 text-sm font-semibold rounded-2xl bg-[#B3261E] text-white hover:bg-[#961E17] active:scale-[0.98] transition-[background-color,transform] duration-150 inline-flex items-center justify-center gap-2 whitespace-nowrap shadow-sm"
                >
                  <span>{t.ctaRequestBlood}</span>
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </button>

                <a
                  href="#donor-search-form"
                  className="w-full sm:w-auto min-h-[48px] px-4 py-2.5 text-sm font-semibold text-[#1C1917] dark:text-[#F5F2EE] hover:text-[#B3261E] dark:hover:text-[#F28B82] inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors"
                >
                  <span>Find Matching Donors</span>
                  <ArrowDown className="h-4 w-4 shrink-0" aria-hidden="true" />
                </a>
              </div>
            </motion.div>

            {/* Right 3D Liquid Glass Portrait Visual */}
            <div className="lg:col-span-6 relative">
              <Perspective3DCard
                tiltStrength={4.5}
                className="ios-glass rounded-[26px] p-2 sm:p-2.5 shadow-[0_24px_48px_-18px_rgba(28,25,23,0.22)] dark:shadow-[0_24px_52px_-16px_rgba(0,0,0,0.75)]"
              >
                <div className="relative rounded-[20px] overflow-hidden">
                  <img
                    src={heroDonorImg}
                    alt="Smiling verified volunteer blood donor in a sunlit modern glass studio"
                    className="w-full h-[260px] sm:h-[310px] lg:h-[330px] object-cover object-top block"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 via-black/15 to-transparent"
                  />
                </div>
              </Perspective3DCard>

              {/* Floating bottom-right spotlight bar modeled after reference screenshot */}
              <div className="mt-3 sm:mt-0 sm:absolute sm:bottom-5 sm:right-5 z-20">
                <button
                  type="button"
                  onClick={() => onNavigate('/donor')}
                  className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-2xl ios-glass text-xs font-semibold text-[#1C1917] dark:text-[#F5F2EE] hover:border-[#B3261E]/60 active:scale-[0.98] transition-all inline-flex items-center justify-between sm:justify-start gap-3 shadow-lg"
                >
                  <span className="inline-flex items-center gap-2">
                    <CalendarCheck2 className="h-4 w-4 text-[#B3261E] dark:text-[#F28B82] shrink-0" aria-hidden="true" />
                    <span>Schedule Future Donation</span>
                  </span>
                  <span className="text-[#B3261E] dark:text-[#F28B82] inline-flex items-center gap-1 whitespace-nowrap">
                    <span>Book slot</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Floating Bottom Full-Width Liquid Glass Metrics & Regional Hospital Trust Strip */}
          <div className="mt-6 lg:mt-8 relative z-10">
            <Perspective3DCard
              tiltStrength={2.2}
              className="ios-glass rounded-[22px] px-5 py-4 sm:px-7 sm:py-5"
            >
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 flex-1">
                  <div>
                    <p className="text-xl sm:text-2xl font-extrabold text-[#1C1917] dark:text-[#F5F2EE] tabular-nums">
                      {summary ? `${summary.totalAvailable}+` : '15+'}
                    </p>
                    <p className="text-xs text-[#57534E] dark:text-[#A8A29E] mt-0.5">
                      Eligible donors ready
                    </p>
                  </div>

                  <div>
                    <p className="text-xl sm:text-2xl font-extrabold text-[#1C1917] dark:text-[#F5F2EE] tabular-nums">
                      {summary ? summary.citiesCount : 8}
                    </p>
                    <p className="text-xs text-[#57534E] dark:text-[#A8A29E] mt-0.5">
                      Cities connected
                    </p>
                  </div>

                  <div>
                    <p className="text-xl sm:text-2xl font-extrabold text-[#1C1917] dark:text-[#F5F2EE] tabular-nums">
                      90 days
                    </p>
                    <p className="text-xs text-[#57534E] dark:text-[#A8A29E] mt-0.5">
                      Recovery protection
                    </p>
                  </div>

                  <div>
                    <p className="text-xl sm:text-2xl font-extrabold text-[#1C1917] dark:text-[#F5F2EE] tabular-nums">
                      24/7
                    </p>
                    <p className="text-xs text-[#57534E] dark:text-[#A8A29E] mt-0.5">
                      Verified blood banks
                    </p>
                  </div>
                </div>

                <div className="xl:border-l xl:border-[#E2DDD6]/75 dark:xl:border-white/10 xl:pl-6 flex flex-wrap items-center gap-x-5 gap-y-2">
                  <a
                    href="#mangaluru-directory"
                    className="text-[11px] font-medium text-[#57534E] dark:text-[#A8A29E] hover:text-[#B3261E] dark:hover:text-[#F28B82] leading-tight shrink-0"
                  >
                    Coordinating
                    <br className="hidden xl:inline" /> across
                  </a>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm font-bold tracking-tight text-[#1C1917]/85 dark:text-[#F5F2EE]/85">
                    <span>Wenlock</span>
                    <span>KMC Attavar</span>
                    <span>Father Muller</span>
                    <span>Red Cross</span>
                    <span className="text-[#B3261E] dark:text-[#F28B82]">e-RaktKosh</span>
                  </div>
                </div>
              </div>
            </Perspective3DCard>
          </div>
        </div>

        <SmoothReveal>
        <Perspective3DCard tiltStrength={1.8} animateEntrance={false} className="p-5 sm:p-6 rounded-[24px] ios-glass">
          <form
            id="donor-search-form"
            onSubmit={handleSearchSubmit}
            className="space-y-4"
          >
            {/* 1-tap Blood Group Frosted Segmented Control */}
            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E]">
                Quick select blood group
              </span>
              <GlassSegmentedControl
                ariaLabel="Quick select blood group"
                layoutId="home-blood-group-segment"
                value={bloodGroup}
                onChange={setBloodGroup}
                options={[
                  { value: 'ALL', label: t.searchAllGroups },
                  ...BLOOD_GROUPS.map((g) => ({ value: g, label: g })),
                ]}
              />
            </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label
                htmlFor="search-blood-group"
                className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1.5"
              >
                {t.searchBloodGroup}
              </label>
              <GlassSelect
                id="search-blood-group"
                ariaLabel={t.searchBloodGroup}
                value={bloodGroup}
                onChange={setBloodGroup}
                options={[
                  { value: 'ALL', label: t.searchAllGroups },
                  ...BLOOD_GROUPS.map((g) => ({ value: g, label: g })),
                ]}
              />
            </div>

            <div>
              <label
                htmlFor="search-city"
                className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1.5"
              >
                {t.searchCity}
              </label>
              <GlassSelect
                id="search-city"
                ariaLabel={t.searchCity}
                value={city}
                onChange={setCity}
                options={[
                  { value: '', label: t.searchAllCities },
                  ...cityOptions.map((c) => ({ value: c, label: c })),
                ]}
              />
            </div>

            <div>
              <label
                htmlFor="search-area"
                className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1.5"
              >
                Locality / Area
              </label>
              <GlassAreaCombobox
                id="search-area"
                city={city || 'Mangaluru'}
                value={area}
                onChange={setArea}
                placeholder={t.searchAreaPlaceholder}
                ariaLabel="Locality / Area"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl bg-[#B3261E] text-white hover:bg-[#961E17] active:scale-[0.98] transition-all duration-150 inline-flex items-center justify-center gap-2 whitespace-nowrap shadow-sm"
              >
                <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{t.searchButton}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="flex flex-wrap items-center gap-5">
              <label className="inline-flex items-center gap-2.5 min-h-[44px] cursor-pointer text-sm text-[#1C1917] dark:text-[#F5F2EE]">
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={(e) => setAvailableOnly(e.target.checked)}
                  className="h-4 w-4 accent-[#B3261E]"
                />
                <span>{t.searchAvailableOnly}</span>
              </label>

              <label className="inline-flex items-center gap-2.5 min-h-[44px] cursor-pointer text-sm text-[#1C1917] dark:text-[#F5F2EE]">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                  className="h-4 w-4 accent-[#B3261E]"
                />
                <span>{t.searchVerifiedOnly}</span>
              </label>
            </div>

            {(bloodGroup !== 'ALL' || city !== '' || area !== '' || !availableOnly || verifiedOnly) && (
              <button
                type="button"
                onClick={() => {
                  setBloodGroup('ALL');
                  setCity('');
                  setArea('');
                  setAvailableOnly(true);
                  setVerifiedOnly(false);
                }}
                className="min-h-[44px] px-2 text-xs font-medium text-[#B3261E] dark:text-[#F28B82] hover:underline"
              >
                Reset filters
              </button>
            )}
          </div>
        </form>
        </Perspective3DCard>
        </SmoothReveal>
      </section>

      {/* Main Uneven Split: Donor List (8 cols) + Live Availability & Shortages (4 cols) */}
      <div id="donor-search-results" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <section className="lg:col-span-8 space-y-4" aria-label="Search results">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
                Matching donors{' '}
                <span className="text-sm font-normal text-[#57534E] dark:text-[#A8A29E] tabular-nums">
                  ({donors.length})
                </span>
              </h2>
              <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">
                Unconfirmed &gt;90d donors are hidden automatically
              </p>
            </div>

            <GlassSegmentedControl
              ariaLabel="Donor eligibility view"
              layoutId="home-donor-status-segment"
              size="sm"
              value={verifiedOnly ? 'verified' : availableOnly ? 'available' : 'all'}
              onChange={(mode) => {
                if (mode === 'verified') {
                  setAvailableOnly(true);
                  setVerifiedOnly(true);
                } else if (mode === 'available') {
                  setAvailableOnly(true);
                  setVerifiedOnly(false);
                } else {
                  setAvailableOnly(false);
                  setVerifiedOnly(false);
                }
              }}
              options={[
                { value: 'available', label: 'Available now' },
                { value: 'verified', label: 'Verified only' },
                { value: 'all', label: 'Include cooldown' },
              ]}
            />
          </div>

          {error && (
            <div
              role="alert"
              className="p-4 rounded-2xl border border-[#B3261E]/40 bg-[#FBEAE8] dark:bg-[#3A1513] text-sm text-[#B3261E] dark:text-[#F28B82]"
            >
              {error}
            </div>
          )}

          {loadingDonors ? (
            <div className="ios-glass rounded-[22px] divide-y divide-[#E2DDD6]/70 dark:divide-white/10">
              {[1, 2, 3, 4].map((row) => (
                <div key={row} className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-48 bg-[#E2DDD6] dark:bg-white/10 rounded-lg" />
                    <div className="h-3 w-64 bg-[#F3EFEA] dark:bg-white/5 rounded-lg" />
                  </div>
                  <div className="h-10 w-32 bg-[#F3EFEA] dark:bg-white/5 rounded-xl" />
                </div>
              ))}
            </div>
          ) : donors.length === 0 ? (
            <div className="p-6 rounded-[22px] ios-glass space-y-3">
              <p className="text-sm text-[#1C1917] dark:text-[#F5F2EE] font-medium">
                {t.noDonorsFound}
              </p>
              <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">
                Post an urgent request on the Blood Requests Board or widen your area filter so nearby
                donors receive an alert.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    onOpenRequestBlood({
                      bloodGroup: bloodGroup !== 'ALL' ? (bloodGroup as BloodGroup) : 'O+',
                      city: city || 'Mangaluru',
                    })
                  }
                  className="min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl bg-[#B3261E] text-white hover:bg-[#961E17]"
                >
                  {t.ctaRequestBlood}
                </button>
                {availableOnly && (
                  <button
                    type="button"
                    onClick={() => setAvailableOnly(false)}
                    className="min-h-[44px] px-4 py-2 text-sm font-medium rounded-xl ios-glass-subtle text-[#1C1917] dark:text-[#F5F2EE]"
                  >
                    Include donors in 90-day cooldown
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {donors.map((donor, idx) => {
                const canContact = donor.eligibility.isSearchEligible;
                return (
                  <SmoothRow key={donor.id} index={idx}>
                    <Perspective3DCard
                      tiltStrength={2.8}
                      animateEntrance={false}
                      className="ios-glass rounded-[22px]"
                    >
                      <article className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div
                            className="w-12 h-11 shrink-0 rounded-xl ios-glass-subtle flex items-center justify-center text-sm font-bold text-[#B3261E] dark:text-[#F28B82] tabular-nums"
                            aria-label={`Blood group ${donor.bloodGroup}`}
                          >
                            {donor.bloodGroup}
                          </div>
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                              <h3 className="text-base font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
                                {donor.firstName}
                              </h3>
                              {donor.verified ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-[#166534] dark:text-[#86EFAC]">
                                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                  <span>{t.verifiedLabel}</span>
                                </span>
                              ) : (
                                <span className="text-xs text-[#57534E] dark:text-[#A8A29E]">
                                  {t.unverifiedLabel}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#57534E] dark:text-[#A8A29E]">
                              <span className="font-medium text-[#1C1917] dark:text-[#F5F2EE]">
                                {donor.area}, {donor.city}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="tabular-nums">
                                {t.lastDonationLabel}:{' '}
                                {donor.lastDonation ? donor.lastDonation : t.noRecentDonation}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>
                                {canContact ? (
                                  <span className="text-[#166534] dark:text-[#86EFAC] font-medium">
                                    {t.availableLabel}
                                  </span>
                                ) : donor.eligibility.isCooldownActive ? (
                                  <span className="text-[#92400E] dark:text-[#FBBF24] tabular-nums">
                                    {t.cooldownLabel} (eligible {donor.eligibility.nextEligibleDate})
                                  </span>
                                ) : (
                                  <span>{t.pausedLabel}</span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
                          <button
                            type="button"
                            disabled={!canContact}
                            onClick={() => setContactDonor(donor)}
                            className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl bg-[#B3261E] text-white hover:bg-[#961E17] active:scale-[0.98] transition-[background-color,transform] duration-150 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shadow-sm"
                          >
                            {t.requestContactBtn}
                          </button>
                          <button
                            type="button"
                            onClick={() => setReportTarget(donor)}
                            aria-label={`Report ${donor.firstName}`}
                            className="min-h-[44px] px-3 py-2 text-xs font-medium rounded-xl ios-glass-subtle text-[#57534E] dark:text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-[#F5F2EE] active:scale-[0.98] transition-[color,transform] duration-150 inline-flex items-center gap-1.5 whitespace-nowrap"
                          >
                            <Flag className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>{t.reportBtn}</span>
                          </button>
                        </div>
                      </article>
                    </Perspective3DCard>
                  </SmoothRow>
                );
              })}
            </div>
          )}

          <p className="text-xs text-[#57534E] dark:text-[#A8A29E] pt-1">
            {t.medicalDisclaimer}
          </p>
        </section>

        {/* Sidebar: Shortages + Live Group Counts + Recent Contact Tracks */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Shortage Highlights */}
          <SmoothReveal>
            <Perspective3DCard tiltStrength={3.2} className="p-5 rounded-[22px] ios-glass space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-[#B3261E] dark:text-[#F28B82] shrink-0" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
                  {t.shortageHeading}
                </h2>
              </div>
              {summary && summary.shortages.length > 0 ? (
                <ul className="divide-y divide-[#E2DDD6]/70 dark:divide-white/10">
                  {summary.shortages.slice(0, 6).map((s) => (
                    <li key={`${s.city}-${s.bloodGroup}`}>
                      <button
                        type="button"
                        onClick={() => applyQuickFilter(s.bloodGroup, s.city)}
                        className="w-full min-h-[44px] py-2 flex items-center justify-between text-left text-sm hover:text-[#B3261E] dark:hover:text-[#F28B82] transition-colors duration-150"
                      >
                        <span>
                          <span className="font-semibold text-[#B3261E] dark:text-[#F28B82] tabular-nums">
                            {s.bloodGroup}
                          </span>{' '}
                          <span className="text-[#57534E] dark:text-[#A8A29E]">in {s.city}</span>
                        </span>
                        <span className="text-xs font-medium text-[#1C1917] dark:text-[#F5F2EE] tabular-nums">
                          {s.availableCount} available
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">
                  No critical shortages reported right now.
                </p>
              )}
            </Perspective3DCard>
          </SmoothReveal>

          {/* Availability by Blood Group */}
          <SmoothReveal delay={0.05}>
            <Perspective3DCard tiltStrength={3.2} className="p-5 rounded-[22px] ios-glass space-y-3">
              <h2 className="text-sm font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
                {t.availabilityByGroup}
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {(summary?.byGroup ?? BLOOD_GROUPS.map((g) => ({ bloodGroup: g, availableCount: 0, verifiedAvailableCount: 0 }))).map(
                  (item) => {
                    const isActive = bloodGroup === item.bloodGroup;
                    return (
                      <button
                        key={item.bloodGroup}
                        type="button"
                        onClick={() =>
                          setBloodGroup(isActive ? 'ALL' : item.bloodGroup)
                        }
                        className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-left transition-all duration-150 flex items-center justify-between active:scale-[0.98] ${
                          isActive
                            ? 'border-[#B3261E] bg-[#FBEAE8] dark:bg-[#3A1513] text-[#B3261E] dark:text-[#F28B82] shadow-sm'
                            : 'border-[#E2DDD6] dark:border-white/10 bg-white/75 dark:bg-[#141210]/80 text-[#1C1917] dark:text-[#F5F2EE] hover:border-[#B3261E]/50'
                        }`}
                      >
                        <span className="text-sm font-bold">{item.bloodGroup}</span>
                        <span className="text-xs text-[#57534E] dark:text-[#A8A29E] tabular-nums">
                          {item.availableCount}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            </Perspective3DCard>
          </SmoothReveal>

          {/* Saved Contact Requests from this browser */}
          {savedTracks.length > 0 && (
            <SmoothReveal delay={0.08}>
            <Perspective3DCard tiltStrength={3.2} animateEntrance={false} className="p-5 rounded-[22px] ios-glass space-y-3">
              <div className="flex items-center gap-2">
                <PhoneForwarded className="h-4 w-4 text-[#57534E] dark:text-[#A8A29E] shrink-0" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
                  Your recent contact requests
                </h2>
              </div>
              <ul className="divide-y divide-[#E2DDD6]/70 dark:divide-white/10">
                {savedTracks.slice(0, 4).map((tr) => (
                  <li key={tr.id}>
                    <button
                      type="button"
                      onClick={() => setActiveTrack({ id: tr.id, token: tr.token })}
                      className="w-full min-h-[44px] py-2 text-left text-xs hover:text-[#B3261E] dark:hover:text-[#F28B82]"
                    >
                      <span className="font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
                        {tr.donorFirstName} ({tr.bloodGroup})
                      </span>{' '}
                      <span className="text-[#57534E] dark:text-[#A8A29E]">· {tr.hospital}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Perspective3DCard>
            </SmoothReveal>
          )}
        </aside>
      </div>

      {/* Mangalore Blood Banks, Hospitals, Live Component Stock & Donation Camps */}
      <SmoothReveal>
        <MangaloreDirectorySection
          onSelectDonorFilter={applyDonorFilterFromDirectory}
          onOpenRequestBlood={onOpenRequestBlood}
        />
      </SmoothReveal>

      {(contactDonor || activeTrack) && (
        <ContactDonorModal
          donor={contactDonor}
          existingTrack={activeTrack}
          lang={lang}
          onClose={() => {
            setContactDonor(null);
            setActiveTrack(null);
            setSavedTracks(getSavedContactTracks());
          }}
          onNavigate={onNavigate}
        />
      )}

      {reportTarget && (
        <ReportModal
          targetType="donor"
          targetId={reportTarget.id}
          targetLabel={`${reportTarget.firstName} · ${reportTarget.bloodGroup} · ${reportTarget.area}, ${reportTarget.city}`}
          onClose={() => setReportTarget(null)}
        />
      )}
    </div>
  );
}
