import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Flag, Phone, RefreshCw, X } from 'lucide-react';
import { api, getDonorToken, getRequestTokens } from '../lib/api.ts';
import { BLOOD_GROUPS, INDIAN_CITIES, type BloodRequest } from '../shared/types.ts';
import { TRANSLATIONS, type Language } from '../i18n/translations.ts';
import { UrgencyLabel } from '../components/UrgencyLabel.tsx';
import { ReportModal } from '../components/ReportModal.tsx';
import { OtpVerification } from '../components/OtpVerification.tsx';
import { GlassSegmentedControl, Perspective3DCard, SmoothReveal, SmoothRow } from '../components/SmoothSection.tsx';
import { GlassSelect } from '../components/GlassSelect.tsx';

interface RequestsPageProps {
  lang: Language;
  onOpenRequestBlood: () => void;
  refreshSignal: number;
}

function formatExpiry(expiresAt: string): string {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return 'Expired';
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) return `Expires in ${days}d ${hours}h`;
  return `Expires in ${Math.max(1, hours)}h`;
}

export function RequestsPage({ lang, onOpenRequestBlood, refreshSignal }: RequestsPageProps) {
  const t = TRANSLATIONS[lang];
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [bloodGroup, setBloodGroup] = useState('ALL');
  const [city, setCity] = useState('');
  const [urgency, setUrgency] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reportTarget, setReportTarget] = useState<BloodRequest | null>(null);
  const [respondingTo, setRespondingTo] = useState<BloodRequest | null>(null);
  const [donorPhone, setDonorPhone] = useState('');
  const [donorOtpToken, setDonorOtpToken] = useState<string | null>(null);
  const [respondLoading, setRespondLoading] = useState(false);
  const [respondError, setRespondError] = useState<string | null>(null);
  const [acceptedContact, setAcceptedContact] = useState<{
    requesterName: string;
    requesterPhone: string;
    hospital: string;
    city: string;
  } | null>(null);

  const requestTokens = getRequestTokens();
  const loggedDonorToken = getDonorToken();

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getRequests({
        bloodGroup,
        city: city || undefined,
        urgency,
        status: 'open',
      });
      setRequests(res.requests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load blood requests.');
    } finally {
      setLoading(false);
    }
  }, [bloodGroup, city, urgency]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests, refreshSignal]);

  async function handleDonateClick(reqItem: BloodRequest) {
    setRespondingTo(reqItem);
    setAcceptedContact(null);
    setRespondError(null);
    setDonorOtpToken(null);

    if (loggedDonorToken) {
      setRespondLoading(true);
      try {
        const res = await api.respondToBloodRequest(reqItem.id, { donorToken: loggedDonorToken });
        setAcceptedContact(res);
        void loadRequests();
      } catch (err) {
        setRespondError(err instanceof Error ? err.message : 'Could not respond to request.');
      } finally {
        setRespondLoading(false);
      }
    }
  }

  async function handleOtpDonateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!respondingTo || !donorOtpToken) return;
    setRespondLoading(true);
    setRespondError(null);
    try {
      const res = await api.respondToBloodRequest(respondingTo.id, {
        verificationToken: donorOtpToken,
      });
      setAcceptedContact(res);
      void loadRequests();
    } catch (err) {
      setRespondError(err instanceof Error ? err.message : 'Could not link donor response.');
    } finally {
      setRespondLoading(false);
    }
  }

  async function handleMarkFulfilled(id: string) {
    const tok = requestTokens[id];
    if (!tok) return;
    try {
      await api.fulfillRequest(id, tok);
      void loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark request fulfilled.');
    }
  }

  async function handleRenew(id: string) {
    const tok = requestTokens[id];
    if (!tok) return;
    try {
      await api.renewRequest(id, tok);
      void loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not renew request.');
    }
  }

  return (
    <div className="space-y-6">
      <Perspective3DCard
        tiltStrength={2.2}
        className="ios-hero-glass rounded-[26px] p-5 sm:p-7"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1C1917] dark:text-[#F5F2EE]">
              Open blood requests
            </h1>
            <p className="text-sm text-[#57534E] dark:text-[#A8A29E]">
              Sorted by urgency (Critical first). Requests expire automatically after 7 days unless renewed or marked fulfilled.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenRequestBlood}
            className="min-h-[44px] px-5 py-2.5 text-sm font-semibold rounded-2xl bg-[#B3261E] text-white hover:bg-[#961E17] active:scale-[0.98] transition-[background-color,transform] duration-150 whitespace-nowrap shrink-0 shadow-sm"
          >
            {t.ctaRequestBlood}
          </button>
        </div>
      </Perspective3DCard>

      {/* Frosted Filters */}
      <SmoothReveal>
        <div className="ios-glass rounded-[22px] p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <GlassSelect
              ariaLabel="Filter by blood group"
              value={bloodGroup}
              onChange={setBloodGroup}
              className="min-w-[175px]"
              options={[
                { value: 'ALL', label: 'All blood groups' },
                ...BLOOD_GROUPS.map((g) => ({ value: g, label: g })),
              ]}
            />

            <GlassSelect
              ariaLabel="Filter by city"
              value={city}
              onChange={setCity}
              className="min-w-[165px]"
              options={[
                { value: '', label: 'All cities' },
                ...INDIAN_CITIES.map((c) => ({ value: c, label: c })),
              ]}
            />
          </div>

          <GlassSegmentedControl
            ariaLabel="Filter by urgency"
            layoutId="requests-urgency-segment"
            size="sm"
            value={urgency}
            onChange={setUrgency}
            options={[
              { value: 'ALL', label: 'All urgency' },
              { value: 'critical', label: 'Critical' },
              { value: 'urgent', label: 'Urgent' },
              { value: 'standard', label: 'Standard' },
            ]}
          />
        </div>
      </SmoothReveal>

      {error && (
        <div
          role="alert"
          className="p-4 rounded-2xl border border-[#B3261E]/40 bg-[#FBEAE8] dark:bg-[#3A1513] text-sm text-[#B3261E] dark:text-[#F28B82]"
        >
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[#57534E] dark:text-[#A8A29E]">{t.loadingText}</p>
      ) : requests.length === 0 ? (
        <Perspective3DCard tiltStrength={2} className="p-6 rounded-[22px] ios-glass space-y-2">
          <p className="text-sm font-medium text-[#1C1917] dark:text-[#F5F2EE]">
            No open blood requests match this filter.
          </p>
        </Perspective3DCard>
      ) : (
        <div className="space-y-3.5">
          {requests.map((item, idx) => {
            const isOwner = Boolean(requestTokens[item.id]);
            return (
              <SmoothRow key={item.id} index={idx}>
              <Perspective3DCard
                tiltStrength={2.4}
                animateEntrance={false}
                className="ios-glass rounded-[22px] p-4 sm:p-5"
              >
              <article className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-12 h-11 shrink-0 rounded-xl bg-[#F3EFEA] dark:bg-[#141210]/85 border border-[#E2DDD6] dark:border-white/10 flex items-center justify-center text-sm font-bold text-[#B3261E] dark:text-[#F28B82] tabular-nums">
                    {item.bloodGroup}
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <UrgencyLabel urgency={item.urgency} lang={lang} />
                      <span aria-hidden="true" className="text-[#57534E] dark:text-[#A8A29E]">·</span>
                      <span className="text-sm font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
                        {item.hospital}
                      </span>
                      <span className="text-xs text-[#57534E] dark:text-[#A8A29E]">
                        {item.area ? `${item.area}, ` : ''}{item.city}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#57534E] dark:text-[#A8A29E] tabular-nums">
                      <span>
                        {item.units} {item.units === 1 ? t.unitsUnit : t.unitsUnits}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Requested by {item.requesterName}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatExpiry(item.expiresAt)}</span>
                      {typeof item.contactCount === 'number' && item.contactCount > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{item.contactCount} donor contact{item.contactCount === 1 ? '' : 's'}</span>
                        </>
                      )}
                    </div>

                    {item.notes && (
                      <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">{item.notes}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDonateClick(item)}
                    className="min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl bg-[#B3261E] text-white hover:bg-[#961E17] active:scale-[0.98] transition-[background-color,transform] duration-150 whitespace-nowrap shadow-sm"
                  >
                    {t.iCanDonateBtn}
                  </button>

                  {isOwner && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleMarkFulfilled(item.id)}
                        className="min-h-[44px] px-3 py-2 text-xs font-medium rounded-xl ios-glass-subtle text-[#166534] dark:text-[#86EFAC] inline-flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Mark fulfilled</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRenew(item.id)}
                        className="min-h-[44px] px-3 py-2 text-xs font-medium rounded-xl ios-glass-subtle text-[#1C1917] dark:text-[#F5F2EE] inline-flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Renew (+7d)</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => setReportTarget(item)}
                    className="min-h-[44px] px-3 py-2 text-xs font-medium rounded-xl ios-glass-subtle text-[#57534E] dark:text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-[#F5F2EE] inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Flag className="h-3.5 w-3.5" aria-hidden="true" />
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

      {/* Donor Response Modal */}
      {respondingTo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="donate-respond-title"
        >
          <div className="w-full max-w-md my-auto">
          <Perspective3DCard tiltStrength={2.2} className="rounded-[26px] ios-hero-glass p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="donate-respond-title"
                  className="text-lg font-semibold text-[#1C1917] dark:text-[#F5F2EE]"
                >
                  Respond to {respondingTo.bloodGroup} request
                </h2>
                <p className="text-xs text-[#57534E] dark:text-[#A8A29E] mt-1">
                  {respondingTo.hospital}, {respondingTo.city}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRespondingTo(null)}
                aria-label="Close modal"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#57534E]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {acceptedContact ? (
              <div className="space-y-4">
                <p className="text-sm text-[#1C1917] dark:text-[#F5F2EE]">
                  Thank you. Contact the family attendant directly to coordinate at the hospital blood bank:
                </p>
                <div className="p-4 rounded-2xl ios-glass-subtle space-y-2">
                  <p className="text-sm font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
                    {acceptedContact.requesterName}
                  </p>
                  <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">
                    {acceptedContact.hospital}, {acceptedContact.city}
                  </p>
                  <a
                    href={`tel:${acceptedContact.requesterPhone}`}
                    className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-[#B3261E] text-white text-sm font-semibold tabular-nums"
                  >
                    <Phone className="h-4 w-4" aria-hidden="true" />
                    <span>Call {acceptedContact.requesterPhone}</span>
                  </a>
                </div>
                <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">{t.medicalDisclaimer}</p>
              </div>
            ) : respondLoading ? (
              <p className="text-sm text-[#57534E] dark:text-[#A8A29E]">Connecting you with the requester...</p>
            ) : (
              <form onSubmit={handleOtpDonateSubmit} className="space-y-4">
                <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">
                  Verify your registered donor mobile number to receive the attendant's contact number.
                </p>
                <OtpVerification
                  purpose="respond_request"
                  phone={donorPhone}
                  onPhoneChange={setDonorPhone}
                  onVerified={(tok) => setDonorOtpToken(tok)}
                  label="Registered donor mobile number"
                />
                {respondError && (
                  <p role="alert" className="text-sm text-[#B3261E] dark:text-[#F28B82]">
                    {respondError}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRespondingTo(null)}
                    className="min-h-[44px] px-4 py-2 text-sm font-medium rounded-xl ios-glass-subtle text-[#1C1917] dark:text-[#F5F2EE]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!donorOtpToken || respondLoading}
                    className="min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl bg-[#B3261E] text-white disabled:opacity-50"
                  >
                    Reveal requester contact
                  </button>
                </div>
              </form>
            )}
          </Perspective3DCard>
          </div>
        </div>
      )}

      {reportTarget && (
        <ReportModal
          targetType="request"
          targetId={reportTarget.id}
          targetLabel={`${reportTarget.bloodGroup} · ${reportTarget.hospital}, ${reportTarget.city}`}
          onClose={() => setReportTarget(null)}
        />
      )}
    </div>
  );
}
