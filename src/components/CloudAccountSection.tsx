import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Bookmark,
  Building2,
  Calendar,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  Cloud,
  Droplets,
  Lock,
  LogOut,
  MapPin,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useFirebaseAuth } from '../contexts/AuthContext.tsx';
import { accountApi, type CloudAccountBundle } from '../lib/accountApi.ts';
import { api } from '../lib/api.ts';
import {
  BLOOD_GROUPS,
  INDIAN_CITIES,
  computeDonorEligibility,
  type AlertChannel,
  type BloodCentreView,
  type BloodGroup,
} from '../shared/types.ts';
import { GlassAreaCombobox } from './GlassAreaCombobox.tsx';
import { GlassDatePicker } from './GlassDatePicker.tsx';
import { GlassSelect } from './GlassSelect.tsx';
import {
  Donor3DEligibilityRing,
  GlassSegmentedControl,
  Perspective3DCard,
  SmoothReveal,
} from './SmoothSection.tsx';

interface CloudAccountSectionProps {
  onNavigate: (path: string) => void;
  compactMode?: boolean;
  onSwitchToOtpTab?: () => void;
}

const APPOINTMENT_TIME_SLOTS = [
  '09:00 AM – 11:00 AM',
  '11:00 AM – 01:00 PM',
  '02:00 PM – 04:00 PM',
  '04:00 PM – 06:00 PM',
];

interface MonthlyPoint {
  key: string;
  monthLabel: string;
  fullMonth: string;
  count: number;
  units: number;
}

function build12MonthsData(donations: CloudAccountBundle['donations']): MonthlyPoint[] {
  const now = new Date();
  const buckets: MonthlyPoint[] = [];
  const lookup: Record<string, MonthlyPoint> = {};

  for (let offset = 11; offset >= 0; offset--) {
    const dt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const yyyy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const key = `${yyyy}-${mm}`;
    const point: MonthlyPoint = {
      key,
      monthLabel: dt.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
      fullMonth: dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
      count: 0,
      units: 0,
    };
    buckets.push(point);
    lookup[key] = point;
  }

  for (const d of donations) {
    const key = d.donatedAt.slice(0, 7);
    const target = lookup[key];
    if (target) {
      target.count += 1;
      target.units += Math.max(1, d.units || 1);
    }
  }
  return buckets;
}

export function GoogleSignInButton({
  label = 'Continue with Google',
  className = '',
}: {
  label?: string;
  className?: string;
}) {
  const { signInWithGoogle, authError } = useFirebaseAuth();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    await signInWithGoogle();
    setBusy(false);
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleClick()}
        className={`min-h-[46px] px-5 py-2.5 rounded-xl border border-[#E2DDD6] dark:border-white/15 bg-white/95 dark:bg-[#221E1C] text-sm font-semibold text-[#1C1917] dark:text-[#F5F2EE] hover:border-[#B3261E]/60 active:scale-[0.98] transition-all inline-flex items-center justify-center gap-2.5 shadow-sm disabled:opacity-60 ${className}`}
      >
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
          />
        </svg>
        <span>{busy ? 'Connecting Google Account...' : label}</span>
      </button>
      {authError && (
        <p role="alert" className="text-xs text-[#B3261E] dark:text-[#F28B82]">
          {authError}
        </p>
      )}
    </div>
  );
}

