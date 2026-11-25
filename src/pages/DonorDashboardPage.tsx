import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  Bell,
  Building2,
  Calendar,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  Clock,
  Droplets,
  Lock,
  LogOut,
  MapPin,
  MessageSquare,
  Phone,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
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
import { api, getDonorToken, setDonorToken } from '../lib/api.ts';
import {
  BLOOD_GROUPS,
  INDIAN_CITIES,
  type AlertChannel,
  type BloodCentreView,
  type BloodGroup,
  type ContactRequestView,
  type DonationRecord,
  type DonorProfile,
} from '../shared/types.ts';
import { OtpVerification } from '../components/OtpVerification.tsx';
import { UrgencyLabel } from '../components/UrgencyLabel.tsx';
import { GlassAreaCombobox } from '../components/GlassAreaCombobox.tsx';
import { GlassDatePicker } from '../components/GlassDatePicker.tsx';
import { GlassSelect } from '../components/GlassSelect.tsx';
import { CloudAccountSection, GoogleSignInButton } from '../components/CloudAccountSection.tsx';
import { useFirebaseAuth } from '../contexts/AuthContext.tsx';
import {
  Donor3DEligibilityRing,
  GlassSegmentedControl,
  IOS_EASE,
  IOS_SPRING,
  Perspective3DCard,
  SmoothReveal,
} from '../components/SmoothSection.tsx';
import type { Language } from '../i18n/translations.ts';

interface DonorDashboardPageProps {
  lang: Language;
  onNavigate: (path: string) => void;
}

interface MonthlyDonationPoint {
  key: string;
  monthLabel: string;
  fullMonth: string;
  count: number;
  units: number;
}

const MANGALURU_SUGGESTED_CENTRES = [
  'Wenlock District Hospital Blood Bank, Hampankatta',
  'Indian Red Cross Society Blood Centre, Hampankatta',
  'Father Muller Charitable Institutions Blood Bank, Kankanady',
  'KMC Hospital Blood Centre, Attavar',
  'Yenepoya Medical College Hospital, Deralakatte',
  'KS Hegde Hospital (KSHEMA), Deralakatte',
  'AJ Hospital & Research Centre, Kuntikana',
  'KMC Hospital, Ambedkar Circle',
];

const APPOINTMENT_TIME_SLOTS = [
  '09:00 AM – 11:00 AM',
  '11:00 AM – 01:00 PM',
  '02:00 PM – 04:00 PM',
  '04:00 PM – 06:00 PM',
];

function buildLast12MonthsChartData(donations: DonationRecord[]): MonthlyDonationPoint[] {
  const now = new Date();
  const buckets: MonthlyDonationPoint[] = [];
  const map = new Map<string, MonthlyDonationPoint>();

  for (let offset = 11; offset >= 0; offset--) {
    const dt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const yyyy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const key = `${yyyy}-${mm}`;
    const monthLabel = dt.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    const fullMonth = dt.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
    const point: MonthlyDonationPoint = { key, monthLabel, fullMonth, count: 0, units: 0 };
    buckets.push(point);
    map.set(key, point);
  }

  for (const d of donations) {
    const key = d.donatedAt.slice(0, 7);
    const target = map.get(key);
    if (target) {
      target.count += 1;
      target.units += Math.max(1, d.units || 1);
    }
  }

  return buckets;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: MonthlyDonationPoint }>;
}

function DonationChartTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;
  return (
    <div className="ios-glass rounded-xl px-3.5 py-2.5 text-xs shadow-lg">
      <p className="font-semibold text-[#1C1917] dark:text-[#F5F2EE]">{item.fullMonth}</p>
      <p className="mt-1 text-[#B3261E] dark:text-[#F28B82] font-semibold tabular-nums">
        {item.count} donation{item.count === 1 ? '' : 's'}
        {item.units > 0 ? ` · ${item.units} unit${item.units === 1 ? '' : 's'}` : ''}
      </p>
    </div>
  );
}

