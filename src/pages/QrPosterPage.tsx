import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Printer } from 'lucide-react';
import { INDIAN_CITIES } from '../shared/types.ts';
import { GlassSelect } from '../components/GlassSelect.tsx';
import { GlassSegmentedControl, Perspective3DCard, SmoothReveal } from '../components/SmoothSection.tsx';

export function QrPosterPage() {
  const [cityFilter, setCityFilter] = useState<string>('');
  const [targetRoute, setTargetRoute] = useState<'/' | '/register' | '/requests'>('/register');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://blood-portal.local';
  const qrUrl = `${origin}${targetRoute}${cityFilter ? `?city=${encodeURIComponent(cityFilter)}` : ''}`;

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(qrUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#1C1917',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [qrUrl]);

  return (
    <div className="space-y-6 max-w-4xl">
      <Perspective3DCard tiltStrength={2.2} className="no-print ios-hero-glass rounded-[26px] p-6 sm:p-7 space-y-5">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1C1917] dark:text-[#F5F2EE]">
            QR code poster for blood banks and campus camps
          </h1>
          <p className="text-sm text-[#57534E] dark:text-[#A8A29E]">
            Print this sheet for hospital waiting areas, college NSS notice boards, or camp registration desks.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <span className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1.5">
              Destination page
            </span>
            <GlassSegmentedControl
              ariaLabel="Destination page"
              layoutId="qr-route-segment"
              size="sm"
              value={targetRoute}
              onChange={(val) => setTargetRoute(val)}
              options={[
                { value: '/register', label: 'Become a Donor' },
                { value: '/', label: 'Search Donors' },
                { value: '/requests', label: 'Blood Requests Board' },
              ]}
            />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px]">
              <label htmlFor="qr-city-filter" className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1.5">
                Pre-select city (optional)
              </label>
              <GlassSelect
                id="qr-city-filter"
                ariaLabel="Pre-select city"
                value={cityFilter}
                onChange={setCityFilter}
                options={[
                  { value: '', label: 'All cities' },
                  ...INDIAN_CITIES.map((c) => ({ value: c, label: c })),
                ]}
              />
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl bg-[#B3261E] text-white hover:bg-[#961E17] inline-flex items-center gap-2 shadow-[0_4px_14px_rgba(179,38,30,0.3)] transition-colors"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              <span>Print poster</span>
            </button>

            {qrDataUrl && (
              <a
                href={qrDataUrl}
                download={`blood-portal-qr${cityFilter ? `-${cityFilter.toLowerCase()}` : ''}.png`}
                className="min-h-[44px] px-4 py-2 text-sm font-medium rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 text-[#1C1917] dark:text-[#F5F2EE] hover:border-[#B3261E]/50 inline-flex items-center gap-2 transition-colors"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                <span>Download QR PNG</span>
              </a>
            )}
          </div>
        </div>
      </Perspective3DCard>

      <SmoothReveal>

      {/* Printable Poster Card */}
      <section className="p-8 sm:p-10 rounded-[22px] border-2 border-[#1C1917] dark:border-white/20 bg-white text-[#1C1917] space-y-6 shadow-xl">
        <div className="space-y-2 border-b border-[#E2DDD6] pb-4">
          <p className="text-sm font-bold text-[#B3261E]">Blood Donation Portal</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {targetRoute === '/register'
              ? 'Register as a verified local blood donor'
              : targetRoute === '/requests'
                ? 'Check urgent local blood requests'
                : 'Find available, verified blood donors fast'}
            {cityFilter ? ` — ${cityFilter}` : ''}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
          <div className="sm:col-span-5 flex justify-center sm:justify-start">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR code linking to ${qrUrl}`}
                className="w-56 h-56 border border-[#E2DDD6] p-2 bg-white"
              />
            ) : (
              <div className="w-56 h-56 border border-[#E2DDD6] flex items-center justify-center text-xs text-[#57534E]">
                Generating QR code...
              </div>
            )}
          </div>

          <div className="sm:col-span-7 space-y-3 text-sm text-[#1C1917]">
            <p className="font-semibold">Scan with any phone camera</p>
            <ul className="list-disc pl-5 space-y-1.5 text-[#57534E]">
              <li>Phone numbers are kept private until a donor accepts a request.</li>
              <li>Donors are rested for 90 days automatically after each donation.</li>
              <li>Works on basic 3G connections in English, Kannada, Tamil, and Hindi.</li>
            </ul>
            <p className="text-xs text-[#57534E] break-all pt-2">{qrUrl}</p>
          </div>
        </div>

        <div className="pt-4 border-t border-[#E2DDD6] text-xs text-[#57534E]">
          In an emergency, contact your local ambulance (108) or hospital blood bank first. Final medical eligibility is decided by the blood bank.
        </div>
      </section>
      </SmoothReveal>
    </div>
  );
}
