import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { api, setDonorToken } from '../lib/api.ts';
import {
  BLOOD_GROUPS,
  INDIAN_CITIES,
  type AlertChannel,
  type BloodGroup,
  type DonorPublic,
} from '../shared/types.ts';
import { OtpVerification } from '../components/OtpVerification.tsx';
import { GlassAreaCombobox } from '../components/GlassAreaCombobox.tsx';
import { GlassDatePicker } from '../components/GlassDatePicker.tsx';
import { GlassSelect } from '../components/GlassSelect.tsx';
import { GlassSegmentedControl, Perspective3DCard, SmoothReveal } from '../components/SmoothSection.tsx';

interface RegisterDonorPageProps {
  onNavigate: (path: string) => void;
}

export function RegisterDonorPage({ onNavigate }: RegisterDonorPageProps) {
  const [name, setName] = useState('');
  const [age, setAge] = useState<string>('25');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O+');
  const [city, setCity] = useState('Mangaluru');
  const [area, setArea] = useState('');
  const [lastDonation, setLastDonation] = useState('');
  const [phone, setPhone] = useState('');
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [alertChannel, setAlertChannel] = useState<AlertChannel>('whatsapp');
  const [consentAccepted, setConsentAccepted] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredDonor, setRegisteredDonor] = useState<DonorPublic | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!verificationToken) {
      setError('Please verify your mobile number using OTP before submitting.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await api.registerDonor({
        name,
        age: Number(age),
        bloodGroup,
        city,
        area,
        phone,
        lastDonation: lastDonation || null,
        alertChannel,
        consentAccepted,
        verificationToken,
      });
      setDonorToken(res.token);
      setRegisteredDonor(res.donor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (registeredDonor) {
    return (
      <div className="max-w-2xl space-y-6">
        <Perspective3DCard tiltStrength={2.4} className="p-6 sm:p-7 rounded-[26px] ios-hero-glass space-y-4">
          <div className="flex items-center gap-2.5 text-[#166534] dark:text-[#86EFAC]">
            <CheckCircle2 className="h-6 w-6 shrink-0" aria-hidden="true" />
            <h1 className="text-xl font-bold text-[#1C1917] dark:text-[#F5F2EE]">
              You are registered as a donor
            </h1>
          </div>

          <p className="text-sm text-[#57534E] dark:text-[#A8A29E] leading-relaxed">
            Thank you, <span className="font-semibold text-[#1C1917] dark:text-[#F5F2EE]">{registeredDonor.firstName}</span>.
            Your entry ({registeredDonor.bloodGroup}, {registeredDonor.area}, {registeredDonor.city}) is saved.
            A coordinator will verify your profile so it carries the Verified label in search results.
          </p>

          <div className="p-4 rounded-2xl ios-glass-subtle space-y-2">
            <h2 className="text-sm font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
              How the 90-day rule protects you and keeps listings accurate
            </h2>
            <ul className="list-disc pl-5 space-y-1 text-xs text-[#57534E] dark:text-[#A8A29E] leading-relaxed">
              <li>
                After any blood donation, you are automatically hidden from search for 90 days so your body recovers.
                {registeredDonor.eligibility.isCooldownActive && registeredDonor.eligibility.nextEligibleDate
                  ? ` Based on your last donation date, you will become eligible again on ${registeredDonor.eligibility.nextEligibleDate}.`
                  : ''}
              </li>
              <li>
                Every 90 days we send a reminder via {registeredDonor.alertChannel.toUpperCase()} asking you to reconfirm availability.
                Unconfirmed entries are hidden automatically until you tap Reconfirm in your Donor Dashboard.
              </li>
              <li>
                Your phone number is never listed publicly. Only after you accept a contact request is your number shared with that family.
              </li>
            </ul>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('/donor')}
              className="min-h-[44px] px-5 py-2.5 text-sm font-semibold rounded-xl bg-[#B3261E] text-white hover:bg-[#961E17]"
            >
              Open Donor Dashboard
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="min-h-[44px] px-4 py-2 text-sm font-medium rounded-xl ios-glass-subtle text-[#1C1917] dark:text-[#F5F2EE]"
            >
              Back to donor search
            </button>
          </div>
        </Perspective3DCard>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-7 space-y-6">
        <Perspective3DCard tiltStrength={2.2} className="ios-hero-glass rounded-[24px] p-5 sm:p-6 space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1C1917] dark:text-[#F5F2EE]">
            Become a blood donor
          </h1>
          <p className="text-sm text-[#57534E] dark:text-[#A8A29E]">
            Register once. Your mobile number stays private and is shared only when you choose to accept a request.
          </p>
        </Perspective3DCard>

        <SmoothReveal>
        <Perspective3DCard tiltStrength={1.8} className="p-5 sm:p-6 rounded-[24px] ios-glass">
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label
                htmlFor="reg-name"
                className="block text-sm font-medium text-[#1C1917] dark:text-[#F5F2EE] mb-1.5"
              >
                Full name
              </label>
              <input
                id="reg-name"
                type="text"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 text-[#1C1917] dark:text-[#F5F2EE] focus:outline-none focus:ring-2 focus:ring-[#B3261E]"
              />
            </div>

            <div>
              <label
                htmlFor="reg-age"
                className="block text-sm font-medium text-[#1C1917] dark:text-[#F5F2EE] mb-1.5"
              >
                Age (18–65)
              </label>
              <input
                id="reg-age"
                type="number"
                min={18}
                max={65}
                required
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 text-[#1C1917] dark:text-[#F5F2EE] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#B3261E]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="reg-group"
                className="block text-sm font-medium text-[#1C1917] dark:text-[#F5F2EE] mb-1.5"
              >
                Blood group
              </label>
              <GlassSelect
                id="reg-group"
                ariaLabel="Blood group"
                value={bloodGroup}
                onChange={(val) => setBloodGroup(val as BloodGroup)}
                options={BLOOD_GROUPS}
              />
            </div>

            <div>
              <label
                htmlFor="reg-city"
                className="block text-sm font-medium text-[#1C1917] dark:text-[#F5F2EE] mb-1.5"
              >
                City
              </label>
              <GlassSelect
                id="reg-city"
                ariaLabel="City"
                value={city}
                onChange={setCity}
                options={INDIAN_CITIES}
              />
            </div>

            <div>
              <label
                htmlFor="reg-area"
                className="block text-sm font-medium text-[#1C1917] dark:text-[#F5F2EE] mb-1.5"
              >
                Locality / Area
              </label>
              <GlassAreaCombobox
                id="reg-area"
                city={city}
                value={area}
                onChange={setArea}
                required
                placeholder="Enter your locality or area"
                ariaLabel="Locality / Area"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="reg-last-donation"
                className="block text-sm font-medium text-[#1C1917] dark:text-[#F5F2EE] mb-1.5"
              >
                Last donation date (if any)
              </label>
              <GlassDatePicker
                id="reg-last-donation"
                value={lastDonation}
                onChange={setLastDonation}
                max={new Date().toISOString().slice(0, 10)}
                placeholder="Select date (optional)"
                ariaLabel="Last donation date"
              />
            </div>

            <div>
              <span className="block text-sm font-medium text-[#1C1917] dark:text-[#F5F2EE] mb-1.5">
                Alert preference
              </span>
              <GlassSegmentedControl
                ariaLabel="Alert preference"
                layoutId="register-alert-channel-segment"
                fullWidth
                value={alertChannel}
                onChange={setAlertChannel}
                options={[
                  { value: 'whatsapp', label: 'WhatsApp' },
                  { value: 'sms', label: 'SMS' },
                ]}
              />
            </div>
          </div>

          <OtpVerification
            purpose="register"
            phone={phone}
            onPhoneChange={setPhone}
            onVerified={(tok) => setVerificationToken(tok)}
            helperNote="Duplicate phone numbers are blocked. Already registered? Use Donor Login."
          />

          <label className="flex items-start gap-3 cursor-pointer pt-1">
            <input
              type="checkbox"
              required
              checked={consentAccepted}
              onChange={(e) => setConsentAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 accent-[#B3261E] shrink-0"
            />
            <span className="text-xs text-[#57534E] dark:text-[#A8A29E] leading-relaxed">
              I agree to be listed by first name, blood group, and locality. My mobile number will
              not be shown publicly and will only be shared with a patient's family if I accept
              their contact request. I can pause or delete my data anytime.
            </span>
          </label>

          {error && (
            <p role="alert" className="text-sm text-[#B3261E] dark:text-[#F28B82]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !verificationToken || !consentAccepted}
            className="w-full sm:w-auto min-h-[46px] px-6 py-2.5 text-sm font-semibold rounded-xl bg-[#B3261E] text-white hover:bg-[#961E17] transition-colors duration-150 disabled:opacity-50"
          >
            {submitting ? 'Registering...' : 'Complete donor registration'}
          </button>
        </form>
        </Perspective3DCard>
        </SmoothReveal>
      </div>

      <aside className="lg:col-span-5">
        <SmoothReveal delay={0.08}>
        <Perspective3DCard tiltStrength={3} className="p-5 sm:p-6 rounded-[24px] ios-glass space-y-4">
          <h2 className="text-base font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
            Before you register
          </h2>
          <ul className="space-y-3 text-sm text-[#57534E] dark:text-[#A8A29E] leading-relaxed">
            <li>
              <span className="font-medium text-[#1C1917] dark:text-[#F5F2EE]">Age and weight:</span>{' '}
              You should be between 18 and 65 years old and weigh at least 45 kg.
            </li>
            <li>
              <span className="font-medium text-[#1C1917] dark:text-[#F5F2EE]">90-day recovery gap:</span>{' '}
              We hide your profile automatically for 90 days after each donation.
            </li>
            <li>
              <span className="font-medium text-[#1C1917] dark:text-[#F5F2EE]">No medical records stored:</span>{' '}
              We never ask for or store medical test results. The hospital blood bank performs final screening before collection.
            </li>
          </ul>
        </Perspective3DCard>
        </SmoothReveal>
      </aside>
    </div>
  );
}
