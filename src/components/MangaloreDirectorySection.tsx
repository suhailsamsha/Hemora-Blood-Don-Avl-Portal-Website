import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  Calendar,
  ExternalLink,
  MapPin,
  Navigation,
  Phone,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { accountApi } from '../lib/accountApi.ts';
import { useFirebaseAuth } from '../contexts/AuthContext.tsx';
import {
  BLOOD_COMPONENTS,
  BLOOD_GROUPS,
  MANGALORE_AREAS,
  type BloodCentreView,
  type BloodCentresPayload,
} from '../shared/types.ts';
import { BloodCentresGoogleMap } from './BloodCentresGoogleMap.tsx';
import { GlassSelect } from './GlassSelect.tsx';
import { GlassSegmentedControl, Perspective3DCard } from './SmoothSection.tsx';

interface MangaloreDirectorySectionProps {
  onSelectDonorFilter?: (params: { bloodGroup?: string; area?: string; city?: string }) => void;
  onOpenRequestBlood?: (defaults: { bloodGroup?: (typeof BLOOD_GROUPS)[number]; city?: string }) => void;
}

function formatTimestamp(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function toTelHref(phone: string): string {
  return `tel:${phone.replace(/[^+\d]/g, '')}`;
}

export function MangaloreDirectorySection({
  onSelectDonorFilter,
  onOpenRequestBlood,
}: MangaloreDirectorySectionProps) {
  const [data, setData] = useState<BloodCentresPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [bloodGroup, setBloodGroup] = useState<string>('ALL');
  const [component, setComponent] = useState<string>('ALL');
  const [zone, setZone] = useState<string>('ALL');
  const [area, setArea] = useState<string>('ALL');
  const [centreType, setCentreType] = useState<string>('ALL');
  const [only24Hour, setOnly24Hour] = useState<boolean>(false);
  const [nearestMode, setNearestMode] = useState<boolean>(false);
  const [nearestFromArea, setNearestFromArea] = useState<string>('Hampankatta');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [campCategoryFilter, setCampCategoryFilter] = useState<'ALL' | 'college' | 'corporate' | 'community'>('ALL');
  const [directoryView, setDirectoryView] = useState<'both' | 'map' | 'table'>('both');
  const [selectedCentreId, setSelectedCentreId] = useState<string | null>(null);
  const [savedCentreIds, setSavedCentreIds] = useState<string[]>([]);
  const [bookmarkBusyId, setBookmarkBusyId] = useState<string | null>(null);

  const { user: firebaseUser, idToken, getFreshIdToken } = useFirebaseAuth();

  const loadCentres = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await api.getCentres({
        bloodGroup,
        component,
        area: area !== 'ALL' ? area : undefined,
        zone,
        centreType,
        only24Hour,
        nearestToArea: nearestMode ? nearestFromArea : undefined,
      });
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Mangaluru blood centres.');
    } finally {
      setLoading(false);
    }
  }, [bloodGroup, component, area, zone, centreType, only24Hour, nearestMode, nearestFromArea]);

  useEffect(() => {
    void loadCentres();
  }, [loadCentres]);

  useEffect(() => {
    if (!firebaseUser || !idToken) {
      setSavedCentreIds([]);
      return;
    }
    let active = true;
    accountApi
      .getMe(idToken)
      .then((bundle) => {
        if (!active) return;
        setSavedCentreIds(bundle.bookmarks.map((b) => b.centreId));
      })
      .catch(() => {
        // Ignore transient bookmark load error
      });
    return () => {
      active = false;
    };
  }, [firebaseUser, idToken]);

  const handleToggleBookmark = useCallback(
    async (centre: BloodCentreView) => {
      if (!firebaseUser) return;
      const freshToken = (await getFreshIdToken()) ?? idToken;
      if (!freshToken) return;
      setBookmarkBusyId(centre.id);
      try {
        const isAlreadySaved = savedCentreIds.includes(centre.id);
        const bundle = isAlreadySaved
          ? await accountApi.removeSavedCentre(freshToken, centre.id)
          : await accountApi.saveCentre(freshToken, {
              centreId: centre.id,
              centreName: centre.name,
              centreArea: centre.area,
            });
        setSavedCentreIds(bundle.bookmarks.map((b) => b.centreId));
      } catch {
        // Ignore silent bookmark toggle errors
      } finally {
        setBookmarkBusyId(null);
      }
    },
    [firebaseUser, getFreshIdToken, idToken, savedCentreIds]
  );

  const areasForZone = useMemo(() => {
    if (zone === 'ALL') return MANGALORE_AREAS;
    return MANGALORE_AREAS.filter((a) => a.zone === zone);
  }, [zone]);

  const visibleCentres = useMemo(() => {
    const list = data?.centres ?? [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.area.toLowerCase().includes(q) ||
        c.zone.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  const visibleCamps = useMemo(() => {
    const camps = data?.camps ?? [];
    if (campCategoryFilter === 'ALL') return camps;
    return camps.filter((c) => (c.campCategory ?? 'community') === campCategoryFilter);
  }, [data, campCategoryFilter]);

  function handleZoneChange(nextZone: string) {
    setZone(nextZone);
    if (nextZone !== 'ALL' && area !== 'ALL') {
      const stillInZone = MANGALORE_AREAS.some((a) => a.name === area && a.zone === nextZone);
      if (!stillInZone) setArea('ALL');
    }
  }

  function handleToggleNearest() {
    if (!nearestMode && area !== 'ALL') {
      setNearestFromArea(area);
      setArea('ALL');
    }
    setNearestMode((prev) => !prev);
  }

  return (
    <section
      id="mangaluru-directory"
      aria-label="Mangaluru blood banks, hospitals, stock, and camps"
      className="space-y-6 pt-6 border-t border-[#E2DDD6]/80 dark:border-white/10"
    >
      {/* Header + e-RaktKosh Verification Notice */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-1.5 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#B3261E] dark:text-[#F28B82]">
            Mangaluru (Mangalore), Karnataka · Dakshina Kannada Network
          </p>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1C1917] dark:text-[#F5F2EE]">
            Mangaluru Blood Banks, Hospitals &amp; Live Component Stock
          </h2>
          <p className="text-sm text-[#57534E] dark:text-[#A8A29E] leading-relaxed">
            Covers City centre (Hampankatta, Bunder, Kodialbail, Balmatta, Attavar), South / Ullal side
            (Kankanady, Deralakatte, Kuntikana, Natekal), Residential (Pumpwell, Kadri, Bejai), and North donor
            corridor (Surathkal, Mulki — NITK &amp; MRPL belts).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <a
            href={data?.eRaktKoshUrl || 'https://eraktkosh.mohfw.gov.in'}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] px-4 py-2 text-xs sm:text-sm font-medium rounded-xl ios-glass-subtle text-[#1C1917] dark:text-[#F5F2EE] hover:border-[#B3261E]/50 inline-flex items-center gap-2 whitespace-nowrap"
          >
            <span>Cross-check e-RaktKosh</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          </a>
        </div>
      </div>

      {/* Verification & Placeholder Notice */}
      <div className="p-4 rounded-2xl ios-glass-subtle flex items-start gap-3">
        <ShieldAlert className="h-4 w-4 text-[#9A5B00] dark:text-[#F6C86E] shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs text-[#1C1917] dark:text-[#F5F2EE] leading-relaxed">
          <span className="font-semibold">Verification note:</span> Phone numbers, street addresses, and blood
          bank licence references below are placeholders marked <span className="font-semibold">&ldquo;to be verified&rdquo;</span>{' '}
          until confirmed with each hospital or blood bank. Always cross-check against the national{' '}
          <a
            href={data?.eRaktKoshUrl || 'https://eraktkosh.mohfw.gov.in'}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-medium text-[#B3261E] dark:text-[#F28B82]"
          >
            e-RaktKosh directory
          </a>{' '}
          before relying on live stock counts.
        </p>
      </div>

      {/* Live Mangaluru Stock by Blood Group (Highlighting Low Stock, especially A+ and AB+) */}
      <Perspective3DCard tiltStrength={2.2} className="p-5 rounded-[24px] ios-glass space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
              Live Mangaluru stock across blood banks &amp; hospitals
            </h3>
            <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">
              A+ and AB+ have run short in Mangaluru previously and are highlighted below when stock is low. Click any group to filter centres.
            </p>
          </div>
          {bloodGroup !== 'ALL' && (
            <button
              type="button"
              onClick={() => setBloodGroup('ALL')}
              className="min-h-[36px] px-2.5 text-xs font-medium text-[#B3261E] dark:text-[#F28B82] hover:underline self-start sm:self-auto"
            >
              Show all groups
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {(data?.cityStockByGroup ?? BLOOD_GROUPS.map((g) => ({ bloodGroup: g, units: 0, lowStock: true }))).map(
            (item) => {
              const active = bloodGroup === item.bloodGroup;
              const isAPlusOrABPlusShort =
                (item.bloodGroup === 'A+' || item.bloodGroup === 'AB+') && item.lowStock;
              return (
                <button
                  key={item.bloodGroup}
                  type="button"
                  onClick={() => setBloodGroup(active ? 'ALL' : item.bloodGroup)}
                  className={`min-h-[68px] p-2.5 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between active:scale-[0.98] ${
                    active
                      ? 'border-[#B3261E] bg-[#FBEAE8] dark:bg-[#3A1513] shadow-sm'
                      : item.lowStock
                        ? 'border-[#D97706]/50 bg-[#FEF7EC] dark:bg-[#2A2011]/80'
                        : 'border-[#E2DDD6] dark:border-white/10 bg-white/75 dark:bg-[#141210]/80 hover:border-[#B3261E]/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-bold text-[#1C1917] dark:text-[#F5F2EE]">
                      {item.bloodGroup}
                    </span>
                    {item.lowStock && (
                      <AlertTriangle
                        className="h-3.5 w-3.5 text-[#B45309] dark:text-[#FBBF24] shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold tabular-nums text-[#1C1917] dark:text-[#F5F2EE]">
                      {item.units} {item.units === 1 ? 'unit' : 'units'}
                    </div>
                    {item.lowStock && (
                      <div className="text-[11px] font-medium text-[#9A5B00] dark:text-[#F6C86E]">
                        {isAPlusOrABPlusShort ? 'Low stock (shortage risk)' : 'Low stock'}
                      </div>
                    )}
                  </div>
                </button>
              );
            }
          )}
        </div>
      </Perspective3DCard>

      {/* Filters Bar: Blood Group, Component, Zone/Area, Nearest Blood Bank, Search, 24h */}
      <Perspective3DCard tiltStrength={1.8} className="p-5 rounded-[24px] ios-glass space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label htmlFor="mng-search-text" className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">
              Search centre or hospital
            </label>
            <div className="relative">
              <Search className="h-4 w-4 text-[#57534E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              <input
                id="mng-search-text"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter blood bank or hospital name"
                className="w-full min-h-[44px] pl-9 pr-3 text-sm rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 text-[#1C1917] dark:text-[#F5F2EE] focus:outline-none focus:ring-2 focus:ring-[#B3261E]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="mng-blood-group" className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1">
              Blood group
            </label>
            <GlassSelect
              id="mng-blood-group"
              ariaLabel="Blood group"
              value={bloodGroup}
              onChange={setBloodGroup}
              options={[
                { value: 'ALL', label: 'All blood groups' },
                ...BLOOD_GROUPS.map((g) => ({ value: g, label: g })),
              ]}
            />
          </div>

          <div>
            <label htmlFor="mng-component" className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1">
              Blood component
            </label>
            <GlassSelect
              id="mng-component"
              ariaLabel="Blood component"
              value={component}
              onChange={setComponent}
              options={[
                { value: 'ALL', label: 'All components' },
                ...BLOOD_COMPONENTS.map((comp) => ({ value: comp, label: comp })),
              ]}
            />
          </div>

          <div>
            <label htmlFor="mng-zone" className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1">
              City zone
            </label>
            <GlassSelect
              id="mng-zone"
              ariaLabel="City zone"
              value={zone}
              onChange={handleZoneChange}
              options={[
                { value: 'ALL', label: 'All zones' },
                { value: 'City centre', label: 'City centre' },
                { value: 'South / Ullal side', label: 'South / Ullal side' },
                { value: 'Residential', label: 'Residential' },
                { value: 'North', label: 'North (Surathkal / Mulki)' },
              ]}
            />
          </div>

          <div>
            <label htmlFor="mng-area" className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1">
              Area / Locality
            </label>
            <GlassSelect
              id="mng-area"
              ariaLabel="Area or Locality"
              value={area}
              onChange={setArea}
              options={[
                { value: 'ALL', label: 'All Mangaluru areas' },
                ...areasForZone.map((a) => ({
                  value: a.name,
                  label: `${a.name} (${a.zone})`,
                })),
              ]}
            />
          </div>

          <div>
            <label htmlFor="mng-type" className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1">
              Facility type
            </label>
            <GlassSelect
              id="mng-type"
              ariaLabel="Facility type"
              value={centreType}
              onChange={setCentreType}
              options={[
                { value: 'ALL', label: 'All (Blood banks & Hospitals)' },
                { value: 'Blood bank', label: 'Priority 1: Blood banks' },
                { value: 'Hospital', label: 'Priority 2: Hospitals & storage' },
              ]}
            />
          </div>
        </div>

        {/* Nearest blood bank + 24-hour + Quick donor match */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E2DDD6]/70 dark:border-white/10">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleToggleNearest}
              className={`min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl border inline-flex items-center gap-2 transition-colors ${
                nearestMode
                  ? 'border-[#B3261E] bg-[#FBEAE8] dark:bg-[#3A1513] text-[#B3261E] dark:text-[#F28B82]'
                  : 'border-[#E2DDD6] dark:border-white/10 bg-white/75 dark:bg-[#141210]/80 text-[#1C1917] dark:text-[#F5F2EE]'
              }`}
            >
              <Navigation className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Nearest blood bank</span>
            </button>

            {nearestMode && (
              <div className="flex items-center gap-2">
                <label htmlFor="mng-nearest-origin" className="text-xs text-[#57534E] dark:text-[#A8A29E] whitespace-nowrap">
                  From area:
                </label>
                <GlassSelect
                  id="mng-nearest-origin"
                  ariaLabel="Origin area"
                  value={nearestFromArea}
                  onChange={setNearestFromArea}
                  className="min-w-[175px]"
                  options={MANGALORE_AREAS.map((a) => ({ value: a.name, label: a.name }))}
                />
              </div>
            )}

            <label className="inline-flex items-center gap-2 min-h-[44px] cursor-pointer text-xs sm:text-sm text-[#1C1917] dark:text-[#F5F2EE]">
              <input
                type="checkbox"
                checked={only24Hour}
                onChange={(e) => setOnly24Hour(e.target.checked)}
                className="h-4 w-4 accent-[#B3261E]"
              />
              <span>24-hour emergency banks only</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            {(bloodGroup !== 'ALL' ||
              component !== 'ALL' ||
              area !== 'ALL' ||
              zone !== 'ALL' ||
              centreType !== 'ALL' ||
              only24Hour ||
              nearestMode ||
              searchQuery !== '') && (
              <button
                type="button"
                onClick={() => {
                  setBloodGroup('ALL');
                  setComponent('ALL');
                  setZone('ALL');
                  setArea('ALL');
                  setCentreType('ALL');
                  setOnly24Hour(false);
                  setNearestMode(false);
                  setSearchQuery('');
                }}
                className="min-h-[44px] px-2 text-xs font-medium text-[#B3261E] dark:text-[#F28B82] hover:underline"
              >
                Reset centre filters
              </button>
            )}
          </div>
        </div>
      </Perspective3DCard>

      {/* View Mode Switcher (Map & Table / Interactive Map / Table Only) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <GlassSegmentedControl
          ariaLabel="Directory view mode"
          layoutId="mangaluru-directory-view-segment"
          size="sm"
          value={directoryView}
          onChange={setDirectoryView}
          options={[
            { value: 'both', label: 'Map + Directory' },
            { value: 'map', label: 'Interactive Map' },
            { value: 'table', label: 'Table & Stock' },
          ]}
        />
        {firebaseUser && (
          <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">
            Google Cloud sync active · {savedCentreIds.length} saved centre{savedCentreIds.length === 1 ? '' : 's'}
          </p>
        )}
      </div>

      {/* Interactive Google Map of Mangaluru Blood Banks & Hospitals */}
      {!error && (directoryView === 'both' || directoryView === 'map') && (
        <BloodCentresGoogleMap
          centres={visibleCentres}
          selectedCentreId={selectedCentreId}
          onSelectCentre={setSelectedCentreId}
          savedCentreIds={savedCentreIds}
          isSignedIn={Boolean(firebaseUser)}
          bookmarkBusyId={bookmarkBusyId}
          onToggleBookmark={(centre) => void handleToggleBookmark(centre)}
        />
      )}

      {/* Directory Table (Name | Type | Area | Address | Contact | 24-hour (Y/N) | Stock) */}
      {error ? (
        <div
          role="alert"
          className="p-4 rounded-2xl border border-[#B3261E]/40 bg-[#FBEAE8] dark:bg-[#3A1513] text-sm text-[#B3261E] dark:text-[#F28B82]"
        >
          {error}
        </div>
      ) : directoryView !== 'map' ? (
        <div className="rounded-[22px] ios-glass overflow-hidden">
          <div className="px-4 py-3.5 border-b border-[#E2DDD6]/70 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 bg-black/[0.02] dark:bg-white/[0.03]">
            <p className="text-xs sm:text-sm font-semibold text-[#1C1917] dark:text-[#F5F2EE] tabular-nums">
              Showing {visibleCentres.length} Mangaluru centres
              {nearestMode ? ` · Sorted nearest to ${nearestFromArea}` : ''}
            </p>
            <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">
              Swipe horizontally on mobile to view all stock columns
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#E2DDD6]/70 dark:border-white/10 text-left text-xs uppercase tracking-wider text-[#57534E] dark:text-[#A8A29E] bg-black/[0.02] dark:bg-white/[0.02]">
                  <th className="py-3 px-4 w-[21%]">Name</th>
                  <th className="py-3 px-3 w-[10%]">Type</th>
                  <th className="py-3 px-3 w-[11%]">Area</th>
                  <th className="py-3 px-3 w-[20%]">Address</th>
                  <th className="py-3 px-3 w-[13%]">Contact</th>
                  <th className="py-3 px-3 w-[7%]">24-hour (Y/N)</th>
                  <th className="py-3 px-4 w-[18%]">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DDD6]/70 dark:divide-white/10 align-top">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-sm text-[#57534E] dark:text-[#A8A29E]">
                      Loading Mangaluru blood banks and hospital stock...
                    </td>
                  </tr>
                ) : visibleCentres.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 px-4 text-center space-y-3">
                      <p className="text-sm font-medium text-[#1C1917] dark:text-[#F5F2EE]">
                        No Mangaluru centres matched these filters.
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {onSelectDonorFilter && (
                          <button
                            type="button"
                            onClick={() =>
                              onSelectDonorFilter({
                                bloodGroup: bloodGroup !== 'ALL' ? bloodGroup : undefined,
                                area: area !== 'ALL' ? area : undefined,
                                city: 'Mangaluru',
                              })
                            }
                            className="min-h-[44px] px-4 py-2 text-xs font-medium rounded-md border border-[#E2DDD6] dark:border-[#38322E]"
                          >
                            Search voluntary donors in Mangaluru
                          </button>
                        )}
                        {onOpenRequestBlood && (
                          <button
                            type="button"
                            onClick={() =>
                              onOpenRequestBlood({
                                bloodGroup:
                                  bloodGroup !== 'ALL'
                                    ? (bloodGroup as (typeof BLOOD_GROUPS)[number])
                                    : 'A+',
                                city: 'Mangaluru',
                              })
                            }
                            className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-md bg-[#B3261E] text-white"
                          >
                            Post Urgent Blood Request
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  visibleCentres.map((centre) => {
                    const matchingEntries = centre.stockEntries.filter((entry) => {
                      if (bloodGroup !== 'ALL' && entry.bloodGroup !== bloodGroup) return false;
                      if (component !== 'ALL' && entry.component !== component) return false;
                      return true;
                    });
                    const displayEntries = matchingEntries.length > 0 ? matchingEntries : centre.stockEntries;

                    return (
                      <tr
                        key={centre.id}
                        className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors duration-150"
                      >
                        <td className="py-3.5 px-4 space-y-1">
                          <div className="font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
                            {centre.name}
                          </div>
                          <div className="text-xs text-[#57534E] dark:text-[#A8A29E]">
                            {centre.priority === 1 ? 'Priority 1 · Regional Blood Bank' : 'Priority 2 · Hospital / Storage'}
                            {typeof centre.distanceKm === 'number' && (
                              <span className="font-semibold text-[#B3261E] dark:text-[#F28B82] tabular-nums">
                                {' '}
                                · {centre.distanceKm} km away
                              </span>
                            )}
                          </div>
                          {centre.notes && (
                            <p className="text-xs text-[#57534E] dark:text-[#A8A29E] leading-snug">
                              {centre.notes}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCentreId(centre.id);
                                if (directoryView === 'table') setDirectoryView('both');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg ios-glass-subtle text-[11px] font-semibold text-[#B3261E] dark:text-[#F28B82] hover:border-[#B3261E]/50"
                            >
                              <MapPin className="h-3 w-3" aria-hidden="true" />
                              <span>Show on map</span>
                            </button>

                            {firebaseUser && (
                              <button
                                type="button"
                                disabled={bookmarkBusyId === centre.id}
                                onClick={() => void handleToggleBookmark(centre)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg ios-glass-subtle text-[11px] font-semibold text-[#1C1917] dark:text-[#F5F2EE] hover:border-[#B3261E]/50 disabled:opacity-50"
                              >
                                {savedCentreIds.includes(centre.id) ? (
                                  <>
                                    <BookmarkCheck className="h-3 w-3 text-[#166534] dark:text-[#86EFAC]" aria-hidden="true" />
                                    <span>Saved</span>
                                  </>
                                ) : (
                                  <>
                                    <Bookmark className="h-3 w-3 text-[#B3261E] dark:text-[#F28B82]" aria-hidden="true" />
                                    <span>Save</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-xs font-medium text-[#1C1917] dark:text-[#F5F2EE]">
                          {centre.centreType}
                        </td>

                        <td className="py-3.5 px-3 space-y-0.5">
                          <div className="text-sm font-medium text-[#1C1917] dark:text-[#F5F2EE]">
                            {centre.area}
                          </div>
                          <div className="text-xs text-[#57534E] dark:text-[#A8A29E]">{centre.zone}</div>
                        </td>

                        <td className="py-3.5 px-3 space-y-1">
                          <div className="text-xs text-[#1C1917] dark:text-[#F5F2EE] leading-relaxed">
                            {centre.address}
                          </div>
                          <div className="text-[11px] text-[#57534E] dark:text-[#A8A29E]">
                            Licence: {centre.licenceInfo}
                          </div>
                        </td>

                        <td className="py-3.5 px-3 space-y-1.5">
                          <div className="text-xs font-semibold tabular-nums text-[#1C1917] dark:text-[#F5F2EE]">
                            {centre.contactPhone}
                          </div>
                          <div className="text-[11px] text-[#57534E] dark:text-[#A8A29E]">
                            to be verified
                          </div>
                          <a
                            href={toTelHref(centre.contactPhone)}
                            className="inline-flex items-center gap-1.5 min-h-[44px] px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#B3261E] text-white hover:bg-[#961E17] whitespace-nowrap"
                          >
                            <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>Call 24h desk</span>
                          </a>
                        </td>

                        <td className="py-3.5 px-3 font-semibold text-sm tabular-nums">
                          {centre.is24Hour ? (
                            <span className="text-[#166534] dark:text-[#86EFAC]">Y</span>
                          ) : (
                            <span className="text-[#57534E] dark:text-[#A8A29E]">N</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 space-y-2">
                          {displayEntries.length === 0 ? (
                            <div className="space-y-1">
                              <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">
                                Demand-side referral unit (blood sourced via Wenlock &amp; IRCS Hampankatta).
                              </p>
                              <p className="text-[11px] text-[#57534E] dark:text-[#A8A29E] tabular-nums">
                                Updated: {formatTimestamp(centre.lastUpdated)}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <div className="text-xs font-semibold text-[#1C1917] dark:text-[#F5F2EE] tabular-nums">
                                Total: {centre.totalUnits} {centre.totalUnits === 1 ? 'unit' : 'units'}
                              </div>
                              <ul className="space-y-1">
                                {displayEntries.map((entry) => (
                                  <li
                                    key={entry.id}
                                    className="text-xs border-t border-[#E2DDD6]/70 dark:border-white/10 pt-1 first:border-t-0 first:pt-0"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
                                        <span className="text-[#B3261E] dark:text-[#F28B82]">
                                          {entry.bloodGroup}
                                        </span>{' '}
                                        · {entry.component}
                                      </span>
                                      <span
                                        className={`font-semibold tabular-nums whitespace-nowrap ${
                                          entry.isLowStock
                                            ? 'text-[#9A5B00] dark:text-[#F6C86E]'
                                            : 'text-[#166534] dark:text-[#86EFAC]'
                                        }`}
                                      >
                                        {entry.units}u {entry.isLowStock ? '(Low)' : ''}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-[#57534E] dark:text-[#A8A29E] tabular-nums">
                                      Last updated: {formatTimestamp(entry.updatedAt)}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* North Donor Corridor & Areas Quick Filter Strip */}
      <Perspective3DCard tiltStrength={1.8} className="p-5 rounded-[24px] ios-glass space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#B3261E] dark:text-[#F28B82] shrink-0" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
              Filter voluntary donors by Mangaluru locality
            </h3>
          </div>
          <span className="text-xs text-[#57534E] dark:text-[#A8A29E]">
            Includes Surathkal (NITK) &amp; Mulki (MRPL) northern donor belts
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {MANGALORE_AREAS.map((loc) => (
            <button
              key={loc.name}
              type="button"
              onClick={() =>
                onSelectDonorFilter?.({
                  city: 'Mangaluru',
                  area: loc.name,
                  bloodGroup: bloodGroup !== 'ALL' ? bloodGroup : undefined,
                })
              }
              className="min-h-[38px] px-3 py-1 text-xs rounded-xl ios-glass-subtle text-[#1C1917] dark:text-[#F5F2EE] hover:border-[#B3261E]/60 active:scale-[0.97] transition-all"
            >
              {loc.name}
              {loc.note ? ` (${loc.zone})` : ''}
            </button>
          ))}
        </div>
      </Perspective3DCard>

      {/* Mangaluru Donation Camps (Colleges, Corporates & Communities) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
              Mangaluru Donation Camps — Colleges, Corporates &amp; Communities
            </h3>
            <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">
              Past corporate drives (such as Infosys Mangaluru collecting 200+ units in a single day) and upcoming college/community camps.
            </p>
          </div>
          <GlassSegmentedControl
            ariaLabel="Filter donation camps by category"
            layoutId="camp-category-segment"
            size="sm"
            value={campCategoryFilter}
            onChange={setCampCategoryFilter}
            options={[
              { value: 'ALL', label: 'All camps' },
              { value: 'college', label: 'College' },
              { value: 'corporate', label: 'Corporate' },
              { value: 'community', label: 'Community' },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleCamps.map((camp) => (
            <Perspective3DCard
              key={camp.id}
              tiltStrength={3.2}
              animateEntrance={false}
              className="p-5 rounded-[22px] ios-glass"
            >
              <article className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
                    {camp.title}
                  </h4>
                  <span className="text-xs font-medium uppercase text-[#57534E] dark:text-[#A8A29E] shrink-0">
                    {camp.campCategory || 'community'} · {camp.status}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#57534E] dark:text-[#A8A29E] tabular-nums">
                  <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    {camp.campDate} · {camp.startTime} – {camp.endTime}
                  </span>
                </div>
                <p className="text-xs text-[#1C1917] dark:text-[#F5F2EE]">{camp.venue}</p>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E2DDD6]/70 dark:border-white/10 text-xs">
                  <span className="text-[#57534E] dark:text-[#A8A29E]">{camp.organizer}</span>
                  {camp.unitsCollected && camp.unitsCollected > 0 ? (
                    <span className="font-semibold text-[#166534] dark:text-[#86EFAC] tabular-nums">
                      {camp.unitsCollected} units collected in a day
                    </span>
                  ) : (
                    <span className="font-semibold text-[#1C1917] dark:text-[#F5F2EE] tabular-nums">
                      Slots: {camp.slotsBooked}/{camp.slotsTotal} booked
                    </span>
                  )}
                </div>
              </article>
            </Perspective3DCard>
          ))}
        </div>
      </div>
    </section>
  );
}
