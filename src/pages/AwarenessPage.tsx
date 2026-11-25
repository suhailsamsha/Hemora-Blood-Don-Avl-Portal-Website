import { useEffect, useState } from 'react';
import { QrCode } from 'lucide-react';
import { api } from '../lib/api.ts';
import { Perspective3DCard, SmoothReveal, SmoothRow } from '../components/SmoothSection.tsx';

interface AwarenessPageProps {
  onNavigate: (path: string) => void;
}

const CAMP_IMAGE_PATH = '/src/assets/images/blood_camp_chennai_1795098310434.jpg';

const DEFAULT_FAQS = [
  {
    id: 'faq_def_1',
    question: 'Who can donate blood?',
    answer:
      'Generally adults aged 18 to 65 weighing at least 45 kg, with normal haemoglobin and no active fever or infection. Final medical eligibility is always decided by the blood bank doctor on duty.',
  },
  {
    id: 'faq_def_2',
    question: 'How often can I donate?',
    answer:
      'This portal enforces a minimum 90-day gap after every recorded whole blood donation before listing you as available again.',
  },
  {
    id: 'faq_def_3',
    question: 'Why does the portal ask me to reconfirm every 90 days?',
    answer:
      'People move cities or change phone numbers. Hiding unconfirmed profiles keeps emergency families from calling inactive numbers.',
  },
];