export function DonorDashboardPage({ lang, onNavigate }: DonorDashboardPageProps) {
  const [token, setToken] = useState<string | null>(() => getDonorToken());
  const [profile, setProfile] = useState<DonorProfile | null>(null);
  const [incoming, setIncoming] = useState<ContactRequestView[]>([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const { user: firebaseUser } = useFirebaseAuth();
  const [preferOtpForm, setPreferOtpForm] = useState(false);

  // Unified Sign In / Register state
  const [authTab, setAuthTab] = useState<'signin' | 'register'>('signin');
  const [loginPhone, setLoginPhone] = useState('');

  // Inline Registration state
  const [regName, setRegName] = useState('');
  const [regAge, setRegAge] = useState('25');
  const [regBloodGroup, setRegBloodGroup] = useState<BloodGroup>('O+');
  const [regCity, setRegCity] = useState('Mangaluru');
  const [regArea, setRegArea] = useState('');
  const [regLastDonation, setRegLastDonation] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regOtpToken, setRegOtpToken] = useState<string | null>(null);
  const [regAlertChannel, setRegAlertChannel] = useState<AlertChannel>('whatsapp');
  const [regConsent, setRegConsent] = useState(false);
  const [registering, setRegistering] = useState(false);

  // Profile editor state
  const [editName, setEditName] = useState('');
  const [editAge, setEditAge] = useState('25');
  const [editCity, setEditCity] = useState('Mangaluru');
  const [editArea, setEditArea] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Chart view mode
  const [chartType, setChartType] = useState<'bar' | 'area'>('bar');

  // 90-day Eligibility Check & Donation form
  const [donatedAt, setDonatedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [donationLocation, setDonationLocation] = useState('');
  const [donationNotes, setDonationNotes] = useState('');
  const [checkAgeWeight, setCheckAgeWeight] = useState(false);
  const [checkHealthy, setCheckHealthy] = useState(false);
  const [checkGapConfirmed, setCheckGapConfirmed] = useState(false);
  const [savingDonation, setSavingDonation] = useState(false);

  // Schedule Future Donation Appointment state
  const [nearbyCentres, setNearbyCentres] = useState<BloodCentreView[]>([]);
  const [apptCentreId, setApptCentreId] = useState<string>('');
  const [apptCustomLocation, setApptCustomLocation] = useState('');
  const [apptDate, setApptDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [apptTimeSlot, setApptTimeSlot] = useState(APPOINTMENT_TIME_SLOTS[0]);
  const [apptNotes, setApptNotes] = useState('');
  const [bookingAppt, setBookingAppt] = useState(false);
  const [updatingApptId, setUpdatingApptId] = useState<string | null>(null);

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const syncProfileForm = useCallback((p: DonorProfile) => {
    setEditName(p.name);
    setEditAge(String(p.age));
    setEditCity(p.city);
    setEditArea(p.area);
  }, []);

  const loadDashboard = useCallback(
    async (activeToken: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getDonorMe(activeToken);
        setProfile(res.profile);
        setIncoming(res.incomingRequests);
        syncProfileForm(res.profile);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Session expired. Log in again.');
        setDonorToken(null);
        setToken(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    },
    [syncProfileForm]
  );

  useEffect(() => {
    if (token) {
      void loadDashboard(token);
    }
  }, [token, loadDashboard]);

  useEffect(() => {
    if (!profile) return;
    let active = true;
    const todayStr = new Date().toISOString().slice(0, 10);
    const earliest =
      profile.eligibility.isCooldownActive &&
      profile.eligibility.nextEligibleDate &&
      profile.eligibility.nextEligibleDate > todayStr
        ? profile.eligibility.nextEligibleDate
        : todayStr;
    setApptDate((prev) => (prev < earliest ? earliest : prev));

    api
      .getCentres({ nearestToArea: profile.area || undefined })
      .then((res) => {
        if (!active) return;
        setNearbyCentres(res.centres);
        setApptCentreId((prev) => {
          if (prev) return prev;
          return res.centres[0]?.id ?? '__custom__';
        });
      })
      .catch(() => {
        if (!active) return;
        setApptCentreId((prev) => prev || '__custom__');
      });

    return () => {
      active = false;
    };
  }, [profile]);

  async function handleOtpVerified(verificationToken: string) {
    setError(null);
    try {
      const res = await api.loginDonor(verificationToken);
      setDonorToken(res.token);
      setToken(res.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    }
  }

  async function handleInlineRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!regOtpToken) {
      setError('Verify your mobile number via OTP to register and save your profile.');
      return;
    }
    setRegistering(true);
    setError(null);
    try {
      const res = await api.registerDonor({
        name: regName,
        age: Number(regAge),
        bloodGroup: regBloodGroup,
        city: regCity,
        area: regArea,
        phone: regPhone,
        lastDonation: regLastDonation || null,
        alertChannel: regAlertChannel,
        consentAccepted: regConsent,
        verificationToken: regOtpToken,
      });
      setDonorToken(res.token);
      setToken(res.token);
      setStatusMessage('Account created and saved to the portal. Welcome to your Donor Dashboard.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setRegistering(false);
    }
  }

  async function handlePatch(patch: {
    name?: string;
    age?: number;
    city?: string;
    area?: string;
    available?: boolean;
    alertChannel?: AlertChannel;
    reconfirm?: boolean;
  }) {
    if (!token) return;
    setError(null);
    setStatusMessage(null);
    try {
      const res = await api.updateDonorMe(token, patch);
      setProfile(res.profile);
      setIncoming(res.incomingRequests);
      syncProfileForm(res.profile);
      if (patch.reconfirm) {
        setStatusMessage('Availability saved and reconfirmed for the next 90 days.');
      } else if (typeof patch.available === 'boolean') {
        setStatusMessage(
          patch.available
            ? 'Saved: Your profile is active for matching requests.'
            : 'Saved: Your profile is paused and hidden from donor search.'
        );
      } else if (patch.alertChannel) {
        setStatusMessage(`Saved: Alert channel updated to ${patch.alertChannel.toUpperCase()}.`);
      } else {
        setStatusMessage('Saved: Your donor profile details have been updated.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update profile.');
    }
  }

  async function handleSaveProfileForm(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSavingProfile(true);
    await handlePatch({
      name: editName,
      age: Number(editAge),
      city: editCity,
      area: editArea,
    });
    setSavingProfile(false);
  }

  async function handleRespondContact(contactId: string, decision: 'accepted' | 'declined') {
    if (!token) return;
    setError(null);
    setStatusMessage(null);
    try {
      const res = await api.respondContactRequest(token, contactId, decision);
      setProfile(res.profile);
      setIncoming(res.incomingRequests);
      setStatusMessage(
        decision === 'accepted'
          ? 'Contact request accepted and saved. Your phone number is now shared with this family.'
          : 'Contact request declined and saved.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not respond.');
    }
  }

  async function handleLogDonation(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSavingDonation(true);
    setError(null);
    setStatusMessage(null);
    try {
      const res = await api.logDonation(token, {
        donatedAt,
        location: donationLocation,
        units: 1,
        notes: donationNotes,
      });
      setProfile(res.profile);
      setIncoming(res.incomingRequests);
      setDonationLocation('');
      setDonationNotes('');
      setCheckAgeWeight(false);
      setCheckHealthy(false);
      setCheckGapConfirmed(false);
      setStatusMessage('Donation saved! Your 12-month chart and 90-day recovery lock are updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log donation.');
    } finally {
      setSavingDonation(false);
    }
  }

  async function handleBookAppointment(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    const selectedCentre = nearbyCentres.find((c) => c.id === apptCentreId);
    const resolvedLocation =
      apptCentreId === '__custom__' || !selectedCentre
        ? apptCustomLocation.trim()
        : `${selectedCentre.name}, ${selectedCentre.area}`;

    if (resolvedLocation.length < 2) {
      setError('Select a nearby blood bank or enter a blood bank name.');
      return;
    }

    setBookingAppt(true);
    setError(null);
    setStatusMessage(null);
    try {
      const res = await api.scheduleAppointment(token, {
        appointmentDate: apptDate,
        timeSlot: apptTimeSlot,
        location: resolvedLocation,
        centreId: selectedCentre ? selectedCentre.id : null,
        notes: apptNotes.trim(),
      });
      setProfile(res.profile);
      setIncoming(res.incomingRequests);
      setApptNotes('');
      setApptCustomLocation('');
      setStatusMessage(
        `Appointment booked at ${resolvedLocation} on ${apptDate} (${apptTimeSlot}). Confirmation logged to your alerts.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not schedule appointment.');
    } finally {
      setBookingAppt(false);
    }
  }

  async function handleAppointmentAction(id: string, status: 'completed' | 'cancelled') {
    if (!token) return;
    setUpdatingApptId(id);
    setError(null);
    setStatusMessage(null);
    try {
      const res = await api.updateAppointmentStatus(token, id, status);
      setProfile(res.profile);
      setIncoming(res.incomingRequests);
      setStatusMessage(
        status === 'completed'
          ? 'Appointment marked completed! Your 12-month history and 90-day recovery protection are updated.'
          : 'Scheduled appointment cancelled.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update appointment.');
    } finally {
      setUpdatingApptId(null);
    }
  }

  async function handleDeleteData() {
    if (!token) return;
    setDeleting(true);
    setError(null);
    try {
      await api.deleteDonorMe(token);
      setDonorToken(null);
      setToken(null);
      setProfile(null);
      onNavigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete account.');
      setDeleting(false);
    }
  }

  function handleLogout() {
    setDonorToken(null);
    setToken(null);
    setProfile(null);
    setStatusMessage(null);
    setError(null);
  }

  const chartData = useMemo(
    () => buildLast12MonthsChartData(profile?.donations ?? []),
    [profile?.donations]
  );

  const total12MonthDonations = useMemo(
    () => chartData.reduce((acc, item) => acc + item.count, 0),
    [chartData]
  );
  const total12MonthUnits = useMemo(
    () => chartData.reduce((acc, item) => acc + item.units, 0),
    [chartData]
  );

  // Check if selected donatedAt date falls within 90 days of any existing donation
  const selectedDateCooldownConflict = useMemo(() => {
    if (!profile || !/^\d{4}-\d{2}-\d{2}$/.test(donatedAt)) return null;
    const targetMs = new Date(`${donatedAt}T00:00:00.000Z`).getTime();
    if (Number.isNaN(targetMs)) return null;
    const cooldownMs = 90 * 24 * 60 * 60 * 1000;

    const allDates = new Set(profile.donations.map((d) => d.donatedAt));
    if (profile.lastDonation) allDates.add(profile.lastDonation);

    for (const dateStr of allDates) {
      const exMs = new Date(`${dateStr}T00:00:00.000Z`).getTime();
      if (Number.isNaN(exMs)) continue;
      if (Math.abs(targetMs - exMs) < cooldownMs) {
        const eligibleDate = new Date(exMs + cooldownMs).toISOString().slice(0, 10);
        const daysLeft = Math.max(
          1,
          Math.ceil((exMs + cooldownMs - targetMs) / (24 * 60 * 60 * 1000))
        );
        return { dateStr, eligibleDate, daysLeft };
      }
    }
    return null;
  }, [profile, donatedAt]);

  // Check if selected future appointment date conflicts with 90-day window of past donations or scheduled appointments
  const selectedApptCooldownConflict = useMemo(() => {
    if (!profile || !/^\d{4}-\d{2}-\d{2}$/.test(apptDate)) return null;
    const targetMs = new Date(`${apptDate}T00:00:00.000Z`).getTime();
    if (Number.isNaN(targetMs)) return null;
    const cooldownMs = 90 * 24 * 60 * 60 * 1000;

    const entries: Array<{ dateStr: string; kind: 'donation' | 'appointment' }> = [];
    for (const d of profile.donations) {
      entries.push({ dateStr: d.donatedAt, kind: 'donation' });
    }
    if (profile.lastDonation && !profile.donations.some((d) => d.donatedAt === profile.lastDonation)) {
      entries.push({ dateStr: profile.lastDonation, kind: 'donation' });
    }
    for (const a of profile.appointments ?? []) {
      entries.push({ dateStr: a.appointmentDate, kind: 'appointment' });
    }

    for (const ex of entries) {
      const exMs = new Date(`${ex.dateStr}T00:00:00.000Z`).getTime();
      if (Number.isNaN(exMs)) continue;
      if (Math.abs(targetMs - exMs) < cooldownMs) {
        const eligibleDate = new Date(exMs + cooldownMs).toISOString().slice(0, 10);
        const daysLeft = Math.max(
          1,
          Math.ceil((exMs + cooldownMs - targetMs) / (24 * 60 * 60 * 1000))
        );
        return { dateStr: ex.dateStr, kind: ex.kind, eligibleDate, daysLeft };
      }
    }
    return null;
  }, [profile, apptDate]);

  if (!token && firebaseUser && !preferOtpForm) {
    return (
      <CloudAccountSection
        onNavigate={onNavigate}
        onSwitchToOtpTab={() => setPreferOtpForm(true)}
      />
    );
  }

  if (!token) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-2 pb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#B3261E] dark:text-[#F28B82]">
            Donor Portal · Google Sign-In &amp; Secure OTP Access
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1C1917] dark:text-[#F5F2EE]">
            Sign in or register your donor card
          </h1>
          <p className="text-sm text-[#57534E] dark:text-[#A8A29E] max-w-2xl">
            Sign in with Google to sync bookmarks, appointments, and donation history across devices, or verify with mobile OTP.
          </p>
        </div>

        {/* Google Sign-In Quick Access */}
        <Perspective3DCard className="ios-glass rounded-[22px] p-5 sm:p-6" tiltStrength={2.5}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-[#1C1917] dark:text-[#F5F2EE]">
                Cloud Sync with Google Account
              </h2>
              <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">
                Instant sign-in backed by Cloud SQL PostgreSQL for bookmarks, schedules, and donation history.
              </p>
            </div>
            {firebaseUser ? (
              <button
                type="button"
                onClick={() => setPreferOtpForm(false)}
                className="min-h-[44px] px-5 py-2 text-sm font-semibold rounded-xl bg-[#B3261E] text-white hover:bg-[#961E17]"
              >
                Open Google Cloud Dashboard
              </button>
            ) : (
              <GoogleSignInButton />
            )}
          </div>
        </Perspective3DCard>

        <Perspective3DCard className="ios-hero-glass rounded-[22px] p-5 sm:p-7 space-y-6" tiltStrength={3}>
          {/* iOS 26 Segmented Switcher */}
          <GlassSegmentedControl
            ariaLabel="Donor authentication mode"
            layoutId="donor-auth-tab-segment"
            value={authTab}
            onChange={(tab) => {
              setAuthTab(tab);
              setError(null);
            }}
            options={[
              { value: 'signin', label: 'Sign In' },
              { value: 'register', label: 'Register & Save' },
            ]}
          />

          <AnimatePresence mode="wait">
            {authTab === 'signin' ? (
              <motion.div
                key="signin"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: IOS_EASE }}
                className="space-y-4"
              >
                <OtpVerification
                  purpose="login"
                  phone={loginPhone}
                  onPhoneChange={setLoginPhone}
                  onVerified={(verTok) => void handleOtpVerified(verTok)}
                  label="Registered mobile number"
                  helperNote="Sample seeded donors: 9845701001 (Mangaluru A+), 9840112201 (Chennai O+), 9842113301 (Madurai O-)."
                />
              </motion.div>
            ) : (
              <motion.form
                key="register"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: IOS_EASE }}
                onSubmit={handleInlineRegister}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="dash-reg-name"
                      className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1.5"
                    >
                      Full name
                    </label>
                    <input
                      id="dash-reg-name"
                      type="text"
                      required
                      minLength={2}
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/80 dark:bg-[#141210]/80 text-[#1C1917] dark:text-[#F5F2EE] focus:outline-none focus:ring-2 focus:ring-[#B3261E]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="dash-reg-age"
                      className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1.5"
                    >
                      Age (18–65)
                    </label>
                    <input
                      id="dash-reg-age"
                      type="number"
                      min={18}
                      max={65}
                      required
                      value={regAge}
                      onChange={(e) => setRegAge(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/80 dark:bg-[#141210]/80 text-[#1C1917] dark:text-[#F5F2EE] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#B3261E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label
                      htmlFor="dash-reg-bg"
                      className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1.5"
                    >
                      Blood group
                    </label>
                    <GlassSelect
                      id="dash-reg-bg"
                      ariaLabel="Blood group"
                      value={regBloodGroup}
                      onChange={(val) => setRegBloodGroup(val as BloodGroup)}
                      options={BLOOD_GROUPS}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="dash-reg-city"
                      className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1.5"
                    >
                      City
                    </label>
                    <GlassSelect
                      id="dash-reg-city"
                      ariaLabel="City"
                      value={regCity}
                      onChange={setRegCity}
                      options={INDIAN_CITIES}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="dash-reg-area"
                      className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1.5"
                    >
                      Locality / Area
                    </label>
                    <GlassAreaCombobox
                      id="dash-reg-area"
                      city={regCity}
                      value={regArea}
                      onChange={setRegArea}
                      required
                      placeholder="Enter your locality or area"
                      ariaLabel="Locality / Area"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label
                      htmlFor="dash-reg-last"
                      className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1.5"
                    >
                      Last donation date (if any)
                    </label>
                    <GlassDatePicker
                      id="dash-reg-last"
                      value={regLastDonation}
                      onChange={setRegLastDonation}
                      max={new Date().toISOString().slice(0, 10)}
                      placeholder="Select date (optional)"
                      ariaLabel="Last donation date"
                    />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1.5">
                      Urgent alert channel
                    </span>
                    <GlassSegmentedControl
                      ariaLabel="Urgent alert channel"
                      layoutId="donor-reg-alert-segment"
                      fullWidth
                      value={regAlertChannel}
                      onChange={setRegAlertChannel}
                      options={[
                        { value: 'whatsapp', label: 'WhatsApp' },
                        { value: 'sms', label: 'SMS' },
                      ]}
                    />
                  </div>
                </div>

                <OtpVerification
                  purpose="register"
                  phone={regPhone}
                  onPhoneChange={setRegPhone}
                  onVerified={(tok) => setRegOtpToken(tok)}
                  label="Verify mobile number to save profile"
                />

                <label className="flex items-start gap-3 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    required
                    checked={regConsent}
                    onChange={(e) => setRegConsent(e.target.checked)}
                    className="mt-1 h-4 w-4 accent-[#B3261E] shrink-0"
                  />
                  <span className="text-xs text-[#57534E] dark:text-[#A8A29E] leading-relaxed">
                    I agree to save my donor profile and receive {regAlertChannel.toUpperCase()} alerts when matching patients need blood. My number stays private until I accept a request.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={registering || !regOtpToken || !regConsent}
                  className="w-full sm:w-auto min-h-[46px] px-6 py-2.5 text-sm font-semibold rounded-xl bg-[#B3261E] text-white hover:bg-[#961E17] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {registering ? 'Saving profile...' : 'Create & Save Donor Profile'}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {error && (
            <p
              role="alert"
              className="p-3.5 rounded-xl bg-[#FBEAE8] dark:bg-[#3A1513] border border-[#B3261E]/30 text-sm text-[#B3261E] dark:text-[#F28B82]"
            >
              {error}
            </p>
          )}
        </Perspective3DCard>
      </div>
    );
  }

  if (loading || !profile) {
    return (
      <div className="ios-glass rounded-[22px] p-8 text-sm text-[#57534E] dark:text-[#A8A29E]">
        Loading your donor dashboard...
      </div>
    );
  }

  const elig = profile.eligibility;
  const pendingCount = incoming.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* iOS 26 Liquid Glass Hero Donor Pass */}
      <Perspective3DCard className="ios-hero-glass rounded-[24px] p-5 sm:p-7" tiltStrength={3.5}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            <Donor3DEligibilityRing
              isCooldownActive={elig.isCooldownActive}
              daysUntilEligible={elig.daysUntilEligible}
            />
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-bold text-[#1C1917] dark:text-[#F5F2EE]">
                  {profile.name}
                </h1>
                <span className="text-base sm:text-lg font-extrabold text-[#B3261E] dark:text-[#F28B82]">
                  {profile.bloodGroup}
                </span>
                {profile.verified ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#166534] dark:text-[#86EFAC]">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    <span>Verified donor</span>
                  </span>
                ) : (
                  <span className="text-xs text-[#57534E] dark:text-[#A8A29E]">
                    Pending coordinator review
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-[#57534E] dark:text-[#A8A29E] tabular-nums">
                {profile.area}, {profile.city} · Age {profile.age} · {profile.phoneMasked} · Alerts:{' '}
                {profile.alertChannel.toUpperCase()}
              </p>

              <p className="text-xs font-medium text-[#1C1917] dark:text-[#F5F2EE] tabular-nums">
                {elig.isCooldownActive ? (
                  <span className="text-[#B45309] dark:text-[#FBBF24]">
                    90-day recovery lock active · Eligible again on {elig.nextEligibleDate} (
                    {elig.daysUntilEligible} day{elig.daysUntilEligible === 1 ? '' : 's'} left)
                  </span>
                ) : (
                  <span className="text-[#166534] dark:text-[#86EFAC]">
                    Eligible to donate blood now ·{' '}
                    {profile.lastDonation
                      ? `Last donation: ${profile.lastDonation}`
                      : 'Ready for first logged donation'}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
            <button
              type="button"
              onClick={() => void handlePatch({ available: !profile.available })}
              className={`min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl transition-all active:scale-[0.98] ${
                profile.available
                  ? 'ios-glass-subtle text-[#1C1917] dark:text-[#F5F2EE]'
                  : 'bg-[#B3261E] text-white hover:bg-[#961E17]'
              }`}
            >
              {profile.available ? 'Pause availability' : 'Set as available'}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="min-h-[44px] px-4 py-2 text-sm font-medium rounded-xl ios-glass-subtle text-[#1C1917] dark:text-[#F5F2EE] inline-flex items-center gap-2 active:scale-[0.98]"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </Perspective3DCard>

      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={IOS_SPRING}
            className="p-4 rounded-2xl border border-[#166534]/30 bg-[#F0FDF4]/90 dark:bg-[#14281D]/90 backdrop-blur-md text-sm text-[#166534] dark:text-[#86EFAC] flex items-center gap-2.5"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{statusMessage}</span>
          </motion.div>
        )}

        {error && (
          <motion.div
            role="alert"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={IOS_SPRING}
            className="p-4 rounded-2xl border border-[#B3261E]/40 bg-[#FBEAE8]/95 dark:bg-[#3A1513]/95 backdrop-blur-md text-sm text-[#B3261E] dark:text-[#F28B82]"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compact Google Cloud Sync Strip when logged in via Phone OTP */}
      <CloudAccountSection onNavigate={onNavigate} compactMode />

      {/* Top Metrics Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Perspective3DCard className="ios-glass rounded-[20px] p-5 space-y-2.5" tiltStrength={4}>
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[#57534E] dark:text-[#A8A29E]">
              12-Month Donations
            </h2>
            <Activity className="h-4 w-4 text-[#B3261E] dark:text-[#F28B82]" aria-hidden="true" />
          </div>
          <p className="text-2xl font-bold text-[#1C1917] dark:text-[#F5F2EE] tabular-nums">
            {total12MonthDonations}{' '}
            <span className="text-sm font-medium text-[#57534E] dark:text-[#A8A29E]">
              ({total12MonthUnits} unit{total12MonthUnits === 1 ? '' : 's'})
            </span>
          </p>
          <p className="text-xs text-[#57534E] dark:text-[#A8A29E] tabular-nums">
            Lifetime saved records: {profile.donations.length}
          </p>
        </Perspective3DCard>

        <Perspective3DCard className="ios-glass rounded-[20px] p-5 space-y-2.5" tiltStrength={4}>
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[#57534E] dark:text-[#A8A29E]">
              90-Day Eligibility Window
            </h2>
            <CalendarClock className="h-4 w-4 text-[#B3261E] dark:text-[#F28B82]" aria-hidden="true" />
          </div>
          {elig.isCooldownActive ? (
            <>
              <p className="text-2xl font-bold text-[#B45309] dark:text-[#FBBF24] tabular-nums">
                {elig.daysUntilEligible}d left
              </p>
              <p className="text-xs text-[#57534E] dark:text-[#A8A29E] tabular-nums">
                Locked until {elig.nextEligibleDate} for post-donation recovery.
              </p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-[#166534] dark:text-[#86EFAC]">Eligible Now</p>
              <p className="text-xs text-[#57534E] dark:text-[#A8A29E] tabular-nums">
                90+ days clear · Safe to schedule or log a donation.
              </p>
            </>
          )}
        </Perspective3DCard>

        <Perspective3DCard className="ios-glass rounded-[20px] p-5 space-y-2.5" tiltStrength={4}>
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[#57534E] dark:text-[#A8A29E]">
              90-Day Search Reconfirmation
            </h2>
            <Sparkles className="h-4 w-4 text-[#B3261E] dark:text-[#F28B82]" aria-hidden="true" />
          </div>
          <p className="text-xs text-[#57534E] dark:text-[#A8A29E] tabular-nums leading-relaxed">
            {elig.isConfirmationFresh
              ? `Confirmed ${elig.daysSinceConfirmed} day${elig.daysSinceConfirmed === 1 ? '' : 's'} ago. Active for 90 days.`
              : `Overdue (${elig.daysSinceConfirmed} days). Reconfirm to appear in searches.`}
          </p>
          <button
            type="button"
            onClick={() => void handlePatch({ reconfirm: true })}
            className="w-full min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-[#B3261E] text-white hover:bg-[#961E17] active:scale-[0.98] transition-all"
          >
            Reconfirm availability now
          </button>
        </Perspective3DCard>
      </div>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-6">
          {/* Recharts 12-Month Donation History Chart */}
          <SmoothReveal>
          <Perspective3DCard tiltStrength={2.1} animateEntrance={false} className="ios-glass rounded-[24px] p-5 sm:p-6">
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[#1C1917] dark:text-[#F5F2EE]">
                  Donation history (Last 12 months)
                </h2>
                <p className="text-xs text-[#57534E] dark:text-[#A8A29E] tabular-nums">
                  Monthly donation count · {total12MonthDonations} completed in the rolling 12-month window
                </p>
              </div>

              <GlassSegmentedControl
                ariaLabel="Chart view mode"
                layoutId="donor-chart-mode-segment"
                size="sm"
                value={chartType}
                onChange={setChartType}
                options={[
                  { value: 'bar', label: 'Bars' },
                  { value: 'area', label: 'Trend' },
                ]}
              />
            </div>

            <div className="h-[240px] w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(168, 162, 158, 0.24)" vertical={false} />
                    <XAxis
                      dataKey="monthLabel"
                      tick={{ fontSize: 11, fill: '#78716C' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      width={32}
                      tick={{ fontSize: 11, fill: '#78716C' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<DonationChartTooltip />} cursor={{ fill: 'rgba(179,38,30,0.06)' }} />
                    <Bar
                      dataKey="count"
                      name="Donations"
                      fill="#B3261E"
                      radius={[8, 8, 2, 2]}
                      maxBarSize={30}
                    />
                  </BarChart>
                ) : (
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="donorHistoryGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#B3261E" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#B3261E" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(168, 162, 158, 0.24)" vertical={false} />
                    <XAxis
                      dataKey="monthLabel"
                      tick={{ fontSize: 11, fill: '#78716C' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      width={32}
                      tick={{ fontSize: 11, fill: '#78716C' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<DonationChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      name="Donations"
                      stroke="#B3261E"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#donorHistoryGradient)"
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>

            {total12MonthDonations === 0 && (
              <p className="text-xs text-[#57534E] dark:text-[#A8A29E] ios-glass-subtle rounded-xl px-3.5 py-2.5">
                No donations recorded in the last 12 months yet. Once you complete and save a donation below, your monthly chart updates immediately.
              </p>
            )}

            {profile.donations.length > 0 && (
              <div className="pt-3 border-t border-[#E2DDD6]/70 dark:border-white/10 space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[#57534E] dark:text-[#A8A29E]">
                  Saved donation log ({profile.donations.length})
                </h3>
                <ul className="divide-y divide-[#E2DDD6]/70 dark:divide-white/10">
                  {profile.donations.slice(0, 6).map((d) => (
                    <li
                      key={d.id}
                      className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                    >
                      <div>
                        <p className="text-sm font-medium text-[#1C1917] dark:text-[#F5F2EE]">
                          {d.location}
                        </p>
                        {d.notes && (
                          <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">{d.notes}</p>
                        )}
                      </div>
                      <span className="text-xs font-medium text-[#57534E] dark:text-[#A8A29E] tabular-nums shrink-0">
                        {d.donatedAt} · {d.units}u
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
          </Perspective3DCard>
          </SmoothReveal>

          {/* 90-Day Eligibility Checker & Log Donation */}
          <SmoothReveal>
          <Perspective3DCard tiltStrength={2.2} animateEntrance={false} className="ios-glass rounded-[24px] p-5 sm:p-6">
          <section className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[#1C1917] dark:text-[#F5F2EE]">
                  Check eligibility &amp; donate blood
                </h2>
                <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">
                  Every whole-blood donation enforces a mandatory 90-day recovery window before your next donation.
                </p>
              </div>
              <Droplets className="h-5 w-5 text-[#B3261E] dark:text-[#F28B82] shrink-0" aria-hidden="true" />
            </div>

            {elig.isCooldownActive && (
              <div className="p-4 rounded-2xl border border-[#D97706]/40 bg-[#FEF3C7]/75 dark:bg-[#3A280A]/65 space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-bold text-[#92400E] dark:text-[#FBBF24]">
                  <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>90-Day Recovery Period Active — Currently Ineligible</span>
                </div>
                <p className="text-xs text-[#78350F] dark:text-[#FDE68A] leading-relaxed tabular-nums">
                  Your last donation was on {profile.lastDonation}. You cannot donate again for 90 days. You will become eligible on{' '}
                  <span className="font-bold">{elig.nextEligibleDate}</span> ({elig.daysUntilEligible} day
                  {elig.daysUntilEligible === 1 ? '' : 's'} remaining).
                </p>
              </div>
            )}

            <form onSubmit={handleLogDonation} className="space-y-4">
              <div className="ios-glass-subtle rounded-2xl p-4 space-y-2.5">
                <p className="text-xs font-semibold text-[#1C1917] dark:text-[#F5F2EE] flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-[#B3261E] dark:text-[#F28B82]" aria-hidden="true" />
                  <span>Pre-donation eligibility verification</span>
                </p>
                <label className="flex items-start gap-2.5 text-xs text-[#57534E] dark:text-[#A8A29E] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkAgeWeight}
                    onChange={(e) => setCheckAgeWeight(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#B3261E]"
                  />
                  <span>I am aged 18–65 and weigh at least 45 kg.</span>
                </label>
                <label className="flex items-start gap-2.5 text-xs text-[#57534E] dark:text-[#A8A29E] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkHealthy}
                    onChange={(e) => setCheckHealthy(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#B3261E]"
                  />
                  <span>I feel healthy today with no recent fever, antibiotics, or infection.</span>
                </label>
                <label className="flex items-start gap-2.5 text-xs text-[#57534E] dark:text-[#A8A29E] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkGapConfirmed}
                    onChange={(e) => setCheckGapConfirmed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#B3261E]"
                  />
                  <span>At least 90 days have passed since any previous whole-blood donation.</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="log-donated-at"
                    className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1.5"
                  >
                    Donation date
                  </label>
                  <GlassDatePicker
                    id="log-donated-at"
                    required
                    max={new Date().toISOString().slice(0, 10)}
                    value={donatedAt}
                    onChange={setDonatedAt}
                    ariaLabel="Donation date"
                  />
                </div>
                <div>
                  <label
                    htmlFor="log-location"
                    className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1.5"
                  >
                    Blood bank / hospital
                  </label>
                  <input
                    id="log-location"
                    type="text"
                    list="mangaluru-donation-centres"
                    required
                    value={donationLocation}
                    onChange={(e) => setDonationLocation(e.target.value)}
                    placeholder="Enter blood bank or hospital name"
                    className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/80 dark:bg-[#141210]/80 focus:outline-none focus:ring-2 focus:ring-[#B3261E]"
                  />
                  <datalist id="mangaluru-donation-centres">
                    {MANGALURU_SUGGESTED_CENTRES.map((centre) => (
                      <option key={centre} value={centre} />
                    ))}
                  </datalist>
                </div>
              </div>

              <input
                type="text"
                value={donationNotes}
                onChange={(e) => setDonationNotes(e.target.value)}
                placeholder="Enter optional donation note"
                className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/80 dark:bg-[#141210]/80 focus:outline-none focus:ring-2 focus:ring-[#B3261E]"
              />

              {selectedDateCooldownConflict && (
                <p
                  role="alert"
                  className="text-xs font-medium text-[#B3261E] dark:text-[#F28B82] tabular-nums"
                >
                  Selected date ({donatedAt}) is within 90 days of your {selectedDateCooldownConflict.dateStr} donation. Next eligible date: {selectedDateCooldownConflict.eligibleDate} ({selectedDateCooldownConflict.daysLeft}d remaining).
                </p>
              )}

              <button
                type="submit"
                disabled={
                  savingDonation ||
                  Boolean(selectedDateCooldownConflict) ||
                  !checkAgeWeight ||
                  !checkHealthy ||
                  !checkGapConfirmed
                }
                className="min-h-[44px] px-5 py-2.5 text-sm font-semibold rounded-xl bg-[#B3261E] text-white hover:bg-[#961E17] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {savingDonation
                  ? 'Saving donation...'
                  : 'Confirm Eligibility & Save Donation'}
              </button>
            </form>
          </section>
          </Perspective3DCard>
          </SmoothReveal>

          {/* Schedule Future Donation Appointment at Nearby Blood Bank */}
          <SmoothReveal>
          <Perspective3DCard className="ios-glass rounded-[24px] p-5 sm:p-6 space-y-5" tiltStrength={2.4} animateEntrance={false}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[#1C1917] dark:text-[#F5F2EE]">
                  Schedule future donation appointment
                </h2>
                <p className="text-xs text-[#57534E] dark:text-[#A8A29E] mt-0.5 leading-relaxed">
                  Reserve a slot at a nearby blood bank. Bookings automatically respect your 90-day safe recovery window.
                </p>
              </div>
              <CalendarCheck2 className="h-5 w-5 text-[#B3261E] dark:text-[#F28B82] shrink-0" aria-hidden="true" />
            </div>

            {elig.isCooldownActive && elig.nextEligibleDate && (
              <div className="ios-glass-subtle rounded-2xl px-4 py-3 text-xs text-[#92400E] dark:text-[#FBBF24] flex items-start gap-2.5 tabular-nums">
                <Clock className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  Because your last donation was on {profile.lastDonation}, your earliest eligible booking date is{' '}
                  <span className="font-bold">{elig.nextEligibleDate}</span>. You can schedule for that date or later right now.
                </span>
              </div>
            )}

            <form onSubmit={handleBookAppointment} className="space-y-3.5">
              <div>
                <label
                  htmlFor="appt-centre-select"
                  className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1.5"
                >
                  Nearby blood bank ({profile.city})
                </label>
                <GlassSelect
                  id="appt-centre-select"
                  ariaLabel="Nearby blood bank"
                  value={apptCentreId}
                  onChange={setApptCentreId}
                  options={[
                    ...nearbyCentres.map((c) => ({
                      value: c.id,
                      label: `${c.name} — ${c.area}${c.distanceKm !== undefined ? ` (${c.distanceKm.toFixed(1)} km)` : ''}`,
                    })),
                    { value: '__custom__', label: 'Other blood bank / hospital...' },
                  ]}
                />
              </div>

              {apptCentreId === '__custom__' && (
                <div>
                  <label
                    htmlFor="appt-custom-location"
                    className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1.5"
                  >
                    Blood bank or hospital name
                  </label>
                  <input
                    id="appt-custom-location"
                    type="text"
                    required
                    value={apptCustomLocation}
                    onChange={(e) => setApptCustomLocation(e.target.value)}
                    placeholder={`Enter blood bank or hospital name in ${profile.city}`}
                    className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/80 dark:bg-[#141210]/80 focus:outline-none focus:ring-2 focus:ring-[#B3261E]"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="appt-date-input"
                    className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1.5"
                  >
                    Preferred date
                  </label>
                  <GlassDatePicker
                    id="appt-date-input"
                    required
                    min={new Date().toISOString().slice(0, 10)}
                    value={apptDate}
                    onChange={setApptDate}
                    ariaLabel="Preferred date"
                  />
                </div>
                <div>
                  <label
                    htmlFor="appt-slot-select"
                    className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1.5"
                  >
                    Time slot
                  </label>
                  <GlassSelect
                    id="appt-slot-select"
                    ariaLabel="Time slot"
                    value={apptTimeSlot}
                    onChange={setApptTimeSlot}
                    options={APPOINTMENT_TIME_SLOTS}
                  />
                </div>
              </div>

              <input
                type="text"
                value={apptNotes}
                onChange={(e) => setApptNotes(e.target.value)}
                placeholder="Enter optional appointment note"
                className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/80 dark:bg-[#141210]/80 focus:outline-none focus:ring-2 focus:ring-[#B3261E]"
              />

              {selectedApptCooldownConflict && (
                <p
                  role="alert"
                  className="text-xs font-medium text-[#B3261E] dark:text-[#F28B82] tabular-nums"
                >
                  Selected date ({apptDate}) is within 90 days of your {selectedApptCooldownConflict.dateStr}{' '}
                  {selectedApptCooldownConflict.kind}. Earliest eligible booking date:{' '}
                  {selectedApptCooldownConflict.eligibleDate}.
                </p>
              )}

              <button
                type="submit"
                disabled={bookingAppt || Boolean(selectedApptCooldownConflict)}
                className="min-h-[44px] px-5 py-2.5 text-sm font-semibold rounded-xl bg-[#B3261E] text-white hover:bg-[#961E17] active:scale-[0.98] transition-all disabled:opacity-50 inline-flex items-center gap-2"
              >
                <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{bookingAppt ? 'Booking appointment...' : 'Book Donation Appointment'}</span>
              </button>
            </form>

            {/* Upcoming Scheduled Appointments List */}
            {(profile.appointments?.length ?? 0) > 0 && (
              <div className="pt-4 border-t border-[#E2DDD6]/70 dark:border-white/10 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[#57534E] dark:text-[#A8A29E]">
                  Upcoming scheduled appointments ({profile.appointments.length})
                </h3>
                <div className="space-y-2.5">
                  {profile.appointments.map((appt) => {
                    const todayStr = new Date().toISOString().slice(0, 10);
                    const canComplete = appt.appointmentDate <= todayStr;
                    const busy = updatingApptId === appt.id;
                    return (
                      <div
                        key={appt.id}
                        className="ios-glass-subtle rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
                            <Building2 className="h-4 w-4 text-[#B3261E] dark:text-[#F28B82] shrink-0" aria-hidden="true" />
                            <span className="truncate">{appt.location}</span>
                          </div>
                          <p className="text-xs text-[#57534E] dark:text-[#A8A29E] tabular-nums flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" aria-hidden="true" />
                              {appt.appointmentDate}
                            </span>
                            {appt.timeSlot && <span>· {appt.timeSlot}</span>}
                            {appt.notes && <span>· {appt.notes}</span>}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {canComplete && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleAppointmentAction(appt.id, 'completed')}
                              className="min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#B3261E] text-white hover:bg-[#961E17] disabled:opacity-50"
                            >
                              Mark completed
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleAppointmentAction(appt.id, 'cancelled')}
                            className="min-h-[44px] px-3 py-2 text-xs font-medium rounded-xl border border-[#E2DDD6] dark:border-white/10 text-[#57534E] dark:text-[#A8A29E] hover:text-[#B3261E] dark:hover:text-[#F28B82] inline-flex items-center gap-1 disabled:opacity-50"
                          >
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Perspective3DCard>
          </SmoothReveal>

          {/* Incoming Blood Requests */}
          <SmoothReveal>
          <Perspective3DCard tiltStrength={2.2} animateEntrance={false} className="ios-glass rounded-[24px] p-5 sm:p-6">
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-[#1C1917] dark:text-[#F5F2EE]">
                Incoming blood requests ({incoming.length})
              </h2>
              {pendingCount > 0 && (
                <span className="text-xs font-semibold text-[#B3261E] dark:text-[#F28B82] tabular-nums">
                  {pendingCount} pending response
                </span>
              )}
            </div>

            {incoming.length === 0 ? (
              <p className="text-sm text-[#57534E] dark:text-[#A8A29E]">
                No families have requested your contact yet. When someone requests blood from you, both a dashboard notification and a {profile.alertChannel.toUpperCase()} message will be sent automatically.
              </p>
            ) : (
              <div className="space-y-3">
                {incoming.map((reqItem) => (
                  <div
                    key={reqItem.id}
                    className="ios-glass-subtle rounded-2xl p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
                          {reqItem.hospital}
                        </p>
                        <p className="text-xs text-[#57534E] dark:text-[#A8A29E] tabular-nums">
                          Requested by {reqItem.requesterName} · {reqItem.units} unit(s) ·{' '}
                          {new Date(reqItem.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <UrgencyLabel urgency={reqItem.urgency} lang={lang} />
                    </div>

                    {reqItem.status === 'pending' && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void handleRespondContact(reqItem.id, 'accepted')}
                          className="min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl bg-[#B3261E] text-white hover:bg-[#961E17] active:scale-[0.98]"
                        >
                          Accept &amp; share my number
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleRespondContact(reqItem.id, 'declined')}
                          className="min-h-[44px] px-4 py-2 text-sm font-medium rounded-xl border border-[#E2DDD6] dark:border-white/10 text-[#1C1917] dark:text-[#F5F2EE]"
                        >
                          Decline
                        </button>
                      </div>
                    )}

                    {reqItem.status === 'accepted' && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#166534] dark:text-[#86EFAC]">
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          <span>Accepted &amp; number shared</span>
                        </span>
                        {reqItem.requesterPhone && (
                          <a
                            href={`tel:${reqItem.requesterPhone}`}
                            className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-[#262220] border border-[#E2DDD6] dark:border-white/10 text-[#1C1917] dark:text-[#F5F2EE] tabular-nums"
                          >
                            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Call family: {reqItem.requesterPhone}</span>
                          </a>
                        )}
                      </div>
                    )}

                    {reqItem.status === 'declined' && (
                      <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">Declined</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
          </Perspective3DCard>
          </SmoothReveal>
        </div>

        {/* Right Column: Persistent Profile Editor + WhatsApp / SMS Notification Center + Delete */}
        <aside className="lg:col-span-5 space-y-6">
          {/* Save Profile Details */}
          <SmoothReveal>
          <Perspective3DCard tiltStrength={2.6} animateEntrance={false} className="ios-glass rounded-[24px] p-5 sm:p-6">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#1C1917] dark:text-[#F5F2EE]">
                Saved donor details
              </h2>
              <Save className="h-4 w-4 text-[#B3261E] dark:text-[#F28B82]" aria-hidden="true" />
            </div>
            <form onSubmit={handleSaveProfileForm} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="edit-donor-name"
                    className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1"
                  >
                    Full name
                  </label>
                  <input
                    id="edit-donor-name"
                    type="text"
                    required
                    minLength={2}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/80 dark:bg-[#141210]/80 focus:outline-none focus:ring-2 focus:ring-[#B3261E]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-donor-age"
                    className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1"
                  >
                    Age
                  </label>
                  <input
                    id="edit-donor-age"
                    type="number"
                    min={18}
                    max={65}
                    required
                    value={editAge}
                    onChange={(e) => setEditAge(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/80 dark:bg-[#141210]/80 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#B3261E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="edit-donor-city"
                    className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1"
                  >
                    City
                  </label>
                  <GlassSelect
                    id="edit-donor-city"
                    ariaLabel="City"
                    value={editCity}
                    onChange={setEditCity}
                    options={INDIAN_CITIES}
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-donor-area"
                    className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1"
                  >
                    Area / Locality
                  </label>
                  <GlassAreaCombobox
                    id="edit-donor-area"
                    city={editCity}
                    value={editArea}
                    onChange={setEditArea}
                    required
                    placeholder="Enter your locality or area"
                    ariaLabel="Area / Locality"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="w-full min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl ios-glass-subtle text-[#1C1917] dark:text-[#F5F2EE] hover:bg-white dark:hover:bg-[#262220] active:scale-[0.98] transition-all"
              >
                {savingProfile ? 'Saving changes...' : 'Save profile changes'}
              </button>
            </form>
          </section>
          </Perspective3DCard>
          </SmoothReveal>

          {/* WhatsApp / SMS Alert Preferences & Live Notification Log */}
          <SmoothReveal delay={0.05}>
          <Perspective3DCard tiltStrength={2.6} animateEntrance={false} className="ios-glass rounded-[24px] p-5 sm:p-6">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#1C1917] dark:text-[#F5F2EE]">
                WhatsApp &amp; SMS alerts
              </h2>
              <MessageSquare className="h-4 w-4 text-[#B3261E] dark:text-[#F28B82]" aria-hidden="true" />
            </div>

            <GlassSegmentedControl
              ariaLabel="Alert channel"
              layoutId="donor-dashboard-alert-segment"
              fullWidth
              value={profile.alertChannel}
              onChange={(ch) => void handlePatch({ alertChannel: ch })}
              options={[
                { value: 'whatsapp', label: 'WhatsApp text' },
                { value: 'sms', label: 'SMS text' },
              ]}
            />

            <div className="pt-3 border-t border-[#E2DDD6]/70 dark:border-white/10 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#57534E] dark:text-[#A8A29E]">
                <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Notifications &amp; messages sent to you ({profile.notifications.length})</span>
              </div>
              {profile.notifications.length === 0 ? (
                <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">
                  No WhatsApp or SMS blood request alerts have been sent to you yet.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {profile.notifications.slice(0, 6).map((n) => (
                    <li
                      key={n.id}
                      className="ios-glass-subtle text-xs p-3 rounded-2xl space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[#57534E] dark:text-[#A8A29E] tabular-nums">
                        <span className="font-semibold text-[#B3261E] dark:text-[#F28B82]">
                          {n.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} ·{' '}
                          {n.kind === 'contact_request'
                            ? 'Direct Blood Request'
                            : n.kind === 'match_alert'
                              ? 'City Blood Alert'
                              : n.kind === 'appointment_booked'
                                ? 'Appointment Booked'
                                : '90-Day Reminder'}
                        </span>
                        <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[#1C1917] dark:text-[#F5F2EE] leading-relaxed">
                        {n.message}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
          </Perspective3DCard>
          </SmoothReveal>

          {/* Delete Data */}
          <SmoothReveal delay={0.08}>
          <Perspective3DCard tiltStrength={2.6} animateEntrance={false} className="ios-glass rounded-[24px] p-5 sm:p-6">
          <section className="space-y-3">
            <h2 className="text-base font-bold text-[#1C1917] dark:text-[#F5F2EE]">
              Delete my data
            </h2>
            <p className="text-xs text-[#57534E] dark:text-[#A8A29E] leading-relaxed">
              Permanently remove your donor profile, encrypted mobile number, and donation history from this portal.
            </p>
            {confirmDelete ? (
              <div className="space-y-2 pt-1">
                <p className="text-xs font-semibold text-[#B3261E] dark:text-[#F28B82]">
                  Confirm permanent deletion? This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => void handleDeleteData()}
                    className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-[#B3261E] text-white"
                  >
                    {deleting ? 'Deleting...' : 'Yes, delete permanently'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="min-h-[44px] px-4 py-2 text-xs font-medium rounded-xl border border-[#E2DDD6] dark:border-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="min-h-[44px] px-4 py-2 text-sm font-medium rounded-xl border border-[#B3261E]/40 text-[#B3261E] dark:text-[#F28B82] inline-flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span>Delete my data</span>
              </button>
            )}
          </section>
          </Perspective3DCard>
          </SmoothReveal>
        </aside>
      </div>
    </div>
  );
}
