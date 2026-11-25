import { ExternalLink, Phone, ShieldAlert } from 'lucide-react';
import { Perspective3DCard, SmoothReveal } from '../components/SmoothSection.tsx';

interface PartnersPageProps {
  onNavigate: (path: string) => void;
}

export function PartnersPage({ onNavigate }: PartnersPageProps) {
  const categories = [
    {
      heading: 'Mangaluru Priority 1 — Blood Banks',
      items: [
        {
          name: 'Wenlock District Hospital Blood Bank',
          city: 'Hampankatta, Mangaluru · 24-hour',
          phone: '+918242420101',
          phoneLabel: '+91 824 242 0101',
          note: 'Government regional referral centre · Address & phone placeholder (to be verified against e-RaktKosh).',
        },
        {
          name: 'Indian Red Cross Society Blood Centre',
          city: 'Hampankatta (Red Cross Bhavan / Lady Goschen area), Mangaluru',
          phone: '+918242423755',
          phoneLabel: '+91 824 242 3755',
          note: 'Voluntary blood centre & component separation · Address & phone placeholder (to be verified).',
        },
        {
          name: 'Father Muller Charitable Institutions Blood Bank',
          city: 'Kankanady, Mangaluru · 24-hour',
          phone: '+918242238200',
          phoneLabel: '+91 824 223 8200',
          note: '24-hour tertiary blood bank & apheresis platelets · Licence & phone placeholder (to be verified).',
        },
        {
          name: 'KMC Hospital Blood Centre, Attavar',
          city: 'Attavar, Mangaluru · 24-hour',
          phone: '+918242445858',
          phoneLabel: '+91 824 244 5858',
          note: '24-hour hospital blood centre · Licence & emergency contact placeholder (to be verified).',
        },
      ],
    },
    {
      heading: 'Mangaluru Priority 2 — Referral Hospitals & Storage Centres',
      items: [
        {
          name: 'Yenepoya Medical College Hospital',
          city: 'Deralakatte, Mangaluru · 24-hour',
          phone: '+918242204668',
          phoneLabel: '+91 824 220 4668',
          note: 'South / Ullal corridor teaching hospital blood bank (to be verified).',
        },
        {
          name: 'KS Hegde Hospital (KSHEMA)',
          city: 'Deralakatte, Mangaluru · 24-hour',
          phone: '+918242204471',
          phoneLabel: '+91 824 220 4471',
          note: 'South / Ullal corridor charitable teaching hospital blood centre (to be verified).',
        },
        {
          name: 'AJ Hospital & Research Centre',
          city: 'Kuntikana, Mangaluru · 24-hour',
          phone: '+918242225533',
          phoneLabel: '+91 824 222 5533',
          note: 'NH-66 tertiary hospital blood bank (to be verified).',
        },
        {
          name: 'Kanachur Hospital & Research Centre',
          city: 'Natekal, Mangaluru · 24-hour',
          phone: '+918242888000',
          phoneLabel: '+91 824 288 8000',
          note: 'Natekal medical college hospital blood centre (to be verified).',
        },
        {
          name: 'Lady Goschen Hospital',
          city: 'Hampankatta, Mangaluru · Demand-side referral',
          phone: '+918242422911',
          phoneLabel: '+91 824 242 2911',
          note: 'Government maternity referral hospital (high demand side; coordinates with Wenlock & IRCS). Contact to be verified.',
        },
        {
          name: 'KMC Hospital, Ambedkar Circle',
          city: 'Balmatta / Jyothi, Mangaluru · 24-hour',
          phone: '+918242444590',
          phoneLabel: '+91 824 244 4590',
          note: '24-hour city-centre hospital blood storage & cross-match desk (to be verified).',
        },
        {
          name: 'Private Hospital Blood Storage Centres (Unity Care & Indiana Hospital)',
          city: 'Kodialbail & Pumpwell, Mangaluru · 24-hour',
          phone: '+918242880880',
          phoneLabel: '+91 824 288 0880',
          note: 'Private multi-speciality & cardiac hospital blood storage units in city centre and Pumpwell (to be verified).',
        },
      ],
    },
    {
      heading: 'National Blood Bank Directory & Campus Units',
      items: [
        {
          name: 'e-RaktKosh (Ministry of Health & Family Welfare)',
          city: 'National Registry · Cross-check required before go-live',
          url: 'https://eraktkosh.mohfw.gov.in',
          note: 'Cross-check every Mangaluru blood bank licence, address, phone number, and real-time stock against the national e-RaktKosh directory before going live.',
        },
        {
          name: 'NITK Surathkal NSS, MRPL Welfare & Infosys Mangaluru CSR Drives',
          city: 'Surathkal, Mulki & Mudipu, Mangaluru',
          note: 'College, industrial belt, and corporate blood donation camp partners (past Infosys camp collected 218 units in a single day).',
        },
      ],
    },
  ];

  return (
    <div className="space-y-8 max-w-4xl">
      <Perspective3DCard tiltStrength={2.2} className="ios-hero-glass rounded-[26px] p-6 sm:p-7 space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1C1917] dark:text-[#F5F2EE]">
          Mangaluru Blood Banks, Referral Hospitals &amp; Partners
        </h1>
        <p className="text-sm text-[#57534E] dark:text-[#A8A29E]">
          Directory of Mangaluru Priority 1 blood banks, Priority 2 hospitals, and campus/corporate camp organisers.
        </p>
      </Perspective3DCard>

      <SmoothReveal>
        <div className="p-4 rounded-[20px] ios-glass-subtle flex items-start gap-3">
          <ShieldAlert className="h-4 w-4 text-[#9A5B00] dark:text-[#F6C86E] shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-[#1C1917] dark:text-[#F5F2EE] leading-relaxed">
            Phone numbers, addresses, and licence references listed here are placeholders marked{' '}
            <span className="font-semibold">&ldquo;to be verified&rdquo;</span> until confirmed directly with each institution. Cross-check against{' '}
            <a
              href="https://eraktkosh.mohfw.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium text-[#B3261E] dark:text-[#F28B82]"
            >
              e-RaktKosh
            </a>{' '}
            before going live.
          </p>
        </div>
      </SmoothReveal>

      <div className="space-y-8">
        {categories.map((group) => (
          <SmoothReveal key={group.heading}>
            <section className="space-y-3">
              <h2 className="text-base font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
                {group.heading}
              </h2>
              <Perspective3DCard tiltStrength={1.8} animateEntrance={false} className="ios-glass rounded-[24px] overflow-hidden">
                <div className="divide-y divide-[#E2DDD6] dark:divide-white/10">
                  {group.items.map((item) => (
                    <div key={item.name} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <h3 className="text-sm font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
                            {item.name}
                          </h3>
                          <span className="text-xs text-[#57534E] dark:text-[#A8A29E]">· {item.city}</span>
                        </div>
                        <p className="text-xs text-[#57534E] dark:text-[#A8A29E] leading-relaxed">
                          {item.note}
                        </p>
                      </div>
                      {'phone' in item && item.phone && (
                        <a
                          href={`tel:${item.phone}`}
                          className="min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/80 dark:bg-[#141210]/85 text-[#B3261E] dark:text-[#F28B82] hover:border-[#B3261E]/60 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 tabular-nums transition-colors"
                        >
                          <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>{item.phoneLabel}</span>
                        </a>
                      )}
                      {'url' in item && item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/80 dark:bg-[#141210]/85 text-[#1C1917] dark:text-[#F5F2EE] hover:border-[#B3261E]/60 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                        >
                          <span>Open e-RaktKosh</span>
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </Perspective3DCard>
            </section>
          </SmoothReveal>
        ))}
      </div>

      <SmoothReveal>
        <Perspective3DCard tiltStrength={2.4} animateEntrance={false} className="p-5 sm:p-6 rounded-[24px] ios-glass">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
                Hosting a blood donation camp in Mangaluru?
              </h2>
              <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">
                Print a QR poster so college, corporate, or community attendees can register in 60 seconds.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/qr')}
              className="min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl bg-[#B3261E] text-white hover:bg-[#961E17] whitespace-nowrap shrink-0 shadow-[0_4px_14px_rgba(179,38,30,0.3)] transition-colors"
            >
              Open QR Poster page
            </button>
          </div>
        </Perspective3DCard>
      </SmoothReveal>
    </div>
  );
}