export function AwarenessPage({ onNavigate }: AwarenessPageProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const [contents, setContents] = useState<Array<{ key: string; title: string; body: string }>>([]);
  const [faqs, setFaqs] = useState<Array<{ id: string; question: string; answer: string }>>(DEFAULT_FAQS);
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .getPublicContent()
      .then((res) => {
        if (!active) return;
        if (res.contents?.length) setContents(res.contents);
        if (res.faqs?.length) setFaqs(res.faqs);
      })
      .catch(() => {
        // Retain static defaults cleanly on transient error
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleFeedback(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.submitFeedback({
        name: feedbackName,
        message: feedbackMessage,
        page: 'awareness',
      });
      setSubmitted(true);
      setFeedbackMessage('');
      setFeedbackName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send feedback.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-10 max-w-5xl">
      <Perspective3DCard tiltStrength={2} className="ios-hero-glass rounded-[26px] p-6 sm:p-7">
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-6 space-y-4 flex flex-col justify-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1C1917] dark:text-[#F5F2EE] [text-wrap:balance]">
            How the Blood Donation Portal works
          </h1>
          <p className="text-sm text-[#57534E] dark:text-[#A8A29E] leading-relaxed">
            Built for families waiting outside hospital blood banks on slow mobile connections. No public phone directories, no stale listings older than 90 days.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              onClick={() => onNavigate('/qr')}
              className="min-h-[44px] px-4 py-2 text-sm font-medium rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/80 dark:bg-[#141210]/85 text-[#1C1917] dark:text-[#F5F2EE] hover:border-[#B3261E]/50 inline-flex items-center gap-2 transition-colors"
            >
              <QrCode className="h-4 w-4" aria-hidden="true" />
              <span>Print camp QR poster</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-6">
          {imgFailed ? (
            <div className="h-64 lg:h-full min-h-[220px] rounded-2xl border border-[#E2DDD6] dark:border-white/10 bg-[#F3EFEA] dark:bg-[#141210]/80 flex flex-col items-center justify-center p-6 text-center">
              <p className="text-sm font-medium text-[#1C1917] dark:text-[#F5F2EE]">
                Voluntary blood donation camp registration desk
              </p>
              <p className="text-xs text-[#57534E] dark:text-[#A8A29E] mt-1">
                Photo slot: Wenlock District Hospital Blood Bank, Hampankatta, Mangaluru
              </p>
            </div>
          ) : (
            <img
              src={CAMP_IMAGE_PATH}
              alt="Medical staff checking blood pressure and registering voluntary blood donors at a blood donation camp in Mangaluru"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-full h-64 lg:h-full min-h-[220px] object-cover rounded-2xl border border-[#E2DDD6] dark:border-white/10"
            />
          )}
        </div>
      </section>
      </Perspective3DCard>

      {/* Steps */}
      <SmoothReveal>
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
          Four steps from request to donation
        </h2>
        <Perspective3DCard tiltStrength={1.8} animateEntrance={false} className="ios-glass rounded-[24px] overflow-hidden">
          <div className="divide-y divide-[#E2DDD6] dark:divide-white/10">
            <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-12 gap-2">
              <span className="sm:col-span-3 text-sm font-semibold text-[#B3261E] dark:text-[#F28B82]">
                01. Search by city
              </span>
              <p className="sm:col-span-9 text-sm text-[#57534E] dark:text-[#A8A29E]">
                Enter the required blood group and locality. Only donors who have reconfirmed within 90 days and are outside the 90-day post-donation recovery gap appear as available.
              </p>
            </div>
            <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-12 gap-2">
              <span className="sm:col-span-3 text-sm font-semibold text-[#B3261E] dark:text-[#F28B82]">
                02. Request contact
              </span>
              <p className="sm:col-span-9 text-sm text-[#57534E] dark:text-[#A8A29E]">
                Verify your mobile number via OTP and enter the hospital name and units needed. The donor receives an SMS or WhatsApp alert without exposing their number publicly.
              </p>
            </div>
            <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-12 gap-2">
              <span className="sm:col-span-3 text-sm font-semibold text-[#B3261E] dark:text-[#F28B82]">
                03. Donor accepts
              </span>
              <p className="sm:col-span-9 text-sm text-[#57534E] dark:text-[#A8A29E]">
                Once the donor logs in and taps Accept, both phone numbers are exchanged. If there is no response within 2 hours, the portal surfaces coordinator fallback support.
              </p>
            </div>
            <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-12 gap-2">
              <span className="sm:col-span-3 text-sm font-semibold text-[#B3261E] dark:text-[#F28B82]">
                04. Hospital screening
              </span>
              <p className="sm:col-span-9 text-sm text-[#57534E] dark:text-[#A8A29E]">
                Donation takes place only at a licensed hospital or blood bank after haemoglobin, blood pressure, and mandatory infectious screening.
              </p>
            </div>
          </div>
        </Perspective3DCard>
      </section>
      </SmoothReveal>

      {/* Active CMS Announcements */}
      {contents.length > 0 && (
        <SmoothReveal>
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contents.map((block) => (
              <Perspective3DCard
                key={block.key}
                tiltStrength={2.5}
                animateEntrance={false}
                className="p-5 rounded-[22px] ios-glass space-y-1.5"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#B3261E] dark:text-[#F28B82]">
                  {block.key.replace('_', ' ')}
                </p>
                <h2 className="text-sm font-semibold text-[#1C1917] dark:text-[#F5F2EE]">{block.title}</h2>
                <p className="text-xs text-[#57534E] dark:text-[#A8A29E] leading-relaxed">{block.body}</p>
              </Perspective3DCard>
            ))}
          </section>
        </SmoothReveal>
      )}

      {/* FAQ + Feedback Asymmetric Split */}
      <SmoothReveal delay={0.05}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <section className="lg:col-span-7 space-y-4">
          <h2 className="text-lg font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <SmoothRow key={faq.id} index={idx}>
                <Perspective3DCard
                  tiltStrength={2.4}
                  animateEntrance={false}
                  className="p-5 rounded-[20px] ios-glass space-y-1.5"
                >
                  <h3 className="text-sm font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
                    {faq.question}
                  </h3>
                  <p className="text-sm text-[#57534E] dark:text-[#A8A29E] leading-relaxed">
                    {faq.answer}
                  </p>
                </Perspective3DCard>
              </SmoothRow>
            ))}
          </div>
        </section>

        <section className="lg:col-span-5">
          <Perspective3DCard tiltStrength={2.4} animateEntrance={false} className="p-6 rounded-[24px] ios-glass space-y-4">
          <h2 className="text-base font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
            Send feedback to coordinators
          </h2>
          <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">
            Found an outdated hospital note or want to add a college NSS unit? Leave a message below.
          </p>

          {submitted && (
            <div className="p-3 rounded-xl border border-[#166534]/30 bg-[#F0FDF4] dark:bg-[#14281D] text-xs text-[#166534] dark:text-[#86EFAC]">
              Thank you. Your feedback has been saved for the coordinator team.
            </div>
          )}

          <form onSubmit={handleFeedback} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1.5">
                Your name (optional)
              </label>
              <input
                type="text"
                value={feedbackName}
                onChange={(e) => setFeedbackName(e.target.value)}
                placeholder="Enter your name"
                className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 text-[#1C1917] dark:text-[#F5F2EE] focus:outline-none focus:ring-2 focus:ring-[#B3261E]/70"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1.5">
                Message
              </label>
              <textarea
                rows={3}
                required
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                placeholder="Enter your message or feedback"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 text-[#1C1917] dark:text-[#F5F2EE] focus:outline-none focus:ring-2 focus:ring-[#B3261E]/70"
              />
            </div>

            {error && (
              <p role="alert" className="text-xs text-[#B3261E] dark:text-[#F28B82]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl bg-[#B3261E] text-white hover:bg-[#961E17] disabled:opacity-50 shadow-[0_4px_14px_rgba(179,38,30,0.3)] transition-colors"
            >
              {submitting ? 'Sending...' : 'Send feedback'}
            </button>
          </form>
          </Perspective3DCard>
        </section>
      </div>
      </SmoothReveal>
    </div>
  );
}
