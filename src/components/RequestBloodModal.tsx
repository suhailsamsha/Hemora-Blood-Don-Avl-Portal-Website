import { useState } from 'react';
import { CheckCircle2, MessageSquare, X } from 'lucide-react';
import { GlassSegmentedControl, Perspective3DCard } from './SmoothSection.tsx';
import { api, saveRequestToken } from '../lib/api.ts';
import {
  BLOOD_GROUPS,
  INDIAN_CITIES,
  type BloodGroup,
  type RequestAlertDispatchSummary,
  type Urgency,
} from '../shared/types.ts';
import { OtpVerification } from './OtpVerification.tsx';
import { GlassAreaCombobox } from './GlassAreaCombobox.tsx';
import { GlassSelect } from './GlassSelect.tsx';

interface RequestBloodModalProps {
  defaultBloodGroup?: BloodGroup;
  defaultCity?: string;
  onClose: () => void;
  onCreated: () => void;
}

export function RequestBloodModal({
  defaultBloodGroup = 'O+',
  defaultCity = 'Mangaluru',
  onClose,
  onCreated,
}: RequestBloodModalProps) {
  const [requesterName, setRequesterName] = useState('');
  const [phone, setPhone] = useState('');
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>(defaultBloodGroup);
  const [units, setUnits] = useState(1);
  const [hospital, setHospital] = useState('');
  const [city, setCity] = useState(defaultCity);
  const [area, setArea] = useState('');
  const [urgency, setUrgency] = useState<Urgency>('critical');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    matchedNotifiedCount: number;
    id: string;
    dispatchedSummary?: RequestAlertDispatchSummary;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!verificationToken) {
      setError('Verify your mobile number via OTP before posting.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createRequest({
        requesterName,
        phone,
        bloodGroup,
        units,
        hospital,
        city,
        area,
        urgency,
        notes,
        verificationToken,
      });
      saveRequestToken(res.request.id, res.requesterToken);
      setResult({
        matchedNotifiedCount: res.matchedNotifiedCount,
        id: res.request.id,
        dispatchedSummary: res.dispatchedSummary,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post blood request.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-blood-title"
    >
      <div className="w-full max-w-lg my-auto">
        <Perspective3DCard
          tiltStrength={2.2}
          className="w-full rounded-[26px] ios-hero-glass p-6 sm:p-7 space-y-5 shadow-[0_28px_64px_-16px_rgba(0,0,0,0.5)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id="request-blood-title"
                className="text-lg font-bold text-[#1C1917] dark:text-[#F5F2EE]"
              >
                Post a blood request
              </h2>
              <p className="text-xs text-[#57534E] dark:text-[#A8A29E] mt-1">
                Open requests stay active for 7 days unless marked fulfilled or renewed.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close request modal"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl ios-glass-subtle text-[#57534E] hover:text-[#1C1917] dark:text-[#A8A29E] dark:hover:text-[#F5F2EE] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {result ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-2xl ios-glass-subtle">
              <CheckCircle2 className="h-5 w-5 text-[#166534] dark:text-[#86EFAC] shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
                  Blood request posted
                </p>
                <p className="text-sm text-[#57534E] dark:text-[#A8A29E]">
                  <span className="font-semibold tabular-nums">{result.matchedNotifiedCount}</span>{' '}
                  matching available donor{result.matchedNotifiedCount === 1 ? '' : 's'} in {city}{' '}
                  were alerted. Your request is now visible on the Blood Requests Board.
                </p>
                {result.dispatchedSummary && result.dispatchedSummary.total > 0 && (
                  <div className="pt-2 border-t border-[#E2DDD6]/70 dark:border-[#38322E] space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-[#166534] dark:text-[#86EFAC] tabular-nums">
                      <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        Dispatched via WhatsApp ({result.dispatchedSummary.whatsappCount}) · SMS ({result.dispatchedSummary.smsCount})
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-[#57534E] dark:text-[#A8A29E]">
                      {result.dispatchedSummary.sampleMessage}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl bg-[#B3261E] text-white hover:bg-[#961E17]"
            >
              View Blood Requests Board
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1.5">
                  Patient / family contact name
                </label>
                <input
                  type="text"
                  required
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl border border-[#E2DDD6] dark:border-white/15 bg-white/80 dark:bg-[#141210]/80 text-[#1C1917] dark:text-[#F5F2EE] focus:outline-none focus:ring-2 focus:ring-[#B3261E]"
                />
              </div>

              <div>
                <label htmlFor="req-blood-group" className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1.5">
                  Blood group needed
                </label>
                <GlassSelect
                  id="req-blood-group"
                  ariaLabel="Blood group needed"
                  value={bloodGroup}
                  onChange={(val) => setBloodGroup(val as BloodGroup)}
                  options={BLOOD_GROUPS}
                />
              </div>
            </div>

            <OtpVerification
              purpose="request_blood"
              phone={phone}
              onPhoneChange={setPhone}
              onVerified={(tok) => setVerificationToken(tok)}
              label="Contact mobile number (hidden until a donor accepts)"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1.5">
                  Hospital name
                </label>
                <input
                  type="text"
                  required
                  value={hospital}
                  onChange={(e) => setHospital(e.target.value)}
                  placeholder="Enter hospital name"
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl border border-[#E2DDD6] dark:border-white/15 bg-white/80 dark:bg-[#141210]/80 text-[#1C1917] dark:text-[#F5F2EE] focus:outline-none focus:ring-2 focus:ring-[#B3261E]"
                />
              </div>

              <div>
                <label htmlFor="req-city" className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1.5">
                  City
                </label>
                <GlassSelect
                  id="req-city"
                  ariaLabel="City"
                  value={city}
                  onChange={setCity}
                  options={INDIAN_CITIES}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label htmlFor="req-area" className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1.5">
                  Area / Ward
                </label>
                <GlassAreaCombobox
                  id="req-area"
                  city={city}
                  value={area}
                  onChange={setArea}
                  placeholder="Enter area or ward"
                  ariaLabel="Area / Ward"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1.5">
                  Units
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  required
                  value={units}
                  onChange={(e) => setUnits(Number(e.target.value) || 1)}
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl border border-[#E2DDD6] dark:border-white/15 bg-white/80 dark:bg-[#141210]/80 text-[#1C1917] dark:text-[#F5F2EE] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#B3261E]"
                />
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1.5">
                Urgency level
              </span>
              <GlassSegmentedControl
                ariaLabel="Urgency level"
                layoutId="request-blood-urgency-segment"
                fullWidth
                value={urgency}
                onChange={setUrgency}
                options={[
                  { value: 'critical', label: 'Critical' },
                  { value: 'urgent', label: 'Urgent' },
                  { value: 'standard', label: 'Standard' },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1.5">
                Blood bank instructions (optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter ward number, casualty desk contact, or note"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-[#E2DDD6] dark:border-white/15 bg-white/80 dark:bg-[#141210]/80 text-[#1C1917] dark:text-[#F5F2EE] focus:outline-none focus:ring-2 focus:ring-[#B3261E]"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-[#B3261E] dark:text-[#F28B82]">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 py-2 text-sm font-medium rounded-xl ios-glass-subtle text-[#1C1917] dark:text-[#F5F2EE]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !verificationToken}
                className="min-h-[44px] px-5 py-2 text-sm font-semibold rounded-xl bg-[#B3261E] text-white hover:bg-[#961E17] active:scale-[0.98] transition-all duration-150 disabled:opacity-50"
              >
                {submitting ? 'Posting...' : 'Post blood request'}
              </button>
            </div>
          </form>
        )}
        </Perspective3DCard>
      </div>
    </div>
  );
}
