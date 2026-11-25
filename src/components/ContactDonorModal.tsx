import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, MessageSquare, Phone, RefreshCw, X } from 'lucide-react';
import { GlassSegmentedControl, Perspective3DCard } from './SmoothSection.tsx';
import { api, saveContactTrack, saveRequestToken } from '../lib/api.ts';
import type {
  ContactRequestView,
  DonorPublic,
  NotificationDispatchReceipt,
  Urgency,
} from '../shared/types.ts';
import { OtpVerification } from './OtpVerification.tsx';
import { UrgencyLabel } from './UrgencyLabel.tsx';
import type { Language } from '../i18n/translations.ts';

interface ContactDonorModalProps {
  donor: DonorPublic | null;
  existingTrack?: { id: string; token: string } | null;
  lang: Language;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export function ContactDonorModal({
  donor,
  existingTrack,
  lang,
  onClose,
  onNavigate,
}: ContactDonorModalProps) {
  const [requesterName, setRequesterName] = useState('');
  const [phone, setPhone] = useState('');
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [hospital, setHospital] = useState('');
  const [units, setUnits] = useState(1);
  const [urgency, setUrgency] = useState<Urgency>('critical');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [contactRequest, setContactRequest] = useState<ContactRequestView | null>(null);
  const [trackingToken, setTrackingToken] = useState<string | null>(existingTrack?.token ?? null);
  const [dispatchReceipt, setDispatchReceipt] = useState<NotificationDispatchReceipt | null>(null);
  const [fallbackInfo, setFallbackInfo] = useState<{
    message: string;
    helplineNote: string;
    stateBloodCellNumber: string;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function refreshStatus(id: string, token: string) {
    setRefreshing(true);
    setError(null);
    try {
      const res = await api.getContactRequestStatus(id, token);
      setContactRequest(res.contactRequest);
      setFallbackInfo(res.coordinatorFallback);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not refresh status.');
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (existingTrack) {
      void refreshStatus(existingTrack.id, existingTrack.token);
    }
  }, [existingTrack]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!donor) return;
    if (!verificationToken) {
      setError('Verify your mobile number with OTP before sending the request.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createContactRequest({
        donorId: donor.id,
        requesterName,
        phone,
        hospital,
        units,
        urgency,
        verificationToken,
      });
      setContactRequest(res.contactRequest);
      setTrackingToken(res.trackingToken);
      setDispatchReceipt(res.notificationDispatch ?? null);
      saveRequestToken(res.contactRequest.requestId, res.requesterToken);
      saveContactTrack({
        id: res.contactRequest.id,
        token: res.trackingToken,
        donorFirstName: res.contactRequest.donorFirstName,
        bloodGroup: res.contactRequest.donorBloodGroup,
        hospital: res.contactRequest.hospital,
        createdAt: res.contactRequest.createdAt,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send contact request.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-donor-title"
    >
      <div className="w-full max-w-lg my-auto">
        <Perspective3DCard
          tiltStrength={2.2}
          className="w-full rounded-[26px] ios-hero-glass p-6 sm:p-7 space-y-5 shadow-[0_28px_64px_-16px_rgba(0,0,0,0.5)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id="contact-donor-title"
                className="text-lg font-bold text-[#1C1917] dark:text-[#F5F2EE]"
              >
                {contactRequest
                  ? 'Contact request status'
                  : `Request contact with ${donor?.firstName ?? 'Donor'}`}
              </h2>
              {donor && !contactRequest && (
                <p className="text-sm text-[#57534E] dark:text-[#A8A29E] mt-1">
                  {donor.bloodGroup} · {donor.area}, {donor.city} ·{' '}
                  {donor.verified ? 'Verified donor' : 'Pending verification'}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close contact request modal"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl ios-glass-subtle text-[#57534E] hover:text-[#1C1917] dark:text-[#A8A29E] dark:hover:text-[#F5F2EE] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {contactRequest ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl ios-glass-subtle space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
                    {contactRequest.donorFirstName} ({contactRequest.donorBloodGroup})
                  </span>
                  <UrgencyLabel urgency={contactRequest.urgency} lang={lang} />
                </div>
                <p className="text-sm text-[#57534E] dark:text-[#A8A29E]">
                  {contactRequest.hospital} · {contactRequest.units}{' '}
                  {contactRequest.units === 1 ? 'unit' : 'units'}
                </p>

              {contactRequest.status === 'pending' && (
                <div className="pt-2 border-t border-[#E2DDD6] dark:border-[#38322E] space-y-2.5">
                  <div className="flex items-center gap-2 text-sm font-medium text-[#92400E] dark:text-[#FBBF24]">
                    <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Waiting for donor to accept</span>
                  </div>
                  <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">
                    An alert was sent to {contactRequest.donorFirstName}. Their phone number is shared only if they accept.
                    Coordinator fallback activates at{' '}
                    <span className="tabular-nums font-medium text-[#1C1917] dark:text-[#F5F2EE]">
                      {new Date(contactRequest.coordinatorFallbackAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>{' '}
                    (within 2 hours).
                  </p>
                </div>
              )}

              {contactRequest.status === 'accepted' && (
                <div className="pt-2 border-t border-[#E2DDD6] dark:border-[#38322E] space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#166534] dark:text-[#86EFAC]">
                    <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Donor accepted your request</span>
                  </div>
                  {contactRequest.donorPhone && (
                    <a
                      href={`tel:${contactRequest.donorPhone}`}
                      className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-md bg-[#B3261E] text-white text-sm font-semibold hover:bg-[#961E17] transition-colors duration-150 tabular-nums"
                    >
                      <Phone className="h-4 w-4" aria-hidden="true" />
                      <span>Call {contactRequest.donorPhone}</span>
                    </a>
                  )}
                </div>
              )}

              {contactRequest.status === 'declined' && (
                <div className="pt-2 border-t border-[#E2DDD6] dark:border-[#38322E] space-y-2">
                  <p className="text-sm font-medium text-[#B3261E] dark:text-[#F28B82]">
                    This donor declined and is unable to donate right now.
                  </p>
                  <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">
                    Your request is open on the Blood Requests Board so other matching donors can respond.
                  </p>
                </div>
              )}
            </div>

            {dispatchReceipt && (
              <div className="p-4 rounded-[14px] ios-glass-subtle space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#166534] dark:text-[#86EFAC]">
                    <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      {dispatchReceipt.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} notification sent
                    </span>
                  </div>
                  <span className="text-[11px] text-[#57534E] dark:text-[#A8A29E] tabular-nums">
                    {dispatchReceipt.recipientFirstName} · {dispatchReceipt.recipientMasked}
                  </span>
                </div>
                <p className="text-xs text-[#1C1917] dark:text-[#F5F2EE] leading-relaxed font-mono bg-white/70 dark:bg-[#141210]/70 p-2.5 rounded-lg border border-[#E2DDD6]/70 dark:border-[#38322E]">
                  {dispatchReceipt.messageText}
                </p>
              </div>
            )}

            {fallbackInfo && (
              <div className="p-4 rounded-md border border-[#B3261E]/40 bg-[#FBEAE8] dark:bg-[#3A1513] space-y-2">
                <p className="text-sm font-semibold text-[#B3261E] dark:text-[#F28B82]">
                  2-hour coordinator fallback active
                </p>
                <p className="text-xs text-[#1C1917] dark:text-[#F5F2EE]">{fallbackInfo.message}</p>
                <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">
                  State Blood Helpline: <span className="font-semibold tabular-nums">{fallbackInfo.stateBloodCellNumber}</span> ·{' '}
                  {fallbackInfo.helplineNote}
                </p>
              </div>
            )}

            {error && (
              <p role="alert" className="text-sm text-[#B3261E] dark:text-[#F28B82]">
                {error}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              {trackingToken && (
                <button
                  type="button"
                  onClick={() => refreshStatus(contactRequest.id, trackingToken)}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 text-sm font-medium rounded-xl ios-glass-subtle text-[#1C1917] dark:text-[#F5F2EE] hover:opacity-90 transition-opacity duration-150"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  <span>{refreshing ? 'Checking...' : 'Check response'}</span>
                </button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigate('/requests');
                  }}
                  className="min-h-[44px] px-4 py-2 text-sm font-medium rounded-xl ios-glass-subtle text-[#1C1917] dark:text-[#F5F2EE]"
                >
                  View Requests Board
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl bg-[#B3261E] text-white hover:bg-[#961E17]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">
              Your request will notify the donor first. Their phone number is shared only if they accept.
              If there is no response within 2 hours, a coordinator fallback pathway is provided.
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1.5">
                Your name (patient family / attendant)
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

            <OtpVerification
              purpose="request_contact"
              phone={phone}
              onPhoneChange={setPhone}
              onVerified={(tok) => setVerificationToken(tok)}
              label="Your mobile number (shared only if donor accepts)"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
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
                <label className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1.5">
                  Units needed
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  required
                  value={units}
                  onChange={(e) => setUnits(Number(e.target.value) || 1)}
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl border border-[#E2DDD6] dark:border-white/15 bg-white/80 dark:bg-[#141210]/80 text-[#1C1917] dark:text-[#F5F2EE] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#B3261E]"
                />
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1.5">
                Urgency
              </span>
              <GlassSegmentedControl
                ariaLabel="Urgency level"
                layoutId="contact-donor-urgency-segment"
                fullWidth
                value={urgency}
                onChange={setUrgency}
                options={[
                  { value: 'critical', label: 'Critical (hours)' },
                  { value: 'urgent', label: 'Urgent (24h)' },
                  { value: 'standard', label: 'Standard' },
                ]}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-[#B3261E] dark:text-[#F28B82]">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
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
                {submitting ? 'Sending request...' : 'Notify donor'}
              </button>
            </div>
          </form>
        )}
        </Perspective3DCard>
      </div>
    </div>
  );
}