export function CloudAccountSection({
  onNavigate,
  compactMode = false,
  onSwitchToOtpTab,
}: CloudAccountSectionProps) {
  const { user, idToken, getFreshIdToken, signOutGoogle } = useFirebaseAuth();

  const [bundle, setBundle] = useState<CloudAccountBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Profile fields
  const [displayName, setDisplayName] = useState('');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O+');
  const [city, setCity] = useState('Mangaluru');
  const [area, setArea] = useState('Hampankatta');
  const [phone, setPhone] = useState('');
  const [alertChannel, setAlertChannel] = useState<AlertChannel>('whatsapp');
  const [savingProfile, setSavingProfile] = useState(false);

  // Nearby blood banks for appointment scheduling
  const [nearbyCentres, setNearbyCentres] = useState<BloodCentreView[]>([]);
  const [apptCentreId, setApptCentreId] = useState('');
  const [apptCustomCentre, setApptCustomCentre] = useState('');
  const [apptDate, setApptDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [apptTimeSlot, setApptTimeSlot] = useState(APPOINTMENT_TIME_SLOTS[0]);
  const [apptNotes, setApptNotes] = useState('');
  const [bookingAppt, setBookingAppt] = useState(false);
  const [updatingApptId, setUpdatingApptId] = useState<number | null>(null);

  // Donation logging
  const [donatedAt, setDonatedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [donationLocation, setDonationLocation] = useState('');
  const [donationNotes, setDonationNotes] = useState('');
  const [savingDonation, setSavingDonation] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'area'>('bar');

  const syncForm = useCallback((next: CloudAccountBundle) => {
    setDisplayName(next.user.displayName || '');
    setBloodGroup((BLOOD_GROUPS.includes(next.user.bloodGroup as BloodGroup) ? next.user.bloodGroup : 'O+') as BloodGroup);
    setCity(next.user.city || 'Mangaluru');
    setArea(next.user.area || 'Hampankatta');
    setPhone(next.user.phone || '');
    setAlertChannel((next.user.alertChannel === 'sms' ? 'sms' : 'whatsapp') as AlertChannel);
  }, []);

  const loadCloudBundle = useCallback(async () => {
    if (!user) return;
    const tok = (await getFreshIdToken()) ?? idToken;
    if (!tok) return;
    setLoading(true);
    setError(null);
    try {
      const res = await accountApi.getMe(tok);
      setBundle(res);
      syncForm(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sync Cloud SQL account.');
    } finally {
      setLoading(false);
    }
  }, [user, idToken, getFreshIdToken, syncForm]);

  useEffect(() => {
    if (user && idToken) {
      void loadCloudBundle();
    } else {
      setBundle(null);
    }
  }, [user, idToken, loadCloudBundle]);

  useEffect(() => {
    if (!bundle) return;
    let active = true;
    api
      .getCentres({ nearestToArea: bundle.user.area || undefined })
      .then((res) => {
        if (!active) return;
        setNearbyCentres(res.centres);
        setApptCentreId((prev) => prev || res.centres[0]?.id || '__custom__');
      })
      .catch(() => {
        if (!active) return;
        setApptCentreId((prev) => prev || '__custom__');
      });
    return () => {
      active = false;
    };
  }, [bundle]);

  const eligibility = useMemo(() => {
    return computeDonorEligibility({
      available: true,
      lastDonation: bundle?.user.lastDonation ?? null,
      lastConfirmedAt: bundle?.user.updatedAt ?? new Date().toISOString(),
    });
  }, [bundle?.user.lastDonation, bundle?.user.updatedAt]);

  const chartData = useMemo(
    () => build12MonthsData(bundle?.donations ?? []),
    [bundle?.donations]
  );

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    const tok = (await getFreshIdToken()) ?? idToken;
    if (!tok) return;
    setSavingProfile(true);
    setError(null);
    setStatusMessage(null);
    try {
      const updated = await accountApi.updateProfile(tok, {
        displayName,
        bloodGroup,
        city,
        area,
        phone,
        alertChannel,
      });
      setBundle(updated);
      syncForm(updated);
      setStatusMessage('Cloud profile saved to PostgreSQL.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update cloud profile.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleCreateAppointment(e: React.FormEvent) {
    e.preventDefault();
    const tok = (await getFreshIdToken()) ?? idToken;
    if (!tok) return;
    const selected = nearbyCentres.find((c) => c.id === apptCentreId);
    const centreName =
      apptCentreId === '__custom__' || !selected
        ? apptCustomCentre.trim()
        : `${selected.name}, ${selected.area}`;
    if (centreName.length < 2) {
      setError('Select a nearby blood bank or enter a centre name.');
      return;
    }

    setBookingAppt(true);
    setError(null);
    setStatusMessage(null);
    try {
      const updated = await accountApi.createAppointment(tok, {
        centreId: selected ? selected.id : null,
        centreName,
        appointmentDate: apptDate,
        timeSlot: apptTimeSlot,
        notes: apptNotes.trim(),
      });
      setBundle(updated);
      setApptNotes('');
      setApptCustomCentre('');
      setStatusMessage(`Cloud appointment booked for ${apptDate} (${apptTimeSlot}).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not book cloud appointment.');
    } finally {
      setBookingAppt(false);
    }
  }

  async function handleAppointmentStatus(id: number, status: 'completed' | 'cancelled') {
    const tok = (await getFreshIdToken()) ?? idToken;
    if (!tok) return;
    setUpdatingApptId(id);
    setError(null);
    setStatusMessage(null);
    try {
      const updated = await accountApi.updateAppointmentStatus(tok, id, status);
      setBundle(updated);
      setStatusMessage(
        status === 'completed'
          ? 'Appointment completed and synced to your donation log.'
          : 'Appointment cancelled.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update appointment.');
    } finally {
      setUpdatingApptId(null);
    }
  }

  async function handleLogCloudDonation(e: React.FormEvent) {
    e.preventDefault();
    const tok = (await getFreshIdToken()) ?? idToken;
    if (!tok) return;
    setSavingDonation(true);
    setError(null);
    setStatusMessage(null);
    try {
      const updated = await accountApi.logDonation(tok, {
        donatedAt,
        location: donationLocation,
        units: 1,
        notes: donationNotes,
      });
      setBundle(updated);
      setDonationLocation('');
      setDonationNotes('');
      setStatusMessage('Donation synced to PostgreSQL and 90-day lock updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log donation.');
    } finally {
      setSavingDonation(false);
    }
  }

  async function handleRemoveBookmark(centreId: string) {
    const tok = (await getFreshIdToken()) ?? idToken;
    if (!tok) return;
    try {
      const updated = await accountApi.removeSavedCentre(tok, centreId);
      setBundle(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove saved centre.');
    }
  }

  if (!user) {
    if (!compactMode) return null;
    return (
      <Perspective3DCard tiltStrength={2} className="ios-glass rounded-[22px] p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-[#1C1917] dark:text-[#F5F2EE] flex items-center gap-2">
              <Cloud className="h-4 w-4 text-[#B3261E] dark:text-[#F28B82]" aria-hidden="true" />
              <span>Sync blood bank bookmarks across devices</span>
            </h2>
            <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">
              Connect Google Sign-In to save favourite Mangaluru blood banks and sync appointments in Cloud SQL.
            </p>
          </div>
          <GoogleSignInButton label="Connect Google Sync" />
        </div>
      </Perspective3DCard>
    );
  }

  if (loading && !bundle) {
    return (
      <div className="ios-glass rounded-[22px] p-6 text-sm text-[#57534E] dark:text-[#A8A29E]">
        Syncing your Google Cloud donor account...
      </div>
    );
  }

  if (compactMode && bundle) {
    return (
      <Perspective3DCard tiltStrength={2} className="ios-glass rounded-[22px] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {bundle.user.photoUrl ? (
              <img
                src={bundle.user.photoUrl}
                alt={bundle.user.displayName || 'Google user'}
                className="h-10 w-10 rounded-full object-cover border border-white/30"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-[#B3261E]/15 text-[#B3261E] dark:text-[#F28B82] flex items-center justify-center font-bold">
                {(bundle.user.displayName || bundle.user.email || 'G').slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-[#1C1917] dark:text-[#F5F2EE] flex items-center gap-1.5">
                <Cloud className="h-3.5 w-3.5 text-[#166534] dark:text-[#86EFAC]" aria-hidden="true" />
                <span>Google Synced: {bundle.user.displayName || bundle.user.email}</span>
              </p>
              <p className="text-xs text-[#57534E] dark:text-[#A8A29E] tabular-nums">
                {bundle.bookmarks.length} saved centres · {bundle.appointments.length} cloud appointments · {bundle.donations.length} cloud donations
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void signOutGoogle()}
            className="min-h-[38px] px-3 py-1.5 rounded-xl ios-glass-subtle text-xs font-medium text-[#1C1917] dark:text-[#F5F2EE] inline-flex items-center gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Disconnect Google</span>
          </button>
        </div>

        {bundle.bookmarks.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-[#E2DDD6]/70 dark:border-white/10">
            {bundle.bookmarks.map((bm) => (
              <span
                key={bm.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl ios-glass-subtle text-xs text-[#1C1917] dark:text-[#F5F2EE]"
              >
                <Bookmark className="h-3 w-3 text-[#B3261E] dark:text-[#F28B82]" aria-hidden="true" />
                <span>{bm.centreName}</span>
                <button
                  type="button"
                  aria-label={`Remove ${bm.centreName}`}
                  onClick={() => void handleRemoveBookmark(bm.centreId)}
                  className="ml-1 text-[#57534E] hover:text-[#B3261E]"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </Perspective3DCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Google Cloud Donor Card */}
      <Perspective3DCard className="ios-hero-glass rounded-[24px] p-5 sm:p-7" tiltStrength={3.2}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            <Donor3DEligibilityRing
              isCooldownActive={eligibility.isCooldownActive}
              daysUntilEligible={eligibility.daysUntilEligible}
            />
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt={bundle?.user.displayName || user.displayName || 'Donor'}
                    className="h-9 w-9 rounded-full object-cover border border-white/30"
                    referrerPolicy="no-referrer"
                  />
                )}
                <h1 className="text-2xl sm:text-3xl font-bold text-[#1C1917] dark:text-[#F5F2EE]">
                  {bundle?.user.displayName || user.displayName || 'Cloud Donor Profile'}
                </h1>
                <span className="text-base sm:text-lg font-extrabold text-[#B3261E] dark:text-[#F28B82]">
                  {bundle?.user.bloodGroup || bloodGroup}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-[#57534E] dark:text-[#A8A29E] tabular-nums">
                {bundle?.user.email || user.email} · {bundle?.user.area || area}, {bundle?.user.city || city} · Synced with Cloud SQL
              </p>

              <p className="text-xs font-medium tabular-nums">
                {eligibility.isCooldownActive ? (
                  <span className="text-[#B45309] dark:text-[#FBBF24]">
                    90-day recovery lock active · Eligible again on {eligibility.nextEligibleDate} ({eligibility.daysUntilEligible}d left)
                  </span>
                ) : (
                  <span className="text-[#166534] dark:text-[#86EFAC]">
                    Eligible to donate blood now ·{' '}
                    {bundle?.user.lastDonation
                      ? `Last donation: ${bundle.user.lastDonation}`
                      : 'Ready for first logged donation'}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
            {onSwitchToOtpTab && (
              <button
                type="button"
                onClick={onSwitchToOtpTab}
                className="min-h-[44px] px-4 py-2 text-xs sm:text-sm font-medium rounded-xl ios-glass-subtle text-[#1C1917] dark:text-[#F5F2EE]"
              >
                Use Phone OTP Login
              </button>
            )}
            <button
              type="button"
              onClick={() => void signOutGoogle()}
              className="min-h-[44px] px-4 py-2 text-sm font-medium rounded-xl ios-glass-subtle text-[#1C1917] dark:text-[#F5F2EE] inline-flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </Perspective3DCard>

      {statusMessage && (
        <div className="p-4 rounded-2xl border border-[#166534]/30 bg-[#F0FDF4]/90 dark:bg-[#14281D]/90 text-sm text-[#166534] dark:text-[#86EFAC] flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{statusMessage}</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-4 rounded-2xl border border-[#B3261E]/40 bg-[#FBEAE8]/95 dark:bg-[#3A1513]/95 text-sm text-[#B3261E] dark:text-[#F28B82]"
        >
          {error}
        </div>
      )}

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-6">
          {/* Cloud Donation Chart + Log */}
          <SmoothReveal>
            <Perspective3DCard tiltStrength={2} animateEntrance={false} className="ios-glass rounded-[24px] p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-[#1C1917] dark:text-[#F5F2EE] flex items-center gap-2">
                    <Activity className="h-4 w-4 text-[#B3261E] dark:text-[#F28B82]" aria-hidden="true" />
                    <span>Cloud Donation History (12 Months)</span>
                  </h2>
                  <p className="text-xs text-[#57534E] dark:text-[#A8A29E] tabular-nums">
                    {bundle?.donations.length ?? 0} total saved record(s) in PostgreSQL
                  </p>
                </div>
                <GlassSegmentedControl
                  ariaLabel="Cloud chart type"
                  layoutId="cloud-chart-mode-segment"
                  size="sm"
                  value={chartType}
                  onChange={setChartType}
                  options={[
                    { value: 'bar', label: 'Bars' },
                    { value: 'area', label: 'Trend' },
                  ]}
                />
              </div>

              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'bar' ? (
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(168,162,158,0.24)" vertical={false} />
                      <XAxis dataKey="monthLabel" tick={{ fontSize: 11, fill: '#78716C' }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} width={32} tick={{ fontSize: 11, fill: '#78716C' }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="count" name="Donations" fill="#B3261E" radius={[8, 8, 2, 2]} maxBarSize={30} />
                    </BarChart>
                  ) : (
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(168,162,158,0.24)" vertical={false} />
                      <XAxis dataKey="monthLabel" tick={{ fontSize: 11, fill: '#78716C' }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} width={32} tick={{ fontSize: 11, fill: '#78716C' }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="count" stroke="#B3261E" strokeWidth={2.5} fill="#B3261E" fillOpacity={0.22} />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>

              <form onSubmit={handleLogCloudDonation} className="space-y-3 pt-3 border-t border-[#E2DDD6]/70 dark:border-white/10">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[#57534E] dark:text-[#A8A29E] flex items-center gap-1.5">
                  <Droplets className="h-3.5 w-3.5 text-[#B3261E]" aria-hidden="true" />
                  <span>Log Completed Donation (90-Day Recovery Enforced)</span>
                </h3>
                {eligibility.isCooldownActive && (
                  <p className="text-xs text-[#B45309] dark:text-[#FBBF24] flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Next eligible date: {eligibility.nextEligibleDate}</span>
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <GlassDatePicker
                    id="cloud-log-date"
                    required
                    max={new Date().toISOString().slice(0, 10)}
                    value={donatedAt}
                    onChange={setDonatedAt}
                    ariaLabel="Donation date"
                  />
                  <input
                    type="text"
                    required
                    value={donationLocation}
                    onChange={(e) => setDonationLocation(e.target.value)}
                    placeholder="Enter blood bank or hospital"
                    className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/80 dark:bg-[#141210]/80 focus:outline-none focus:ring-2 focus:ring-[#B3261E]"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={donationNotes}
                    onChange={(e) => setDonationNotes(e.target.value)}
                    placeholder="Enter optional note"
                    className="flex-1 min-h-[44px] px-3.5 py-2 text-sm rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/80 dark:bg-[#141210]/80 focus:outline-none focus:ring-2 focus:ring-[#B3261E]"
                  />
                  <button
                    type="submit"
                    disabled={savingDonation}
                    className="min-h-[44px] px-5 py-2 text-sm font-semibold rounded-xl bg-[#B3261E] text-white hover:bg-[#961E17] disabled:opacity-50"
                  >
                    {savingDonation ? 'Saving...' : 'Save Donation'}
                  </button>
                </div>
              </form>
            </Perspective3DCard>
          </SmoothReveal>

          {/* Cloud Donation Appointments */}
          <SmoothReveal>
            <Perspective3DCard tiltStrength={2} animateEntrance={false} className="ios-glass rounded-[24px] p-5 sm:p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-[#1C1917] dark:text-[#F5F2EE]">
                    Schedule Cloud Donation Appointment
                  </h2>
                  <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">
                    Persisted in Cloud SQL PostgreSQL with automatic 90-day safe gap enforcement.
                  </p>
                </div>
                <CalendarCheck2 className="h-5 w-5 text-[#B3261E] dark:text-[#F28B82] shrink-0" aria-hidden="true" />
              </div>

              <form onSubmit={handleCreateAppointment} className="space-y-3">
                <GlassSelect
                  id="cloud-appt-centre"
                  ariaLabel="Nearby blood bank"
                  value={apptCentreId}
                  onChange={setApptCentreId}
                  options={[
                    ...nearbyCentres.map((c) => ({
                      value: c.id,
                      label: `${c.name} — ${c.area}`,
                    })),
                    { value: '__custom__', label: 'Other blood bank / hospital...' },
                  ]}
                />

                {apptCentreId === '__custom__' && (
                  <input
                    type="text"
                    required
                    value={apptCustomCentre}
                    onChange={(e) => setApptCustomCentre(e.target.value)}
                    placeholder="Enter blood bank or hospital name"
                    className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/80 dark:bg-[#141210]/80"
                  />
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <GlassDatePicker
                    id="cloud-appt-date"
                    required
                    min={new Date().toISOString().slice(0, 10)}
                    value={apptDate}
                    onChange={setApptDate}
                    ariaLabel="Appointment date"
                  />
                  <GlassSelect
                    id="cloud-appt-slot"
                    ariaLabel="Time slot"
                    value={apptTimeSlot}
                    onChange={setApptTimeSlot}
                    options={APPOINTMENT_TIME_SLOTS}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={apptNotes}
                    onChange={(e) => setApptNotes(e.target.value)}
                    placeholder="Enter optional appointment note"
                    className="flex-1 min-h-[44px] px-3.5 py-2 text-sm rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/80 dark:bg-[#141210]/80"
                  />
                  <button
                    type="submit"
                    disabled={bookingAppt}
                    className="min-h-[44px] px-5 py-2 text-sm font-semibold rounded-xl bg-[#B3261E] text-white hover:bg-[#961E17] inline-flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Calendar className="h-4 w-4" aria-hidden="true" />
                    <span>{bookingAppt ? 'Booking...' : 'Book Appointment'}</span>
                  </button>
                </div>
              </form>

              {(bundle?.appointments.length ?? 0) > 0 && (
                <div className="pt-3 border-t border-[#E2DDD6]/70 dark:border-white/10 space-y-2.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[#57534E] dark:text-[#A8A29E]">
                    Cloud Appointments ({bundle?.appointments.length})
                  </h3>
                  {bundle?.appointments.map((appt) => {
                    const todayStr = new Date().toISOString().slice(0, 10);
                    const busy = updatingApptId === appt.id;
                    return (
                      <div
                        key={appt.id}
                        className="ios-glass-subtle rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5">
                          <div className="text-sm font-semibold text-[#1C1917] dark:text-[#F5F2EE] flex items-center gap-1.5">
                            <Building2 className="h-4 w-4 text-[#B3261E]" aria-hidden="true" />
                            <span>{appt.centreName}</span>
                          </div>
                          <p className="text-xs text-[#57534E] dark:text-[#A8A29E] tabular-nums">
                            {appt.appointmentDate} · {appt.timeSlot} · Status: {appt.status}
                          </p>
                        </div>
                        {appt.status === 'scheduled' && (
                          <div className="flex items-center gap-2 shrink-0">
                            {appt.appointmentDate <= todayStr && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void handleAppointmentStatus(appt.id, 'completed')}
                                className="min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#B3261E] text-white"
                              >
                                Mark completed
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleAppointmentStatus(appt.id, 'cancelled')}
                              className="min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-xl border border-[#E2DDD6] dark:border-white/10"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Perspective3DCard>
          </SmoothReveal>
        </div>

        {/* Right Column: Cloud SQL Profile + Saved Blood Banks */}
        <aside className="lg:col-span-5 space-y-6">
          <SmoothReveal>
            <Perspective3DCard tiltStrength={2.2} animateEntrance={false} className="ios-glass rounded-[24px] p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#1C1917] dark:text-[#F5F2EE]">
                  Cloud Donor Profile
                </h2>
                <Save className="h-4 w-4 text-[#B3261E] dark:text-[#F28B82]" aria-hidden="true" />
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-3">
                <div>
                  <label htmlFor="cloud-prof-name" className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1">
                    Full name
                  </label>
                  <input
                    id="cloud-prof-name"
                    type="text"
                    required
                    minLength={2}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/80 dark:bg-[#141210]/80"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="cloud-prof-bg" className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1">
                      Blood group
                    </label>
                    <GlassSelect
                      id="cloud-prof-bg"
                      ariaLabel="Blood group"
                      value={bloodGroup}
                      onChange={(v) => setBloodGroup(v as BloodGroup)}
                      options={BLOOD_GROUPS}
                    />
                  </div>
                  <div>
                    <label htmlFor="cloud-prof-city" className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1">
                      City
                    </label>
                    <GlassSelect
                      id="cloud-prof-city"
                      ariaLabel="City"
                      value={city}
                      onChange={setCity}
                      options={INDIAN_CITIES}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="cloud-prof-area" className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1">
                    Locality / Area
                  </label>
                  <GlassAreaCombobox
                    id="cloud-prof-area"
                    city={city}
                    value={area}
                    onChange={setArea}
                    placeholder="Enter locality or area"
                    ariaLabel="Locality or Area"
                  />
                </div>

                <div>
                  <label htmlFor="cloud-prof-phone" className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1">
                    Contact mobile (optional)
                  </label>
                  <input
                    id="cloud-prof-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter 10-digit mobile number"
                    className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/80 dark:bg-[#141210]/80"
                  />
                </div>

                <GlassSegmentedControl
                  ariaLabel="Alert channel"
                  layoutId="cloud-alert-segment"
                  fullWidth
                  value={alertChannel}
                  onChange={setAlertChannel}
                  options={[
                    { value: 'whatsapp', label: 'WhatsApp' },
                    { value: 'sms', label: 'SMS' },
                  ]}
                />

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl bg-[#B3261E] text-white hover:bg-[#961E17] disabled:opacity-50"
                >
                  {savingProfile ? 'Saving to Cloud SQL...' : 'Save Cloud Profile'}
                </button>
              </form>
            </Perspective3DCard>
          </SmoothReveal>

          <SmoothReveal delay={0.04}>
            <Perspective3DCard tiltStrength={2.2} animateEntrance={false} className="ios-glass rounded-[24px] p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#1C1917] dark:text-[#F5F2EE]">
                  Saved Blood Banks ({bundle?.bookmarks.length ?? 0})
                </h2>
                <Bookmark className="h-4 w-4 text-[#B3261E] dark:text-[#F28B82]" aria-hidden="true" />
              </div>

              {(bundle?.bookmarks.length ?? 0) === 0 ? (
                <div className="space-y-3">
                  <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">
                    Bookmark any blood bank or hospital on the Mangaluru directory map to access it quickly here.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate('/')}
                    className="min-h-[40px] px-4 py-2 text-xs font-semibold rounded-xl ios-glass-subtle text-[#1C1917] dark:text-[#F5F2EE] inline-flex items-center gap-1.5"
                  >
                    <MapPin className="h-3.5 w-3.5 text-[#B3261E]" aria-hidden="true" />
                    <span>Explore Mangaluru Map</span>
                  </button>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {bundle?.bookmarks.map((bm) => (
                    <li
                      key={bm.id}
                      className="ios-glass-subtle rounded-2xl p-3 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#1C1917] dark:text-[#F5F2EE] truncate">
                          {bm.centreName}
                        </p>
                        {bm.centreArea && (
                          <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">
                            {bm.centreArea}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleRemoveBookmark(bm.centreId)}
                        aria-label={`Remove ${bm.centreName}`}
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-[#57534E] hover:text-[#B3261E]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Perspective3DCard>
          </SmoothReveal>

          <SmoothReveal delay={0.06}>
            <Perspective3DCard tiltStrength={2} animateEntrance={false} className="ios-glass rounded-[24px] p-5 sm:p-6 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
                <CalendarClock className="h-4 w-4 text-[#B3261E]" aria-hidden="true" />
                <span>Synced with PostgreSQL + Firebase Auth</span>
              </div>
              <p className="text-xs text-[#57534E] dark:text-[#A8A29E] leading-relaxed">
                Your saved blood banks, future donation appointments, and donation history persist safely across devices.
              </p>
            </Perspective3DCard>
          </SmoothReveal>
        </aside>
      </div>
    </div>
  );
}
